import { useEffect, useState } from "react";
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
          }}
        />
        <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          API: {statusText}
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
