import { useEffect, useState } from "react";
import { api, CANONICAL_KEYS } from "../api";
import type { ConfigSummary, LineClassification, RulePreviewResult } from "../types";
import { ConfidenceMeter } from "./Badges";
import { toast } from "../toast";

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
    <div className="page">
      <div className="page-head">
        <h1>AI Training</h1>
        <p>
          Lines an unrecognized vendor syntax couldn't be parsed land here. Confirm what each one
          means, and every future device using the same phrasing is auto-classified — no redeploy.
          Approved rules are stored in <code>parse_rules</code> and re-normalize existing configs
          immediately (Phase 4 §D1 closure).
        </p>
      </div>

      <div className="card">
        <div className="field" style={{ maxWidth: 340 }}>
          <label htmlFor="select-device">Select device to review</label>
          <select
            id="select-device"
            value={deviceId ?? ""}
            onChange={(e) => setDeviceId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Select a device…</option>
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {r.device_id} ({r.vendor}) — {r.unmapped_count} unmapped
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {busy && <div className="faint">Classifying lines…</div>}

      {lines?.length === 0 && (
        <div className="card">
          <div className="empty">
            Nothing pending for this device — every line was parsed or already labelled.
          </div>
        </div>
      )}

      {lines && lines.length > 0 && (
        <div>
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
    <div className="card" style={{ marginBottom: "var(--space-4)" }}>
      {/* Line text */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <div className="faint" style={{ fontSize: "0.75rem", marginBottom: "var(--space-1)" }}>
          UNRECOGNIZED CONFIG LINE
        </div>
        <code className="code-line">{line.line_text}</code>
      </div>

      <div className="divider" />

      {/* AI confidence + matched examples */}
      <div className="toolbar" style={{ marginBottom: "var(--space-3)" }}>
        <div>
          <div className="faint" style={{ marginBottom: "var(--space-2)" }}>AI confidence</div>
          <ConfidenceMeter value={line.confidence} />
        </div>
        {!line.needs_labeling && line.suggested_canonical_key && (
          <div className="callout" style={{ flex: 1 }}>
            AI suggests: <strong>{line.suggested_canonical_key}</strong>
          </div>
        )}
      </div>

      {line.matched_examples.length > 0 && (
        <div className="examples-list" style={{ marginBottom: "var(--space-3)" }}>
          <div className="faint" style={{ marginBottom: "var(--space-1)" }}>Closest known examples:</div>
          {line.matched_examples.map((m) => (
            <div key={`${m.canonical_key}-${m.line_text}`} className="example-row">
              <code>{m.line_text}</code> → <strong>{m.canonical_key}</strong>{" "}
              ({m.vendor}, {Math.round(m.score * 100)}%)
            </div>
          ))}
        </div>
      )}

      <div className="divider" />

      {/* Step 1: Target field */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <div className="faint" style={{ marginBottom: "var(--space-2)" }}>
          Step 1 — Maps to control field:
        </div>
        <div className="chip-row">
          {CANONICAL_KEYS.map((k) => (
            <button
              type="button"
              key={k}
              className={`chip${targetField === k ? " selected" : ""}`}
              onClick={() => setTargetField(k)}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Regex pattern */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <div className="faint" style={{ marginBottom: "var(--space-2)" }}>
          Step 2 — Generalized regex pattern{" "}
          <span style={{ opacity: 0.6 }}>(use a capture group for the value, e.g. <code>(\d+)</code>)</span>:
        </div>
        <div className="toolbar" style={{ gap: "var(--space-2)" }}>
          <input
            id={`pattern-${line.line_text}`}
            type="text"
            className="input"
            value={pattern}
            style={{ fontFamily: "monospace", flex: 1 }}
            onChange={(e) => { setPattern(e.target.value); setPreview(null); }}
            placeholder="^session-timeout (\d+)"
            spellCheck={false}
          />
          <button
            type="button"
            className="btn"
            disabled={!pattern || previewing}
            onClick={handlePreview}
          >
            {previewing ? <span className="spinner" /> : "Preview"}
          </button>
        </div>
        {preview && (
          <div
            className={preview.match_count > 0 ? "callout" : "error-banner"}
            style={{ marginTop: "var(--space-2)" }}
          >
            {preview.match_count > 0 ? (
              <>
                ✓ Pattern matches <strong>{preview.match_count}</strong> line(s) in this config:
                <ul style={{ marginTop: "var(--space-1)", marginBottom: 0 }}>
                  {preview.matched_lines.map((l) => (
                    <li key={l}><code>{l}</code></li>
                  ))}
                </ul>
              </>
            ) : (
              "⚠ Pattern matches 0 lines in this config — check your regex."
            )}
          </div>
        )}
      </div>

      {/* Step 3: Advanced (value type + static value + category) */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <button
          type="button"
          className="btn"
          style={{ fontSize: "0.8rem" }}
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? "▲ Hide advanced" : "▼ Advanced options"}
        </button>
        {showAdvanced && (
          <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div className="field">
              <label htmlFor={`vtype-${line.line_text}`}>Value type</label>
              <select
                id={`vtype-${line.line_text}`}
                value={valueType}
                onChange={(e) => setValueType(e.target.value as typeof valueType)}
              >
                <option value="string">string (default)</option>
                <option value="int">int — parse as integer</option>
                <option value="float">float — parse as decimal</option>
                <option value="bool">bool — true/false/enable/disable</option>
                <option value="map">map — map raw text to a value</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor={`sval-${line.line_text}`}>
                Static value{" "}
                <span className="faint">(use when no capture group — pattern presence sets this value)</span>
              </label>
              <input
                id={`sval-${line.line_text}`}
                type="text"
                className="input"
                value={staticValue}
                onChange={(e) => setStaticValue(e.target.value)}
                placeholder='e.g. "2" or true'
              />
            </div>
            <div className="field">
              <label htmlFor={`cat-${line.line_text}`}>Semantic category</label>
              <input
                id={`cat-${line.line_text}`}
                type="text"
                className="input"
                value={semanticCategory}
                onChange={(e) => setSemanticCategory(e.target.value)}
                placeholder="e.g. Remote Access, Authentication…"
              />
            </div>
          </div>
        )}
      </div>

      {/* Approve */}
      <div className="toolbar">
        <button
          className="btn btn-primary"
          disabled={!targetField || !pattern || saving}
          onClick={handleApprove}
        >
          {saving ? <span className="spinner" /> : "✓ Approve & save rule"}
        </button>
        <span className="faint" style={{ fontSize: "0.8rem" }}>
          Saves rule to DB and re-normalizes existing configs immediately.
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
