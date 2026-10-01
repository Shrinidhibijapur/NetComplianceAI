import os

# Upload cap (MB). Config files are small text; 10 MB is generous and bounds memory per request.
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_MB", "10")) * 1024 * 1024

# Comma-separated list of allowed browser origins. Defaults to the Vite dev server.
CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]
if "*" in CORS_ORIGINS:
    raise ValueError("CORS_ORIGINS must list explicit origins; '*' is not allowed.")
