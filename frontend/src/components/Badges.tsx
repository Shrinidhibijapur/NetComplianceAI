import type { FindingStatus, Severity } from "../types";

export function StatusBadge({ status }: { readonly status: FindingStatus }) {
  return (
    <span className={`badge badge-${status}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}

export function SeverityBadge({ severity }: { readonly severity: Severity }) {
  return (
    <span className={`badge badge-${severity}`}>
      <span className="badge-dot" />
      {severity}
    </span>
  );
}

export function ConfidenceMeter({ value }: { readonly value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="confidence-bar">
      <div className="meter">
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="faint">{pct}%</span>
    </div>
  );
}
