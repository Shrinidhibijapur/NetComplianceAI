"""
Phase 4 D1-regression and ParseRule tests.

Critical test: upload unseen-vendor config → controls empty → approve rule →
re-normalize (or re-upload) → controls now populated.  No restart. No code change.
"""

from __future__ import annotations

import io
import json

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db import Base, SessionLocal, engine, ParseRule, ConfigRecord


@pytest.fixture(autouse=True)
def _fresh_db():
    """Recreate all tables before each test so tests are fully isolated."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)

# ── Fixtures ──────────────────────────────────────────────────────────────────

# A minimal "unknown" vendor config with a line the profile won't know about
UNKNOWN_VENDOR_CONFIG = """\
system-name unknown-router-01
session-timeout 300
ssh-server enable version 2
logging remote 10.0.0.5
"""

# A Cisco config that exercises standard profile + optional learned-rule on top
CISCO_EXTRA_CONFIG = """\
hostname core-sw-01
ip ssh version 2
no ip http server
service password-encryption
logging host 10.0.0.5
ntp server 10.0.0.1
! custom line the profile doesn't know
snmp-server contact NOC-team
"""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _upload(config_text: str, vendor: str = "unknown_vendor", device_id: str = "dev-001") -> dict:
    f = io.BytesIO(config_text.encode())
    resp = client.post(
        "/ingest/upload",
        files={"file": ("config.txt", f, "text/plain")},
        data={"vendor": vendor, "device_id": device_id},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def _approve_rule(
    vendor: str,
    example_line: str,
    pattern: str,
    target_field: str,
    value_type: str = "string",
    static_value=None,
) -> dict:
    payload = {
        "vendor": vendor,
        "example_line": example_line,
        "pattern": pattern,
        "target_field": target_field,
        "value_type": value_type,
        "confidence": 0.85,
        "approved_by": "test-admin",
    }
    if static_value is not None:
        payload["static_value"] = static_value
    resp = client.post("/ai-training/approve", json=payload)
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestD1Regression:
    """D1 gap closure: a label must affect parsing of previously-uploaded configs."""

    def test_upload_unknown_vendor_has_no_controls(self):
        result = _upload(UNKNOWN_VENDOR_CONFIG, vendor="unknown_vendor", device_id="unk-01")
        # No profile for unknown_vendor → controls should be empty (except possibly _evidence)
        controls = {k: v for k, v in result["controls"].items() if k != "_evidence"}
        assert controls == {}, f"Expected empty controls for unknown vendor, got {controls}"

    def test_approve_rule_populates_controls_without_rerequest(self):
        """D1 regression: approve rule → existing config re-normalized immediately."""
        # 1. Upload first — no controls yet
        upload_result = _upload(UNKNOWN_VENDOR_CONFIG, vendor="unknown_vendor", device_id="unk-01")
        record_id = upload_result["id"]
        controls_before = {k: v for k, v in upload_result["controls"].items() if k != "_evidence"}
        assert controls_before == {}

        # 2. Approve a rule that maps "session-timeout 300" → session_timeout_seconds (int)
        approve_result = _approve_rule(
            vendor="unknown_vendor",
            example_line="session-timeout 300",
            pattern=r"^session-timeout (\d+)",
            target_field="session_timeout_seconds",
            value_type="int",
        )
        assert approve_result["status"] == "approved"
        assert approve_result["renormalized_configs"] >= 1

        # 3. Verify the stored record was re-normalized (no re-upload needed)
        db = SessionLocal()
        try:
            record = db.get(ConfigRecord, record_id)
            assert record is not None
            controls_after = record.normalized.get("controls", {})
            assert "session_timeout_seconds" in controls_after, (
                f"Expected session_timeout_seconds in controls after re-normalize, got: {controls_after}"
            )
            assert controls_after["session_timeout_seconds"] == 300
        finally:
            db.close()

    def test_approve_static_value_rule(self):
        """Pattern with no capture group uses static_value."""
        _upload(UNKNOWN_VENDOR_CONFIG, vendor="unknown_vendor", device_id="unk-02")

        approve_result = _approve_rule(
            vendor="unknown_vendor",
            example_line="ssh-server enable version 2",
            pattern=r"^ssh-server enable",
            target_field="ssh_version",
            value_type="string",
            static_value="2",
        )
        assert approve_result["status"] == "approved"

        db = SessionLocal()
        try:
            records = db.query(ConfigRecord).filter(ConfigRecord.vendor == "unknown_vendor").all()
            for r in records:
                controls = r.normalized.get("controls", {})
                assert controls.get("ssh_version") == "2", (
                    f"Expected ssh_version='2', got: {controls}"
                )
        finally:
            db.close()


class TestRuleScoping:
    """A rule approved for vendor A must have no effect on vendor B's parse."""

    def test_rule_does_not_bleed_across_vendors(self):
        # Upload two configs, different vendors
        result_a = _upload(UNKNOWN_VENDOR_CONFIG, vendor="vendor_a", device_id="dev-a")
        result_b = _upload(UNKNOWN_VENDOR_CONFIG, vendor="vendor_b", device_id="dev-b")

        # Approve rule only for vendor_a
        _approve_rule(
            vendor="vendor_a",
            example_line="session-timeout 300",
            pattern=r"^session-timeout (\d+)",
            target_field="session_timeout_seconds",
            value_type="int",
        )

        db = SessionLocal()
        try:
            rec_a = db.get(ConfigRecord, result_a["id"])
            rec_b = db.get(ConfigRecord, result_b["id"])
            controls_a = rec_a.normalized.get("controls", {})
            controls_b = rec_b.normalized.get("controls", {})
            assert "session_timeout_seconds" in controls_a, "Rule should apply to vendor_a"
            assert "session_timeout_seconds" not in controls_b, "Rule must NOT bleed to vendor_b"
        finally:
            db.close()


