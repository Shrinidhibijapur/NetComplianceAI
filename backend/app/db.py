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


class ParseRule(Base):
    """Phase 4: a persisted, admin-approved parse rule that the normalizer
    consults after built-in YAML profiles (closes D1 & D2).

    Each rule is a generalized regex (with an optional capture group) that
    maps a matched configuration line to a target_field value — no code change
    or restart required after the admin approves it in the UI.
    """

    __tablename__ = "parse_rules"

    id = Column(Integer, primary_key=True)
    # Scope — use "*" to match any vendor / platform / os_range
    vendor = Column(String, index=True, nullable=False)
    platform = Column(String, default="*")   # e.g. "ios", "junos", "*"
    os_range = Column(String, default="*")   # e.g. ">=15.0", "*"
    # Generalized regex (MULTILINE); may contain one capture group for value extraction
    pattern = Column(Text, nullable=False)
    # Original line the admin reviewed (for auditability)
    example_line = Column(Text, nullable=False)
    # Dotted path into NormalizedConfig.controls, e.g. "ssh_version"
    target_field = Column(String, nullable=False, index=True)
    # How the captured group is interpreted: "string" | "int" | "float" | "bool" | "map"
    value_type = Column(String, default="string")
    # For "map" type: JSON dict mapping raw captured text -> Python value
    value_map = Column(JSON, default=dict)
    # Static value when no capture group (pattern presence alone sets this value)
    static_value = Column(JSON, nullable=True)
    semantic_category = Column(String, default="")   # e.g. "Authentication", "Remote Access"
    source = Column(String, default="human")         # "human" | "llm-approved"
    confidence = Column(Float, default=1.0)          # embedding confidence at proposal time
    approved_by = Column(String, default="admin")
    approved_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    # 1 = active, 0 = disabled (integer for SQLite compatibility)
    active = Column(Integer, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuditEvent(Base):
    """Append-only record of a state-changing action. Phase 1 logs ingestion only (Phase 6 widens it)."""

    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    # config_uploaded | config_upload_rejected | rule_approved | rule_disabled | rule_deleted
    event_type = Column(String, index=True)
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
