from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class FindingSchema(BaseModel):
    id: Optional[int] = None
    finding_name: str
    calibrated_prob: float
    ci_lower: float
    ci_upper: float
    severity_weight: float
    is_primary: bool
    clinical_rationale: Optional[str] = None
    anatomic_locus: Optional[str] = None
    heatmap_path: Optional[str] = None
    shap_features: Optional[List[Dict[str, Any]]] = None

    model_config = ConfigDict(from_attributes=True)


class ClinicianActionSchema(BaseModel):
    id: Optional[int] = None
    action: str
    disagree_reason: Optional[str] = None
    clinical_notes: Optional[str] = None
    reprioritized_tier: Optional[str] = None
    clinician_id: str
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CaseSummary(BaseModel):
    id: int
    accession_number: str
    patient_display_id: str
    modality: str
    age: Optional[int] = None
    sex: Optional[str] = None
    clinical_history: Optional[str] = None
    study_datetime: datetime
    ingested_at: datetime
    status: str
    priority_score: float
    priority_tier: str
    tier_glyph: str
    primary_finding: str
    calibrated_prob: float
    ci_lower: float
    ci_upper: float
    is_uncertain: bool
    is_low_quality: bool
    low_quality_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CaseDetail(CaseSummary):
    image_url: Optional[str] = None
    heatmap_url: Optional[str] = None
    tabular_data: Optional[Dict[str, Any]] = None
    triage_breakdown: Optional[Dict[str, Any]] = None
    findings: List[FindingSchema] = []
    actions: List[ClinicianActionSchema] = []

    model_config = ConfigDict(from_attributes=True)
