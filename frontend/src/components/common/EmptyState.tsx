import React from "react";

interface EmptyStateProps {
  readonly title: string;
  readonly description: string;
  readonly action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      backgroundColor: "var(--bg-surface)",
      border: "1px dashed var(--border-medium)",
      borderRadius: "var(--radius-md)",
      padding: "3rem 2rem",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.75rem",
    }}>
      <div style={{ fontSize: "2rem", color: "var(--text-muted)" }}>📂</div>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>{title}</h3>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: "450px" }}>{description}</p>
      {action && <div style={{ marginTop: "0.5rem" }}>{action}</div>}
    </div>
  );
}
