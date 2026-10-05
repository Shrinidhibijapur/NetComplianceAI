import { SystemStatus } from "./SystemStatus";
import type { NavTab } from "./Sidebar";

interface TopbarProps {
  readonly activeTab: NavTab;
  readonly onRefresh: () => void;
}

const TAB_TITLES: Record<NavTab, { title: string; breadcrumb: string }> = {
  dashboard: { title: "Network Security Command Center", breadcrumb: "Overview / Command Center" },
  upload: { title: "Configuration Ingestion", breadcrumb: "Overview / Config Ingestion" },
  devices: { title: "Audited Infrastructure Devices", breadcrumb: "Overview / Devices" },
  findings: { title: "Compliance Audit & Findings", breadcrumb: "Compliance / Audit & Findings" },
  training: { title: "AI Training & Learning Loop", breadcrumb: "Intelligence / AI Training" },
  rules: { title: "Active Learned Extraction Rules", breadcrumb: "Intelligence / Learned Rules" },
};

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
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
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
