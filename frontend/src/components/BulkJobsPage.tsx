import { useState } from "react";
import { toast } from "../toast";

interface BulkJobsPageProps {
  readonly onNavigateUpload?: () => void;
  readonly refreshKey?: number;
}

interface BulkJobRecord {
  id: string;
  batchName: string;
  devicesCount: number;
  status: "completed" | "in_progress" | "queued" | "failed";
  progress: number;
  createdAt: string;
  duration: string;
}

const SAMPLE_JOBS: BulkJobRecord[] = [
  {
    id: "JOB-9041",
    batchName: "Core Data Center Fleet - Phase 1",
    devicesCount: 8,
    status: "completed",
    progress: 100,
    createdAt: "Today, 11:20",
    duration: "4.2s",
  },
  {
    id: "JOB-9040",
    batchName: "Edge Gateway Refresh",
    devicesCount: 4,
    status: "completed",
    progress: 100,
    createdAt: "Today, 10:15",
    duration: "2.1s",
  },
  {
    id: "JOB-9039",
    batchName: "Branch Office WAN Tier",
    devicesCount: 12,
    status: "in_progress",
    progress: 65,
    createdAt: "Today, 09:45",
    duration: "Running...",
  },
  {
    id: "JOB-9038",
    batchName: "AWS VPC Security Group Audit",
    devicesCount: 5,
    status: "queued",
    progress: 0,
    createdAt: "Today, 09:30",
    duration: "Queued",
  },
  {
    id: "JOB-9035",
    batchName: "Access Layer Perimeter Baseline",
    devicesCount: 16,
    status: "completed",
    progress: 100,
    createdAt: "Yesterday",
    duration: "7.8s",
  },
];

export function BulkJobsPage({ onNavigateUpload }: BulkJobsPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<BulkJobRecord | null>(null);

  const filteredJobs = SAMPLE_JOBS.filter((job) => {
    const matchesSearch =
      job.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.batchName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Bulk processing jobs</h1>
          <p className="page-subtitle">
            Monitor multi-device configuration parsing and compliance assessment jobs.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
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
              New bulk upload
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-title">Total Jobs</div>
          <div className="kpi-card-value">18</div>
          <div className="kpi-card-sub">Across ingestion history</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Completed</div>
          <div className="kpi-card-value" style={{ color: "#059669" }}>16</div>
          <div className="kpi-card-sub">Evaluated without fault</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">In Progress</div>
          <div className="kpi-card-value" style={{ color: "#2563EB" }}>1</div>
          <div className="kpi-card-sub">Currently parsing rules</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Queued</div>
          <div className="kpi-card-value" style={{ color: "#D97706" }}>1</div>
          <div className="kpi-card-sub">Awaiting worker thread</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-input-icon">🔍</span>
          <input
            type="text"
            className="search-input-field"
            placeholder="Search jobs by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="queued">Queued</option>
        </select>

        <button
          type="button"
          onClick={() => toast.success("Refreshed bulk job statuses")}
          className="btn btn-secondary"
        >
          ⟳ Refresh
        </button>
      </div>

      {/* Jobs Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Batch Name</th>
              <th>Devices</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Created</th>
              <th>Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map((job) => (
              <tr key={job.id}>
                <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#0F172A" }}>
                  {job.id}
                </td>
                <td style={{ fontWeight: 600, color: "#0F172A" }}>
                  {job.batchName}
                </td>
                <td>{job.devicesCount} devices</td>
                <td>
                  {job.status === "completed" && (
                    <span className="badge badge-pass">
                      <span className="badge-dot" /> Completed
                    </span>
                  )}
                  {job.status === "in_progress" && (
                    <span className="badge badge-unknown" style={{ color: "#2563EB", backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }}>
                      <span className="badge-dot" style={{ backgroundColor: "#2563EB" }} /> In Progress
                    </span>
                  )}
                  {job.status === "queued" && (
                    <span className="badge badge-unknown">
                      <span className="badge-dot" /> Queued
                    </span>
                  )}
                </td>
                <td style={{ width: "160px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${job.progress}%` }} />
                    </div>
                    <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      {job.progress}%
                    </span>
                  </div>
                </td>
                <td style={{ fontSize: "0.8rem", color: "#64748B" }}>{job.createdAt}</td>
                <td style={{ fontSize: "0.8rem", color: "#64748B", fontFamily: "var(--font-mono)" }}>{job.duration}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => setSelectedJob(job)}
                    className="btn-outline-action"
                  >
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-footer">
          <div>Showing 1-{filteredJobs.length} of 18 bulk jobs</div>
          <div className="pagination-controls">
            <button type="button" className="pagination-btn" disabled>‹</button>
            <button type="button" className="pagination-btn active">1</button>
            <button type="button" className="pagination-btn">2</button>
            <button type="button" className="pagination-btn">›</button>
          </div>
        </div>
      </div>

      {/* Inspect Modal */}
      {selectedJob && (
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
            padding: "1rem",
          }}
          onClick={() => setSelectedJob(null)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "10px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
              width: "100%",
              maxWidth: "520px",
              padding: "1.75rem",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#64748B" }}>
                  {selectedJob.id}
                </span>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0F172A", margin: "0.2rem 0" }}>
                  {selectedJob.batchName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#94A3B8" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", margin: "1.25rem 0" }}>
              <div style={{ padding: "0.75rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "0.7rem", color: "#64748B", textTransform: "uppercase" }}>Batch Scope</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0F172A", marginTop: "0.2rem" }}>
                  {selectedJob.devicesCount} Ingested Devices
                </div>
              </div>
              <div style={{ padding: "0.75rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "0.7rem", color: "#64748B", textTransform: "uppercase" }}>Processing Time</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0F172A", marginTop: "0.2rem", fontFamily: "var(--font-mono)" }}>
                  {selectedJob.duration}
                </div>
              </div>
            </div>

            <p style={{ fontSize: "0.82rem", color: "#475569", lineHeight: 1.5 }}>
              All configuration files in this batch were normalized against canonical fields and evaluated against CIS, NIST, DISA STIG, and ISO 27001 policies.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
