# Phase 2: delegate all detection to the profile-driven engine.
# Keeping this shim so callers in routes.py don't need to change.
from ..vendors.detection import resolve_vendor  # noqa: F401 (re-exported)
