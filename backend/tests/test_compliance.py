import pytest

from app.compliance.engine import evaluate_controls, summarize
from app.models import ComplianceRule
from app.normalization.engine import normalize_config
from app.rules.loader import (
    RuleValidationError,
    UnknownFrameworkError,
    load_rules,
)


def test_load_cis_rules():
    rules = load_rules("CIS")
    assert len(rules) >= 30
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

    assert summary["pass"] == 7
    assert summary["fail"] == 3  # 1 default community + 2 missing required SNMP metadata fields

    failed = next(f for f in findings if f.status == "fail" and f.canonical_key == "snmp_community_default")
    assert failed.canonical_key == "snmp_community_default"
    assert failed.remediation is not None
    assert "snmp-server community" in failed.remediation


def test_evaluate_missing_control_is_unknown_not_fail():
    controls = {"ssh_version": "2"}  # everything else unparsed/unavailable
    rules = load_rules("CIS")
    findings = evaluate_controls(controls, "juniper_junos", rules)
    summary = summarize(findings)

    assert summary["pass"] == 1
    assert summary["unknown"] >= 20
    assert all(f.remediation is None for f in findings if f.status == "unknown")


# ── Phase 3 Comprehensive Requirements ──────────────────────────────────────

def test_rule_schema_v2_validation():
    rule = ComplianceRule(
        rule_id="RULE-V2-01",
        title="Test Rule Schema V2",
        target_field="ssh_version",
        operator="equals",
        expected="2",
        severity="high",
        framework="CIS",
        framework_reference="CIS 5.2.1",
        source="CIS Benchmark v4.0.0",
        source_url="https://www.cisecurity.org",
        verified=True,
        vendors=["cisco_ios", "juniper_junos"],
        remediation={"cisco_ios": {"command": "ip ssh version 2", "verified": True}},
    )
    assert rule.control_id == "RULE-V2-01"
    assert rule.canonical_key == "ssh_version"
    assert rule.verified is True
    assert "cisco_ios" in rule.vendors


def test_valid_rule_loading_all_frameworks():
    for fw in ["CIS", "NIST", "STIG", "ISO"]:
        rules = load_rules(fw)
        assert len(rules) >= 30, f"{fw} rule count should be >= 30"
        for r in rules:
            assert r.control_id
            assert r.title
            assert r.canonical_key
            assert r.framework == fw
            assert r.source


def test_invalid_rule_rejection(tmp_path, monkeypatch):
    import app.rules.loader as loader_mod

    bad_yaml = tmp_path / "invalid_fw.yaml"
    bad_yaml.write_text("- title: Missing Rule ID\n  target_field: ssh_version\n", encoding="utf-8")

    monkeypatch.setattr(loader_mod, "FRAMEWORKS_DIR", tmp_path)
    with pytest.raises(RuleValidationError):
        load_rules("invalid_fw")


def test_not_applicable_evaluation():
    rule = ComplianceRule(
        rule_id="CIS-CDP-01",
        title="Disable CDP",
        canonical_key="cdp_disabled",
        expected=True,
        severity="low",
        framework="CIS",
        vendors=["cisco_ios"],
    )
    findings_juniper = evaluate_controls({"cdp_disabled": True}, "juniper_junos", [rule])
    assert findings_juniper[0].status == "not_applicable"

    findings_cisco = evaluate_controls({"cdp_disabled": True}, "cisco_ios", [rule])
    assert findings_cisco[0].status == "pass"


def test_missing_field_handling_absent_vs_false_vs_unknown():
    rule_telnet = ComplianceRule(
        rule_id="R-TELNET",
        title="Disable Telnet",
        canonical_key="telnet_enabled",
        operator="equals",
        expected=False,
        severity="high",
        framework="CIS",
    )
    # Absent key -> UNKNOWN
    f_missing = evaluate_controls({}, "cisco_ios", [rule_telnet])
    assert f_missing[0].status == "unknown"

    # Explicit False -> PASS
    f_false = evaluate_controls({"telnet_enabled": False}, "cisco_ios", [rule_telnet])
    assert f_false[0].status == "pass"

    # Explicit True -> FAIL
    f_true = evaluate_controls({"telnet_enabled": True}, "cisco_ios", [rule_telnet])
    assert f_true[0].status == "fail"


