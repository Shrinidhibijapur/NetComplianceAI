import React from "react";
import { CheckCircle2, FileCode2, ShieldAlert, ArrowRight } from "lucide-react";
import type { Finding } from "../types";

interface ExtendedFindingItem extends Finding {
  deviceId: string;
  vendor: string;
  configId: number;
}

interface RecentFindingsProps {
  findings: ExtendedFindingItem[];
  loading?: boolean;
  onSelectFinding?: (finding: ExtendedFindingItem) => void;
  onViewAll?: () => void;
  className?: string;
}

export const RecentFindings: React.FC<RecentFindingsProps> = ({
  findings,
  loading = false,
  onSelectFinding,
  onViewAll,
  className = "",
}) => {
  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
        return <span className="cc-severity-badge high">HIGH</span>;
      case "medium":
        return <span className="cc-severity-badge medium">MED</span>;
      default:
        return <span className="cc-severity-badge low">LOW</span>;
    }
  };

  let content: React.ReactNode;
  if (loading) {
    content = (
      <div style={{ padding: "1.5rem 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
        Loading non-compliant findings across fleet...
      </div>
    );
  } else if (findings.length === 0) {
    content = (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "var(--bg-root)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <CheckCircle2 style={{ width: "32px", height: "32px", color: "var(--status-pass)", margin: "0 auto 0.5rem", opacity: 0.8 }} />
        <p style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)" }}>No Failed Controls Detected</p>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
          All audited devices currently meet baseline compliance rules for this framework.
        </p>
      </div>
    );
  } else {
    content = (
      <div className="cc-findings-stack">
        {findings.slice(0, 5).map((f, idx) => (
          <button
            type="button"
            key={`${f.configId}-${f.control_id}-${idx}`}
            onClick={() => onSelectFinding?.(f)}
            className="cc-finding-card"
            style={{ width: "100%", font: "inherit", color: "inherit", background: "none" }}
          >
            <div className="cc-finding-left">
              {getSeverityBadge(f.severity)}
              <div className="cc-finding-meta">
                <div className="cc-finding-top">
                  <span className="cc-control-id">{f.control_id}</span>
                  <span className="cc-control-title">{f.title}</span>
                </div>
                <div className="cc-finding-sub">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                    <FileCode2 style={{ width: "12px", height: "12px", color: "var(--text-muted)" }} />
                    {f.deviceId}
                  </span>
                  <span>•</span>
                  <span style={{ textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)" }}>{f.vendor}</span>
                  <span>•</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>key: {f.canonical_key}</span>
                </div>
              </div>
            </div>

            <div className="cc-finding-right">
              {f.remediation && f.remediation_verified ? (
                <span className="cc-remedy-tag verified">
                  VERIFIED REMEDIATION
                </span>
              ) : (
                <span className="cc-remedy-tag unverified">
                  NO REMEDIATION SCRIPT
                </span>
              )}
              <ArrowRight style={{ width: "16px", height: "16px", color: "var(--text-muted)" }} />
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`cc-panel ${className}`.trim()}>
      <div className="cc-panel-header">
        <div className="cc-header-left">
          <div className="cc-icon-pill danger">
            <ShieldAlert style={{ width: "20px", height: "20px" }} />
          </div>
          <div>
            <h3 className="cc-header-title">
              Action Required: Recent Non-Compliant Findings
            </h3>
            <p className="cc-header-subtitle">
              Prioritized failed security controls requiring immediate remediation
            </p>
          </div>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <span>View All Audit Findings</span>
            <ArrowRight style={{ width: "14px", height: "14px" }} />
          </button>
        )}
      </div>

      {content}
    </div>
  );
};
