"""
Phase 2: YAML-driven vendor profile loader.

Each profile defines:
  - fingerprints: regexes to auto-detect the vendor from raw config text
  - identity:     regexes to extract hostname / model / serial / os_version
  - controls:     ordered list of (regex → canonical_key, value) mappings

Profiles are validated at load time; a broken YAML fails with a clear message.
No Python change is needed to add a new vendor — just drop a new .yaml file here.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

VENDORS_DIR = Path(__file__).parent


# ─────────────────────────────────────────────────────────────────────────────
# Schema dataclasses
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class IdentityExtractor:
    pattern: re.Pattern
    group: int = 1


@dataclass
class ControlPattern:
    pattern: re.Pattern
    value_type: str          # "bool" | "str" | "absent"
    value: Any = None        # literal value to return (for bool/str with value: ...)
    group: int | None = None  # capture-group index for value_type=str without a literal
    parent_pattern: re.Pattern | None = None  # must match a preceding line


@dataclass
class ControlMapping:
    control_key: str
    patterns: list[ControlPattern]


@dataclass
class VendorProfile:
    vendor: str
    display_name: str
    config_style: str          # indented_block | set_line | key_value | json
    fingerprints: list[re.Pattern]
    identity: dict[str, IdentityExtractor]
    controls: list[ControlMapping]


# ─────────────────────────────────────────────────────────────────────────────
# Loader
# ─────────────────────────────────────────────────────────────────────────────

class ProfileValidationError(ValueError):
    """Raised when a vendor profile YAML is structurally invalid."""


def _compile(pattern: str, field_name: str) -> re.Pattern:
    try:
        return re.compile(pattern, re.MULTILINE)
    except re.error as exc:
        raise ProfileValidationError(f"Invalid regex in {field_name!r}: {pattern!r} — {exc}") from exc


def _parse_fingerprints(path_name: str, vendor: str, raw_fp: Any) -> list[re.Pattern]:
    if not isinstance(raw_fp, list) or not raw_fp:
        raise ProfileValidationError(f"{path_name}: 'fingerprints' must be a non-empty list")
    return [_compile(fp, f"{vendor}.fingerprints") for fp in raw_fp]


def _parse_identity(path_name: str, vendor: str, raw_id: Any) -> dict[str, IdentityExtractor]:
    identity: dict[str, IdentityExtractor] = {}
    for key, spec in (raw_id or {}).items():
        if not isinstance(spec, dict) or "pattern" not in spec:
            raise ProfileValidationError(f"{path_name}: identity.{key} must have 'pattern'")
        identity[key] = IdentityExtractor(
            pattern=_compile(spec["pattern"], f"{vendor}.identity.{key}"),
            group=int(spec.get("group", 1)),
        )
    return identity


def _parse_control_pattern(path_name: str, vendor: str, ck: str, p: Any) -> ControlPattern:
    if not isinstance(p, dict) or "pattern" not in p:
        raise ProfileValidationError(f"{path_name}: {ck} pattern entry missing 'pattern'")
    vt = p.get("value_type", "bool")
    parent_pat = None
    if "parent_pattern" in p:
        parent_pat = _compile(p["parent_pattern"], f"{vendor}.{ck}.parent_pattern")
    return ControlPattern(
        pattern=_compile(p["pattern"], f"{vendor}.{ck}"),
        value_type=vt,
        value=p.get("value"),
        group=p.get("group"),
        parent_pattern=parent_pat,
    )


def _parse_controls(path_name: str, vendor: str, raw_controls: Any) -> list[ControlMapping]:
    if not isinstance(raw_controls, list):
        raise ProfileValidationError(f"{path_name}: 'controls' must be a list")
    controls: list[ControlMapping] = []
    for entry in raw_controls:
        if not isinstance(entry, dict):
            raise ProfileValidationError(f"{path_name}: control entry must be a dict")
        ck = entry.get("control_key")
        if not ck:
            raise ProfileValidationError(f"{path_name}: control entry missing 'control_key'")
        patterns_raw = entry.get("patterns")
        if not isinstance(patterns_raw, list) or not patterns_raw:
            raise ProfileValidationError(f"{path_name}: {ck}.patterns must be a non-empty list")

        cpatterns = [_parse_control_pattern(path_name, vendor, ck, p) for p in patterns_raw]
        controls.append(ControlMapping(control_key=ck, patterns=cpatterns))
    return controls


def _load_one(path: Path) -> VendorProfile:
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        raise ProfileValidationError(f"YAML parse error in {path.name}: {exc}") from exc

    if not isinstance(raw, dict):
        raise ProfileValidationError(f"{path.name}: top level must be a mapping")

    def _require(key: str) -> Any:
        if key not in raw:
            raise ProfileValidationError(f"{path.name}: missing required field '{key}'")
        return raw[key]

    vendor = _require("vendor")
    display_name = raw.get("display_name", vendor)
    config_style = raw.get("config_style", "indented_block")

    fingerprints = _parse_fingerprints(path.name, vendor, _require("fingerprints"))
    identity = _parse_identity(path.name, vendor, raw.get("identity"))
    controls = _parse_controls(path.name, vendor, _require("controls"))

    return VendorProfile(
        vendor=vendor,
        display_name=display_name,
        config_style=config_style,
        fingerprints=fingerprints,
        identity=identity,
        controls=controls,
    )


def load_all_profiles() -> dict[str, VendorProfile]:
    """Load every *.yaml in the vendors directory. Fails fast on schema errors."""
    profiles: dict[str, VendorProfile] = {}
    for path in sorted(VENDORS_DIR.glob("*.yaml")):
        profile = _load_one(path)
        profiles[profile.vendor] = profile
    return profiles


# Module-level singleton — loaded once at import time.
# Tests can call load_all_profiles() directly to get a fresh copy.
VENDOR_PROFILES: dict[str, VendorProfile] = load_all_profiles()
