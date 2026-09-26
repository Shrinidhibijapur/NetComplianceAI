from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..db import ConfigRecord, get_db
from ..models import NormalizedConfig
from ..normalization.engine import UnsupportedVendorError, normalize_config
from ..normalization.rules import VENDOR_RULES

router = APIRouter(prefix="/ingest", tags=["ingestion"])


@router.post("/upload", response_model=NormalizedConfig)
async def upload_config(
    file: UploadFile = File(...),
    vendor: str = Form(...),
    device_id: str = Form(...),
    db: Session = Depends(get_db),
) -> NormalizedConfig:
    if vendor not in VENDOR_RULES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported vendor '{vendor}'. Supported: {sorted(VENDOR_RULES)}",
        )

    raw_config = (await file.read()).decode("utf-8", errors="replace")

    try:
        normalized = normalize_config(vendor=vendor, device_id=device_id, raw_config=raw_config)
    except UnsupportedVendorError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    db.add(
        ConfigRecord(
            device_id=device_id,
            vendor=vendor,
            raw_config=raw_config,
            normalized=normalized.model_dump(mode="json"),
            parse_confidence=normalized.parse_confidence,
        )
    )
    db.commit()

    return normalized
