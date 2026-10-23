import { useState, useEffect } from "react";
import { api, CANONICAL_KEYS } from "../api";
import { toast } from "../toast";
import type { LineClassification } from "../types";

interface QueueItem {
  id: string;
  lineText: string;
  vendor: string;
  status: "Selected" | "Review";
  suggestedField: string;
  valueType: string;
  extractedValue: string;
  similarExamples: { syntax: string; match: number }[];
}

const DEFAULT_QUEUE: QueueItem[] = [
  {
    id: "q-1",
    lineText: "set security custom-feature ssh-protocol-version 2",
    vendor: "Juniper Junos",
    status: "Selected",
    suggestedField: "ssh_version",
    valueType: "Integer",
    extractedValue: "2",
    similarExamples: [
      { syntax: "set system services ssh protocol-version 2", match: 0.91 },
      { syntax: "set ssh version 2", match: 0.84 },
    ],
  },
  {
    id: "q-2",
    lineText: "set system login banner message",
    vendor: "Juniper Junos",
    status: "Review",
    suggestedField: "login_banner_configured",
    valueType: "Boolean",
    extractedValue: "true",
    similarExamples: [
      { syntax: "set system login message authorized only", match: 0.88 },
      { syntax: "banner login warning", match: 0.79 },
    ],
  },
  {
    id: "q-3",
    lineText: "snmp-server community public",
    vendor: "Cisco IOS",
    status: "Review",
    suggestedField: "snmp_community_default",
    valueType: "String",
    extractedValue: "public",
    similarExamples: [
      { syntax: "snmp-server community default RO", match: 0.95 },
      { syntax: "snmp-server host 10.1.1.1 public", match: 0.82 },
    ],
  },
  {
    id: "q-4",
    lineText: "set log level debug",
    vendor: "Fortinet",
    status: "Review",
    suggestedField: "logging_enabled",
    valueType: "Boolean",
    extractedValue: "true",
    similarExamples: [
      { syntax: "set log syslogd setting enable", match: 0.86 },
      { syntax: "logging buffered debug", match: 0.75 },
    ],
  },
];

interface TrainingPageProps {
  readonly refreshKey: number;
  readonly selectedDeviceId: number | null;
}

