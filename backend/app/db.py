import os
from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Defaults to a local SQLite file so Phase 0/1 can be tested without Postgres/Docker running.
# docker-compose overrides this with the real Postgres URL.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./complianceai.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class ConfigRecord(Base):
    __tablename__ = "config_records"

    id = Column(Integer, primary_key=True)
    device_id = Column(String, index=True)
    vendor = Column(String, index=True)
    raw_config = Column(Text)
    normalized = Column(JSON)
    parse_confidence = Column(Float)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class TrainingExampleRow(Base):
    """A (line -> canonical control) mapping the AI training loop can match against (Section 4.2).
    Seeded with hand-labeled examples on first boot; grows as admins label unrecognized lines."""

    __tablename__ = "training_examples"

    id = Column(Integer, primary_key=True)
    vendor = Column(String, index=True)
    line_text = Column(Text)
    canonical_key = Column(String, index=True)
    source = Column(String, default="human")  # "seed" or "human"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuditEvent(Base):
    """Append-only record of a state-changing action. Phase 1 logs ingestion only (Phase 6 widens it)."""

    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    event_type = Column(String, index=True)  # config_uploaded | config_upload_rejected
    actor = Column(String, default="anonymous")
    subject = Column(String)  # device_id or filename
    config_id = Column(Integer, index=True)
    details = Column(JSON)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
