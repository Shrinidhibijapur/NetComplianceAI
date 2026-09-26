from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

FIXTURES = Path(__file__).parent / "fixtures"
client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_upload_cisco_config():
    with open(FIXTURES / "cisco_ios_sample.cfg", "rb") as f:
        resp = client.post(
            "/ingest/upload",
            files={"file": ("cisco_ios_sample.cfg", f, "text/plain")},
            data={"vendor": "cisco_ios", "device_id": "core-sw-01"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["device_id"] == "core-sw-01"
    assert body["controls"]["ssh_version"] == "2"
    assert body["parse_confidence"] == round(8 / 9, 2)


def test_upload_unsupported_vendor():
    resp = client.post(
        "/ingest/upload",
        files={"file": ("x.cfg", b"whatever", "text/plain")},
        data={"vendor": "sonic_whitebox", "device_id": "dev-01"},
    )
    assert resp.status_code == 400
