class UploadRejected(Exception):
    """A file that must not be ingested; carries the HTTP status and a user-facing reason."""

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


_ALLOWED_CONTROL = {9, 10, 12, 13}  # tab, LF, FF, CR
_MAX_CONTROL_RATIO = 0.01


def validate_and_decode(data: bytes, max_bytes: int) -> str:
    """Return the config text, or raise UploadRejected. `data` may be at most max_bytes + 1 long
    (callers read one extra byte so an oversized file is detected without buffering all of it)."""
    if len(data) > max_bytes:
        raise UploadRejected(413, f"File exceeds the {max_bytes // (1024 * 1024)} MB upload limit.")
    if not data.strip():
        raise UploadRejected(400, "File is empty.")
    if b"\x00" in data:
        raise UploadRejected(415, "File looks binary (contains NUL bytes); upload a text configuration file.")
    control = sum(1 for b in data if b < 32 and b not in _ALLOWED_CONTROL)
    if control / len(data) > _MAX_CONTROL_RATIO:
        raise UploadRejected(415, "File contains non-text control characters; upload a text configuration file.")
    try:
        return data.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise UploadRejected(415, "File is not valid UTF-8 text; upload a text configuration file.") from None
