import { useEffect, useState } from "react";
import { api, CANONICAL_KEYS } from "../api";
import type { ConfigSummary, LineClassification } from "../types";
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

  async function confirm(line: LineClassification, canonicalKey: string) {
    if (!canonicalKey) return;
    await api.labelLine(vendor, line.line_text, canonicalKey);
    toast(`Mapped to ${canonicalKey} — future devices with this phrasing auto-classify.`, "success");
    setLines((prev) => (prev ? prev.filter((l) => l.line_text !== line.line_text) : prev));
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>AI Training</h1>
        <p>
          Lines an unrecognized vendor syntax couldn't be L1-parsed land here. Confirm what each
          one means once, and every future device using the same phrasing is auto-classified — no
          redeploy (Implementation Plan §4.2).
        </p>
      </div>

      <div className="card">
        <div className="field" style={{ maxWidth: 320 }}>
          <label htmlFor="select-device">Device</label>
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

      {lines && lines.length === 0 && (
        <div className="card">
          <div className="empty">
            Nothing pending for this device — every line was parsed or already labeled.
          </div>
        </div>
      )}

      {lines && lines.length > 0 && (
        <div>
          {lines.map((line) => (
            <TrainingRow key={line.line_text} line={line} onConfirm={confirm} />
          ))}
        </div>
      )}
    </div>
  );
}

function TrainingRow({
  line,
  onConfirm,
}: {
  line: LineClassification;
  onConfirm: (line: LineClassification, key: string) => Promise<void>;
}) {
  const [choice, setChoice] = useState(line.suggested_canonical_key ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="card">
      <code className="code-line">{line.line_text}</code>
      <div className="divider" />
      <div className="toolbar">
        <div>
          <div className="faint" style={{ marginBottom: "var(--space-2)" }}>
            AI confidence
          </div>
          <ConfidenceMeter value={line.confidence} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 260 }}>
          <span className="faint" style={{ display: "block", marginBottom: "var(--space-1)" }}>
            Maps to control — click to pick
          </span>
          <div className="chip-row">
            {CANONICAL_KEYS.map((k) => (
              <button
                type="button"
                key={k}
                className={`chip${choice === k ? " selected" : ""}`}
                onClick={() => setChoice(k)}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <button
          className="btn btn-primary"
          disabled={!choice || saving}
          onClick={async () => {
            setSaving(true);
            await onConfirm(line, choice);
            setSaving(false);
          }}
        >
          {saving ? <span className="spinner" /> : "Confirm mapping"}
        </button>
      </div>

      {line.matched_examples.length > 0 && (
        <div style={{ marginTop: "var(--space-4)" }}>
          <div className="faint" style={{ marginBottom: "var(--space-2)" }}>
            Closest known examples:
          </div>
          <div className="examples-list">
            {line.matched_examples.map((m) => (
              <div key={`${m.canonical_key}-${m.line_text}`} className="example-row">
                <code>{m.line_text}</code> → <strong>{m.canonical_key}</strong> ({m.vendor},{" "}
                {Math.round(m.score * 100)}%)
              </div>
            ))}
          </div>
        </div>
      )}

      {!line.needs_labeling && line.suggested_canonical_key && (
        <div className="callout" style={{ marginTop: "var(--space-4)" }}>
          AI is confident this maps to <strong>{line.suggested_canonical_key}</strong> — confirm
          to lock it in, or override above.
        </div>
      )}
    </div>
  );
}
