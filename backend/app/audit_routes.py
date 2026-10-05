from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .auth.dependencies import require_role
from .db import AuditEvent, User, get_db
from .pagination import PaginatedResponse, paginate_query

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditEventOut(BaseModel):
    id: int
    created_at: str
    event_type: str
    actor: str
    subject: str | None
    config_id: int | None
    status: str
    details: dict


@router.get(
    "/logs",
    response_model=PaginatedResponse[AuditEventOut],
    responses={
        403: {"description": "Admin or Auditor privileges required"},
    },
)
def list_audit_logs(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_role(["admin", "auditor"]))],
    page: int = 1,
    page_size: int = 20,
    event_type: str | None = None,
    actor: str | None = None,
) -> PaginatedResponse[AuditEventOut]:
    """Retrieve enterprise audit trail events with pagination and filtering."""
    query = db.query(AuditEvent).order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())

    if event_type:
        query = query.filter(AuditEvent.event_type == event_type)
    if actor:
        query = query.filter(AuditEvent.actor == actor)

    items, total, current_page, total_pages = paginate_query(query, page=page, page_size=page_size)

    events_out = [
        AuditEventOut(
            id=e.id,
            created_at=e.created_at.isoformat(),
            event_type=e.event_type,
            actor=e.actor,
            subject=e.subject,
            config_id=e.config_id,
            status=e.status or "success",
            details=e.details or {},
        )
        for e in items
    ]

    return PaginatedResponse[AuditEventOut](
        items=events_out,
        total=total,
        page=current_page,
        page_size=page_size,
        pages=total_pages,
    )
