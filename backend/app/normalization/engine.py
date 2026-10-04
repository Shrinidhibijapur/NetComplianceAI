"""
Normalization engine — Phase 2 + Phase 4 update.

Dispatch order:
  1. If the vendor has a YAML profile (app/vendors/*.yaml), use the profile engine
     which extracts device identity, supports parent-block context, and records evidence.
     Phase 4: profile_engine also consults active ParseRules from the DB after profiling.
  2. Otherwise fall back to Phase 1 VENDOR_RULES (hardcoded regexes in rules.py).
     Phase 4: after VENDOR_RULES, also consult active ParseRules from the DB.
     This ensures existing Cisco/Juniper tests keep passing while profile coverage grows,
     AND unknown vendors can be taught by the admin without writing code.
"""

from ..models import NormalizedConfig


def _is_interesting(line: str) -> bool:
    stripped = line.strip()
    return bool(stripped) and not stripped.startswith(("!", "#"))


def normalize_config(vendor: str, device_id: str, raw_config: str) -> NormalizedConfig:
    """L1 normalization: delegate to profile engine or legacy rules, then apply learned ParseRules."""
    # Phase 2: try the data-driven profile first.
    from ..vendors.loader import VENDOR_PROFILES
    if vendor in VENDOR_PROFILES:
        from .profile_engine import normalize_with_profile
        # profile_engine already applies ParseRules internally (Phase 4)
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

    # ── Phase 4: apply learned ParseRules for all vendors (incl. unknown ones) ──
    try:
        from ..db import ParseRule, SessionLocal
        from .parse_rules_engine import apply_parse_rules
        _db = SessionLocal()
        try:
            active_rules = (
                _db.query(ParseRule)
                .filter(
                    ParseRule.active == 1,
                    (ParseRule.vendor == vendor) | (ParseRule.vendor == "*"),  # type: ignore[operator]
                )
                .all()
            )
            controls, raw_unmapped_lines = apply_parse_rules(
                active_rules, vendor, lines, raw_config,
                controls, raw_unmapped_lines,
            )
        finally:
            _db.close()
    except Exception:  # noqa: BLE001 — DB unavailable must never crash normalization
        pass

    meaningful = sum(1 for line in lines if _is_interesting(line))
    parse_confidence = round((meaningful - len(raw_unmapped_lines)) / meaningful, 2) if meaningful else 0.0

    return NormalizedConfig(
        device_id=device_id,
        vendor=vendor,
        controls=controls,
        raw_unmapped_lines=raw_unmapped_lines,
        parse_confidence=parse_confidence,
    )
