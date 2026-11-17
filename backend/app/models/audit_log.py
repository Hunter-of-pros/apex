from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from backend.app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, nullable=True, index=True)
    accession_number = Column(String(64), nullable=True, index=True)

    event_type = Column(String(64), nullable=False, index=True)
    # Events: "STUDY_INGESTED", "PHI_SCRUBBED", "MODEL_INFERRED", "CASE_OPENED",
    # "ACTION_AGREE", "ACTION_DISAGREE", "ACTION_DEFERRED", "TIER_REPRIORITIZED"

    actor = Column(String(64), nullable=False, default="SYSTEM")
    details_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
