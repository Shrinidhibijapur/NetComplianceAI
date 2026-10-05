from sqlalchemy.orm import Session

from .db import AuditEvent


# ponytail: Phase 1 only records ingestion events with actor "anonymous" (no auth yet). Phase 6
# extends this to every state change with a real actor.
def log_event(
    db: Session,
    event_type: str,
    *,
    subject: str | None = None,
    config_id: int | None = None,
    details: dict | None = None,
    actor: str = "anonymous",
    status: str = "success",
) -> AuditEvent:
    """Stage an audit row on the caller's session; the caller commits (so it's atomic with the action)."""
    event = AuditEvent(
        event_type=event_type,
        actor=actor,
        subject=subject,
        config_id=config_id,
        status=status,
        details=details or {},
    )
    db.add(event)
    return event
