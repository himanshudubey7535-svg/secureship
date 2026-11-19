"""Turn findings into "upgrade package X to version Y" advice using Trivy's FixedVersion data."""
import re

RANK = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "UNKNOWN": 4}


def _version_key(v: str):
    return [int(x) if x.isdigit() else x for x in re.split(r"[.\-+:~_]", v)]


def _highest(fixed: str) -> str:
    """Trivy may list several fixed versions ("1.2.3, 1.3.1"); pick the highest comparable one."""
    candidates = [c.strip() for c in fixed.split(",") if c.strip()]
    try:
        return max(candidates, key=_version_key)
    except TypeError:  # mixed int/str parts are not comparable; fall back to the last listed
        return candidates[-1]


def build_recommendations(vulns) -> dict:
    groups: dict[tuple, dict] = {}
    fixable = 0
    for v in vulns:
        if not v.fixed_version:
            continue
        fixable += 1
        g = groups.setdefault((v.package_name, v.installed_version), {
            "package_name": v.package_name, "installed_version": v.installed_version,
            "fixed": [], "cve_ids": [], "worst": "UNKNOWN",
        })
        g["fixed"].append(_highest(v.fixed_version))
        g["cve_ids"].append(v.cve_id)
        if RANK.get(v.severity, 9) < RANK[g["worst"]]:
            g["worst"] = v.severity

    recs = []
    for g in groups.values():
        try:
            target = max(g["fixed"], key=_version_key)
        except TypeError:
            target = g["fixed"][-1]
        recs.append({
            "package_name": g["package_name"], "installed_version": g["installed_version"],
            "upgrade_to": target, "fixes": len(g["cve_ids"]),
            "worst_severity": g["worst"], "cve_ids": g["cve_ids"],
        })
    recs.sort(key=lambda r: (RANK[r["worst_severity"]], -r["fixes"], r["package_name"] or ""))
    return {
        "total_vulnerabilities": len(vulns), "fixable": fixable,
        "unfixable": len(vulns) - fixable, "recommendations": recs,
    }
