import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (requireAdmin && !isAdmin) {
    return <div style={{ padding: 24 }}>You are not allowed to see this page.</div>;
  }

  return children;
}
