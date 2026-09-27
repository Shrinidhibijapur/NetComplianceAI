from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from ..db import ConfigRecord, get_db
from ..models import NormalizedConfig
from ..normalization.engine import normalize_config

router = APIRouter(prefix="/ingest", tags=["ingestion"])


@router.post("/upload", response_model=NormalizedConfig)
async def upload_config(
    file: UploadFile = File(...),
    vendor: str = Form(...),
    device_id: str = Form(...),
    db: Session = Depends(get_db),
) -> NormalizedConfig:
    raw_config = (await file.read()).decode("utf-8", errors="replace")

    normalized = normalize_config(vendor=vendor, device_id=device_id, raw_config=raw_config)

    record = ConfigRecord(
        device_id=device_id,
        vendor=vendor,
        raw_config=raw_config,
        normalized=normalized.model_dump(mode="json"),
        parse_confidence=normalized.parse_confidence,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    normalized.id = record.id
    return normalized
