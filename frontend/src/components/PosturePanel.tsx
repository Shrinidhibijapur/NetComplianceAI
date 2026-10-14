import React, { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, RefreshCw, Layers } from "lucide-react";
import { api } from "../api";
import type { FleetSummary } from "../types";
import { toast } from "../toast";

interface PosturePanelProps {
  currentFramework: string;
  onFrameworkChange?: (framework: string) => void;
  className?: string;
}

export const PosturePanel: React.FC<PosturePanelProps> = ({
  currentFramework,
  onFrameworkChange,
  className = "",
}) => {
  const [data, setData] = useState<FleetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [frameworks, setFrameworks] = useState<string[]>(["CIS", "NIST", "STIG", "ISO"]);

  const fetchSummary = async (fw: string) => {
    setLoading(true);
    try {
      const summary = await api.getFleetSummary(fw);
      setData(summary);
    } catch {
      toast(`Failed to load fleet posture for ${fw}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.listFrameworks().then(setFrameworks).catch(() => {});
  }, []);

  useEffect(() => {
    void fetchSummary(currentFramework);
  }, [currentFramework]);

  const getScoreTheme = (score: number) => {
    if (score >= 80) {
      return {
        label: "HEALTHY",
        textColor: "var(--status-pass)",
        tagBorder: "rgba(16, 185, 129, 0.35)",
        tagBg: "var(--status-pass-bg)",
        barColor: "var(--status-pass)",
      };
    }
    if (score >= 60) {
      return {
        label: "NEEDS ATTENTION",
        textColor: "var(--status-unknown)",
        tagBorder: "rgba(245, 158, 11, 0.35)",
        tagBg: "var(--status-unknown-bg)",
        barColor: "var(--status-unknown)",
      };
    }
    return {
      label: "CRITICAL",
      textColor: "var(--status-fail)",
      tagBorder: "rgba(239, 68, 68, 0.35)",
      tagBg: "var(--status-fail-bg)",
      barColor: "var(--status-fail)",
    };
  };

  const theme = getScoreTheme(data?.fleet_score ?? 0);

  let content: React.ReactNode = null;
  if (loading && !data) {
    content = (
      <div style={{ padding: "2.5rem 0", textAlign: "center", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
        <RefreshCw style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite", color: "var(--accent-primary)" }} />
        <span>Evaluating fleet security posture...</span>
      </div>
    );
  } else if (data) {
    content = (
      <div className="cc-posture-grid">
        {/* Score Gauge Card */}
        <div className="cc-subcard">
          <div className="cc-card-label">Fleet Compliance Score</div>
          <div className="cc-score-row">
            <span className="cc-score-number" style={{ color: theme.textColor }}>
              {data.fleet_score}%
            </span>
            <span
              className="cc-score-tag"
              style={{
                color: theme.textColor,
                borderColor: theme.tagBorder,
                backgroundColor: theme.tagBg,
              }}
            >
              {theme.label}
            </span>
          </div>
          <div className="cc-progress-track">
            <div
              className="cc-progress-fill"
              style={{
                width: `${Math.max(2, data.fleet_score)}%`,
                backgroundColor: theme.barColor,
              }}
            />
          </div>
        </div>

        {/* Pass / Fail / Unknown Status Counts */}
        <div className="cc-subcard">
          <div className="cc-card-label" style={{ marginBottom: "0.5rem" }}>
            Controls Status Breakdown
          </div>
          <div className="cc-status-breakdown-grid">
            <div className="cc-status-tile pass">
              <span className="cc-tile-title">PASSED</span>
              <span className="cc-tile-value">{data.fleet_pass_total}</span>
              <span className="cc-tile-sub">Controls Verified</span>
            </div>

            <div className="cc-status-tile fail">
              <span className="cc-tile-title">FAILED</span>
              <span className="cc-tile-value">{data.fleet_fail_total}</span>
              <span className="cc-tile-sub">Non-Compliant</span>
            </div>

            <div className="cc-status-tile unknown">
              <span className="cc-tile-title">UNKNOWN</span>
              <span className="cc-tile-value">{data.fleet_unknown_total}</span>
              <span className="cc-tile-sub">Unparsed Lines</span>
            </div>
          </div>
        </div>

        {/* Severity breakdown for fails */}
        <div className="cc-subcard">
          <div className="cc-card-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
            <ShieldAlert style={{ width: "14px", height: "14px", color: "var(--severity-high)" }} />
            <span>Failed Rule Severity</span>
          </div>
          <div className="cc-severity-list">
            <div className="cc-severity-row">
              <span className="cc-severity-item-left">
                <span className="cc-dot" style={{ backgroundColor: "var(--severity-high)" }} />
                <span>High Severity</span>
              </span>
              <span className="cc-severity-count" style={{ color: "var(--severity-high)" }}>
                {data.high_severity_fails}
              </span>
            </div>

            <div className="cc-severity-row">
              <span className="cc-severity-item-left">
                <span className="cc-dot" style={{ backgroundColor: "var(--severity-medium)" }} />
                <span>Medium Severity</span>
              </span>
              <span className="cc-severity-count" style={{ color: "var(--severity-medium)" }}>
                {data.medium_severity_fails}
              </span>
            </div>

            <div className="cc-severity-row">
              <span className="cc-severity-item-left">
                <span className="cc-dot" style={{ backgroundColor: "var(--severity-low)" }} />
                <span>Low Severity</span>
              </span>
              <span className="cc-severity-count" style={{ color: "var(--text-muted)" }}>
                {data.low_severity_fails}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`cc-panel ${className}`.trim()}>
      <div className="cc-panel-header">
        <div className="cc-header-left">
          <div className="cc-icon-pill success">
            <ShieldCheck style={{ width: "22px", height: "22px" }} />
          </div>
          <div>
            <h2 className="cc-header-title">
              <span>Fleet Compliance Posture</span>
              <span className="cc-badge-pill">
                {data?.total_devices ?? 0} Devices
              </span>
            </h2>
            <p className="cc-header-subtitle">
              Aggregated security controls evaluation across entire fleet
            </p>
          </div>
        </div>

        <div className="cc-header-right">
          <div className="cc-selector-pill">
            <Layers style={{ width: "15px", height: "15px", color: "var(--text-muted)" }} />
            <span>Framework:</span>
            <select
              value={currentFramework}
              onChange={(e) => onFrameworkChange?.(e.target.value)}
              className="cc-select"
            >
              {frameworks.map((fw) => (
                <option key={fw} value={fw}>
                  {fw.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => fetchSummary(currentFramework)}
            disabled={loading}
            title="Refresh posture data"
            className="cc-refresh-btn"
          >
            <RefreshCw
              style={{
                width: "14px",
                height: "14px",
                animation: loading ? "spin 1s linear infinite" : "none",
                color: loading ? "var(--accent-primary)" : "inherit",
              }}
            />
          </button>
        </div>
      </div>

      {content}
    </div>
  );
};
