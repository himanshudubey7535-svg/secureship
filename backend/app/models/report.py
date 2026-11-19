from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, func

from app.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(Integer, ForeignKey("scan_results.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_type = Column(String(10), nullable=False)
    file_path = Column(String(500))
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
