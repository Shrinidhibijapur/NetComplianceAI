"""Phase 5 Reporting, Remediation, and Fleet Posture Tests."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import Base, ConfigRecord, ParseRule, SessionLocal, engine


@pytest.fixture
def client():
    Base.metadata.create_all(bind=engine)
    return TestClient(app)


def test_single_device_record_endpoint(client):
    """Verify GET /ingest/records/{id} returns normalized config details."""
    db = SessionLocal()
    try:
        rec = ConfigRecord(
            device_id="test-router-phase5-01",
            vendor="cisco_ios",
            raw_config="hostname test-router-phase5-01\nno service password-encryption",
            normalized={
                "hostname": "test-router-phase5-01",
                "model": "ISR4451",
                "os_version": "17.03.04a",
                "serial_number": "FCW2234L0AA",
                "controls": {"password_encryption": False},
                "raw_unmapped_lines": ["ip routing custom-flag"],
            },
            parse_confidence=0.9,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        config_id = rec.id
    finally:
        db.close()

    res = client.get(f"/ingest/records/{config_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == config_id
    assert data["device_id"] == "test-router-phase5-01"
    assert data["vendor"] == "cisco_ios"
    assert data["normalized"]["hostname"] == "test-router-phase5-01"
    assert data["normalized"]["model"] == "ISR4451"


def test_report_metadata_endpoint(client):
    """Verify GET /reporting/{id}/metadata returns structured report metadata."""
    db = SessionLocal()
    try:
        rec = ConfigRecord(
            device_id="test-switch-meta-01",
            vendor="cisco_ios",
            raw_config="hostname test-switch-meta-01\nservice password-encryption",
            normalized={
                "hostname": "test-switch-meta-01",
                "model": "C9300-24P",
                "controls": {"password_encryption": True, "ssh_version": 2},
                "raw_unmapped_lines": [],
            },
            parse_confidence=1.0,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        config_id = rec.id
    finally:
        db.close()

    res = client.get(f"/reporting/{config_id}/metadata?framework=CIS")
    assert res.status_code == 200
    meta = res.json()
    assert meta["config_id"] == config_id
    assert meta["device_id"] == "test-switch-meta-01"
    assert meta["vendor"] == "cisco_ios"
    assert meta["framework"] == "CIS"
    assert "compliance_score" in meta
    assert meta["pass_count"] >= 0


def test_export_report_json_endpoint(client):
    """Verify GET /reporting/{id}/json exports full structured JSON with remediation policy."""
    db = SessionLocal()
    try:
        rec = ConfigRecord(
            device_id="test-json-export-01",
            vendor="cisco_ios",
            raw_config="hostname test-json-export-01\nno service password-encryption",
            normalized={
                "hostname": "test-json-export-01",
                "model": "ISR4331",
                "controls": {"password_encryption": False},
                "raw_unmapped_lines": ["custom-banner warning"],
            },
            parse_confidence=0.85,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        config_id = rec.id
    finally:
        db.close()

    res = client.get(f"/reporting/{config_id}/json?framework=CIS")
    assert res.status_code == 200
    data = res.json()
    assert "meta" in data
    assert "findings" in data
    assert "unmapped_lines" in data
    assert "learned_rules_used" in data

    meta = data["meta"]
    assert meta["device_id"] == "test-json-export-01"

    # Check findings remediation policy
    findings = data["findings"]
    assert len(findings) > 0
    for f in findings:
        assert "remediation_status" in f
        assert f["remediation_status"] in ("verified", "no_verified_remediation", "not_applicable")
        if f["remediation_status"] == "no_verified_remediation":
            assert f["remediation"] is None


def test_fleet_summary_endpoint(client):
    """Verify GET /reporting/fleet/summary calculates posture across all devices."""
    res = client.get("/reporting/fleet/summary?framework=CIS")
    assert res.status_code == 200
    data = res.json()
    assert data["framework"] == "CIS"
    assert "total_devices" in data
    assert "fleet_score" in data
    assert "devices" in data
    assert isinstance(data["devices"], list)


def test_download_pdf_report_phase5(client):
    """Verify GET /reporting/{id}/pdf generates valid PDF output with Phase 5 extra fields."""
    db = SessionLocal()
    try:
        rec = ConfigRecord(
            device_id="test-pdf-dev-01",
            vendor="cisco_ios",
            raw_config="hostname test-pdf-dev-01\nservice password-encryption",
            normalized={
                "hostname": "test-pdf-dev-01",
                "model": "C9200-48P",
                "serial_number": "FCW12345678",
                "controls": {"password_encryption": True},
                "raw_unmapped_lines": ["line unmapped 1"],
            },
            parse_confidence=0.95,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        config_id = rec.id
    finally:
        db.close()

    res = client.get(f"/reporting/{config_id}/pdf?framework=CIS")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 100
    assert res.content.startswith(b"%PDF")
