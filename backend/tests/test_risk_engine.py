import pytest

from app.services.risk_engine import assess, calculate_security_score, calculate_total_risk, categorize


def test_clean_image_scores_100():
    assert calculate_security_score({}) == 100.0
    assert assess({"critical": 0})[1] == "Excellent"


def test_weights():
    assert calculate_total_risk({"critical": 1, "high": 1, "medium": 1, "low": 1}) == 20


def test_score_decreases_with_more_risk():
    assert calculate_security_score({"high": 10}) < calculate_security_score({"high": 2})


def test_score_never_negative():
    assert calculate_security_score({"critical": 10000}) >= 0


@pytest.mark.parametrize("score,expected", [
    (100, "Excellent"), (90, "Excellent"), (89.9, "Good"), (70, "Good"),
    (69.9, "Needs Attention"), (40, "Needs Attention"), (39.9, "Critical Risk"), (0, "Critical Risk"),
])
def test_categories(score, expected):
    assert categorize(score) == expected
