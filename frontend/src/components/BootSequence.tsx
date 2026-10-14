import { useEffect, useState } from "react";
import { ShieldCheck, CheckCircle2, Loader2, Terminal, ArrowRight } from "lucide-react";

interface BootStep {
  label: string;
  subtext: string;
}

const BOOT_STEPS: BootStep[] = [
  {
    label: "Loading compliance baselines",
    subtext: "CIS Benchmark · NIST SP 800-53 · DISA STIG · ISO 27001",
  },
  {
    label: "Starting multi-vendor parser pipeline",
    subtext: "Cisco IOS-XE · Juniper JunOS · Arista EOS · Fortinet FortiOS",
  },
  {
    label: "Initializing local AI embedding model",
    subtext: "SentenceTransformers (all-MiniLM-L6-v2) vector store loaded",
  },
  {
    label: "Verifying local SQLite database & rules",
    subtext: "Audit ledger, RBAC policies, and baseline rules verified",
  },
  {
    label: "Console subsystems ready",
    subtext: "Launching Network Security Command Center...",
  },
];

export function BootSequence({ onComplete }: { readonly onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep >= BOOT_STEPS.length) {
      const timer = setTimeout(onComplete, 400);
      return () => clearTimeout(timer);
    }

    const delay = currentStep === 0 ? 300 : 380;
    const timer = setTimeout(() => {
      setCurrentStep((s) => s + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [currentStep, onComplete]);

  const progress = Math.min(100, Math.round((currentStep / BOOT_STEPS.length) * 100));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#070B10",
        backgroundImage: `
          radial-gradient(circle at 50% 30%, rgba(56, 189, 248, 0.08) 0%, transparent 60%),
          linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: "100% 100%, 32px 32px, 32px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          backgroundColor: "rgba(13, 19, 27, 0.95)",
          border: "1px solid rgba(56, 189, 248, 0.2)",
          borderRadius: "12px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(56, 189, 248, 0.12)",
          backdropFilter: "blur(16px)",
          overflow: "hidden",
        }}
      >
        {/* Terminal Header Bar */}
        <div
          style={{
            height: "42px",
            backgroundColor: "rgba(8, 12, 18, 0.8)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#EF4444", opacity: 0.8 }} />
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#F59E0B", opacity: 0.8 }} />
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10B981", opacity: 0.8 }} />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
            }}
          >
            <Terminal style={{ width: "13px", height: "13px", color: "var(--accent-primary)" }} />
            <span>complianceai-init.sh</span>
          </div>

          <button
            type="button"
            onClick={onComplete}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "0.7rem",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span>Skip</span>
            <ArrowRight style={{ width: "12px", height: "12px" }} />
          </button>
        </div>

        {/* Content Box */}
        <div style={{ padding: "1.75rem" }}>
          {/* Brand Row */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.5rem" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                backgroundColor: "rgba(56, 189, 248, 0.12)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-primary)",
              }}
            >
              <ShieldCheck style={{ width: "26px", height: "26px" }} />
            </div>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                ComplianceAI Security Engine
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                Initializing enterprise compliance auditing subsystem
              </div>
            </div>
          </div>

          {/* Stepper list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.75rem" }}>
            {BOOT_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;

              let stepIcon = (
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-elevated)",
                  }}
                />
              );
              if (isCompleted) {
                stepIcon = <CheckCircle2 style={{ width: "16px", height: "16px", color: "var(--status-pass)" }} />;
              } else if (isCurrent) {
                stepIcon = (
                  <Loader2
                    style={{
                      width: "16px",
                      height: "16px",
                      color: "var(--accent-primary)",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                );
              }

              let stepColor = "var(--text-muted)";
              if (isCompleted) {
                stepColor = "var(--text-primary)";
              } else if (isCurrent) {
                stepColor = "var(--accent-primary)";
              }

              return (
                <div
                  key={step.label}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    opacity: isCompleted || isCurrent ? 1 : 0.35,
                    transition: "opacity 0.25s ease",
                  }}
                >
                  <div style={{ marginTop: "2px", flexShrink: 0 }}>
                    {stepIcon}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: stepColor,
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-muted)",
                        marginTop: "0.1rem",
                      }}
                    >
                      {step.subtext}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Bar & Status Footer */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono)",
                marginBottom: "0.45rem",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>INITIALIZING SUBSYSTEMS</span>
              <span style={{ color: "var(--accent-primary)", fontWeight: 700 }}>{progress}%</span>
            </div>

            <div
              style={{
                width: "100%",
                height: "6px",
                backgroundColor: "var(--bg-root)",
                borderRadius: "999px",
                overflow: "hidden",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  backgroundColor: "var(--accent-primary)",
                  boxShadow: "0 0 12px rgba(56, 189, 248, 0.7)",
                  transition: "width 0.3s ease-out",
                  borderRadius: "999px",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
