import os
import re
import time
from collections import defaultdict
from typing import Callable

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# ── Security Headers Middleware ─────────────────────────────────────────────

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


# ── Rate Limiter Middleware (Token-Bucket per IP) ───────────────────────────

class RateLimiterMiddleware(BaseHTTPMiddleware):
    """In-memory rate limiter per IP address to prevent brute-force attacks and API abuse."""

    def __init__(self, app, requests_per_minute: int = 120, login_per_minute: int = 10):
        super().__init__(app)
        self.rpm = requests_per_minute
        self.login_rpm = login_login = login_per_minute
        self.client_hits: dict[str, list[float]] = defaultdict(list)
        self.login_hits: dict[str, list[float]] = defaultdict(list)
        self.enabled = os.environ.get("RATE_LIMIT_ENABLED", "true").lower() in ("true", "1", "yes")

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not self.enabled or request.url.path.endswith("/health"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        window = 60.0

        # Rate limit /auth/login specifically
        if request.url.path == "/auth/login" and request.method == "POST":
            hits = [t for t in self.login_hits[client_ip] if now - t < window]
            if len(hits) >= self.login_rpm:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Too many login attempts. Please try again in 1 minute."},
                )
            hits.append(now)
            self.login_hits[client_ip] = hits
        else:
            hits = [t for t in self.client_hits[client_ip] if now - t < window]
            if len(hits) >= self.rpm:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Rate limit exceeded. Maximum 120 requests per minute."},
                )
            hits.append(now)
            self.client_hits[client_ip] = hits

        return await call_next(request)


# ── Path Traversal & Filename Sanitization Helper ────────────────────────────

def sanitize_filename(filename: str | None) -> str:
    """Sanitize uploaded filenames to prevent path traversal attacks (e.g. ../../etc/passwd)."""
    if not filename:
        return "uploaded_config.cfg"
    # Remove directory path components
    clean = os.path.basename(filename)
    clean = re.sub(r"[^\w\.-]", "_", clean)
    clean = clean.lstrip(".")
    return clean or "uploaded_config.cfg"
