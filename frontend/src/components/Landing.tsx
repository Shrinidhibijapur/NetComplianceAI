import "../styles/landing.css";

export function Landing({ onEnter }: { readonly onEnter: () => void }) {
  const scrollToArch = () => {
    document.getElementById("architecture-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="landing-container">
      {/* Landing Header */}
      <header className="landing-navbar">
        <div className="landing-brand">
          <div className="landing-brand-logo">CA</div>
          <div className="landing-brand-text">
            <strong>ComplianceAI</strong>
            <span>Network Security Compliance Auditor</span>
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={onEnter}>
          Launch Console →
        </button>
      </header>

      {/* Hero Section */}
      <section className="landing-section">
        <div className="hero-wrapper">
          {/* Left Hero */}
          <div>
            <div className="hero-eyebrow">
              <span>●</span> COMPLIANCEAI · NETWORK SECURITY INTELLIGENCE
            </div>
            <h1 className="hero-title">
              Turn any network configuration into a{" "}
              <span className="hero-title-accent">security decision.</span>
            </h1>
            <p className="hero-description">
              ComplianceAI ingests heterogeneous network configurations, normalizes them into a vendor-neutral
              security baseline, evaluates them against multiple compliance frameworks, exposes evidence and
              verified remediation, and learns unknown vendor syntax through controlled human approval.
            </p>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary btn-lg" onClick={onEnter}>
                Launch Security Console →
              </button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={scrollToArch}>
                Explore Architecture ↓
              </button>
            </div>
          </div>

          {/* Right Hero: Compliance Pipeline Diagram */}
          <div className="pipeline-card">
            <div className="pipeline-header">
              <span className="pipeline-header-title">Compliance Intelligence Pipeline</span>
              <span style={{ fontSize: "0.7rem", color: "var(--status-pass)", fontFamily: "var(--font-mono)" }}>
                ● ACTIVE PIPELINE
              </span>
            </div>

            <div className="pipeline-flow">
              <div className="pipeline-node">
                <span className="pipeline-node-label">01 CONFIG INGESTION</span>
                <span className="pipeline-node-tag">RAW CLI / JSON</span>
              </div>
              <div className="pipeline-arrow">↓</div>

              <div className="pipeline-node">
                <span className="pipeline-node-label">02 VENDOR DETECTION</span>
                <span className="pipeline-node-tag">FINGERPRINT / EMBEDDINGS</span>
              </div>
              <div className="pipeline-arrow">↓</div>

              <div className="pipeline-node">
                <span className="pipeline-node-label">03 NORMALIZATION</span>
                <span className="pipeline-node-tag">SECURITY BASELINE MODEL</span>
              </div>
              <div className="pipeline-arrow">↓</div>

              <div className="pipeline-node">
                <span className="pipeline-node-label">04 COMPLIANCE EVALUATION</span>
                <span className="pipeline-node-tag">CIS · NIST · STIG · ISO</span>
              </div>
              <div className="pipeline-arrow">↓</div>

              <div className="pipeline-node" style={{ borderColor: "var(--status-pass)" }}>
                <span className="pipeline-node-label">05 AUDIT FINDINGS & EVIDENCE</span>
                <span className="pipeline-node-tag" style={{ color: "var(--status-pass)" }}>
                  VERIFIED REMEDIATION
                </span>
              </div>
            </div>

            {/* Human Learning Loop Sub-Branch */}
            <div
              style={{
                marginTop: "1.25rem",
                paddingTop: "1rem",
                borderTop: "1px dashed var(--border-medium)",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.75rem",
                  color: "var(--status-unknown)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span>⚡ UNKNOWN SYNTAX DETECTED</span>
                <span>HUMAN-IN-THE-LOOP</span>
              </div>
              <div
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  display: "flex",
                  justifyContent: "space-between",
                  color: "var(--text-secondary)",
                }}
              >
                <span>AI Suggestion → Human Review → Rule Saved</span>
                <span style={{ color: "var(--status-pass)" }}>Instant Re-normalization</span>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Capabilities Strip */}
        <div className="capability-strip">
          <div className="strip-item">
            <div className="strip-val">7</div>
            <div className="strip-lbl">Vendor Profiles</div>
            <div className="strip-desc">Cisco, Juniper, Arista, Fortinet, MikroTik, SONiC, AWS SG</div>
          </div>
          <div className="strip-item">
            <div className="strip-val">4</div>
            <div className="strip-lbl">Compliance Frameworks</div>
            <div className="strip-desc">CIS, NIST SP 800-53, DISA STIG, ISO/IEC 27001</div>
          </div>
          <div className="strip-item">
            <div className="strip-val">99</div>
            <div className="strip-lbl">Verified Backend Tests</div>
            <div className="strip-desc">100% Passing test baseline</div>
          </div>
          <div className="strip-item">
            <div className="strip-val">OFFLINE</div>
            <div className="strip-lbl">AI Capability</div>
            <div className="strip-desc">Pre-baked embedding model (Zero external calls)</div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="landing-section" id="architecture-section">
        <div className="section-label">ARCHITECTURE</div>
        <h2 className="section-title">One Config. Many Standards.</h2>
        <p className="section-sub">
          Heterogeneous device configurations are transformed into a single vendor-neutral Security Baseline before
          being evaluated against industry compliance benchmarks.
        </p>

        <div className="architecture-box">
          {/* Vendor Sources */}
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
                textAlign: "center",
                marginBottom: "0.75rem",
              }}
            >
              HETEROGENEOUS VENDOR EXPORTS
            </div>
            <div className="arch-sources-grid">
              <span className="arch-chip">Cisco IOS / XE</span>
              <span className="arch-chip">Juniper JunOS</span>
              <span className="arch-chip">Arista EOS</span>
              <span className="arch-chip">Fortinet FortiOS</span>
              <span className="arch-chip">MikroTik RouterOS</span>
              <span className="arch-chip">SONiC NOS</span>
              <span className="arch-chip">AWS Security Group</span>
            </div>
          </div>

          <div style={{ textAlign: "center", color: "var(--accent-primary)", fontSize: "1.2rem" }}>↓</div>

          {/* Normalized Core Baseline */}
          <div className="arch-core-target">
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "1.1rem", color: "var(--text-primary)" }}>
              SECURITY BASELINE MODEL
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              35+ Typed Canonical Controls (Remote Access, Crypto, Auth, SNMP, Logging, ACLs)
            </div>
          </div>

          <div style={{ textAlign: "center", color: "var(--accent-primary)", fontSize: "1.2rem" }}>↓</div>

          {/* Compliance Output Frameworks */}
          <div className="arch-frameworks-grid">
            <div className="arch-fw-card">
              <div style={{ fontWeight: 700, color: "var(--accent-primary)" }}>CIS Benchmarks</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Section Controls</div>
            </div>
            <div className="arch-fw-card">
              <div style={{ fontWeight: 700, color: "var(--accent-primary)" }}>NIST SP 800-53</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Security Controls</div>
            </div>
            <div className="arch-fw-card">
              <div style={{ fontWeight: 700, color: "var(--accent-primary)" }}>DISA STIG</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>XCCDF Rulesets</div>
            </div>
            <div className="arch-fw-card">
              <div style={{ fontWeight: 700, color: "var(--accent-primary)" }}>ISO/IEC 27001</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Annex A Controls</div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Intelligence Capability Cards */}
      <section className="landing-section">
        <div className="section-label">SECURITY INTELLIGENCE</div>
        <h2 className="section-title">Engineered for Enterprise Network Operations</h2>
        <p className="section-sub">
          Built specifically to eliminate manual auditing errors and accelerate network compliance readiness.
        </p>

        <div className="cards-grid">
          <div className="intelligence-card">
            <span className="card-tech-id">SEC-01 // PARSER</span>
            <h3 className="card-header-title">Multi-Vendor Normalization</h3>
            <p className="card-body-text">
              Automatically identifies vendor identity and normalizes raw CLI or JSON configuration syntax into a unified
              canonical baseline vocabulary.
            </p>
          </div>

          <div className="intelligence-card">
            <span className="card-tech-id">SEC-02 // ENGINE</span>
            <h3 className="card-header-title">Multi-Framework Compliance</h3>
            <p className="card-body-text">
              Evaluates the exact same baseline controls across CIS, NIST, STIG, and ISO standards simultaneously without
              re-uploading files.
            </p>
          </div>

          <div className="intelligence-card">
            <span className="card-tech-id">SEC-03 // AUDIT</span>
            <h3 className="card-header-title">Evidence-First Findings</h3>
            <p className="card-body-text">
              Every PASS, FAIL, or UNKNOWN result links directly back to exact configuration line numbers and raw syntax
              for total auditability.
            </p>
          </div>

          <div className="intelligence-card">
            <span className="card-tech-id">SEC-04 // LEARNING</span>
            <h3 className="card-header-title">Self-Learning Parser</h3>
            <p className="card-body-text">
              Unmapped lines route to the AI learning queue. Human approval generates persistent extraction rules without python code edits.
            </p>
          </div>
        </div>
      </section>

      {/* Human-in-the-Loop Visual Section */}
      <section className="landing-section">
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-medium)", borderRadius: "var(--radius-lg)", padding: "3rem" }}>
          <div className="section-label">HUMAN-IN-THE-LOOP LEARNING</div>
          <h2 className="section-title">Unknown syntax isn't a dead end.</h2>
          <p className="section-sub">
            When ComplianceAI encounters unknown vendor syntax, the embedding classifier proposes a canonical target. Once an administrator approves the mapping, the system saves a persistent rule and re-evaluates stored devices automatically.
          </p>

          <div
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "1.5rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-muted)" }}>[1] UNMAPPED CONFIGURATION LINE:</span>
              <span style={{ color: "var(--status-unknown)", backgroundColor: "var(--status-unknown-bg)", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-sm)" }}>
                UNMAPPED
              </span>
            </div>
            <div style={{ color: "var(--accent-primary)", paddingLeft: "1rem" }}>
              set security custom-feature ssh-protocol-version 2
            </div>

            <div style={{ textAlign: "center", color: "var(--text-muted)" }}>↓ AI Classification & Confidence (54.1%)</div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-muted)" }}>[2] HUMAN APPROVAL & MAPPING:</span>
              <span style={{ color: "var(--status-pass)", backgroundColor: "var(--status-pass-bg)", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-sm)" }}>
                APPROVED & SAVED
              </span>
            </div>
            <div style={{ paddingLeft: "1rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
              <div>Target Field: <span style={{ color: "var(--text-primary)" }}>ssh_version</span></div>
              <div>Captured Value: <span style={{ color: "var(--text-primary)" }}>2</span></div>
              <div>Rule Scope: <span style={{ color: "var(--text-primary)" }}>SONiC</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Illustrative Findings Section */}
      <section className="landing-section">
        <div className="section-label">AUDIT VERIFICATION</div>
        <h2 className="section-title">Evidence-First Finding Structure</h2>
        <p className="section-sub">
          Every audit finding exposes exact expected versus actual values, evidence line numbers, and verified vendor remediation commands.
        </p>

        {/* Illustrative Finding Card */}
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className="badge badge-high">HIGH SEVERITY</span>
              <span className="badge badge-fail">✕ FAIL</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                CIS-SSH-1 // NIST AC-17(1)
              </span>
            </div>
            <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              EXAMPLE FINDING (DEMO)
            </span>
          </div>

          <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>SSH Protocol Version Must Be Set To Version 2</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", backgroundColor: "var(--bg-elevated)", padding: "1rem", borderRadius: "var(--radius-md)" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>EXPECTED VALUE</div>
              <code style={{ color: "var(--status-pass)" }}>2</code>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ACTUAL VALUE</div>
              <code style={{ color: "var(--status-fail)" }}>1</code>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>EVIDENCE</div>
              <code>Line 42: ip ssh version 1</code>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-primary)", marginBottom: "0.25rem" }}>
              VERIFIED REMEDIATION COMMANDS:
            </div>
            <pre style={{ backgroundColor: "var(--bg-root)", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: "0.85rem" }}>
configure terminal{"\n"}ip ssh version 2{"\n"}end
            </pre>
          </div>
        </div>
      </section>

      {/* How It Works Timeline */}
      <section className="landing-section">
        <div className="section-label">WORKFLOW</div>
        <h2 className="section-title">How ComplianceAI Operates</h2>
        <p className="section-sub">A streamlined 6-stage lifecycle for end-to-end security compliance auditing.</p>

        <div className="timeline-grid">
          <div className="timeline-step">
            <div className="timeline-step-num">01</div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>INGEST</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Upload single or bulk network configuration files via drag-and-drop.
            </p>
          </div>

          <div className="timeline-step">
            <div className="timeline-step-num">02</div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>DETECT</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Automatic fingerprint and embedding-based vendor identification with manual override.
            </p>
          </div>

          <div className="timeline-step">
            <div className="timeline-step-num">03</div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>NORMALIZE</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Extract device identity (hostname, model, serial, OS) and 35+ canonical security fields.
            </p>
          </div>

          <div className="timeline-step">
            <div className="timeline-step-num">04</div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>EVALUATE</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Check baseline controls against CIS, NIST, DISA STIG, and ISO 27001 rulesets.
            </p>
          </div>

          <div className="timeline-step">
            <div className="timeline-step-num">05</div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>LEARN</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Human-in-the-loop regex rule creation for unknown syntax without backend restarts.
            </p>
          </div>

          <div className="timeline-step">
            <div className="timeline-step-num">06</div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>REPORT</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Inspect detailed evidence drawers and export audit compliance findings.
            </p>
          </div>
        </div>
      </section>

      {/* Offline First Section */}
      <section className="landing-section">
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <div className="section-label">AIR-GAPPED COMPATIBILITY</div>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem" }}>
              Designed for Isolated Critical Infrastructure
            </h3>
            <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", maxWidth: "650px" }}>
              Configuration data remains local. Embedding models are pre-baked into the Docker deployment container with HF_HUB_OFFLINE=1, requiring zero internet connectivity at runtime.
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={onEnter}>
            Launch Console →
          </button>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="landing-section">
        <div className="landing-cta-box">
          <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)" }}>
            See what your configurations are actually telling you.
          </h2>
          <p style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: "600px" }}>
            Ingest sample configurations or your own device exports to audit security posture across multiple compliance standards in seconds.
          </p>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button type="button" className="btn btn-primary btn-lg" onClick={onEnter}>
              Launch Security Console →
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              Back to Top ↑
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
