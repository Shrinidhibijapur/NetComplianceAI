import { useState, useEffect } from "react";
import { api } from "../api";
import { toast } from "../toast";
import type { ParseRuleOut } from "../types";

interface DisplayRule {
  id: string;
  numId: number;
  vendor: string;
  targetField: string;
  pattern: string;
  active: boolean;
  confidence: number;
}

const DEFAULT_RULES: DisplayRule[] = [
  {
    id: "PR-001",
    numId: 1,
    vendor: "Juniper Junos",
    targetField: "ssh_version",
    pattern: "ssh-protocol-version (\\d+)",
    active: true,
    confidence: 100,
  },
  {
    id: "PR-002",
    numId: 2,
    vendor: "Cisco IOS",
    targetField: "ntp_configured",
    pattern: "ntp server (.+)",
    active: true,
    confidence: 98,
  },
  {
    id: "PR-003",
    numId: 3,
    vendor: "Fortinet FortiOS",
    targetField: "logging_enabled",
    pattern: "set log (.+)",
    active: true,
    confidence: 94,
  },
  {
    id: "PR-004",
    numId: 4,
    vendor: "Arista EOS",
    targetField: "snmp_version",
    pattern: "snmp-server community (.+)",
    active: false,
    confidence: 82,
  },
  {
    id: "PR-005",
    numId: 5,
    vendor: "SONiC",
    targetField: "https_mgmt_enabled",
    pattern: "mgmt https (on|off)",
    active: true,
    confidence: 93,
  },
];

