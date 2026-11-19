from datetime import timedelta

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.user import User
from app.utils import utcnow

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    # bcrypt only uses the first 72 bytes; truncate explicitly.
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(data: dict) -> str:
    payload = dict(data)
    payload["exp"] = utcnow() + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        user_id = int(decode_token(credentials.credentials).get("sub"))
    except (JWTError, TypeError, ValueError):
        raise unauthorized
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise unauthorized
    return user


import threading

_user_lock = threading.Lock()


def get_default_user(db: Session = Depends(get_db)) -> User:
    """Return the default anonymous user, creating it safely on first call."""
    with _user_lock:
        user = db.query(User).filter(User.username == "admin").first()
        if user is None:
            user = User(username="admin", email="admin@secureship.local", hashed_password="not-used", is_active=True)
            db.add(user)
            try:
                db.commit()
                db.refresh(user)
                from app.models.policy import SecurityPolicy
                if not db.query(SecurityPolicy).filter_by(user_id=user.id).first():
                    db.add(SecurityPolicy(user_id=user.id))
                    db.commit()
            except Exception:
                db.rollback()
                user = db.query(User).filter(User.username == "admin").first()
        return user
