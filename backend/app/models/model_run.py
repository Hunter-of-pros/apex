from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base


class ModelRun(Base):
    __tablename__ = "model_runs"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)

    model_name = Column(String(128), nullable=False)
    model_version = Column(String(32), nullable=False)
    modality = Column(String(32), nullable=False)
    is_mock = Column(Boolean, default=False, nullable=False)

    calibration_method = Column(String(64), default="temperature_scaling")
    execution_time_ms = Column(Float, nullable=False)
    quality_metric = Column(Float, nullable=True)  # Blur score, OOD distance, etc.
    executed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("Case", back_populates="model_runs")
