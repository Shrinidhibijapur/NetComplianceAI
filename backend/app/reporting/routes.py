from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..compliance.engine import evaluate_controls, summarize
from ..db import ConfigRecord, ParseRule, get_db
from ..models import ComplianceReport, Finding
from ..rules.loader import UnknownFrameworkError, load_rules
from .engine import render_report_html, render_report_pdf, render_report_pdf_fallback

router = APIRouter(prefix="/reporting", tags=["reporting"])


# ── Pydantic response models ─────────────────────────────────────────────────

class ReportMetadata(BaseModel):
    config_id: int
    device_id: str
    vendor: str
    hostname: str | None
    model: str | None
    os_version: str | None
    serial_number: str | None
    framework: str
    compliance_score: int
    pass_count: int
    fail_count: int
    unknown_count: int
    not_applicable_count: int
    unmapped_line_count: int
    generated_at: str


class FindingExport(BaseModel):
    control_id: str
    title: str
    framework: str | None
    framework_reference: str | None
    canonical_key: str
    operator: str
    expected: Any
    actual: Any
    status: str
    severity: str
    source: str | None
    verified: bool
    remediation: str | None
    remediation_verified: bool | None
    remediation_status: str  # "verified" | "no_verified_remediation" | "not_applicable"


class ReportJsonExport(BaseModel):
    meta: ReportMetadata
    findings: list[FindingExport]
    unmapped_lines: list[str]
    learned_rules_used: list[dict]


class DevicePosture(BaseModel):
    config_id: int
    device_id: str
    vendor: str
    hostname: str | None
    os_version: str | None
    parse_confidence: float
    compliance_score: int
    pass_count: int
    fail_count: int
    unknown_count: int
    unmapped_count: int
    last_scan: str


class FleetSummary(BaseModel):
    framework: str
    total_devices: int
    devices: list[DevicePosture]
    fleet_pass_total: int
    fleet_fail_total: int
    fleet_unknown_total: int
    fleet_score: int  # weighted average across all devices
    high_severity_fails: int
    medium_severity_fails: int
    low_severity_fails: int


# ── Helper ───────────────────────────────────────────────────────────────────

def _score(summary: dict[str, int]) -> int:
    evaluated = summary.get("pass", 0) + summary.get("fail", 0)
    if evaluated == 0:
        return 0
    return round(100 * summary.get("pass", 0) / evaluated)


def _remediation_status(finding: Finding) -> str:
    if finding.status in ("pass", "not_applicable"):
        return "not_applicable"
    if finding.remediation and finding.remediation_verified:
        return "verified"
    return "no_verified_remediation"


def _get_learned_rules_for_vendor(db: Session, vendor: str) -> list[dict]:
    """Return active learned rules for this vendor (for report appendix)."""
    rules = (
        db.query(ParseRule)
        .filter(
            ParseRule.active == 1,
            (ParseRule.vendor == vendor) | (ParseRule.vendor == "*"),
        )
        .all()
    )
    return [
        {
            "id": r.id,
            "pattern": r.pattern,
            "target_field": r.target_field,
            "vendor": r.vendor,
            "approved_by": r.approved_by,
            "approved_at": r.approved_at.isoformat(),
            "semantic_category": r.semantic_category,
        }
        for r in rules
    ]


