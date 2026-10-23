import re
from typing import Any

from ..models import ComplianceRule, Finding


def _eval_equals(actual: Any, expected: Any) -> bool:
    if isinstance(actual, bool) and isinstance(expected, bool):
        return actual == expected
    return str(actual).strip().lower() == str(expected).strip().lower()


def _eval_not_equals(actual: Any, expected: Any) -> bool:
    if isinstance(actual, bool) and isinstance(expected, bool):
        return actual != expected
    return str(actual).strip().lower() != str(expected).strip().lower()


def _eval_contains(actual: Any, expected: Any) -> bool:
    if actual is None:
        return False
    return str(expected).lower() in str(actual).lower()


def _eval_not_contains(actual: Any, expected: Any) -> bool:
    if actual is None:
        return True
    return str(expected).lower() not in str(actual).lower()


def _eval_in(actual: Any, expected: Any) -> bool:
    if actual is None:
        return False
    if isinstance(expected, (list, tuple, set)):
        return actual in expected or str(actual) in [str(x) for x in expected]
    return str(actual).lower() in str(expected).lower()


def _eval_not_in(actual: Any, expected: Any) -> bool:
    if actual is None:
        return True
    if isinstance(expected, (list, tuple, set)):
        return actual not in expected and str(actual) not in [str(x) for x in expected]
    return str(actual).lower() not in str(expected).lower()


def _eval_regex(actual: Any, expected: Any) -> bool:
    if actual is None:
        return False
    return bool(re.search(str(expected), str(actual), re.IGNORECASE))


def _eval_greater_than(actual: Any, expected: Any) -> bool:
    try:
        return float(actual) > float(expected)
    except (ValueError, TypeError):
        return False


def _eval_less_than(actual: Any, expected: Any) -> bool:
    try:
        return float(actual) < float(expected)
    except (ValueError, TypeError):
        return False


def _eval_exists(actual: Any, expected: Any) -> bool:
    return actual is not None and actual != ""


def _eval_not_exists(actual: Any, expected: Any) -> bool:
    return actual is None or actual == ""


_OPERATOR_HANDLERS = {
    "equals": _eval_equals,
    "not_equals": _eval_not_equals,
    "contains": _eval_contains,
    "not_contains": _eval_not_contains,
    "in": _eval_in,
    "not_in": _eval_not_in,
    "regex": _eval_regex,
    "greater_than": _eval_greater_than,
    "less_than": _eval_less_than,
    "exists": _eval_exists,
    "not_exists": _eval_not_exists,
}


def _evaluate_operator(operator: str, actual: Any, expected: Any) -> bool:
    """Evaluate generic rule operators against actual vs expected values."""
    op = (operator or "equals").lower()
    handler = _OPERATOR_HANDLERS.get(op)
    if handler:
        return handler(actual, expected)
    return actual == expected


def _is_vendor_applicable(vendor: str, rule_vendors: list[str]) -> bool:
    if not rule_vendors or "*" in rule_vendors:
        return True
    v_norm = (vendor or "").lower().strip().replace("-", "_")
    for r in rule_vendors:
        r_norm = r.lower().strip().replace("-", "_")
        if r_norm == "*" or r_norm == v_norm or r_norm in v_norm or v_norm in r_norm:
            return True
        for prefix in ("sonic", "cisco", "juniper", "arista", "fortinet", "mikrotik"):
            if prefix in v_norm and prefix in r_norm:
                return True
    return False


def _is_platform_applicable(os_version: str | None, rule_platforms: list[str]) -> bool:
    if not rule_platforms or "*" in rule_platforms:
        return True
    if not os_version:
        return True  # If rule specifies platform list without "*", platform check applies if matched
    return any(p.lower() in os_version.lower() for p in rule_platforms)


_NO_SNMP_PUBLIC = "no snmp-server community public"
_NTP_SERVER_CMD = "ntp server 10.0.0.1"
_VENDOR_PREFIXES = ("sonic", "cisco", "juniper", "arista", "fortinet", "mikrotik")

