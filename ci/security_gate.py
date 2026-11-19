#!/usr/bin/env python3
"""Security gate for CI. Reads a Trivy JSON report and exits 1 when the policy is violated.

Thresholds come from environment variables so the workflow file stays the single place to configure them:
  MAX_CRITICAL   (default 0)      FAIL_ON_CRITICAL (default true)
  MAX_HIGH       (default 10)     FAIL_ON_HIGH     (default false)

Usage: python ci/security_gate.py trivy-report.json
Exit codes: 0 = passed, 1 = policy violated, 2 = report missing/unreadable (fails closed).
"""
import json
import os
import sys

SEVERITIES = ("CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN")


def _flag(name: str, default: bool) -> bool:
    return os.environ.get(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


def count_severities(report: dict) -> dict:
    counts = {s: 0 for s in SEVERITIES}
    for result in report.get("Results") or []:
        for vuln in result.get("Vulnerabilities") or []:
            sev = str(vuln.get("Severity", "UNKNOWN")).upper()
            counts[sev if sev in counts else "UNKNOWN"] += 1
    return counts


def evaluate(counts: dict, max_critical: int, max_high: int, fail_on_critical: bool, fail_on_high: bool):
    violations = []
    if fail_on_critical and counts["CRITICAL"] > max_critical:
        violations.append(f"{counts['CRITICAL']} critical vulnerabilities (allowed: {max_critical})")
    if fail_on_high and counts["HIGH"] > max_high:
        violations.append(f"{counts['HIGH']} high vulnerabilities (allowed: {max_high})")
    return violations


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: security_gate.py <trivy-report.json>", file=sys.stderr)
        return 2
    try:
        with open(argv[1], encoding="utf-8") as f:
            report = json.load(f)
        if not isinstance(report, dict):
            raise ValueError("report is not a JSON object")
        max_critical = int(os.environ.get("MAX_CRITICAL", "0"))
        max_high = int(os.environ.get("MAX_HIGH", "10"))
    except (OSError, ValueError) as exc:  # json.JSONDecodeError is a ValueError
        print(f"::error::Could not read scan report: {exc}")
        return 2

    counts = count_severities(report)
    violations = evaluate(counts, max_critical, max_high,
                          _flag("FAIL_ON_CRITICAL", True), _flag("FAIL_ON_HIGH", False))

    summary = ["### SecureShip security gate",
               "| Critical | High | Medium | Low | Unknown |", "|---|---|---|---|---|",
               "| " + " | ".join(str(counts[s]) for s in SEVERITIES) + " |", ""]
    summary.append("**FAILED**" if violations else "**PASSED**")
    summary += [f"- {v}" for v in violations]
    text = "\n".join(summary)
    print(text)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
            f.write(text + "\n")
    for v in violations:
        print(f"::error::Security gate failed: {v}")
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
