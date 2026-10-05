import type { Severity } from "../../types";

interface SeverityBadgeProps {
  severity: Severity | string;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const norm = severity.toLowerCase();
  let badgeClass = "badge-low";

  if (norm === "high" || norm === "critical") {
    badgeClass = "badge-high";
  } else if (norm === "medium") {
    badgeClass = "badge-medium";
  }

  return <span className={`badge ${badgeClass}`}>{severity.toUpperCase()}</span>;
}
