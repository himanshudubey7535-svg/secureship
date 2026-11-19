import json
import subprocess
from types import SimpleNamespace

import pytest

from app.services import trivy_service
from app.services.trivy_service import TrivyError
from tests.conftest import SAMPLE_TRIVY


def fake_run(returncode=0, stdout="", stderr=""):
    return lambda *a, **k: SimpleNamespace(returncode=returncode, stdout=stdout, stderr=stderr)


def test_parse_output():
    vulns = trivy_service.parse_trivy_output(SAMPLE_TRIVY)
    assert len(vulns) == 3
    assert vulns[0]["cve_id"] == "CVE-2024-0001" and vulns[0]["fixed_version"] == "1.1"
    assert vulns[1]["fixed_version"] is None
    assert trivy_service.count_by_severity(vulns) == {
        "critical": 1, "high": 1, "medium": 0, "low": 1, "unknown": 0}


def test_parse_no_vulnerabilities():
    assert trivy_service.parse_trivy_output({"Results": [{"Target": "x"}]}) == []
    assert trivy_service.parse_trivy_output({"Results": None}) == []
    assert trivy_service.parse_trivy_output({}) == []


def test_unknown_severity_normalised():
    data = {"Results": [{"Vulnerabilities": [{"VulnerabilityID": "X", "Severity": "weird"}]}]}
    assert trivy_service.parse_trivy_output(data)[0]["severity"] == "UNKNOWN"


def test_run_success(monkeypatch):
    monkeypatch.setattr(subprocess, "run", fake_run(stdout=json.dumps(SAMPLE_TRIVY)))
    assert trivy_service.run_trivy("nginx:latest") == SAMPLE_TRIVY


def test_trivy_not_installed(monkeypatch):
    def boom(*a, **k):
        raise FileNotFoundError()
    monkeypatch.setattr(subprocess, "run", boom)
    with pytest.raises(TrivyError, match="not installed"):
        trivy_service.run_trivy("nginx:latest")


def test_timeout(monkeypatch):
    def boom(*a, **k):
        raise subprocess.TimeoutExpired(cmd="trivy", timeout=1)
    monkeypatch.setattr(subprocess, "run", boom)
    with pytest.raises(TrivyError, match="timed out"):
        trivy_service.run_trivy("nginx:latest")


@pytest.mark.parametrize("stderr,expected", [
    ("Cannot connect to the Docker daemon", "Docker is not running"),
    ("MANIFEST_UNKNOWN: manifest unknown", "Image not found"),
    ("dial tcp: lookup registry: no such host", "Network error"),
    ("unauthorized: authentication required", "denied"),
])
def test_failure_classification(monkeypatch, stderr, expected):
    monkeypatch.setattr(subprocess, "run", fake_run(returncode=1, stderr=stderr))
    with pytest.raises(TrivyError, match=expected):
        trivy_service.run_trivy("nginx:latest")


def test_malformed_json(monkeypatch):
    monkeypatch.setattr(subprocess, "run", fake_run(stdout="not json"))
    with pytest.raises(TrivyError, match="JSON"):
        trivy_service.run_trivy("nginx:latest")