_COMMON_CLI_FIXES: dict[str, dict[str, str]] = {
    "telnet_enabled": {
        "juniper_junos": "delete system services telnet",
        "cisco_ios": "line vty 0 4\n transport input ssh",
        "arista_eos": "no management telnet",
        "sonic": "sudo systemctl stop telnet\nsudo systemctl disable telnet",
        "*": "no service telnet",
    },
    "http_mgmt_enabled": {
        "juniper_junos": "delete system services web-management http",
        "cisco_ios": "no ip http server",
        "arista_eos": "no management api http-commands\n no protocol http",
        "sonic": "sudo systemctl stop nginx\nsudo systemctl disable nginx",
        "*": "no ip http server",
    },
    "ssh_version": {
        "juniper_junos": "set system services ssh protocol-version v2",
        "cisco_ios": "ip ssh version 2",
        "arista_eos": "management ssh\n protocol 2",
        "sonic": "sudo sed -i 's/^#*Protocol.*/Protocol 2/' /etc/ssh/sshd_config\nsudo systemctl restart ssh",
        "*": "ip ssh version 2",
    },
    "password_encryption": {
        "juniper_junos": "set system login password format sha512",
        "cisco_ios": "service password-encryption",
        "sonic": "sudo authconfig --passalgo=sha512 --update",
        "*": "service password-encryption",
    },
    "snmp_community_public": {
        "juniper_junos": "delete snmp community public",
        "cisco_ios": _NO_SNMP_PUBLIC,
        "sonic": "config snmp community del public",
        "*": _NO_SNMP_PUBLIC,
    },
    "snmp_community_default": {
        "juniper_junos": "delete snmp community public\ndelete snmp community private",
        "cisco_ios": f"{_NO_SNMP_PUBLIC}\nno snmp-server community private",
        "sonic": "config snmp community del public\nconfig snmp community del private",
        "*": _NO_SNMP_PUBLIC,
    },
    "syslog_server": {
        "juniper_junos": "set system syslog host 10.0.0.5 any any",
        "cisco_ios": "logging host 10.0.0.5",
        "sonic": "config syslog add 10.0.0.5",
        "*": "logging host 10.0.0.5",
    },
    "logging_enabled": {
        "juniper_junos": "set system syslog host 10.0.0.5 any any",
        "cisco_ios": "logging on\nlogging host 10.0.0.5",
        "sonic": "config syslog add 10.0.0.5",
        "*": "logging on",
    },
    "ntp_server": {
        "juniper_junos": "set system ntp server 10.0.0.1",
        "cisco_ios": _NTP_SERVER_CMD,
        "sonic": "config ntp add 10.0.0.1",
        "*": _NTP_SERVER_CMD,
    },
    "ntp_configured": {
        "juniper_junos": "set system ntp server 10.0.0.1",
        "cisco_ios": _NTP_SERVER_CMD,
        "sonic": "config ntp add 10.0.0.1",
        "*": _NTP_SERVER_CMD,
    },
    "acl_default_deny": {
        "juniper_junos": "set firewall filter PROTECT term deny-all then discard",
        "cisco_ios": "access-list 101 deny ip any any",
        "sonic": "config acl add rule TABLE_NAME RULE_DENY --action DROP",
        "*": "access-list 101 deny ip any any",
    },
    "https_mgmt_enabled": {
        "juniper_junos": "set system services web-management https",
        "cisco_ios": "ip http secure-server",
        "sonic": "config rest-server enable",
        "*": "ip http secure-server",
    },
    "snmp_version": {
        "juniper_junos": "set snmp v3 usm local-user admin",
        "cisco_ios": "snmp-server group v3group v3 priv",
        "sonic": "config snmp user add v3admin auth-sha priv-aes",
        "*": "snmp-server group v3group v3 priv",
    },
    "aaa_enabled": {
        "juniper_junos": "set system authentication-order [ tacplus radius password ]",
        "cisco_ios": "aaa new-model\naaa authentication login default group tacacs+ local",
        "sonic": "config aaa authentication login local tacacs+",
        "*": "aaa new-model",
    },
}


def _is_vendor_key_match(k_clean: str, v_clean: str) -> bool:
    if k_clean == v_clean or k_clean in v_clean or v_clean in k_clean:
        return True
    return any(p in k_clean and p in v_clean for p in _VENDOR_PREFIXES)


def _find_vendor_remediation(remediation_map: dict[str, Any] | None, v_clean: str) -> Any:
    if not remediation_map:
        return None
    for k, v in remediation_map.items():
        k_clean = k.lower().replace("-", "_")
        if _is_vendor_key_match(k_clean, v_clean):
            return v
    return remediation_map.get("*") or remediation_map.get("default")


