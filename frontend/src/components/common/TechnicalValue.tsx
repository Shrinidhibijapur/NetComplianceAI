import type { ReactNode } from "react";

interface TechnicalValueProps {
  readonly value: ReactNode;
}

export function TechnicalValue({ value }: TechnicalValueProps) {
  if (value === null || value === undefined || value === "") {
    return <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Not detected</span>;
  }

  const textVal = typeof value === "object" ? JSON.stringify(value) : String(value);

  return (
    <code
      className="tech-val"
      style={{
        backgroundColor: "var(--bg-elevated)",
        padding: "0.15rem 0.4rem",
        borderRadius: "var(--radius-sm)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-subtle)",
        wordBreak: "break-all",
      }}
    >
      {textVal}
    </code>
  );
}
