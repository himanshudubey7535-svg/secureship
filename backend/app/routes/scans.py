from sqlalchemy import func
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core import limits
from app.core.security import get_default_user
from app.database import get_db
from app.models.scan import ScanResult
from app.models.user import User
from app.models.vulnerability import Vulnerability
from app.routes.images import get_or_create_image
from app.routes.policies import get_or_create_policy
from app.schemas.scan import ScanCreate, ScanOut, StatsOut
from app.services import policy_engine, risk_engine, trivy_service
from app.utils import utcnow

router = APIRouter()


def counts_of(scan: ScanResult) -> dict:
    return {
        "critical": scan.critical_count, "high": scan.high_count,
        "medium": scan.medium_count, "low": scan.low_count, "unknown": scan.unknown_count,
    }


def serialize_scan(scan: ScanResult, policy) -> dict:
    return {
        "id": scan.id,
        "image_id": scan.image_id,
        "image_name": scan.image.image_name,
        "image_tag": scan.image.image_tag,
        "full_reference": scan.image.full_reference,
        "status": scan.status,
        "security_score": scan.security_score,
        "risk_category": scan.risk_category,
        "total_vulns": scan.total_vulns,
        "critical_count": scan.critical_count,
        "high_count": scan.high_count,
        "medium_count": scan.medium_count,
        "low_count": scan.low_count,
        "unknown_count": scan.unknown_count,
        "error_message": scan.error_message,
        "started_at": scan.started_at,
        "completed_at": scan.completed_at,
        "created_at": scan.created_at,
        "policy": policy_engine.evaluate_policy(counts_of(scan), policy)
        if scan.status == "completed" else None,
        "explanation": risk_engine.explain(counts_of(scan)) if scan.status == "completed" else None,
    }


def get_owned_scan(db: Session, scan_id: int, user: User) -> ScanResult:
    scan = (
        db.query(ScanResult).options(joinedload(ScanResult.image))
        .filter(ScanResult.id == scan_id, ScanResult.user_id == user.id).first()
    )
    if scan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Scan not found")
    return scan


@router.post("", response_model=ScanOut)
def create_scan(payload: ScanCreate, db: Session = Depends(get_db), user: User = Depends(get_default_user)):
    """Runs Trivy synchronously. A tool failure is stored as a 'failed' scan (HTTP 200)
    so it appears in history and the UI can show the reason."""
    limits.check_rate_limit(user.id)
    image = get_or_create_image(db, user, payload)
    scan = ScanResult(image_id=image.id, user_id=user.id, status="scanning", started_at=utcnow())
    db.add(scan)
    db.commit()

    try:
        with limits.scan_slot():
            result = trivy_service.scan_image(image.full_reference)
        vulns = result["vulnerabilities"]
        counts = trivy_service.count_by_severity(vulns)
        score, category = risk_engine.assess(counts)

        db.add_all(Vulnerability(scan_id=scan.id, **v) for v in vulns)
        scan.trivy_output = result["raw"]
        scan.total_vulns = len(vulns)
        scan.critical_count = counts["critical"]
        scan.high_count = counts["high"]
        scan.medium_count = counts["medium"]
        scan.low_count = counts["low"]
        scan.unknown_count = counts["unknown"]
        scan.security_score = score
        scan.risk_category = category
        scan.status = "completed"
    except HTTPException:
        # Scanner busy: don't keep a dangling 'scanning' record.
        db.delete(scan)
        db.commit()
        raise
    except trivy_service.TrivyError as exc:
        scan.status = "failed"
        scan.error_message = str(exc)
    except Exception as exc:  # unexpected: still leave a record instead of a stuck 'scanning' row
        db.rollback()
        scan = db.get(ScanResult, scan.id)
        scan.status = "failed"
        scan.error_message = f"Unexpected error while processing scan: {exc}"
    scan.completed_at = utcnow()
    db.commit()

    scan = get_owned_scan(db, scan.id, user)
    return serialize_scan(scan, get_or_create_policy(db, user))


@router.get("/stats", response_model=StatsOut)
def scan_stats(db: Session = Depends(get_db), user: User = Depends(get_default_user)):
    done = db.query(ScanResult).filter(ScanResult.user_id == user.id, ScanResult.status == "completed")
    agg = done.with_entities(
        func.count(ScanResult.id), func.avg(ScanResult.security_score),
        func.coalesce(func.sum(ScanResult.total_vulns), 0),
        func.coalesce(func.sum(ScanResult.critical_count), 0),
        func.coalesce(func.sum(ScanResult.high_count), 0),
        func.coalesce(func.sum(ScanResult.medium_count), 0),
        func.coalesce(func.sum(ScanResult.low_count), 0),
        func.coalesce(func.sum(ScanResult.unknown_count), 0),
    ).one()
    total_scans = db.query(func.count(ScanResult.id)).filter(ScanResult.user_id == user.id).scalar()
    total_images = db.query(func.count(func.distinct(ScanResult.image_id))).filter(
        ScanResult.user_id == user.id).scalar()
    return {
        "total_images": total_images or 0,
        "total_scans": total_scans or 0,
        "completed_scans": agg[0] or 0,
        "total_vulnerabilities": int(agg[2]),
        "critical_vulnerabilities": int(agg[3]),
        "average_score": round(float(agg[1]), 1) if agg[1] is not None else None,
        "severity_distribution": {"critical": int(agg[3]), "high": int(agg[4]), "medium": int(agg[5]),
                                  "low": int(agg[6]), "unknown": int(agg[7])},
    }


@router.get("", response_model=list[ScanOut])
def list_scans(db: Session = Depends(get_db), user: User = Depends(get_default_user)):
    scans = (
        db.query(ScanResult).options(joinedload(ScanResult.image))
        .filter(ScanResult.user_id == user.id).order_by(ScanResult.id.desc()).all()
    )
    policy = get_or_create_policy(db, user)
    return [serialize_scan(s, policy) for s in scans]


@router.get("/{scan_id}", response_model=ScanOut)
def get_scan(scan_id: int, db: Session = Depends(get_db), user: User = Depends(get_default_user)):
    scan = get_owned_scan(db, scan_id, user)
    return serialize_scan(scan, get_or_create_policy(db, user))
