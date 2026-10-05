import type {
  BulkItemResult,
  ComplianceReport,
  ConfigSummary,
  NormalizedConfig,
  PendingTrainingResponse,
  LearnedRulesResponse,
  RulePreviewResult,
  ReportMetadata,
  ReportJsonExport,
  FleetSummary,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const suffix = detail ? `: ${detail}` : "";
    throw new Error(`${res.status} ${res.statusText}${suffix}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  uploadConfig(file: File, vendor: string, deviceId: string): Promise<NormalizedConfig> {
    const form = new FormData();
    form.append("file", file);
    form.append("vendor", vendor);
    form.append("device_id", deviceId);
    return request("/ingest/upload", { method: "POST", body: form });
  },

  uploadBulk(
    items: { file: File; vendor: string; deviceId: string }[],
  ): Promise<BulkItemResult[]> {
    const form = new FormData();
    for (const item of items) {
      form.append("files", item.file);
      form.append("vendors", item.vendor);
      form.append("device_ids", item.deviceId);
    }
    return request("/ingest/bulk", { method: "POST", body: form });
  },

  listRecords(): Promise<ConfigSummary[]> {
    return request("/ingest/records");
  },

  listFrameworks(): Promise<string[]> {
    return request("/compliance/frameworks");
  },

  evaluate(configId: number, framework: string): Promise<ComplianceReport> {
    return request("/compliance/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config_id: configId, framework }),
    });
  },

  reportPdfUrl(configId: number, framework: string): string {
    return `${BASE_URL}/reporting/${configId}/pdf?framework=${encodeURIComponent(framework)}`;
  },

  getReportMetadata(configId: number, framework: string): Promise<ReportMetadata> {
    return request(`/reporting/${configId}/metadata?framework=${encodeURIComponent(framework)}`);
  },

  getReportJson(configId: number, framework: string): Promise<ReportJsonExport> {
    return request(`/reporting/${configId}/json?framework=${encodeURIComponent(framework)}`);
  },

  getFleetSummary(framework: string): Promise<FleetSummary> {
    return request(`/reporting/fleet/summary?framework=${encodeURIComponent(framework)}`);
  },

  getDeviceRecord(configId: number): Promise<Record<string, unknown>> {
    return request(`/ingest/records/${configId}`);
  },

  pendingTraining(configId: number): Promise<PendingTrainingResponse> {
    return request(`/ai-training/pending/${configId}`);
  },

  labelLine(vendor: string, lineText: string, canonicalKey: string): Promise<unknown> {
    return request("/ai-training/label", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor, line_text: lineText, canonical_key: canonicalKey }),
    });
  },

  // ── Phase 4: ParseRule management ─────────────────────────────────────────

  approveRule(payload: {
    vendor: string;
    example_line: string;
    pattern: string;
    target_field: string;
    value_type?: string;
    value_map?: Record<string, unknown>;
    static_value?: unknown;
    platform?: string;
    os_range?: string;
    semantic_category?: string;
    confidence?: number;
    approved_by?: string;
  }): Promise<{ status: string; rule_id: number; renormalized_configs: number }> {
    return request("/ai-training/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  previewPattern(
    pattern: string,
    configId: number,
  ): Promise<RulePreviewResult> {
    return request("/ai-training/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pattern, config_id: configId }),
    });
  },

  listRules(): Promise<LearnedRulesResponse> {
    return request("/ai-training/rules");
  },

  disableRule(ruleId: number): Promise<{ status: string; rule_id: number; renormalized_configs: number }> {
    return request(`/ai-training/rules/${ruleId}/disable`, { method: "PATCH" });
  },

  deleteRule(ruleId: number): Promise<{ status: string; rule_id: number; renormalized_configs: number }> {
    return request(`/ai-training/rules/${ruleId}`, { method: "DELETE" });
  },

  health(): Promise<unknown> {
    return request("/health");
  },
};

// Phase 3 expanded canonical vocabulary (35+ fields)
export const CANONICAL_KEYS = [
  // Remote access
  "ssh_version",
  "telnet_enabled",
  "http_mgmt_enabled",
  "https_mgmt_enabled",
  "console_timeout_seconds",
  "vty_timeout_seconds",
  "session_timeout_seconds",
  "login_banner_configured",
  // Crypto
  "ssh_ciphers",
  "ssh_macs",
  "tls_version",
  // Authentication
  "password_encryption",
  "password_hash_type",
  "aaa_enabled",
  "local_accounts_disabled",
  "login_retry_limit",
  "lockout_configured",
  // SNMP
  "snmp_community_default",
  "snmp_version",
  "snmp_enabled",
  // Logging & Time
  "logging_enabled",
  "remote_syslog_configured",
  "admin_logging_enabled",
  "ntp_configured",
  "ntp_authentication_enabled",
  // ACLs
  "acl_default_deny",
  "mgmt_acl_configured",
  "any_any_permit_present",
  // Hygiene / unused services
  "cdp_enabled",
  "lldp_enabled",
  "source_routing_enabled",
  "finger_enabled",
  "proxy_arp_enabled",
  // Cloud
  "ingress_any_any_allowed",
  "egress_any_any_allowed",
] as const;

export type CanonicalKey = (typeof CANONICAL_KEYS)[number];

// Empty vendor = let the backend identify it from the file; any other value is a manual override.
export const AUTO_VENDOR = "";

export const KNOWN_VENDORS = [
  "cisco_ios",
  "juniper_junos",
  "arista_eos",
  "fortinet_fortios",
  "mikrotik_routeros",
  "sonic",
  "aws_security_group",
] as const;
