import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  doc, getDoc, getDocs, collection, setDoc, updateDoc, serverTimestamp, 
  query, where, arrayRemove 
} from "firebase/firestore";
import { db } from "../firebase/config"; 
import { curriculumData } from "../data/curriculum"; 
import "./LogToday.css";

// --- HELPER: SANITIZE KEYS ---
const sanitizeKey = (str) => {
  if (!str) return "unknown";
  return str.toString().replace(/[^a-zA-Z0-9-_]/g, "_");
};

// --- HELPER: CLEAN UNDEFINED VALUES ---
const cleanData = (obj) => {
  const newObj = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

// --- 3-DOT MENU COMPONENT ---
const OptionsMenu = ({ onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="menu-container" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button className="dots-btn" onClick={() => setIsOpen(!isOpen)} title="Options">⋮</button>
      {isOpen && (
        <div className="dropdown-menu">
          {onEdit && <div className="menu-item" onClick={() => { onEdit(); setIsOpen(false); }}><span>✏️</span> Edit</div>}
          {onDelete && <div className="menu-item delete" onClick={() => { onDelete(); setIsOpen(false); }}><span>🗑️</span> Delete</div>}
        </div>
      )}
    </div>
  );
};

// --- EDIT/ADD POPUP ---
const EditPopup = ({ isOpen, title, value, onSave, onClose }) => {
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);
  if (!isOpen) return null;
  return (
    <div className="edit-popup-overlay">
      <div className="edit-popup">
        <h3>{title}</h3>
        <textarea rows={6} value={val} onChange={(e) => setVal(e.target.value)} placeholder="Type here..." />
        <div className="popup-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => onSave(val)} className="save-btn">Save</button>
        </div>
      </div>
    </div>
  );
};

