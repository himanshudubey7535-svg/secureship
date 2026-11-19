"""Runs the REAL Trivy binary. Skipped automatically when trivy is not installed.
Run explicitly with:  pytest -m integration -v   (needs network access and a few minutes on first run)
"""
import shutil

import pytest

from app.services import trivy_service

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(shutil.which("trivy") is None, reason="trivy is not installed"),
]


def test_real_scan_of_small_image():
    result = trivy_service.scan_image("alpine:3.12")  # old release: reliably has known CVEs
    assert isinstance(result["raw"], dict)
    assert len(result["vulnerabilities"]) > 0
    assert all(v["cve_id"] and v["severity"] for v in result["vulnerabilities"])


def test_real_scan_of_missing_image_reports_error():
    with pytest.raises(trivy_service.TrivyError):
        trivy_service.scan_image("secureship-does-not-exist.invalid/nope:0")