def _build_report(db: Session, config_id: int, framework: str) -> tuple[ConfigRecord, ComplianceReport]:
    """Shared logic: load record, evaluate compliance. Single calculation path."""
    record = db.get(ConfigRecord, config_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"No config record with id {config_id}")

    try:
        rules = load_rules(framework)
    except UnknownFrameworkError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    normalized = record.normalized or {}
    os_version = normalized.get("os_version")
    findings = evaluate_controls(normalized.get("controls", {}), record.vendor, rules, os_version)

    report = ComplianceReport(
        device_id=record.device_id,
        vendor=record.vendor,
        framework=framework.upper(),
        findings=findings,
        summary=summarize(findings),
    )
    return record, report


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get(
    "/{config_id}/pdf",
    responses={
        400: {"description": "Unknown framework error"},
        404: {"description": "Config record not found"},
    },
)
def download_report_pdf(
    config_id: int, db: Annotated[Session, Depends(get_db)], framework: str = "CIS"
) -> Response:
    """Download a compliance audit PDF. Tries WeasyPrint first, falls back to fpdf2."""
    record, report = _build_report(db, config_id, framework)
    normalized = record.normalized or {}
    os_version = normalized.get("os_version")
    serial_number = normalized.get("serial_number")
    hostname = normalized.get("hostname")
    model = normalized.get("model")
    unmapped_lines = normalized.get("raw_unmapped_lines", [])
    learned_rules = _get_learned_rules_for_vendor(db, record.vendor)

    extra = {
        "hostname": hostname,
        "model": model,
        "unmapped_lines": unmapped_lines,
        "learned_rules": learned_rules,
    }

    try:
        html = render_report_html(
            report,
            os_version=os_version,
            serial_number=serial_number,
            extra=extra,
        )
        pdf_bytes = render_report_pdf(html)
    except (ImportError, OSError):
        pdf_bytes = render_report_pdf_fallback(
            report,
            os_version=os_version,
            serial_number=serial_number,
            extra=extra,
        )

    filename = f"{record.device_id}_{framework.upper()}_report.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/{config_id}/metadata",
    response_model=ReportMetadata,
    responses={
        400: {"description": "Unknown framework error"},
        404: {"description": "Config record not found"},
    },
)
def get_report_metadata(
    config_id: int, db: Annotated[Session, Depends(get_db)], framework: str = "CIS"
) -> ReportMetadata:
    """Return report metadata without generating the full PDF."""
    record, report = _build_report(db, config_id, framework)
    normalized = record.normalized or {}
    unmapped = normalized.get("raw_unmapped_lines", [])
    summary = report.summary
    return ReportMetadata(
        config_id=config_id,
        device_id=record.device_id,
        vendor=record.vendor,
        hostname=normalized.get("hostname"),
        model=normalized.get("model"),
        os_version=normalized.get("os_version"),
        serial_number=normalized.get("serial_number"),
        framework=framework.upper(),
        compliance_score=_score(summary),
        pass_count=summary.get("pass", 0),
        fail_count=summary.get("fail", 0),
        unknown_count=summary.get("unknown", 0),
        not_applicable_count=summary.get("not_applicable", 0),
        unmapped_line_count=len(unmapped),
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get(
    "/{config_id}/json",
    response_model=ReportJsonExport,
    responses={
        400: {"description": "Unknown framework error"},
        404: {"description": "Config record not found"},
    },
)
def export_report_json(
    config_id: int, db: Annotated[Session, Depends(get_db)], framework: str = "CIS"
) -> ReportJsonExport:
    """Export a full compliance report as structured JSON.
    Uses the SAME compliance engine as the PDF — no second calculation path."""
    record, report = _build_report(db, config_id, framework)
    normalized = record.normalized or {}
    unmapped = normalized.get("raw_unmapped_lines", [])
    learned_rules = _get_learned_rules_for_vendor(db, record.vendor)
    summary = report.summary

    meta = ReportMetadata(
        config_id=config_id,
        device_id=record.device_id,
        vendor=record.vendor,
        hostname=normalized.get("hostname"),
        model=normalized.get("model"),
        os_version=normalized.get("os_version"),
        serial_number=normalized.get("serial_number"),
        framework=framework.upper(),
        compliance_score=_score(summary),
        pass_count=summary.get("pass", 0),
        fail_count=summary.get("fail", 0),
        unknown_count=summary.get("unknown", 0),
        not_applicable_count=summary.get("not_applicable", 0),
        unmapped_line_count=len(unmapped),
        generated_at=datetime.now(timezone.utc).isoformat(),
    )

    findings_export = [
        FindingExport(
            control_id=f.control_id,
            title=f.title,
            framework=f.framework,
            framework_reference=f.framework_reference,
            canonical_key=f.canonical_key,
            operator=f.operator,
            expected=f.expected,
            actual=f.actual,
            status=f.status,
            severity=f.severity,
            source=f.source,
            verified=f.verified,
            remediation=f.remediation if (f.remediation and f.remediation_verified) else None,
            remediation_verified=f.remediation_verified,
            remediation_status=_remediation_status(f),
        )
        for f in report.findings
    ]

    return ReportJsonExport(
        meta=meta,
        findings=findings_export,
        unmapped_lines=unmapped,
        learned_rules_used=learned_rules,
    )


@router.get(
    "/fleet/summary",
    response_model=FleetSummary,
    responses={
        400: {"description": "Unknown framework error"},
    },
)
def get_fleet_summary(
    db: Annotated[Session, Depends(get_db)], framework: str = "CIS"
) -> FleetSummary:
    """Return compliance posture across ALL ingested devices.
    Evaluates each device against the given framework using the single shared engine.
    Returns per-device scores AND fleet-wide aggregates."""
    try:
        rules = load_rules(framework)
    except UnknownFrameworkError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    records = db.query(ConfigRecord).order_by(ConfigRecord.created_at.desc()).all()

    devices: list[DevicePosture] = []
    fleet_pass = fleet_fail = fleet_unknown = 0
    sev_high = sev_medium = sev_low = 0
    score_sum = 0

    for record in records:
        normalized = record.normalized or {}
        os_version = normalized.get("os_version")
        findings = evaluate_controls(
            normalized.get("controls", {}),
            record.vendor,
            rules,
            os_version,
        )
        summary = summarize(findings)
        score = _score(summary)
        score_sum += score

        fleet_pass += summary.get("pass", 0)
        fleet_fail += summary.get("fail", 0)
        fleet_unknown += summary.get("unknown", 0)

        for f in findings:
            if f.status == "fail":
                if f.severity == "high":
                    sev_high += 1
                elif f.severity == "medium":
                    sev_medium += 1
                else:
                    sev_low += 1

        devices.append(DevicePosture(
            config_id=record.id,
            device_id=record.device_id,
            vendor=record.vendor,
            hostname=normalized.get("hostname"),
            os_version=normalized.get("os_version"),
            parse_confidence=record.parse_confidence,
            compliance_score=score,
            pass_count=summary.get("pass", 0),
            fail_count=summary.get("fail", 0),
            unknown_count=summary.get("unknown", 0),
            unmapped_count=len(normalized.get("raw_unmapped_lines", [])),
            last_scan=record.created_at.isoformat(),
        ))

    total = len(devices)
    fleet_score = round(score_sum / total) if total > 0 else 0

    return FleetSummary(
        framework=framework.upper(),
        total_devices=total,
        devices=devices,
        fleet_pass_total=fleet_pass,
        fleet_fail_total=fleet_fail,
        fleet_unknown_total=fleet_unknown,
        fleet_score=fleet_score,
        high_severity_fails=sev_high,
        medium_severity_fails=sev_medium,
        low_severity_fails=sev_low,
    )

