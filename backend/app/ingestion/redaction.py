import re

# Section 6: config data may contain password hashes, SNMP community strings and
# pre-shared keys. These are masked before the raw config is ever persisted or
# shown in the UI/report — the L1 parser rules above only need pattern *presence*
# (e.g. "snmp-server community public") not the secret value, so redaction is
# safe to run unconditionally, ahead of storage.
_SECRET_PATTERNS = [
    re.compile(r"(\busername[ \t]+[^\s]+[ \t]+(?:password|secret)(?:[ \t]+\d)?[ \t]+)(\S+)", re.I),
    re.compile(r"(\b(?:enable[ \t]+)?(?:password|secret)(?:[ \t]+\d)?[ \t]+)(\S+)", re.I),
    re.compile(r"(\bsnmp-server[ \t]+community[ \t]+)(\S+)", re.I),
    re.compile(r"(\bset[ \t]+snmp[ \t]+community[ \t]+)(\S+)", re.I),
    re.compile(r"(\bpre-shared-key(?:[ \t]+[^\s]+)?[ \t]+)(\S+)", re.I),
    re.compile(r"(\b(?:wpa-psk|authentication-key)[ \t]+)(\S+)", re.I),
]


def redact_secrets(raw_config: str) -> str:
    """Mask credential/secret values in-place, keeping the surrounding syntax the
    L1 parser matches on intact."""
    redacted = raw_config
    for pattern in _SECRET_PATTERNS:
        redacted = pattern.sub(lambda m: f"{m.group(1)}[REDACTED]", redacted)
    return redacted