const LogToday = () => {
  const { user } = useAuth();
  
  // --- STATE ---
  const getLocalDate = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
  };

  const [date, setDate] = useState(getLocalDate());
  const [selectedWeek, setSelectedWeek] = useState("Prerequisites Week 1");
  const [weekData, setWeekData] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  
  // Interview Details
  const [interviewDetails, setInterviewDetails] = useState(null);
  const [interviewDocId, setInterviewDocId] = useState(null);
  
  // Inputs
  const [attendance, setAttendance] = useState("Present");
  const [completedProblems, setCompletedProblems] = useState({});
  const [completedTopics, setCompletedTopics] = useState({});
  const [projectDone, setProjectDone] = useState(false);
  const [interviewDone, setInterviewDone] = useState(false);

  // History & UI
  const [historyTopics, setHistoryTopics] = useState(new Set());
  const [historyProblems, setHistoryProblems] = useState(new Set());
  const [activeModal, setActiveModal] = useState(null); 
  const [interviewTab, setInterviewTab] = useState("english");
  const [loading, setLoading] = useState(false);
  const [progressStats, setProgressStats] = useState({ score: 0, percent: 0 });
  
  // Edit & Add Target
  const [editTarget, setEditTarget] = useState(null); 

  const allWeeks = [...new Set(curriculumData.map(item => item.Week))];

  // Helpers
  const getVal = (o, k) => { if(!o) return ""; for(let key of k) if(o[key]) return o[key]; return ""; };
  const parseList = (t) => t ? t.toString().split(/[|.\n•]/).map(s=>s.trim()).filter(s=>s.length>2) : [];

  // --- SMART FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const weekIdClean = selectedWeek.replace(/\s+/g, ""); // "PrerequisitesWeek1"
        
        // 1. Curriculum (Try clean ID)
        const weekSnap = await getDoc(doc(db, "courseCurriculum", weekIdClean));
        if (!weekSnap.exists()) { setWeekData(null); setLoading(false); return; }
        setWeekData(weekSnap.data());

        // 2. Project (Smart Fetch: Try clean ID, then Space ID)
        let projSnap = await getDoc(doc(db, "projectDefinitions", weekIdClean));
        if (!projSnap.exists()) {
             // Fallback: Try with spaces if clean ID failed
             projSnap = await getDoc(doc(db, "projectDefinitions", selectedWeek)); 
        }
        setProjectDetails(projSnap.exists() ? projSnap.data() : null);

        // 3. Interview (Smart Fetch)
        let directId = `${weekIdClean}_interview`;
        let intSnap = await getDoc(doc(db, "interviewSessions", directId));

        if (!intSnap.exists()) {
            // Fallback: Try "Prerequisite" instead of "Prerequisites"
            const altId = `${weekIdClean.replace("Prerequisites", "Prerequisite")}_interview`;
            intSnap = await getDoc(doc(db, "interviewSessions", altId));
        }

        if (intSnap.exists()) {
            setInterviewDetails(intSnap.data());
            setInterviewDocId(intSnap.id);
        } else {
            setInterviewDetails(null);
        }

        // 4. History
        if (user) {
            const q = query(collection(db, "userLogs"), where("userId", "==", user.uid));
            const querySnapshot = await getDocs(q);
            const histT = new Set();
            const histP = new Set();
            querySnapshot.forEach((doc) => {
                const d = doc.data();
                if (d.completedTopics) Object.keys(d.completedTopics).forEach(k => { if(d.completedTopics[k]) histT.add(k); });
                if (d.completedProblems) Object.keys(d.completedProblems).forEach(k => { if(d.completedProblems[k]) histP.add(k); });
            });
            setHistoryTopics(histT);
            setHistoryProblems(histP);
            setCompletedTopics({});
            setCompletedProblems({});
            setProjectDone(false);
            setInterviewDone(false);
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, [selectedWeek, date, user]);

  // --- SAVE FUNCTION ---
  const saveProgress = async () => {
    if (!user) return;
    const logId = `${user.uid}_${date}`; 
    const logRef = doc(db, "userLogs", logId);

    try {
      const docSnap = await getDoc(logRef);
      let existingData = docSnap.exists() ? docSnap.data() : {};
      const mergedTopics = cleanData({ ...(existingData.completedTopics || {}), ...completedTopics });
      const mergedProblems = cleanData({ ...(existingData.completedProblems || {}), ...completedProblems });
      const finalProjectDone = (projectDone === true) || (existingData.projectDone === true);
      const finalInterviewDone = (interviewDone === true) || (existingData.interviewDone === true);
      const solvedCount = Object.values(mergedTopics).filter(Boolean).length + Object.values(mergedProblems).filter(Boolean).length;

      await setDoc(logRef, {
        userId: user.uid, date: date, week: selectedWeek, attendance: attendance || "Present",
        completedTopics: mergedTopics, completedProblems: mergedProblems, 
        projectDone: finalProjectDone, interviewDone: finalInterviewDone,
        solvedCount: solvedCount, timestamp: serverTimestamp()
      }, { merge: true });

      const newHistT = new Set(historyTopics);
      const newHistP = new Set(historyProblems);
      Object.keys(completedTopics).forEach(k => { if(completedTopics[k]) newHistT.add(k); });
      Object.keys(completedProblems).forEach(k => { if(completedProblems[k]) newHistP.add(k); });
      setHistoryTopics(newHistT);
      setHistoryProblems(newHistP);
      setCompletedTopics({});
      setCompletedProblems({});
      setProjectDone(false);
      setInterviewDone(false);
      alert(`✅ Saved! Total items for today: ${solvedCount}`);
    } catch (error) { console.error("Error saving:", error); alert(`Failed to save. Error: ${error.message}`); }
  };

