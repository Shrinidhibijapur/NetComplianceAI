from ..models import NormalizedConfig
from .rules import VENDOR_RULES


class UnsupportedVendorError(ValueError):
    pass


def _is_interesting(line: str) -> bool:
    stripped = line.strip()
    return bool(stripped) and not stripped.startswith(("!", "#"))


def normalize_config(vendor: str, device_id: str, raw_config: str) -> NormalizedConfig:
    """L1 normalization: known-vendor line matching into the canonical control schema.

    Lines that match no rule are surfaced in `raw_unmapped_lines` — these are exactly the
    candidates Phase 4's AI training loop will route to a human for labeling.
    """
    rules = VENDOR_RULES.get(vendor)
    if rules is None:
        raise UnsupportedVendorError(f"No L1 parser registered for vendor '{vendor}'")

    controls: dict[str, object] = {}
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

    parse_confidence = round(len(controls) / len(rules), 2) if rules else 0.0

    return NormalizedConfig(
        device_id=device_id,
        vendor=vendor,
        controls=controls,
        raw_unmapped_lines=raw_unmapped_lines,
        parse_confidence=parse_confidence,
    )
