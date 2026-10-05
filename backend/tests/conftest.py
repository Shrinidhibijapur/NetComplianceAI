import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="complianceai-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"

from app.db import Base, engine, SessionLocal, seed_default_users

Base.metadata.create_all(bind=engine)
with SessionLocal() as _db:
    seed_default_users(_db)


