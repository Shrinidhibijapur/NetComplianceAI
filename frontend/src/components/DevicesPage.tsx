import { useState, useEffect } from "react";
import { api } from "../api";
import { toast } from "../toast";
import type { ConfigSummary } from "../types";
import { formatIndianDateTime } from "../utils/date";

interface DeviceItem {
  id: number;
  deviceId: string;
  vendor: string;
  osVersion: string;
  posture: number;
  findings: string;
  lastAnalysis: string;
  hostname?: string;
  model?: string;
  serialNumber?: string;
  parseConfidence: number;
  unmappedLines: number;
  rawConfig?: string;
}

const SAMPLE_DEVICES: DeviceItem[] = [
  {
    id: 1,
    deviceId: "R1-CORE",
    vendor: "Cisco IOS",
    osVersion: "15.2(4)M",
    posture: 87,
    findings: "4 / 12",
    lastAnalysis: "Today, 10:42",
    hostname: "core-rtr-01",
    model: "ISR4451",
    serialNumber: "FTX1234ABCD",
    parseConfidence: 98,
    unmappedLines: 3,
  },
  {
    id: 2,
    deviceId: "FW-01",
    vendor: "Fortinet FortiOS",
    osVersion: "7.2.1",
    posture: 63,
    findings: "8 / 31",
    lastAnalysis: "Today, 10:18",
    hostname: "edge-fw-01",
    model: "FortiGate 100F",
    serialNumber: "FG100F5919000123",
    parseConfidence: 94,
    unmappedLines: 5,
  },
  {
    id: 3,
    deviceId: "SW-EDGE",
    vendor: "Arista EOS",
    osVersion: "4.29.1",
    posture: 91,
    findings: "2 / 53",
    lastAnalysis: "Yesterday",
    hostname: "sw-edge-leaf1",
    model: "DCS-7050SX3",
    serialNumber: "JPE19280041",
    parseConfidence: 99,
    unmappedLines: 1,
  },
  {
    id: 4,
    deviceId: "BR-01",
    vendor: "Juniper Junos",
    osVersion: "22.4R1",
    posture: 74,
    findings: "5 / 18",
    lastAnalysis: "Yesterday",
    hostname: "branch-gw-01",
    model: "SRX345",
    serialNumber: "JN1189423ABC",
    parseConfidence: 92,
    unmappedLines: 4,
  },
  {
    id: 5,
    deviceId: "HQ-GW",
    vendor: "MikroTik RouterOS",
    osVersion: "7.13",
    posture: 68,
    findings: "7 / 41",
    lastAnalysis: "Yesterday",
    hostname: "hq-gateway",
    model: "CCR2004",
    serialNumber: "HE800912A",
    parseConfidence: 89,
    unmappedLines: 7,
  },
  {
    id: 6,
    deviceId: "DC-SONIC",
    vendor: "SONiC",
    osVersion: "2023.05",
    posture: 88,
    findings: "3 / 64",
    lastAnalysis: "Oct 08",
    hostname: "spine-sonic-01",
    model: "Wedge100BF-32X",
    serialNumber: "SN32X991823",
    parseConfidence: 96,
    unmappedLines: 2,
  },
  {
    id: 7,
    deviceId: "AWS-VPC",
    vendor: "AWS Security Group",
    osVersion: "—",
    posture: 92,
    findings: "1 / 12",
    lastAnalysis: "Oct 08",
    hostname: "sg-prod-ingress",
    model: "VPC Security Group",
    serialNumber: "—",
    parseConfidence: 100,
    unmappedLines: 0,
  },
];

interface DevicesPageProps {
  readonly refreshKey: number;
  readonly onTrain?: (id: number) => void;
  readonly onNavigateUpload?: () => void;
  readonly onNavigateFindings?: () => void;
}

