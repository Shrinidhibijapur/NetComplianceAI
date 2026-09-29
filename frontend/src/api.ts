import type {
  ComplianceReport,
  ConfigSummary,
  NormalizedConfig,
  PendingTrainingResponse,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`);
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
  ): Promise<NormalizedConfig[]> {
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

  health(): Promise<unknown> {
    return request("/health");
  },
};

export const CANONICAL_KEYS = [
  "ssh_version",
  "telnet_enabled",
  "http_mgmt_enabled",
  "password_encryption",
  "logging_enabled",
  "ntp_configured",
  "acl_default_deny",
  "snmp_community_default",
] as const;

export const KNOWN_VENDORS = ["cisco_ios", "juniper_junos"] as const;