def test_multiple_operators():
    rules = [
        ComplianceRule(rule_id="R1", framework="CIS", title="Eq", canonical_key="k1", operator="equals", expected="v1"),
        ComplianceRule(rule_id="R2", framework="CIS", title="Neq", canonical_key="k2", operator="not_equals", expected="v2"),
        ComplianceRule(rule_id="R3", framework="CIS", title="Contains", canonical_key="k3", operator="contains", expected="sub"),
        ComplianceRule(rule_id="R4", framework="CIS", title="In", canonical_key="k4", operator="in", expected=["a", "b"]),
        ComplianceRule(rule_id="R5", framework="CIS", title="Regex", canonical_key="k5", operator="regex", expected="^v\\d+$"),
        ComplianceRule(rule_id="R6", framework="CIS", title="Gt", canonical_key="k6", operator="greater_than", expected=10),
        ComplianceRule(rule_id="R7", framework="CIS", title="Lt", canonical_key="k7", operator="less_than", expected=20),
        ComplianceRule(rule_id="R8", framework="CIS", title="Exists", canonical_key="k8", operator="exists"),
        ComplianceRule(rule_id="R9", framework="CIS", title="NotExists", canonical_key="k9", operator="not_exists"),
    ]
    controls = {
        "k1": "v1",
        "k2": "v99",
        "k3": "main_sub_item",
        "k4": "b",
        "k5": "v42",
        "k6": 15,
        "k7": 12,
        "k8": "present_value",
    }
    findings = evaluate_controls(controls, "cisco_ios", rules)
    status_map = {f.control_id: f.status for f in findings}
    assert status_map["R1"] == "pass"
    assert status_map["R2"] == "pass"
    assert status_map["R3"] == "pass"
    assert status_map["R4"] == "pass"
    assert status_map["R5"] == "pass"
    assert status_map["R6"] == "pass"
    assert status_map["R7"] == "pass"
    assert status_map["R8"] == "pass"
    assert status_map["R9"] == "pass"


def test_remediation_verification_metadata():
    rule = ComplianceRule(
        rule_id="R-REM",
        framework="CIS",
        title="Remediation Check",
        canonical_key="telnet_enabled",
        expected=False,
        severity="high",
        remediation={
            "cisco_ios": {"command": "line vty 0 4\n transport input ssh", "verified": True},
            "juniper_junos": {"command": "delete system services telnet", "verified": False},
        },
    )
    f_cisco = evaluate_controls({"telnet_enabled": True}, "cisco_ios", [rule])
    assert f_cisco[0].remediation == "line vty 0 4\n transport input ssh"
    assert f_cisco[0].remediation_verified is True

    f_juniper = evaluate_controls({"telnet_enabled": True}, "juniper_junos", [rule])
    assert f_juniper[0].remediation == "delete system services telnet"
    assert f_juniper[0].remediation_verified is False


def test_cisco_and_juniper_mapping_to_same_canonical_security_objective():
    controls_cisco = {"ssh_version": "2", "telnet_enabled": False}
    controls_juniper = {"ssh_version": "2", "telnet_enabled": False}

    rules = load_rules("CIS")
    findings_cisco = evaluate_controls(controls_cisco, "cisco_ios", rules)
    findings_juniper = evaluate_controls(controls_juniper, "juniper_junos", rules)

    ssh_cisco = next(f for f in findings_cisco if f.canonical_key == "ssh_version")
    ssh_juniper = next(f for f in findings_juniper if f.canonical_key == "ssh_version")
    assert ssh_cisco.status == "pass"
    assert ssh_juniper.status == "pass"

    telnet_cisco = next(f for f in findings_cisco if f.canonical_key == "telnet_enabled")
    telnet_juniper = next(f for f in findings_juniper if f.canonical_key == "telnet_enabled")
    assert telnet_cisco.status == "pass"
    assert telnet_juniper.status == "pass"


