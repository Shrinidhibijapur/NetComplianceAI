from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

FIXTURES = Path(__file__).parent / "fixtures"
client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_upload_cisco_config():
    with open(FIXTURES / "cisco_ios_sample.cfg", "rb") as f:
        resp = client.post(
            "/ingest/upload",
            files={"file": ("cisco_ios_sample.cfg", f, "text/plain")},
            data={"vendor": "cisco_ios", "device_id": "core-sw-01"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body["id"], int)
    assert body["device_id"] == "core-sw-01"
    assert body["controls"]["ssh_version"] == "2"
    # 8 of 12 meaningful lines recognized (see NormalizedConfig.parse_confidence)
    assert body["parse_confidence"] == round(8 / 12, 2)


def test_upload_vendor_with_no_l1_rules_still_succeeds():
    """A vendor outside VENDOR_RULES isn't rejected — it just has nothing to L1-parse
    and everything routes to raw_unmapped_lines for the AI training loop (Phase 4)."""
    resp = client.post(
        "/ingest/upload",
        files={"file": ("x.cfg", b"some totally unknown config syntax", "text/plain")},
        data={"vendor": "sonic_whitebox", "device_id": "dev-01"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["controls"] == {}
    assert body["parse_confidence"] == 0.0
    assert body["raw_unmapped_lines"] == ["some totally unknown config syntax"]
