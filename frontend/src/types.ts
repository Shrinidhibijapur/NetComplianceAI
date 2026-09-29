export interface NormalizedConfig {
  id: number;
  device_id: string;
  vendor: string;
  os_version?: string | null;
  serial_number?: string | null;
  parsed_at: string;
  controls: Record<string, unknown>;
  raw_unmapped_lines: string[];
  parse_confidence: number;
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
  expected: unknown;
  actual: unknown;
  status: FindingStatus;
  severity: Severity;
  remediation?: string | null;
}

export interface ComplianceReport {
  device_id: string;
  vendor: string;
  framework: string;
  findings: Finding[];
  summary: Record<FindingStatus, number>;
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