class TestRuleManagement:
    """List, disable, delete rules via the management API."""

    def test_list_rules_empty(self):
        resp = client.get("/ai-training/rules")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["rules"] == []

    def test_approve_then_list(self):
        _upload(UNKNOWN_VENDOR_CONFIG, vendor="unknown_vendor", device_id="unk-list")
        _approve_rule(
            vendor="unknown_vendor",
            example_line="session-timeout 300",
            pattern=r"^session-timeout (\d+)",
            target_field="session_timeout_seconds",
            value_type="int",
        )
        resp = client.get("/ai-training/rules")
        data = resp.json()
        assert data["total"] == 1
        rule = data["rules"][0]
        assert rule["vendor"] == "unknown_vendor"
        assert rule["target_field"] == "session_timeout_seconds"
        assert rule["active"] is True

    def test_disable_rule_reverts_parse(self):
        """Disabling a rule re-normalizes so the field disappears from controls."""
        upload_result = _upload(UNKNOWN_VENDOR_CONFIG, vendor="unknown_vendor", device_id="unk-dis")
        record_id = upload_result["id"]

        approve_resp = _approve_rule(
            vendor="unknown_vendor",
            example_line="session-timeout 300",
            pattern=r"^session-timeout (\d+)",
            target_field="session_timeout_seconds",
            value_type="int",
        )
        rule_id = approve_resp["rule_id"]

        # Verify field is present after approval
        db = SessionLocal()
        try:
            rec = db.get(ConfigRecord, record_id)
            assert "session_timeout_seconds" in rec.normalized.get("controls", {})
        finally:
            db.close()

        # Disable the rule
        dis_resp = client.patch(f"/ai-training/rules/{rule_id}/disable")
        assert dis_resp.status_code == 200
        assert dis_resp.json()["status"] == "disabled"

        # Verify field is gone after disable
        db = SessionLocal()
        try:
            db.expire_all()
            rec = db.get(ConfigRecord, record_id)
            controls = rec.normalized.get("controls", {})
            assert "session_timeout_seconds" not in controls, (
                f"Disabled rule should no longer populate the field, got: {controls}"
            )
        finally:
            db.close()

    def test_delete_rule(self):
        _upload(UNKNOWN_VENDOR_CONFIG, vendor="unknown_vendor", device_id="unk-del")
        approve_resp = _approve_rule(
            vendor="unknown_vendor",
            example_line="session-timeout 300",
            pattern=r"^session-timeout (\d+)",
            target_field="session_timeout_seconds",
            value_type="int",
        )
        rule_id = approve_resp["rule_id"]

        del_resp = client.delete(f"/ai-training/rules/{rule_id}")
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "deleted"

        # Confirm it's gone from the list
        list_resp = client.get("/ai-training/rules")
        assert list_resp.json()["total"] == 0

    def test_disable_nonexistent_rule_returns_404(self):
        resp = client.patch("/ai-training/rules/99999/disable")
        assert resp.status_code == 404

    def test_delete_nonexistent_rule_returns_404(self):
        resp = client.delete("/ai-training/rules/99999")
        assert resp.status_code == 404


class TestPatternPreview:
    """Preview endpoint shows how many lines a pattern would match."""

    def test_preview_matching_pattern(self):
        upload_result = _upload(UNKNOWN_VENDOR_CONFIG, vendor="unknown_vendor", device_id="unk-prev")
        config_id = upload_result["id"]

        resp = client.post("/ai-training/preview", json={
            "pattern": r"^session-timeout (\d+)",
            "config_id": config_id,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["match_count"] == 1
        assert any("session-timeout" in line for line in data["matched_lines"])

    def test_preview_nonmatching_pattern(self):
        upload_result = _upload(UNKNOWN_VENDOR_CONFIG, vendor="unknown_vendor", device_id="unk-prev2")
        config_id = upload_result["id"]

        resp = client.post("/ai-training/preview", json={
            "pattern": r"^this-does-not-exist",
            "config_id": config_id,
        })
        assert resp.status_code == 200
        assert resp.json()["match_count"] == 0

    def test_preview_invalid_pattern_returns_422(self):
        resp = client.post("/ai-training/preview", json={
            "pattern": r"[invalid(",
            "config_id": 1,
        })
        assert resp.status_code == 422


class TestApproveValidation:
    """Input validation on the approve endpoint."""

    def test_approve_invalid_regex_returns_422(self):
        resp = client.post("/ai-training/approve", json={
            "vendor": "unknown_vendor",
            "example_line": "test",
            "pattern": "[invalid(",
            "target_field": "ssh_version",
        })
        assert resp.status_code == 422
