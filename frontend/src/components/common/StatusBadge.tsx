import type { FindingStatus } from "../../types";

interface StatusBadgeProps {
  status: FindingStatus | "unmapped" | "processing" | "complete" | "failed" | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const norm = status.toLowerCase();

  let badgeClass = "badge-unmapped";
  let label = status.toUpperCase();

  if (norm === "pass") {
    badgeClass = "badge-pass";
    label = "✓ PASS";
  } else if (norm === "fail") {
    badgeClass = "badge-fail";
    label = "✕ FAIL";
  } else if (norm === "unknown") {
    badgeClass = "badge-unknown";
    label = "⚠ UNKNOWN";
  } else if (norm === "unmapped") {
    badgeClass = "badge-unmapped";
    label = "⚡ UNMAPPED";
  } else if (norm === "complete" || norm === "active") {
    badgeClass = "badge-pass";
  } else if (norm === "failed" || norm === "disabled") {
    badgeClass = "badge-fail";
  }

  return <span className={`badge ${badgeClass}`}>{label}</span>;
}