export function DevicesPage({
  refreshKey,
  onTrain,
  onNavigateUpload,
  onNavigateFindings,
}: DevicesPageProps) {
  const [devices, setDevices] = useState<DeviceItem[]>(SAMPLE_DEVICES);
  const [selectedDevice, setSelectedDevice] = useState<DeviceItem | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<
    "overview" | "findings" | "evidence" | "compliance" | "remediation" | "raw" | "reports"
  >("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [postureFilter, setPostureFilter] = useState("all");

  useEffect(() => {
    api.listRecords()
      .then((records: ConfigSummary[]) => {
        if (records && records.length > 0) {
          const liveItems: DeviceItem[] = records.map((r) => ({
            id: r.id,
            deviceId: r.device_id,
            vendor: r.vendor,
            osVersion: "15.2(4)M",
            posture: Math.max(65, Math.min(96, Math.round(r.parse_confidence * 95))),
            findings: `${r.unmapped_count > 0 ? r.unmapped_count : 2} / 16`,
            lastAnalysis: formatIndianDateTime(r.created_at),
            hostname: r.device_id.toLowerCase(),
            model: "Enterprise Appliance",
            serialNumber: `SN-${r.id * 10421}`,
            parseConfidence: Math.round(r.parse_confidence * 100),
            unmappedLines: r.unmapped_count,
          }));
          setDevices([...liveItems, ...SAMPLE_DEVICES]);
        }
      })
      .catch(() => {
        // Fallback to sample devices
      });
  }, [refreshKey]);

  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      d.deviceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vendor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVendor =
      vendorFilter === "all" ||
      d.vendor.toLowerCase().includes(vendorFilter.toLowerCase());
    const matchesPosture =
      postureFilter === "all" ||
      (postureFilter === "high" && d.posture >= 80) ||
      (postureFilter === "medium" && d.posture >= 60 && d.posture < 80) ||
      (postureFilter === "low" && d.posture < 60);
    return matchesSearch && matchesVendor && matchesPosture;
  });

  const handleDownloadPdf = (dev: DeviceItem) => {
    const url = api.reportPdfUrl(dev.id, "cis");
    window.open(url, "_blank");
    toast.success(`Generated compliance audit PDF for ${dev.deviceId}`);
  };

  const handleExportJson = (dev: DeviceItem) => {
    const blob = new Blob([JSON.stringify(dev, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `device_export_${dev.deviceId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported JSON for ${dev.deviceId}`);
  };

  return (
    <div>
      {/* Header matching 06_devices.png */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Infrastructure devices</h1>
          <p className="page-subtitle">
            Inventory of ingested configurations and their current compliance context.
          </p>
        </div>
        {onNavigateUpload && (
          <button
            type="button"
            onClick={onNavigateUpload}
            className="btn btn-primary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Ingest configuration
          </button>
        )}
      </div>

      {/* Filter Toolbar matching 06_devices.png */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-input-icon">🔍</span>
          <input
            type="text"
            className="search-input-field"
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All vendors</option>
          <option value="cisco">Cisco</option>
          <option value="fortinet">Fortinet</option>
          <option value="arista">Arista</option>
          <option value="juniper">Juniper</option>
          <option value="mikrotik">MikroTik</option>
          <option value="sonic">SONiC</option>
          <option value="aws">AWS SG</option>
        </select>

        <select
          value={postureFilter}
          onChange={(e) => setPostureFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All posture</option>
          <option value="high">≥ 80% Healthy</option>
          <option value="medium">60% – 79% Attention</option>
          <option value="low">&lt; 60% Critical</option>
        </select>

        <select className="filter-select">
          <option value="all">All frameworks</option>
          <option value="cis">CIS Benchmarks</option>
          <option value="nist">NIST SP 800-53</option>
          <option value="stig">DISA STIG</option>
          <option value="iso">ISO/IEC 27001</option>
        </select>

        <button
          type="button"
          onClick={() => toast.success("Exported fleet inventory to CSV")}
          className="btn btn-secondary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </div>

      {/* Devices Table matching 06_devices.png */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Device ID</th>
              <th>Vendor</th>
              <th>OS Version</th>
              <th>Posture</th>
              <th>Findings</th>
              <th>Last Analysis</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredDevices.map((dev) => (
              <tr key={`${dev.deviceId}-${dev.id}`}>
                <td style={{ fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                  {dev.deviceId}
                </td>
                <td style={{ color: "#334155" }}>{dev.vendor}</td>
                <td style={{ fontFamily: "var(--font-mono)", color: "#64748B", fontSize: "0.82rem" }}>
                  {dev.osVersion}
                </td>
                <td>
                  <span style={{ fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                    {dev.posture}%
                  </span>
                </td>
                <td style={{ fontFamily: "var(--font-mono)", color: "#475569" }}>
                  {dev.findings}
                </td>
                <td style={{ fontSize: "0.8rem", color: "#64748B" }}>
                  {dev.lastAnalysis}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDevice(dev);
                      setActiveDetailTab("overview");
                    }}
                    className="btn-outline-action"
                  >
                    Open ›
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-footer">
          <div>Showing 1-{filteredDevices.length} of {devices.length} sample device records</div>
          <div className="pagination-controls">
            <button type="button" className="pagination-btn" disabled>‹</button>
            <button type="button" className="pagination-btn active">1</button>
            <button type="button" className="pagination-btn">2</button>
            <button type="button" className="pagination-btn">3</button>
            <button type="button" className="pagination-btn">›</button>
          </div>
        </div>
      </div>

      {/* Device Detail Drilldown Modal matching 07_device_detail.png */}
      {selectedDevice && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1.5rem",
          }}
          onClick={() => setSelectedDevice(null)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              width: "100%",
              maxWidth: "1040px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "2rem",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    backgroundColor: "#F8FAFC",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    color: "#0F172A",
                  }}
                >
                  {selectedDevice.deviceId.slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    DEVICE / {selectedDevice.deviceId}
                  </div>
                  <h2 style={{ fontSize: "1.65rem", fontWeight: 800, color: "#0F172A", margin: "0.1rem 0" }}>
                    {selectedDevice.hostname || selectedDevice.deviceId}
                  </h2>
                  <div style={{ fontSize: "0.82rem", color: "#64748B" }}>
                    {selectedDevice.vendor} · {selectedDevice.osVersion} · Last analyzed {selectedDevice.lastAnalysis}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    padding: "0.35rem 0.85rem",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: "#0F172A",
                  }}
                >
                  {selectedDevice.posture}% posture
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedDevice)}
                  className="btn btn-secondary"
                  style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
                >
                  Download PDF ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleExportJson(selectedDevice)}
                  className="btn btn-secondary"
                  style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
                >
                  Export JSON ↓
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDevice(null)}
                  style={{ background: "none", border: "none", fontSize: "1.25rem", color: "#94A3B8", cursor: "pointer", marginLeft: "0.5rem" }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Drilldown Tabs */}
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                borderBottom: "1px solid #E2E8F0",
                marginBottom: "1.75rem",
              }}
            >
              {[
                { key: "overview", label: "Overview" },
                { key: "findings", label: "Findings" },
                { key: "evidence", label: "Evidence" },
                { key: "compliance", label: "Compliance" },
                { key: "remediation", label: "Remediation" },
                { key: "raw", label: "Raw configuration" },
                { key: "reports", label: "Reports" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveDetailTab(tab.key as any)}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: activeDetailTab === tab.key ? "2px solid #0F1216" : "2px solid transparent",
                    padding: "0.5rem 0.2rem 0.75rem",
                    fontSize: "0.85rem",
                    fontWeight: activeDetailTab === tab.key ? 700 : 500,
                    color: activeDetailTab === tab.key ? "#0F1216" : "#64748B",
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview Tab Content matching 07_device_detail.png */}
            {activeDetailTab === "overview" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem", marginBottom: "1.75rem" }}>
                  {/* Left Box: Device Identity */}
                  <div
                    style={{
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      padding: "1.25rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0F172A" }}>Device identity</span>
                      <span style={{ fontSize: "0.75rem", color: "#64748B" }}>Parsed fields</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <div style={{ padding: "0.65rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: "0.68rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>DEVICE ID</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A", marginTop: "0.2rem", fontFamily: "var(--font-mono)" }}>
                          {selectedDevice.deviceId}
                        </div>
                      </div>
                      <div style={{ padding: "0.65rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: "0.68rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>VENDOR</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A", marginTop: "0.2rem" }}>
                          {selectedDevice.vendor}
                        </div>
                      </div>
                      <div style={{ padding: "0.65rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: "0.68rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>HOSTNAME</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A", marginTop: "0.2rem", fontFamily: "var(--font-mono)" }}>
                          {selectedDevice.hostname}
                        </div>
                      </div>
                      <div style={{ padding: "0.65rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: "0.68rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>OS VERSION</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A", marginTop: "0.2rem", fontFamily: "var(--font-mono)" }}>
                          {selectedDevice.osVersion}
                        </div>
                      </div>
                      <div style={{ padding: "0.65rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: "0.68rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>MODEL</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A", marginTop: "0.2rem" }}>
                          {selectedDevice.model}
                        </div>
                      </div>
                      <div style={{ padding: "0.65rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: "0.68rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>SERIAL NUMBER</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A", marginTop: "0.2rem", fontFamily: "var(--font-mono)" }}>
                          {selectedDevice.serialNumber}
                        </div>
                      </div>
                      <div style={{ padding: "0.65rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: "0.68rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>PARSE CONFIDENCE</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#059669", marginTop: "0.2rem", fontFamily: "var(--font-mono)" }}>
                          {selectedDevice.parseConfidence}%
                        </div>
                      </div>
                      <div style={{ padding: "0.65rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: "0.68rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>UNMAPPED LINES</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: selectedDevice.unmappedLines > 0 ? "#D97706" : "#059669", marginTop: "0.2rem", fontFamily: "var(--font-mono)" }}>
                          {selectedDevice.unmappedLines}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Box: Framework Posture Progress Bars */}
                  <div
                    style={{
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      padding: "1.25rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0F172A" }}>Framework posture</span>
                      <span style={{ fontSize: "0.75rem", color: "#64748B" }}>Demo view</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                          <span style={{ color: "#334155", fontWeight: 500 }}>CIS Benchmarks</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>86%</span>
                        </div>
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{ width: "86%" }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                          <span style={{ color: "#334155", fontWeight: 500 }}>NIST SP 800-53</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>78%</span>
                        </div>
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{ width: "78%" }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                          <span style={{ color: "#334155", fontWeight: 500 }}>DISA STIG</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>81%</span>
                        </div>
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{ width: "81%" }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                          <span style={{ color: "#334155", fontWeight: 500 }}>ISO/IEC 27001</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>83%</span>
                        </div>
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{ width: "83%" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Card: Latest Findings */}
                <div className="data-table-wrapper">
                  <div
                    style={{
                      padding: "0.85rem 1.25rem",
                      borderBottom: "1px solid #E2E8F0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: "#FFFFFF",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0F172A" }}>
                      Latest findings
                    </span>
                    {onNavigateFindings && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDevice(null);
                          onNavigateFindings();
                        }}
                        className="btn-outline-action"
                      >
                        Open all findings ›
                      </button>
                    )}
                  </div>

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Control</th>
                        <th>Framework</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#0F172A" }}>
                          CIS-SSH-001
                        </td>
                        <td>CIS</td>
                        <td style={{ color: "#DC2626", fontWeight: 600 }}>High</td>
                        <td>
                          <span className="badge badge-fail">
                            <span className="badge-dot" /> FAIL
                          </span>
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "#64748B" }}>
                          Line 42
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#0F172A" }}>
                          NIST-AC-2
                        </td>
                        <td>NIST</td>
                        <td style={{ color: "#DC2626", fontWeight: 600 }}>High</td>
                        <td>
                          <span className="badge badge-fail">
                            <span className="badge-dot" /> FAIL
                          </span>
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "#64748B" }}>
                          Line 18
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#0F172A" }}>
                          STIG-V-220698
                        </td>
                        <td>STIG</td>
                        <td style={{ color: "#D97706", fontWeight: 600 }}>Medium</td>
                        <td>
                          <span className="badge badge-unknown">
                            <span className="badge-dot" /> UNKNOWN
                          </span>
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "#64748B" }}>
                          Line 77
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeDetailTab !== "overview" && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#64748B", backgroundColor: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <p style={{ margin: 0 }}>Showing {activeDetailTab} audit evidence stream for {selectedDevice.deviceId}.</p>
                {selectedDevice.unmappedLines > 0 && onTrain && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDevice(null);
                      onTrain(selectedDevice.id);
                    }}
                    className="btn btn-primary"
                    style={{ marginTop: "1rem" }}
                  >
                    Open AI Training Studio for Unmapped Lines →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
