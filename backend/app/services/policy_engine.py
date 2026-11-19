"""Evaluate scan severity counts against a user's security policy.

A threshold (max_critical / max_high) is only *blocking* when the matching
block_on_* flag is set. If the flag is off, exceeding the threshold produces a
warning but the scan still passes.
"""


def evaluate_policy(counts: dict, policy) -> dict:
    critical = int(counts.get("critical", 0) or 0)
    high = int(counts.get("high", 0) or 0)
    violations: list[str] = []
    warnings: list[str] = []

    checks = (
        ("critical", critical, policy.max_critical, policy.block_on_critical),
        ("high", high, policy.max_high, policy.block_on_high),
    )
    for label, count, limit, blocking in checks:
        if count > limit:
            message = f"{count} {label} vulnerabilities found; policy allows at most {limit}"
            (violations if blocking else warnings).append(message)

    return {"passed": not violations, "violations": violations, "warnings": warnings}
