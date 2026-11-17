from pydantic import BaseModel, Field
from typing import Optional


class RecordActionRequest(BaseModel):
    action: str = Field(..., description="AGREE, DISAGREE, DEFER, or REPRIORITIZE")
    disagree_reason: Optional[str] = Field(None, description="Mandatory if action is DISAGREE")
    clinical_notes: Optional[str] = Field(None, description="Optional clinician impression")
    reprioritized_tier: Optional[str] = Field(None, description="CRITICAL, HIGH, MODERATE, ROUTINE")
    clinician_id: Optional[str] = Field("DR-ATTENDING-DEFAULT", description="Clinician ID")
