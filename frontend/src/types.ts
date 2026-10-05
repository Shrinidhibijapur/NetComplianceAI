export interface NormalizedConfig {
  id: number;
  device_id: string;
  vendor: string;
  vendor_source?: "manual" | "sniffed" | "undetected" | null;
  os_version?: string | null;
  serial_number?: string | null;
  parsed_at: string;
  controls: Record<string, unknown>;
  raw_unmapped_lines: string[];
  parse_confidence: number;
}

export interface BulkItemResult {
  filename: string;
  device_id: string;
  status: "ok" | "error";
  result: NormalizedConfig | null;
  error: string | null;
}

export interface ConfigSummary {
  id: number;
  device_id: string;
  vendor: string;
  parse_confidence: number;
  unmapped_count: number;
  created_at: string;
}

export type Severity = "low" | "medium" | "high";
export type FindingStatus = "pass" | "fail" | "unknown";

export interface Finding {
  control_id: string;
  title: string;
  canonical_key: string;
  operator?: string;
  expected: unknown;
  actual: unknown;
  status: FindingStatus;
  severity: Severity;
  framework?: string | null;
  framework_reference?: string | null;
  source?: string | null;
  verified?: boolean;
  remediation?: string | null;
  remediation_verified?: boolean | null;
  remediation_status?: "verified" | "no_verified_remediation" | "not_applicable";
}

export interface ComplianceReport {
  device_id: string;
  vendor: string;
  framework: string;
  findings: Finding[];
  summary: Record<FindingStatus, number>;
}

export interface ReportMetadata {
  config_id: number;
  device_id: string;
  vendor: string;
  hostname: string | null;
  model: string | null;
  os_version: string | null;
  serial_number: string | null;
  framework: string;
  compliance_score: number;
  pass_count: number;
  fail_count: number;
  unknown_count: number;
  not_applicable_count: number;
  unmapped_line_count: number;
  generated_at: string;
}

export interface FindingExport {
  control_id: string;
  title: string;
  framework: string | null;
  framework_reference: string | null;
  canonical_key: string;
  operator: string;
  expected: unknown;
  actual: unknown;
  status: string;
  severity: string;
  source: string | null;
  verified: boolean;
  remediation: string | null;
  remediation_verified: boolean | null;
  remediation_status: string;
}

export interface ReportJsonExport {
  meta: ReportMetadata;
  findings: FindingExport[];
  unmapped_lines: string[];
  learned_rules_used: Record<string, unknown>[];
}

export interface DevicePosture {
  config_id: number;
  device_id: string;
  vendor: string;
  hostname: string | null;
  os_version: string | null;
  parse_confidence: number;
  compliance_score: number;
  pass_count: number;
  fail_count: number;
  unknown_count: number;
  unmapped_count: number;
  last_scan: string;
}

export interface FleetSummary {
  framework: string;
  total_devices: number;
  devices: DevicePosture[];
  fleet_pass_total: number;
  fleet_fail_total: number;
  fleet_unknown_total: number;
  fleet_score: number;
  high_severity_fails: number;
  medium_severity_fails: number;
  low_severity_fails: number;
}

export interface MatchedExample {
  line_text: string;
  canonical_key: string;
  vendor: string;
  score: number;
}

export interface LineClassification {
  line_text: string;
  suggested_canonical_key?: string | null;
  confidence: number;
  needs_labeling: boolean;
  matched_examples: MatchedExample[];
}

export interface PendingTrainingResponse {
  device_id: string;
  vendor: string;
  classifications: LineClassification[];
}

// ── Phase 4: ParseRule types ─────────────────────────────────────────────────

export interface ParseRuleOut {
  id: number;
  vendor: string;
  platform: string;
  os_range: string;
  pattern: string;
  example_line: string;
  target_field: string;
  value_type: string;
  value_map: Record<string, unknown>;
  static_value: unknown;
  semantic_category: string;
  source: string;
  confidence: number;
  approved_by: string;
  approved_at: string;
  active: boolean;
  created_at: string;
}

export interface LearnedRulesResponse {
  rules: ParseRuleOut[];
  total: number;
}

export interface RulePreviewResult {
  pattern: string;
  match_count: number;
  matched_lines: string[];
}

export interface AuditEntry {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  success: boolean;
  metadata_json: Record<string, unknown> | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

