import { useEffect, useState } from "react";
import { api } from "../api";
import type { ConfigSummary, Finding } from "../types";
import { PageHeader } from "./common/PageHeader";
import { EmptyState } from "./common/EmptyState";
import { TechnicalValue } from "./common/TechnicalValue";
import { PosturePanel } from "./PosturePanel";
import { RecentFindings } from "./RecentFindings";
import { ReportDownloadButton } from "./ReportDownloadButton";

interface CommandCenterPageProps {
  readonly onSelectTab: (tab: "upload" | "devices" | "findings" | "training" | "rules") => void;
  readonly refreshKey: number;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "var(--status-pass)";
  if (confidence >= 0.5) return "var(--status-unknown)";
  return "var(--status-fail)";
}

interface ExtendedFindingItem extends Finding {
  deviceId: string;
  vendor: string;
  configId: number;
}

export function CommandCenterPage({ onSelectTab, refreshKey }: CommandCenterPageProps) {
  const [records, setRecords] = useState<ConfigSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [framework, setFramework] = useState("CIS");
  const [failedFindings, setFailedFindings] = useState<ExtendedFindingItem[]>([]);
  const [loadingFindings, setLoadingFindings] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .listRecords()
      .then((data) => {
        if (mounted) {
          setRecords(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  // Load failed findings for the top failed controls list across devices
  useEffect(() => {
    if (records.length === 0) {
      setFailedFindings([]);
      return;
    }
    let mounted = true;
    setLoadingFindings(true);

    // Evaluate first few devices to aggregate failed findings for recent view
    const promises = records.slice(0, 5).map((r) =>
      api
        .evaluate(r.id, framework)
        .then((report) =>
          report.findings
            .filter((f) => f.status === "fail")
            .map((f) => ({ ...f, deviceId: r.device_id, vendor: r.vendor, configId: r.id }))
        )
        .catch(() => [])
    );

    Promise.all(promises).then((results) => {
      if (mounted) {
        const flattened = results.flat();
        // Sort by severity (high first)
        const sevRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
        flattened.sort((a, b) => (sevRank[a.severity] ?? 3) - (sevRank[b.severity] ?? 3));
        setFailedFindings(flattened);
        setLoadingFindings(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [records, framework]);

  const totalDevices = records.length;
  const avgConfidence = totalDevices
    ? Math.round((records.reduce((acc, r) => acc + r.parse_confidence, 0) / totalDevices) * 100)
    : 0;
  const totalUnmapped = records.reduce((acc, r) => acc + r.unmapped_count, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Network Security Command Center"
        description="Monitor multi-vendor configuration health, parsing confidence, unmapped syntax queues, and security baseline compliance."
        action={
          <button type="button" className="btn btn-primary" onClick={() => onSelectTab("upload")}>
            + Ingest Configuration
          </button>
        }
      />

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-title">Audited Devices</div>
          <div className="kpi-card-value">{loading ? "..." : totalDevices}</div>
          <div className="kpi-card-sub">Active network nodes</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-title">Avg Parse Confidence</div>
          <div className="kpi-card-value" style={{ color: avgConfidence >= 80 ? "var(--status-pass)" : "var(--status-unknown)" }}>
            {loading ? "..." : `${avgConfidence}%`}
          </div>
          <div className="kpi-card-sub">Baseline normalization quality</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-title">Unmapped Line Queue</div>
          <div className="kpi-card-value" style={{ color: totalUnmapped > 0 ? "var(--status-unknown)" : "var(--text-muted)" }}>
            {loading ? "..." : totalUnmapped}
          </div>
          <div className="kpi-card-sub">Lines pending AI training</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-title">Frameworks Supported</div>
          <div className="kpi-card-value">4</div>
          <div className="kpi-card-sub">CIS, NIST, STIG, ISO 27001</div>
        </div>
      </div>

      {/* Fleet Posture Panel */}
      <PosturePanel currentFramework={framework} onFrameworkChange={setFramework} />

      {/* Action Required: Failed Controls List */}
      <RecentFindings
        findings={failedFindings}
        loading={loadingFindings}
        onViewAll={() => onSelectTab("findings")}
      />

      {/* Content Layout: 2 Columns */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        {/* Left Column: Recent Audited Devices Table */}
        <div className="data-table-wrapper" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>Audited Fleet Devices</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onSelectTab("devices")}>
              View All Devices →
            </button>
          </div>

          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading device posture...</div>
          ) : records.length === 0 ? (
            <EmptyState
              title="No devices audited yet"
              description="Ingest network configuration files from Cisco, Juniper, Arista, Fortinet, or custom vendors to inspect security compliance posture."
              action={
                <button type="button" className="btn btn-primary btn-sm" onClick={() => onSelectTab("upload")}>
                  Upload Configuration
                </button>
              }
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Device ID</th>
                  <th>Vendor</th>
                  <th>Parse Confidence</th>
                  <th>Unmapped Lines</th>
                  <th>Scan Time</th>
                  <th>PDF Report</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 5).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <TechnicalValue value={r.device_id} />
                    </td>
                    <td>
                      <span className="mono" style={{ textTransform: "uppercase", fontSize: "0.8rem" }}>
                        {r.vendor}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div
                          style={{
                            flex: 1,
                            height: "6px",
                            backgroundColor: "var(--bg-elevated)",
                            borderRadius: "var(--radius-sm)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.round(r.parse_confidence * 100)}%`,
                              height: "100%",
                              backgroundColor: getConfidenceColor(r.parse_confidence),
                            }}
                          />
                        </div>
                        <span className="mono" style={{ fontSize: "0.8rem", width: "40px" }}>
                          {Math.round(r.parse_confidence * 100)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      {r.unmapped_count > 0 ? (
                        <span className="badge badge-unknown">{r.unmapped_count} lines</span>
                      ) : (
                        <span className="badge badge-pass">0 lines</span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.8rem" }}>{new Date(r.created_at).toLocaleString()}</td>
                    <td>
                      <ReportDownloadButton configId={r.id} deviceId={r.device_id} framework={framework} variant="compact" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Column: Intelligence & Quick Action Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* AI Learning Loop Panel */}
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <span style={{ color: "var(--accent-primary)", fontSize: "1.2rem" }}>◈</span>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>AI Learning Loop Status</h3>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Human-in-the-Loop engine for learning unseen vendor syntax without code changes or restarts.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Pending Line Queue:</span>
                <span className="mono" style={{ fontWeight: 700, color: totalUnmapped > 0 ? "var(--status-unknown)" : "var(--status-pass)" }}>
                  {totalUnmapped}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Learning Mode:</span>
                <span className="mono" style={{ color: "var(--accent-primary)" }}>Active (Human Approved)</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ width: "100%" }}
              onClick={() => onSelectTab("training")}
            >
              Open AI Training Workspace →
            </button>
          </div>

          {/* Quick Actions Card */}
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
              Console Shortcuts
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button type="button" className="btn btn-secondary btn-sm" style={{ justifyContent: "flex-start" }} onClick={() => onSelectTab("upload")}>
                ⇪ Ingest Single/Bulk Configs
              </button>
              <button type="button" className="btn btn-secondary btn-sm" style={{ justifyContent: "flex-start" }} onClick={() => onSelectTab("findings")}>
                🛡 View All Audit Findings
              </button>
              <button type="button" className="btn btn-secondary btn-sm" style={{ justifyContent: "flex-start" }} onClick={() => onSelectTab("rules")}>
                ⚙ Manage Active Learned Rules
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
