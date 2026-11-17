from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    accession_number = Column(String(64), unique=True, index=True, nullable=False)
    patient_display_id = Column(String(64), index=True, nullable=False)
    modality = Column(String(32), index=True, nullable=False)  # "imaging_cxr" | "tabular_clinical"

    age = Column(Integer, nullable=True)
    sex = Column(String(8), nullable=True)  # "M" | "F" | "O"
    clinical_history = Column(Text, nullable=True)
    study_datetime = Column(DateTime, default=datetime.utcnow)
    ingested_at = Column(DateTime, default=datetime.utcnow)

    # Workflow Status
    status = Column(String(32), default="unreviewed", index=True)  # "unreviewed" | "in_review" | "actioned"

    # Prioritization & Triage Metrics
    priority_score = Column(Float, nullable=False, default=0.0, index=True)
    priority_tier = Column(String(16), nullable=False, default="ROUTINE", index=True)  # CRITICAL, HIGH, MODERATE, ROUTINE
    tier_glyph = Column(String(8), nullable=False, default="●")

    # Primary Suspected Finding
    primary_finding = Column(String(128), nullable=False, default="No Finding")
    calibrated_prob = Column(Float, nullable=False, default=0.0)
    ci_lower = Column(Float, nullable=False, default=0.0)
    ci_upper = Column(Float, nullable=False, default=0.0)

    # Quality & Uncertainty flags
    is_uncertain = Column(Boolean, default=False)
    is_low_quality = Column(Boolean, default=False)
    low_quality_reason = Column(Text, nullable=True)

    # Media and Data Assets
    image_path = Column(String(256), nullable=True)
    heatmap_path = Column(String(256), nullable=True)
    tabular_data_json = Column(Text, nullable=True)
    triage_breakdown_json = Column(Text, nullable=True)

    # Relationships
    findings = relationship("Finding", back_populates="case", cascade="all, delete-orphan")
    model_runs = relationship("ModelRun", back_populates="case", cascade="all, delete-orphan")
    actions = relationship("ClinicianAction", back_populates="case", cascade="all, delete-orphan")
