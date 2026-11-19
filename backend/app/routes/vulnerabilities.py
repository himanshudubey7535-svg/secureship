from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case
from sqlalchemy.orm import Session

from app.core.security import get_default_user
from app.database import get_db
from app.models.user import User
from app.models.vulnerability import SEVERITIES, Vulnerability
from app.routes.scans import get_owned_scan
from app.schemas.vulnerability import RecommendationsOut, VulnerabilityOut
from app.services.recommendations import build_recommendations

router = APIRouter()


@router.get("/{scan_id}/vulnerabilities", response_model=list[VulnerabilityOut])
def list_vulnerabilities(
    scan_id: int,
    severity: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    get_owned_scan(db, scan_id, user)  # 404 if not the caller's scan
    query = db.query(Vulnerability).filter(Vulnerability.scan_id == scan_id)
    if severity:
        severity = severity.upper()
        if severity not in SEVERITIES:
            raise HTTPException(422, f"severity must be one of {', '.join(SEVERITIES)}")
        query = query.filter(Vulnerability.severity == severity)
    rank = case(*[(Vulnerability.severity == s, i) for i, s in enumerate(SEVERITIES)], else_=99)
    return query.order_by(rank, Vulnerability.cve_id).all()


@router.get("/{scan_id}/recommendations", response_model=RecommendationsOut)
def recommendations(scan_id: int, db: Session = Depends(get_db), user: User = Depends(get_default_user)):
    get_owned_scan(db, scan_id, user)
    vulns = db.query(Vulnerability).filter(Vulnerability.scan_id == scan_id).all()
    return build_recommendations(vulns)
