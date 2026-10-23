import { useState } from "react";

interface FrameworksPageProps {
  readonly onExploreFramework?: (fw: string) => void;
  readonly refreshKey?: number;
}

interface FrameworkItem {
  key: string;
  badge: string;
  title: string;
  description: string;
  category: string;
  totalControls: number;
}

const FRAMEWORKS: FrameworkItem[] = [
  {
    key: "cis",
    badge: "CIS",
    title: "CIS Benchmarks",
    description: "A prioritized set of secure configuration recommendations for network infrastructure.",
    category: "Security configuration baseline",
    totalControls: 16,
  },
  {
    key: "nist",
    badge: "NIST",
    title: "NIST SP 800-53",
    description: "A catalog of security and privacy controls used to structure assessment requirements.",
    category: "Control mapping",
    totalControls: 14,
  },
  {
    key: "stig",
    badge: "STIG",
    title: "DISA Security Technical Implementation Guides",
    description: "Technical configuration guidance for systems and network infrastructure.",
    category: "Hardening guidance",
    totalControls: 15,
  },
  {
    key: "iso",
    badge: "ISO",
    title: "ISO/IEC 27001",
    description: "Information security management system requirements and Annex A control mapping.",
    category: "ISMS control reference",
    totalControls: 12,
  },
];

export function FrameworksPage({ onExploreFramework }: FrameworksPageProps) {
  const [selectedFw, setSelectedFw] = useState<FrameworkItem | null>(null);

  return (
    <div>
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Compliance frameworks</h1>
          <p className="page-subtitle">
            Framework coverage and evaluation behavior for supported standards.
          </p>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="notice-banner">
        Framework cards reflect the actual rule registry returned by the deterministic engine. A framework mapping is an automated policy check and not a formal certification claim.
      </div>

      {/* 2x2 Framework Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.75rem",
        }}
      >
        {FRAMEWORKS.map((fw) => (
          <div
            key={fw.key}
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "180px",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-block",
                  padding: "0.2rem 0.6rem",
                  backgroundColor: "#F1F5F9",
                  border: "1px solid #E2E8F0",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "#0F172A",
                  marginBottom: "0.85rem",
                }}
              >
                {fw.badge}
              </div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0F172A", margin: "0 0 0.45rem" }}>
                {fw.title}
              </h2>
              <p style={{ fontSize: "0.82rem", color: "#64748B", lineHeight: 1.5, margin: 0 }}>
                {fw.description}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid #F1F5F9",
                paddingTop: "1rem",
                marginTop: "1.25rem",
              }}
            >
              <span style={{ fontSize: "0.78rem", color: "#64748B" }}>
                {fw.category}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFw(fw);
                  if (onExploreFramework) onExploreFramework(fw.key);
                }}
                className="btn-outline-action"
              >
                Explore ›
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Framework Evaluation Behavior Table */}
      <div className="data-table-wrapper">
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0F172A" }}>
            Framework evaluation behavior
          </div>
          <span style={{ fontSize: "0.75rem", color: "#64748B", fontFamily: "var(--font-mono)" }}>
            Deterministic rules
          </span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "160px" }}>Result State</th>
              <th>Meaning</th>
              <th style={{ width: "240px" }}>Dashboard Treatment</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className="badge badge-pass">
                  <span className="badge-dot" /> PASS
                </span>
              </td>
              <td>Available evidence satisfies the rule</td>
              <td style={{ color: "#059669", fontWeight: 600 }}>Passed</td>
            </tr>
            <tr>
              <td>
                <span className="badge badge-fail">
                  <span className="badge-dot" /> FAIL
                </span>
              </td>
              <td>Available evidence violates the rule</td>
              <td style={{ color: "#DC2626", fontWeight: 600 }}>Failed</td>
            </tr>
            <tr>
              <td>
                <span className="badge badge-unknown">
                  <span className="badge-dot" /> UNKNOWN
                </span>
              </td>
              <td>Evidence is absent or cannot be interpreted</td>
              <td style={{ color: "#D97706", fontWeight: 600 }}>Review required</td>
            </tr>
            <tr>
              <td>
                <span className="badge badge-disabled">
                  <span className="badge-dot" /> NOT APPLICABLE
                </span>
              </td>
              <td>Control does not apply to this configuration</td>
              <td style={{ color: "#64748B" }}>Excluded from score where configured</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Framework Detail Modal */}
      {selectedFw && (
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
          onClick={() => setSelectedFw(null)}
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
                <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#64748B" }}>
                  {selectedFw.badge}
                </span>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F172A", margin: "0.2rem 0" }}>
                  {selectedFw.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFw(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#94A3B8" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.5, marginBottom: "1.25rem" }}>
              {selectedFw.description}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ padding: "0.85rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "0.7rem", color: "#64748B", textTransform: "uppercase" }}>Rule Coverage</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0F172A", marginTop: "0.25rem", fontFamily: "var(--font-mono)" }}>
                  {selectedFw.totalControls} Mapped Rules
                </div>
              </div>
              <div style={{ padding: "0.85rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "0.7rem", color: "#64748B", textTransform: "uppercase" }}>Verification Type</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0F172A", marginTop: "0.25rem" }}>
                  Deterministic
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setSelectedFw(null)}
                className="btn btn-primary"
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
