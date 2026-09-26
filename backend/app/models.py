from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import BaseModel, Field


class NormalizedConfig(BaseModel):
    """The canonical, vendor-neutral 'Security Baseline Model' (see docs/Implementation_Plan.md Section 3)."""

    device_id: str
    vendor: str
    os_version: Optional[str] = None
    serial_number: Optional[str] = None
    parsed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    controls: dict[str, Any] = Field(default_factory=dict)
    raw_unmapped_lines: list[str] = Field(default_factory=list)
    parse_confidence: float = 0.0
