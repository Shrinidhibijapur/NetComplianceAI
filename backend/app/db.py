import os
from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Defaults to a local SQLite file so Phase 0-5 can be tested without Postgres running.
# docker-compose or production env overrides this with the real Postgres URL.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./complianceai.db")

engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL scale tuning
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": int(os.environ.get("DB_POOL_SIZE", "10")),
        "max_overflow": int(os.environ.get("DB_MAX_OVERFLOW", "20")),
    })

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class User(Base):
    """Phase 6: User model for Authentication & Role-Based Access Control (RBAC)."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=False)
    # Roles: "admin" | "auditor" | "viewer"
    role = Column(String, index=True, default="viewer", nullable=False)
    active = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ConfigRecord(Base):
    __tablename__ = "config_records"

    id = Column(Integer, primary_key=True)
    device_id = Column(String, index=True)
    vendor = Column(String, index=True)
    raw_config = Column(Text)
    normalized = Column(JSON)
    parse_confidence = Column(Float)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class TrainingExampleRow(Base):
    """A (line -> canonical control) mapping the AI training loop can match against (Section 4.2)."""

    __tablename__ = "training_examples"

    id = Column(Integer, primary_key=True)
    vendor = Column(String, index=True)
    line_text = Column(Text)
    canonical_key = Column(String, index=True)
    source = Column(String, default="human")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ParseRule(Base):
    """Phase 4: a persisted, admin-approved parse rule that the normalizer
    consults after built-in YAML profiles.
    """

    __tablename__ = "parse_rules"

    id = Column(Integer, primary_key=True)
    vendor = Column(String, index=True, nullable=False)
    platform = Column(String, default="*")
    os_range = Column(String, default="*")
    pattern = Column(Text, nullable=False)
    example_line = Column(Text, nullable=False)
    target_field = Column(String, nullable=False, index=True)
    value_type = Column(String, default="string")
    value_map = Column(JSON, default=dict)
    static_value = Column(JSON, nullable=True)
    semantic_category = Column(String, default="")
    source = Column(String, default="human")
    confidence = Column(Float, default=1.0)
    approved_by = Column(String, default="admin")
    approved_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    active = Column(Integer, default=1, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuditEvent(Base):
    """Phase 6: Reliable audit trail for security-sensitive actions."""

    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    event_type = Column(String, index=True)  # login_success | login_failed | config_uploaded | rule_approved etc
    actor = Column(String, default="anonymous", index=True)
    subject = Column(String, nullable=True)  # device_id, username, or filename
    config_id = Column(Integer, index=True, nullable=True)
    status = Column(String, default="success", index=True)  # "success" | "failure"
    details = Column(JSON, default=dict)


def init_db():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_default_users(db)

def get_db():
    init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_default_users(db) -> None:
    """Seed default system users for Admin, Auditor, and Viewer roles if DB is empty."""
    from .auth.security import hash_password

    if db.query(User).count() > 0:
        return

    users = [
        User(
            username="admin",
            email="admin@compliance.ai",
            password_hash=hash_password("admin123"),
            role="admin",
            active=1,
        ),
        User(
            username="auditor",
            email="auditor@compliance.ai",
            password_hash=hash_password("auditor123"),
            role="auditor",
            active=1,
        ),
        User(
            username="viewer",
            email="viewer@compliance.ai",
            password_hash=hash_password("viewer123"),
            role="viewer",
            active=1,
        ),
    ]
    db.add_all(users)
    db.commit()
