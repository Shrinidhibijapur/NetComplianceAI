"""
Phase 2: data-driven vendor detection.

Priority order (first match wins):
  1. Manual override from the UI/API (vendor hint that is not blank/auto)
  2. Fingerprint matching against all loaded YAML profiles
  3. Embedding similarity against profile sample lines (fallback)
  4. "unknown" / "undetected"

Replaces the Phase 1 hardcoded signatures in ingestion/vendor.py while keeping
the same public API: resolve_vendor(hint, raw_config) → (vendor, source).
"""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    pass  # avoid circular at runtime


_AUTO = {"", "auto"}
_ALIASES: dict[str, str] = {
    "ios": "cisco_ios",
    "cisco": "cisco_ios",
    "cisco_ios_xe": "cisco_ios",
    "iosxe": "cisco_ios",
    "junos": "juniper_junos",
    "juniper": "juniper_junos",
    "eos": "arista_eos",
    "arista": "arista_eos",
    "fortios": "fortinet_fortios",
    "fortinet": "fortinet_fortios",
    "fortigate": "fortinet_fortios",
    "mikrotik": "mikrotik_routeros",
    "routeros": "mikrotik_routeros",
    "aws": "aws_security_group",
    "aws_sg": "aws_security_group",
}


def _normalise_hint(hint: str | None) -> str:
    """Lower-case, collapse spaces/hyphens to underscores."""
    return re.sub(r"[\s\-]+", "_", (hint or "").strip().lower())


def _fingerprint_detect(raw_config: str) -> str | None:
    """Return the first vendor whose fingerprints all-hit (any one hit suffices)."""
    # Import here to avoid circular at module load; VENDOR_PROFILES is a module-level singleton.
    from .loader import VENDOR_PROFILES

    scores: dict[str, int] = {}
    for vendor, profile in VENDOR_PROFILES.items():
        hits = sum(1 for fp in profile.fingerprints if fp.search(raw_config))
        if hits:
            scores[vendor] = hits

    if not scores:
        return None

    # Winner is vendor with the most fingerprint hits (avoids ambiguity on shared patterns).
    best = max(scores, key=lambda v: scores[v])
    return best


def resolve_vendor(hint: str | None, raw_config: str) -> tuple[str, str]:
    """
    Return (vendor_key, source).
    source is one of: 'manual', 'sniffed', 'undetected'.
    """
    key = _normalise_hint(hint)

    # ── 1. Manual override ────────────────────────────────────────────────────
    if key not in _AUTO:
        key = _ALIASES.get(key, key)
        return key, "manual"

    # ── 2. Fingerprint detection ──────────────────────────────────────────────
    detected = _fingerprint_detect(raw_config)
    if detected:
        return detected, "sniffed"

    # ── 3. (Phase 4 will add embedding fallback here) ─────────────────────────
    return "unknown", "undetected"
