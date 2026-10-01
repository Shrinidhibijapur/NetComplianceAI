"""
Normalization engine — Phase 2 update.

Dispatch order:
  1. If the vendor has a YAML profile (app/vendors/*.yaml), use the profile engine
     which extracts device identity, supports parent-block context, and records evidence.
  2. Otherwise fall back to Phase 1 VENDOR_RULES (hardcoded regexes in rules.py).
     This ensures existing Cisco/Juniper tests keep passing while profile coverage grows.
"""

from ..models import NormalizedConfig


def _is_interesting(line: str) -> bool:
    stripped = line.strip()
    return bool(stripped) and not stripped.startswith(("!", "#"))


def normalize_config(vendor: str, device_id: str, raw_config: str) -> NormalizedConfig:
    """L1 normalization: delegate to profile engine or legacy rules."""
    # Phase 2: try the data-driven profile first.
    from ..vendors.loader import VENDOR_PROFILES
    if vendor in VENDOR_PROFILES:
        from .profile_engine import normalize_with_profile
        return normalize_with_profile(vendor, device_id, raw_config)

    # Phase 1 fallback for vendors not yet in a profile.
    from .rules import VENDOR_RULES

    rules = VENDOR_RULES.get(vendor, [])
    controls: dict = {}
    matched_line_numbers: set[int] = set()

    for rule in rules:
        if rule.control_key in controls:
            continue
        match = rule.pattern.search(raw_config)
        if match:
            controls[rule.control_key] = rule.extractor(match)
            matched_line_numbers.add(raw_config.count("\n", 0, match.start()))

    lines = raw_config.splitlines()
    raw_unmapped_lines = [
        line.strip()
        for i, line in enumerate(lines)
        if i not in matched_line_numbers and _is_interesting(line)
    ]

    meaningful = sum(1 for line in lines if _is_interesting(line))
    parse_confidence = round((meaningful - len(raw_unmapped_lines)) / meaningful, 2) if meaningful else 0.0

    return NormalizedConfig(
        device_id=device_id,
        vendor=vendor,
        controls=controls,
        raw_unmapped_lines=raw_unmapped_lines,
        parse_confidence=parse_confidence,
    )