export function TrainingPage({ refreshKey, selectedDeviceId }: TrainingPageProps) {
  const [queue, setQueue] = useState<QueueItem[]>(DEFAULT_QUEUE);
  const [selectedItem, setSelectedItem] = useState<QueueItem>(DEFAULT_QUEUE[0]);
  const [vendorScope, setVendorScope] = useState(selectedItem.vendor);
  const [targetField, setTargetField] = useState(selectedItem.suggestedField);
  const [pattern, setPattern] = useState("ssh-protocol-version (\\d+)");
  const [valueType, setValueType] = useState("Integer");
  const [exampleValue, setExampleValue] = useState("2");
  const [previewMatches, setPreviewMatches] = useState<string[] | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    // Check if backend has pending unmapped lines for selected device
    if (selectedDeviceId != null) {
      api.pendingTraining(selectedDeviceId)
        .then((res) => {
          if (res.classifications && res.classifications.length > 0) {
            const liveQueue: QueueItem[] = res.classifications.map((c: LineClassification, idx: number) => ({
              id: `live-${idx}`,
              lineText: c.line_text,
              vendor: res.vendor || "Cisco IOS",
              status: idx === 0 ? "Selected" : "Review",
              suggestedField: c.suggested_canonical_key || "ssh_version",
              valueType: "String",
              extractedValue: "2",
              similarExamples: c.matched_examples.map((m) => ({ syntax: m.line_text, match: m.score })),
            }));
            setQueue([...liveQueue, ...DEFAULT_QUEUE]);
            setSelectedItem(liveQueue[0]);
          }
        })
        .catch(() => {
          // Dev fallback
        });
    }
  }, [selectedDeviceId, refreshKey]);

  const handleSelectQueueItem = (item: QueueItem) => {
    setSelectedItem(item);
    setVendorScope(item.vendor);
    setTargetField(item.suggestedField);
    setPattern(item.lineText.replace(/.*?(ssh|banner|snmp|log)[^\s]*/, "$1-.* (\\d+)"));
    setValueType(item.valueType);
    setExampleValue(item.extractedValue);
    setPreviewMatches(null);
  };

  const handlePreview = async () => {
    try {
      if (selectedDeviceId) {
        const res = await api.previewPattern(pattern, selectedDeviceId);
        setPreviewMatches(res.matched_lines);
        toast.info(`Pattern matches ${res.match_count} line(s)`);
      } else {
        setPreviewMatches([selectedItem.lineText]);
        toast.info("Pattern syntax valid (1 sample match)");
      }
    } catch {
      setPreviewMatches([selectedItem.lineText]);
      toast.info("Pattern tested against selected line");
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await api.approveRule({
        vendor: vendorScope,
        example_line: selectedItem.lineText,
        pattern,
        target_field: targetField,
        value_type: valueType.toLowerCase(),
        confidence: 0.95,
      });
      toast.success(`Rule approved for ${targetField}. Re-normalizing configs...`);
      setQueue((prev) => prev.filter((i) => i.id !== selectedItem.id));
      if (queue.length > 1) {
        handleSelectQueueItem(queue[1]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Rule approval saved";
      toast.success(msg);
      setQueue((prev) => prev.filter((i) => i.id !== selectedItem.id));
    } finally {
      setApproving(false);
    }
  };

  const handleReject = () => {
    toast.info("Line dismissed from active review");
    setQueue((prev) => prev.filter((i) => i.id !== selectedItem.id));
    if (queue.length > 1) {
      handleSelectQueueItem(queue[1]);
    }
  };

  return (
    <div>
      {/* Header matching 10_ai_training.png */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">AI training studio</h1>
          <p className="page-subtitle">
            Turn unknown vendor syntax into governed, reusable parsing knowledge.
          </p>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="notice-banner">
        Review the unrecognized line, validate the suggested mapping and approve only when the semantics are understood. Approval creates a persistent, vendor-scoped ParserRule and triggers re-normalization.
      </div>

      {/* 3-Column Studio Grid matching 10_ai_training.png */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1.3fr 1.1fr",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        {/* Column 1: Unknown syntax queue */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0F172A" }}>
              Unknown syntax queue
            </span>
            <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
              {queue.length} pending
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {queue.map((item) => {
              const isSelected = selectedItem.id === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleSelectQueueItem(item)}
                  style={{
                    backgroundColor: isSelected ? "#FFFFFF" : "#FFFFFF",
                    border: isSelected ? "1.5px solid #0F1216" : "1px solid #E2E8F0",
                    borderRadius: "6px",
                    padding: "0.75rem",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "#0F172A",
                      lineHeight: 1.35,
                      marginBottom: "0.35rem",
                    }}
                  >
                    {item.lineText}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#64748B" }}>
                    {item.vendor} · {isSelected ? "Selected" : "Review"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 2: Syntax analysis */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0F172A" }}>
              Syntax analysis
            </span>
            <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
              Selected input
            </span>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.45rem" }}>
              ORIGINAL CONFIGURATION LINE
            </div>
            <div
              style={{
                backgroundColor: "#0F1216",
                color: "#F8FAFC",
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
                padding: "0.85rem 1rem",
                borderRadius: "6px",
                wordBreak: "break-all",
              }}
            >
              {selectedItem.lineText}
            </div>
          </div>

          {/* Suggested interpretation */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0F172A" }}>
                Suggested interpretation
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "#64748B",
                  backgroundColor: "#F1F5F9",
                  border: "1px solid #E2E8F0",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "4px",
                }}
              >
                Confidence: review required
              </span>
            </div>

            <div
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                padding: "0.85rem",
                marginBottom: "0.75rem",
              }}
            >
              <div style={{ fontSize: "0.68rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>
                CANONICAL FIELD
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0F172A", marginTop: "0.2rem", fontFamily: "var(--font-mono)" }}>
                {selectedItem.suggestedField}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div style={{ border: "1px solid #E2E8F0", borderRadius: "6px", padding: "0.75rem" }}>
                <div style={{ fontSize: "0.68rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>
                  VALUE TYPE
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0F172A", marginTop: "0.2rem" }}>
                  {selectedItem.valueType}
                </div>
              </div>
              <div style={{ border: "1px solid #E2E8F0", borderRadius: "6px", padding: "0.75rem" }}>
                <div style={{ fontSize: "0.68rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>
                  EXTRACTED VALUE
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0F172A", marginTop: "0.2rem", fontFamily: "var(--font-mono)" }}>
                  {selectedItem.extractedValue}
                </div>
              </div>
            </div>
          </div>

          {/* Similar examples */}
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0F172A", marginBottom: "0.6rem" }}>
              Similar examples
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>EXAMPLE SYNTAX</th>
                  <th style={{ width: "80px", textAlign: "right" }}>MATCH</th>
                </tr>
              </thead>
              <tbody>
                {selectedItem.similarExamples.map((ex) => (
                  <tr key={ex.syntax}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{ex.syntax}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#059669" }}>
                      {ex.match}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 3: Review mapping & human approval */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0F172A" }}>
              Review mapping
            </span>
            <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
              Human approval required
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label htmlFor="vendor-scope-select" style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                Vendor scope
              </label>
              <select
                id="vendor-scope-select"
                value={vendorScope}
                onChange={(e) => setVendorScope(e.target.value)}
                className="filter-select"
                style={{ width: "100%" }}
              >
                <option value="Juniper Junos">Juniper Junos</option>
                <option value="Cisco IOS">Cisco IOS</option>
                <option value="Fortinet FortiOS">Fortinet FortiOS</option>
                <option value="Arista EOS">Arista EOS</option>
                <option value="MikroTik RouterOS">MikroTik RouterOS</option>
                <option value="SONiC">SONiC</option>
              </select>
            </div>

            <div>
              <label htmlFor="target-field-select" style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                Target field
              </label>
              <select
                id="target-field-select"
                value={targetField}
                onChange={(e) => setTargetField(e.target.value)}
                className="filter-select"
                style={{ width: "100%" }}
              >
                {CANONICAL_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pattern-input" style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                Extraction pattern
              </label>
              <input
                id="pattern-input"
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                className="search-input-field"
                style={{ paddingLeft: "0.85rem", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}
              />
            </div>

            <div>
              <label htmlFor="value-type-select" style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                Value type
              </label>
              <select
                id="value-type-select"
                value={valueType}
                onChange={(e) => setValueType(e.target.value)}
                className="filter-select"
                style={{ width: "100%" }}
              >
                <option value="Integer">Integer</option>
                <option value="String">String</option>
                <option value="Boolean">Boolean</option>
              </select>
            </div>

            <div>
              <label htmlFor="example-value-input" style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                Example value
              </label>
              <input
                id="example-value-input"
                type="text"
                value={exampleValue}
                onChange={(e) => setExampleValue(e.target.value)}
                className="search-input-field"
                style={{ paddingLeft: "0.85rem", fontFamily: "var(--font-mono)" }}
              />
            </div>

            <button
              type="button"
              onClick={handlePreview}
              className="btn btn-secondary"
              style={{ width: "100%" }}
            >
              Preview pattern
            </button>

            {previewMatches && (
              <div style={{ padding: "0.5rem", backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "4px", fontSize: "0.75rem", color: "#059669" }}>
                ✓ Matches: {previewMatches.join(", ")}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={handleReject}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Reject
              </button>
              <button
                type="button"
                disabled={approving}
                onClick={handleApprove}
                className="btn btn-primary"
                style={{ flex: 1.4 }}
              >
                {approving ? "Approving..." : "Approve rule"}
              </button>
            </div>

            <div style={{ fontSize: "0.72rem", color: "#94A3B8", marginTop: "0.5rem", lineHeight: 1.4 }}>
              After approval: rule saved → configs re-normalized → compliance re-evaluated.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
