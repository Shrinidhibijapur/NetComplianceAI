from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..compliance.engine import evaluate_controls, summarize
from ..db import ConfigRecord, get_db
from ..models import ComplianceReport
from ..rules.loader import UnknownFrameworkError, load_rules
from .engine import render_report_html, render_report_pdf

router = APIRouter(prefix="/reporting", tags=["reporting"])


@router.get("/{config_id}/pdf")
def download_report_pdf(config_id: int, framework: str = "CIS", db: Session = Depends(get_db)) -> Response:
    record = db.get(ConfigRecord, config_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"No config record with id {config_id}")

    try:
        rules = load_rules(framework)
    except UnknownFrameworkError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    findings = evaluate_controls(record.normalized["controls"], record.vendor, rules)
    report = ComplianceReport(
        device_id=record.device_id,
        vendor=record.vendor,
        framework=framework.upper(),
        findings=findings,
        summary=summarize(findings),
    )

    html = render_report_html(
        report,
        os_version=record.normalized.get("os_version"),
        serial_number=record.normalized.get("serial_number"),
    )
    pdf_bytes = render_report_pdf(html)

    filename = f"{record.device_id}_{framework.upper()}_report.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
