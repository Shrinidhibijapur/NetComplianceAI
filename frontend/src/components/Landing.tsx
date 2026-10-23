import "../styles/landing.css";

interface LandingProps {
  readonly onEnter: () => void;
  readonly onOpenAuth?: () => void;
}

export function Landing({ onEnter, onOpenAuth }: LandingProps) {
  const scrollToPlatform = () => {
    document.getElementById("platform-showcase")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSignInClick = () => {
    if (onOpenAuth) {
      onOpenAuth();
    } else {
      onEnter();
    }
  };

  return (
    <div className="landing-container">
      {/* Top Navbar */}
      <header className="landing-navbar">
        <div className="landing-brand">
          <div className="landing-brand-logo">CA</div>
          <div className="landing-brand-text">
            <strong>ComplianceAI</strong>
            <span>Network Security Compliance Auditor</span>
          </div>
        </div>

        <nav className="landing-nav-links">
          <button type="button" className="landing-nav-link" onClick={scrollToPlatform}>
            Product ▾
          </button>
          <button type="button" className="landing-nav-link" onClick={scrollToPlatform}>
            Frameworks
          </button>
          <button type="button" className="landing-nav-link" onClick={scrollToPlatform}>
            Vendors
          </button>
          <button type="button" className="landing-nav-link" onClick={scrollToPlatform}>
            How It Works
          </button>
          <button type="button" className="landing-nav-link" onClick={scrollToPlatform}>
            Security
          </button>
          <button type="button" className="landing-nav-link" onClick={scrollToPlatform}>
            Documentation
          </button>
        </nav>

        <div className="landing-nav-actions">
          <button
            type="button"
            className="btn-nav-signin"
            onClick={handleSignInClick}
          >
            Sign In
          </button>
          <button
            type="button"
            className="btn-nav-launch"
            onClick={onEnter}
          >
            Launch Console →
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="landing-main-wrapper">
        {/* Hero Section */}
        <section className="landing-hero">
          {/* Left Hero Column */}
          <div className="landing-hero-left">
            <div className="hero-eyebrow-pill">
              <span className="hero-eyebrow-line" />
              <span className="hero-dot" />
              <span className="hero-eyebrow-text">
                AI-DRIVEN NETWORK SECURITY COMPLIANCE &nbsp;|&nbsp; SIH26155
              </span>
            </div>

            <h1 className="hero-headline">
              From network configurations<br />
              to <span className="hero-headline-accent">evidence-backed</span><br />
              security decisions.
            </h1>

            <p className="hero-subparagraph">
              Audit multi-vendor configurations against CIS, NIST SP 800-53, DISA STIG and ISO/IEC 27001 — with exact
              line-level evidence, verified remediation and human-in-the-loop learning.
            </p>

            <div className="hero-cta-group">
              <button
                type="button"
                className="btn-hero-primary"
                onClick={onEnter}
              >
                Launch Security Console →
              </button>
              <button
                type="button"
                className="btn-hero-secondary"
                onClick={scrollToPlatform}
              >
                Explore Platform ↓
              </button>
            </div>
          </div>

          {/* Right Hero Column: 3D Isometric Visualizer Stage (Static Showcase, No Redirect on Hover/Click) */}
          <div className="hero-visualizer-wrapper">
            <div className="hero-visualizer-stage-box">
              <img
                src="/assets/hero_visualizer_seamless.png"
                alt="ComplianceAI Normalization Core Pipeline Visualizer"
                className="hero-visualizer-img"
              />
            </div>
          </div>
        </section>

        {/* 5 Metric Cards Row */}
        <section className="landing-metrics-row">
          {/* Card 1: 7 Vendor Profiles */}
          <div className="landing-metric-card">
            <div className="metric-left">
              <div className="metric-icon-svg">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="12" rx="2" />
                  <line x1="2" y1="20" x2="22" y2="20" />
                </svg>
              </div>
              <div className="metric-info">
                <div className="metric-number">7</div>
                <div className="metric-label">Vendor Profiles</div>
              </div>
            </div>
            <span className="metric-arrow">›</span>
          </div>

          {/* Card 2: 4 Compliance Frameworks */}
          <div className="landing-metric-card">
            <div className="metric-left">
              <div className="metric-icon-svg">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <div className="metric-info">
                <div className="metric-number">4</div>
                <div className="metric-label">Compliance Frameworks</div>
              </div>
            </div>
            <span className="metric-arrow">›</span>
          </div>

          {/* Card 3: 116 / 116 Verified Tests */}
          <div className="landing-metric-card">
            <div className="metric-left">
              <div className="metric-icon-svg">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  <polyline points="9 14 11 16 15 11" />
                </svg>
              </div>
              <div className="metric-info">
                <div className="metric-number">116 / 116</div>
                <div className="metric-label">Verified Tests</div>
              </div>
            </div>
            <span className="metric-arrow">›</span>
          </div>

          {/* Card 4: AI Human-in-the-loop */}
          <div className="landing-metric-card">
            <div className="metric-left">
              <div className="metric-icon-svg">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z" />
                  <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z" />
                </svg>
              </div>
              <div className="metric-info">
                <div className="metric-number">AI</div>
                <div className="metric-label">Human-in-the-loop</div>
              </div>
            </div>
            <span className="metric-arrow">›</span>
          </div>

          {/* Card 5: Secure RBAC • Audit Trail */}
          <div className="landing-metric-card">
            <div className="metric-left">
              <div className="metric-icon-svg">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="metric-info">
                <div className="metric-number">Secure</div>
                <div className="metric-label">RBAC • Audit Trail</div>
              </div>
            </div>
            <span className="metric-arrow">›</span>
          </div>
        </section>

        {/* 4 Feature Showcase Cards Row */}
        <section className="landing-showcase-row" id="platform-showcase">
          {/* Card 1: Heterogeneous Networks */}
          <div className="landing-showcase-card card-with-rack">
            <div className="showcase-content-col">
              <div>
                <div className="showcase-header">
                  <div className="showcase-badge-circle">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <span className="showcase-badge-num">1</span>
                </div>
                <div className="showcase-category-label">MULTI-VENDOR SUPPORT</div>
                <h3 className="showcase-title">
                  Heterogeneous<br />
                  Networks
                </h3>
                <p className="showcase-desc">
                  Support for 7 major network platforms with vendor-specific parsing and remediation.
                </p>
              </div>
              <button type="button" className="showcase-link" onClick={onEnter}>
                View Supported Vendors →
              </button>
            </div>
            <div className="showcase-visual-slot-rack">
              <img
                src="/assets/card1_rack_seamless.png"
                alt="Heterogeneous Server Rack with Cisco, Juniper, Arista, Fortinet, MikroTik, SONiC, AWS"
                className="showcase-rack-img"
              />
            </div>
          </div>

          {/* Card 2: Four Compliance Lenses */}
          <div className="landing-showcase-card card-with-lenses">
            <div className="showcase-content-col">
              <div>
                <div className="showcase-header">
                  <div className="showcase-badge-circle">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <span className="showcase-badge-num">2</span>
                </div>
                <div className="showcase-category-label">COMPLIANCE INTELLIGENCE</div>
                <h3 className="showcase-title">
                  Four<br />
                  Compliance Lenses
                </h3>
                <p className="showcase-desc">
                  Evaluate a unified security baseline against CIS, NIST SP 800-53, DISA STIG and ISO/IEC 27001.
                </p>
              </div>
              <button type="button" className="showcase-link" onClick={onEnter}>
                Explore Frameworks →
              </button>
            </div>
            <div className="showcase-visual-slot-lenses">
              <img
                src="/assets/card2_lenses_seamless.png"
                alt="CIS, NIST SP 800-53, DISA STIG, ISO 27001 Holographic Lenses"
                className="showcase-lenses-img"
              />
            </div>
          </div>

          {/* Card 3: Traceable Findings */}
          <div className="landing-showcase-card">
            <div className="showcase-content-col">
              <div>
                <div className="showcase-header">
                  <div className="showcase-badge-circle">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                  </div>
                  <span className="showcase-badge-num">3</span>
                </div>
                <div className="showcase-category-label">EVIDENCE-FIRST</div>
                <h3 className="showcase-title">
                  Traceable<br />
                  Findings
                </h3>
                <p className="showcase-desc">
                  Every finding includes exact line-level evidence, severity and vendor-specific remediation.
                </p>
              </div>
              <button type="button" className="showcase-link" onClick={onEnter}>
                See Example →
              </button>
            </div>
            <div className="showcase-visual-slot-finding">
              <div className="code-finding-hud">
                <div className="finding-hud-header">
                  <span className="finding-id-tag">CIS-SSH-001</span>
                  <div className="finding-badge-group">
                    <span className="finding-tag-high">HIGH</span>
                    <span className="finding-tag-fail">FAIL</span>
                  </div>
                </div>
                <div className="finding-line-label">Line 42:</div>
                <div className="finding-evidence-box">
                  <code>ip ssh version 1</code>
                </div>
                <div className="finding-expected-label">Expected:</div>
                <div className="finding-expected-val">ip ssh version 2</div>
                <div className="finding-remediation-title">Remediation (Verified):</div>
                <div className="finding-remediation-box">
                  <code>conf t</code>
                  <code>ip ssh version 2</code>
                  <code>end</code>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Continuous Learning */}
          <div className="landing-showcase-card">
            <div className="showcase-content-col">
              <div>
                <div className="showcase-header">
                  <div className="showcase-badge-circle">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z" />
                      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z" />
                    </svg>
                  </div>
                  <span className="showcase-badge-num">4</span>
                </div>
                <div className="showcase-category-label">CONTINUOUS LEARNING</div>
                <h3 className="showcase-title">
                  Unknown Syntax<br />
                  ➔ Learned Rules
                </h3>
                <p className="showcase-desc">
                  AI suggestions, human approval, persisted ParserRules and automatic re-evaluation.
                </p>
              </div>
              <button type="button" className="showcase-link" onClick={onEnter}>
                Explore Learning Loop →
              </button>
            </div>
            <div className="showcase-visual-slot-loop">
              <div className="loop-pills-stack">
                <div className="loop-pill">
                  <span className="loop-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /></svg>
                  </span>
                  <span>Unknown Syntax</span>
                </div>
                <div className="loop-pill">
                  <span className="loop-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>
                  </span>
                  <span>AI Suggestion</span>
                </div>
                <div className="loop-pill">
                  <span className="loop-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </span>
                  <span>Human Review</span>
                </div>
                <div className="loop-pill highlight">
                  <span className="loop-icon">✓</span>
                  <strong>Approved Rule</strong>
                </div>
                <div className="loop-pill">
                  <span className="loop-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                  </span>
                  <span>Re-evaluation</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
