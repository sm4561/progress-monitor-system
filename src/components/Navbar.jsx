import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import ThemeToggle from "./ThemeToggle";
import "./Navbar.css";
import logo from "../assets/logo.png"; 

export default function Navbar() {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false); // Profile Menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile Menu
  
  // Image State
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [imageError, setImageError] = useState(false); // ✅ Tracks if image is broken

  // Fetch Image from Database
  useEffect(() => {
    if (user) {
      const fetchAvatar = async () => {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().photoBase64) {
            setAvatarUrl(docSnap.data().photoBase64);
            setImageError(false); // Reset error if we get a new image
          }
        } catch (err) { console.log(err); }
      };
      fetchAvatar();
    }
  }, [user]);

  const initials = user?.displayName
    ? user.displayName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
    : "U";

  // ✅ SMART IMAGE LOGIC:
  // 1. Use DB Image (avatarUrl) first.
  // 2. Use Auth Image (user.photoURL) ONLY if it's not a "blob:" link.
  const authPhoto = user?.photoURL && !user.photoURL.startsWith('blob:') ? user.photoURL : null;
  const finalImage = avatarUrl || authPhoto;

  return (
    <nav className="navbar">
      
      {/* --- LEFT SIDE: LOGO & MOBILE BTN --- */}
      <div className="nav-left">
        {user && (
            <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? "✕" : "☰"}
            </button>
        )}

        <Link to={user ? "/dashboard" : "/login"} className="logo-link">
          <img src={logo} alt="Logo" className="logo-img" />
          <span className="logo-text">Progress Monitor</span>
        </Link>
        
        {/* Mobile Menu Links */}
        {user && (
          <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
            <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
            <Link to="/log-today" onClick={() => setMobileMenuOpen(false)}>Daily logs</Link>
            <Link to="/week/P1" onClick={() => setMobileMenuOpen(false)}>Overview</Link>
            <Link to="/tasks" onClick={() => setMobileMenuOpen(false)}>Tasks</Link>
            {/* ✅ ADD THIS LINK */}
  <Link to="/reminders" onClick={() => setMobileMenuOpen(false)}>Reminders</Link> 
            <Link to="/journal" onClick={() => setMobileMenuOpen(false)}>Diary</Link> 
            
          </div>
        )}
      </div>

      {/* --- RIGHT SIDE: PROFILE --- */}
      <div className="nav-right">
        <ThemeToggle />
        
        {user ? (
          <div className="profile-container" onClick={() => setShowMenu(!showMenu)}>
            
            {/* ✅ SHOW IMAGE ONLY IF VALID & NOT BROKEN */}
            {finalImage && !imageError ? (
               <img 
                 src={finalImage} 
                 alt="Profile" 
                 className="user-avatar-small"
                 onError={() => setImageError(true)} // If fails, switch to Initials
               />
            ) : (
               <div className="user-circle">{initials}</div>
            )}
            
            {showMenu && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <p className="user-name">{user.displayName || "User"}</p>
                </div>
                <hr />
                <Link to="/profile" className="dropdown-item">Settings</Link>
                <button className="dropdown-item logout" onClick={logout}>Logout</button>
              </div>
            )}
          </div>
        ) : (
          <div className="auth-buttons">
            <Link to="/login" className="nav-btn-link">Login</Link>
          </div>
        )}
      </div>
    </nav>
  );
}