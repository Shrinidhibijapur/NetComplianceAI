from app.compliance.engine import evaluate_controls, summarize
from app.models import ComplianceReport
from app.reporting.engine import render_report_html
from app.rules.loader import load_rules


def test_render_report_html_contains_findings_and_remediation():
    controls = {
        "ssh_version": "1",  # wrong -> fail, should carry remediation
        "telnet_enabled": False,
    }
    rules = load_rules("CIS")
    findings = evaluate_controls(controls, "cisco_ios", rules)
    report = ComplianceReport(
        device_id="core-sw-01",
        vendor="cisco_ios",
        framework="CIS",
        findings=findings,
        summary=summarize(findings),
    )

    html = render_report_html(report, os_version="17.3.4", serial_number="FDO12345ABC")

    assert "core-sw-01" in html
    assert "FDO12345ABC" in html
    assert "CIS-5.2.1" in html
    assert "ip ssh version 2" in html  # remediation for the failed ssh_version control
    assert "FAIL" in html
    assert "PASS" in html
