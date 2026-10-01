import re

from ..normalization.rules import VENDOR_RULES

# ponytail: Phase 1 stopgap, not detection. Manual selection always wins; with no selection we
# only recognise the two vendors that already have parsers, by one obvious signature each.
# Phase 2 replaces this with data-driven fingerprints and embedding fallback.
_ALIASES = {"ios": "cisco_ios", "cisco": "cisco_ios", "junos": "juniper_junos", "juniper": "juniper_junos"}
_AUTO = {"", "auto"}
_SIGNATURES = {
    "juniper_junos": re.compile(r"^set (system|interfaces|security|firewall|snmp|protocols) ", re.M),
    "cisco_ios": re.compile(
        r"^(ip ssh version|service password-encryption|line vty|ip http server|snmp-server community)", re.M
    ),
}


def resolve_vendor(hint: str | None, raw_config: str) -> tuple[str, str]:
    """Return (vendor, source). source: 'manual' (user chose), 'sniffed', or 'undetected'."""
    key = re.sub(r"[\s\-]+", "_", (hint or "").strip().lower())
    if key not in _AUTO:
        key = _ALIASES.get(key, key)
        return key, "manual"

    hits = [v for v, sig in _SIGNATURES.items() if v in VENDOR_RULES and sig.search(raw_config)]
    if len(hits) == 1:
        return hits[0], "sniffed"
    return "unknown", "undetected"
