from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base


class ClinicianAction(Base):
    __tablename__ = "clinician_actions"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)

    action = Column(String(32), nullable=False)  # "AGREE", "DISAGREE", "DEFER", "REPRIORITIZE"
    disagree_reason = Column(String(128), nullable=True)  # Mandatory if action == "DISAGREE"
    clinical_notes = Column(Text, nullable=True)
    reprioritized_tier = Column(String(16), nullable=True)  # CRITICAL, HIGH, MODERATE, ROUTINE
    clinician_id = Column(String(64), nullable=False, default="DR-ATTENDING-DEFAULT")
    recorded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("Case", back_populates="actions")
