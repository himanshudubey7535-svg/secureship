import pytest

from app.core import limits
from app.core.config import settings
from app.services import risk_engine, trivy_service
from app.services.recommendations import build_recommendations
from tests.conftest import SAMPLE_TRIVY, register
from types import SimpleNamespace


@pytest.fixture(autouse=True)
def _reset_limits():
    limits.reset()


def mock(monkeypatch, report):
    monkeypatch.setattr(trivy_service, "scan_image", lambda ref: {
        "raw": report, "vulnerabilities": trivy_service.parse_trivy_output(report)})


def only(sev, n):
    return {"Results": [{"Vulnerabilities": [
        {"VulnerabilityID": f"CVE-{i}", "PkgName": "p", "InstalledVersion": "1", "Severity": sev}
        for i in range(n)]}]}


def post_scan(client, h):
    return client.post("/api/scans", json={"image_name": "nginx", "image_tag": "latest"}, headers=h)


def test_high_only_image_passes_default_policy_with_warning(client, auth_headers, monkeypatch):
    mock(monkeypatch, only("HIGH", 8))
    body = post_scan(client, auth_headers).json()
    assert body["high_count"] == 8 and body["critical_count"] == 0
    assert body["policy"]["passed"] is True and body["policy"]["warnings"]


def test_high_blocking_policy_violation(client, auth_headers, monkeypatch):
    mock(monkeypatch, only("HIGH", 8))
    client.put("/api/policies", headers=auth_headers, json={
        "max_critical": 0, "max_high": 5, "block_on_critical": True, "block_on_high": True})
    assert post_scan(client, auth_headers).json()["policy"]["passed"] is False


def test_score_explanation_in_response(client, auth_headers, monkeypatch):
    mock(monkeypatch, SAMPLE_TRIVY)
    ex = post_scan(client, auth_headers).json()["explanation"]
    assert ex["total_risk"] == 17  # 10 + 6 + 1
    assert {f["severity"]: f["points"] for f in ex["factors"]}["critical"] == 10
    assert abs(sum(f["share"] for f in ex["factors"]) - 100) < 0.2


def test_explain_with_no_risk():
    ex = risk_engine.explain({})
    assert ex["total_risk"] == 0 and all(f["share"] == 0 for f in ex["factors"])


def test_stats_come_from_real_scans(client, auth_headers, monkeypatch):
    empty = client.get("/api/scans/stats", headers=auth_headers).json()
    assert empty["total_scans"] == 0 and empty["average_score"] is None
    mock(monkeypatch, SAMPLE_TRIVY)
    post_scan(client, auth_headers)
    post_scan(client, auth_headers)
    stats = client.get("/api/scans/stats", headers=auth_headers).json()
    assert stats["total_images"] == 1 and stats["total_scans"] == 2
    assert stats["total_vulnerabilities"] == 6 and stats["critical_vulnerabilities"] == 2
    assert stats["severity_distribution"]["high"] == 2


def test_stats_are_per_user(client, auth_headers, monkeypatch):
    mock(monkeypatch, SAMPLE_TRIVY)
    post_scan(client, auth_headers)
    other = register(client, username="bob", email="bob@example.com").json()["token"]
    stats = client.get("/api/scans/stats", headers={"Authorization": f"Bearer {other}"}).json()
    assert stats["total_scans"] == 0


def test_recommendations_endpoint(client, auth_headers, monkeypatch):
    mock(monkeypatch, SAMPLE_TRIVY)
    sid = post_scan(client, auth_headers).json()["id"]
    r = client.get(f"/api/scans/{sid}/recommendations", headers=auth_headers).json()
    assert r["fixable"] == 1 and r["unfixable"] == 2
    assert r["recommendations"][0]["package_name"] == "openssl"
    assert r["recommendations"][0]["upgrade_to"] == "1.1"


def test_recommendation_picks_highest_fix_and_groups_by_package():
    v = lambda cve, sev, fix: SimpleNamespace(package_name="libssl", installed_version="1.0", cve_id=cve,
                                              severity=sev, fixed_version=fix)
    out = build_recommendations([v("A", "LOW", "1.2.9"), v("B", "CRITICAL", "1.2.10, 1.3.1"), v("C", "HIGH", None)])
    assert out["fixable"] == 2 and out["unfixable"] == 1
    rec = out["recommendations"][0]
    assert rec["upgrade_to"] == "1.3.1" and rec["worst_severity"] == "CRITICAL" and rec["fixes"] == 2


def test_scan_rate_limit(client, auth_headers, monkeypatch):
    mock(monkeypatch, only("LOW", 1))
    monkeypatch.setattr(settings, "SCAN_RATE_LIMIT_PER_HOUR", 2)
    assert post_scan(client, auth_headers).status_code == 200
    assert post_scan(client, auth_headers).status_code == 200
    assert post_scan(client, auth_headers).status_code == 429


def test_busy_scanner_returns_503_and_leaves_no_record(client, auth_headers, monkeypatch):
    mock(monkeypatch, only("LOW", 1))
    monkeypatch.setattr(limits, "_active", limits.threading.BoundedSemaphore(1))
    limits._active.acquire()  # simulate a scan already running
    assert post_scan(client, auth_headers).status_code == 503
    assert client.get("/api/scans", headers=auth_headers).json() == []


def test_oversized_body_rejected(client, auth_headers):
    r = client.post("/api/scans", headers=auth_headers, content=b"x" * 200_000)
    assert r.status_code == 413


def test_security_headers_present(client):
    r = client.get("/api/health")
    assert r.headers["x-content-type-options"] == "nosniff" and r.headers["x-frame-options"] == "DENY"


@pytest.mark.parametrize("name", ["nginx@sha256:" + "a" * 64, "ghcr.io/org/app", "localhost:5000/team/app"])
def test_valid_references_accepted(client, auth_headers, monkeypatch, name):
    mock(monkeypatch, only("LOW", 1))
    r = client.post("/api/scans", json={"image_name": name, "image_tag": "1.0"}, headers=auth_headers)
    assert r.status_code == 200
