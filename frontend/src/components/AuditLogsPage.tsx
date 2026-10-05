import { useEffect, useState } from "react";
import { api } from "../api";
import type { AuditEntry } from "../types";
import { toast } from "../toast";

export function AuditLogsPage({ refreshKey }: { readonly refreshKey?: number }) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [filterAction, setFilterAction] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLogs = (p: number, actionFilter: string) => {
    setLoading(true);
    api
      .getAuditLogs(p, pageSize, actionFilter || undefined)
      .then((res) => {
        setLogs(res.items);
        setTotal(res.total);
        setPage(res.page);
        setTotalPages(res.total_pages);
      })
      .catch((err) => {
        toast(`Failed to load audit logs: ${err.message}`, "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs(page, filterAction);
  }, [page, filterAction, refreshKey]);

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Panel */}
      <div
        className="glass-panel"
        style={{
          padding: "1.25rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Security Audit Trail
          </h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Immutable record of authentication, configuration ingestion, policy changes, and compliance reporting events
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setPage(1);
            }}
            className="input"
            style={{ fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
          >
            <option value="">All Security Actions</option>
            <option value="auth.login">Login / Auth</option>
            <option value="config.upload">Config Upload</option>
            <option value="config.upload_bulk">Bulk Config Upload</option>
            <option value="compliance.evaluate">Compliance Evaluation</option>
            <option value="reporting.pdf">PDF Report Generation</option>
            <option value="ai_rule.approved">Parse Rule Approval</option>
            <option value="ai_rule.disabled">Parse Rule Disabled</option>
            <option value="ai_rule.deleted">Parse Rule Deleted</option>
          </select>
          <button
            type="button"
            onClick={() => fetchLogs(page, filterAction)}
            className="btn btn-secondary btn-sm"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel" style={{ padding: "0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
          <thead>
            <tr
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                borderBottom: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                textTransform: "uppercase",
              }}
            >
              <th style={{ padding: "0.75rem 1rem" }}>Timestamp</th>
              <th style={{ padding: "0.75rem 1rem" }}>Actor</th>
              <th style={{ padding: "0.75rem 1rem" }}>Action</th>
              <th style={{ padding: "0.75rem 1rem" }}>Resource</th>
              <th style={{ padding: "0.75rem 1rem" }}>Status</th>
              <th style={{ padding: "0.75rem 1rem" }}>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  Loading security audit trail...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  No security audit events recorded.
                </td>
              </tr>
            ) : (
              logs.map((entry) => (
                <tr
                  key={entry.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.78rem",
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--accent-primary)" }}>
                    {entry.actor}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--accent-dim)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                    {entry.resource}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        padding: "0.15rem 0.45rem",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        backgroundColor: entry.success ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        color: entry.success ? "var(--status-pass)" : "var(--status-fail)",
                        border: `1px solid ${entry.success ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      }}
                    >
                      {entry.success ? "SUCCESS" : "FAILURE"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      maxWidth: "240px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={entry.metadata_json ? JSON.stringify(entry.metadata_json) : "-"}
                  >
                    {entry.metadata_json ? JSON.stringify(entry.metadata_json) : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div
          style={{
            padding: "0.75rem 1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
          }}
        >
          <div>
            Showing {logs.length} of {total} total security events
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn btn-secondary btn-sm"
            >
              Previous
            </button>
            <span style={{ fontFamily: "var(--font-mono)", padding: "0 0.4rem" }}>
              Page {page} of {totalPages || 1}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn btn-secondary btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
