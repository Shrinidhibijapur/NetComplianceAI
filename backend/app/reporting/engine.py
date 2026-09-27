from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from ..models import ComplianceReport

TEMPLATES_DIR = Path(__file__).parent / "templates"

_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)


def render_report_html(
    report: ComplianceReport, os_version: str | None = None, serial_number: str | None = None
) -> str:
    template = _env.get_template("report.html")
    return template.render(
        device_id=report.device_id,
        vendor=report.vendor,
        framework=report.framework,
        os_version=os_version,
        serial_number=serial_number,
        summary=report.summary,
        findings=report.findings,
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    )


def render_report_pdf(html: str) -> bytes:
    from weasyprint import HTML  # imported lazily: needs system Pango, only required for this call

    return HTML(string=html).write_pdf()
