import React, { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, deleteDoc, doc, updateDoc, serverTimestamp 
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import "./Reminders.css";

// Helper to calculate "X days left"
const getRelativeDate = (dateString) => {
    if (!dateString) return null;
    const target = new Date(dateString);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
    if (diffDays < 0) return { text: `(${Math.abs(diffDays)} days ago)`, isOverdue: true };
    if (diffDays === 0) return { text: "(Today)", isOverdue: false };
    if (diffDays === 1) return { text: "(Tomorrow)", isOverdue: false };
    return { text: `(${diffDays} days left)`, isOverdue: false };
};

// Individual Note Component to handle Edit State
const NoteItem = ({ item, onDelete, onUpdate, onTogglePin }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(item.text);
    const [editTag, setEditTag] = useState(item.tag);
    const [editDate, setEditDate] = useState(item.targetDate || "");

    const handleSave = () => {
        if (!editText.trim()) return;
        onUpdate(item.id, { 
            text: editText, 
            tag: editTag, 
            targetDate: editDate || null 
        });
        setIsEditing(false);
    };

    const dateObj = item.targetDate ? new Date(item.targetDate) : null;
    const relativeDate = getRelativeDate(item.targetDate);

    // SVG Icons
    const PinIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" fill={item.isPinned ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
        </svg>
    );

    if (isEditing) {
        return (
            <div className={`note-card editing border-${editTag.toLowerCase()}`}>
                <select value={editTag} onChange={(e) => setEditTag(e.target.value)} className="clean-select edit-select">
                    <option value="General">General</option>
                    <option value="Idea">Idea</option>
                    <option value="Code">Code</option>
                    <option value="Important">Important</option>
                    <option value="To-Do">To-Do</option>
                </select>
                <textarea 
                    value={editText} 
                    onChange={(e) => setEditText(e.target.value)} 
                    className="edit-textarea"
                    rows="4"
                />
                <input 
                    type="date" 
                    value={editDate} 
                    onChange={(e) => setEditDate(e.target.value)} 
                    className="clean-date-input edit-date"
                />
                <div className="note-footer edit-footer">
                    <button onClick={() => setIsEditing(false)} className="cancel-btn">Cancel</button>
                    <button onClick={handleSave} className="save-btn">Save</button>
                </div>
            </div>
        );
    }

    return (
        <div className={`note-card ${item.isPinned ? 'pinned' : ''} border-${item.tag.toLowerCase()}`}>
            <div className="note-header">
                <div className="note-meta">
                    <span className={`badge badge-${item.tag.toLowerCase()}`}>{item.tag}</span>
                    {dateObj && (
                        <span className={`date-badge ${relativeDate.isOverdue ? 'overdue' : ''}`}>
                            📅 {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                            <span className="relative-date">{relativeDate.text}</span>
                        </span>
                    )}
                </div>
                <button onClick={() => onTogglePin(item)} className={`pin-btn ${item.isPinned ? 'active' : ''}`} title={item.isPinned ? "Unpin" : "Pin to top"}>
                    <PinIcon />
                </button>
            </div>
            
            <div className="note-content">
                <p>{item.text}</p>
            </div>
            
            <div className="note-footer">
                <button onClick={() => setIsEditing(true)} className="action-link edit">Edit</button>
                <button onClick={() => onDelete(item.id)} className="action-link delete">Delete</button>
            </div>
        </div>
    );
};


export default function Reminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Input State
  const [newNote, setNewNote] = useState("");
  const [tag, setTag] = useState("General");
  const [targetDate, setTargetDate] = useState("");

  // 1. FETCH REMINDERS
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "userReminders"),
      where("uid", "==", user.uid),
      orderBy("isPinned", "desc"), 
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReminders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // 2. ADD REMINDER
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await addDoc(collection(db, "userReminders"), {
        uid: user.uid,
        text: newNote,
        tag: tag,
        targetDate: targetDate || null,
        isPinned: false,
        createdAt: serverTimestamp()
      });
      setNewNote(""); 
      setTargetDate("");
    } catch (err) { console.error(err); }
  };

  // 3. UPDATE REMINDER
  const handleUpdate = async (id, refdData) => {
      try {
          await updateDoc(doc(db, "userReminders", id), refdData);
      } catch (err) { console.error("Error updating document: ", err); }
  };

  // 4. DELETE & PIN
  const handleDelete = async (id) => {
    if(window.confirm("Are you sure you want to delete this note?")) {
        await deleteDoc(doc(db, "userReminders", id));
    }
  };

  const togglePin = async (item) => {
    await updateDoc(doc(db, "userReminders", item.id), { isPinned: !item.isPinned });
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div className="reminders-page">
      <div className="reminders-header">
        <div>
            <h1>Reminders & Notes</h1>
            <p>Your personal knowledge base. Don't forget a thing.</p>
        </div>
        <div className="header-stats">
            <span className="stat-pill">{reminders.length} Notes</span>
        </div>
      </div>

      {/* INPUT AREA */}
      <div className="add-reminder-card main-input">
        <form onSubmit={handleAdd}>
            <textarea 
                placeholder="What do you need to remember?" 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows="3"
                className="reminder-input"
            ></textarea>
            
            <div className="input-row-bottom">
                <div className="input-tools">
                    <select value={tag} onChange={(e) => setTag(e.target.value)} className="clean-select">
                        <option value="General">General</option>
                        <option value="Idea">Idea</option>
                        <option value="Code">Code</option>
                        <option value="Important">Important</option>
                        <option value="To-Do">To-Do</option>
                    </select>
                    <input 
                        type="date" 
                        className="clean-date-input"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        title="Set a due date (optional)"
                    />
                </div>
                <button type="submit" className="add-btn">+ Add Note</button>
            </div>
        </form>
      </div>

      {/* NOTES GRID */}
      <div className="notes-grid">
        {reminders.map(item => (
            <NoteItem 
                key={item.id} 
                item={item} 
                onDelete={handleDelete} 
                onUpdate={handleUpdate}
                onTogglePin={togglePin}
            />
        ))}
      </div>

       {reminders.length === 0 && (
            <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>No notes yet</h3>
                <p>Type something above to get started!</p>
            </div>
        )}
    </div>
  );
}