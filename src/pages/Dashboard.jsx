import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, getDoc, doc } from "firebase/firestore"; 
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import "./Dashboard.css";

const TOTAL_COURSE_DAYS = 371;
const GLOBAL_START_DATE = "2025-12-16"; 

export default function Dashboard() {
  const { user } = useAuth();
  
  // Initial State
  const [stats, setStats] = useState({
    total: 0, completed: 0, remaining: 0, 
    deadlineDays: 0, estimatedCompletionDays: 0, consistency: 0, 
    percent: 0, completionText: "0%", speed: 0 
  });
  
  const [logsByDate, setLogsByDate] = useState({}); 
  const [loading, setLoading] = useState(true);
  
  // Charts State
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [monthlyDateRange, setMonthlyDateRange] = useState(""); 
  const [weeklyDateRange, setWeeklyDateRange] = useState(""); 
  const [weekOffset, setWeekOffset] = useState(0); 
  const [monthPage, setMonthPage] = useState(0);   
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isHoveringCircle, setIsHoveringCircle] = useState(false); 

  // ✅ HELPER: Get Local Date String "YYYY-MM-DD"
  // This fixes the timezone bug by forcing local date instead of UTC
  const getLocalDateStr = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. TOTAL UNITS (Curriculum)
        const curriculumSnap = await getDocs(collection(db, "courseCurriculum"));
        let totalCount = 0;
        curriculumSnap.forEach((doc) => {
          const data = doc.data();
          if (Array.isArray(data.topics)) totalCount += data.topics.length;
          if (Array.isArray(data.problems)) totalCount += data.problems.length;
          if (data.project && !data.project.toLowerCase().includes("no project")) totalCount += 1;
          if (data.interview && !data.interview.toLowerCase().includes("no interview")) totalCount += 1;
        });

        // 2. FETCH USER LOGS
        const logsQuery = query(
            collection(db, "userLogs"), 
            where("userId", "==", user.uid) 
        );
        const logsSnap = await getDocs(logsQuery);
        
        const logs = [];
        logsSnap.forEach(doc => logs.push(doc.data()));
        // Sort by date string safely
        logs.sort((a, b) => (a.date > b.date ? 1 : -1));

        // 3. PROCESS LOGS
        const dateMap = {};
        const uniqueTopics = new Set();
        const uniqueProblems = new Set();
        let daysActive = 0;

        logs.forEach((log) => {
          const dateKey = log.date; // "YYYY-MM-DD"
          if (!dateMap[dateKey]) {
            if((log.solvedCount || 0) > 0) {
                dateMap[dateKey] = { solved: 0, status: 'present' };
                daysActive++;
            } else {
                 dateMap[dateKey] = { solved: 0, status: 'absent' };
            }
          }
          if(dateMap[dateKey].status === 'present') {
             dateMap[dateKey].solved += (log.solvedCount || 0);
          }

          if (log.completedTopics) {
             Object.keys(log.completedTopics).forEach(topic => {
                if(log.completedTopics[topic] === true) uniqueTopics.add(topic);
             });
          }
          if (log.completedProblems) {
             Object.keys(log.completedProblems).forEach(prob => {
                if(log.completedProblems[prob] === true) uniqueProblems.add(prob);
             });
          }
        });

        const totalSolved = uniqueTopics.size + uniqueProblems.size; 
        setLogsByDate(dateMap);

        // 4. FETCH START DATE
        let effectiveStartDate = new Date(GLOBAL_START_DATE);
        const settingsSnap = await getDoc(doc(db, "userSettings", user.uid));
        if (settingsSnap.exists() && settingsSnap.data().courseStartDate) {
            effectiveStartDate = new Date(settingsSnap.data().courseStartDate);
        } else if (user.metadata.creationTime) {
            effectiveStartDate = new Date(user.metadata.creationTime);
        }

        // 5. CALCULATE STATS
        const today = new Date();
        const diffTime = Math.abs(today - effectiveStartDate);
        const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const deadlineDays = TOTAL_COURSE_DAYS - daysPassed;

        const remainingWork = totalCount - totalSolved;
        const avgSpeed = daysActive > 0 ? (totalSolved / daysActive) : 0;
        const estimatedBasedOnSpeed = avgSpeed > 0 ? Math.ceil(remainingWork / avgSpeed) : (remainingWork > 0 ? 999 : 0);
        const percentRaw = totalCount > 0 ? (totalSolved / totalCount) * 100 : 0;

        setStats({
          total: totalCount, 
          completed: totalSolved, 
          remaining: remainingWork > 0 ? remainingWork : 0,
          deadlineDays: deadlineDays > 0 ? deadlineDays : 0,
          estimatedCompletionDays: estimatedBasedOnSpeed,
          consistency: daysActive,
          percent: percentRaw, 
          completionText: `${percentRaw.toFixed(1)}%`,
          speed: avgSpeed.toFixed(1) 
        });

        setLoading(false);
      } catch (err) { 
        console.error("Dashboard Error:", err); 
        setLoading(false); 
      }
    };
    fetchData();
  }, [user]);

  // --- CHART 1: WEEKLY ACTIVITY ---
  useEffect(() => {
    if(loading) return; 
    
    const data = [];
    const today = new Date();
    // Calculate End Date of the view window
    const end = new Date(today);
    end.setDate(today.getDate() - (weekOffset * 7));
    
    // Calculate Start Date of the view window
    const start = new Date(end);
    start.setDate(end.getDate() - 6);

    const opts = { month: 'short', day: 'numeric' };
    setWeeklyDateRange(`${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`);

    // Loop 7 days backwards from End Date
    for (let i = 6; i >= 0; i--) {
        const d = new Date(end);
        d.setDate(end.getDate() - i);
        const dateStr = getLocalDateStr(d); // ✅ Use fixed helper

        data.push({
            name: d.toLocaleDateString('en-US', { weekday: 'short' }),
            score: logsByDate[dateStr] ? logsByDate[dateStr].solved : 0
        });
    }
    setWeeklyData(data);
  }, [logsByDate, weekOffset, loading]);

  // --- CHART 2: MONTHLY PROGRESS (Fixed Logic) ---
  useEffect(() => {
    if(loading) return;

    // Define 4 weekly buckets (Newest -> Oldest)
    const buckets = [
      { name: 'Week 4', daysBackStart: 0, daysBackEnd: 6, score: 0 },  // Current week
      { name: 'Week 3', daysBackStart: 7, daysBackEnd: 13, score: 0 }, // 1 week ago
      { name: 'Week 2', daysBackStart: 14, daysBackEnd: 20, score: 0 }, // 2 weeks ago
      { name: 'Week 1', daysBackStart: 21, daysBackEnd: 27, score: 0 }  // 3 weeks ago
    ];

    const today = new Date();
    // Adjust base date by monthPage (each page = 28 days)
    const baseDate = new Date(today);
    baseDate.setDate(today.getDate() - (monthPage * 28));

    // Calculate display range string
    const rangeStart = new Date(baseDate);
    rangeStart.setDate(baseDate.getDate() - 27);
    const rangeEnd = new Date(baseDate);
    
    const opts = { month: 'short', day: 'numeric' };
    setMonthlyDateRange(`${rangeStart.toLocaleDateString('en-US', opts)} - ${rangeEnd.toLocaleDateString('en-US', opts)}`);

    // Fill Buckets
    buckets.forEach(bucket => {
        // Iterate through each day in this bucket's range
        for (let i = bucket.daysBackStart; i <= bucket.daysBackEnd; i++) {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() - i);
            const dateStr = getLocalDateStr(d); // ✅ Use fixed helper

            if (logsByDate[dateStr]) {
                bucket.score += logsByDate[dateStr].solved;
            }
        }
    });

    // Recharts needs array: Week 1 -> Week 4
    const chartData = [
      { name: 'Week 1', progress: buckets[3].score },
      { name: 'Week 2', progress: buckets[2].score },
      { name: 'Week 3', progress: buckets[1].score },
      { name: 'Week 4', progress: buckets[0].score }
    ];

    setMonthlyData(chartData);
  }, [logsByDate, monthPage, loading]);

  // --- CALENDAR DATA ---
  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    const daysArray = [];
    for(let i=0; i<firstDayIndex; i++) daysArray.push(null);
    
    const today = new Date(); 
    today.setHours(0,0,0,0);

    for (let i = 1; i <= daysInMonth; i++) {
        const currentLoopDate = new Date(year, month, i);
        const dateStr = getLocalDateStr(currentLoopDate); // ✅ Use fixed helper
        
        let status = 'none';
        if (logsByDate[dateStr] && logsByDate[dateStr].status === 'present') {
            status = 'present';
        } else if (currentLoopDate < today) {
            status = 'absent';
        }
        
        daysArray.push({ date: i, status });
    }
    return { daysArray, year, monthName: calendarDate.toLocaleDateString('en-US', { month: 'long' }) };
  };
  const { daysArray, year, monthName } = getCalendarDays();

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p>Real-Time overview of your learning journey.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><h3>TOTAL LEARNING UNITS</h3><p className="stat-value blue">{stats.total.toLocaleString()}</p></div>
        <div className="stat-card"><h3>COMPLETED</h3><p className="stat-value green">{stats.completed}</p></div>
        <div className="stat-card"><h3>REMAINING</h3><p className="stat-value orange">{stats.remaining.toLocaleString()}</p></div>
        <div className="stat-card"><h3>DAYS TO DEADLINE</h3><p className="stat-value purple">{stats.deadlineDays} <span className="unit">days</span></p></div>
        <div className="stat-card"><h3>CONSISTENCY</h3><p className="stat-value green">{stats.consistency} <span className="unit">days</span></p></div>
      </div>

      <div className="charts-grid">
        {/* WEEKLY CHART */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Weekly Activity</h3>
            <div className="chart-nav">
                <button onClick={() => setWeekOffset(weekOffset + 1)}>‹</button>
                <button onClick={() => setWeekOffset(weekOffset > 0 ? weekOffset - 1 : 0)} disabled={weekOffset===0}>›</button>
            </div>
          </div>
          <p className="chart-subtitle">{weeklyDateRange}</p>
         {/* WEEKLY CHART FIX */}
<div style={{ width: "100%", height: "230px", position: "relative" }}>
  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={weeklyData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "#f3f4f6" }} />
        <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>
        </div>

        {/* MONTHLY CHART */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Monthly Progress</h3>
            <div className="chart-nav">
                <button onClick={() => setMonthPage(monthPage + 1)}>‹</button>
                <button onClick={() => setMonthPage(monthPage > 0 ? monthPage - 1 : 0)} disabled={monthPage===0}>›</button>
            </div>
          </div>
          <p className="chart-subtitle">{monthlyDateRange}</p>
        {/* WRAPPER FIX for Monthly Chart */}
          {/* MONTHLY CHART FIX */}
{/* ABSOLUTE POSITION FIX FOR MONTHLY CHART */}
<div style={{ width: "100%", height: "230px", position: "relative" }}>
  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={monthlyData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip />
        <Bar dataKey="progress" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>
        </div>

        {/* OVERALL CHART */}
        <div className="chart-card center-content">
          <h3>Overall Completion</h3>
          <div className="circle-chart-container"
               onMouseEnter={() => setIsHoveringCircle(true)}
               onMouseLeave={() => setIsHoveringCircle(false)}
               style={{cursor: 'pointer'}} 
          >
            <div className="circle-chart" style={{position:'relative', width:'150px', height:'150px', margin:'0 auto'}}>
               <svg viewBox="0 0 36 36" className="circular-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#eee" strokeWidth="3" />
                  <path className="circle" strokeDasharray={`${stats.percent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
               </svg>
               
               <div className="percentage-text" style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', textAlign:'center', width:'100%'}}>
                 {isHoveringCircle ? (
                    <>
                        <span style={{fontSize:'1.8rem', fontWeight:'800', color:'#4f46e5', display:'block'}}>{stats.speed}</span>
                        <span style={{fontSize:'0.75rem', color:'#6b7280', fontWeight:'600'}}>Items / Day</span>
                    </>
                 ) : (
                    <>
                        <span className="percent" style={{fontSize:'1.5rem', fontWeight:'800', color:'#333'}}>{stats.completionText}</span>
                        <span className="label" style={{fontSize:'0.75rem', color:'#6b7280', display:'block', marginTop:'2px'}}>
                            {stats.completed} / {stats.total}
                        </span>
                    </>
                 )}
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bottom-section-grid">
          <div className="stat-card est-speed-card">
              <h3>EST. DAYS TO COMPLETE</h3>
              <p className="stat-value purple">
                 {stats.estimatedCompletionDays === 999 ? "N/A" : stats.estimatedCompletionDays} 
                 <span className="unit" style={{fontSize:'1rem', marginLeft:'5px'}}>days</span>
              </p>
              <p className="stat-subtext">Based on your current average speed.</p>
          </div>

          <div className="calendar-section">
            <div className="calendar-header">
                <h3>Consistency Calendar</h3>
                <div className="calendar-nav">
                    <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() - 1)))}>‹</button>
                    <span>{monthName} {year}</span>
                    <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + 1)))}>›</button>
                </div>
            </div>
            <div className="calendar-grid">
                {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} className="cal-day-label">{d}</div>)}
                {daysArray.map((day, i) => (
                    day === null ? <div key={`empty-${i}`} /> : 
                    <div key={day.date} className="cal-day-wrapper">
                        <div className={`cal-day-circle ${day.status}`}>{day.date}</div>
                    </div>
                ))}
            </div>
          </div>
      </div>
    </div>
  );
}