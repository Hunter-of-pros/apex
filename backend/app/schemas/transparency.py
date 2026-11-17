from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class CalibrationPoint(BaseModel):
    bin_mid: float
    observed_prob: float
    sample_count: int


class RocPoint(BaseModel):
    fpr: float
    tpr: float
    threshold: float


class SubgroupMetric(BaseModel):
    subgroup: str
    sample_size: int
    auroc: float
    sensitivity: float
    specificity: float
    brier_score: float


class ModelTransparencyResponse(BaseModel):
    model_name: str
    model_version: str
    modality: str
    intended_use: str
    contraindications: List[str]
    training_cohort_description: str
    validation_cohort_size: int
    overall_auroc: float
    overall_sensitivity: float
    overall_specificity: float
    expected_calibration_error: float
    brier_score: float
    calibration_curve: List[CalibrationPoint]
    roc_curve: List[RocPoint]
    subgroup_metrics: List[SubgroupMetric]
    known_limitations: List[str]
    is_mock: bool