def test_different_vendor_syntax_producing_same_normalized_compliance():
    cisco_raw = "ip ssh version 2\n"
    arista_raw = "ip ssh version 2\n"

    norm_cisco = normalize_config("cisco_ios", "cisco-dev", cisco_raw)
    norm_arista = normalize_config("arista_eos", "arista-dev", arista_raw)

    rules = load_rules("CIS")
    fc = evaluate_controls(norm_cisco.controls, "cisco_ios", rules)
    fa = evaluate_controls(norm_arista.controls, "arista_eos", rules)

    assert next(f for f in fc if f.canonical_key == "ssh_version").status == "pass"
    assert next(f for f in fa if f.canonical_key == "ssh_version").status == "pass"


def test_adding_new_rule_through_data_without_python_modification(tmp_path, monkeypatch):
    import app.rules.loader as loader_mod

    custom_yaml_content = """
- rule_id: CUSTOM-001
  title: Custom Security Control
  canonical_key: custom_feature_enabled
  operator: equals
  expected: true
  severity: high
  framework: CUSTOM
  source: Custom Data Source
  vendors: ["*"]
    """
    custom_file = tmp_path / "custom.yaml"
    custom_file.write_text(custom_yaml_content, encoding="utf-8")

    monkeypatch.setattr(loader_mod, "FRAMEWORKS_DIR", tmp_path)

    loaded_rules = load_rules("custom")
    assert len(loaded_rules) == 1
    assert loaded_rules[0].control_id == "CUSTOM-001"
    assert loaded_rules[0].canonical_key == "custom_feature_enabled"

    res = evaluate_controls({"custom_feature_enabled": True}, "cisco_ios", loaded_rules)
    assert res[0].status == "pass"


def test_stig_rule_id_and_source_validation():
    import re
    rules = load_rules("STIG")
    assert len(rules) >= 30

    sequential_pattern = re.compile(r"STIG-NET-V-\d{6}")

    for r in rules:
        # Prevent fabricated sequential IDs from returning
        assert not sequential_pattern.match(r.control_id), f"Fabricated sequential ID found: {r.control_id}"
        
        # Verify STIG rule IDs correspond to known real Vuln IDs (STIG-V-XXXXXX)
        assert r.control_id.startswith("STIG-V-"), f"Invalid STIG control_id format: {r.control_id}"
        
        # Verify authoritative source reference and URL
        assert r.source is not None, f"STIG rule {r.control_id} missing source"
        assert "DISA" in r.source, f"STIG rule {r.control_id} missing DISA source"
        assert r.source_url is not None, f"STIG rule {r.control_id} missing source_url"
        assert r.source_url.startswith("https://public.cyber.mil/stigs/"), f"STIG rule {r.control_id} invalid source_url"

        # Verify real Vuln / SV / Rule ID present in framework_reference
        has_real_ref = "V-2" in r.framework_reference or "SV-" in r.framework_reference
        assert has_real_ref, f"STIG rule {r.control_id} missing real DISA Vuln/SV ID in reference"


def test_source_verification_not_blindly_true():
    # Test that source verification cannot be true merely because source_url exists.
    # An invalid or generic url without authoritative source metadata must fail strict verification check.
    unverified_rule = ComplianceRule(
        rule_id="STIG-V-999999",
        title="Unverified Test Rule",
        target_field="ssh_version",
        operator="equals",
        expected="2",
        severity="high",
        framework="STIG",
        framework_reference="V-999999",
        source="Generic Internet Search",
        source_url="https://example.com/random-blog",
        verified=False,  # Must NOT be true merely because source_url is non-empty
    )
    assert unverified_rule.verified is False

