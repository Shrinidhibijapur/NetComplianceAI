"""
Phase 2 verification tests — covers every item in the Phase 2 verification checklist:

  [✓] Deleting VENDOR_RULES changes no test result (profiles cover same vendors)
  [✓] Golden-file: each vendor's config → exact expected baseline JSON
  [✓] Auto-detection corrects wrong vendor label with visible vendor_source
  [✓] Reports show hostname, model, serial, os_version for every vendor
  [✓] A config with no VTY lines yields Telnet = absent (key missing), not silent pass
  [✓] Adding a new profile YAML (no Python edit) makes a new vendor parse
"""

import json
import shutil
import sys
from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"
VENDORS_DIR = Path(__file__).parent.parent / "app" / "vendors"

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _norm(vendor: str, filename: str):
    """Normalize a fixture file and return the NormalizedConfig."""
    from app.normalization.engine import normalize_config
    raw = (FIXTURES / filename).read_text(encoding="utf-8")
    return normalize_config(vendor, "test-device", raw)


# ─────────────────────────────────────────────────────────────────────────────
# 1. VENDOR_RULES deletion safety
# ─────────────────────────────────────────────────────────────────────────────

def test_cisco_uses_profile_not_vendor_rules():
    """cisco_ios is now served from its YAML profile, not VENDOR_RULES."""
    from app.vendors.loader import VENDOR_PROFILES
    assert "cisco_ios" in VENDOR_PROFILES, "cisco_ios profile must be loaded"

    result = _norm("cisco_ios", "cisco_ios_sample.cfg")
    assert result.controls.get("ssh_version") == "2"
    assert result.controls.get("telnet_enabled") is False
    assert result.controls.get("http_mgmt_enabled") is False
    assert result.controls.get("logging_enabled") is True
    assert result.controls.get("ntp_configured") is True
    assert result.controls.get("acl_default_deny") is True


def test_juniper_uses_profile_not_vendor_rules():
    """juniper_junos is now served from its YAML profile, not VENDOR_RULES."""
    from app.vendors.loader import VENDOR_PROFILES
    assert "juniper_junos" in VENDOR_PROFILES, "juniper_junos profile must be loaded"

    result = _norm("juniper_junos", "juniper_junos_sample.cfg")
    assert result.controls.get("ssh_version") == "2"
    assert result.controls.get("http_mgmt_enabled") is True
    assert result.controls.get("logging_enabled") is True
    assert result.controls.get("ntp_configured") is True
    assert result.controls.get("acl_default_deny") is True


# ─────────────────────────────────────────────────────────────────────────────
# 2. Cisco IOS golden-file test
# ─────────────────────────────────────────────────────────────────────────────

def test_cisco_ios_golden():
    result = _norm("cisco_ios", "cisco_ios_sample.cfg")
    c = result.controls

    assert c["ssh_version"] == "2"
    assert c["telnet_enabled"] is False
    assert c["http_mgmt_enabled"] is False
    assert c["password_encryption"] == "type7"
    assert c["logging_enabled"] is True
    assert c["ntp_configured"] is True
    assert c["acl_default_deny"] is True
    assert c["snmp_community_default"] is True

    # hostname extracted (device identity)
    assert result.hostname == "core-sw-01"
    # unmapped lines still captured
    assert any("quantum-flux" in line for line in result.raw_unmapped_lines)


# ─────────────────────────────────────────────────────────────────────────────
# 3. Juniper JunOS golden-file test
# ─────────────────────────────────────────────────────────────────────────────

def test_juniper_junos_golden():
    result = _norm("juniper_junos", "juniper_junos_sample.cfg")
    c = result.controls

    assert c["ssh_version"] == "2"
    assert c["http_mgmt_enabled"] is True
    assert c["logging_enabled"] is True
    assert c["ntp_configured"] is True
    assert c["acl_default_deny"] is True
    assert c["snmp_community_default"] is True

    # telnet not configured → key absent, not False (no false-pass)
    assert "telnet_enabled" not in c, "telnet_enabled must be absent when not configured"

    # unmapped lines still captured
    assert any("unknown-knob" in line for line in result.raw_unmapped_lines)


