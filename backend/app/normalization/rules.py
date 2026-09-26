import re
from dataclasses import dataclass, field
from typing import Callable, Pattern


@dataclass
class ControlRule:
    control_key: str
    pattern: Pattern
    extractor: Callable[[re.Match], object] = field(default=lambda m: True)


# ponytail: hand-written regex per vendor, not ntc-templates/TextFSM — ntc-templates parses
# `show <command>` output tables, not raw running-config security posture. Swap in a real
# TextFSM/YANG-based L1 parser here once vendor coverage needs to grow past a handful of vendors.

CISCO_IOS_RULES: list[ControlRule] = [
    ControlRule("ssh_version", re.compile(r"^ip ssh version (\d)", re.M), lambda m: m.group(1)),
    ControlRule("telnet_enabled", re.compile(r"^\s*transport input ssh\s*$", re.M), lambda m: False),
    ControlRule("http_mgmt_enabled", re.compile(r"^no ip http server", re.M), lambda m: False),
    ControlRule("http_mgmt_enabled", re.compile(r"^ip http server", re.M), lambda m: True),
    ControlRule("password_encryption", re.compile(r"^service password-encryption", re.M), lambda m: "type7"),
    ControlRule("logging_enabled", re.compile(r"^logging (host|buffered|trap)", re.M), lambda m: True),
    ControlRule("ntp_configured", re.compile(r"^ntp server", re.M), lambda m: True),
    ControlRule("acl_default_deny", re.compile(r"deny\s+ip\s+any\s+any", re.M), lambda m: True),
    ControlRule(
        "snmp_community_default",
        re.compile(r"^snmp-server community (public|private)", re.M),
        lambda m: True,
    ),
]

JUNIPER_JUNOS_RULES: list[ControlRule] = [
    ControlRule("ssh_version", re.compile(r"^set system services ssh\b", re.M), lambda m: "2"),
    ControlRule("telnet_enabled", re.compile(r"^set system services telnet\b", re.M), lambda m: True),
    ControlRule(
        "http_mgmt_enabled",
        re.compile(r"^set system services web-management http\b", re.M),
        lambda m: True,
    ),
    ControlRule("logging_enabled", re.compile(r"^set system syslog\b", re.M), lambda m: True),
    ControlRule("ntp_configured", re.compile(r"^set system ntp server\b", re.M), lambda m: True),
    ControlRule(
        "acl_default_deny",
        re.compile(r"^set firewall filter \S+ term \S+ then discard\b", re.M),
        lambda m: True,
    ),
    ControlRule(
        "snmp_community_default",
        re.compile(r"^set snmp community (public|private)\b", re.M),
        lambda m: True,
    ),
]

VENDOR_RULES: dict[str, list[ControlRule]] = {
    "cisco_ios": CISCO_IOS_RULES,
    "juniper_junos": JUNIPER_JUNOS_RULES,
}
