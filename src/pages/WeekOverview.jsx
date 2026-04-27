import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const WeekOverview = () => {
  const [curriculum, setCurriculum] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState("All Weeks");

  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "courseCurriculum"));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
        setCurriculum(data);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchCurriculum();
  }, []);

  if (loading) return <div style={{padding:'40px', textAlign:'center', color:'#6b7280'}}>Loading Plans...</div>;

  const weekOptions = ["All Weeks", ...new Set(curriculum.map(week => week.id.replace(/([A-Z])/g, ' $1').trim()))];
  const filteredCurriculum = selectedWeek === "All Weeks" 
    ? curriculum 
    : curriculum.filter(week => week.id.replace(/([A-Z])/g, ' $1').trim() === selectedWeek);

  return (
    <div style={pageStyle}>
      <div style={headerContainerStyle}>
        <div>
          {/* ✅ FIXED: Heading Color to Blue */}
          <h1 style={{fontSize: '2.4rem', fontWeight:'800', color: '#1e3a8a', marginBottom:'5px'}}>Curriculum Overview</h1>
          <p style={{color: '#6b7280', margin: 0}}>All weeks, topics, and projects in your roadmap.</p>
        </div>
        
        <select 
          value={selectedWeek} 
          onChange={(e) => setSelectedWeek(e.target.value)}
          style={dropdownStyle}
        >
          {weekOptions.map((option, index) => (
            <option key={index} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div style={gridStyle}>
        {filteredCurriculum.length > 0 ? (
          filteredCurriculum.map((week) => (
            <div key={week.id} style={cardStyle}>
              <h3 style={titleStyle}>{week.id.replace(/([A-Z])/g, ' $1').trim()}</h3>
              
              <div style={{ marginBottom: '15px', flexGrow: 1 }}>
                <div style={{fontSize:'0.85rem', fontWeight:'700', color:'#9ca3af', marginBottom:'5px', textTransform:'uppercase'}}>
                  TOPICS ({week.topics ? week.topics.length : 0})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {week.topics && week.topics.slice(0, 4).map((t, i) => (
                    <span key={i} style={tagStyle}>{t}</span>
                  ))}
                  {week.topics && week.topics.length > 4 && (
                    <span style={{fontSize:'0.8rem', color:'#6b7280', padding:'2px'}}>+{week.topics.length - 4}</span>
                  )}
                </div>
              </div>

              {week.project && !week.project.toLowerCase().includes("no project") && (
                <div style={projectBadgeStyle}>🚀 {week.project}</div>
              )}
              {week.interview && !week.interview.toLowerCase().includes("no interview") && (
                <div style={interviewBadgeStyle}>🎤 {week.interview}</div>
              )}
            </div>
          ))
        ) : (
          <p style={{color: '#6b7280', gridColumn: '1 / -1'}}>No data found for the selected week.</p>
        )}
      </div>
    </div>
  );
};

// --- STYLES ---
const pageStyle = { padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif" };
const headerContainerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' };
const dropdownStyle = { padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem', color: '#374151', cursor: 'pointer', outline: 'none', minWidth: '220px', backgroundColor: 'white' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' };
const cardStyle = { background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' };
const titleStyle = { marginTop: 0, marginBottom: '15px', color: '#1f2937', fontSize: '1.2rem' };
const tagStyle = { background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', color: '#374151', fontWeight:'500' };
const projectBadgeStyle = { marginTop:'auto', fontSize: '0.9rem', color: '#059669', background:'#ecfdf5', padding:'10px', borderRadius:'8px', fontWeight:'600', marginBottom: '10px' };
const interviewBadgeStyle = { fontSize: '0.9rem', color: '#7c3aed', background:'#f5f3ff', padding:'10px', borderRadius:'8px', fontWeight:'600' };

export default WeekOverview;