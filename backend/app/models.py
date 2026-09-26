from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class NormalizedConfig(BaseModel):
    """The canonical, vendor-neutral 'Security Baseline Model' (see docs/Implementation_Plan.md Section 3)."""

    id: Optional[int] = None  # set after the upload is persisted; pass this to /compliance/evaluate
    device_id: str
    vendor: str
    os_version: Optional[str] = None
    serial_number: Optional[str] = None
    parsed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    controls: dict[str, Any] = Field(default_factory=dict)
    raw_unmapped_lines: list[str] = Field(default_factory=list)
    parse_confidence: float = 0.0


class ComplianceRule(BaseModel):
    """One control from a framework's YAML rule file (docs/Implementation_Plan.md Section 5)."""

    control_id: str
    framework: str
    title: str
    canonical_key: str
    expected: Any
    severity: Literal["low", "medium", "high"]
    remediation: dict[str, str] = Field(default_factory=dict)


class Finding(BaseModel):
    control_id: str
    title: str
    canonical_key: str
    expected: Any
    actual: Any = None
    status: Literal["pass", "fail", "unknown"]
    severity: Literal["low", "medium", "high"]
    remediation: Optional[str] = None


class ComplianceReport(BaseModel):
    device_id: str
    vendor: str
    framework: str
    findings: list[Finding]
    summary: dict[str, int]
