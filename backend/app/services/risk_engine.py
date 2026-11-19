"""Security score calculation.

total_risk     = critical*10 + high*6 + medium*3 + low*1
security_score = 100 * exp(-total_risk / 50)      (100 = clean, trends toward 0)
"""
import math

WEIGHTS = {"critical": 10, "high": 6, "medium": 3, "low": 1}
NORMALIZATION_FACTOR = 50


def calculate_total_risk(counts: dict) -> int:
    return sum(int(counts.get(sev, 0) or 0) * w for sev, w in WEIGHTS.items())


def calculate_security_score(counts: dict) -> float:
    total_risk = calculate_total_risk(counts)
    score = 100 * math.exp(-total_risk / NORMALIZATION_FACTOR)
    return round(max(0.0, min(100.0, score)), 1)


def categorize(score: float) -> str:
    if score >= 90:
        return "Excellent"
    if score >= 70:
        return "Good"
    if score >= 40:
        return "Needs Attention"
    return "Critical Risk"


def assess(counts: dict) -> tuple[float, str]:
    score = calculate_security_score(counts)
    return score, categorize(score)


def explain(counts: dict) -> dict:
    """Break the score down so users can see what drives it.

    Each severity contributes count * weight to total_risk; `share` is its percentage of that total.
    This is a project-defined heuristic, not an industry-standard rating.
    """
    total = calculate_total_risk(counts)
    factors = []
    for sev, weight in WEIGHTS.items():
        count = int(counts.get(sev, 0) or 0)
        points = count * weight
        factors.append({
            "severity": sev, "count": count, "weight": weight, "points": points,
            "share": round(points / total * 100, 1) if total else 0.0,
        })
    return {
        "total_risk": total,
        "formula": "score = 100 * exp(-total_risk / 50), where total_risk = 10*critical + 6*high + 3*medium + 1*low",
        "factors": factors,
    }
