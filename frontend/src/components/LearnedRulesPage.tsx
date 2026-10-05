import { useEffect, useState, useMemo } from "react";
import { api } from "../api";
import type { ParseRuleOut } from "../types";
import { toast } from "../toast";
import { PageHeader } from "./common/PageHeader";
import { EmptyState } from "./common/EmptyState";
import { TechnicalValue } from "./common/TechnicalValue";

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

  const activeCount = useMemo(() => rules.filter((r) => r.active).length, [rules]);
  const disabledCount = useMemo(() => rules.filter((r) => !r.active).length, [rules]);

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
    <div className="page" style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem" }}>
      <PageHeader
        title="Learned Rules Registry"
        description="Admin-approved parse rules stored in the database. Each rule is a generalized regex pattern mapping unrecognized syntax to a canonical compliance control field. Disabling or deleting a rule triggers immediate re-normalization of affected configs."
      />

      {error && (
        <div className="error-banner" style={{ marginBottom: "1.5rem" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Rules Summary Bar */}
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-medium)",
        borderRadius: "var(--radius-md)",
        padding: "1rem 1.25rem",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Rules: </span>
            <strong style={{ fontSize: "1rem", color: "var(--text-primary)" }}>{total}</strong>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Active: </span>
            <strong style={{ fontSize: "1rem", color: "#10b981" }}>{activeCount}</strong>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Disabled: </span>
            <strong style={{ fontSize: "1rem", color: "var(--text-muted)" }}>{disabledCount}</strong>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={loadRules}
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-medium)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            padding: "0.4rem 0.85rem",
            fontSize: "0.825rem",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Refreshing…" : "🔄 Refresh Rules"}
        </button>
      </div>

      {!loading && rules.length === 0 && (
        <EmptyState
          title="No learned rules registered yet"
          description="Go to the AI Pattern Training page to approve rules from unmapped configuration syntax lines."
        />
      )}

      {rules.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onDisable={handleDisable}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
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
    <div style={{
      background: "var(--bg-surface)",
      border: `1px solid ${rule.active ? "var(--border-medium)" : "var(--border-subtle)"}`,
      borderLeft: `4px solid ${rule.active ? "var(--accent-primary, #38bdf8)" : "var(--text-muted)"}`,
      borderRadius: "var(--radius-md)",
      padding: "1.25rem 1.5rem",
      opacity: rule.active ? 1 : 0.6,
      boxShadow: rule.active ? "0 2px 10px rgba(0,0,0,0.15)" : "none",
      transition: "all 0.2s ease"
    }}>
      {/* Header row */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1rem",
        borderBottom: "1px solid var(--border-subtle)",
        paddingBottom: "0.75rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            padding: "0.2rem 0.55rem",
            borderRadius: "var(--radius-sm)",
            background: rule.active ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.06)",
            color: rule.active ? "var(--accent-primary, #38bdf8)" : "var(--text-muted)",
            border: `1px solid ${rule.active ? "rgba(56, 189, 248, 0.3)" : "var(--border-subtle)"}`
          }}>
            {rule.active ? "ACTIVE" : "DISABLED"}
          </span>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Rule #{rule.id}
          </span>
          <span style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
            • Source: <strong>{rule.source.toUpperCase()}</strong> • Approved by <strong>{rule.approved_by}</strong>
          </span>
        </div>

        <span style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
          Approved {new Date(rule.approved_at).toLocaleString()}
        </span>
      </div>

      {/* Grid details */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "1rem",
        marginBottom: "1rem"
      }}>
        <div>
          <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
            Target Canonical Field
          </div>
          <TechnicalValue value={rule.target_field} />
        </div>

        <div>
          <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
            Vendor / Platform / OS Scope
          </div>
          <code style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {rule.vendor} / {rule.platform} / {rule.os_range}
          </code>
        </div>

        <div style={{ gridColumn: "span 2" }}>
          <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
            Generalized Extraction Regex Pattern
          </div>
          <div style={{
            background: "var(--bg-elevated)",
            padding: "0.4rem 0.75rem",
            borderRadius: "var(--radius-sm)",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            color: "#10b981",
            wordBreak: "break-all",
            border: "1px solid var(--border-subtle)"
          }}>
            {rule.pattern}
          </div>
        </div>

        <div style={{ gridColumn: "span 2" }}>
          <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
            Example Input Syntax
          </div>
          <code style={{
            display: "block",
            background: "var(--bg-elevated)",
            padding: "0.4rem 0.75rem",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-subtle)",
            wordBreak: "break-all"
          }}>
            {rule.example_line}
          </code>
        </div>
      </div>

      {/* Meta Footer & Actions */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: "0.75rem",
        borderTop: "1px solid var(--border-subtle)"
      }}>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.775rem", color: "var(--text-muted)" }}>
          <span>Value type: <code>{rule.value_type}</code></span>
          {rule.semantic_category && <span>Category: <strong>{rule.semantic_category}</strong></span>}
          <span>Confidence: <strong>{Math.round(rule.confidence * 100)}%</strong></span>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {rule.active && (
            <button
              type="button"
              disabled={disabling}
              onClick={async () => {
                setDisabling(true);
                await onDisable(rule);
                setDisabling(false);
              }}
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-medium)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                padding: "0.35rem 0.75rem",
                fontSize: "0.8rem",
                cursor: disabling ? "not-allowed" : "pointer"
              }}
            >
              {disabling ? "Disabling…" : "Disable Rule"}
            </button>
          )}

          <button
            type="button"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              await onDelete(rule);
              setDeleting(false);
            }}
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "var(--radius-sm)",
              color: "#ef4444",
              padding: "0.35rem 0.75rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: deleting ? "not-allowed" : "pointer"
            }}
          >
            {deleting ? "Deleting…" : "Delete Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

