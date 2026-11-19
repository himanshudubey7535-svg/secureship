from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, func

from app.database import Base


class SecurityPolicy(Base):
    __tablename__ = "security_policies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    max_critical = Column(Integer, default=0, nullable=False)
    max_high = Column(Integer, default=5, nullable=False)
    block_on_critical = Column(Boolean, default=True, nullable=False)
    block_on_high = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
