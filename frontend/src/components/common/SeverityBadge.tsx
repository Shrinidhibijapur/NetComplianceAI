import type { Severity } from "../../types";

export type SeverityValue = Severity | (string & {});

interface SeverityBadgeProps {
  readonly severity: SeverityValue;
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
