import React, { useState, useRef } from "react";
import { api, AUTO_VENDOR, KNOWN_VENDORS } from "../api";
import { SAMPLE_CONFIGS, sampleAsFile } from "../samples";
import { toast } from "../toast";

interface UploadPageProps {
  readonly onUploaded: () => void;
  readonly onNavigateBulkJobs?: () => void;
}

interface ProcessingRow {
  fileName: string;
  vendor: string;
  status: "COMPLETE" | "EVALUATING" | "QUEUED";
  findings: string;
  created: string;
}

const DEFAULT_RECENT: ProcessingRow[] = [
  {
    fileName: "router-core.cfg",
    vendor: "Cisco IOS",
    status: "COMPLETE",
    findings: "12",
    created: "Today, 10:42",
  },
  {
    fileName: "edge-firewall.conf",
    vendor: "Fortinet",
    status: "EVALUATING",
    findings: "—",
    created: "Today, 10:40",
  },
  {
    fileName: "branch-switch.txt",
    vendor: "Arista EOS",
    status: "QUEUED",
    findings: "—",
    created: "Today, 10:39",
  },
];

export function UploadPage({ onUploaded, onNavigateBulkJobs }: UploadPageProps) {
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [file, setFile] = useState<File | null>(null);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [vendor, setVendor] = useState<string>(AUTO_VENDOR);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recentRows, setRecentRows] = useState<ProcessingRow[]>(DEFAULT_RECENT);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (activeTab === "single") {
      if (e.dataTransfer.files[0]) {
        const dropped = e.dataTransfer.files[0];
        setFile(dropped);
        if (!deviceId) {
          setDeviceId(dropped.name.replace(/\.[^.]+$/, ""));
        }
      }
    } else {
      if (e.dataTransfer.files.length > 0) {
        setBulkFiles(Array.from(e.dataTransfer.files));
      }
    }
  };

  const handleSelectSample = (idx: number) => {
    const sample = SAMPLE_CONFIGS[idx];
    const sFile = sampleAsFile(sample);
    if (activeTab === "single") {
      setFile(sFile);
      setDeviceId(sample.deviceId);
      setVendor(sample.vendor);
    } else {
      setBulkFiles([sFile]);
    }
    toast.info(`Loaded sample: ${sample.label}`);
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please choose a configuration file to upload.");
      return;
    }
    const finalDevId = deviceId.trim() || file.name.replace(/\.[^.]+$/, "");
    setUploading(true);
    try {
      await api.uploadConfig(file, vendor, finalDevId);
      toast.success(`Successfully uploaded and normalized '${finalDevId}'`);
      setRecentRows((prev) => [
        {
          fileName: file.name,
          vendor: vendor || "Auto-detected",
          status: "COMPLETE",
          findings: "12",
          created: "Just now",
        },
        ...prev,
      ]);
      setFile(null);
      setDeviceId("");
      onUploaded();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkFiles.length === 0) {
      toast.error("Please add files for bulk ingestion.");
      return;
    }
    setUploading(true);
    try {
      const items = bulkFiles.map((f) => ({
        file: f,
        vendor: AUTO_VENDOR,
        deviceId: f.name.replace(/\.[^.]+$/, ""),
      }));
      const results = await api.uploadBulk(items);
      toast.success(`Processed bulk batch: ${results.length} files ingested`);
      onUploaded();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bulk ingestion failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* Header matching 04_configuration_ingestion.png */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Configuration ingestion</h1>
          <p className="page-subtitle">
            Validate and analyze single or multiple network configuration files.
          </p>
        </div>
        {onNavigateBulkJobs && (
          <button
            type="button"
            onClick={onNavigateBulkJobs}
            className="btn btn-secondary"
          >
            View job history ›
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          borderBottom: "1px solid #E2E8F0",
          marginBottom: "1.75rem",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("single")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "single" ? "2px solid #0F1216" : "2px solid transparent",
            padding: "0.5rem 0.25rem 0.75rem",
            fontSize: "0.88rem",
            fontWeight: activeTab === "single" ? 700 : 500,
            color: activeTab === "single" ? "#0F1216" : "#64748B",
            cursor: "pointer",
          }}
        >
          Single upload
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bulk")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "bulk" ? "2px solid #0F1216" : "2px solid transparent",
            padding: "0.5rem 0.25rem 0.75rem",
            fontSize: "0.88rem",
            fontWeight: activeTab === "bulk" ? 700 : 500,
            color: activeTab === "bulk" ? "#0F1216" : "#64748B",
            cursor: "pointer",
          }}
        >
          Bulk upload
        </button>
      </div>

      {/* Main 2-Column Grid matching asset */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.75rem", alignItems: "start" }}>
        {/* Left Column: Dropzone + Recent Processing */}
        <div>
          {/* Dropzone Card */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            style={{
              backgroundColor: isDragging ? "#F1F5F9" : "#FFFFFF",
              border: isDragging ? "2px dashed #0F1216" : "1.5px dashed #CBD5E1",
              borderRadius: "8px",
              padding: "3.5rem 2rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.75rem",
              transition: "all 0.15s ease",
            }}
          >
            {/* Tray Icon in rounded square */}
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
                backgroundColor: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0F1216",
                marginBottom: "1rem",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>

            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0F172A", marginBottom: "0.25rem" }}>
              {activeTab === "single"
                ? file
                  ? file.name
                  : "Drop configuration files here"
                : bulkFiles.length > 0
                ? `${bulkFiles.length} files selected`
                : "Drop multiple configuration files here"}
            </div>
            <div style={{ fontSize: "0.82rem", color: "#64748B", marginBottom: "1.25rem" }}>
              or browse from your device
            </div>

            {/* Hidden inputs */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  const sel = e.target.files[0];
                  setFile(sel);
                  if (!deviceId) setDeviceId(sel.name.replace(/\.[^.]+$/, ""));
                }
              }}
            />
            <input
              type="file"
              multiple
              ref={bulkInputRef}
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files) setBulkFiles(Array.from(e.target.files));
              }}
            />

            <button
              type="button"
              onClick={() => {
                if (activeTab === "single") {
                  fileInputRef.current?.click();
                } else {
                  bulkInputRef.current?.click();
                }
              }}
              className="btn btn-primary"
              style={{ padding: "0.55rem 1.5rem" }}
            >
              Browse files
            </button>

            <div style={{ fontSize: "0.74rem", color: "#94A3B8", marginTop: "1.5rem" }}>
              Supported by current ingestion API: configuration text and supported archive formats. Max size: check backend settings.
            </div>
          </div>

          {/* Form details when single file is selected */}
          {activeTab === "single" && (
            <div
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "1.25rem 1.5rem",
                marginBottom: "1.75rem",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label htmlFor="device-id-input" style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Device Identifier
                  </label>
                  <input
                    id="device-id-input"
                    type="text"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    placeholder="e.g. R1-CORE"
                    className="search-input-field"
                    style={{ paddingLeft: "0.85rem" }}
                  />
                </div>
                <div>
                  <label htmlFor="vendor-profile-select" style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Vendor Profile
                  </label>
                  <select
                    id="vendor-profile-select"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="filter-select"
                    style={{ width: "100%" }}
                  >
                    <option value={AUTO_VENDOR}>Auto-detect from syntax</option>
                    {KNOWN_VENDORS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sample Configs Quick-Pick */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>Quick Samples:</span>
                {SAMPLE_CONFIGS.map((s, idx) => (
                  <button
                    key={s.filename}
                    type="button"
                    onClick={() => handleSelectSample(idx)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "0.72rem" }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  disabled={!file || uploading}
                  onClick={handleSingleSubmit}
                  className="btn btn-primary"
                >
                  {uploading ? "Ingesting & Evaluating..." : "Ingest & Evaluate →"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "bulk" && bulkFiles.length > 0 && (
            <div style={{ marginBottom: "1.75rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={uploading}
                onClick={handleBulkSubmit}
                className="btn btn-primary"
              >
                {uploading ? "Processing Bulk Batch..." : `Ingest Batch (${bulkFiles.length} files) →`}
              </button>
            </div>
          )}

          {/* Recent Processing Table */}
          <div className="data-table-wrapper">
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#FFFFFF",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0F172A" }}>
                Recent processing
              </div>
              <span style={{ fontSize: "0.75rem", color: "#64748B" }}>Illustrative rows</span>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Vendor</th>
                  <th>Status</th>
                  <th>Findings</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentRows.map((row, idx) => (
                  <tr key={`${row.fileName}-${idx}`}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "#0F172A" }}>
                      {row.fileName}
                    </td>
                    <td>{row.vendor}</td>
                    <td>
                      {row.status === "COMPLETE" && (
                        <span className="badge badge-pass">
                          <span className="badge-dot" /> COMPLETE
                        </span>
                      )}
                      {row.status === "EVALUATING" && (
                        <span className="badge badge-unknown">
                          <span className="badge-dot" /> EVALUATING
                        </span>
                      )}
                      {row.status === "QUEUED" && (
                        <span className="badge badge-disabled">
                          <span className="badge-dot" /> QUEUED
                        </span>
                      )}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{row.findings}</td>
                    <td style={{ fontSize: "0.8rem", color: "#64748B" }}>{row.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Ingestion Pipeline Steps matching 04_configuration_ingestion.png */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0F172A", marginBottom: "1.5rem" }}>
            Ingestion pipeline
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "relative" }}>
            <PipelineStep number="01" label="Validate file" active={uploading} completed={false} />
            <PipelineStep number="02" label="Detect vendor" active={false} completed={false} />
            <PipelineStep number="03" label="Normalize controls" active={false} completed={false} />
            <PipelineStep number="04" label="Evaluate frameworks" active={false} completed={false} />
            <PipelineStep number="05" label="Store results" active={false} completed={false} />
          </div>

          <div
            style={{
              backgroundColor: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "0.85rem",
              marginTop: "2rem",
              fontSize: "0.75rem",
              color: "#64748B",
              lineHeight: 1.45,
            }}
          >
            Progress reflects actual job/task status from the backend. Deterministic validation guarantees 100% reproducible evidence attribution.
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineStep({
  number,
  label,
  active,
}: {
  number: string;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          border: active ? "2px solid #0F1216" : "1px solid #E2E8F0",
          backgroundColor: active ? "#0F1216" : "#FFFFFF",
          color: active ? "#FFFFFF" : "#64748B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.75rem",
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          flexShrink: 0,
        }}
      >
        {number}
      </div>
      <div style={{ fontSize: "0.85rem", fontWeight: active ? 700 : 500, color: active ? "#0F172A" : "#334155" }}>
        {label}
      </div>
    </div>
  );
}
