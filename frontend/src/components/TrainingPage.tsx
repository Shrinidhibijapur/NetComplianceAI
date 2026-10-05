import { useEffect, useState } from "react";
import { api, CANONICAL_KEYS } from "../api";
import type { ConfigSummary, LineClassification, RulePreviewResult } from "../types";
import { ConfidenceMeter } from "./Badges";
import { toast } from "../toast";
import { PageHeader } from "./common/PageHeader";
import { EmptyState } from "./common/EmptyState";

export function TrainingPage({
  refreshKey,
  selectedDeviceId,
}: {
  readonly refreshKey: number;
  readonly selectedDeviceId: number | null;
}) {
  const [records, setRecords] = useState<ConfigSummary[]>([]);
  const [deviceId, setDeviceId] = useState<number | null>(selectedDeviceId);
  const [vendor, setVendor] = useState("");
  const [lines, setLines] = useState<LineClassification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.listRecords().then(setRecords).catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    if (selectedDeviceId != null) setDeviceId(selectedDeviceId);
  }, [selectedDeviceId]);

  useEffect(() => {
    if (deviceId == null) return;
    setBusy(true);
    setError(null);
    api
      .pendingTraining(deviceId)
      .then((res) => {
        setVendor(res.vendor);
        setLines(res.classifications);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  }, [deviceId]);

  /** Called when admin approves a rule from TrainingRow */
  async function handleApprove(
    line: LineClassification,
    approved: {
      targetField: string;
      pattern: string;
      valueType: string;
      staticValue: string;
      semanticCategory: string;
    },
  ) {
    const result = await api.approveRule({
      vendor,
      example_line: line.line_text,
      pattern: approved.pattern,
      target_field: approved.targetField,
      value_type: approved.valueType,
      static_value: approved.staticValue || undefined,
      semantic_category: approved.semanticCategory,
      confidence: line.confidence,
    });
    toast(
      `✓ Rule saved — ${result.renormalized_configs} config(s) re-normalized immediately. No restart needed.`,
      "success",
    );
    setLines((prev) => prev?.filter((l) => l.line_text !== line.line_text) ?? null);
  }

  return (
    <div className="page" style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem" }}>
      <PageHeader
        title="AI Pattern Training (Human-in-the-Loop)"
        description="Unrecognized syntax from target vendor configs lands here. Map unfamiliar syntax lines to canonical security control fields, and every future device with matching phrasing is auto-classified — zero code redeploys."
      />

      {/* Device Selection Bar */}
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-medium)",
        borderRadius: "var(--radius-md)",
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1.5rem"
      }}>
        <div>
          <label
            htmlFor="select-device"
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "0.4rem"
            }}
          >
            Target Device Ingestion Audit:
          </label>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
            Select an ingested device config containing unmapped line items.
          </p>
        </div>

        <select
          id="select-device"
          value={deviceId ?? ""}
          onChange={(e) => setDeviceId(e.target.value ? Number(e.target.value) : null)}
          style={{
            minWidth: 320,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-medium)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            padding: "0.6rem 0.85rem",
            fontSize: "0.9rem"
          }}
        >
          <option value="">Select a device with unmapped lines…</option>
          {records.map((r) => (
            <option key={r.id} value={r.id}>
              {r.device_id} ({r.vendor}) — {r.unmapped_count} unmapped
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: "1.5rem" }}>
          ⚠️ {error}
        </div>
      )}

      {busy && (
        <div style={{
          padding: "2.5rem",
          textAlign: "center",
          color: "var(--accent-primary, #38bdf8)",
          fontSize: "0.95rem"
        }}>
          ⏳ Analyzing unmapped lines and vector embeddings…
        </div>
      )}

      {!busy && deviceId !== null && lines?.length === 0 && (
        <EmptyState
          title="All lines fully parsed!"
          description="Nothing pending for this device — every configuration line has been recognized by standard rules or past approved AI patterns."
        />
      )}

      {!busy && lines && lines.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {lines.map((line) => (
            <TrainingRow
              key={line.line_text}
              line={line}
              configId={deviceId!}
              onApprove={handleApprove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TrainingRow: full Phase 4 approve flow per unmapped line
// ─────────────────────────────────────────────────────────────────────────────

function TrainingRow({
  line,
  configId,
  onApprove,
}: {
  readonly line: LineClassification;
  readonly configId: number;
  readonly onApprove: (
    line: LineClassification,
    approved: {
      targetField: string;
      pattern: string;
      valueType: string;
      staticValue: string;
      semanticCategory: string;
    },
  ) => Promise<void>;
}) {
  const [targetField, setTargetField] = useState(line.suggested_canonical_key ?? "");
  const [pattern, setPattern] = useState(() => escapeForPattern(line.line_text));
  const [valueType, setValueType] = useState<"string" | "int" | "float" | "bool" | "map">("string");
  const [staticValue, setStaticValue] = useState("");
  const [semanticCategory, setSemanticCategory] = useState("");
  const [preview, setPreview] = useState<RulePreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  async function handlePreview() {
    if (!pattern) return;
    setPreviewing(true);
    try {
      const result = await api.previewPattern(pattern, configId);
      setPreview(result);
    } catch {
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleApprove() {
    if (!targetField || !pattern) return;
    setSaving(true);
    try {
      await onApprove(line, { targetField, pattern, valueType, staticValue, semanticCategory });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-medium)",
      borderRadius: "var(--radius-md)",
      padding: "1.5rem",
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
    }}>
      {/* Target Unmapped Line Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem"
        }}>
          <span style={{
            fontSize: "0.725rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#f59e0b",
            background: "rgba(245, 158, 11, 0.12)",
            padding: "0.2rem 0.5rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid rgba(245, 158, 11, 0.25)"
          }}>
            ⚡ Unmapped Config Line
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>AI confidence:</span>
            <ConfidenceMeter value={line.confidence} />
          </div>
        </div>

        <div style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
          padding: "0.75rem 1rem",
          fontFamily: "monospace",
          fontSize: "0.95rem",
          color: "var(--accent-primary, #38bdf8)",
          wordBreak: "break-all"
        }}>
          {line.line_text}
        </div>
      </div>

      {/* AI Suggestion Banner */}
      {!line.needs_labeling && line.suggested_canonical_key && (
        <div style={{
          background: "rgba(56, 189, 248, 0.08)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          borderRadius: "var(--radius-sm)",
          padding: "0.6rem 0.85rem",
          marginBottom: "1.25rem",
          fontSize: "0.85rem",
          color: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          🤖 <span>AI vector similarity suggests mapping to control field:</span>
          <strong style={{ color: "var(--accent-primary, #38bdf8)", fontFamily: "monospace" }}>
            {line.suggested_canonical_key}
          </strong>
        </div>
      )}

      {/* Matched Examples */}
      {line.matched_examples.length > 0 && (
        <div style={{
          background: "rgba(0,0,0,0.2)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
          padding: "0.75rem 1rem",
          marginBottom: "1.25rem"
        }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            Closest Vector-Matched Reference Lines:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {line.matched_examples.map((m) => (
              <div key={`${m.canonical_key}-${m.line_text}`} style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <code style={{ color: "var(--text-primary)", padding: "0.1rem 0.3rem", background: "var(--bg-elevated)", borderRadius: 3 }}>
                  {m.line_text}
                </code>{" "}
                → <strong style={{ color: "var(--accent-primary, #38bdf8)" }}>{m.canonical_key}</strong>{" "}
                <span style={{ color: "var(--text-muted)" }}>({m.vendor}, {Math.round(m.score * 100)}% match)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Target Field Selection */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          Step 1 — Select Target Canonical Field:
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {CANONICAL_KEYS.map((k) => {
            const isSelected = targetField === k;
            return (
              <button
                type="button"
                key={k}
                onClick={() => setTargetField(k)}
                style={{
                  background: isSelected ? "var(--accent-primary, #38bdf8)" : "var(--bg-elevated)",
                  color: isSelected ? "#000" : "var(--text-secondary)",
                  border: `1px solid ${isSelected ? "var(--accent-primary, #38bdf8)" : "var(--border-medium)"}`,
                  fontWeight: isSelected ? 700 : 400,
                  fontSize: "0.8rem",
                  fontFamily: "monospace",
                  padding: "0.3rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                {k}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Regex Pattern Builder */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label htmlFor={`pattern-${line.line_text}`} style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          Step 2 — Generalized Extraction Regex Pattern{" "}
          <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.775rem" }}>
            (use capture group <code>(\d+)</code> or <code>(\S+)</code> for extracted values)
          </span>:
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            id={`pattern-${line.line_text}`}
            type="text"
            value={pattern}
            onChange={(e) => { setPattern(e.target.value); setPreview(null); }}
            placeholder="^session-timeout (\d+)"
            spellCheck={false}
            style={{
              flex: 1,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-medium)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)",
              fontFamily: "monospace",
              fontSize: "0.875rem",
              padding: "0.5rem 0.75rem"
            }}
          />
          <button
            type="button"
            disabled={!pattern || previewing}
            onClick={handlePreview}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-medium)",
              color: "var(--text-primary)",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: pattern && !previewing ? "pointer" : "not-allowed"
            }}
          >
            {previewing ? "Previewing…" : "🔍 Test Regex"}
          </button>
        </div>

        {/* Live Match Preview Result */}
        {preview && (
          <div style={{
            marginTop: "0.75rem",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-sm)",
            background: preview.match_count > 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            border: `1px solid ${preview.match_count > 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            fontSize: "0.825rem",
            color: "var(--text-primary)"
          }}>
            {preview.match_count > 0 ? (
              <>
                <div style={{ color: "#10b981", fontWeight: 600, marginBottom: "0.25rem" }}>
                  ✓ Pattern matches {preview.match_count} line(s) in this configuration:
                </div>
                <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                  {preview.matched_lines.map((l) => (
                    <li key={l} style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{l}</li>
                  ))}
                </ul>
              </>
            ) : (
              <div style={{ color: "#ef4444", fontWeight: 600 }}>
                ⚠️ Pattern matches 0 lines — check your capture groups or regex delimiters.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 3: Advanced Options */}
      <div style={{ marginBottom: "1.25rem" }}>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.8rem",
            cursor: "pointer",
            padding: 0,
            textDecoration: "underline"
          }}
        >
          {showAdvanced ? "▲ Hide Advanced Options" : "⚙️ Advanced Options (Value type, Static override, Category)"}
        </button>

        {showAdvanced && (
          <div style={{
            marginTop: "0.75rem",
            padding: "1rem",
            background: "var(--bg-elevated)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem"
          }}>
            <div>
              <label htmlFor={`vtype-${line.line_text}`} style={{ display: "block", fontSize: "0.775rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                Value Type
              </label>
              <select
                id={`vtype-${line.line_text}`}
                value={valueType}
                onChange={(e) => setValueType(e.target.value as typeof valueType)}
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  padding: "0.4rem 0.6rem",
                  fontSize: "0.825rem"
                }}
              >
                <option value="string">string (default)</option>
                <option value="int">int — parse as integer</option>
                <option value="float">float — parse as decimal</option>
                <option value="bool">bool — true/false/enable/disable</option>
                <option value="map">map — raw text mapping</option>
              </select>
            </div>

            <div>
              <label htmlFor={`sval-${line.line_text}`} style={{ display: "block", fontSize: "0.775rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                Static Value (when no capture group)
              </label>
              <input
                id={`sval-${line.line_text}`}
                type="text"
                value={staticValue}
                onChange={(e) => setStaticValue(e.target.value)}
                placeholder='e.g. "2" or true'
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  padding: "0.4rem 0.6rem",
                  fontSize: "0.825rem"
                }}
              />
            </div>

            <div>
              <label htmlFor={`cat-${line.line_text}`} style={{ display: "block", fontSize: "0.775rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                Semantic Category
              </label>
              <input
                id={`cat-${line.line_text}`}
                type="text"
                value={semanticCategory}
                onChange={(e) => setSemanticCategory(e.target.value)}
                placeholder="e.g. Remote Access, Auth…"
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  padding: "0.4rem 0.6rem",
                  fontSize: "0.825rem"
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Approve Action */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          type="button"
          disabled={!targetField || !pattern || saving}
          onClick={handleApprove}
          style={{
            background: targetField && pattern && !saving ? "var(--accent-primary, #38bdf8)" : "var(--bg-elevated)",
            color: targetField && pattern && !saving ? "#000" : "var(--text-muted)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            padding: "0.65rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            cursor: targetField && pattern && !saving ? "pointer" : "not-allowed",
            transition: "all 0.15s ease"
          }}
        >
          {saving ? "Saving Rule…" : "✓ Approve & Re-Normalize All Devices"}
        </button>
        <span style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
          Stores rule to <code>parse_rules</code> database and immediately updates existing device audits.
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Convert a literal config line into a safe starting regex by escaping special chars. */
function escapeForPattern(line: string): string {
  const escaped = line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `^${escaped}`;
}

