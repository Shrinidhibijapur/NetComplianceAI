import { useEffect, useState, useCallback } from "react";
import { api } from "../../api";

function getStatusColor(online: boolean | null): string {
  if (online === true) {
    return "var(--status-pass)";
  }
  if (online === false) {
    return "var(--status-fail)";
  }
  return "var(--status-unknown)";
}

function getStatusLabel(online: boolean | null): string {
  if (online === true) {
    return "CONNECTED";
  }
  if (online === false) {
    return "OFFLINE";
  }
  return "CHECKING...";
}

export function SystemStatus({ onRefresh }: { readonly onRefresh?: () => void }) {
  const [online, setOnline] = useState<boolean | null>(null);

  const checkHealth = useCallback(() => {
    api
      .health()
      .then(() => setOnline(true))
      .catch(() => setOnline(false));
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, online ? 20000 : 5000);
    return () => clearInterval(interval);
  }, [checkHealth, online]);

  const handleRefresh = () => {
    checkHealth();
    onRefresh?.();
  };

  const dotColor = getStatusColor(online);
  const statusText = getStatusLabel(online);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.8rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: dotColor,
            boxShadow: online ? "0 0 8px rgba(16, 185, 129, 0.5)" : "none",
          }}
        />
        <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          API: {statusText}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "var(--status-pass)",
            boxShadow: "0 0 8px rgba(16, 185, 129, 0.5)",
          }}
        />
        <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>AI ENGINE: READY</span>
      </div>

      <button
        type="button"
        onClick={handleRefresh}
        className="btn btn-secondary btn-sm"
        style={{ padding: "0.2rem 0.5rem" }}
        title="Refresh Data & Connectivity"
      >
        ↻ Refresh
      </button>
    </div>
  );
}
