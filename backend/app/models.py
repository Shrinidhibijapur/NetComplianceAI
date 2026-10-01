from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, model_validator


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


class BulkItemResult(BaseModel):
    """One file's outcome in a bulk upload; a failed file never aborts the rest."""

    filename: str
    device_id: str
    status: Literal["ok", "error"]
    result: Optional[NormalizedConfig] = None
    error: Optional[str] = None
