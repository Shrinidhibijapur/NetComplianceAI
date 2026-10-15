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
        <h1 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          {info.title}
        </h1>
      </div>

      <SystemStatus onRefresh={onRefresh} />
    </header>
  );
}
