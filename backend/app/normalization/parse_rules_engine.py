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
# Value coercion
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
    """Apply approved ParseRules and return updated (controls, raw_unmapped_lines).

    Args:
        rules:               Active ParseRule ORM rows from the DB.
        vendor:              The vendor string of the config being normalized.
        lines:               All lines of the config (splitlines).
        raw_config:          The full raw config text.
        controls:            Controls dict already populated by the profile engine.
        raw_unmapped_lines:  Lines the profile engine couldn't match.

    Returns:
        (controls, remaining_unmapped_lines) — both potentially reduced.
    """
    if not rules:
        return controls, raw_unmapped_lines

    # Filter to rules that apply to this vendor
    applicable = [
        r for r in rules
        if r.active and (r.vendor == "*" or r.vendor == vendor)
    ]
    if not applicable:
        return controls, raw_unmapped_lines

    evidence: dict = controls.get("_evidence", {})
    still_unmapped: list[str] = []
    matched_fields_by_line: dict[str, str] = {}  # line_text -> target_field

    for rule in applicable:
        target = rule.target_field
        if target in controls:
            # Already extracted by profile — skip to avoid overwriting authoritative data
            continue
        try:
            compiled = re.compile(rule.pattern, re.MULTILINE)
        except re.error:
            continue

        for m in compiled.finditer(raw_config):
            line_no = raw_config.count("\n", 0, m.start())
            line_text = lines[line_no] if line_no < len(lines) else ""

            # Determine value
            if rule.static_value is not None:
                value = rule.static_value
            else:
                try:
                    captured = m.group(1) if compiled.groups >= 1 else ""
                except IndexError:
                    captured = ""
                if captured:
                    value = _coerce(
                        captured,
                        rule.value_type or "string",
                        rule.value_map or {},
                    )
                else:
                    value = True  # pattern presence

            controls[target] = value
            matched_fields_by_line[line_text.strip()] = target
            evidence[target] = {
                "line_no": line_no + 1,
                "line_text": line_text.strip(),
                "rule_source": "learned",
                "rule_id": rule.id,
            }
            break  # first match wins per rule

    if evidence:
        controls["_evidence"] = evidence

    # Rebuild unmapped list: remove lines that a learned rule just matched
    for line in raw_unmapped_lines:
        if line not in matched_fields_by_line:
            still_unmapped.append(line)

    return controls, still_unmapped
