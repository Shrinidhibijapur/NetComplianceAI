"""
Phase 4: parse_rules engine.

After the built-in YAML profile (or Phase 1 VENDOR_RULES fallback) has run,
this module applies the admin-approved ParseRule rows from the database to:
  - extract additional control values from previously-unmapped lines
  - reduce raw_unmapped_lines (lines the profile couldn't match)
  - update NormalizedConfig.controls and parse_confidence in-place

Design notes
------------
* Only active rules (active=1) are applied.
* Rules scoped to a specific vendor are checked against the vendor being parsed;
  rules with vendor="*" apply to every vendor.
* Value coercion follows value_type: string | int | float | bool | map.
* If no capture group exists in the pattern the static_value (or True) is used.
* Evidence is recorded under controls["_evidence"][field] so the UI / PDF can
  cite the source line.
"""

from __future__ import annotations

import re
from typing import Any


# ─────────────────────────────────────────────────────────────────────────────
# Value coercion & Rule filtering
# ─────────────────────────────────────────────────────────────────────────────

def _coerce(raw: str, value_type: str, value_map: dict) -> Any:
    """Convert the captured string to the intended Python type."""
    if value_type == "int":
        try:
            return int(raw)
        except (ValueError, TypeError):
            return raw
    if value_type == "float":
        try:
            return float(raw)
        except (ValueError, TypeError):
            return raw
    if value_type == "bool":
        return raw.strip().lower() in ("true", "1", "yes", "enable", "enabled", "on")
    if value_type == "map":
        return value_map.get(raw.strip(), raw.strip())
    return raw.strip()


def _filter_rules(rules: list, vendor: str) -> list:
    """Return active rules applicable to the given vendor."""
    if not rules:
        return []
    return [
        r for r in rules
        if getattr(r, "active", 1) and (r.vendor == "*" or r.vendor == vendor)
    ]


def _extract_rule_value(rule: Any, match: re.Match, compiled: re.Pattern) -> Any:
    """Extract and coerce value from regex match or static_value."""
    if rule.static_value is not None:
        return rule.static_value

    try:
        captured = match.group(1) if compiled.groups >= 1 else ""
    except IndexError:
        captured = ""

    if captured:
        return _coerce(captured, rule.value_type or "string", rule.value_map or {})
    return True


def _match_single_rule(rule: Any, raw_config: str, lines: list[str]) -> tuple[Any, str, int] | None:
    """Match a single rule against raw_config. Return (value, line_text, line_no) or None."""
    try:
        compiled = re.compile(rule.pattern, re.MULTILINE)
    except re.error:
        return None

    match = compiled.search(raw_config)
    if not match:
        return None

    line_no = raw_config.count("\n", 0, match.start())
    line_text = lines[line_no] if line_no < len(lines) else ""
    value = _extract_rule_value(rule, match, compiled)

    return value, line_text.strip(), line_no + 1


# ─────────────────────────────────────────────────────────────────────────────
# Core application logic
# ─────────────────────────────────────────────────────────────────────────────

def apply_parse_rules(
    rules: list,            # list[ParseRule] ORM rows
    vendor: str,
    lines: list[str],
    raw_config: str,
    controls: dict[str, Any],
    raw_unmapped_lines: list[str],
) -> tuple[dict[str, Any], list[str]]:
    """Apply approved ParseRules and return updated (controls, raw_unmapped_lines)."""
    applicable = _filter_rules(rules, vendor)
    if not applicable:
        return controls, raw_unmapped_lines

    evidence: dict = controls.get("_evidence", {})
    matched_lines_set: set[str] = set()

    for rule in applicable:
        target = rule.target_field
        if target in controls:
            continue

        result = _match_single_rule(rule, raw_config, lines)
        if result is None:
            continue

        value, line_text, line_num = result
        controls[target] = value
        matched_lines_set.add(line_text)
        evidence[target] = {
            "line_no": line_num,
            "line_text": line_text,
            "rule_source": "learned",
            "rule_id": rule.id,
        }

    if evidence:
        controls["_evidence"] = evidence

    still_unmapped = [line for line in raw_unmapped_lines if line not in matched_lines_set]
    return controls, still_unmapped