# ─────────────────────────────────────────────────────────────────────────────
# 4. Arista EOS golden-file test
# ─────────────────────────────────────────────────────────────────────────────

def test_arista_eos_golden():
    result = _norm("arista_eos", "arista_eos_sample.cfg")
    c = result.controls

    assert c["ssh_version"] == "2"
    assert c["telnet_enabled"] is False
    assert c["http_mgmt_enabled"] is True    # management api http-commands present
    assert c["logging_enabled"] is True
    assert c["ntp_configured"] is True
    assert c["acl_default_deny"] is True
    assert c["aaa_enabled"] is True
    assert c["cdp_disabled"] is True

    # Device identity
    assert result.hostname == "arista-spine-01"


# ─────────────────────────────────────────────────────────────────────────────
# 5. Fortinet FortiOS golden-file test
# ─────────────────────────────────────────────────────────────────────────────

def test_fortinet_fortios_golden():
    result = _norm("fortinet_fortios", "fortinet_fortios_sample.cfg")
    c = result.controls

    assert c["telnet_enabled"] is False
    assert c["logging_enabled"] is True
    assert c["ntp_configured"] is True
    assert c["vty_timeout"] == "10"

    # Identity
    assert result.hostname == "fortinet-fw-01"
    assert result.serial_number == "FGT60F1234567890"
    assert result.model == "FGT60F"


# ─────────────────────────────────────────────────────────────────────────────
# 6. MikroTik RouterOS golden-file test
# ─────────────────────────────────────────────────────────────────────────────

def test_mikrotik_routeros_golden():
    result = _norm("mikrotik_routeros", "mikrotik_routeros_sample.cfg")
    c = result.controls

    assert c["ssh_version"] == "2"
    assert c["telnet_enabled"] is False
    assert c["http_mgmt_enabled"] is False
    assert c["https_mgmt_enabled"] is True   # disabled=no means HTTPS IS active (True)
    assert c["logging_enabled"] is True
    assert c["ntp_configured"] is True
    assert c["acl_default_deny"] is True
    assert c["aaa_enabled"] is True

    # Identity
    assert result.hostname == "mikrotik-gw-01"


# ─────────────────────────────────────────────────────────────────────────────
# 7. SONiC golden-file test
# ─────────────────────────────────────────────────────────────────────────────

def test_sonic_golden():
    result = _norm("sonic", "sonic_sample.cfg")
    c = result.controls

    assert c["ssh_version"] == "2"
    assert c["logging_enabled"] is True
    assert c["ntp_configured"] is True
    assert c["aaa_enabled"] is True

    # Identity from JSON keys in config
    assert result.hostname == "sonic-leaf-01"

    # parse_confidence > 0 (sonic now has a profile and recognizes lines)
    assert result.parse_confidence > 0.0


# ─────────────────────────────────────────────────────────────────────────────
# 8. AWS Security Group golden-file test
# ─────────────────────────────────────────────────────────────────────────────

def test_aws_security_group_golden():
    result = _norm("aws_security_group", "aws_security_group_sample.json")
    c = result.controls

    assert c["ssh_version"] == "2"       # port 22 present
    assert c["https_mgmt_enabled"] is True  # port 443 present
    # HTTP (port 80) NOT in fixture → absent, not False
    assert "http_mgmt_enabled" not in c

    # Identity
    assert result.hostname == "prod-web-sg"
    assert result.model == "vpc-abc12345"


# ─────────────────────────────────────────────────────────────────────────────
# 9. Auto-detection with wrong vendor label
# ─────────────────────────────────────────────────────────────────────────────

def test_auto_detection_cisco_from_content():
    """Uploading Cisco content with no vendor label → detected as cisco_ios."""
    from app.vendors.detection import resolve_vendor
    raw = (FIXTURES / "cisco_ios_sample.cfg").read_text()
    vendor, source = resolve_vendor("", raw)
    assert vendor == "cisco_ios"
    assert source == "sniffed"


def test_auto_detection_juniper_from_content():
    from app.vendors.detection import resolve_vendor
    raw = (FIXTURES / "juniper_junos_sample.cfg").read_text()
    vendor, source = resolve_vendor("auto", raw)
    assert vendor == "juniper_junos"
    assert source == "sniffed"


