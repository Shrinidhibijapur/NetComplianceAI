import React, { useState, useEffect } from "react";
import { toast } from "../toast";

interface UserRecord {
  id: number;
  username: string;
  email?: string | null;
  role: string;
  active: boolean;
  lastActive: string;
}

const DEFAULT_USERS: UserRecord[] = [
  { id: 1, username: "admin", role: "ADMIN", active: true, lastActive: "Today, 10:42" },
  { id: 2, username: "analyst01", role: "AUDITOR", active: true, lastActive: "Today, 09:18" },
  { id: 3, username: "reviewer02", role: "VIEWER", active: true, lastActive: "Yesterday" },
];

interface SecurityUsersPageProps {
  readonly refreshKey?: number;
}

export function SecurityUsersPage({ refreshKey }: SecurityUsersPageProps) {
  const [users, setUsers] = useState<UserRecord[]>(DEFAULT_USERS);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("auditor");
  const [submitting, setSubmitting] = useState(false);

  // Fetch real users from backend if admin
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("complianceai_token");
        const res = await fetch("/api/auth/users", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setUsers(
              data.map((u: { id: number; username: string; email?: string | null; role: string; active: boolean }) => ({
                id: u.id,
                username: u.username,
                email: u.email,
                role: u.role.toUpperCase(),
                active: u.active,
                lastActive: "Today",
              }))
            );
          }
        }
      } catch {
        // Dev fallback to default sample users
      }
    };
    fetchUsers();
  }, [refreshKey]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("complianceai_token");
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          email: newEmail || undefined,
          role: newRole,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to create user");
      }

      toast.success(`User '${newUsername}' created successfully`);
      setUsers((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          username: newUsername,
          email: newEmail,
          role: newRole.toUpperCase(),
          active: true,
          lastActive: "Just now",
        },
      ]);
      setCreateModalOpen(false);
      setNewUsername("");
      setNewPassword("");
      setNewEmail("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating user";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Security and users</h1>
          <p className="page-subtitle">
            Manage assigned accounts and review effective role permissions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="btn btn-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create user
        </button>
      </div>

      {/* Notice Banner matching asset */}
      <div className="notice-banner">
        User creation is an administrator-controlled operation. Do not add public self-registration unless the backend explicitly supports it.
      </div>

      {/* Top 2-Column Grid: Users Table + Security Controls */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: "1.5rem",
          marginBottom: "1.75rem",
          alignItems: "start",
        }}
      >
        {/* Users Card */}
        <div className="data-table-wrapper">
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#FFFFFF",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0F172A" }}>Users</div>
            <span style={{ fontSize: "0.75rem", color: "#64748B" }}>Sample layout</span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                    {u.username}
                  </td>
                  <td style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.04em", color: "#475569" }}>
                    {u.role}
                  </td>
                  <td>
                    <span className="badge badge-active">
                      <span className="badge-dot" /> ACTIVE
                    </span>
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "#64748B" }}>{u.lastActive}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toast.info(`Account details for ${u.username}`)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#0F172A",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer">
            <div>Showing {users.length} sample users</div>
            <div className="pagination-controls">
              <button type="button" className="pagination-btn" disabled>‹</button>
              <button type="button" className="pagination-btn active">1</button>
              <button type="button" className="pagination-btn">2</button>
              <button type="button" className="pagination-btn">3</button>
              <button type="button" className="pagination-btn">›</button>
            </div>
          </div>
        </div>

        {/* Security Controls Card */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            padding: "1.25rem 1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.25rem",
              paddingBottom: "0.85rem",
              borderBottom: "1px solid #F1F5F9",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0F172A" }}>
              Security controls
            </div>
            <span style={{ fontSize: "0.75rem", color: "#64748B" }}>Platform view</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "#334155" }}>Authentication</span>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "4px",
                  color: "#0F172A",
                }}
              >
                JWT access token
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "#334155" }}>Password storage</span>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "4px",
                  color: "#0F172A",
                }}
              >
                PBKDF2-HMAC-SHA256
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "#334155" }}>API protection</span>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "4px",
                  color: "#0F172A",
                }}
              >
                Server-side role checks
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "#334155" }}>Audit events</span>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "4px",
                  color: "#0F172A",
                }}
              >
                Persistent event records
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "#334155" }}>Rate limiting</span>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "4px",
                  color: "#0F172A",
                }}
              >
                Configured on API
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Role Permission Matrix Card */}
      <div className="data-table-wrapper">
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0F172A" }}>
            Role permission matrix
          </div>
          <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
            Reference only — backend is authoritative
          </span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Permission</th>
              <th style={{ width: "160px" }}>Admin</th>
              <th style={{ width: "160px" }}>Auditor</th>
              <th style={{ width: "160px" }}>Viewer</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Upload configurations</td>
              <td style={{ color: "#059669", fontWeight: 700 }}>✔</td>
              <td style={{ color: "#059669", fontWeight: 700 }}>✔</td>
              <td style={{ color: "#059669", fontWeight: 700 }}>✔</td>
            </tr>
            <tr>
              <td>Run analysis</td>
              <td style={{ color: "#059669", fontWeight: 700 }}>✔</td>
              <td style={{ color: "#059669", fontWeight: 700 }}>✔</td>
              <td style={{ color: "#059669", fontWeight: 700 }}>✔</td>
            </tr>
            <tr>
              <td>Approve learned rules</td>
              <td style={{ color: "#059669", fontWeight: 700 }}>✔</td>
              <td style={{ color: "#059669", fontWeight: 700 }}>✔</td>
              <td style={{ color: "#059669", fontWeight: 700 }}>✔</td>
            </tr>
            <tr>
              <td>Manage users</td>
              <td style={{ color: "#059669", fontWeight: 700 }}>✔</td>
              <td style={{ color: "#64748B" }}>No</td>
              <td style={{ color: "#64748B" }}>No</td>
            </tr>
            <tr>
              <td>Disable/delete rules</td>
              <td style={{ color: "#059669", fontWeight: 700 }}>✔</td>
              <td style={{ color: "#D97706", fontSize: "0.8rem" }}>Policy dependent</td>
              <td style={{ color: "#64748B" }}>No</td>
            </tr>
            <tr>
              <td>View audit logs</td>
              <td style={{ color: "#059669", fontWeight: 700 }}>✔</td>
              <td style={{ color: "#059669", fontWeight: 700 }}>✔</td>
              <td style={{ color: "#059669", fontWeight: 700 }}>✔</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {createModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "10px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
              width: "100%",
              maxWidth: "460px",
              padding: "1.75rem",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0F172A", margin: 0 }}>
                Create New System User
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#94A3B8" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label
                  htmlFor="create-username"
                  style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}
                >
                  Username
                </label>
                <input
                  id="create-username"
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="analyst_smith"
                  className="search-input-field"
                  style={{ paddingLeft: "0.85rem" }}
                />
              </div>

              <div>
                <label
                  htmlFor="create-email"
                  style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}
                >
                  Corporate Email
                </label>
                <input
                  id="create-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="smith@company.com"
                  className="search-input-field"
                  style={{ paddingLeft: "0.85rem" }}
                />
              </div>

              <div>
                <label
                  htmlFor="create-password"
                  style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}
                >
                  Password
                </label>
                <input
                  id="create-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="search-input-field"
                  style={{ paddingLeft: "0.85rem" }}
                />
              </div>

              <div>
                <label
                  htmlFor="create-role"
                  style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}
                >
                  Assigned RBAC Role
                </label>
                <select
                  id="create-role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="filter-select"
                  style={{ width: "100%" }}
                >
                  <option value="viewer">Viewer</option>
                  <option value="auditor">Auditor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? "Creating..." : "Save User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
