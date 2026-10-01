import importlib

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func

from app import config
from app.db import AuditEvent, SessionLocal
from app.main import app
from app.normalization.engine import normalize_config

client = TestClient(app)

CISCO = b"ip ssh version 2\nservice password-encryption\nhostname r1\n"


def _upload(content: bytes, vendor: str = "cisco_ios", name: str = "x.cfg", device_id: str = "dev"):
    return client.post(
        "/ingest/upload",
        files={"file": (name, content, "text/plain")},
        data={"vendor": vendor, "device_id": device_id},
    )


def _audit_count(event_type: str) -> int:
    db = SessionLocal()
    try:
        return db.query(func.count(AuditEvent.id)).filter(AuditEvent.event_type == event_type).scalar()
    finally:
        db.close()


# --- size / text validation -------------------------------------------------

def test_oversize_file_rejected_with_413(monkeypatch):
    monkeypatch.setattr(config, "MAX_UPLOAD_BYTES", 1024)
    resp = _upload(b"a" * 2048)
    assert resp.status_code == 413
    assert "upload limit" in resp.json()["detail"]


def test_default_limit_rejects_50mb():
    resp = _upload(b"ip ssh version 2\n" * (50 * 1024 * 1024 // 17 + 1))
    assert resp.status_code == 413
    assert "10 MB" in resp.json()["detail"]


def test_binary_file_rejected_with_415():
    resp = _upload(b"\x7fELF\x02\x01\x01\x00" + bytes(range(256)) * 4)
    assert resp.status_code == 415
    assert "binary" in resp.json()["detail"] or "non-text" in resp.json()["detail"]


def test_invalid_utf8_rejected():
    assert _upload(b"hostname caf\xe9\n" * 10).status_code == 415


def test_empty_file_rejected():
    assert _upload(b"  \n").status_code == 400


# --- vendor handling --------------------------------------------------------

def test_manual_vendor_override_wins_over_content():
    body = _upload(CISCO, vendor="juniper_junos").json()
    assert body["vendor"] == "juniper_junos"
    assert body["vendor_source"] == "manual"


@pytest.mark.parametrize("typed", ["Cisco IOS", "cisco-ios", "  CISCO_IOS "])
def test_vendor_text_is_normalized(typed):
    assert _upload(CISCO, vendor=typed).json()["vendor"] == "cisco_ios"


def test_vendor_is_normalized_and_profile_used():
    # Phase 2: "SONiC" now has a YAML profile so it is recognized and produces controls.
    body = _upload(b"ssh-server enable\n", vendor="SONiC").json()
    assert body["vendor"] == "sonic"
    # ssh-server enable is recognized by the sonic profile
    assert "ssh_version" in body["controls"]


@pytest.mark.parametrize("blank", ["", "auto"])
def test_blank_vendor_is_sniffed_for_existing_vendors(blank):
    body = _upload(CISCO, vendor=blank).json()
    assert (body["vendor"], body["vendor_source"]) == ("cisco_ios", "sniffed")
    assert _upload(b"set system services ssh\n", vendor=blank).json()["vendor"] == "juniper_junos"


def test_unrecognizable_content_with_no_vendor_is_unknown_not_guessed():
    # Use content that doesn't match any profile fingerprint
    body = _upload(b"totally-proprietary-knob enable\nsome-other-thing 42\n", vendor="").json()
    assert (body["vendor"], body["vendor_source"]) == ("unknown", "undetected")


# --- bulk -------------------------------------------------------------------

def test_bulk_one_corrupt_file_does_not_fail_batch():
    files = [
        ("files", ("a.cfg", CISCO, "text/plain")),
        ("files", ("bad.bin", b"\x00\x01\x02binary", "application/octet-stream")),
        ("files", ("c.cfg", b"set system services ssh\n", "text/plain")),
    ]
    resp = client.post(
        "/ingest/bulk", files=files, data={"device_ids": ["a", "bad", "c"], "vendors": ["", "", ""]}
    )
    assert resp.status_code == 200
    out = resp.json()
    assert [r["status"] for r in out] == ["ok", "error", "ok"]
    assert out[0]["result"]["vendor"] == "cisco_ios"
    assert out[1]["result"] is None and "binary" in out[1]["error"]
    assert out[2]["result"]["vendor"] == "juniper_junos"


def test_bulk_vendors_optional():
    resp = client.post(
        "/ingest/bulk",
        files=[("files", ("a.cfg", CISCO, "text/plain"))],
        data={"device_ids": ["a"]},
    )
    assert resp.status_code == 200 and resp.json()[0]["status"] == "ok"


def test_bulk_mismatched_lengths_is_400():
    resp = client.post(
        "/ingest/bulk",
        files=[("files", ("a.cfg", CISCO, "text/plain")), ("files", ("b.cfg", CISCO, "text/plain"))],
        data={"device_ids": ["a"]},
    )
    assert resp.status_code == 400


# --- audit ------------------------------------------------------------------

def test_one_audit_row_per_successful_upload_and_rejections_logged_separately():
    ok_before, rej_before = _audit_count("config_uploaded"), _audit_count("config_upload_rejected")
    _upload(CISCO, device_id="audit-1")
    _upload(CISCO, device_id="audit-2")
    _upload(b"\x00bin", device_id="audit-3")
    assert _audit_count("config_uploaded") == ok_before + 2
    assert _audit_count("config_upload_rejected") == rej_before + 1


def test_audit_row_links_to_config_record():
    cid = _upload(CISCO, device_id="audit-link").json()["id"]
    db = SessionLocal()
    try:
        ev = db.query(AuditEvent).filter(AuditEvent.config_id == cid).one()
        assert ev.event_type == "config_uploaded" and ev.subject == "audit-link"
        assert ev.details["vendor"] == "cisco_ios"
    finally:
        db.close()


# --- D10: confidence meaning ------------------------------------------------

def test_confidence_is_share_of_meaningful_lines_recognized():
    # 2 meaningful lines (comment/blank ignored), 1 recognized
    assert normalize_config("cisco_ios", "d", "! comment\n\nip ssh version 2\nmystery line\n").parse_confidence == 0.5
    assert normalize_config("cisco_ios", "d", "ip ssh version 2\n").parse_confidence == 1.0
    assert normalize_config("nobody", "d", "a\nb\n").parse_confidence == 0.0
    assert normalize_config("cisco_ios", "d", "! only a comment\n").parse_confidence == 0.0


# --- D11: CORS --------------------------------------------------------------

def test_cors_allows_configured_origin_and_not_others():
    ok = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    bad = client.get("/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in bad.headers


def test_wildcard_cors_origin_is_refused(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "*")
    with pytest.raises(ValueError):
        importlib.reload(config)
    monkeypatch.delenv("CORS_ORIGINS")
    importlib.reload(config)
