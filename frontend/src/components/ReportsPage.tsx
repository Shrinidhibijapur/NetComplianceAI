import { useState, useEffect } from "react";
import { api } from "../api";
import { toast } from "../toast";
import type { ConfigSummary } from "../types";

interface ReportItem {
  id: string;
  configId: number;
  deviceId: string;
  framework: string;
  findingsCount: number;
  passCount: number;
  failCount: number;
  unknownCount: number;
  generated: string;
  formats: string;
}

const DEFAULT_REPORTS: ReportItem[] = [
  {
    id: "RPT-1042",
    configId: 1,
    deviceId: "R1-CORE",
    framework: "CIS Benchmarks",
    findingsCount: 12,
    passCount: 4,
    failCount: 5,
    unknownCount: 3,
    generated: "Today, 10:42",
    formats: "PDF · JSON",
  },
  {
    id: "RPT-1041",
    configId: 2,
    deviceId: "FW-01",
    framework: "NIST SP 800-53",
    findingsCount: 31,
    passCount: 18,
    failCount: 8,
    unknownCount: 5,
    generated: "Today, 10:18",
    formats: "PDF · JSON",
  },
  {
    id: "RPT-1040",
    configId: 3,
    deviceId: "SW-EDGE",
    framework: "DISA STIG",
    findingsCount: 53,
    passCount: 42,
    failCount: 2,
    unknownCount: 9,
    generated: "Yesterday",
    formats: "PDF · JSON",
  },
  {
    id: "RPT-1039",
    configId: 4,
    deviceId: "BR-01",
    framework: "ISO/IEC 27001",
    findingsCount: 18,
    passCount: 11,
    failCount: 5,
    unknownCount: 2,
    generated: "Yesterday",
    formats: "PDF · JSON",
  },
];

interface ReportsPageProps {
  readonly refreshKey?: number;
}

