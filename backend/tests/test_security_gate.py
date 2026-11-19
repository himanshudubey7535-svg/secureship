"""Verifies the CI gate by running the real script as a subprocess and checking its exit code."""
import json
import os
import subprocess
import sys

import pytest

GATE = os.path.join(os.path.dirname(__file__), "..", "..", "ci", "security_gate.py")


def run_gate(tmp_path, report, **env):
    path = tmp_path / "trivy-report.json"
    path.write_text(report if isinstance(report, str) else json.dumps(report))
    full_env = {**os.environ, **{k: str(v) for k, v in env.items()}}
    full_env.pop("GITHUB_STEP_SUMMARY", None)
    return subprocess.run([sys.executable, GATE, str(path)], env=full_env, capture_output=True, text=True)


def report_with(**counts):
    vulns = [{"VulnerabilityID": f"CVE-{sev}-{i}", "Severity": sev.upper()}
             for sev, n in counts.items() for i in range(n)]
    return {"Results": [{"Target": "x", "Vulnerabilities": vulns}]}


def test_clean_image_passes(tmp_path):
    assert run_gate(tmp_path, {"Results": []}).returncode == 0


def test_critical_fails_pipeline(tmp_path):
    r = run_gate(tmp_path, report_with(critical=1))
    assert r.returncode == 1 and "critical" in r.stdout


def test_critical_within_threshold_passes(tmp_path):
    assert run_gate(tmp_path, report_with(critical=2), MAX_CRITICAL=2).returncode == 0


def test_critical_advisory_when_not_blocking(tmp_path):
    assert run_gate(tmp_path, report_with(critical=5), FAIL_ON_CRITICAL="false").returncode == 0


def test_high_ignored_by_default_but_blocks_when_enabled(tmp_path):
    assert run_gate(tmp_path, report_with(high=50)).returncode == 0
    assert run_gate(tmp_path, report_with(high=11), FAIL_ON_HIGH="true", MAX_HIGH=10).returncode == 1
    assert run_gate(tmp_path, report_with(high=10), FAIL_ON_HIGH="true", MAX_HIGH=10).returncode == 0


def test_unreadable_report_fails_closed(tmp_path):
    assert run_gate(tmp_path, "not json").returncode == 2
    missing = subprocess.run([sys.executable, GATE, str(tmp_path / "nope.json")], capture_output=True)
    assert missing.returncode == 2
