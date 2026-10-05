import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth.security import hash_password, verify_password, create_access_token, decode_access_token
from app.middleware import sanitize_filename
from app.db import get_db, User, AuditEvent
from app.tasks.manager import task_manager
from app.vendors.loader import VENDOR_PROFILES
from app.ingestion.redaction import redact_secrets

client = TestClient(app)

def test_password_hashing():
    raw_pass = "SecureAdminPassword123!"
    hashed = hash_password(raw_pass)
    assert hashed != raw_pass
    assert hashed.startswith("pbkdf2_sha256$")
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_generation_and_decoding():
    payload = {"sub": "admin", "role": "admin"}
    token = create_access_token(payload)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "admin"
    assert decoded["role"] == "admin"

def test_auth_login_success_and_failure():
    # Valid login with default seeded user admin / admin123
    resp = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["role"] == "admin"
    assert data["username"] == "admin"

    # Invalid password
    bad_resp = client.post("/auth/login", json={"username": "admin", "password": "wrongpassword"})
    assert bad_resp.status_code == 401
    assert "Invalid username or password" in bad_resp.json()["detail"]

    # Invalid user
    no_user_resp = client.post("/auth/login", json={"username": "nonexistent_user", "password": "password"})
    assert no_user_resp.status_code == 401

def test_auth_me_endpoint():
    # Login to get token
    login_resp = client.post("/auth/login", json={"username": "auditor", "password": "auditor123"})
    token = login_resp.json()["access_token"]

    me_resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    user_info = me_resp.json()
    assert user_info["username"] == "auditor"
    assert user_info["role"] == "auditor"

def test_rbac_role_restrictions():
    # Viewer token
    login_viewer = client.post("/auth/login", json={"username": "viewer", "password": "viewer123"})
    viewer_token = login_viewer.json()["access_token"]

    # Viewer attempting to approve a rule -> should be HTTP 403 Forbidden
    rule_payload = {
        "vendor": "cisco_ios",
        "example_line": "logging buffered 16384",
        "pattern": r"logging buffered (\d+)",
        "target_field": "logging_enabled",
    }
    forbidden_resp = client.post(
        "/ai-training/approve",
        json=rule_payload,
        headers={"Authorization": f"Bearer {viewer_token}"},
    )
    assert forbidden_resp.status_code == 403

    # Admin attempting to approve rule -> HTTP 200 OK
    login_admin = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    admin_token = login_admin.json()["access_token"]
    ok_resp = client.post(
        "/ai-training/approve",
        json=rule_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert ok_resp.status_code == 200

def test_security_headers_middleware():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.headers.get("X-Frame-Options") == "DENY"
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"

def test_filename_sanitization_and_path_traversal():
    assert sanitize_filename("../../../etc/passwd") == "passwd"
    assert sanitize_filename("..\\..\\Windows\\System32\\cmd.exe") == "cmd.exe"
    assert sanitize_filename("safe_config.txt") == "safe_config.txt"
    assert sanitize_filename("  spaces and #special$chars.cfg  ") == "__spaces_and__special_chars.cfg__"

def test_oversized_file_upload_rejection():
    # Exceeding 10MB limit
    large_content = b"A" * (10 * 1024 * 1024 + 100)
    files = {"file": ("huge_config.txt", large_content, "text/plain")}
    data = {"vendor": "cisco_ios", "device_id": "huge_dev_1"}
    resp = client.post("/ingest/upload", files=files, data=data)
    assert resp.status_code == 413
    assert "File exceeds" in resp.json()["detail"]

def test_audit_logs_recording_and_pagination():
    # Login as admin to generate auth audit log
    client.post("/auth/login", json={"username": "admin", "password": "admin123"})

    # Fetch audit logs paginated
    resp = client.get("/audit/logs?page=1&page_size=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert data["page"] == 1
    assert data["page_size"] == 5
    assert isinstance(data["items"], list)
    if len(data["items"]) > 0:
        log = data["items"][0]
        assert "created_at" in log or "timestamp" in log
        assert "actor" in log
        assert "event_type" in log or "action" in log
        # Passwords/tokens must never appear in raw secret format
        assert "admin123" not in str(log)

def test_async_task_manager():
    task = task_manager.create_task()
    task_manager.update_task(task.task_id, status="COMPLETE", progress_percent=100, result={"status": "ok"})

    task_resp = client.get(f"/tasks/{task.task_id}")
    assert task_resp.status_code == 200
    task_data = task_resp.json()
    assert task_data["task_id"] == task.task_id
    assert task_data["status"] == "COMPLETE"
    assert task_data["progress_percent"] == 100

def test_vendor_extensibility_profiles_complete():
    required_vendors = [
        "cisco_ios",
        "juniper_junos",
        "arista_eos",
        "fortinet_fortios",
        "mikrotik_routeros",
        "sonic",
        "aws_security_group",
    ]
    for vendor in required_vendors:
        assert vendor in VENDOR_PROFILES
        profile = VENDOR_PROFILES[vendor]
        assert profile.vendor == vendor
        assert profile.display_name != ""
        assert len(profile.controls) > 0

def test_secret_redaction_in_errors_and_logs():
    sensitive_str = "enable secret SuperSecretPassword123! snmp-server community mysecretcommunity"
    redacted = redact_secrets(sensitive_str)
    assert "SuperSecretPassword123!" not in redacted
    assert "mysecretcommunity" not in redacted
    assert "[REDACTED]" in redacted
