"""
Phase 4 AI-training routes.

Extends the Phase 1/2 label endpoint with:
  - POST /ai-training/approve     — generalise a line into a ParseRule and trigger re-normalization
  - POST /ai-training/preview     — preview: how many lines in a config the pattern would match
  - GET  /ai-training/rules       — list all ParseRules
  - PATCH /ai-training/rules/{id}/disable — disable (soft-delete) a rule
  - DELETE /ai-training/rules/{id}        — permanently remove a rule

All write operations emit an AuditEvent.
"""

from __future__ import annotations

import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth.dependencies import User, require_role
from ..db import AuditEvent, ConfigRecord, ParseRule, SessionLocal, TrainingExampleRow, get_db
from ..models import (
    ApproveRuleRequest,
    LabelRequest,
    LearnedRulesResponse,
    ParseRuleOut,
    PendingTrainingResponse,
    RulePreviewResult,
)
from .embedder import EmbeddingUnavailable
from .engine import classify_line
from .state import vector_store
from .store import TrainingExample

router = APIRouter(prefix="/ai-training", tags=["ai-training"])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _renormalize_vendor(vendor: str) -> int:
    """Re-run normalize_config on every ConfigRecord for this vendor.

    Returns the count of records that were updated.
    """
    from ..normalization.engine import normalize_config

    db = SessionLocal()
    try:
        records = db.query(ConfigRecord).filter(ConfigRecord.vendor == vendor).all()
        updated = 0
        for record in records:
            if not record.raw_config:
                continue
            try:
                result = normalize_config(vendor, record.device_id, record.raw_config)
                # mode="json" converts datetime → ISO string so SQLAlchemy JSON column serializes cleanly
                record.normalized = result.model_dump(mode="json")
                record.parse_confidence = result.parse_confidence
                updated += 1
            except Exception:  # noqa: BLE001
                pass
        db.commit()
        return updated
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Existing Phase 2 endpoints (unchanged behaviour)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/pending/{config_id}",
    responses={
        404: {"description": "Config record not found"},
        503: {"description": "Embedding model unavailable"},
    },
)
def pending_lines(
    config_id: int, db: Annotated[Session, Depends(get_db)]
) -> PendingTrainingResponse:
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
def label_line(
    payload: LabelRequest, db: Annotated[Session, Depends(get_db)]
) -> dict:
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


# ─────────────────────────────────────────────────────────────────────────────
# Phase 4: ParseRule approval
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/approve",
    responses={
        403: {"description": "Admin or Auditor privileges required"},
        422: {"description": "Invalid regex pattern"},
    },
)
def approve_rule(
    payload: ApproveRuleRequest,
    db: Annotated[Session, Depends(get_db)],
    user: User = Depends(require_role(["admin", "auditor"])),
) -> dict:
    """Admin or Auditor approves a generalized parse rule from the Training UI."""
    try:
        re.compile(payload.pattern)
    except re.error as exc:
        raise HTTPException(status_code=422, detail=f"Invalid regex: {exc}") from exc

    actor_name = user.username if user else payload.approved_by

    rule = ParseRule(
        vendor=payload.vendor,
        platform=payload.platform,
        os_range=payload.os_range,
        pattern=payload.pattern,
        example_line=payload.example_line,
        target_field=payload.target_field,
        value_type=payload.value_type,
        value_map=payload.value_map or {},
        static_value=payload.static_value,
        semantic_category=payload.semantic_category,
        source="human",
        confidence=payload.confidence,
        approved_by=actor_name,
        active=1,
    )
    db.add(rule)

    audit = AuditEvent(
        event_type="rule_approved",
        actor=actor_name,
        subject=payload.target_field,
        config_id=None,
        status="success",
        details={
            "vendor": payload.vendor,
            "pattern": payload.pattern,
            "target_field": payload.target_field,
            "example_line": payload.example_line,
        },
    )
    db.add(audit)
    db.commit()
    db.refresh(rule)

    updated_count = _renormalize_vendor(payload.vendor)

    return {
        "status": "approved",
        "rule_id": rule.id,
        "renormalized_configs": updated_count,
    }


@router.post(
    "/preview",
    responses={
        404: {"description": "Config record not found"},
        422: {"description": "Invalid regex pattern"},
    },
)
def preview_pattern(
    payload: dict, db: Annotated[Session, Depends(get_db)]
) -> RulePreviewResult:
    """Preview: given a pattern and a config_id, show how many lines it would match."""
    pattern_str = payload.get("pattern", "")
    config_id = payload.get("config_id")

    try:
        compiled = re.compile(pattern_str, re.MULTILINE)
    except re.error as exc:
        raise HTTPException(status_code=422, detail=f"Invalid regex: {exc}") from exc

    if config_id is None:
        return RulePreviewResult(pattern=pattern_str, match_count=0, matched_lines=[])

    record = db.get(ConfigRecord, config_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"No config record with id {config_id}")

    raw = record.raw_config or ""
    matched_lines = []
    for m in compiled.finditer(raw):
        line_no = raw.count("\n", 0, m.start())
        lines = raw.splitlines()
        line_text = lines[line_no] if line_no < len(lines) else ""
        matched_lines.append(line_text.strip())

    return RulePreviewResult(
        pattern=pattern_str,
        match_count=len(matched_lines),
        matched_lines=matched_lines[:10],
    )


