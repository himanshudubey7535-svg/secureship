from types import SimpleNamespace

from app.services.policy_engine import evaluate_policy


def policy(**kw):
    base = dict(max_critical=0, max_high=5, block_on_critical=True, block_on_high=False)
    base.update(kw)
    return SimpleNamespace(**base)


def test_clean_passes():
    assert evaluate_policy({"critical": 0, "high": 0}, policy())["passed"] is True


def test_critical_over_limit_blocks():
    r = evaluate_policy({"critical": 1, "high": 0}, policy())
    assert r["passed"] is False and len(r["violations"]) == 1


def test_critical_within_limit_passes():
    assert evaluate_policy({"critical": 2}, policy(max_critical=2))["passed"] is True


def test_high_over_limit_warns_when_not_blocking():
    r = evaluate_policy({"critical": 0, "high": 9}, policy())
    assert r["passed"] is True and len(r["warnings"]) == 1


def test_high_over_limit_blocks_when_enabled():
    r = evaluate_policy({"critical": 0, "high": 9}, policy(block_on_high=True))
    assert r["passed"] is False


def test_critical_not_blocking_when_flag_off():
    r = evaluate_policy({"critical": 3}, policy(block_on_critical=False))
    assert r["passed"] is True and r["warnings"]
