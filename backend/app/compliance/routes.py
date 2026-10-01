from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import ConfigRecord, get_db
from ..models import ComplianceReport
from ..rules.loader import UnknownFrameworkError, load_rules
from .engine import evaluate_controls, summarize

router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.get("/frameworks", response_model=list[str])
def list_frameworks() -> list[str]:
    from ..rules.loader import FRAMEWORKS_DIR

    return sorted(p.stem.upper() for p in FRAMEWORKS_DIR.glob("*.yaml"))


class EvaluateRequest(BaseModel):
    config_id: int
    framework: str = "CIS"


@router.post(
    "/evaluate",
    response_model=ComplianceReport,
    responses={
        400: {"description": "Unknown framework error"},
        404: {"description": "Config record not found"},
    },
)
def evaluate(payload: EvaluateRequest, db: Session = Depends(get_db)) -> ComplianceReport:
    record = db.get(ConfigRecord, payload.config_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"No config record with id {payload.config_id}")

    try:
        rules = load_rules(payload.framework)
    except UnknownFrameworkError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    findings = evaluate_controls(record.normalized["controls"], record.vendor, rules)

    return ComplianceReport(
        device_id=record.device_id,
        vendor=record.vendor,
        framework=payload.framework.upper(),
        findings=findings,
        summary=summarize(findings),
    )
