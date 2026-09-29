from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from ..models import ComplianceReport, Finding

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
        score=_score(report.summary),
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    )


def render_report_pdf(html: str) -> bytes:
    from weasyprint import HTML  # imported lazily: needs system Pango, only required for this call

    return HTML(string=html).write_pdf()


def _score(summary: dict[str, int]) -> int:
    evaluated = summary.get("pass", 0) + summary.get("fail", 0)
    if evaluated == 0:
        return 0
    return round(100 * summary.get("pass", 0) / evaluated)


_DARK = (13, 17, 23)
_MUTED_TEXT = (87, 96, 106)
_BORDER = (208, 215, 222)
_LIGHT_BG = (246, 248, 250)
_OK = (35, 134, 54)
_DANGER = (209, 51, 47)
_WARN = (154, 103, 0)
_ACCENT = (9, 66, 150)


def _score_color(score: int) -> tuple[int, int, int]:
    if score >= 80:
        return _OK
    if score >= 50:
        return _WARN
    return _DANGER


def _status_color(status: str) -> tuple[int, int, int]:
    return {"pass": _OK, "fail": _DANGER}.get(status, _MUTED_TEXT)


def _severity_color(severity: str) -> tuple[int, int, int]:
    return {"high": _DANGER, "medium": _WARN, "low": _MUTED_TEXT}.get(severity, _MUTED_TEXT)


