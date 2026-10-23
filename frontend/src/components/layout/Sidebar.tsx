import React from "react";

export type NavTab =
  | "dashboard"
  | "upload"
  | "bulk"
  | "devices"
  | "findings"
  | "reports"
  | "audit"
  | "training"
  | "rules"
  | "frameworks"
  | "security";

interface UserProfile {
  username: string;
  role: string;
}

interface SidebarProps {
  readonly activeTab: NavTab;
  readonly onSelectTab: (tab: NavTab) => void;
  readonly currentUser?: UserProfile | null;
  readonly onSignOut?: () => void;
  readonly onSignIn?: () => void;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  currentUser,
  onSignOut,
  onSignIn,
}: SidebarProps) {

  return (
    <aside
      style={{
        width: "256px",
        backgroundColor: "#0F1216",
        borderRight: "1px solid #1E232B",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "1.25rem 0.85rem",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto" }}>
        {/* Brand Header */}
        <button
          type="button"
          onClick={() => onSelectTab("dashboard")}
          style={{
            background: "none",
            border: "none",
            color: "inherit",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            padding: "0.5rem 0.35rem",
            width: "100%",
            textAlign: "left",
            marginBottom: "1.75rem",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              backgroundColor: "#1A1F26",
              border: "1px solid #2D3748",
              color: "#FFFFFF",
              fontWeight: 800,
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              flexShrink: 0,
            }}
          >
            CA
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#FFFFFF", letterSpacing: "-0.01em" }}>
              ComplianceAI
            </div>
            <div style={{ fontSize: "0.68rem", color: "#94A3B8", lineHeight: 1.25, marginTop: "1px" }}>
              Network Security<br />Compliance Auditor
            </div>
          </div>
        </button>

        {/* Navigation Sections */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}>
          {/* OVERVIEW */}
          <div>
            <div className="sidebar-section-title">OVERVIEW</div>
            <SidebarItem
              active={activeTab === "dashboard"}
              onClick={() => onSelectTab("dashboard")}
              label="Command Center"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
              }
            />
            <SidebarItem
              active={activeTab === "upload"}
              onClick={() => onSelectTab("upload")}
              label="Configuration Upload"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              }
            />
            <SidebarItem
              active={activeTab === "bulk"}
              onClick={() => onSelectTab("bulk")}
              label="Bulk Jobs"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              }
            />
          </div>

          {/* AUDIT */}
          <div>
            <div className="sidebar-section-title">AUDIT</div>
            <SidebarItem
              active={activeTab === "devices"}
              onClick={() => onSelectTab("devices")}
              label="Devices"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" />
                  <line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
              }
            />
            <SidebarItem
              active={activeTab === "findings"}
              onClick={() => onSelectTab("findings")}
              label="Findings"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              }
            />
            <SidebarItem
              active={activeTab === "reports"}
              onClick={() => onSelectTab("reports")}
              label="Reports"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              }
            />
            <SidebarItem
              active={activeTab === "audit"}
              onClick={() => onSelectTab("audit")}
              label="Audit Logs"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
              }
            />
          </div>

          {/* INTELLIGENCE */}
          <div>
            <div className="sidebar-section-title">INTELLIGENCE</div>
            <SidebarItem
              active={activeTab === "training"}
              onClick={() => onSelectTab("training")}
              label="AI Training"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="3.6" y1="9" x2="20.4" y2="9" />
                  <line x1="3.6" y1="15" x2="20.4" y2="15" />
                  <path d="M11.5 3a17 17 0 0 0 0 18" />
                  <path d="M12.5 3a17 17 0 0 1 0 18" />
                </svg>
              }
            />
            <SidebarItem
              active={activeTab === "rules"}
              onClick={() => onSelectTab("rules")}
              label="Learned Rules"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              }
            />
          </div>

          {/* PLATFORM */}
          <div>
            <div className="sidebar-section-title">PLATFORM</div>
            <SidebarItem
              active={activeTab === "frameworks"}
              onClick={() => onSelectTab("frameworks")}
              label="Frameworks"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              }
            />
            <SidebarItem
              active={activeTab === "security"}
              onClick={() => onSelectTab("security")}
              label="Security / Users"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
          </div>
        </nav>
      </div>

      {/* Footer Profile Section */}
      <div
        style={{
          paddingTop: "1rem",
          borderTop: "1px solid #1E232B",
          marginTop: "1rem",
        }}
      >
        {currentUser ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0 0.35rem" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  backgroundColor: "#1E232B",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  border: "1px solid #2D3748",
                  flexShrink: 0,
                }}
              >
                {currentUser.username.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {currentUser.username}
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "#94A3B8",
                    textTransform: "capitalize",
                  }}
                >
                  {currentUser.role}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "0.75rem", padding: "0 0.35rem" }}>
              <button
                type="button"
                onClick={onSignOut}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94A3B8",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  padding: "0.2rem 0",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#FFFFFF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#94A3B8";
                }}
              >
                Sign out ↗
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: "0 0.35rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  backgroundColor: "#1E232B",
                  color: "#64748B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.85rem",
                  border: "1px solid #2D3748",
                  flexShrink: 0,
                }}
              >
                👤
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#E2E8F0" }}>
                  Signed Out
                </div>
                <div style={{ fontSize: "0.68rem", color: "#64748B" }}>
                  Guest access
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onSignIn}
              style={{
                width: "100%",
                background: "linear-gradient(180deg, #1A1F26 0%, #14181E 100%)",
                border: "1px solid #2D3748",
                borderRadius: "6px",
                color: "#10B981",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                padding: "0.5rem 0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#10B981";
                e.currentTarget.style.color = "#34D399";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2D3748";
                e.currentTarget.style.color = "#10B981";
              }}
            >
              Sign In / Register ↗
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function SidebarItem({
  active,
  onClick,
  icon,
  label,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly icon: React.ReactNode;
  readonly label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.5rem 0.75rem",
        borderRadius: "6px",
        border: "none",
        backgroundColor: active ? "#FFFFFF" : "transparent",
        color: active ? "#0F1216" : "#94A3B8",
        fontWeight: active ? 600 : 500,
        fontSize: "0.85rem",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s ease",
        marginBottom: "0.2rem",
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "#1A1F26";
          e.currentTarget.style.color = "#FFFFFF";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#94A3B8";
        }
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: active ? "#0F1216" : "inherit",
        }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

