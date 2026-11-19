"""Runs the Trivy CLI against a container image and parses its JSON output."""
import json
import shutil
import subprocess
import sys
from pathlib import Path

from app.core.config import settings
from app.models.vulnerability import SEVERITIES


class TrivyError(Exception):
    """Raised with a user-readable message whenever a scan cannot complete."""


def _find_trivy() -> str:
    path = shutil.which("trivy")
    if path:
        return path
    venv_trivy = Path(sys.prefix) / "Scripts" / "trivy.exe"
    if venv_trivy.exists():
        return str(venv_trivy)
    return "trivy"


def _classify_failure(stderr: str) -> str:
    text = (stderr or "").lower()
    if "docker daemon" in text or "docker.sock" in text:
        return "Docker is not running or is not reachable. Start Docker and try again."
    if any(s in text for s in ("unable to find the specified image", "manifest unknown",
                               "name unknown", "repository does not exist", "not found")):
        return "Image not found. Check the image name and tag, and that it is public or you are logged in."
    if any(s in text for s in ("unauthorized", "denied", "authentication required")):
        return "Access to the image was denied. The image may be private."
    if any(s in text for s in ("no such host", "dial tcp", "connection refused",
                               "network is unreachable", "i/o timeout", "tls handshake")):
        return "Network error while pulling the image or the vulnerability database. Check your connection."
    tail = (stderr or "").strip()[-500:]
    return f"Trivy failed: {tail}" if tail else "Trivy failed with an unknown error."


def run_trivy(image_reference: str, timeout: int | None = None) -> dict:
    timeout = timeout or settings.TRIVY_TIMEOUT
    cmd = [
        _find_trivy(), "image",
        "--format", "json",
        "--quiet",
        "--scanners", "vuln",
        "--timeout", f"{timeout}s",
        image_reference,
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 60)
    except FileNotFoundError:
        raise TrivyError("Trivy is not installed or not on PATH. Install it from https://trivy.dev.")
    except subprocess.TimeoutExpired:
        raise TrivyError(f"Scan timed out after {timeout} seconds.")

    if proc.returncode != 0:
        raise TrivyError(_classify_failure(proc.stderr))

    try:
        data = json.loads(proc.stdout)
    except (json.JSONDecodeError, TypeError):
        raise TrivyError("Trivy returned output that could not be parsed as JSON.")
    if not isinstance(data, dict):
        raise TrivyError("Trivy returned an unexpected JSON structure.")
    return data


def _clip(value, limit: int):
    return value[:limit] if isinstance(value, str) else value


def parse_trivy_output(data: dict) -> list[dict]:
    """Flatten Results[].Vulnerabilities[] into a list of dicts. No findings -> empty list."""
    vulns: list[dict] = []
    for result in data.get("Results") or []:
        for v in result.get("Vulnerabilities") or []:
            severity = str(v.get("Severity", "UNKNOWN")).upper()
            if severity not in SEVERITIES:
                severity = "UNKNOWN"
            vulns.append({
                "cve_id": _clip(v.get("VulnerabilityID"), 50),
                "package_name": _clip(v.get("PkgName"), 255),
                "installed_version": _clip(v.get("InstalledVersion"), 100),
                "fixed_version": _clip(v.get("FixedVersion"), 100),
                "severity": severity,
                "title": v.get("Title"),
                "description": v.get("Description"),
                "references": v.get("References") or [],
            })
    return vulns


def count_by_severity(vulns: list[dict]) -> dict:
    counts = {s.lower(): 0 for s in SEVERITIES}
    for v in vulns:
        counts[v["severity"].lower()] += 1
    return counts


def scan_image(image_reference: str) -> dict:
    """Public entry point: returns {"raw": <trivy json>, "vulnerabilities": [...]}."""
    raw = run_trivy(image_reference)
    return {"raw": raw, "vulnerabilities": parse_trivy_output(raw)}
