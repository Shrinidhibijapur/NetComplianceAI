import pytest

from app.compliance.engine import evaluate_controls, summarize
from app.rules.loader import UnknownFrameworkError, load_rules


def test_load_cis_rules():
    rules = load_rules("CIS")
    assert len(rules) == 8
    assert {r.canonical_key for r in rules} >= {"ssh_version", "telnet_enabled", "acl_default_deny"}


def test_load_unknown_framework_raises():
    with pytest.raises(UnknownFrameworkError):
        load_rules("MADE_UP_FRAMEWORK")


def test_evaluate_hardened_cisco_device_passes_everything_it_can_see():
    controls = {
        "ssh_version": "2",
        "telnet_enabled": False,
        "http_mgmt_enabled": False,
        "password_encryption": "type7",
        "logging_enabled": True,
        "ntp_configured": True,
        "acl_default_deny": True,
        "snmp_community_default": True,  # bad: default community present -> should FAIL
    }
    rules = load_rules("CIS")
    findings = evaluate_controls(controls, "cisco_ios", rules)
    summary = summarize(findings)

    assert summary == {"pass": 7, "fail": 1, "unknown": 0}

    failed = next(f for f in findings if f.status == "fail")
    assert failed.canonical_key == "snmp_community_default"
    assert failed.remediation is not None
    assert "snmp-server community" in failed.remediation


def test_evaluate_missing_control_is_unknown_not_fail():
    controls = {"ssh_version": "2"}  # everything else unparsed/unavailable
    rules = load_rules("CIS")
    findings = evaluate_controls(controls, "juniper_junos", rules)
    summary = summarize(findings)

    assert summary["unknown"] == 7
    assert summary["pass"] == 1
    assert all(f.remediation is None for f in findings if f.status == "unknown")
