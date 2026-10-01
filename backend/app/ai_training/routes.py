from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import ConfigRecord, TrainingExampleRow, get_db
from ..models import LabelRequest, PendingTrainingResponse
from .embedder import EmbeddingUnavailable
from .engine import classify_line
from .state import vector_store
from .store import TrainingExample

router = APIRouter(prefix="/ai-training", tags=["ai-training"])


@router.get(
    "/pending/{config_id}",
    response_model=PendingTrainingResponse,
    responses={
        404: {"description": "Config record not found"},
        503: {"description": "Embedding model unavailable"},
    },
)
def pending_lines(config_id: int, db: Session = Depends(get_db)) -> PendingTrainingResponse:
    record = db.get(ConfigRecord, config_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"No config record with id {config_id}")

    raw_unmapped_lines = record.normalized.get("raw_unmapped_lines", [])
    try:
        classifications = [classify_line(vector_store, line) for line in raw_unmapped_lines]
    except EmbeddingUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return PendingTrainingResponse(
        device_id=record.device_id, vendor=record.vendor, classifications=classifications
    )


@router.post("/label")
def label_line(payload: LabelRequest, db: Session = Depends(get_db)) -> dict:
    """The admin confirms what a previously-unrecognized line means (Section 4.2 step 4).
    No retraining/redeploy: the example is added to the vector store immediately."""
    row = TrainingExampleRow(
        vendor=payload.vendor,
        line_text=payload.line_text,
        canonical_key=payload.canonical_key,
        source="human",
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    try:
        vector_store.add(
            TrainingExample(id=row.id, vendor=row.vendor, line_text=row.line_text, canonical_key=row.canonical_key)
        )
    except EmbeddingUnavailable:
        # The label is safely stored; it joins the index at the next start with the model available.
        return {"status": "saved_not_indexed", "id": row.id}

    return {"status": "learned", "id": row.id}
