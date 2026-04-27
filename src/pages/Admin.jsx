import React, { useState, useEffect } from "react";
import { db } from "../firebase/config"; 
import { collection, getCountFromServer, writeBatch, doc, getDocs, query } from "firebase/firestore";

// ✅ Correct Import Path
import { interviewSessions } from "../data/interviewSessions"; 

const Admin = () => {
  const [stats, setStats] = useState({ weeks: 0, interviews: 0, projects: 0 });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchStats = async () => {
    try {
      const w = await getCountFromServer(collection(db, "courseCurriculum"));
      const i = await getCountFromServer(collection(db, "interviewSessions"));
      const p = await getCountFromServer(collection(db, "projectDefinitions"));
      setStats({ weeks: w.data().count, interviews: i.data().count, projects: p.data().count });
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchStats(); }, []);

  // --- DELETE FUNCTION ---
  const handleDeleteAllInterviews = async () => {
    if (!window.confirm("⚠️ DANGER: Delete ALL Interview data?")) return;
    setLoading(true);
    setMsg("🗑️ Deleting old data...");
    try {
        const q = query(collection(db, "interviewSessions"));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        setMsg(`✅ Deleted ${snapshot.size} documents.`);
        fetchStats();
    } catch (error) { setMsg(`❌ Delete failed: ${error.message}`); }
    setLoading(false);
  };

  // --- SMART UPLOAD FUNCTION ---
  const handleJsUpload = async () => {
    setLoading(true);
    setMsg("⏳ Uploading real data...");
    
    try {
      if (!interviewSessions || interviewSessions.length === 0) {
        throw new Error("No data found in interviewSessions.js");
      }

      const batch = writeBatch(db);
      let count = 0;

      interviewSessions.forEach(item => {
        // Create unique ID like "PrerequisiteWeek1_interview"
        // Removes spaces from week name to make a clean ID
        const docId = `${item.week.replace(/\s+/g, "")}_interview`;
        const docRef = doc(db, "interviewSessions", docId);

        // ✅ MAP DATA CORRECTLY
        // Your JS file has 'sections' with 'questions' (Array)
        // Your DB needs 'sections' with 'content' (String with pipes | )
        const formattedSections = item.sections.map(sec => ({
            section: sec.section, // 'aptitude' or 'english_communication'
            topic: sec.topic,
            // Convert Array ["Q1", "Q2"] -> String "Q1 | Q2"
            content: Array.isArray(sec.questions) ? sec.questions.join(" | ") : (sec.questions || ""),
            outcome: sec.outcome
        }));

        const sessionData = {
          week: item.week,
          sessionId: docId,
          sections: formattedSections 
        };
        
        batch.set(docRef, sessionData);
        count++;
      });

      await batch.commit();
      setMsg(`✅ Successfully uploaded ${count} weeks!`);
      fetchStats();
    } catch (error) {
      console.error(error);
      setMsg(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", fontFamily: 'Inter, sans-serif' }}>
      <h1>Admin Dashboard</h1>
      <div className="stats-grid" style={{ display: "flex", gap: "20px", marginBottom: "40px" }}>
        <div className="stat-card" style={statCardStyle}><h3>Weeks</h3><p>{stats.weeks}</p></div>
        <div className="stat-card" style={statCardStyle}><h3>Interviews</h3><p>{stats.interviews}</p></div>
      </div>

      <div className="danger-zone" style={{ background: "#fff1f2", padding: "20px", borderRadius: "12px", border: "1px solid #fecdd3", marginBottom: "30px" }}>
        <h3 style={{ color: "#9f1239", marginTop: 0 }}>⚠️ Clean Database</h3>
        <button onClick={handleDeleteAllInterviews} disabled={loading} style={{ ...btnStyle, background: "#e11d48" }}>
            🗑️ Delete All Interview Data
        </button>
      </div>

      <div className="upload-section" style={{ background: "#f0fdf4", padding: "30px", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
        <h2 style={{marginTop:0, color:"#166534"}}>🚀 Upload Real Data</h2>
        <p>Upload the 53-week curriculum directly from <code>src/data/interviewSessions.js</code></p>
        <button onClick={handleJsUpload} disabled={loading} style={{ ...btnStyle, background: "#16a34a" }}>
            ⬆️ Upload Full Curriculum
        </button>
        {msg && <p style={{ fontWeight: "bold", marginTop: "15px" }}>{msg}</p>}
      </div>
    </div>
  );
};

const statCardStyle = { flex: 1, background: "white", padding: "20px", borderRadius: "8px", border: "1px solid #e5e7eb", textAlign: "center" };
const btnStyle = { padding: "12px 24px", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize:"1rem" };

export default Admin;