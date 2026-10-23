import React, { useState, useEffect } from "react";
import type { NavTab } from "./Sidebar";
import { TAB_TITLES } from "../../router";
import { api } from "../../api";

interface UserProfile {
  username: string;
  role: string;
}

interface TopbarProps {
  readonly activeTab: NavTab;
  readonly currentUser?: UserProfile | null;
  readonly onSearch?: (query: string) => void;
  readonly onOpenAuth?: () => void;
  readonly onSignOut?: () => void;
}

export function Topbar({ activeTab, currentUser, onSearch, onOpenAuth, onSignOut }: TopbarProps) {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const tabInfo = TAB_TITLES[activeTab] || {
    title: "Command Center",
    breadcrumb: "ComplianceAI  /  Command Center",
  };

  // Poll health status
  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        await api.health();
        if (mounted) setApiOnline(true);
      } catch {
        if (mounted) setApiOnline(false);
      }
    };
    checkHealth();
    const timer = setInterval(checkHealth, 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(searchQuery);
  };

  return (
    <header
      style={{
        height: "58px",
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.75rem",
        zIndex: 50,
      }}
    >
      {/* Left: Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.85rem", color: "#64748B", fontWeight: 500 }}>
          {tabInfo.breadcrumb}
        </span>
      </div>

      {/* Right: Search + API Status + User Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        {/* Search Input with ⌘ K */}
        <form onSubmit={handleSearchSubmit} style={{ position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "0.35rem 0.65rem 0.35rem 0.75rem",
              width: "280px",
              transition: "border-color 0.15s ease",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: "0.5rem", flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search devices, findings, rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "0.82rem",
                color: "#0F172A",
                width: "100%",
              }}
            />
            <kbd
              style={{
                fontSize: "0.7rem",
                fontFamily: "var(--font-mono)",
                color: "#64748B",
                backgroundColor: "#F1F5F9",
                border: "1px solid #E2E8F0",
                borderRadius: "4px",
                padding: "0.1rem 0.35rem",
                marginLeft: "0.5rem",
                flexShrink: 0,
              }}
            >
              ⌘ K
            </kbd>
          </div>
        </form>

        {/* API Status Dot */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            fontSize: "0.8rem",
            color: "#475569",
            fontWeight: 500,
          }}
          title={apiOnline ? "Backend API connected" : "Backend unreachable"}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: apiOnline ? "#10B981" : "#EF4444",
              display: "inline-block",
            }}
          />
          <span>API status</span>
        </div>

        {/* User Profile Chip / Menu */}
        {currentUser ? (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.25rem 0.35rem",
                borderRadius: "6px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#0F1216",
                  color: "#FFFFFF",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {currentUser.username.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ textAlign: "left", lineHeight: 1.2 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0F172A" }}>
                  {currentUser.username}
                </div>
                <div style={{ fontSize: "0.68rem", color: "#64748B", textTransform: "capitalize" }}>
                  {currentUser.role}
                </div>
              </div>
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: "0.5rem",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  minWidth: "180px",
                  zIndex: 100,
                  padding: "0.5rem",
                }}
              >
                <div
                  style={{
                    padding: "0.4rem 0.6rem",
                    fontSize: "0.75rem",
                    color: "#64748B",
                    borderBottom: "1px solid #F1F5F9",
                    marginBottom: "0.35rem",
                  }}
                >
                  Signed in as <strong style={{ color: "#0F172A" }}>{currentUser.username}</strong>
                </div>
                {onOpenAuth && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenAuth();
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      padding: "0.45rem 0.6rem",
                      fontSize: "0.82rem",
                      color: "#0F172A",
                      cursor: "pointer",
                      borderRadius: "4px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#F8FAFC";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    Switch Account / Role
                  </button>
                )}
                {onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onSignOut();
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      padding: "0.45rem 0.6rem",
                      fontSize: "0.82rem",
                      color: "#DC2626",
                      cursor: "pointer",
                      borderRadius: "4px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#FEF2F2";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    Sign Out
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="btn btn-primary btn-sm"
            style={{
              padding: "0.4rem 0.95rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}