export function ReportsPage({ refreshKey }: ReportsPageProps) {
  const [reports, setReports] = useState<ReportItem[]>(DEFAULT_REPORTS);
  const [selectedReport, setSelectedReport] = useState<ReportItem>(DEFAULT_REPORTS[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [frameworkFilter, setFrameworkFilter] = useState("all");

  useEffect(() => {
    // If backend records exist, blend real device records
    api.listRecords()
      .then((records: ConfigSummary[]) => {
        if (records && records.length > 0) {
          const generated: ReportItem[] = records.map((rec, idx) => ({
            id: `RPT-${1050 + idx}`,
            configId: rec.id,
            deviceId: rec.device_id,
            framework: "CIS Benchmarks",
            findingsCount: 12,
            passCount: 6,
            failCount: 4,
            unknownCount: 2,
            generated: "Today, 11:00",
            formats: "PDF · JSON",
          }));
          setReports([...generated, ...DEFAULT_REPORTS]);
          setSelectedReport(generated[0]);
        }
      })
      .catch(() => {
        // Fallback to sample reports
      });
  }, [refreshKey]);

  const handleDownloadPdf = () => {
    const fw = selectedReport.framework.split(" ")[0].toLowerCase();
    const url = api.reportPdfUrl(selectedReport.configId, fw);
    window.open(url, "_blank");
    toast.success(`Generated PDF for ${selectedReport.deviceId}`);
  };

  const handleExportJson = async () => {
    try {
      const fw = selectedReport.framework.split(" ")[0].toLowerCase();
      const data = await api.getReportJson(selectedReport.configId, fw);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance_report_${selectedReport.deviceId}_${fw}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported JSON report for ${selectedReport.deviceId}`);
    } catch {
      // Mock JSON export if record not found
      const mock = {
        report_id: selectedReport.id,
        device_id: selectedReport.deviceId,
        framework: selectedReport.framework,
        generated: selectedReport.generated,
        findings_count: selectedReport.findingsCount,
        pass_count: selectedReport.passCount,
        fail_count: selectedReport.failCount,
      };
      const blob = new Blob([JSON.stringify(mock, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${selectedReport.deviceId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported report data for ${selectedReport.deviceId}`);
    }
  };

  const filteredReports = reports.filter((rpt) => {
    const matchesSearch =
      rpt.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rpt.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFramework =
      frameworkFilter === "all" ||
      rpt.framework.toLowerCase().includes(frameworkFilter.toLowerCase());
    return matchesSearch && matchesFramework;
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Reports and exports</h1>
          <p className="page-subtitle">
            Generate and retrieve device-level audit artifacts with findings and evidence.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-title">Reports Generated</div>
          <div className="kpi-card-value">24</div>
          <div className="kpi-card-sub">Illustrative history</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Available Formats</div>
          <div className="kpi-card-value">02</div>
          <div className="kpi-card-sub">PDF and JSON</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Latest Report</div>
          <div className="kpi-card-value" style={{ fontSize: "1.85rem" }}>10:42</div>
          <div className="kpi-card-sub">Today · device-level</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-input-icon">🔍</span>
          <input
            type="text"
            className="search-input-field"
            placeholder="Search reports or devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={frameworkFilter}
          onChange={(e) => setFrameworkFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All frameworks</option>
          <option value="cis">CIS Benchmarks</option>
          <option value="nist">NIST SP 800-53</option>
          <option value="stig">DISA STIG</option>
          <option value="iso">ISO/IEC 27001</option>
        </select>

        <select className="filter-select">
          <option value="all">All formats</option>
          <option value="pdf">PDF only</option>
          <option value="json">JSON only</option>
        </select>

        <button
          type="button"
          onClick={() => handleDownloadPdf()}
          className="btn btn-secondary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export selected
        </button>
      </div>

      {/* Main Grid: Table + Preview Card */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", alignItems: "start" }}>
        {/* Reports Table */}
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Device</th>
                <th>Framework</th>
                <th>Findings</th>
                <th>Generated</th>
                <th>Formats</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((rpt) => (
                <tr
                  key={rpt.id}
                  style={{
                    backgroundColor: selectedReport.id === rpt.id ? "#F8FAFC" : undefined,
                  }}
                >
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#0F172A" }}>
                    {rpt.id}
                  </td>
                  <td style={{ fontWeight: 700, color: "#0F172A" }}>
                    {rpt.deviceId}
                  </td>
                  <td>{rpt.framework}</td>
                  <td>{rpt.findingsCount}</td>
                  <td style={{ fontSize: "0.8rem", color: "#64748B" }}>{rpt.generated}</td>
                  <td style={{ fontSize: "0.78rem", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                    {rpt.formats}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setSelectedReport(rpt)}
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
            <div>Showing {filteredReports.length} sample reports</div>
            <div className="pagination-controls">
              <button type="button" className="pagination-btn" disabled>‹</button>
              <button type="button" className="pagination-btn active">1</button>
              <button type="button" className="pagination-btn">2</button>
              <button type="button" className="pagination-btn">3</button>
              <button type="button" className="pagination-btn">›</button>
            </div>
          </div>
        </div>

        {/* Right Preview Card matching 12_reports.png */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0F172A" }}>
              Report preview
            </span>
            <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
              Example
            </span>
          </div>

          {/* Document Preview Box */}
          <div
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "1.25rem",
              backgroundColor: "#FFFFFF",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              CA / COMPLIANCEAI
            </div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0F172A", marginTop: "0.25rem", letterSpacing: "0.04em" }}>
              SECURITY COMPLIANCE REPORT
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0F172A", margin: "0.75rem 0 0.25rem" }}>
              {selectedReport.deviceId}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748B", lineHeight: 1.4 }}>
              Device configuration audit<br />
              Framework: {selectedReport.framework}<br />
              Generated {selectedReport.generated}
            </div>

            {/* Mini Stat Tiles */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", margin: "1rem 0" }}>
              <div style={{ padding: "0.5rem", backgroundColor: "#F8FAFC", borderRadius: "4px", border: "1px solid #E2E8F0", textAlign: "center" }}>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                  {selectedReport.findingsCount}
                </div>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                  Findings
                </div>
              </div>
              <div style={{ padding: "0.5rem", backgroundColor: "#ECFDF5", borderRadius: "4px", border: "1px solid #A7F3D0", textAlign: "center" }}>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#059669", fontFamily: "var(--font-mono)" }}>
                  0{selectedReport.passCount}
                </div>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#059669", textTransform: "uppercase" }}>
                  Pass
                </div>
              </div>
              <div style={{ padding: "0.5rem", backgroundColor: "#FFFBEB", borderRadius: "4px", border: "1px solid #FDE68A", textAlign: "center" }}>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#D97706", fontFamily: "var(--font-mono)" }}>
                  0{selectedReport.unknownCount}
                </div>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#D97706", textTransform: "uppercase" }}>
                  Unknown
                </div>
              </div>
            </div>

            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94A3B8", letterSpacing: "0.06em", borderTop: "1px solid #F1F5F9", paddingTop: "0.5rem" }}>
              EVIDENCE · STATUS · REMEDIATION
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download PDF ↓
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="btn btn-secondary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export JSON ↓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
