from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_default_user
from app.database import get_db
from app.models.policy import SecurityPolicy
from app.models.user import User
from app.schemas.policy import PolicyOut, PolicyUpdate

router = APIRouter()


def get_or_create_policy(db: Session, user: User) -> SecurityPolicy:
    policy = db.query(SecurityPolicy).filter_by(user_id=user.id).first()
    if policy is None:
        policy = SecurityPolicy(user_id=user.id, max_critical=0, max_high=5,
                                block_on_critical=True, block_on_high=False)
        db.add(policy)
        db.flush()
    return policy


@router.get("", response_model=PolicyOut)
def get_policy(db: Session = Depends(get_db), user: User = Depends(get_default_user)):
    policy = get_or_create_policy(db, user)
    db.commit()
    return policy


@router.put("", response_model=PolicyOut)
def update_policy(payload: PolicyUpdate, db: Session = Depends(get_db), user: User = Depends(get_default_user)):
    policy = get_or_create_policy(db, user)
    for field, value in payload.model_dump().items():
        setattr(policy, field, value)
    db.commit()
    db.refresh(policy)
    return policy
