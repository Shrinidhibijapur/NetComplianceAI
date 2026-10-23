import { useEffect, useState } from "react";
import { Layers, Play, FileText, Zap, Loader2, ShieldCheck, ShieldAlert, AlertTriangle, Terminal } from "lucide-react";
import { api } from "../api";
import type { ComplianceReport, ConfigSummary } from "../types";
import { SeverityBadge, StatusBadge } from "./Badges";

function getScoreTheme(score: number) {
  if (score >= 80) {
    return { color: "var(--status-pass)", label: "COMPLIANT", bg: "var(--status-pass-bg)", border: "rgba(16, 185, 129, 0.3)" };
  }
  if (score >= 50) {
    return { color: "var(--status-unknown)", label: "NEEDS ATTENTION", bg: "var(--status-unknown-bg)", border: "rgba(245, 158, 11, 0.3)" };
  }
  return { color: "var(--status-fail)", label: "NON-COMPLIANT", bg: "var(--status-fail-bg)", border: "rgba(239, 68, 68, 0.3)" };
}

function getRemediationColor(status: string): string {
  if (status === "pass") return "#10b981";
  if (status === "not_applicable") return "var(--text-muted)";
  return "var(--accent-primary)";
}

function getRemediationLabel(status: string): string {
  if (status === "pass") return "Verified Baseline CLI Configuration";
  if (status === "not_applicable") return "Reference CLI Command";
  return "Remediation CLI Command";
}

