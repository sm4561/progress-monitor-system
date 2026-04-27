import React, { useState, useEffect, useCallback } from "react";
import { db } from "../firebase/config";
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp 
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import "./Journal.css";

// --- COLOR PALETTES ---
const BG_COLORS = [
  { name: "Classic", value: "#ffffff" },
  { name: "Warm", value: "#fef3c7" },   
  { name: "Cool", value: "#e0f2fe" },   
  { name: "Nature", value: "#dcfce7" }, 
  { name: "Rose", value: "#ffe4e6" },   
  { name: "Lavender", value: "#f3e8ff" }, 
  { name: "Peach", value: "#ffedd5" },    
];

const TEXT_COLORS = [
  { name: "Dark", value: "#1f2937" },
  { name: "Blue", value: "#1e3a8a" },
  { name: "Green", value: "#065f46" },
  { name: "Purple", value: "#581c87" },
  { name: "Red", value: "#b91c1c" },      
  { name: "Orange", value: "#c2410c" },   
  { name: "Teal", value: "#0f766e" },
  { name: "Yellow", value: "#ca8a04" }
  // ✅ Added Readable Dark Yellow/Gold
];

export default function Journal() {
  const { user } = useAuth();
  
  // Data State
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Editor State
  const [selectedId, setSelectedId] = useState(null);
  const [title, setTitle] = useState(""); // ✅ New Title State
  const [content, setContent] = useState("");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#1f2937");
  const [fontSize, setFontSize] = useState(18); // ✅ New Font Size State (Default 18px)

  // --- RESIZABLE SIDEBAR STATE ---
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  // --- 1. RESIZE HANDLERS ---
  const startResizing = useCallback(() => setIsResizing(true), []);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e) => {
      let newWidth = e.clientX;
      if (newWidth < 220) newWidth = 220;
      if (newWidth > 600) newWidth = 600;
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // --- 2. FETCH & LISTEN ---
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "userJournals"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // --- 3. GROUP ENTRIES ---
  const getGroupedEntries = () => {
    const filtered = entries.filter(e => 
      (e.content || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      (e.title || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groups = {};
    filtered.forEach(entry => {
      if (!entry.createdAt) return;
      const date = entry.createdAt.toDate();
      const key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return groups;
  };

  const groupedEntries = getGroupedEntries();

  // --- 4. EDITOR ACTIONS ---
  const handleSelectEntry = (entry) => {
    setSelectedId(entry.id);
    setTitle(entry.title || ""); // Load Title
    setContent(entry.content);
    setBgColor(entry.bgColor || "#ffffff");
    setTextColor(entry.textColor || "#1f2937");
    setFontSize(entry.fontSize || 18); // Load Font Size
  };

  const handleNewEntry = () => {
    setSelectedId(null);
    setTitle("");
    setContent("");
    setBgColor("#ffffff");
    setTextColor("#1f2937");
    setFontSize(18);
  };
  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async () => {
    if (!content.trim() && !title.trim()) return;
    
    setIsSaving(true); // Show loading state
    
    try {
      const entryData = {
        title, 
        content, 
        bgColor, 
        textColor, 
        fontSize,
        uid: user.uid, 
        updatedAt: serverTimestamp()
      };

      if (selectedId) {
        // UPDATE EXISTING
        await updateDoc(doc(db, "userJournals", selectedId), entryData);
        // No alert needed, it just updates
      } else {
        // SAVE NEW
        entryData.createdAt = serverTimestamp();
        await addDoc(collection(db, "userJournals"), entryData);
        handleNewEntry(); // Clear form automatically
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false); // Hide loading state
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Delete this memory forever?")) {
      await deleteDoc(doc(db, "userJournals", id));
      if (selectedId === id) handleNewEntry();
    }
  };

  return (
    <div className="journal-container">
      
      {/* --- SIDEBAR --- */}
      <div className="journal-sidebar" style={{ width: sidebarWidth }}>
        <div className="sidebar-header">
            <div className="search-wrapper">
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search memories..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
            </div>
            <button className="new-entry-btn" onClick={handleNewEntry}>+ New Entry</button>
        </div>

        <div className="entries-list">
          {loading ? <p>Loading...</p> : Object.keys(groupedEntries).map(month => (
            <div key={month} className="month-group">
              <h4 className="month-header">{month}</h4>
              {groupedEntries[month].map(entry => (
                <div 
                  key={entry.id} 
                  className={`entry-item ${selectedId === entry.id ? 'active' : ''}`}
                  onClick={() => handleSelectEntry(entry)}
                >
                  <div className="entry-date-box">
                    <span className="date-month">{entry.createdAt?.toDate().toLocaleDateString('en-US',{month:'short'})}</span>
                    <span className="date-day">{entry.createdAt?.toDate().getDate()}</span>
                  </div>
                  
                  <div className="entry-preview">
                    {/* Show Title if exists, else snippet */}
                    {entry.title ? (
                        <p className="entry-title-preview">{entry.title}</p>
                    ) : (
                        <p className="entry-snippet">{entry.content.substring(0, 30)}...</p>
                    )}
                    <span className="entry-time">{entry.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <button className="sidebar-delete" onClick={(e) => handleDelete(e, entry.id)}>×</button>
                </div>
              ))}
            </div>
          ))}
          {Object.keys(groupedEntries).length === 0 && !loading && (
             <p className="empty-msg">No entries found.</p>
          )}
        </div>
      </div>

      {/* --- DRAG RESIZER --- */}
      <div className="resizer" onMouseDown={startResizing}></div>

      {/* --- EDITOR AREA --- */}
      <div className="journal-editor-area" style={{ backgroundColor: bgColor }}>
        <div className="editor-toolbar">
          
          {/* Page Color */}
          <div className="color-picker-group">
            <span className="tool-label">Page:</span>
            <div className="color-scroll">
                {BG_COLORS.map(c => (
                <button key={c.name} className={`color-dot ${bgColor === c.value ? 'selected' : ''}`} style={{ backgroundColor: c.value }} onClick={() => setBgColor(c.value)} title={c.name}/>
                ))}
            </div>
          </div>
          
          <div className="divider-v"></div>
          
          {/* Text Color */}
          <div className="color-picker-group">
            <span className="tool-label">Text:</span>
            <div className="color-scroll">
                {TEXT_COLORS.map(c => (
                <button key={c.name} className={`color-dot ${textColor === c.value ? 'selected' : ''}`} style={{ backgroundColor: c.value }} onClick={() => setTextColor(c.value)} title={c.name}/>
                ))}
            </div>
          </div>

          <div className="divider-v"></div>

          {/* Font Size Slider */}
          <div className="color-picker-group">
            <span className="tool-label" style={{minWidth:'30px'}}>Size: {fontSize}</span>
            <input 
              type="range" 
              min="12" max="32" 
              value={fontSize} 
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="size-slider"
            />
          </div>

        </div>

        <div className="paper-sheet">
          <div className="paper-header-row">
             <span className="current-date-header">
                {new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
             </span>
          </div>

          {/* ✅ TITLE INPUT */}
          <input 
            type="text" 
            className="journal-title-input" 
            placeholder="Title of the day..." 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ color: textColor }}
          />
          
          {/* ✅ MAIN TEXTAREA (Dynamic Font Size) */}
          <textarea
            className="journal-textarea"
            placeholder="Start writing..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ color: textColor, fontSize: `${fontSize}px` }} 
          />
        </div>

        <div className="editor-footer">
          <button className="save-journal-btn" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : (selectedId ? "Update Entry" : "Save Entry")}
          </button>
        </div>
      </div>
    </div>
  );
}