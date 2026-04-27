import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");
    setLoading(true);

    try {
      await login(email, pass);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/invalid-credential") {
        setErrorMsg("Invalid email or password.");
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email) {
      setErrorMsg("Enter your email first, then click 'Forgot password'.");
      return;
    }
    setErrorMsg("");
    setInfoMsg("");
    setResetLoading(true);
    try {
      await resetPassword(email);
      setInfoMsg("Password reset link sent to your email (check inbox / spam).");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">
            Log in to continue your progress and stay consistent.
          </p>

          <form onSubmit={handleLogin} className="auth-form">
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

            <div>
              <label className="auth-label">Password</label>
              <input
                className="auth-input"
                type="password"
                placeholder="Your password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
              />
              <div className="auth-small-row">
                <span />
                <button
                  type="button"
                  className="auth-link"
                  style={{ border: "none", background: "none", padding: 0 }}
                  onClick={handleForgot}
                  disabled={resetLoading}
                >
                  {resetLoading ? "Sending..." : "Forgot password?"}
                </button>
              </div>
            </div>

            {errorMsg && <div className="auth-error">{errorMsg}</div>}
            {infoMsg && <div className="auth-success">{infoMsg}</div>}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="auth-footer">
            New here?{" "}
            <Link to="/signup" className="auth-link">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
