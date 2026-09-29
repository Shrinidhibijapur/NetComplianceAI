from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import ConfigRecord, get_db
from ..models import NormalizedConfig
from ..normalization.engine import normalize_config
from .redaction import redact_secrets

router = APIRouter(prefix="/ingest", tags=["ingestion"])


def _ingest_one(db: Session, vendor: str, device_id: str, raw_config: str) -> NormalizedConfig:
    # Normalize against the original text first — some L1 rules key off the secret
    # value itself (e.g. default SNMP community "public") — then redact before the
    # raw config is ever persisted (Section 6: no secrets at rest or in the UI).
    normalized = normalize_config(vendor=vendor, device_id=device_id, raw_config=raw_config)

    record = ConfigRecord(
        device_id=device_id,
        vendor=vendor,
        raw_config=redact_secrets(raw_config),
        normalized=normalized.model_dump(mode="json"),
        parse_confidence=normalized.parse_confidence,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    normalized.id = record.id
    return normalized


@router.post("/upload", response_model=NormalizedConfig)
async def upload_config(
    file: UploadFile = File(...),
    vendor: str = Form(...),
    device_id: str = Form(...),
    db: Session = Depends(get_db),
) -> NormalizedConfig:
    raw_config = (await file.read()).decode("utf-8", errors="replace")
    return _ingest_one(db, vendor, device_id, raw_config)


@router.post("/bulk", response_model=list[NormalizedConfig])
async def upload_bulk(
    files: list[UploadFile] = File(...),
    vendors: list[str] = Form(...),
    device_ids: list[str] = Form(...),
    db: Session = Depends(get_db),
) -> list[NormalizedConfig]:
    """Unified bulk ingestion (Section 8, Phase 5) — one vendor + device_id per file,
    same order as `files`."""
    results = []
    for file, vendor, device_id in zip(files, vendors, device_ids):
        raw_config = (await file.read()).decode("utf-8", errors="replace")
        results.append(_ingest_one(db, vendor, device_id, raw_config))
    return results


class ConfigSummary(BaseModel):
    id: int
    device_id: str
    vendor: str
    parse_confidence: float
    unmapped_count: int
    created_at: str


@router.get("/records", response_model=list[ConfigSummary])
def list_records(db: Session = Depends(get_db)) -> list[ConfigSummary]:
    records = db.query(ConfigRecord).order_by(ConfigRecord.created_at.desc()).all()
    return [
        ConfigSummary(
            id=r.id,
            device_id=r.device_id,
            vendor=r.vendor,
            parse_confidence=r.parse_confidence,
            unmapped_count=len(r.normalized.get("raw_unmapped_lines", [])),
            created_at=r.created_at.isoformat(),
        )
        for r in records
    ]
