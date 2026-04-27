import React, { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp 
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import "./Tasks.css";

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Inputs
  const [newTask, setNewTask] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");

  // Edit Mode
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState("Medium");
  const [editDueDate, setEditDueDate] = useState("");

  // 1. FETCH
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "personalTasks"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // 2. ADD
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      await addDoc(collection(db, "personalTasks"), {
        uid: user.uid,
        text: newTask,
        priority: priority,
        dueDate: dueDate,
        isCompleted: false,
        createdAt: serverTimestamp()
      });
      setNewTask(""); setDueDate(""); setPriority("Medium");
    } catch (err) { console.error(err); }
  };

  // 3. ACTIONS
  const toggleComplete = async (task) => {
    await updateDoc(doc(db, "personalTasks", task.id), { isCompleted: !task.isCompleted });
  };

 const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "personalTasks", id));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const startEditing = (task) => {
    setEditingId(task.id);
    setEditText(task.text);
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate);
  };

  const saveEdit = async () => {
    await updateDoc(doc(db, "personalTasks", editingId), { 
        text: editText,
        priority: editPriority,
        dueDate: editDueDate
    });
    setEditingId(null);
  };

  // Helper: Format Date
 const formatDate = (dateString) => {
    if (!dateString) return null;
    
    const targetDate = new Date(dateString);
    const today = new Date();
    today.setHours(0,0,0,0);
    targetDate.setHours(0,0,0,0);

    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const options = { month: 'short', day: 'numeric' };
    const dateText = targetDate.toLocaleDateString('en-US', options); 

    let statusText = "";
    let className = "date-badge";

    if (diffDays < 0) {
      statusText = `Overdue (${Math.abs(diffDays)}d)`;
      className += " overdue";
    } else if (diffDays === 0) {
      statusText = "Today";
      className += " today";
    } else if (diffDays === 1) {
      statusText = "Tomorrow";
      className += " tomorrow";
    } else {
      // ✅ UPDATED: Shows days left for future dates
      statusText = `(${diffDays} days left)`;
    }

    return (
      <span className={className}>
        📅 {dateText} <span style={{marginLeft:'4px'}}>{statusText}</span>
      </span>
    );
  };
  if (loading) return <div className="tasks-page loading"><div className="spinner"></div></div>;

  const pendingCount = tasks.filter(t => !t.isCompleted).length;
  const completedCount = tasks.filter(t => t.isCompleted).length;

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <div>
            <h1>Tasks & Priorities</h1>
            <p>Stay organized and get things done.</p>
        </div>
        <div className="header-stats">
            <div className="stat-pill orange">
                <span className="stat-num">{pendingCount}</span> Pending
            </div>
            <div className="stat-pill green">
                <span className="stat-num">{completedCount}</span> Done
            </div>
        </div>
      </div>

      {/* ADD BAR */}
      <div className="add-task-wrapper">
        <form className="add-task-form" onSubmit={handleAddTask}>
          <input 
            type="text" 
            placeholder="Add a new task..." 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="task-input-main"
          />
          <div className="form-actions">
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="priority-select">
              <option value="High">High Priority</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="date-input" />
            <button type="submit" className="add-btn">
                <span>+</span> Add
            </button>
          </div>
        </form>
      </div>

      {/* TASK LIST */}
      <div className="task-list-container">
        {tasks.map(task => (
          <div key={task.id} className={`task-card ${task.isCompleted ? 'completed' : ''} priority-border-${task.priority.toLowerCase()}`}>
            
            <div className="task-check-wrapper">
              <input 
                type="checkbox" 
                checked={task.isCompleted} 
                onChange={() => toggleComplete(task)}
                className="custom-checkbox"
              />
            </div>

            <div className="task-content">
              {editingId === task.id ? (
                <div className="edit-mode-box">
                    <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} className="edit-input" autoFocus />
                    <div className="edit-row">
                        <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className="edit-select">
                            <option>High</option><option>Medium</option><option>Low</option>
                        </select>
                        <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="edit-date" />
                    </div>
                </div>
              ) : (
                <span className="task-text">{task.text}</span>
              )}
              
              {!editingId && (
                  <div className="task-meta-row">
                    {task.priority && (
                      <span className={`meta-badge priority-${task.priority.toLowerCase()}`}>
                        {task.priority}
                      </span>
                    )}
                    {formatDate(task.dueDate)}
                  </div>
              )}
            </div>

            <div className="task-actions">
              {editingId === task.id ? (
                <button onClick={saveEdit} className="text-action-btn save">Save</button>
              ) : (
                <button onClick={() => startEditing(task)} className="text-action-btn edit">Edit</button>
              )}
              <button onClick={() => handleDelete(task.id)} className="text-action-btn delete">Delete</button>
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <p>No tasks yet. Start by adding one!</p>
          </div>
        )}
      </div>
    </div>
  );
}