import re
from typing import Any

from ..models import ComplianceRule, Finding


def _evaluate_operator(operator: str, actual: Any, expected: Any) -> bool:
    """Evaluate generic rule operators against actual vs expected values."""
    op = (operator or "equals").lower()

    if op == "equals":
        # Handle string vs bool / int equivalence cleanly
        if isinstance(actual, bool) and isinstance(expected, bool):
            return actual == expected
        return str(actual).strip().lower() == str(expected).strip().lower()

    if op == "not_equals":
        if isinstance(actual, bool) and isinstance(expected, bool):
            return actual != expected
        return str(actual).strip().lower() != str(expected).strip().lower()

    if op == "contains":
        if actual is None:
            return False
        return str(expected).lower() in str(actual).lower()

    if op == "not_contains":
        if actual is None:
            return True
        return str(expected).lower() not in str(actual).lower()

    if op == "in":
        if actual is None:
            return False
        if isinstance(expected, (list, tuple, set)):
            return actual in expected or str(actual) in [str(x) for x in expected]
        return str(actual).lower() in str(expected).lower()

    if op == "not_in":
        if actual is None:
            return True
        if isinstance(expected, (list, tuple, set)):
            return actual not in expected and str(actual) not in [str(x) for x in expected]
        return str(actual).lower() not in str(expected).lower()

    if op == "regex":
        if actual is None:
            return False
        return bool(re.search(str(expected), str(actual), re.IGNORECASE))

    if op == "greater_than":
        try:
            return float(actual) > float(expected)
        except (ValueError, TypeError):
            return False

    if op == "less_than":
        try:
            return float(actual) < float(expected)
        except (ValueError, TypeError):
            return False

    if op == "exists":
        return actual is not None and actual != ""

    if op == "not_exists":
        return actual is None or actual == ""

    # Default fallback to equality
    return actual == expected


def _is_vendor_applicable(vendor: str, rule_vendors: list[str]) -> bool:
    if not rule_vendors or "*" in rule_vendors:
        return True
    v_norm = (vendor or "").lower().strip()
    return any(v_norm == v.lower().strip() for v in rule_vendors)


def _is_platform_applicable(os_version: str | None, rule_platforms: list[str]) -> bool:
    if not rule_platforms or "*" in rule_platforms:
        return True
    if not os_version:
        return True  # If rule specifies platform list without "*", platform check applies if matched
    return any(p.lower() in os_version.lower() for p in rule_platforms)


def _extract_remediation_info(
    remediation_dict: dict[str, Any], vendor: str
) -> tuple[str | None, bool | None]:
    if not remediation_dict or not vendor:
        return None, None

    rem_val = remediation_dict.get(vendor) or remediation_dict.get("*")
    if rem_val is None:
        return None, None

    if isinstance(rem_val, str):
        return rem_val, True

    if isinstance(rem_val, dict):
        command = rem_val.get("command") or rem_val.get("cli") or rem_val.get("description")
        verified = bool(rem_val.get("verified", False))
        return command, verified

    return str(rem_val), False


def evaluate_controls(
    controls: dict,
    vendor: str,
    rules: list[ComplianceRule],
    os_version: str | None = None,
) -> list[Finding]:
    """Walk a device's normalized controls against one framework's rule set (Phase 3 Engine)."""
    findings: list[Finding] = []

    for rule in rules:
        ck = rule.canonical_key or rule.target_field or ""
        ctrl_id = rule.control_id or rule.rule_id or "RULE-0"

        # 1. Vendor & Platform Applicability
        if not _is_vendor_applicable(vendor, rule.vendors) or not _is_platform_applicable(
            os_version, rule.platforms
        ):
            findings.append(
                Finding(
                    control_id=ctrl_id,
                    rule_id=ctrl_id,
                    title=rule.title,
                    framework=rule.framework,
                    framework_reference=rule.framework_reference,
                    canonical_key=ck,
                    operator=rule.operator,
                    expected=rule.expected,
                    actual=controls.get(ck),
                    status="not_applicable",
                    severity=rule.severity,
                    source=rule.source,
                    verified=rule.verified,
                    remediation=None,
                    remediation_verified=None,
                )
            )
            continue

        # 2. Key Presence & Missing Data Check (ABSENT != FALSE != UNKNOWN)
        if ck not in controls:
            op = (rule.operator or "equals").lower()
            if op == "not_exists":
                status = "pass"
            elif op == "exists":
                status = "fail"
            else:
                status = "unknown"
            actual = None
        else:
            actual = controls[ck]
            is_pass = _evaluate_operator(rule.operator, actual, rule.expected)
            status = "pass" if is_pass else "fail"

        rem_cmd, rem_verified = None, None
        if status == "fail":
            rem_cmd, rem_verified = _extract_remediation_info(rule.remediation, vendor)

        findings.append(
            Finding(
                control_id=ctrl_id,
                rule_id=ctrl_id,
                title=rule.title,
                framework=rule.framework,
                framework_reference=rule.framework_reference,
                canonical_key=ck,
                operator=rule.operator,
                expected=rule.expected,
                actual=actual,
                status=status,
                severity=rule.severity,
                source=rule.source,
                verified=rule.verified,
                remediation=rem_cmd,
                remediation_verified=rem_verified,
            )
        )

    return findings


def summarize(findings: list[Finding]) -> dict[str, int]:
    summary = {"pass": 0, "fail": 0, "unknown": 0, "not_applicable": 0}
    for finding in findings:
        status = finding.status
        if status in summary:
            summary[status] += 1
        else:
            summary[status] = 1
    return summary
