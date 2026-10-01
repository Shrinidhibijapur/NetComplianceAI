import logging

from ..db import SessionLocal, TrainingExampleRow
from .embedder import EmbeddingUnavailable
from .seed_examples import SEED_EXAMPLES
from .state import vector_store
from .store import TrainingExample

log = logging.getLogger(__name__)


def bootstrap_vector_store() -> None:
    """Seed the DB with hand-labeled examples on first boot, then load everything into memory.

    If the embedding model isn't available the API still starts (ingestion, compliance and
    reporting don't need it); AI suggestions return 503 until the model is present."""
    db = SessionLocal()
    try:
        if db.query(TrainingExampleRow).count() == 0:
            for example in SEED_EXAMPLES:
                db.add(TrainingExampleRow(**example, source="seed"))
            db.commit()

        rows = db.query(TrainingExampleRow).all()
        try:
            vector_store.build(
                [
                    TrainingExample(
                        id=row.id, vendor=row.vendor, line_text=row.line_text, canonical_key=row.canonical_key
                    )
                    for row in rows
                ]
            )
        except EmbeddingUnavailable as exc:
            log.warning("AI suggestions disabled: %s", exc)
    finally:
        db.close()
