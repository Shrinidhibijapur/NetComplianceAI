import { useState } from "react";
import { api, AUTO_VENDOR, KNOWN_VENDORS } from "../api";
import { SAMPLE_CONFIGS, sampleAsFile } from "../samples";
import { toast } from "../toast";
import { PageHeader } from "./common/PageHeader";
import { TechnicalValue } from "./common/TechnicalValue";

interface BulkItem {
  file: File;
  vendor: string;
  deviceId: string;
}

export function UploadPage({ onUploaded }: { readonly onUploaded: () => void }) {
  const [mode, setMode] = useState<"single" | "bulk">("single");

  // single-mode state
  const [file, setFile] = useState<File | null>(null);
  const [vendor, setVendor] = useState<string>(AUTO_VENDOR);
  const [customVendor, setCustomVendor] = useState("");
  const [deviceId, setDeviceId] = useState("");

  // bulk-mode state
  const [items, setItems] = useState<BulkItem[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const effectiveVendor = vendor === "__other__" ? customVendor.trim() : vendor; // "" = auto-detect

  function loadSample(index: number) {
    const sample = SAMPLE_CONFIGS[index];
    if (mode === "single") {
      setFile(sampleAsFile(sample));
      setDeviceId(sample.deviceId);
      if ((KNOWN_VENDORS as readonly string[]).includes(sample.vendor)) {
        setVendor(sample.vendor);
      } else {
        setVendor("__other__");
        setCustomVendor(sample.vendor);
      }
    } else {
      setItems((prev) => [
        ...prev,
        { file: sampleAsFile(sample), vendor: sample.vendor, deviceId: sample.deviceId },
      ]);
    }
  }

  function addBulkFiles(fileList: FileList | null) {
    if (!fileList) return;
    const additions: BulkItem[] = Array.from(fileList).map((f) => ({
      file: f,
      vendor: AUTO_VENDOR,
      deviceId: f.name.replace(/\.[^.]+$/, ""),
    }));
    setItems((prev) => [...prev, ...additions]);
  }

  async function submitSingle() {
    if (!file || !deviceId || (vendor === "__other__" && !effectiveVendor)) {
      setError("File and device ID are required (and a name if you chose Other).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api.uploadConfig(file, effectiveVendor, deviceId);
      toast(
        `Ingested ${result.device_id} — parse confidence ${Math.round(result.parse_confidence * 100)}%, ${result.raw_unmapped_lines.length} unmapped line(s).`,
        "success",
      );
      setFile(null);
      setDeviceId("");
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitBulk() {
    if (items.length === 0) {
      setError("Add at least one file to the bulk batch.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const results = await api.uploadBulk(
        items.map((i) => ({ file: i.file, vendor: i.vendor, deviceId: i.deviceId })),
      );
      const failed = results.filter((r) => r.status === "error");
      const ok = results.length - failed.length;
      if (failed.length === 0) {
        toast(`Ingested ${ok} device(s) in this batch.`, "success");
        setItems([]);
      } else {
        toast(`Ingested ${ok} device(s); ${failed.length} failed.`, "error");
        setError(failed.map((r) => `${r.filename}: ${r.error}`).join(" | "));
        setItems((prev) => prev.filter((i) => failed.some((f) => f.filename === i.file.name && f.device_id === i.deviceId)));
      }
      if (ok > 0) onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Configuration Ingestion"
        description="Upload raw network configuration exports for automatic vendor identification, baseline normalization, compliance auditing, and AI parsing."
      />

      {/* Bundled Samples Chip Section */}
      {!file && items.length === 0 && <SampleSection loadSample={loadSample} />}

      {/* Mode Selector Tabs */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          className={`btn ${mode === "single" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setMode("single")}
        >
          Single File Upload
        </button>
        <button
          type="button"
          className={`btn ${mode === "bulk" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setMode("bulk")}
        >
          Bulk Fleet Ingestion
        </button>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "var(--severity-high-bg)",
            border: "1px solid rgba(239,68,68,0.4)",
            color: "var(--severity-high)",
            padding: "0.85rem 1.25rem",
            borderRadius: "var(--radius-md)",
            fontSize: "0.9rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {mode === "single" ? (
        <SingleUploadCard
          file={file}
          setFile={setFile}
          deviceId={deviceId}
          setDeviceId={setDeviceId}
          vendor={vendor}
          setVendor={setVendor}
          customVendor={customVendor}
          setCustomVendor={setCustomVendor}
          dragging={dragging}
          setDragging={setDragging}
          busy={busy}
          submitSingle={submitSingle}
        />
      ) : (
        <BulkUploadCard
          items={items}
          setItems={setItems}
          addBulkFiles={addBulkFiles}
          dragging={dragging}
          setDragging={setDragging}
          busy={busy}
          submitBulk={submitBulk}
        />
      )}
    </div>
  );
}

function SampleSection({ loadSample }: { readonly loadSample: (index: number) => void }) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "1.25rem",
      }}
    >
      <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
        No configs on hand? Load Bundled Samples
      </h3>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
        Synthetic sample configs — hardened Cisco IOS, work-needed Juniper JunOS, and unrecognized whitebox syntax.
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {SAMPLE_CONFIGS.map((s, i) => (
          <button
            type="button"
            key={s.filename}
            className="btn btn-secondary btn-sm"
            onClick={() => loadSample(i)}
          >
            ⚡ {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SingleUploadCard({
  file,
  setFile,
  deviceId,
  setDeviceId,
  vendor,
  setVendor,
  customVendor,
  setCustomVendor,
  dragging,
  setDragging,
  busy,
  submitSingle,
}: {
  readonly file: File | null;
  readonly setFile: (f: File | null) => void;
  readonly deviceId: string;
  readonly setDeviceId: (id: string) => void;
  readonly vendor: string;
  readonly setVendor: (v: string) => void;
  readonly customVendor: string;
  readonly setCustomVendor: (cv: string) => void;
  readonly dragging: boolean;
  readonly setDragging: (d: boolean) => void;
  readonly busy: boolean;
  readonly submitSingle: () => void;
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-medium)",
        borderRadius: "var(--radius-md)",
        padding: "1.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>Single Device Export</h3>

      {/* Drag & Drop Area */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
        }}
        style={{
          border: dragging ? "2px dashed var(--accent-primary)" : "2px dashed var(--border-medium)",
          backgroundColor: dragging ? "var(--accent-dim)" : "var(--bg-elevated)",
          borderRadius: "var(--radius-md)",
          padding: "3rem 2rem",
          textAlign: "center",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.5rem",
          transition: "all 0.15s ease",
        }}
      >
        <div style={{ fontSize: "2rem", color: "var(--accent-primary)" }}>⇪</div>
        {file ? (
          <div>
            <strong style={{ color: "var(--text-primary)" }}>{file.name}</strong> ({Math.round(file.size / 1024)} KB) selected
          </div>
        ) : (
          <div>
            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
              Drag and drop network configuration file here
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Supports Cisco, Juniper, Arista, Fortinet, RouterOS, SONiC, AWS SG, or custom text files
            </div>
          </div>
        )}
        <input type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>

      {/* Device ID and Vendor Options */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.25rem" }}>
        <div>
          <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "0.35rem" }}>
            Device Identifier:
          </label>
          <input
            id="upload-device-id"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="e.g. core-switch-01"
            style={{
              width: "100%",
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-medium)",
              color: "var(--text-primary)",
              padding: "0.5rem 0.75rem",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono)",
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "0.35rem" }}>
            Vendor Profile (Optional Override):
          </label>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${vendor === AUTO_VENDOR ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setVendor(AUTO_VENDOR)}
            >
              Auto-detect
            </button>
            {KNOWN_VENDORS.map((v) => (
              <button
                type="button"
                key={v}
                className={`btn btn-sm ${vendor === v ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setVendor(v)}
              >
                {v}
              </button>
            ))}
            {vendor === "__other__" ? (
              <input
                value={customVendor}
                placeholder="vendor name..."
                onChange={(e) => setCustomVendor(e.target.value)}
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--accent-primary)",
                  color: "var(--text-primary)",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-mono)",
                }}
              />
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setVendor("__other__")}
              >
                Other...
              </button>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        disabled={busy}
        onClick={submitSingle}
        style={{ marginTop: "0.5rem" }}
      >
        {busy ? "Ingesting Configuration..." : "Ingest Configuration →"}
      </button>
    </div>
  );
}

function BulkUploadCard({
  items,
  setItems,
  addBulkFiles,
  dragging,
  setDragging,
  busy,
  submitBulk,
}: {
  readonly items: BulkItem[];
  readonly setItems: React.Dispatch<React.SetStateAction<BulkItem[]>>;
  readonly addBulkFiles: (files: FileList | null) => void;
  readonly dragging: boolean;
  readonly setDragging: (d: boolean) => void;
  readonly busy: boolean;
  readonly submitBulk: () => void;
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-medium)",
        borderRadius: "var(--radius-md)",
        padding: "1.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>Bulk Fleet Ingestion Batch</h3>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addBulkFiles(e.dataTransfer.files);
        }}
        style={{
          border: dragging ? "2px dashed var(--accent-primary)" : "2px dashed var(--border-medium)",
          backgroundColor: dragging ? "var(--accent-dim)" : "var(--bg-elevated)",
          borderRadius: "var(--radius-md)",
          padding: "2.5rem 2rem",
          textAlign: "center",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <div style={{ fontSize: "1.75rem", color: "var(--accent-primary)" }}>⇪</div>
        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
          Drag multiple configuration files here to ingest a fleet batch
        </div>
        <input type="file" multiple hidden onChange={(e) => addBulkFiles(e.target.files)} />
      </label>

      {items.length > 0 && (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Device ID</th>
                <th>Vendor Profile</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={`${item.file.name}-${idx}`}>
                  <td>
                    <TechnicalValue value={item.file.name} />
                  </td>
                  <td>
                    <input
                      value={item.deviceId}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, deviceId: e.target.value } : it)),
                        )
                      }
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--border-medium)",
                        color: "var(--text-primary)",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "var(--radius-sm)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.85rem",
                      }}
                    />
                  </td>
                  <td>
                    <select
                      value={item.vendor}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, vendor: e.target.value } : it)),
                        )
                      }
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--border-medium)",
                        color: "var(--text-primary)",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.85rem",
                      }}
                    >
                      <option value={AUTO_VENDOR}>Auto-detect</option>
                      {KNOWN_VENDORS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                      <option value="unknown_vendor">unknown_vendor</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={submitBulk}>
          {busy ? "Processing Batch..." : `Ingest Batch (${items.length} Files) →`}
        </button>
      </div>
    </div>
  );
}
