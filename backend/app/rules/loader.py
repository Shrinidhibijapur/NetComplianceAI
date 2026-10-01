from pathlib import Path
from typing import Any

import yaml

from ..models import ComplianceRule
from .sources import get_source_info

FRAMEWORKS_DIR = Path(__file__).parent / "frameworks"


class UnknownFrameworkError(ValueError):
    pass


class RuleValidationError(ValueError):
    """Raised when a compliance rule entry is structurally invalid."""

    pass


def _validate_raw_rule(rule_dict: dict[str, Any], framework: str, filename: str) -> None:
    if not isinstance(rule_dict, dict):
        raise RuleValidationError(f"{filename}: rule entry must be a dictionary mapping")

    has_id = bool(rule_dict.get("rule_id") or rule_dict.get("control_id"))
    if not has_id:
        raise RuleValidationError(f"{filename}: rule entry missing 'rule_id' or 'control_id'")

    if not rule_dict.get("title"):
        raise RuleValidationError(f"{filename}: rule entry missing 'title'")

    has_key = bool(rule_dict.get("canonical_key") or rule_dict.get("target_field"))
    if not has_key:
        raise RuleValidationError(f"{filename}: rule entry missing 'canonical_key' or 'target_field'")


def load_rules(framework: str) -> list[ComplianceRule]:
    """Load a framework's rule set from its YAML file in frameworks directory."""
    path = FRAMEWORKS_DIR / f"{framework.lower()}.yaml"
    if not path.exists():
        available = sorted(p.stem.upper() for p in FRAMEWORKS_DIR.glob("*.yaml"))
        raise UnknownFrameworkError(f"No rule set for framework '{framework}'. Available: {available}")

    try:
        raw_rules = yaml.safe_load(path.read_text(encoding="utf-8")) or []
    except yaml.YAMLError as exc:
        raise RuleValidationError(f"YAML parse error in {path.name}: {exc}") from exc

    if not isinstance(raw_rules, list):
        raise RuleValidationError(f"{path.name}: top-level content must be a list of rules")

    source_info = get_source_info(framework)
    rules: list[ComplianceRule] = []

    for item in raw_rules:
        _validate_raw_rule(item, framework, path.name)
        if "framework" not in item:
            item["framework"] = framework.upper()
        if not item.get("source"):
            item["source"] = source_info["title"]
        if not item.get("source_url") and source_info.get("url"):
            item["source_url"] = source_info["url"]
        if "verified" not in item:
            item["verified"] = source_info["verified"]

        rules.append(ComplianceRule(**item))

    return rules
