from pathlib import Path

import yaml

from ..models import ComplianceRule

FRAMEWORKS_DIR = Path(__file__).parent / "frameworks"


class UnknownFrameworkError(ValueError):
    pass


def load_rules(framework: str) -> list[ComplianceRule]:
    """Load a framework's rule set from its YAML file (Section 5's low-code rule format)."""
    path = FRAMEWORKS_DIR / f"{framework.lower()}.yaml"
    if not path.exists():
        available = sorted(p.stem.upper() for p in FRAMEWORKS_DIR.glob("*.yaml"))
        raise UnknownFrameworkError(f"No rule set for framework '{framework}'. Available: {available}")

    raw_rules = yaml.safe_load(path.read_text()) or []
    return [ComplianceRule(**rule) for rule in raw_rules]
