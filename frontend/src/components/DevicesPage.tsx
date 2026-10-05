import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { ConfigSummary } from "../types";
import { ConfidenceMeter } from "./Badges";
import { ResultsPanel } from "./ResultsPanel";
import { PageHeader } from "./common/PageHeader";
import { EmptyState } from "./common/EmptyState";

export function DevicesPage({
  refreshKey,
  onTrain,
}: {
  readonly refreshKey: number;
  readonly onTrain: (id: number) => void;
}) {
  const [records, setRecords] = useState<ConfigSummary[] | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api
      .listRecords()
      .then(setRecords)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [refreshKey]);

  const filtered = useMemo(() => {
    if (!records) return null;
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) => r.device_id.toLowerCase().includes(q) || r.vendor.toLowerCase().includes(q),
    );
  }, [records, query]);

  const totalDevices = records?.length ?? 0;
  const fullyParsedCount = useMemo(() => records?.filter(r => r.unmapped_count === 0).length ?? 0, [records]);
  const needsTrainingCount = useMemo(() => records?.filter(r => r.unmapped_count > 0).length ?? 0, [records]);

  return (
    <div className="page" style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem" }}>
      <PageHeader
        title="Ingested Devices & Audits"
        description="Every ingested network configuration, L1 parser confidence rating, unmapped line metrics, and deterministic framework compliance results."
      />

      {error && (
        <div className="error-banner" style={{ marginBottom: "1.5rem" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Summary KPI Strip */}
      {records && records.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem"
        }}>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-medium)",
            borderRadius: "var(--radius-md)",
            padding: "1rem 1.25rem"
          }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              Total Ingested Devices
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {totalDevices}
            </div>
          </div>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-medium)",
            borderRadius: "var(--radius-md)",
            padding: "1rem 1.25rem"
          }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              Fully Parsed (100% L1)
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-pass, #10b981)" }}>
              {fullyParsedCount}
            </div>
          </div>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-medium)",
            borderRadius: "var(--radius-md)",
            padding: "1rem 1.25rem"
          }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              Pending AI Training
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: needsTrainingCount > 0 ? "var(--color-warning, #f59e0b)" : "var(--text-muted)" }}>
              {needsTrainingCount}
            </div>
          </div>
        </div>
      )}

      {records?.length === 0 && (
        <EmptyState
          title="No devices ingested yet"
          description="Upload your Cisco, Fortinet, Juniper, or Palo Alto config files to start automated compliance auditing."
        />
      )}

      {records && records.length > 0 && (
        <>
          {/* Controls Bar */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.25rem",
            background: "var(--bg-surface)",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)"
          }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
              <input
                id="search-devices"
                aria-label="Search by device ID or vendor"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by device hostname, IP, or vendor…"
                style={{
                  width: "100%",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  padding: "0.5rem 0.75rem 0.5rem 2rem",
                  fontSize: "0.875rem"
                }}
              />
              <span style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                🔍
              </span>
            </div>
            <span style={{ fontSize: "0.825rem", color: "var(--text-secondary)" }}>
              Showing <strong>{filtered?.length ?? 0}</strong> of <strong>{records.length}</strong> device(s)
            </span>
          </div>

          {/* Device Cards Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {filtered?.map((r) => {
              const isOpen = expanded === r.id;
              const hasUnmapped = r.unmapped_count > 0;

              return (
                <div
                  key={r.id}
                  style={{
                    background: "var(--bg-surface)",
                    border: `1px solid ${isOpen ? "var(--accent-primary, #38bdf8)" : "var(--border-medium)"}`,
                    borderRadius: "var(--radius-md)",
                    overflow: "hidden",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    boxShadow: isOpen ? "0 4px 20px rgba(0,0,0,0.3)" : "none"
                  }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    aria-label={`${r.device_id} (${r.vendor}) details`}
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpanded(isOpen ? null : r.id);
                      }
                    }}
                    style={{
                      padding: "1.25rem 1.5rem",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "1.5rem",
                      userSelect: "none"
                    }}
                  >
                    {/* Device Identifier & Vendor Info */}
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
                      <div style={{
                        width: 42,
                        height: 42,
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-elevated)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.2rem",
                        border: "1px solid var(--border-subtle)",
                        flexShrink: 0
                      }}>
                        🖥️
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                            {r.device_id}
                          </span>
                          <span style={{
                            fontSize: "0.725rem",
                            fontWeight: 600,
                            padding: "0.15rem 0.5rem",
                            borderRadius: "var(--radius-sm)",
                            background: "var(--bg-elevated)",
                            color: "var(--accent-primary, #38bdf8)",
                            border: "1px solid var(--border-subtle)",
                            textTransform: "uppercase"
                          }}>
                            {r.vendor}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          Ingested on {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* Parser Status & Action Badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                          Parse Confidence
                        </div>
                        <ConfidenceMeter value={r.parse_confidence} />
                      </div>

                      <div style={{ minWidth: 120, textAlign: "center" }}>
                        {hasUnmapped ? (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                            <span style={{
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "#f59e0b",
                              background: "rgba(245, 158, 11, 0.12)",
                              border: "1px solid rgba(245, 158, 11, 0.3)",
                              padding: "0.2rem 0.6rem",
                              borderRadius: "var(--radius-sm)"
                            }}>
                              ⚡ {r.unmapped_count} unmapped
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTrain(r.id);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--accent-primary, #38bdf8)",
                                fontSize: "0.75rem",
                                textDecoration: "underline",
                                cursor: "pointer",
                                padding: 0
                              }}
                            >
                              Train AI pattern →
                            </button>
                          </div>
                        ) : (
                          <span style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "#10b981",
                            background: "rgba(16, 185, 129, 0.12)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            padding: "0.2rem 0.6rem",
                            borderRadius: "var(--radius-sm)"
                          }}>
                            ✓ Fully Parsed
                          </span>
                        )}
                      </div>

                      {/* Expand Arrow Icon */}
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "var(--bg-elevated)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-secondary)",
                        fontSize: "0.85rem",
                        transition: "transform 0.2s ease"
                      }}>
                        {isOpen ? "▲" : "▼"}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Detail Area */}
                  {isOpen && (
                    <div style={{
                      borderTop: "1px solid var(--border-medium)",
                      padding: "1.5rem",
                      background: "rgba(0, 0, 0, 0.15)"
                    }}>
                      <ResultsPanel record={r} onTrain={() => onTrain(r.id)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

