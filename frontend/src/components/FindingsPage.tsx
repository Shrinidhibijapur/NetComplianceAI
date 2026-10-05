import { useEffect, useState } from "react";
import { api } from "../api";
import type { ConfigSummary, Finding } from "../types";
import { PageHeader } from "./common/PageHeader";
import { StatusBadge } from "./common/StatusBadge";
import { SeverityBadge } from "./common/SeverityBadge";
import { TechnicalValue } from "./common/TechnicalValue";
import { EmptyState } from "./common/EmptyState";
import { ResultsPanel } from "./ResultsPanel";

interface DetailedFinding extends Finding {
  device_id: string;
  vendor: string;
  config_id: number;
}

export function FindingsPage({ refreshKey }: { readonly refreshKey: number }) {
  const [recordsMap, setRecordsMap] = useState<Record<number, ConfigSummary>>({});
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [selectedFramework, setSelectedFramework] = useState("CIS");
  const [allFindings, setAllFindings] = useState<DetailedFinding[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [exportingJson, setExportingJson] = useState(false);

  // Selected device for full inspect panel
  const [inspectRecord, setInspectRecord] = useState<ConfigSummary | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([api.listRecords(), api.listFrameworks()])
      .then(([recs, fws]) => {
        if (!mounted) return;
        const rMap: Record<number, ConfigSummary> = {};
        for (const r of recs) {
          rMap[r.id] = r;
        }
        setRecordsMap(rMap);

        setFrameworks(fws);
        if (fws.length > 0 && !fws.includes(selectedFramework)) {
          setSelectedFramework(fws[0]);
        }

        // Evaluate all records against selected framework
        const evalPromises = recs.map((r) =>
          api.evaluate(r.id, selectedFramework).then((rep) => ({
            config_id: r.id,
            report: rep,
          }))
        );

        return Promise.all(evalPromises);
      })
      .then((evalResults) => {
        if (!mounted || !evalResults) return;
        const collected: DetailedFinding[] = [];
        for (const item of evalResults) {
          for (const f of item.report.findings) {
            collected.push({
              ...f,
              device_id: item.report.device_id,
              vendor: item.report.vendor,
              config_id: item.config_id,
            });
          }
        }
        setAllFindings(collected);
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedFramework, refreshKey]);

  const uniqueVendors = Array.from(new Set(allFindings.map((f) => f.vendor)));
  const uniqueDevices = Array.from(new Set(allFindings.map((f) => f.device_id)));

  const filtered = allFindings.filter((f) => {
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    if (vendorFilter !== "all" && f.vendor !== vendorFilter) return false;
    if (deviceFilter !== "all" && f.device_id !== deviceFilter) return false;
    return true;
  });

  const handleExportJson = async () => {
    setExportingJson(true);
    try {
      // Pick first record or export all filtered findings as JSON
      const firstConfigId = filtered[0]?.config_id ?? Object.keys(recordsMap)[0];
      if (!firstConfigId) {
        throw new Error("No findings to export");
      }
      const data = await api.getReportJson(Number(firstConfigId), selectedFramework);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance_findings_${selectedFramework}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setExportingJson(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Audit & Compliance Findings"
        description="Inspect rule failures, expected versus actual control values, evidence line numbers, and verified remediation steps across all ingested configurations."
        action={
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportJson}
            disabled={exportingJson || filtered.length === 0}
          >
            {exportingJson ? "Exporting..." : "⬇ Export JSON Findings"}
          </button>
        }
      />

      {/* Filter Toolbar */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
          backgroundColor: "var(--bg-surface)",
          padding: "1rem 1.25rem",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div>
          <label htmlFor="filter-framework" style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
            Framework:
          </label>
          <select
            id="filter-framework"
            value={selectedFramework}
            onChange={(e) => setSelectedFramework(e.target.value)}
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-medium)",
              padding: "0.4rem 0.75rem",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {frameworks.map((fw) => (
              <option key={fw} value={fw}>
                {fw}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-vendor" style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
            Vendor:
          </label>
          <select
            id="filter-vendor"
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-medium)",
              padding: "0.4rem 0.75rem",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <option value="all">All Vendors</option>
            {uniqueVendors.map((v) => (
              <option key={v} value={v}>
                {v.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-device" style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
            Device ID:
          </label>
          <select
            id="filter-device"
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-medium)",
              padding: "0.4rem 0.75rem",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <option value="all">All Devices</option>
            {uniqueDevices.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-status" style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
            Status:
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-medium)",
              padding: "0.4rem 0.75rem",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="fail">FAIL only</option>
            <option value="pass">PASS only</option>
            <option value="unknown">UNKNOWN only</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-severity" style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
            Severity:
          </label>
          <select
            id="filter-severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-medium)",
              padding: "0.4rem 0.75rem",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <option value="all">All Severities</option>
            <option value="high">High only</option>
            <option value="medium">Medium only</option>
            <option value="low">Low only</option>
          </select>
        </div>

        <div style={{ marginLeft: "auto", fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          Showing {filtered.length} of {allFindings.length} finding(s)
        </div>
      </div>

      {/* Findings Data Table */}
      <div className="data-table-wrapper">
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>Evaluating compliance findings...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No findings match your filters"
            description="Try changing your framework, status, or severity selection, or ingest device configurations to generate compliance findings."
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Status</th>
                <th>Control Title</th>
                <th>Device ID</th>
                <th>Vendor</th>
                <th>Remediation</th>
                <th>Expected / Actual</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, idx) => (
                <tr key={`${f.device_id}-${f.control_id}-${idx}`}>
                  <td>
                    <SeverityBadge severity={f.severity} />
                  </td>
                  <td>
                    <StatusBadge status={f.status} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{f.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      Key: {f.canonical_key} | Control: {f.control_id}
                    </div>
                  </td>
                  <td>
                    <TechnicalValue value={f.device_id} />
                  </td>
                  <td style={{ textTransform: "uppercase", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
                    {f.vendor}
                  </td>
                  <td>
                    {f.remediation && f.remediation_verified ? (
                      <span className="badge badge-pass" title={f.remediation}>VERIFIED REMEDIATION</span>
                    ) : (
                      <span className="badge" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                        NO VERIFIED REMEDIATION
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: "0.75rem" }}>
                    <div><span style={{ color: "var(--text-muted)" }}>Exp:</span> <TechnicalValue value={String(f.expected)} /></div>
                    <div><span style={{ color: "var(--text-muted)" }}>Act:</span> <TechnicalValue value={String(f.actual)} /></div>
                  </td>
                  <td>
                    {recordsMap[f.config_id] && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setInspectRecord(recordsMap[f.config_id])}
                      >
                        Inspect Evidence
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Inspect Drawer/Modal if clicked */}
      {inspectRecord && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close modal overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            zIndex: 100,
            display: "flex",
            justifyContent: "flex-end",
          }}
          onClick={() => setInspectRecord(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Enter") setInspectRecord(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              width: "600px",
              maxWidth: "100%",
              backgroundColor: "var(--bg-card)",
              height: "100%",
              overflowY: "auto",
              padding: "2rem",
              borderLeft: "1px solid var(--border-medium)",
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Device Compliance Results</h2>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setInspectRecord(null)}>
                Close ✕
              </button>
            </div>
            <ResultsPanel
              record={inspectRecord}
              onTrain={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}
