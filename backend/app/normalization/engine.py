from ..models import NormalizedConfig
from .rules import VENDOR_RULES


def _is_interesting(line: str) -> bool:
    stripped = line.strip()
    return bool(stripped) and not stripped.startswith(("!", "#"))


def normalize_config(vendor: str, device_id: str, raw_config: str) -> NormalizedConfig:
    """L1 normalization: known-vendor line matching into the canonical control schema.

    A vendor with no registered L1 rules (anything outside VENDOR_RULES — a "White Box"/SONiC
    device, a brand-new firewall vendor, etc.) isn't rejected: it just has zero rules to match,
    so every line falls straight through to `raw_unmapped_lines`. That's the L1->L3 handoff
    (Section 3) — Phase 4's AI training loop is what actually makes such a vendor usable.
    """
    rules = VENDOR_RULES.get(vendor, [])

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
