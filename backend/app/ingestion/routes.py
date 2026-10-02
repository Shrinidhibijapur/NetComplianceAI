from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import config
from ..audit import log_event
from ..db import ConfigRecord, get_db
from ..models import BulkItemResult, NormalizedConfig
from ..normalization.engine import normalize_config
from .redaction import redact_secrets
from .validation import UploadRejected, validate_and_decode
from .vendor import resolve_vendor

router = APIRouter(prefix="/ingest", tags=["ingestion"])


async def _read_validated(file: UploadFile) -> str:
    # ponytail: Starlette has already spooled the multipart body to a temp file by here, so this
    # bounds memory, not disk/bandwidth. Put a proxy body-size limit (e.g. nginx) in front for that.
    data = await file.read(config.MAX_UPLOAD_BYTES + 1)
    return validate_and_decode(data, config.MAX_UPLOAD_BYTES)


def _ingest_one(db: Session, vendor_hint: str | None, device_id: str, raw_config: str) -> NormalizedConfig:
    vendor, vendor_source = resolve_vendor(vendor_hint, raw_config)

    # Normalize against the original text first — some L1 rules key off the secret
    # value itself (e.g. default SNMP community "public") — then redact before the
    # raw config is ever persisted (Section 6: no secrets at rest or in the UI).
    normalized = normalize_config(vendor=vendor, device_id=device_id, raw_config=raw_config)
    normalized.vendor_source = vendor_source

    record = ConfigRecord(
        device_id=device_id,
        vendor=vendor,
        raw_config=redact_secrets(raw_config),
        normalized=normalized.model_dump(mode="json"),
        parse_confidence=normalized.parse_confidence,
    )
    db.add(record)
    db.flush()  # assigns record.id so the audit row below can reference it

    log_event(
        db,
        "config_uploaded",
        subject=device_id,
        config_id=record.id,
        details={"vendor": vendor, "vendor_source": vendor_source, "bytes": len(raw_config.encode("utf-8"))},
    )
    db.commit()  # config + audit row land together or not at all

    normalized.id = record.id
    return normalized


def _log_rejection(db: Session, filename: str, reason: str) -> None:
    log_event(db, "config_upload_rejected", subject=filename, details={"reason": reason})
    db.commit()


@router.post(
    "/upload",
    responses={
        400: {"description": "Invalid upload file or request parameter"},
        413: {"description": "File size exceeds upload limit"},
        415: {"description": "Unsupported media type or non-UTF8 content"},
    },
)
async def upload_config(
    file: UploadFile = File(...),
    vendor: str = Form(""),  # optional manual override; blank/"auto" = identify from content
    device_id: str = Form(...),
    db: Annotated[Session, Depends(get_db)] = None,
) -> NormalizedConfig:
    try:
        raw_config = await _read_validated(file)
    except UploadRejected as exc:
        _log_rejection(db, file.filename or device_id, exc.message)
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return _ingest_one(db, vendor, device_id, raw_config)


@router.post(
    "/bulk",
    responses={
        400: {"description": "Mismatched parameters (files vs device_ids or vendors)"},
    },
)
async def upload_bulk(
    files: list[UploadFile] = File(...),
    device_ids: list[str] = Form(...),
    vendors: list[str] = Form(default=[]),  # optional; if given, one per file ("" = auto)
    db: Annotated[Session, Depends(get_db)] = None,
) -> list[BulkItemResult]:
    """Unified bulk ingestion (Section 8, Phase 5) — one device_id (and optional vendor) per
    file, same order as `files`. Each file succeeds or fails on its own."""
    if len(device_ids) != len(files) or (vendors and len(vendors) != len(files)):
        raise HTTPException(
            status_code=400,
            detail="Provide exactly one device_id (and, if vendors are given, one vendor) per file.",
        )
    vendors = vendors or [""] * len(files)

    results: list[BulkItemResult] = []
    for file, vendor, device_id in zip(files, vendors, device_ids):
        filename = file.filename or device_id
        try:
            raw_config = await _read_validated(file)
            normalized = _ingest_one(db, vendor, device_id, raw_config)
            results.append(BulkItemResult(filename=filename, device_id=device_id, status="ok", result=normalized))
        except UploadRejected as exc:
            _log_rejection(db, filename, exc.message)
            results.append(BulkItemResult(filename=filename, device_id=device_id, status="error", error=exc.message))
        except Exception as exc:  # one bad file must not sink the batch
            db.rollback()
            results.append(
                BulkItemResult(filename=filename, device_id=device_id, status="error", error=f"Processing failed: {exc}")
            )
    return results


class ConfigSummary(BaseModel):
    id: int
    device_id: str
    vendor: str
    parse_confidence: float
    unmapped_count: int
    created_at: str


@router.get("/records")
def list_records(db: Annotated[Session, Depends(get_db)]) -> list[ConfigSummary]:
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
