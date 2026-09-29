const FEATURES = [
  {
    title: "Multi-Vendor Ingestion",
    body:
      "Upload raw config exports from Cisco, Juniper, or any whitebox/unknown vendor. Recognized syntax parses instantly into one vendor-neutral schema.",
  },
  {
    title: "AI Training Loop",
    body:
      "Unrecognized config lines don't get rejected — an embedding-based classifier suggests a mapping, you confirm once, and every future device with that phrasing auto-resolves.",
  },
  {
    title: "Multi-Framework Engine",
    body:
      "Evaluate the same normalized config against CIS, NIST SP 800-53, DISA STIG, or ISO/IEC 27001 — swap frameworks without re-uploading anything.",
  },
  {
    title: "Audit-Ready Reporting",
    body:
      "Every evaluation produces a branded PDF report with a compliance score, severity-ranked findings, and copy-paste remediation commands.",
  },
];

const STEPS = [
  { n: "01", title: "Upload", body: "Drop a config file or a whole bulk batch — single device or fleet-wide." },
  { n: "02", title: "Normalize & Train", body: "Known vendors parse instantly; unknown syntax routes to the AI trainer." },
  { n: "03", title: "Evaluate", body: "Pick a framework and get pass/fail findings with severity and remediation." },
  { n: "04", title: "Report", body: "Export a branded PDF audit report to hand to your security team." },
];

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="landing">
      <section className="hero-section">
        <div className="landing-bg" aria-hidden="true">
          <div className="landing-grid" />
          <div className="landing-scanline" />
          <div className="landing-glow landing-glow-1" />
          <div className="landing-glow landing-glow-2" />
          <div className="landing-glow landing-glow-3" />
        </div>

        <div className="hero">
          <span className="hero-eyebrow">Vendor-agnostic · Offline-capable · Self-learning</span>
          <h1>
            Audit any network device's <span className="hero-accent">security posture</span> — no
            matter the vendor.
          </h1>
          <p className="hero-sub">
            ComplianceAI normalizes Cisco, Juniper, and unrecognized whitebox configs into a
            single baseline, checks them against CIS, NIST, STIG, and ISO 27001, and hands your
            team a ready-to-file audit report — built for critical-infrastructure environments
            that can't rely on the internet being there.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={onEnter}>
              Launch Console →
            </button>
            <span className="faint">No sign-up. No account. Runs fully offline.</span>
          </div>
        </div>

        <div className="scroll-cue" aria-hidden="true">
          <span />
        </div>
      </section>

      <section className="info-section">
        <div className="info-inner">
          <h2 className="section-heading">What it does</h2>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <div className="feature-card" key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>

          <h2 className="section-heading">How it works</h2>
          <div className="steps-row">
            {STEPS.map((s) => (
              <div className="step" key={s.n}>
                <span className="step-n">{s.n}</span>
                <h4>{s.title}</h4>
                <p>{s.body}</p>
              </div>
            ))}
          </div>

          <div className="landing-cta">
            <div>
              <h2>No sample data on hand? That's fine.</h2>
              <p className="faint">
                Three synthetic device configs are bundled — including one from an unrecognized
                vendor to demo the AI training loop.
              </p>
            </div>
            <button className="btn btn-primary" onClick={onEnter}>
              Open the console
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