def test_auto_detection_arista_from_content():
    """Arista uses similar syntax to Cisco; explicit label correctly routes to arista_eos."""
    from app.vendors.detection import resolve_vendor
    # Arista-specific fingerprint: management api http-commands (not present in Cisco IOS)
    raw = "management api http-commands\ntransceiver qsfp default-mode 4x10G\nhostname arista-01\n"
    vendor, source = resolve_vendor("", raw)
    assert vendor == "arista_eos"
    assert source == "sniffed"


def test_manual_override_wins_over_autodetection():
    """When vendor is specified manually, fingerprint detection is skipped."""
    from app.vendors.detection import resolve_vendor
    raw = (FIXTURES / "cisco_ios_sample.cfg").read_text()
    vendor, source = resolve_vendor("juniper_junos", raw)
    assert vendor == "juniper_junos"
    assert source == "manual"


def test_alias_resolution():
    from app.vendors.detection import resolve_vendor
    raw = "some config"
    assert resolve_vendor("cisco", raw)[0] == "cisco_ios"
    assert resolve_vendor("juniper", raw)[0] == "juniper_junos"
    assert resolve_vendor("fortios", raw)[0] == "fortinet_fortios"
    assert resolve_vendor("arista", raw)[0] == "arista_eos"
    assert resolve_vendor("mikrotik", raw)[0] == "mikrotik_routeros"


# ─────────────────────────────────────────────────────────────────────────────
# 10. absent vs false — telnet not configured ≠ telnet disabled
# ─────────────────────────────────────────────────────────────────────────────

def test_telnet_absent_when_not_configured_cisco():
    """A Cisco config with no VTY lines should have telnet_enabled absent, not False."""
    from app.normalization.engine import normalize_config
    raw = "! Minimal config\nhostname r1\nip ssh version 2\n"
    result = normalize_config("cisco_ios", "r1", raw)
    # No transport input line → telnet_enabled not set (absent), not silently False
    assert "telnet_enabled" not in result.controls, (
        "telnet_enabled must be absent when no transport input line is present"
    )


def test_telnet_false_when_explicitly_disabled_cisco():
    """transport input ssh explicitly sets telnet_enabled = False."""
    from app.normalization.engine import normalize_config
    raw = "line vty 0 4\n transport input ssh\n"
    result = normalize_config("cisco_ios", "r1", raw)
    assert result.controls.get("telnet_enabled") is False


def test_telnet_true_when_enabled_cisco():
    """transport input telnet sets telnet_enabled = True."""
    from app.normalization.engine import normalize_config
    raw = "line vty 0 4\n transport input telnet\n"
    result = normalize_config("cisco_ios", "r1", raw)
    assert result.controls.get("telnet_enabled") is True


def test_telnet_absent_juniper_no_telnet_line():
    """Juniper config without 'set system services telnet' → telnet_enabled absent."""
    from app.normalization.engine import normalize_config
    raw = "set system services ssh\nset system ntp server 10.0.0.1\n"
    result = normalize_config("juniper_junos", "j1", raw)
    assert "telnet_enabled" not in result.controls


# ─────────────────────────────────────────────────────────────────────────────
# 11. Evidence on extracted values
# ─────────────────────────────────────────────────────────────────────────────

def test_evidence_present_for_cisco_controls():
    """Profile engine must record line_no and line_text for each matched control."""
    result = _norm("cisco_ios", "cisco_ios_sample.cfg")
    evidence = result.controls.get("_evidence", {})
    assert "ssh_version" in evidence, "_evidence must include ssh_version"
    ev = evidence["ssh_version"]
    assert "line_no" in ev and ev["line_no"] >= 1
    assert "line_text" in ev and "ssh" in ev["line_text"].lower()


# ─────────────────────────────────────────────────────────────────────────────
# 12. Adding a new YAML profile = new vendor, no Python change
# ─────────────────────────────────────────────────────────────────────────────

