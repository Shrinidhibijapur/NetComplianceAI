export type NavTab = "dashboard" | "upload" | "devices" | "findings" | "training" | "rules";

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onExit?: () => void;
}

export function Sidebar({ activeTab, onSelectTab, onExit }: SidebarProps) {
  return (
    <aside
      style={{
        width: "240px",
        backgroundColor: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "1.25rem 0.75rem",
        userSelect: "none",
      }}
    >
      <div>
        {/* Brand */}
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
            gap: "0.75rem",
            padding: "0.5rem",
            width: "100%",
            textAlign: "left",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--accent-dim)",
              border: "1px solid var(--border-accent)",
              color: "var(--accent-primary)",
              fontWeight: 800,
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
            }}
          >
            CA
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>ComplianceAI</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Security Console
            </div>
          </div>
        </button>

        {/* Navigation Sections */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* OVERVIEW */}
          <div>
            <div
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                padding: "0 0.5rem 0.4rem",
              }}
            >
              OVERVIEW
            </div>
            <SidebarButton
              active={activeTab === "dashboard"}
              onClick={() => onSelectTab("dashboard")}
              icon="⊞"
              label="Command Center"
            />
            <SidebarButton
              active={activeTab === "upload"}
              onClick={() => onSelectTab("upload")}
              icon="⇪"
              label="Config Ingestion"
            />
            <SidebarButton
              active={activeTab === "devices"}
              onClick={() => onSelectTab("devices")}
              icon="▤"
              label="Devices"
            />
          </div>

          {/* COMPLIANCE */}
          <div>
            <div
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                padding: "0 0.5rem 0.4rem",
              }}
            >
              COMPLIANCE
            </div>
            <SidebarButton
              active={activeTab === "findings"}
              onClick={() => onSelectTab("findings")}
              icon="🛡"
              label="Audit & Findings"
            />
          </div>

          {/* INTELLIGENCE */}
          <div>
            <div
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                padding: "0 0.5rem 0.4rem",
              }}
            >
              INTELLIGENCE
            </div>
            <SidebarButton
              active={activeTab === "training"}
              onClick={() => onSelectTab("training")}
              icon="◈"
              label="AI Training"
            />
            <SidebarButton
              active={activeTab === "rules"}
              onClick={() => onSelectTab("rules")}
              icon="⚙"
              label="Learned Rules"
            />
          </div>
        </nav>
      </div>

      {/* Footer */}
      <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="btn btn-secondary btn-sm"
            style={{ width: "100%", justifyContent: "flex-start", marginBottom: "0.75rem" }}
          >
            ← Back to Landing
          </button>
        )}
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          <div>ComplianceAI v0.1.0</div>
          <div>SIH26155 Enterprise Edition</div>
        </div>
      </div>
    </aside>
  );
}

function SidebarButton({
  active,
  onClick,
  icon,
  label,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly icon: string;
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
        gap: "0.6rem",
        padding: "0.45rem 0.6rem",
        borderRadius: "var(--radius-sm)",
        border: "none",
        backgroundColor: active ? "var(--accent-dim)" : "transparent",
        color: active ? "var(--accent-primary)" : "var(--text-secondary)",
        fontWeight: active ? 600 : 500,
        fontSize: "0.85rem",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s ease",
        marginBottom: "0.15rem",
      }}
    >
      <span style={{ fontSize: "0.9rem", opacity: active ? 1 : 0.7 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
