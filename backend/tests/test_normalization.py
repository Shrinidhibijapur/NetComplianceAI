from pathlib import Path

from app.normalization.engine import normalize_config

FIXTURES = Path(__file__).parent / "fixtures"


def test_cisco_ios_normalization():
    raw = (FIXTURES / "cisco_ios_sample.cfg").read_text()
    result = normalize_config("cisco_ios", "core-sw-01", raw)

    assert result.controls["ssh_version"] == "2"
    assert result.controls["telnet_enabled"] is False
    assert result.controls["http_mgmt_enabled"] is False
    assert result.controls["password_encryption"] == "type7"
    assert result.controls["logging_enabled"] is True
    assert result.controls["ntp_configured"] is True
    assert result.controls["acl_default_deny"] is True
    assert result.controls["snmp_community_default"] is True
    assert any("quantum-flux" in line for line in result.raw_unmapped_lines)
    # 8 of 12 meaningful lines recognized (see NormalizedConfig.parse_confidence)
    assert result.parse_confidence == round(8 / 12, 2)


def test_juniper_junos_normalization():
    raw = (FIXTURES / "juniper_junos_sample.cfg").read_text()
    result = normalize_config("juniper_junos", "edge-fw-01", raw)

    assert result.controls["ssh_version"] == "2"
    assert "telnet_enabled" not in result.controls  # not configured -> unknown, not asserted
    assert result.controls["http_mgmt_enabled"] is True
    assert result.controls["logging_enabled"] is True
    assert result.controls["ntp_configured"] is True
    assert result.controls["acl_default_deny"] is True
    assert result.controls["snmp_community_default"] is True
    assert any("unknown-knob" in line for line in result.raw_unmapped_lines)


def test_vendor_with_no_l1_rules_falls_through_entirely_to_raw_lines():
    raw = (FIXTURES / "sonic_sample.cfg").read_text()
    result = normalize_config("sonic_whitebox", "sonic-01", raw)

    assert result.controls == {}
    assert result.parse_confidence == 0.0
    assert any("ssh-server enable" in line for line in result.raw_unmapped_lines)
    assert len(result.raw_unmapped_lines) == 4  # every non-comment line, none matched