// --- HANDLE EDITS & ADDS ---
  const handleSaveEdit = async (newValue) => {
    if (!editTarget || !newValue.trim()) return;
    
    // 1. PROJECT LOGIC
    if (editTarget.type.startsWith('project')) {
        // ... (Keep existing project logic) ...
        const field = editTarget.type === 'project_desc' ? "Project_Description" : "Tech_Stack";
        const weekIdClean = selectedWeek.replace(/\s+/g, "");
        try { await updateDoc(doc(db, "projectDefinitions", weekIdClean), { [field]: newValue }); } 
        catch (e) { await updateDoc(doc(db, "projectDefinitions", selectedWeek), { [field]: newValue }); }
        setProjectDetails(prev => ({ ...prev, [field]: newValue }));
        setEditTarget(null);
        return;
    }

    // ✅ 2. PROBLEM LOGIC (NEW)
    if (editTarget.type === 'problem') {
        const weekIdClean = selectedWeek.replace(/\s+/g, "");
        const updatedProblems = [...weekData.problems];
        // Update the name of the problem at the specific index
        updatedProblems[editTarget.index] = { ...updatedProblems[editTarget.index], name: newValue };
        
        try {
            await updateDoc(doc(db, "courseCurriculum", weekIdClean), { problems: updatedProblems });
            setWeekData(prev => ({ ...prev, problems: updatedProblems }));
        } catch (error) { console.error("Problem update failed:", error); }
        setEditTarget(null);
        return;
    }

    // 3. INTERVIEW LOGIC
    if (!interviewDocId || !interviewDetails) return;
    // ... (Keep existing interview logic) ...
    try {
        const updatedSections = [...interviewDetails.sections];
        const secIndex = updatedSections.findIndex(s => s.section === editTarget.sectionName);
        if (secIndex === -1) return;

        if (editTarget.type === 'add_item') {
            const list = parseList(updatedSections[secIndex].content);
            list.push(newValue);
            updatedSections[secIndex].content = list.join(" | ");
        } 
        else if (editTarget.type === 'content_string') {
            updatedSections[secIndex].content = newValue;
        } 
        else if (editTarget.type === 'content_array_item') {
            const list = parseList(updatedSections[secIndex].content);
            list[editTarget.index] = newValue;
            updatedSections[secIndex].content = list.join(" | ");
        }

        await updateDoc(doc(db, "interviewSessions", interviewDocId), { sections: updatedSections });
        setInterviewDetails(prev => ({ ...prev, sections: updatedSections }));
    } catch (error) { console.error("Update failed:", error); alert("Failed to save."); }
    setEditTarget(null);
  };

  // --- HANDLE DELETE ---
