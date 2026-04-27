import { Routes, Route, Navigate } from "react-router-dom";

// Components
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Tasks from "./pages/Tasks.jsx"; // ✅ Import Tasks
import Journal from './pages/Journal.jsx';

import Reminders from "./pages/Reminders.jsx";
// Pages
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import LogToday from "./pages/LogToday.jsx";
import WeekOverview from "./pages/WeekOverview.jsx";
import Profile from "./pages/Profile.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Admin from "./pages/Admin.jsx"; // ✅ Import Admin Page

function App() {
  return (
    <div className="app">
      {/* ✅ NAVBAR IS HERE - OUTSIDE ROUTES */}
      <Navbar />

      <Routes>
        {/* Redirect Root to Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        {/* ✅ ADD THIS NEW ROUTE */}
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/journal" 
          element={
            <ProtectedRoute>
              <Journal />
            </ProtectedRoute>
          } 
        />
        {/* ✅ ADD THIS NEW ROUTE */}
        <Route
          path="/reminders"
          element={
            <ProtectedRoute>
              <Reminders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/log-today"
          element={
            <ProtectedRoute>
              <LogToday />
            </ProtectedRoute>
          }
        />

        <Route
          path="/week/:weekId"
          element={
            <ProtectedRoute>
              <WeekOverview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* ✅ Admin Route Enabled for Data Upload */}
        <Route 
          path="/admin" 
          element={<Admin />} 
        />

      </Routes>
    </div>
  );
}

export default App;