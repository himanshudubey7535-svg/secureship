from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.database import Base


class DockerImage(Base):
    __tablename__ = "docker_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    image_name = Column(String(255), nullable=False)
    image_tag = Column(String(100), default="latest")
    full_reference = Column(String(500), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    scans = relationship("ScanResult", back_populates="image")
