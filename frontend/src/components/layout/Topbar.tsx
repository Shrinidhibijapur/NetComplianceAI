import { SystemStatus } from "./SystemStatus";
import type { NavTab } from "./Sidebar";
import { TAB_TITLES } from "../../router";

interface TopbarProps {
  readonly activeTab: NavTab;
  readonly onRefresh: () => void;
}

export function Topbar({ activeTab, onRefresh }: TopbarProps) {
  const info = TAB_TITLES[activeTab] || { title: "ComplianceAI Console", breadcrumb: "Console" };

  return (
    <header
      style={{
        height: "56px",
        backgroundColor: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.5rem",
      }}
    >
      <div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", marginBottom: "0.15rem" }}>
          {info.breadcrumb}
        </div>
        <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {info.title}
        </div>
      </div>

      <SystemStatus onRefresh={onRefresh} />
    </header>
  );
}