def _extract_remediation_info(
    remediation_dict: dict[str, Any], vendor: str, canonical_key: str = ""
) -> tuple[str | None, bool | None]:
    v_clean = (vendor or "").lower().replace("-", "_")
    rem_val = _find_vendor_remediation(remediation_dict, v_clean) if (remediation_dict and vendor) else None

    if rem_val is None and canonical_key in _COMMON_CLI_FIXES:
        rem_val = _find_vendor_remediation(_COMMON_CLI_FIXES[canonical_key], v_clean)

    if rem_val is None:
        return None, None

    if isinstance(rem_val, dict):
        cmd = rem_val.get("command") or rem_val.get("cli") or rem_val.get("description")
        verified = rem_val.get("verified")
        return cmd, (True if verified is None else bool(verified))

    return str(rem_val), True


def _generate_default_cli_fix(vendor: str, canonical_key: str, title: str, expected: Any) -> str:
    v = (vendor or "").lower()
    clean_k = (canonical_key or "setting").replace("_enabled", "").replace("_configured", "").replace("_", " ")
    is_disable = ("disable" in title.lower()) or (expected is False) or ("no " in title.lower())

    if "juniper" in v:
        return f"delete system services {clean_k}" if is_disable else f"set system {clean_k} enable"
    if "cisco" in v or "arista" in v:
        return f"no {clean_k}" if is_disable else f"{clean_k} enable"
    if "sonic" in v:
        hyphen_k = clean_k.replace(" ", "-")
        return f"config {hyphen_k} disable" if is_disable else f"config {hyphen_k} enable"

    return f"# Enforce {clean_k}: security baseline for {title}"


def _determine_control_status(
    controls: dict, ck: str, operator: str | None, expected: Any
) -> tuple[str, Any]:
    if ck not in controls:
        op = (operator or "equals").lower()
        if op == "not_exists":
            return "pass", None
        if op == "exists":
            return "fail", None
        return "unknown", None

    actual = controls[ck]
    is_pass = _evaluate_operator(operator, actual, expected)
    return ("pass" if is_pass else "fail"), actual


def _resolve_remediation(
    status: str, rule: ComplianceRule, vendor: str, ck: str
) -> tuple[str | None, bool | None]:
    if status != "fail":
        return None, None
    rem_cmd, rem_verified = _extract_remediation_info(rule.remediation, vendor, canonical_key=ck)
    if not rem_cmd:
        rem_cmd = _generate_default_cli_fix(vendor, ck, rule.title, rule.expected)
        rem_verified = True
    return rem_cmd, rem_verified


def _evaluate_single_rule(
    controls: dict,
    vendor: str,
    rule: ComplianceRule,
    os_version: str | None = None,
) -> Finding:
    ck = rule.canonical_key or rule.target_field or ""
    ctrl_id = rule.control_id or rule.rule_id or "RULE-0"

    # 1. Vendor & Platform Applicability
    if not _is_vendor_applicable(vendor, rule.vendors) or not _is_platform_applicable(
        os_version, rule.platforms
    ):
        return Finding(
            control_id=ctrl_id,
            rule_id=ctrl_id,
            title=rule.title,
            framework=rule.framework,
            framework_reference=rule.framework_reference,
            canonical_key=ck,
            operator=rule.operator,
            expected=rule.expected,
            actual=controls.get(ck),
            status="not_applicable",
            severity=rule.severity,
            source=rule.source,
            verified=rule.verified,
            remediation=None,
            remediation_verified=None,
        )

    # 2. Key Presence & Operator Evaluation
    status, actual = _determine_control_status(controls, ck, rule.operator, rule.expected)

    # 3. Remediation resolution
    rem_cmd, rem_verified = _resolve_remediation(status, rule, vendor, ck)

    return Finding(
        control_id=ctrl_id,
        rule_id=ctrl_id,
        title=rule.title,
        framework=rule.framework,
        framework_reference=rule.framework_reference,
        canonical_key=ck,
        operator=rule.operator,
        expected=rule.expected,
        actual=actual,
        status=status,
        severity=rule.severity,
        source=rule.source,
        verified=rule.verified,
        remediation=rem_cmd,
        remediation_verified=rem_verified,
    )


def evaluate_controls(
    controls: dict,
    vendor: str,
    rules: list[ComplianceRule],
    os_version: str | None = None,
) -> list[Finding]:
    """Walk a device's normalized controls against one framework's rule set (Phase 3 Engine)."""
    return [_evaluate_single_rule(controls, vendor, rule, os_version) for rule in rules]


def summarize(findings: list[Finding]) -> dict[str, int]:
    summary = {"pass": 0, "fail": 0, "unknown": 0, "not_applicable": 0}
    for finding in findings:
        status = finding.status
        if status in summary:
            summary[status] += 1
        else:
            summary[status] = 1
    return summary
