import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "firebase/auth";
import { 
  doc, getDoc, setDoc, collection, query, where, getDocs, 
  writeBatch 
} from "firebase/firestore";
import { db } from "../firebase/config";
import "./Profile.css";

export default function Profile() {
  const { user } = useAuth();
  
  // --- STATE ---
  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
    phone: "",
    bio: "",
    location: "",
  });
  
  const [stats, setStats] = useState({
    streak: 0,
    taskCompletion: 0,
    diaryEntries: 0,
    level: 1
  });

  const [photoPreview, setPhotoPreview] = useState(user?.photoURL || null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", content: "" });
  const fileInputRef = useRef(null);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          setFormData(prev => ({
            ...prev,
            phone: data.phone || "",
            bio: data.bio || "",
            location: data.location || ""
          }));
          // ✅ Load Base64 photo from Firestore if available
          if (data.photoBase64) setPhotoPreview(data.photoBase64);
        }

        // Stats Calculation
        const logsQ = query(collection(db, "userLogs"), where("userId", "==", user.uid));
        const logsSnap = await getDocs(logsQ);
        const streakCount = logsSnap.size;

        const taskQ = query(collection(db, "personalTasks"), where("uid", "==", user.uid));
        const taskSnap = await getDocs(taskQ);
        const completedTasks = taskSnap.docs.filter(d => d.data().isCompleted).length;
        const completionRate = taskSnap.size > 0 ? Math.round((completedTasks / taskSnap.size) * 100) : 0;

        const journalQ = query(collection(db, "userJournals"), where("uid", "==", user.uid));
        const journalSnap = await getDocs(journalQ);

        setStats({
          streak: streakCount,
          taskCompletion: completionRate,
          diaryEntries: journalSnap.size,
          level: Math.floor(streakCount / 5) + 1
        });

      } catch (err) {
        console.error("Error loading data:", err);
      }
    };

    fetchData();
  }, [user]);

  // --- HELPER: GET INITIALS ---
  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // --- HELPER: CONVERT IMAGE TO BASE64 ---
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => {
        resolve(fileReader.result);
      };
      fileReader.onerror = (error) => {
        reject(error);
      };
    });
  };

  // --- HANDLERS ---
  const handleImageClick = () => fileInputRef.current.click();

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // ⚠️ CHECK SIZE: Must be under 500KB to save to Firestore safely
      if (file.size > 500000) {
        alert("Image is too large! Please choose a smaller image (under 500KB).");
        return;
      }
      
      const base64 = await convertToBase64(file);
      setPhotoPreview(base64); // Show immediate preview
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- SAVE PROFILE ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", content: "" });

    try {
      // 1. Update Auth Profile (Name Only)
      if (user.displayName !== formData.displayName) {
        await updateProfile(user, { displayName: formData.displayName });
      }

      // 2. Update Firestore (Save Photo String Here)
      await setDoc(doc(db, "users", user.uid), {
        phone: formData.phone,
        bio: formData.bio,
        location: formData.location,
        photoBase64: photoPreview, // ✅ Save image string to DB
        email: user.email 
      }, { merge: true });

      setMessage({ type: "success", content: "✅ Profile updated successfully!" });
      
      // Force reload to update Navbar image
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error(error);
      setMessage({ type: "error", content: "❌ Failed to update. Image might be too large." });
    }
    setLoading(false);
  };

  // --- RESET HISTORY (Fixed Function) ---
 // --- RESET HISTORY (Fixed Collection Names) ---
   const handleResetProgress = async () => {
    if (!window.confirm("Are you sure you want to reset ALL progress? This cannot be undone!")) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);

      // 1. Logs (Correct)
      const logsQ = query(collection(db, "userLogs"), where("userId", "==", user.uid));
      const logsSnapshot = await getDocs(logsQ);
      logsSnapshot.forEach((doc) => batch.delete(doc.ref));

      // 2. Tasks (CHANGED: userTasks -> personalTasks)
      const tasksQ = query(collection(db, "personalTasks"), where("uid", "==", user.uid));
      const tasksSnapshot = await getDocs(tasksQ);
      tasksSnapshot.forEach((doc) => batch.delete(doc.ref));

      // 3. Diary (CHANGED: userDiary -> userJournals)
      const diaryQ = query(collection(db, "userJournals"), where("uid", "==", user.uid));
      const diarySnapshot = await getDocs(diaryQ);
      diarySnapshot.forEach((doc) => batch.delete(doc.ref));

      // 4. Reminders & Notes (Correct)
      const remindersQ = query(collection(db, "userReminders"), where("uid", "==", user.uid));
      const remindersSnapshot = await getDocs(remindersQ);
      remindersSnapshot.forEach((doc) => batch.delete(doc.ref));

      // 5. Settings (Correct)
      const settingsRef = doc(db, "userSettings", user.uid);
      batch.set(settingsRef, {
          startDate: new Date().toISOString().split('T')[0],
          displayName: user.displayName || "",
          photoURL: user.photoURL || ""
      });

      await batch.commit();
      alert("All progress has been reset successfully.");
      window.location.reload();

    } catch (error) {
      console.error("Error resetting progress: ", error);
      alert("An error occurred while resetting progress.");
    }
    setLoading(false);
  };

  return (
    <div className="profile-container">
      {/* HEADER */}
      <div className="profile-header-card">
        <div className="header-content">
           <div className="avatar-wrapper">
             <div className={`avatar-circle ${!photoPreview ? 'initials-mode' : ''}`}>
                {photoPreview ? (
                  /* ✅ FIXED: Added key={user?.uid} to force refresh on user change */
                  <img 
                    key={user?.uid} 
                    src={photoPreview} 
                    alt="Profile" 
                    className="avatar-img" 
                  />
                ) : (
                  <span className="avatar-initials">{getInitials(formData.displayName)}</span>
                )}
                 <div className="avatar-overlay" onClick={handleImageClick}>
                    <span>📷</span>
                 </div>
             </div>
             <input type="file" ref={fileInputRef} onChange={handleImageChange} style={{display: 'none'}} accept="image/*"/>
           </div>
           
           <div className="user-summary">
             <h1>{formData.displayName || "User"}</h1>
             <p className="summary-email">{formData.email}</p>
             <span className="role-badge">Level {stats.level} Developer</span>
           </div>
        </div>
      </div>

      <div className="profile-grid">
        {/* LEFT: FORM */}
        <div className="profile-section main-form-section">
          <div className="section-header">
            <h3>Edit Profile</h3>
            <p>Update your personal information.</p>
          </div>

          {message.content && (
            <div className={`alert ${message.type}`}>{message.content}</div>
          )}

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="displayName" value={formData.displayName} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input type="text" name="location" placeholder="City, Country" value={formData.location} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label>Email (Read-Only)</label>
              <input type="email" value={formData.email} disabled className="input-disabled" />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 234 567 890" />
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea name="bio" rows="4" value={formData.bio} onChange={handleChange} placeholder="Tell us about yourself..." />
            </div>

            <button type="submit" className="save-btn" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* RIGHT: STATS & DANGER ZONE */}
        <div className="profile-sidebar-gap">
            <div className="profile-section stats-section">
                <div className="section-header">
                    <h3>Your Performance</h3>
                    <p>Real-time activity stats.</p>
                </div>
                
                <div className="profile-stats-grid">
                    <div className="profile-stat-card indigo">
                        <span className="profile-stat-icon">🔥</span>
                        <div className="profile-stat-info">
                            <h4>{stats.streak} Days</h4>
                            <p>Active</p>
                        </div>
                    </div>
                    <div className="profile-stat-card green">
                        <span className="profile-stat-icon">✅</span>
                        <div className="profile-stat-info">
                            <h4>{stats.taskCompletion}%</h4>
                            <p>Task Rate</p>
                        </div>
                    </div>
                    <div className="profile-stat-card purple">
                        <span className="profile-stat-icon">📝</span>
                        <div className="profile-stat-info">
                            <h4>{stats.diaryEntries}</h4>
                            <p>Memories</p>
                        </div>
                    </div>
                    <div className="profile-stat-card orange">
                        <span className="profile-stat-icon">⭐</span>
                        <div className="profile-stat-info">
                            <h4>Lvl {stats.level}</h4>
                            <p>Rank</p>
                        </div>
                    </div>
                </div>
            </div>

             <div className="profile-section danger-zone">
                <h3 className="danger-title">Danger Zone</h3>
                <p className="danger-text">Resetting will delete all your progress, logs, tasks, and notes permanently.</p>
                {/* ✅ FIXED: Correct function name match */}
                <button type="button" className="danger-btn" onClick={handleResetProgress} disabled={loading}>
                    {loading ? "Resetting..." : "⚠️ Reset All Progress"}
                </button>
             </div>
        </div>
      </div>
    </div>
  );
}