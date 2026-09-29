import { useState } from "react";
import { api, KNOWN_VENDORS } from "../api";
import { SAMPLE_CONFIGS, sampleAsFile } from "../samples";
import { toast } from "../toast";

interface BulkItem {
  file: File;
  vendor: string;
  deviceId: string;
}

export function UploadPage({ onUploaded }: { onUploaded: () => void }) {
  const [mode, setMode] = useState<"single" | "bulk">("single");

  // single-mode state
  const [file, setFile] = useState<File | null>(null);
  const [vendor, setVendor] = useState<string>(KNOWN_VENDORS[0]);
  const [customVendor, setCustomVendor] = useState("");
  const [deviceId, setDeviceId] = useState("");

  // bulk-mode state
  const [items, setItems] = useState<BulkItem[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const effectiveVendor = vendor === "__other__" ? customVendor.trim() : vendor;

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
      vendor: KNOWN_VENDORS[0],
      deviceId: f.name.replace(/\.[^.]+$/, ""),
    }));
    setItems((prev) => [...prev, ...additions]);
  }

  async function submitSingle() {
    if (!file || !effectiveVendor || !deviceId) {
      setError("File, vendor and device ID are all required.");
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
      toast(`Ingested ${results.length} device(s) in this batch.`, "success");
      setItems([]);
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Ingest configuration files</h1>
        <p>
          Upload a single device config or a bulk batch from any vendor. Recognized vendors are
          parsed immediately; unrecognized syntax is routed to the AI Training tab instead of
          being rejected.
        </p>
      </div>

      {!file && items.length === 0 && (
        <div className="card">
          <h3>No configs on hand? Try the bundled samples</h3>
          <p className="card-sub">
            Synthetic, safe sample configs — one hardened, one that needs work, and one from an
            unrecognized "whitebox" vendor to demo the AI training loop.
          </p>
          <div className="chip-row">
            {SAMPLE_CONFIGS.map((s, i) => (
              <span key={s.filename} className="chip" onClick={() => loadSample(i)}>
                {s.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="subtabs">
        <button className={mode === "single" ? "active" : ""} onClick={() => setMode("single")}>
          Single file
        </button>
        <button className={mode === "bulk" ? "active" : ""} onClick={() => setMode("bulk")}>
          Bulk batch
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {mode === "single" ? (
        <div className="card">
          <h3>Device config</h3>
          <label
            className={`dropzone${dragging ? " dragover" : ""}`}
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
          >
            {file ? (
              <span>
                <strong>{file.name}</strong> selected — click to change
              </span>
            ) : (
              <span>Drag a config file here, or click to browse</span>
            )}
            <input
              type="file"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="row" style={{ marginTop: "var(--space-4)" }}>
            <div className="field">
              <label>Device ID</label>
              <input
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="e.g. core-sw-01"
              />
            </div>
            <div className="field">
              <label>Vendor — click to pick</label>
              <div className="chip-row">
                {KNOWN_VENDORS.map((v) => (
                  <span
                    key={v}
                    className={`chip${vendor === v ? " selected" : ""}`}
                    onClick={() => setVendor(v)}
                  >
                    {v}
                  </span>
                ))}
                <span
                  className={`chip chip-input${vendor === "__other__" ? " filled" : ""}`}
                  onClick={() => setVendor("__other__")}
                >
                  {vendor === "__other__" ? (
                    <input
                      autoFocus
                      value={customVendor}
                      placeholder="unknown vendor…"
                      onChange={(e) => setCustomVendor(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    "Other / unknown…"
                  )}
                </span>
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ marginTop: "var(--space-4)" }}
            disabled={busy}
            onClick={submitSingle}
          >
            {busy ? <span className="spinner" /> : "Ingest config"}
          </button>
        </div>
      ) : (
        <div className="card">
          <h3>Bulk batch</h3>
          <label
            className={`dropzone${dragging ? " dragover" : ""}`}
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
          >
            <span>Drag multiple config files here, or click to browse</span>
            <input type="file" multiple hidden onChange={(e) => addBulkFiles(e.target.files)} />
          </label>

          {items.length > 0 && (
            <div className="file-list">
              {items.map((item, idx) => (
                <div className="file-item" key={idx}>
                  <span className="name">{item.file.name}</span>
                  <input
                    className="device-id"
                    value={item.deviceId}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, deviceId: e.target.value } : it)),
                      )
                    }
                  />
                  <select
                    value={item.vendor}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, vendor: e.target.value } : it)),
                      )
                    }
                  >
                    {KNOWN_VENDORS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                    <option value="unknown_vendor">unknown_vendor</option>
                  </select>
                  <button
                    className="icon-btn danger"
                    title="Remove"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: "var(--space-4)" }}>
            <button className="btn btn-primary" disabled={busy} onClick={submitBulk}>
              {busy ? <span className="spinner" /> : `Ingest ${items.length || ""} device(s)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
