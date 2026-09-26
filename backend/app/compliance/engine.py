from ..models import ComplianceRule, Finding


def evaluate_controls(controls: dict, vendor: str, rules: list[ComplianceRule]) -> list[Finding]:
    """Walk a device's normalized controls against one framework's rule set (Section 5)."""
    findings = []
    for rule in rules:
        actual = controls.get(rule.canonical_key)

        if rule.canonical_key not in controls:
            status = "unknown"
        elif actual == rule.expected:
            status = "pass"
        else:
            status = "fail"

        findings.append(
            Finding(
                control_id=rule.control_id,
                title=rule.title,
                canonical_key=rule.canonical_key,
                expected=rule.expected,
                actual=actual,
                status=status,
                severity=rule.severity,
                remediation=rule.remediation.get(vendor) if status == "fail" else None,
            )
        )
    return findings


def summarize(findings: list[Finding]) -> dict[str, int]:
    summary = {"pass": 0, "fail": 0, "unknown": 0}
    for finding in findings:
        summary[finding.status] += 1
    return summary