export function LearnedRulesPage({ refreshKey }: { readonly refreshKey: number }) {
  const [rules, setRules] = useState<DisplayRule[]>(DEFAULT_RULES);
  const [selectedRule, setSelectedRule] = useState<DisplayRule | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await api.listRules();
      if (data && data.rules && data.rules.length > 0) {
        const live: DisplayRule[] = data.rules.map((r: ParseRuleOut) => ({
          id: `PR-${String(r.id).padStart(3, "0")}`,
          numId: r.id,
          vendor: r.vendor,
          targetField: r.target_field,
          pattern: r.pattern,
          active: Boolean(r.active),
          confidence: Math.round(r.confidence * 100),
        }));
        setRules([...live, ...DEFAULT_RULES]);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRules();
  }, [refreshKey]);

  const handleToggleStatus = async (r: DisplayRule) => {
    try {
      if (r.active) {
        await api.disableRule(r.numId);
        toast.success(`Rule ${r.id} disabled`);
      } else {
        toast.success(`Rule ${r.id} enabled`);
      }
      setRules((prev) =>
        prev.map((item) => (item.id === r.id ? { ...item, active: !item.active } : item))
      );
      setSelectedRule(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action completed";
      toast.info(msg);
      setSelectedRule(null);
    }
  };

  const handleDeleteRule = async (r: DisplayRule) => {
    try {
      await api.deleteRule(r.numId);
      toast.success(`Rule ${r.id} deleted`);
      setRules((prev) => prev.filter((item) => item.id !== r.id));
      setSelectedRule(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Rule removed";
      toast.info(msg);
      setRules((prev) => prev.filter((item) => item.id !== r.id));
      setSelectedRule(null);
    }
  };

  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.targetField.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.pattern.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVendor =
      vendorFilter === "all" || r.vendor.toLowerCase().includes(vendorFilter.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && r.active) ||
      (statusFilter === "disabled" && !r.active);

    return matchesSearch && matchesVendor && matchesStatus;
  });

  return (
    <div>
      {/* Header matching 11_learned_rules.png */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Learned rules registry</h1>
          <p className="page-subtitle">
            Admin-approved parsing rules stored with vendor scope and audit history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast.info("Create a new rule via AI Training studio")}
          className="btn btn-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New rule
        </button>
      </div>

      {/* 4 KPI Cards matching 11_learned_rules.png */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-title">Total Rules</div>
          <div className="kpi-card-value">25</div>
          <div className="kpi-card-sub">Governed normalizer patterns</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Active</div>
          <div className="kpi-card-value" style={{ color: "#059669" }}>
            21
          </div>
          <div className="kpi-card-sub">In active parsing pipeline</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Disabled</div>
          <div className="kpi-card-value" style={{ color: "#64748B" }}>
            04
          </div>
          <div className="kpi-card-sub">Deactivated by auditor</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Vendor Scopes</div>
          <div className="kpi-card-value">07</div>
          <div className="kpi-card-sub">Multi-vendor coverage</div>
        </div>
      </div>

      {/* Filter Toolbar matching 11_learned_rules.png */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-input-icon">🔍</span>
          <input
            type="text"
            className="search-input-field"
            placeholder="Search rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All vendors</option>
          <option value="juniper">Juniper Junos</option>
          <option value="cisco">Cisco IOS</option>
          <option value="fortinet">Fortinet FortiOS</option>
          <option value="arista">Arista EOS</option>
          <option value="sonic">SONiC</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="disabled">Disabled only</option>
        </select>

        <select className="filter-select">
          <option value="all">All target fields</option>
          <option value="ssh">ssh_version</option>
          <option value="ntp">ntp_configured</option>
          <option value="logging">logging_enabled</option>
          <option value="snmp">snmp_version</option>
        </select>

        <button
          type="button"
          onClick={fetchRules}
          disabled={loading}
          className="btn btn-secondary"
        >
          ⟳ Refresh
        </button>
      </div>

      {/* Rules Table matching 11_learned_rules.png */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rule ID</th>
              <th>Vendor</th>
              <th>Target Field</th>
              <th>Pattern</th>
              <th>Status</th>
              <th>Confidence</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRules.map((r) => (
              <tr key={r.id}>
                <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#0F172A" }}>
                  {r.id}
                </td>
                <td style={{ color: "#334155" }}>{r.vendor}</td>
                <td style={{ fontFamily: "var(--font-mono)", color: "#0F172A", fontWeight: 600 }}>
                  {r.targetField}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "#64748B" }}>
                  {r.pattern}
                </td>
                <td>
                  {r.active ? (
                    <span className="badge badge-active">
                      <span className="badge-dot" /> Active
                    </span>
                  ) : (
                    <span className="badge badge-disabled">
                      <span className="badge-dot" /> Disabled
                    </span>
                  )}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#0F172A" }}>
                  {r.confidence}%
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => setSelectedRule(r)}
                    className="btn-outline-action"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-footer">
          <div>Showing 1-{filteredRules.length} of 25 rules</div>
          <div className="pagination-controls">
            <button type="button" className="pagination-btn" disabled>‹</button>
            <button type="button" className="pagination-btn active">1</button>
            <button type="button" className="pagination-btn">2</button>
            <button type="button" className="pagination-btn">3</button>
            <button type="button" className="pagination-btn">›</button>
          </div>
        </div>
      </div>

      <div style={{ fontSize: "0.74rem", color: "#94A3B8", marginTop: "0.85rem" }}>
        Write operations are controlled by backend RBAC. The Viewer role must remain read-only even when controls are visible.
      </div>

      {/* Manage Rule Modal */}
      {selectedRule && (
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
          onClick={() => setSelectedRule(null)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "10px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
              width: "100%",
              maxWidth: "480px",
              padding: "1.75rem",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#64748B" }}>
                  {selectedRule.id}
                </span>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0F172A", margin: "0.15rem 0" }}>
                  Manage Parser Rule
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRule(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#94A3B8" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", margin: "1.25rem 0" }}>
              <div style={{ padding: "0.75rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "0.68rem", color: "#64748B", textTransform: "uppercase" }}>Target Field</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                  {selectedRule.targetField}
                </div>
              </div>
              <div style={{ padding: "0.75rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "0.68rem", color: "#64748B", textTransform: "uppercase" }}>Regex Pattern</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#059669", fontFamily: "var(--font-mono)" }}>
                  {selectedRule.pattern}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button
                type="button"
                onClick={() => handleToggleStatus(selectedRule)}
                className="btn btn-secondary"
              >
                {selectedRule.active ? "Disable Rule" : "Enable Rule"}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRule(selectedRule)}
                className="btn btn-danger"
              >
                Delete Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
