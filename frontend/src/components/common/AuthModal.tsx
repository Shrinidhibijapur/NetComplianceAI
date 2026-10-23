import React, { useState } from "react";
import "../../styles/auth.css";
import { api, setAuthToken } from "../../api";
import { toast } from "../../toast";

interface UserProfile {
  username: string;
  role: string;
}

interface AuthModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onAuthSuccess: (user: UserProfile) => void;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "auditor" | "viewer">("auditor");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (uname: string, pword: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.login(uname, pword);
      setAuthToken(res.access_token);
      toast.success(`Logged in as ${res.username} (${res.role})`);
      onAuthSuccess({ username: res.username, role: res.role });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.register(username, password, email || undefined, role);
      setAuthToken(res.access_token);
      toast.success(`Account for '${res.username}' created in PostgreSQL! Welcome to ComplianceAI.`);
      onAuthSuccess({ username: res.username, role: res.role });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    handleLogin(u, p);
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-card-container" onClick={(e) => e.stopPropagation()}>
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="auth-close-btn"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Left Hero Panel */}
        <div className="auth-left-panel">
          <img
            src="/assets/auth_left_banner.png"
            alt="ComplianceAI - Secure Networks. Compliant Infrastructure."
            className="auth-left-banner-img"
          />
        </div>

        {/* Right Form Panel */}
        <div className="auth-right-panel">
          <h2 className="auth-header-title">
            {mode === "login" ? "Sign in" : "Sign up"}
          </h2>
          <p className="auth-header-subtitle">
            {mode === "login"
              ? "Access your ComplianceAI console."
              : "Register your enterprise account."}
          </p>

          {errorMsg && (
            <div className="auth-error-banner">
              <span>⚠</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === "login" ? (
            <>
              <form
                className="auth-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLogin(username, password);
                }}
              >
                {/* Username Field */}
                <div className="auth-field-group">
                  <label htmlFor="auth-username" className="auth-label">
                    Username
                  </label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                    <input
                      id="auth-username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="auth-input"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="auth-field-group">
                  <label htmlFor="auth-password" className="auth-label">
                    Password
                  </label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="auth-input"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Options Row */}
                <div className="auth-options-row">
                  <label className="auth-remember-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="auth-checkbox"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    className="auth-forgot-link"
                    onClick={() => toast.info("Password reset link requested. Check your email or use demo roles.")}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit-btn"
                >
                  {loading ? "Signing in..." : "Sign In →"}
                </button>
              </form>

              {/* Quick Role Selection (Matches 02_sign_up.png) */}
              <div className="auth-roles-divider">
                <span>LOGIN AS (ROLE INFORMATION)</span>
                <hr />
              </div>

              <div className="auth-roles-grid">
                {/* Admin Card */}
                <div
                  className="auth-role-card"
                  onClick={() => selectDemoAccount("admin", "admin123")}
                  title="Log in as Administrator"
                >
                  <div className="auth-role-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="2 4 5 20 19 20 22 4 15 10 12 2 9 10 2 4" />
                    </svg>
                  </div>
                  <div className="auth-role-title">Admin</div>
                  <div className="auth-role-desc">Full access and management</div>
                </div>

                {/* Auditor Card */}
                <div
                  className="auth-role-card"
                  onClick={() => selectDemoAccount("auditor", "auditor123")}
                  title="Log in as Security Auditor"
                >
                  <div className="auth-role-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div className="auth-role-title">Auditor</div>
                  <div className="auth-role-desc">Audit configurations and view reports</div>
                </div>

                {/* Viewer Card */}
                <div
                  className="auth-role-card"
                  onClick={() => selectDemoAccount("viewer", "viewer123")}
                  title="Log in as Read-Only Viewer"
                >
                  <div className="auth-role-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  <div className="auth-role-title">Viewer</div>
                  <div className="auth-role-desc">Read-only access to data and reports</div>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="auth-mode-switch">
                <span>Don't have an account?</span>{" "}
                <button
                  type="button"
                  className="auth-mode-switch-btn"
                  onClick={() => {
                    setMode("register");
                    setErrorMsg(null);
                  }}
                >
                  Create an account
                </button>
              </div>
            </>
          ) : (
            <>
              <form className="auth-form" onSubmit={handleRegister}>
                <div className="auth-field-group">
                  <label htmlFor="reg-username" className="auth-label">
                    Username
                  </label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                    <input
                      id="reg-username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      className="auth-input"
                    />
                  </div>
                </div>

                <div className="auth-field-group">
                  <label htmlFor="reg-email" className="auth-label">
                    Work Email (optional)
                  </label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      id="reg-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="analyst@enterprise.com"
                      className="auth-input"
                    />
                  </div>
                </div>

                <div className="auth-field-group">
                  <label htmlFor="reg-password" className="auth-label">
                    Password
                  </label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="auth-input"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="auth-field-group">
                  <label htmlFor="reg-role" className="auth-label">
                    Role Privilege
                  </label>
                  <select
                    id="reg-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as "admin" | "auditor" | "viewer")}
                    className="filter-select"
                    style={{ width: "100%", padding: "0.72rem 1rem" }}
                  >
                    <option value="viewer">Viewer (Read-only access)</option>
                    <option value="auditor">Auditor (Upload & evaluate)</option>
                    <option value="admin">Admin (Full administrative control)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit-btn"
                >
                  {loading ? "Creating account..." : "Create Account →"}
                </button>
              </form>

              {/* Mode Toggle */}
              <div className="auth-mode-switch">
                <span>Already have an account?</span>{" "}
                <button
                  type="button"
                  className="auth-mode-switch-btn"
                  onClick={() => {
                    setMode("login");
                    setErrorMsg(null);
                  }}
                >
                  Sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