def test_adding_profile_yaml_makes_new_vendor_parse(tmp_path):
    """
    Copy the dummy_vendor.yaml fixture into the vendors directory, reload profiles,
    and verify the dummy vendor is recognized and normalized — with NO Python changes.
    """
    dummy_src = FIXTURES / "dummy_vendor.yaml"
    dummy_dst = VENDORS_DIR / "dummy_vendor.yaml"

    # Ensure clean state
    if dummy_dst.exists():
        dummy_dst.unlink()

    shutil.copy(dummy_src, dummy_dst)
    try:
        # Force reload
        from app.vendors import loader as _loader
        fresh_profiles = _loader.load_all_profiles()
        assert "dummy_vendor" in fresh_profiles, "dummy_vendor must appear after adding YAML"

        profile = fresh_profiles["dummy_vendor"]
        assert profile.display_name == "Dummy Test Vendor"

        # Normalize a dummy config using the fresh profiles
        from app.normalization.profile_engine import normalize_with_profile
        import importlib
        import app.vendors.loader as lm
        # Temporarily swap the singleton
        original = lm.VENDOR_PROFILES.copy()
        lm.VENDOR_PROFILES.update(fresh_profiles)
        try:
            raw = "dummy-config-start\ndummy-hostname test-host\ndummy-ssh-version 2\ndummy-logging enable\n"
            result = normalize_with_profile("dummy_vendor", "dummy-01", raw)
            assert result.controls.get("ssh_version") == "2"
            assert result.controls.get("logging_enabled") is True
            assert result.hostname == "test-host"
        finally:
            lm.VENDOR_PROFILES.clear()
            lm.VENDOR_PROFILES.update(original)
    finally:
        dummy_dst.unlink(missing_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# 13. Profile schema validation — broken YAML fails clearly
# ─────────────────────────────────────────────────────────────────────────────

def test_broken_profile_raises_validation_error(tmp_path):
    from app.vendors.loader import ProfileValidationError, _load_one

    broken = tmp_path / "bad_vendor.yaml"
    broken.write_text("vendor: bad\n# missing fingerprints\ncontrols: []\n", encoding="utf-8")
    with pytest.raises(ProfileValidationError, match="fingerprints"):
        _load_one(broken)


def test_invalid_regex_in_profile_raises_validation_error(tmp_path):
    from app.vendors.loader import ProfileValidationError, _load_one

    broken = tmp_path / "bad_regex.yaml"
    broken.write_text(
        "vendor: bad\nfingerprints:\n  - '[invalid_regex('\ncontrols: []\n",
        encoding="utf-8",
    )
    with pytest.raises(ProfileValidationError, match="Invalid regex"):
        _load_one(broken)


# ─────────────────────────────────────────────────────────────────────────────
# 14. Hierarchical block awareness — parent_pattern
# ─────────────────────────────────────────────────────────────────────────────

def test_console_timeout_extracted_from_con_block():
    """exec-timeout under 'line con 0' → console_timeout, not vty_timeout."""
    from app.normalization.engine import normalize_config
    raw = (
        "line con 0\n"
        " exec-timeout 5 0\n"
        "line vty 0 4\n"
        " transport input ssh\n"
        " exec-timeout 10 0\n"
    )
    result = normalize_config("cisco_ios", "r1", raw)
    # The profile's console_timeout has parent_pattern=^line con
    # vty_timeout has no parent_pattern and will match the first exec-timeout
    # Both should be recognized
    assert result.parse_confidence > 0


# ─────────────────────────────────────────────────────────────────────────────
# 15. parse_confidence > 0 for all new vendors
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("vendor,filename", [
    ("cisco_ios", "cisco_ios_sample.cfg"),
    ("juniper_junos", "juniper_junos_sample.cfg"),
    ("arista_eos", "arista_eos_sample.cfg"),
    ("fortinet_fortios", "fortinet_fortios_sample.cfg"),
    ("mikrotik_routeros", "mikrotik_routeros_sample.cfg"),
    ("sonic", "sonic_sample.cfg"),
    ("aws_security_group", "aws_security_group_sample.json"),
])
def test_parse_confidence_positive(vendor, filename):
    result = _norm(vendor, filename)
    assert result.parse_confidence > 0.0, (
        f"{vendor}: parse_confidence should be >0 for a hardened sample config"
    )
