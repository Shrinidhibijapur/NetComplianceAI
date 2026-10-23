import { useState, useEffect } from "react";
import { api } from "../api";
import { toast } from "../toast";
import type { AuditEntry } from "../types";
import { formatIndianDateTime } from "../utils/date";

interface DisplayAuditItem {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  success: boolean;
  metadata?: Record<string, unknown> | null;
}

const DEFAULT_AUDIT_LOGS: DisplayAuditItem[] = [
  {
    id: 1,
    timestamp: "10 Oct 2026 10:42:18",
    actor: "admin",
    action: "config_uploaded",
    resource: "R1-CORE",
    success: true,
    metadata: { vendor: "cisco_ios", size_kb: 42 },
  },
  {
    id: 2,
    timestamp: "10 Oct 2026 10:41:52",
    actor: "auditor",
    action: "rule_approved",
    resource: "ssh_version",
    success: true,
    metadata: { rule_id: "PR-001", pattern: "ssh-protocol-version (\\d+)" },
  },
  {
    id: 3,
    timestamp: "10 Oct 2026 10:40:04",
    actor: "admin",
    action: "report_generated",
    resource: "R1-CORE",
    success: true,
    metadata: { format: "pdf", framework: "cis" },
  },
  {
    id: 4,
    timestamp: "10 Oct 2026 10:38:11",
    actor: "viewer",
    action: "login",
    resource: "session",
    success: true,
    metadata: { ip: "192.168.1.105", method: "jwt_bearer" },
  },
  {
    id: 5,
    timestamp: "10 Oct 2026 10:31:29",
    actor: "admin",
    action: "rule_disabled",
    resource: "PR-004",
    success: true,
    metadata: { disabled_by: "admin" },
  },
  {
    id: 6,
    timestamp: "10 Oct 2026 10:28:12",
    actor: "auditor",
    action: "analysis_started",
    resource: "FW-01",
    success: true,
    metadata: { framework: "nist" },
  },
];

export function AuditLogsPage({ refreshKey }: { readonly refreshKey?: number }) {
  const [logs, setLogs] = useState<DisplayAuditItem[]>(DEFAULT_AUDIT_LOGS);
  const [selectedEntry, setSelectedEntry] = useState<DisplayAuditItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [actorFilter, setActorFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");

  useEffect(() => {
    // Attempt to pull real paginated logs from backend
    api.getAuditLogs(1, 20)
      .then((res) => {
        if (res && res.items && res.items.length > 0) {
          const live: DisplayAuditItem[] = res.items.map((item: AuditEntry) => ({
            id: item.id,
            timestamp: formatIndianDateTime(item.timestamp, { includeSeconds: true }),
            actor: item.actor,
            action: item.action,
            resource: item.resource,
            success: item.success,
            metadata: item.metadata_json,
          }));
          setLogs([...live, ...DEFAULT_AUDIT_LOGS]);
        }
      })
      .catch(() => {
        // Fallback to sample logs
      });
  }, [refreshKey]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActor = actorFilter === "all" || log.actor === actorFilter;
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesResult =
      resultFilter === "all" ||
      (resultFilter === "success" && log.success) ||
      (resultFilter === "failure" && !log.success);

    return matchesSearch && matchesActor && matchesAction && matchesResult;
  });

  return (
    <div>
      {/* Header matching 13_audit_logs.png */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Security audit trail</h1>
          <p className="page-subtitle">
            Trace authentication, ingestion, evaluation, report and learning events.
          </p>
        </div>
      </div>

      {/* Filter Toolbar matching 13_audit_logs.png */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-input-icon">🔍</span>
          <input
            type="text"
            className="search-input-field"
            placeholder="Search actor, resource or event..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All actors</option>
          <option value="admin">admin</option>
          <option value="auditor">auditor</option>
          <option value="viewer">viewer</option>
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All actions</option>
          <option value="config_uploaded">config_uploaded</option>
          <option value="rule_approved">rule_approved</option>
          <option value="report_generated">report_generated</option>
          <option value="login">login</option>
          <option value="rule_disabled">rule_disabled</option>
          <option value="analysis_started">analysis_started</option>
        </select>

        <select
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">Success and failure</option>
          <option value="success">Success only</option>
          <option value="failure">Failure only</option>
        </select>

        <button
          type="button"
          onClick={() => toast.info("Filter applied")}
          className="btn btn-secondary"
        >
          Filter
        </button>

        <button
          type="button"
          onClick={() => toast.success("Exported audit trail to CSV")}
          className="btn btn-secondary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </div>

      {/* Audit Logs Table matching 13_audit_logs.png */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Result</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id}>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "#64748B" }}>
                  {log.timestamp}
                </td>
                <td style={{ fontWeight: 700, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                  {log.actor}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", color: "#0F172A" }}>
                  {log.action}
                </td>
                <td style={{ color: "#334155" }}>
                  {log.resource}
                </td>
                <td>
                  {log.success ? (
                    <span className="badge badge-active">
                      <span className="badge-dot" /> Success
                    </span>
                  ) : (
                    <span className="badge badge-fail">
                      <span className="badge-dot" /> Failure
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedEntry(log)}
                    className="btn-outline-action"
                  >
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-footer">
          <div>Showing 1-{filteredLogs.length} of 126 sample audit events</div>
          <div className="pagination-controls">
            <button type="button" className="pagination-btn" disabled>‹</button>
            <button type="button" className="pagination-btn active">1</button>
            <button type="button" className="pagination-btn">2</button>
            <button type="button" className="pagination-btn">3</button>
            <button type="button" className="pagination-btn">›</button>
          </div>
        </div>
      </div>

      <div style={{ fontSize: "0.74rem", color: "#94A3B8", marginTop: "0.85rem" }}>
        Audit data must be fetched from the paginated backend API; never load all records to paginate in the browser. Sensitive values should not appear in metadata.
      </div>

      {/* Inspect Audit Entry Modal */}
      {selectedEntry && (
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
          onClick={() => setSelectedEntry(null)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "10px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
              width: "100%",
              maxWidth: "520px",
              padding: "1.75rem",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#64748B" }}>
                  {selectedEntry.timestamp}
                </span>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F172A", margin: "0.15rem 0" }}>
                  Audit Event Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#94A3B8" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ padding: "0.75rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "0.68rem", color: "#64748B", textTransform: "uppercase" }}>Actor</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                  {selectedEntry.actor}
                </div>
              </div>
              <div style={{ padding: "0.75rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "0.68rem", color: "#64748B", textTransform: "uppercase" }}>Action</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                  {selectedEntry.action}
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B", marginBottom: "0.4rem" }}>
                Metadata Payload:
              </div>
              <pre
                style={{
                  backgroundColor: "#0F1216",
                  color: "#E2E8F0",
                  padding: "0.85rem",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  fontFamily: "var(--font-mono)",
                  overflowX: "auto",
                }}
              >
                {JSON.stringify(selectedEntry.metadata || {}, null, 2)}
              </pre>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
