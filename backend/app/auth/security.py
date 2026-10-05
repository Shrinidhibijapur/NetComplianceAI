import base64
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import os
from typing import Any

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "complianceai-super-secret-production-key-change-me-sih26155")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 hours


def _urlsafe_b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _urlsafe_b64decode(data: str) -> bytes:
    padding = "=" * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode((data + padding).encode("utf-8"))


# ── Password Hashing (PBKDF2-HMAC-SHA256) ───────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with 100,000 iterations and 32-byte salt."""
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"pbkdf2_sha256$100000${salt.hex()}${key.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against PBKDF2-HMAC-SHA256 hashed string in constant time."""
    try:
        parts = hashed.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected_key = bytes.fromhex(parts[3])
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(key, expected_key)
    except Exception:
        return False


# ── Access Token (JWT HMAC-SHA256) ──────────────────────────────────────────

def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token containing sub, role, and expiration."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
    })

    header = {"alg": ALGORITHM, "typ": "JWT"}
    header_bytes = _urlsafe_b64encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_bytes = _urlsafe_b64encode(json.dumps(to_encode, separators=(",", ":")).encode("utf-8"))

    signature_input = f"{header_bytes}.{payload_bytes}".encode("utf-8")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), signature_input, hashlib.sha256).digest()
    sig_bytes = _urlsafe_b64encode(signature)

    return f"{header_bytes}.{payload_bytes}.{sig_bytes}"


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Validate token signature and expiration timestamp; return payload or None."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header_bytes, payload_bytes, sig_bytes = parts
        signature_input = f"{header_bytes}.{payload_bytes}".encode("utf-8")
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), signature_input, hashlib.sha256).digest()

        actual_sig = _urlsafe_b64decode(sig_bytes)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        payload = json.loads(_urlsafe_b64decode(payload_bytes).decode("utf-8"))
        exp = payload.get("exp")
        if exp and datetime.now(timezone.utc).timestamp() > exp:
            return None

        return payload
    except Exception:
        return None
