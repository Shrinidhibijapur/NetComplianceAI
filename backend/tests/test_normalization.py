from pathlib import Path

import pytest

from app.normalization.engine import UnsupportedVendorError, normalize_config

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
    assert result.parse_confidence == round(8 / 9, 2)


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


def test_unsupported_vendor_raises():
    with pytest.raises(UnsupportedVendorError):
        normalize_config("sonic_whitebox", "dev-01", "some config")
