"""JSON and PDF report generation."""
import json
import os
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.config import settings

SEVERITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "UNKNOWN": 4}
PDF_MAX_ROWS = 150


def _iso(dt):
    return dt.isoformat() if dt else None


def build_report_data(scan, vulns, policy_result: dict | None) -> dict:
    ordered = sorted(vulns, key=lambda v: (SEVERITY_ORDER.get(v.severity, 9), v.cve_id or ""))
    return {
        "scan_id": scan.id,
        "image": scan.image.full_reference,
        "status": scan.status,
        "security_score": scan.security_score,
        "risk_category": scan.risk_category,
        "started_at": _iso(scan.started_at),
        "completed_at": _iso(scan.completed_at),
        "summary": {
            "total": scan.total_vulns,
            "critical": scan.critical_count,
            "high": scan.high_count,
            "medium": scan.medium_count,
            "low": scan.low_count,
            "unknown": scan.unknown_count,
        },
        "policy": policy_result,
        "vulnerabilities": [
            {
                "cve_id": v.cve_id,
                "package": v.package_name,
                "installed_version": v.installed_version,
                "fixed_version": v.fixed_version,
                "severity": v.severity,
                "title": v.title,
                "references": v.references or [],
            }
            for v in ordered
        ],
    }


def _report_path(scan_id: int, ext: str) -> str:
    os.makedirs(settings.REPORTS_DIR, exist_ok=True)
    return os.path.join(settings.REPORTS_DIR, f"secureship-scan-{scan_id}.{ext}")


def generate_json_report(data: dict) -> str:
    path = _report_path(data["scan_id"], "json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    return path


def generate_pdf_report(data: dict) -> str:
    path = _report_path(data["scan_id"], "pdf")
    styles = getSampleStyleSheet()
    small = styles["BodyText"].clone("small", fontSize=7, leading=9)
    story = [
        Paragraph("SecureShip Vulnerability Report", styles["Title"]),
        Paragraph(f"Image: <b>{escape(data['image'])}</b>", styles["Normal"]),
        Paragraph(f"Scan #{data['scan_id']} &nbsp; Completed: {escape(str(data['completed_at']))}", styles["Normal"]),
        Spacer(1, 6 * mm),
        Paragraph(
            f"Security score: <b>{data['security_score']}</b> ({escape(str(data['risk_category']))})",
            styles["Heading3"],
        ),
    ]

    s = data["summary"]
    summary = Table(
        [["Critical", "High", "Medium", "Low", "Unknown", "Total"],
         [s["critical"], s["high"], s["medium"], s["low"], s["unknown"], s["total"]]],
        hAlign="LEFT",
    )
    summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1c2333")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    story += [summary, Spacer(1, 4 * mm)]

    policy = data.get("policy")
    if policy:
        verdict = "PASSED" if policy["passed"] else "FAILED"
        story.append(Paragraph(f"Policy result: <b>{verdict}</b>", styles["Heading3"]))
        for line in policy.get("violations", []) + policy.get("warnings", []):
            story.append(Paragraph(f"- {escape(line)}", styles["Normal"]))
        story.append(Spacer(1, 4 * mm))

    vulns = data["vulnerabilities"]
    story.append(Paragraph("Vulnerabilities", styles["Heading2"]))
    if not vulns:
        story.append(Paragraph("No vulnerabilities were found.", styles["Normal"]))
    else:
        rows = [["Severity", "CVE", "Package", "Installed", "Fixed"]]
        for v in vulns[:PDF_MAX_ROWS]:
            rows.append([
                v["severity"],
                Paragraph(escape(v["cve_id"] or ""), small),
                Paragraph(escape(v["package"] or ""), small),
                Paragraph(escape(v["installed_version"] or ""), small),
                Paragraph(escape(v["fixed_version"] or "-"), small),
            ])
        table = Table(rows, repeatRows=1, colWidths=[22 * mm, 38 * mm, 45 * mm, 35 * mm, 35 * mm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1c2333")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(table)
        if len(vulns) > PDF_MAX_ROWS:
            story.append(Spacer(1, 3 * mm))
            story.append(Paragraph(
                f"Showing the {PDF_MAX_ROWS} most severe of {len(vulns)} findings. "
                "The JSON report contains the full list.", styles["Italic"]))

    SimpleDocTemplate(path, pagesize=A4, title=f"SecureShip scan {data['scan_id']}").build(story)
    return path
