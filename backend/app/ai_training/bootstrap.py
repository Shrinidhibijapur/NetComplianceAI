from ..db import SessionLocal, TrainingExampleRow
from .seed_examples import SEED_EXAMPLES
from .state import vector_store
from .store import TrainingExample


def bootstrap_vector_store() -> None:
    """Seed the DB with hand-labeled examples on first boot, then load everything into memory."""
    db = SessionLocal()
    try:
        if db.query(TrainingExampleRow).count() == 0:
            for example in SEED_EXAMPLES:
                db.add(TrainingExampleRow(**example, source="seed"))
            db.commit()

        rows = db.query(TrainingExampleRow).all()
        vector_store.build(
            [
                TrainingExample(
                    id=row.id, vendor=row.vendor, line_text=row.line_text, canonical_key=row.canonical_key
                )
                for row in rows
            ]
        )
    finally:
        db.close()