export function ResultsPanel({
  record,
  onTrain,
}: {
  readonly record: ConfigSummary;
  readonly onTrain: () => void;
}) {
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [framework, setFramework] = useState("CIS");
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listFrameworks()
      .then((fws) => setFrameworks(fws.length ? fws : ["CIS", "NIST", "STIG", "ISO"]))
      .catch(() => setFrameworks(["CIS", "NIST", "STIG", "ISO"]));
  }, []);

  async function runEvaluation(fw: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await api.evaluate(record.id, fw);
      setReport(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // Score calculations
  const passCount = report?.summary.pass ?? 0;
  const failCount = report?.summary.fail ?? 0;
  const unknownCount = report?.summary.unknown ?? 0;
  const totalControls = passCount + failCount;
  const scorePct = totalControls ? Math.round((passCount / totalControls) * 100) : 0;
  const scoreTheme = getScoreTheme(scorePct);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* ── Evaluation Action Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          padding: "0.85rem 1.15rem",
          backgroundColor: "var(--bg-root)",
          border: "1px solid var(--border-medium)",
          borderRadius: "var(--radius-md)",
        }}
      >
        {/* Left Side: Framework selector & Evaluate button */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
          {/* Custom Styled Framework Dropdown */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-medium)",
              borderRadius: "var(--radius-sm)",
              padding: "0.4rem 0.75rem",
            }}
          >
            <Layers style={{ width: 14, height: 14, color: "var(--accent-primary)" }} />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--text-muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Framework:
            </span>
            <select
              id={`fw-select-${record.id}`}
              value={framework}
              onChange={(e) => {
                setFramework(e.target.value);
                setReport(null);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontWeight: 700,
                fontSize: "0.85rem",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {(frameworks.length ? frameworks : ["CIS", "NIST", "STIG", "ISO"]).map((f) => (
                <option
                  key={f}
                  value={f}
                  style={{ backgroundColor: "var(--bg-surface)", color: "var(--text-primary)" }}
                >
                  {f.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Evaluate Button */}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => runEvaluation(framework)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.45rem 1.15rem",
              fontWeight: 600,
              fontSize: "0.82rem",
            }}
          >
            {busy ? (
              <>
                <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <Play style={{ width: 12, height: 12, fill: "currentColor" }} />
                <span>Evaluate</span>
              </>
            )}
          </button>
        </div>

        {/* Right Side: PDF Report & Training Action */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {report && (
            <a
              href={api.reportPdfUrl(record.id, framework)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.45rem 0.85rem",
              }}
            >
              <FileText style={{ width: 14, height: 14, color: "var(--accent-primary)" }} />
              <span>Download PDF report</span>
            </a>
          )}

          {record.unmapped_count > 0 && (
            <button
              type="button"
              onClick={onTrain}
              className="btn btn-secondary btn-sm"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                borderColor: "rgba(245, 158, 11, 0.4)",
                color: "var(--status-unknown)",
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                padding: "0.45rem 0.85rem",
              }}
            >
              <Zap style={{ width: 13, height: 13 }} />
              <span>Train {record.unmapped_count} unmapped line(s)</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner" style={{ margin: 0 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Evaluation Results ── */}
      {report && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Summary Strip (Score, Pass, Fail, Unknown) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "0.85rem",
            }}
          >
            {/* Score Card */}
            <div
              style={{
                backgroundColor: "var(--bg-root)",
                border: "1px solid var(--border-medium)",
                borderRadius: "var(--radius-md)",
                padding: "0.85rem 1rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                }}
              >
                Framework Score
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", margin: "0.35rem 0" }}>
                <span
                  style={{
                    fontSize: "1.8rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    color: scoreTheme.color,
                  }}
                >
                  {scorePct}%
                </span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "0.15rem 0.45rem",
                    borderRadius: "var(--radius-sm)",
                    color: scoreTheme.color,
                    backgroundColor: scoreTheme.bg,
                    border: `1px solid ${scoreTheme.border}`,
                  }}
                >
                  {scoreTheme.label}
                </span>
              </div>
            </div>

            {/* Pass Count */}
            <div
              style={{
                backgroundColor: "var(--status-pass-bg)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "var(--radius-md)",
                padding: "0.85rem 1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--status-pass)", fontSize: "0.72rem", fontWeight: 700 }}>
                <ShieldCheck style={{ width: 13, height: 13 }} />
                <span>PASSED</span>
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--status-pass)", marginTop: "0.25rem" }}>
                {passCount}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Verified Controls</div>
            </div>

            {/* Fail Count */}
            <div
              style={{
                backgroundColor: "var(--status-fail-bg)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: "var(--radius-md)",
                padding: "0.85rem 1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--status-fail)", fontSize: "0.72rem", fontWeight: 700 }}>
                <ShieldAlert style={{ width: 13, height: 13 }} />
                <span>FAILED</span>
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--status-fail)", marginTop: "0.25rem" }}>
                {failCount}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Non-Compliant Findings</div>
            </div>

            {/* Unknown Count */}
            <div
              style={{
                backgroundColor: "var(--status-unknown-bg)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                borderRadius: "var(--radius-md)",
                padding: "0.85rem 1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--status-unknown)", fontSize: "0.72rem", fontWeight: 700 }}>
                <AlertTriangle style={{ width: 13, height: 13 }} />
                <span>UNKNOWN</span>
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--status-unknown)", marginTop: "0.25rem" }}>
                {unknownCount}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Unmapped Lines</div>
            </div>
          </div>

          {/* Detailed Findings Table */}
          <div
            style={{
              backgroundColor: "var(--bg-root)",
              border: "1px solid var(--border-medium)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-medium)", backgroundColor: "var(--bg-elevated)" }}>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.72rem", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Control ID
                  </th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.72rem", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Title & Remediation
                  </th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.72rem", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Severity
                  </th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.72rem", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.findings.map((f) => (
                  <tr
                    key={f.control_id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      backgroundColor: f.status === "fail" ? "rgba(239, 68, 68, 0.03)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0.85rem 1rem", verticalAlign: "top", width: "150px" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: "var(--accent-primary)",
                        }}
                      >
                        {f.control_id}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", verticalAlign: "top" }}>
                      <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {f.title}
                      </div>

                      {f.remediation && (
                        <div
                          style={{
                            marginTop: "0.5rem",
                            padding: "0.6rem 0.85rem",
                            backgroundColor: "rgba(0, 0, 0, 0.4)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-sm)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              color: getRemediationColor(f.status),
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              marginBottom: "0.25rem",
                            }}
                          >
                            <Terminal style={{ width: 12, height: 12 }} />
                            <span>{getRemediationLabel(f.status)}</span>
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.78rem",
                              color: f.status === "pass" ? "#86efac" : "#A7F3D0",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-all",
                            }}
                          >
                            {f.remediation}
                          </pre>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", verticalAlign: "top", width: "110px" }}>
                      <SeverityBadge severity={f.severity} />
                    </td>
                    <td style={{ padding: "0.85rem 1rem", verticalAlign: "top", width: "110px" }}>
                      <StatusBadge status={f.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
