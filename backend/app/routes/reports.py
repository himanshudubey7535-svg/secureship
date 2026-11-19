from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.security import get_default_user
from app.database import get_db
from app.models.report import Report
from app.models.user import User
from app.models.vulnerability import Vulnerability
from app.routes.policies import get_or_create_policy
from app.routes.scans import counts_of, get_owned_scan
from app.services import policy_engine, report_service

router = APIRouter()


def _build(scan_id: int, kind: str, db: Session, user: User) -> FileResponse:
    scan = get_owned_scan(db, scan_id, user)
    if scan.status != "completed":
        raise HTTPException(status.HTTP_409_CONFLICT, "Reports are only available for completed scans")

    vulns = db.query(Vulnerability).filter_by(scan_id=scan.id).all()
    policy_result = policy_engine.evaluate_policy(counts_of(scan), get_or_create_policy(db, user))
    data = report_service.build_report_data(scan, vulns, policy_result)

    if kind == "json":
        path, media = report_service.generate_json_report(data), "application/json"
    else:
        path, media = report_service.generate_pdf_report(data), "application/pdf"

    db.add(Report(scan_id=scan.id, user_id=user.id, report_type=kind, file_path=path))
    db.commit()
    return FileResponse(path, media_type=media, filename=f"secureship-scan-{scan.id}.{kind}")


@router.get("/{scan_id}/json")
def download_json(scan_id: int, db: Session = Depends(get_db), user: User = Depends(get_default_user)):
    return _build(scan_id, "json", db, user)


@router.get("/{scan_id}/pdf")
def download_pdf(scan_id: int, db: Session = Depends(get_db), user: User = Depends(get_default_user)):
    return _build(scan_id, "pdf", db, user)
