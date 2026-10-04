import { useEffect, useState } from "react";
import { api } from "../api";
import type { ParseRuleOut } from "../types";
import { toast } from "../toast";

export function LearnedRulesPage({ refreshKey }: { readonly refreshKey: number }) {
  const [rules, setRules] = useState<ParseRuleOut[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRules() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listRules();
      setRules(data.rules);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRules();
  }, [refreshKey]);

  async function handleDisable(rule: ParseRuleOut) {
    try {
      const res = await api.disableRule(rule.id);
      toast(
        `Rule #${rule.id} disabled — ${res.renormalized_configs} config(s) re-normalized.`,
        "success",
      );
      await loadRules();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to disable rule", "error");
    }
  }

  async function handleDelete(rule: ParseRuleOut) {
    if (!confirm(`Delete rule #${rule.id} (${rule.target_field})? This cannot be undone.`)) return;
    try {
      const res = await api.deleteRule(rule.id);
      toast(
        `Rule #${rule.id} deleted — ${res.renormalized_configs} config(s) re-normalized.`,
        "success",
      );
      await loadRules();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to delete rule", "error");
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Learned Rules</h1>
        <p>
          Admin-approved parse rules stored in the database. Each rule is a generalized regex
          pattern that maps an unrecognized configuration line to a compliance control field.
          Disabling a rule re-normalizes all affected configs immediately.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="faint">
            {loading ? "Loading…" : `${total} rule${total !== 1 ? "s" : ""} total`}
          </span>
          <button type="button" className="btn" onClick={loadRules} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {!loading && rules.length === 0 && (
        <div className="card">
          <div className="empty">
            No learned rules yet. Go to the <strong>AI Training</strong> page to approve rules
            from unmapped configuration lines.
          </div>
        </div>
      )}

      {rules.map((rule) => (
        <RuleCard
          key={rule.id}
          rule={rule}
          onDisable={handleDisable}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}

function RuleCard({
  rule,
  onDisable,
  onDelete,
}: {
  readonly rule: ParseRuleOut;
  readonly onDisable: (rule: ParseRuleOut) => Promise<void>;
  readonly onDelete: (rule: ParseRuleOut) => Promise<void>;
}) {
  const [disabling, setDisabling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div
      className="card"
      style={{
        marginBottom: "var(--space-3)",
        opacity: rule.active ? 1 : 0.55,
        borderLeft: `3px solid ${rule.active ? "var(--color-accent)" : "var(--color-border)"}`,
      }}
    >
      {/* Header row */}
      <div className="toolbar" style={{ marginBottom: "var(--space-3)" }}>
        <div style={{ flex: 1 }}>
          <span
            style={{
              display: "inline-block",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              padding: "2px 8px",
              borderRadius: 4,
              background: rule.active ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.06)",
              color: rule.active ? "var(--color-accent)" : "var(--color-text-muted)",
              marginRight: "var(--space-2)",
            }}
          >
            {rule.active ? "ACTIVE" : "DISABLED"}
          </span>
          <span className="faint" style={{ fontSize: "0.8rem" }}>
            #{rule.id} · {rule.source.toUpperCase()} · approved by {rule.approved_by}
          </span>
        </div>
        <span className="faint" style={{ fontSize: "0.75rem" }}>
          {new Date(rule.approved_at).toLocaleString()}
        </span>
      </div>

      {/* Core info grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-3)",
          marginBottom: "var(--space-3)",
        }}
      >
        <div>
          <div className="faint" style={{ fontSize: "0.75rem", marginBottom: "var(--space-1)" }}>
            TARGET FIELD
          </div>
          <code style={{ color: "var(--color-accent)" }}>{rule.target_field}</code>
        </div>
        <div>
          <div className="faint" style={{ fontSize: "0.75rem", marginBottom: "var(--space-1)" }}>
            VENDOR · PLATFORM · OS
          </div>
          <code>
            {rule.vendor} / {rule.platform} / {rule.os_range}
          </code>
        </div>
        <div>
          <div className="faint" style={{ fontSize: "0.75rem", marginBottom: "var(--space-1)" }}>
            PATTERN
          </div>
          <code className="code-line" style={{ wordBreak: "break-all" }}>
            {rule.pattern}
          </code>
        </div>
        <div>
          <div className="faint" style={{ fontSize: "0.75rem", marginBottom: "var(--space-1)" }}>
            EXAMPLE LINE
          </div>
          <code className="code-line" style={{ color: "var(--color-text-secondary)" }}>
            {rule.example_line}
          </code>
        </div>
      </div>

      {/* Secondary info */}
      <div className="toolbar" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
        <span>type: <code>{rule.value_type}</code></span>
        {rule.semantic_category && <span>category: {rule.semantic_category}</span>}
        <span>confidence: {Math.round(rule.confidence * 100)}%</span>
      </div>

      {/* Actions */}
      <div className="toolbar">
        {rule.active && (
          <button
            type="button"
            className="btn"
            disabled={disabling}
            onClick={async () => {
              setDisabling(true);
              await onDisable(rule);
              setDisabling(false);
            }}
          >
            {disabling ? <span className="spinner" /> : "Disable"}
          </button>
        )}
        <button
          type="button"
          className="btn"
          style={{ color: "var(--color-critical)" }}
          disabled={deleting}
          onClick={async () => {
            setDeleting(true);
            await onDelete(rule);
            setDeleting(false);
          }}
        >
          {deleting ? <span className="spinner" /> : "Delete"}
        </button>
      </div>
    </div>
  );
}