// --- HANDLE DELETE ---
  const handleDelete = async (typeOrSection, index) => {
    if (!window.confirm("Delete this item?")) return;

    // ✅ 1. PROBLEM DELETE LOGIC (NEW)
    if (typeOrSection === 'problem') {
        const weekIdClean = selectedWeek.replace(/\s+/g, "");
        const updatedProblems = [...weekData.problems];
        updatedProblems.splice(index, 1); // Remove item at index

        try {
            await updateDoc(doc(db, "courseCurriculum", weekIdClean), { problems: updatedProblems });
            setWeekData(prev => ({ ...prev, problems: updatedProblems }));
        } catch (error) { console.error("Problem delete failed:", error); }
        return;
    }

    // 2. INTERVIEW DELETE LOGIC
    if (!interviewDocId) return;
    try {
        const updatedSections = [...interviewDetails.sections];
        const secIndex = updatedSections.findIndex(s => s.section === typeOrSection);
        if (secIndex === -1) return;

        const list = parseList(updatedSections[secIndex].content);
        list.splice(index, 1);
        updatedSections[secIndex].content = list.join(" | ");

        await updateDoc(doc(db, "interviewSessions", interviewDocId), { sections: updatedSections });
        setInterviewDetails(prev => ({ ...prev, sections: updatedSections }));
    } catch (error) { console.error(error); }
  };

  // --- HELPER: GET SECTION BY TYPE ---
  const getSection = (type) => {
    if (!interviewDetails?.sections) return null;
    return interviewDetails.sections.find(s => s.section === type);
  };

  // --- PROGRESS CALC ---
  useEffect(() => {
    if (!weekData) return;
    const pts = { topic: 5, prob: 10, int: 20, proj: 50 };
    const max = (weekData.topics.length * pts.topic) + (weekData.problems.length * pts.prob) + 50 + 20;
    
    let earned = 0;
    weekData.topics.forEach(t => {
        const key = `${sanitizeKey(selectedWeek)}_${sanitizeKey(t)}`;
        if(completedTopics[key] || historyTopics.has(key)) earned += pts.topic;
    });
    weekData.problems.forEach(p => {
        const key = `${sanitizeKey(selectedWeek)}_${sanitizeKey(p.id)}`;
        if(completedProblems[key] || historyProblems.has(key)) earned += pts.prob;
    });
    if (projectDone) earned += pts.proj; 
    if (interviewDone) earned += pts.int;

    setProgressStats({ score: earned, percent: max > 0 ? Math.round((earned / max) * 100) : 0 });
  }, [weekData, completedTopics, completedProblems, projectDone, interviewDone, historyTopics, selectedWeek]);

  return (
    <div className="log-today-container">
      <EditPopup 
        isOpen={!!editTarget} 
        title={editTarget?.title || "Edit Content"} 
        value={editTarget?.data || ""} 
        onSave={handleSaveEdit} 
        onClose={() => setEditTarget(null)} 
      />

      <h1>Weekly Planner</h1>
      <p className="subtitle">Track your weekly milestones: Theory, Code, and Projects.</p>

      <div className="content-wrapper">
        <div className="settings-panel">
          <h3>Configuration</h3>
          <label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <label>Week</label>
          <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
             {allWeeks.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <button className="update-btn" onClick={saveProgress}>Save Progress</button>
        </div>

        <div className="tasks-panel">
          {weekData ? (
            <>
              <div className="progress-section">
                <div className="progress-header"><span>Weekly Completion</span><span className="progress-percent">{progressStats.percent}%</span></div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${progressStats.percent}%` }}></div></div>
              </div>

              {/* TOPICS */}
              <div className="section-block">
                <h3>📚 Topics</h3>
                <div className="topics-grid">
                  {weekData.topics.map((t, i) => {
                    const uniqueId = `${sanitizeKey(selectedWeek)}_${sanitizeKey(t)}`; 
                    return (
                      <div key={i} className={`topic-wrapper ${historyTopics.has(uniqueId) ? "done" : ""}`}>
                         <button className="topic-tag" onClick={() => setCompletedTopics(p => ({ ...p, [uniqueId]: !p[uniqueId] }))}>
                           {t} {completedTopics[uniqueId] && "✓"}
                         </button>
                         {historyTopics.has(uniqueId) && <span className="completed-star">*</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

             {/* PROBLEMS */}
              <div className="section-block">
                <h3>💻 Problems</h3>
                <div className="problem-list">
                  {weekData.problems.map((p, i) => {
                    const uniqueId = `${sanitizeKey(selectedWeek)}_${sanitizeKey(p.id)}`;
                    return (
                      <div key={uniqueId} className="task-item">
                        <div className="task-left">
                          <input type="checkbox" checked={!!completedProblems[uniqueId]} onChange={() => setCompletedProblems(prev => ({ ...prev, [uniqueId]: !prev[uniqueId] }))} />
                          <div className="task-info">
                              <span className="task-name">{p.name} {historyProblems.has(uniqueId) && <span className="completed-star">*</span>}</span>
                          </div>
                        </div>
                        {/* ✅ ADDED: 3-DOT MENU FOR EDIT/DELETE */}
                        <div style={{ marginLeft: 'auto' }}>
                            <OptionsMenu 
                                onEdit={() => setEditTarget({ type: 'problem', title: 'Edit Problem', index: i, data: p.name })} 
                                onDelete={() => handleDelete('problem', i)} 
                            />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PROJECT */}
              <div className="section-block">
                <h3>🚀 Project</h3>
                <div className="info-card">
                    <div className="card-header-row">
                        <span>{weekData.project}</span>
                        <div className="card-actions">
                            <input type="checkbox" checked={projectDone} onChange={() => setProjectDone(!projectDone)} />
                            <button className="details-btn" onClick={() => setActiveModal('project')}>Details</button>
                        </div>
                    </div>
                </div>
              </div>

              {/* INTERVIEW */}
              <div className="section-block">
                <h3>🎤 Interview Prep</h3>
                <div className="info-card interview">
                    <div className="card-header-row">
                        <span>{weekData.interview || "No Session"}</span>
                        <div className="card-actions">
                            <input type="checkbox" checked={interviewDone} onChange={() => setInterviewDone(!interviewDone)} />
                            <button className="details-btn" onClick={() => setActiveModal('interview')}>Start</button>
                        </div>
                    </div>
                </div>
              </div>
            </>
          ) : <p>Loading...</p>}
        </div>
      </div>

      {/* --- MODAL --- */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setActiveModal(null)}>×</button>
            
            {/* PROJECT MODAL */}
            {activeModal === 'project' && (
              <>
                 {/* Project logic simplified to use whatever details we found (Clean or Spaced) */}
                 <h2>{getVal(projectDetails, ["Project_Name"]) || weekData.project}</h2>
                 {projectDetails ? (
                   <div className="modal-body">
                      <h4>Description <OptionsMenu onEdit={() => setEditTarget({type:'project_desc', title:'Edit Description', data: getVal(projectDetails, ["Project_Description"])})} /></h4>
                      <p>{getVal(projectDetails, ["Project_Description"])}</p>
                      
                      <h4>Tech Stack <OptionsMenu onEdit={() => setEditTarget({type:'project_tech', title:'Edit Tech Stack', data: getVal(projectDetails, ["Tech_Stack"])})} /></h4>
                      <div className="tech-stack-tags">{parseList(getVal(projectDetails, ["Tech_Stack"])).map((t,i) => <span key={i} className="tech-tag">{t}</span>)}</div>
                   </div>
                 ) : <p>No project details found in database.</p>}
              </>
            )}

            {/* INTERVIEW MODAL */}
            {activeModal === 'interview' && (
              <>
                <h2>{weekData.interview}</h2>
                {interviewDetails ? (
                  <>
                    <div className="modal-tabs">
                      <button className={interviewTab === 'english' ? 'active' : ''} onClick={() => setInterviewTab('english')}>English & Verbal</button>
                      <button className={interviewTab === 'aptitude' ? 'active' : ''} onClick={() => setInterviewTab('aptitude')}>Aptitude</button>
                    </div>
                    <div className="modal-body">
                      
                      {/* --- TAB 1: ENGLISH + VERBAL --- */}
                      {interviewTab === 'english' && (
                        <>
                          {(() => {
                             const sec = getSection('english_communication');
                             if (sec) {
                               return (
                                 <div className="section-group">
                                   <h4 style={{color:'#4f46e5'}}>🗣️ {sec.topic}</h4>
                                   <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                                      <p>{sec.content}</p>
                                      <OptionsMenu onEdit={() => setEditTarget({type:'content_string', title:'Edit Content', sectionName: sec.section, data: sec.content})} />
                                   </div>
                                 </div>
                               );
                             }
                          })()}

                          {(() => {
                             const sec = getSection('verbal_ability');
                             if (sec) {
                               return (
                                 <div className="section-group" style={{marginTop:'20px', borderTop:'1px solid #eee', paddingTop:'10px'}}>
                                   <h4 style={{color:'#4f46e5'}}>📝 {sec.topic}</h4>
                                   {parseList(sec.content).map((p, i) => (
                                      <div key={i} className="aptitude-item" style={{display:'flex', justifyContent:'space-between'}}>
                                          <label><input type="checkbox"/> <span>{p}</span></label>
                                          <OptionsMenu 
                                             onEdit={() => setEditTarget({type:'content_array_item', title:'Edit Question', sectionName: sec.section, index: i, data: p})} 
                                             onDelete={() => handleDelete(sec.section, i)} 
                                          />
                                      </div>
                                   ))}
                                   {/* ✅ ADD BUTTON for Verbal */}
                                   <button className="add-item-btn" onClick={() => setEditTarget({type:'add_item', title:'Add New Question', sectionName: sec.section, data:''})}>
                                      + Add Question
                                   </button>
                                 </div>
                               );
                             }
                          })()}
                        </>
                      )}
                      
                      {/* --- TAB 2: APTITUDE --- */}
                      {interviewTab === 'aptitude' && (
                        <>
                           {(() => {
                             const sec = getSection('aptitude');
                             if (!sec) return <p>No Aptitude content.</p>;
                             return (
                               <div>
                                 <h4>{sec.topic}</h4>
                                 {parseList(sec.content).map((p, i) => (
                                    <div key={i} className="aptitude-item" style={{display:'flex', justifyContent:'space-between'}}>
                                        <label><input type="checkbox"/> <span>{p}</span></label>
                                        <OptionsMenu 
                                           onEdit={() => setEditTarget({type:'content_array_item', title:'Edit Question', sectionName: sec.section, index: i, data: p})} 
                                           onDelete={() => handleDelete(sec.section, i)} 
                                        />
                                    </div>
                                 ))}
                                 {/* ✅ ADD BUTTON for Aptitude */}
                                 <button className="add-item-btn" onClick={() => setEditTarget({type:'add_item', title:'Add New Problem', sectionName: sec.section, data:''})}>
                                    + Add Problem
                                 </button>
                               </div>
                             );
                          })()}
                        </>
                      )}
                    </div>
                  </>
                ) : <p>No interview data found for this week.</p>}
              </>
            )}

            <div className="modal-footer">
               <button onClick={() => setActiveModal(null)} className="modal-close-btn">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogToday;