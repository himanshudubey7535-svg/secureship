import pytest

from app.services import trivy_service
from tests.conftest import SAMPLE_TRIVY, register


@pytest.fixture
def mock_trivy(monkeypatch):
    def fake(ref):
        return {"raw": SAMPLE_TRIVY, "vulnerabilities": trivy_service.parse_trivy_output(SAMPLE_TRIVY)}
    monkeypatch.setattr(trivy_service, "scan_image", fake)


def scan(client, headers, name="nginx", tag="latest"):
    return client.post("/api/scans", json={"image_name": name, "image_tag": tag}, headers=headers)


def test_scan_completes_and_scores(client, auth_headers, mock_trivy):
    r = scan(client, auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "completed"
    assert (body["critical_count"], body["high_count"], body["low_count"]) == (1, 1, 1)
    assert body["total_vulns"] == 3
    assert body["full_reference"] == "nginx:latest"
    assert 0 <= body["security_score"] <= 100
    assert body["policy"]["passed"] is False  # 1 critical > default limit of 0


def test_failed_scan_is_recorded(client, auth_headers, monkeypatch):
    def boom(ref):
        raise trivy_service.TrivyError("Image not found.")
    monkeypatch.setattr(trivy_service, "scan_image", boom)
    body = scan(client, auth_headers, name="nope").json()
    assert body["status"] == "failed" and "not found" in body["error_message"]
    assert client.get("/api/scans", headers=auth_headers).json()[0]["status"] == "failed"


def test_clean_image_scores_100(client, auth_headers, monkeypatch):
    monkeypatch.setattr(trivy_service, "scan_image", lambda ref: {"raw": {}, "vulnerabilities": []})
    body = scan(client, auth_headers).json()
    assert body["security_score"] == 100.0 and body["risk_category"] == "Excellent"
    assert body["policy"]["passed"] is True


def test_list_and_get(client, auth_headers, mock_trivy):
    sid = scan(client, auth_headers).json()["id"]
    assert len(client.get("/api/scans", headers=auth_headers).json()) == 1
    assert client.get(f"/api/scans/{sid}", headers=auth_headers).json()["id"] == sid


def test_vulnerabilities_filter_and_order(client, auth_headers, mock_trivy):
    sid = scan(client, auth_headers).json()["id"]
    allv = client.get(f"/api/scans/{sid}/vulnerabilities", headers=auth_headers).json()
    assert [v["severity"] for v in allv] == ["CRITICAL", "HIGH", "LOW"]
    crit = client.get(f"/api/scans/{sid}/vulnerabilities?severity=critical", headers=auth_headers).json()
    assert len(crit) == 1 and crit[0]["cve_id"] == "CVE-2024-0001"
    assert client.get(f"/api/scans/{sid}/vulnerabilities?severity=bogus", headers=auth_headers).status_code == 422


def test_users_cannot_see_each_others_scans(client, auth_headers, mock_trivy):
    sid = scan(client, auth_headers).json()["id"]
    other = register(client, username="bob", email="bob@example.com").json()["token"]
    h2 = {"Authorization": f"Bearer {other}"}
    assert client.get(f"/api/scans/{sid}", headers=h2).status_code == 404
    assert client.get(f"/api/scans/{sid}/vulnerabilities", headers=h2).status_code == 404
    assert client.get(f"/api/reports/{sid}/json", headers=h2).status_code == 404
    assert client.get("/api/scans", headers=h2).json() == []


@pytest.mark.parametrize("name", ["--help", "-v", "bad name", "x;rm -rf /"])
def test_invalid_image_names_rejected(client, auth_headers, name):
    assert scan(client, auth_headers, name=name).status_code == 422


def test_policy_roundtrip_changes_verdict(client, auth_headers, mock_trivy):
    assert client.get("/api/policies", headers=auth_headers).json()["max_critical"] == 0
    new = {"max_critical": 5, "max_high": 5, "block_on_critical": True, "block_on_high": False}
    assert client.put("/api/policies", json=new, headers=auth_headers).status_code == 200
    assert scan(client, auth_headers).json()["policy"]["passed"] is True
    bad = {**new, "max_critical": -1}
    assert client.put("/api/policies", json=bad, headers=auth_headers).status_code == 422


def test_reports(client, auth_headers, mock_trivy):
    sid = scan(client, auth_headers).json()["id"]
    j = client.get(f"/api/reports/{sid}/json", headers=auth_headers)
    assert j.status_code == 200 and j.json()["summary"]["critical"] == 1
    p = client.get(f"/api/reports/{sid}/pdf", headers=auth_headers)
    assert p.status_code == 200 and p.content.startswith(b"%PDF")


def test_report_requires_completed_scan(client, auth_headers, monkeypatch):
    def boom(ref):
        raise trivy_service.TrivyError("x")
    monkeypatch.setattr(trivy_service, "scan_image", boom)
    sid = scan(client, auth_headers).json()["id"]
    assert client.get(f"/api/reports/{sid}/json", headers=auth_headers).status_code == 409


def test_images_endpoint(client, auth_headers):
    r = client.post("/api/images", json={"image_name": "redis", "image_tag": "7"}, headers=auth_headers)
    assert r.status_code == 201 and r.json()["full_reference"] == "redis:7"
    assert len(client.get("/api/images", headers=auth_headers).json()) == 1
