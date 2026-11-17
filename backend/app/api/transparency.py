from fastapi import APIRouter, Query
from typing import List, Dict, Any

from backend.app.schemas.transparency import ModelTransparencyResponse
from backend.app.ml.evaluation import evaluate_tabular_model, evaluate_imaging_model

router = APIRouter(prefix="/transparency", tags=["Model Transparency & Evaluation"])

# In-memory cache for live evaluation results
_transparency_cache: Dict[str, Any] = {}


@router.get("", response_model=List[ModelTransparencyResponse])
async def get_model_transparency(modality: str = Query(None, description="imaging_cxr | tabular_clinical")):
    """
    Returns authentic, live-evaluated performance metrics:
    AUROC, sensitivity, specificity, calibration (ECE), ROC curve, and subgroup disparities.
    Never returns hardcoded or unvalidated estimates.
    """
    global _transparency_cache

    if "tabular" not in _transparency_cache:
        _transparency_cache["tabular"] = evaluate_tabular_model()
    if "imaging" not in _transparency_cache:
        _transparency_cache["imaging"] = evaluate_imaging_model()

    results = []
    if not modality or modality == "imaging_cxr":
        results.append(_transparency_cache["imaging"])
    if not modality or modality == "tabular_clinical":
        results.append(_transparency_cache["tabular"])

    return results
