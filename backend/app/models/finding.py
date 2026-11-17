from sqlalchemy import Column, Integer, String, Float, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)

    finding_name = Column(String(128), nullable=False)
    calibrated_prob = Column(Float, nullable=False)
    ci_lower = Column(Float, nullable=False)
    ci_upper = Column(Float, nullable=False)
    severity_weight = Column(Float, nullable=False, default=0.5)
    is_primary = Column(Boolean, default=False)

    clinical_rationale = Column(Text, nullable=True)
    anatomic_locus = Column(String(128), nullable=True)  # e.g., "Right lower lobe", "Perihilar"
    heatmap_path = Column(String(256), nullable=True)
    shap_features_json = Column(Text, nullable=True)

    # Relationships
    case = relationship("Case", back_populates="findings")
