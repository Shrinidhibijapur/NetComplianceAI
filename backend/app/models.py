from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, model_validator, field_validator


class NormalizedConfig(BaseModel):
    """The canonical, vendor-neutral 'Security Baseline Model' (see docs/Implementation_Plan.md Section 3)."""

    id: Optional[int] = None  # set after the upload is persisted; pass this to /compliance/evaluate
    device_id: str
    vendor: str
    vendor_source: Optional[str] = None  # "manual" | "sniffed" | "undetected"
    # Phase 2: device identity — populated from profile identity extractors
    hostname: Optional[str] = None
    model: Optional[str] = None
    os_version: Optional[str] = None
    serial_number: Optional[str] = None
    parsed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    controls: dict[str, Any] = Field(default_factory=dict)
    raw_unmapped_lines: list[str] = Field(default_factory=list)
    parse_confidence: float = Field(
        default=0.0,
        description=(
            "Parse coverage in [0,1]: recognized config lines / meaningful lines (non-blank, "
            "non-comment). 0.0 = nothing understood (e.g. no parser for the vendor); 1.0 = every "
            "line mapped. It measures how much of THIS file the parser understood, not whether "
            "the device is secure."
        ),
    )


class ComplianceRule(BaseModel):
    """Rule Schema V2: data-driven multi-framework compliance rule."""

    control_id: str = ""
    rule_id: Optional[str] = None
    framework: str
    framework_reference: Optional[str] = None
    title: str
    canonical_key: str = ""
    target_field: Optional[str] = None
    operator: str = "equals"
    expected: Any = None
    severity: Literal["low", "medium", "high"] = "medium"
    source: str = ""
    source_url: Optional[str] = None
    source_identifier: Optional[str] = None
    verified: bool = True
    vendors: list[str] = Field(default_factory=lambda: ["*"])
    platforms: list[str] = Field(default_factory=lambda: ["*"])
    remediation: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def _normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "rule_id" in data and not data.get("control_id"):
                data["control_id"] = data["rule_id"]
            elif "control_id" in data and not data.get("rule_id"):
                data["rule_id"] = data["control_id"]

            if "target_field" in data and not data.get("canonical_key"):
                data["canonical_key"] = data["target_field"]
            elif "canonical_key" in data and not data.get("target_field"):
                data["target_field"] = data["canonical_key"]
        return data


class Finding(BaseModel):
    control_id: str
    rule_id: Optional[str] = None
    title: str
    framework: Optional[str] = None
    framework_reference: Optional[str] = None
    canonical_key: str
    operator: str = "equals"
    expected: Any
    actual: Any = None
    status: Literal["pass", "fail", "unknown", "not_applicable"]
    severity: Literal["low", "medium", "high"]
    source: Optional[str] = None
    verified: bool = True
    remediation: Optional[str] = None
    remediation_verified: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def _normalize_finding_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "rule_id" in data and not data.get("control_id"):
                data["control_id"] = data["rule_id"]
            elif "control_id" in data and not data.get("rule_id"):
                data["rule_id"] = data["control_id"]
        return data


class ComplianceReport(BaseModel):
    device_id: str
    vendor: str
    framework: str
    findings: list[Finding]
    summary: dict[str, int]


class MatchedExample(BaseModel):
    line_text: str
    canonical_key: str
    vendor: str
    score: float


class LineClassification(BaseModel):
    """One unrecognized config line's AI-suggested mapping (Section 4.2's classify step)."""

    line_text: str
    suggested_canonical_key: Optional[str] = None
    confidence: float = Field(
        description="Cosine similarity in [0,1] between this line and its nearest human-labeled "
        "example (embedding retrieval, not a calibrated probability)."
    )
    needs_labeling: bool
    matched_examples: list[MatchedExample] = Field(default_factory=list)


class PendingTrainingResponse(BaseModel):
    device_id: str
    vendor: str
    classifications: list[LineClassification]


class LabelRequest(BaseModel):
    vendor: str
    line_text: str
    canonical_key: str


class ApproveRuleRequest(BaseModel):
    """Phase 4: admin approves a learned parse rule from the Training UI.

    The admin provides:
    - the original unrecognized line (example_line)
    - a generalized regex pattern (with optional capture group)
    - the target_field it populates in NormalizedConfig.controls
    - how to interpret the captured value
    """

    vendor: str
    example_line: str
    pattern: str
    target_field: str
    value_type: Literal["string", "int", "float", "bool", "map"] = "string"
    value_map: dict[str, Any] = Field(default_factory=dict)
    static_value: Optional[Any] = None
    platform: str = "*"
    os_range: str = "*"
    semantic_category: str = ""
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    approved_by: str = "admin"

    @field_validator("pattern")
    @classmethod
    def _valid_regex(cls, v: str) -> str:
        import re
        try:
            re.compile(v)
        except re.error as exc:
            raise ValueError(f"Invalid regex pattern: {exc}") from exc
        return v


class ParseRuleOut(BaseModel):
    """Phase 4: serialized view of a ParseRule row returned by the API."""

    id: int
    vendor: str
    platform: str
    os_range: str
    pattern: str
    example_line: str
    target_field: str
    value_type: str
    value_map: dict[str, Any]
    static_value: Optional[Any]
    semantic_category: str
    source: str
    confidence: float
    approved_by: str
    approved_at: datetime
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RulePreviewResult(BaseModel):
    """Phase 4: result of a pattern preview — how many lines in a config would match."""

    pattern: str
    match_count: int
    matched_lines: list[str]  # first 10 matching lines for UI review


class LearnedRulesResponse(BaseModel):
    rules: list[ParseRuleOut]
    total: int


class BulkItemResult(BaseModel):
    """One file's outcome in a bulk upload; a failed file never aborts the rest."""

    filename: str
    device_id: str
    status: Literal["ok", "error"]
    result: Optional[NormalizedConfig] = None
    error: Optional[str] = None
