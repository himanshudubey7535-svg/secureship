from datetime import datetime

from pydantic import BaseModel

from app.schemas.image import ImageCreate
from app.schemas.policy import PolicyResult


class ScoreFactor(BaseModel):
    severity: str
    count: int
    weight: int
    points: int
    share: float


class ScoreExplanation(BaseModel):
    total_risk: int
    formula: str
    factors: list[ScoreFactor]


class StatsOut(BaseModel):
    total_images: int
    total_scans: int
    completed_scans: int
    total_vulnerabilities: int
    critical_vulnerabilities: int
    average_score: float | None
    severity_distribution: dict[str, int]


class ScanCreate(ImageCreate):
    pass


class ScanOut(BaseModel):
    id: int
    image_id: int
    image_name: str
    image_tag: str | None
    full_reference: str
    status: str
    security_score: float | None
    risk_category: str | None
    total_vulns: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    unknown_count: int
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime | None
    policy: PolicyResult | None = None
    explanation: ScoreExplanation | None = None
