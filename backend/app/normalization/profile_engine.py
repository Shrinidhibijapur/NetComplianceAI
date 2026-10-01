"""
Phase 2: profile-driven normalization engine.

Replaces the hardcoded VENDOR_RULES dict in normalization/rules.py with
data from YAML profiles in app/vendors/.

Key additions over Phase 1:
  - Device identity extraction (hostname, model, serial, os_version)
  - Hierarchical block awareness (parent_pattern context)
  - "absent" vs "false" distinction
  - Evidence: (line_number, line_text) on every extracted value
  - Falls back to Phase 1 rules.py for any vendor not yet in a profile
    (backward-compat until profiles cover everything)
"""

from __future__ import annotations

import re
from typing import Any


def _is_interesting(line: str) -> bool:
    stripped = line.strip()
    return bool(stripped) and not stripped.startswith(("!", "#"))


# ─────────────────────────────────────────────────────────────────────────────
# Hierarchical block tracking
# ─────────────────────────────────────────────────────────────────────────────

def _current_parent(lines: list[str], current_idx: int) -> str:
    """
    Walk backwards from current_idx to find the nearest parent block line
    (a line with less or zero leading whitespace compared to the current line).
    Used for indented_block-style configs (Cisco, Arista, FortiOS).
    """
    current_indent = len(lines[current_idx]) - len(lines[current_idx].lstrip())
    for i in range(current_idx - 1, -1, -1):
        line = lines[i]
        if not line.strip():
            continue
        indent = len(line) - len(line.lstrip())
        if indent < current_indent:
            return line.strip()
    return ""


# ─────────────────────────────────────────────────────────────────────────────
# Identity extraction
# ─────────────────────────────────────────────────────────────────────────────

def _extract_identity(profile, raw_config: str) -> dict[str, str]:
    """Return a dict of {field: value} for hostname/model/serial/os_version."""
    identity: dict[str, str] = {}
    for field_name, extractor in profile.identity.items():
        m = extractor.pattern.search(raw_config)
        if m:
            try:
                identity[field_name] = m.group(extractor.group).strip()
            except IndexError:
                pass
    return identity


# ─────────────────────────────────────────────────────────────────────────────
# Control extraction with parent-block awareness
# ─────────────────────────────────────────────────────────────────────────────

def _resolve_match_value(cp, m: re.Match) -> Any:
    if cp.value is not None:
        return cp.value
    if cp.group is not None:
        try:
            return m.group(cp.group)
        except IndexError:
            return True
    return True


def _match_single_pattern(cp, lines: list[str], raw_config: str) -> tuple[int, str, Any] | None:
    for m in cp.pattern.finditer(raw_config):
        line_no = raw_config.count("\n", 0, m.start())
        line_text = lines[line_no] if line_no < len(lines) else ""

        if cp.parent_pattern is not None:
            parent_line = _current_parent(lines, line_no)
            if not cp.parent_pattern.search(parent_line):
                continue

        value = _resolve_match_value(cp, m)
        return line_no, line_text, value
    return None


def _extract_controls(
    profile,
    lines: list[str],
    raw_config: str,
) -> tuple[dict[str, Any], set[int], dict[str, dict]]:
    """
    Returns:
      controls          – {key: value}
      matched_line_nos  – 0-based line indices that were matched (for unmapped calc)
      evidence          – {key: {line_no, line_text}} for auditability
    """
    controls: dict[str, Any] = {}
    matched: set[int] = set()
    evidence: dict[str, dict] = {}

    for mapping in profile.controls:
        ck = mapping.control_key
        if ck in controls:
            continue

        for cp in mapping.patterns:
            res = _match_single_pattern(cp, lines, raw_config)
            if res is not None:
                line_no, line_text, value = res
                controls[ck] = value
                matched.add(line_no)
                evidence[ck] = {"line_no": line_no + 1, "line_text": line_text.strip()}
                break

    return controls, matched, evidence


# ─────────────────────────────────────────────────────────────────────────────
# Public interface
# ─────────────────────────────────────────────────────────────────────────────

def normalize_with_profile(vendor: str, device_id: str, raw_config: str):
    """
    Normalize raw_config using the YAML profile for `vendor`.
    Returns a NormalizedConfig.  Falls back to Phase 1 rules if no profile.
    """
    from ..models import NormalizedConfig
    from ..vendors.loader import VENDOR_PROFILES

    profile = VENDOR_PROFILES.get(vendor)

    if profile is None:
        # Fallback to Phase 1 rule-based engine (keeps backward compat).
        from .engine import normalize_config as _legacy
        return _legacy(vendor, device_id, raw_config)

    lines = raw_config.splitlines()

    # ── Identity ──────────────────────────────────────────────────────────────
    identity = _extract_identity(profile, raw_config)

    # ── Controls ──────────────────────────────────────────────────────────────
    controls, matched_line_nos, evidence = _extract_controls(profile, lines, raw_config)

    # ── Unmapped lines ────────────────────────────────────────────────────────
    raw_unmapped_lines = [
        lines[i].strip()
        for i in range(len(lines))
        if i not in matched_line_nos and _is_interesting(lines[i])
    ]

    # ── Confidence ────────────────────────────────────────────────────────────
    meaningful = sum(1 for line in lines if _is_interesting(line))
    parse_confidence = (
        round((meaningful - len(raw_unmapped_lines)) / meaningful, 2) if meaningful else 0.0
    )

    # Enrich controls with evidence as a special "_evidence" key (not a compliance field).
    # Stored alongside controls so the UI / Phase 5 PDF can cite line numbers.
    if evidence:
        controls["_evidence"] = evidence

    return NormalizedConfig(
        device_id=device_id,
        vendor=vendor,
        os_version=identity.get("os_version"),
        hostname=identity.get("hostname"),
        model=identity.get("model"),
        serial_number=identity.get("serial_number"),
        controls=controls,
        raw_unmapped_lines=raw_unmapped_lines,
        parse_confidence=parse_confidence,
    )
