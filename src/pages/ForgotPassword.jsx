import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setErrorMsg("");

    try {
      await resetPassword(email);
      setMsg("Password reset link sent. Check inbox or spam folder.");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">Reset password</h1>
          <p className="auth-subtitle">
            Enter your email and we&apos;ll send you a reset link.
          </p>

          <form onSubmit={handleReset} className="auth-form">
            <div>
              <label className="auth-label">Email address</label>
              <input
                className="auth-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {errorMsg && <div className="auth-error">{errorMsg}</div>}
            {msg && <div className="auth-success">{msg}</div>}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <div className="auth-footer">
            Remember your password?{" "}
            <Link to="/login" className="auth-link">
              Go back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