# ─────────────────────────────────────────────────────────────────────────────
# Phase 4: Rule management
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/rules")
def list_rules(
    db: Annotated[Session, Depends(get_db)],
    page: int | None = None,
    page_size: int | None = None,
) -> LearnedRulesResponse | dict:
    """List all ParseRules (active and disabled), ordered newest-first."""
    query = db.query(ParseRule).order_by(ParseRule.created_at.desc(), ParseRule.id.desc())
    total = query.count()

    if page is not None or page_size is not None:
        p = max(1, page or 1)
        ps = min(max(1, page_size or 20), 100)
        rows = query.offset((p - 1) * ps).limit(ps).all()
        rules_out = [
            ParseRuleOut(
                id=r.id,
                vendor=r.vendor,
                platform=r.platform or "*",
                os_range=r.os_range or "*",
                pattern=r.pattern,
                example_line=r.example_line,
                target_field=r.target_field,
                value_type=r.value_type or "string",
                value_map=r.value_map or {},
                static_value=r.static_value,
                semantic_category=r.semantic_category or "",
                source=r.source or "human",
                confidence=r.confidence or 1.0,
                approved_by=r.approved_by or "admin",
                approved_at=r.approved_at,
                active=bool(r.active),
                created_at=r.created_at,
            )
            for r in rows
        ]
        return {
            "items": [r.model_dump(mode="json") for r in rules_out],
            "total": total,
            "page": p,
            "page_size": ps,
            "pages": (total + ps - 1) // ps if total > 0 else 1,
        }

    rows = query.all()
    rules_out = [
        ParseRuleOut(
            id=r.id,
            vendor=r.vendor,
            platform=r.platform or "*",
            os_range=r.os_range or "*",
            pattern=r.pattern,
            example_line=r.example_line,
            target_field=r.target_field,
            value_type=r.value_type or "string",
            value_map=r.value_map or {},
            static_value=r.static_value,
            semantic_category=r.semantic_category or "",
            source=r.source or "human",
            confidence=r.confidence or 1.0,
            approved_by=r.approved_by or "admin",
            approved_at=r.approved_at,
            active=bool(r.active),
            created_at=r.created_at,
        )
        for r in rows
    ]
    return LearnedRulesResponse(rules=rules_out, total=len(rules_out))


@router.patch(
    "/rules/{rule_id}/disable",
    responses={
        403: {"description": "Admin or Auditor privileges required"},
        404: {"description": "Parse rule not found"},
    },
)
def disable_rule(
    rule_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: User = Depends(require_role(["admin", "auditor"])),
) -> dict:
    """Disable a ParseRule (soft-delete). The rule stays in the DB for audit purposes."""
    rule = db.get(ParseRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail=f"No parse rule with id {rule_id}")
    if not rule.active:
        return {"status": "already_disabled", "rule_id": rule_id}

    rule.active = 0
    db.add(
        AuditEvent(
            event_type="rule_disabled",
            actor=user.username,
            subject=rule.target_field,
            config_id=None,
            status="success",
            details={"rule_id": rule_id, "vendor": rule.vendor, "pattern": rule.pattern},
        )
    )
    db.commit()

    updated_count = _renormalize_vendor(rule.vendor)
    return {"status": "disabled", "rule_id": rule_id, "renormalized_configs": updated_count}


@router.delete(
    "/rules/{rule_id}",
    responses={
        403: {"description": "Admin privileges required"},
        404: {"description": "Parse rule not found"},
    },
)
def delete_rule(
    rule_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: User = Depends(require_role(["admin"])),
) -> dict:
    """Permanently delete a ParseRule (Admin only) and re-normalize affected configs."""
    rule = db.get(ParseRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail=f"No parse rule with id {rule_id}")

    vendor = rule.vendor
    db.add(
        AuditEvent(
            event_type="rule_deleted",
            actor=user.username,
            subject=rule.target_field,
            config_id=None,
            status="success",
            details={"rule_id": rule_id, "vendor": vendor, "pattern": rule.pattern},
        )
    )
    db.delete(rule)
    db.commit()

    updated_count = _renormalize_vendor(vendor)
    return {"status": "deleted", "rule_id": rule_id, "renormalized_configs": updated_count}