def render_report_pdf_fallback(
    report: ComplianceReport, os_version: str | None = None, serial_number: str | None = None
) -> bytes:
    """Pure-Python PDF renderer (no native Pango/Cairo deps) that mirrors the branded HTML
    report: colored header band, a compliance score, and card-style findings with
    status/severity badges — used wherever WeasyPrint's system libs aren't available."""
    from fpdf import FPDF

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    score = _score(report.summary)

    class ComplianceReportPDF(FPDF):
        def header(self):
            self.set_fill_color(*_DARK)
            self.rect(0, 0, self.w, 24, style="F")
            self.set_xy(15, 6)
            self.set_text_color(255, 255, 255)
            self.set_font("Helvetica", "B", 15)
            self.cell(120, 7, "ComplianceAI", new_x="LMARGIN", new_y="NEXT")
            self.set_x(15)
            self.set_font("Helvetica", "", 9)
            self.set_text_color(170, 178, 186)
            self.cell(120, 5, "Network Security Compliance Audit Report", new_x="LMARGIN", new_y="NEXT")

            self.set_xy(self.w - 85, 7)
            self.set_font("Helvetica", "B", 10)
            self.set_text_color(255, 255, 255)
            self.cell(70, 5, f"{report.framework} FRAMEWORK", align="R", new_x="LMARGIN", new_y="NEXT")
            self.set_x(self.w - 85)
            self.set_font("Helvetica", "", 8)
            self.set_text_color(170, 178, 186)
            self.cell(70, 5, generated_at, align="R")

            self.set_text_color(0, 0, 0)
            self.set_y(30)

        def footer(self):
            self.set_y(-14)
            self.set_font("Helvetica", "", 8)
            self.set_text_color(*_MUTED_TEXT)
            self.cell(0, 8, f"Page {self.page_no()}  ·  ComplianceAI audit report  ·  {report.device_id}", align="C")

    pdf = ComplianceReportPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    left = pdf.l_margin
    full_w = pdf.w - pdf.l_margin - pdf.r_margin

    # ---- device info box ----
    box_h = 22
    pdf.set_draw_color(*_BORDER)
    pdf.set_fill_color(*_LIGHT_BG)
    pdf.rect(left, pdf.get_y(), full_w, box_h, style="DF")
    info_y = pdf.get_y() + 4
    fields = [
        ("Device ID", report.device_id),
        ("Vendor", report.vendor),
        ("OS Version", os_version or "Unknown"),
        ("Serial Number", serial_number or "Unknown"),
    ]
    col_w = full_w / 2
    for i, (label, value) in enumerate(fields):
        col = i % 2
        row = i // 2
        pdf.set_xy(left + 6 + col * col_w, info_y + row * 7)
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.set_text_color(*_MUTED_TEXT)
        pdf.cell(28, 5, label.upper())
        pdf.set_font("Helvetica", "", 9.5)
        pdf.set_text_color(20, 20, 20)
        pdf.cell(col_w - 34, 5, str(value))
    pdf.set_y(info_y + box_h - 2)
    pdf.ln(10)

    # ---- score + summary row ----
    row_y = pdf.get_y()
    score_w = 42
    pdf.set_draw_color(*_BORDER)
    pdf.rect(left, row_y, score_w, 26, style="D")
    pdf.set_xy(left, row_y + 4)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(*_score_color(score))
    pdf.cell(score_w, 10, f"{score}%", align="C")
    pdf.set_xy(left, row_y + 15)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*_MUTED_TEXT)
    pdf.cell(score_w, 5, "COMPLIANCE SCORE", align="C")

    stats = [("Pass", report.summary.get("pass", 0), _OK), ("Fail", report.summary.get("fail", 0), _DANGER),
              ("Unknown", report.summary.get("unknown", 0), _MUTED_TEXT)]
    stat_w = (full_w - score_w - 8) / 3
    for i, (label, count, color) in enumerate(stats):
        x = left + score_w + 8 + i * (stat_w + 4)
        pdf.set_fill_color(*color)
        pdf.rect(x, row_y, stat_w, 26, style="F")
        pdf.set_xy(x, row_y + 4)
        pdf.set_font("Helvetica", "B", 18)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(stat_w, 10, str(count), align="C")
        pdf.set_xy(x, row_y + 15)
        pdf.set_font("Helvetica", "", 8.5)
        pdf.cell(stat_w, 5, label.upper(), align="C")
    pdf.set_text_color(0, 0, 0)
    pdf.set_y(row_y + 26 + 10)

    # ---- findings ----
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_x(left)
    pdf.cell(0, 7, f"Findings ({len(report.findings)})", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    content_w = full_w - 10
    for finding in report.findings:
        _draw_finding_card(pdf, finding, left, full_w, content_w)

    return bytes(pdf.output())


def _finding_body_lines(pdf, finding: Finding, content_w: float):
    pdf.set_font("Helvetica", "", 9)
    exp_line = f"Expected: {finding.expected}    Actual: {finding.actual if finding.actual is not None else 'n/a'}"
    exp_lines = pdf.multi_cell(content_w, 5, exp_line, dry_run=True, output="LINES")
    rem_lines: list[str] = []
    if finding.remediation:
        rem_lines = pdf.multi_cell(content_w, 5, finding.remediation, dry_run=True, output="LINES")
    return exp_lines, rem_lines


def _card_height(pdf, finding: Finding, content_w: float) -> float:
    exp_lines, rem_lines = _finding_body_lines(pdf, finding, content_w)
    height = 8 + 9 + len(exp_lines) * 5 + 4  # title row + badge row + expected/actual
    if rem_lines:
        height += 6 + len(rem_lines) * 5 + 4  # "REMEDIATION" label + lines
    return height + 8  # top/bottom card padding


def _badge(pdf, text: str, color: tuple[int, int, int]) -> None:
    pdf.set_font("Helvetica", "B", 8)
    w = pdf.get_string_width(text.upper()) + 6
    h = 5.5
    x, y = pdf.get_x(), pdf.get_y()
    pdf.set_fill_color(*color)
    pdf.rect(x, y, w, h, style="F", round_corners=True, corner_radius=1)
    pdf.set_xy(x, y)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(w, h, text.upper(), align="C")
    pdf.set_text_color(0, 0, 0)
    pdf.set_xy(x + w + 3, y)


def _draw_finding_card(pdf, finding: Finding, left: float, full_w: float, content_w: float) -> None:
    height = _card_height(pdf, finding, content_w)
    if pdf.get_y() + height > pdf.page_break_trigger:
        pdf.add_page()

    x, y = left, pdf.get_y()
    sev_color = _severity_color(finding.severity)

    pdf.set_fill_color(*sev_color)
    pdf.rect(x, y, 1.8, height, style="F")
    pdf.set_draw_color(*_BORDER)
    pdf.rect(x, y, full_w, height, style="D")

    pdf.set_xy(x + 6, y + 4)
    pdf.set_font("Helvetica", "B", 10.5)
    pdf.set_text_color(20, 20, 20)
    pdf.cell(content_w - 6, 6, f"{finding.control_id}  ·  {finding.title}")

    pdf.set_xy(x + 6, y + 12)
    _badge(pdf, finding.status, _status_color(finding.status))
    _badge(pdf, finding.severity, sev_color)

    pdf.set_xy(x + 6, y + 19)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(60, 60, 60)
    exp_line = f"Expected: {finding.expected}    Actual: {finding.actual if finding.actual is not None else 'n/a'}"
    pdf.multi_cell(content_w - 6, 5, exp_line)

    if finding.remediation:
        pdf.set_x(x + 6)
        pdf.ln(1)
        pdf.set_x(x + 6)
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.set_text_color(*_WARN)
        pdf.cell(0, 5, "REMEDIATION", new_x="LMARGIN", new_y="NEXT")
        pdf.set_x(x + 6)
        pdf.set_font("Helvetica", "", 8.5)
        pdf.set_text_color(60, 60, 60)
        pdf.multi_cell(content_w - 6, 5, finding.remediation)

    pdf.set_text_color(0, 0, 0)
    pdf.set_y(y + height + 4)
