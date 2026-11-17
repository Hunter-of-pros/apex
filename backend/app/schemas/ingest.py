from pydantic import BaseModel
from typing import Dict, Any, Optional, List


class TabularIngestRequest(BaseModel):
    age: int
    sex: str
    resting_bp: float
    cholesterol: float
    fasting_blood_sugar: float
    max_heart_rate: float
    st_depression: float
    chest_pain_type: int
    resting_ecg: int
    clinical_history: Optional[str] = "Referred for cardiac evaluation"


class IngestResponse(BaseModel):
    case_id: int
    accession_number: str
    patient_display_id: str
    modality: str
    status: str
    priority_score: float
    priority_tier: str
    primary_finding: str
    calibrated_prob: float
    scrub_report: Dict[str, Any]
