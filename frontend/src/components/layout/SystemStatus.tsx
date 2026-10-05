import { useEffect, useState } from "react";
import { api } from "../../api";

export function SystemStatus({ onRefresh }: { readonly onRefresh?: () => void }) {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .health()
      .then(() => {
        if (mounted) setOnline(true);
      })
      .catch(() => {
        if (mounted) setOnline(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.8rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: online === true ? "var(--status-pass)" : online === false ? "var(--status-fail)" : "var(--status-unknown)",
          }}
        />
        <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          API: {online === true ? "CONNECTED" : online === false ? "OFFLINE" : "CHECKING..."}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--status-pass)" }} />
        <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>AI ENGINE: READY</span>
      </div>

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="btn btn-secondary btn-sm"
          style={{ padding: "0.2rem 0.5rem" }}
          title="Refresh Data"
        >
          ↻ Refresh
        </button>
      )}
    </div>
  );
}
