import { useEffect, useState, type CSSProperties } from "react";
import { api } from "../api";
import type { ComplianceReport, ConfigSummary } from "../types";
import { SeverityBadge, StatusBadge } from "./Badges";

export function ResultsPanel({ record, onTrain }: { record: ConfigSummary; onTrain: () => void }) {
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [framework, setFramework] = useState("CIS");
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listFrameworks().then(setFrameworks).catch(() => setFrameworks(["CIS"]));
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

  return (
    <div className="card" style={{ background: "var(--surface-raised)" }}>
      <div className="toolbar">
        <div className="field" style={{ maxWidth: 200 }}>
          <label htmlFor={`fw-select-${record.id}`}>Framework</label>
          <select
            id={`fw-select-${record.id}`}
            value={framework}
            onChange={(e) => {
              setFramework(e.target.value);
              setReport(null);
            }}
          >
            {(frameworks.length ? frameworks : ["CIS"]).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" disabled={busy} onClick={() => runEvaluation(framework)}>
          {busy ? <span className="spinner" /> : "Evaluate"}
        </button>
        {report && (
          <a
            className="btn"
            href={api.reportPdfUrl(record.id, framework)}
            target="_blank"
            rel="noreferrer"
          >
            Download PDF report
          </a>
        )}
        {record.unmapped_count > 0 && (
          <button className="btn" onClick={onTrain}>
            Train {record.unmapped_count} unmapped line(s)
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {report && (
        <>
          <div className="summary-row">
            {(() => {
              const pass = report.summary.pass ?? 0;
              const fail = report.summary.fail ?? 0;
              const total = pass + fail;
              const pct = total ? Math.round((pass / total) * 100) : 0;
              const color = pct >= 80 ? "var(--ok)" : pct >= 50 ? "var(--warn)" : "var(--danger)";
              return (
                <div className="score-gauge" style={{ "--pct": pct, "--gauge-color": color } as CSSProperties}>
                  <div className="score-gauge-inner">
                    <span className="num">{pct}%</span>
                    <span className="label">Posture</span>
                  </div>
                </div>
              );
            })()}
            <div className="summary-stat pass">
              <div className="num">{report.summary.pass ?? 0}</div>
              <div className="label">Pass</div>
            </div>
            <div className="summary-stat fail">
              <div className="num">{report.summary.fail ?? 0}</div>
              <div className="label">Fail</div>
            </div>
            <div className="summary-stat unknown">
              <div className="num">{report.summary.unknown ?? 0}</div>
              <div className="label">Unknown</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Control</th>
                <th>Title</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {report.findings.map((f) => (
                <tr key={f.control_id}>
                  <td className="faint">{f.control_id}</td>
                  <td>
                    {f.title}
                    {f.status === "fail" && f.remediation && (
                      <div className="remediation">{f.remediation}</div>
                    )}
                  </td>
                  <td>
                    <SeverityBadge severity={f.severity} />
                  </td>
                  <td>
                    <StatusBadge status={f.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
