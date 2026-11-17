"""
Documented Mock Model Fallback (Meridian CDS)

Used ONLY when real model inference is disabled or cannot execute.
Always flags output with `is_mock = True` so the UI and audit logs prominently
indicate mock execution. Never presents mock data as real clinical output.
"""

import hashlib
from typing import Dict, Any, List


def get_deterministic_hash_float(seed_str: str, min_val: float = 0.0, max_val: float = 1.0) -> float:
    """Computes a deterministic pseudorandom float from a seed string."""
    h = hashlib.sha256(seed_str.encode("utf-8")).hexdigest()
    int_val = int(h[:8], 16)
    ratio = int_val / 0xFFFFFFFF
    return min_val + ratio * (max_val - min_val)


def run_mock_cxr_inference(case_id_str: str) -> Dict[str, Any]:
    """Generates deterministic mock CXR findings with explicit `is_mock: True`."""
    p_pneumo = get_deterministic_hash_float(f"{case_id_str}_pneumo", 0.05, 0.88)
    p_effusion = get_deterministic_hash_float(f"{case_id_str}_effusion", 0.04, 0.82)
    p_pneumonia = get_deterministic_hash_float(f"{case_id_str}_pneumonia", 0.08, 0.75)
    p_cardio = get_deterministic_hash_float(f"{case_id_str}_cardio", 0.03, 0.65)
    p_normal = max(0.02, 1.0 - max(p_pneumo, p_effusion, p_pneumonia, p_cardio))

    findings = [
        {"finding_name": "Pneumothorax", "calibrated_prob": round(p_pneumo, 3), "ci_lower": round(max(0.01, p_pneumo - 0.08), 3), "ci_upper": round(min(0.99, p_pneumo + 0.08), 3), "severity_weight": 0.90, "is_primary": False, "anatomic_locus": "Right apex"},
        {"finding_name": "Pneumonia", "calibrated_prob": round(p_pneumonia, 3), "ci_lower": round(max(0.01, p_pneumonia - 0.08), 3), "ci_upper": round(min(0.99, p_pneumonia + 0.08), 3), "severity_weight": 0.65, "is_primary": False, "anatomic_locus": "Right lower base"},
        {"finding_name": "Pleural Effusion", "calibrated_prob": round(p_effusion, 3), "ci_lower": round(max(0.01, p_effusion - 0.08), 3), "ci_upper": round(min(0.99, p_effusion + 0.08), 3), "severity_weight": 0.70, "is_primary": False, "anatomic_locus": "Left base"},
        {"finding_name": "Cardiomegaly", "calibrated_prob": round(p_cardio, 3), "ci_lower": round(max(0.01, p_cardio - 0.08), 3), "ci_upper": round(min(0.99, p_cardio + 0.08), 3), "severity_weight": 0.45, "is_primary": False, "anatomic_locus": "Cardiac silhouette"},
        {"finding_name": "Normal", "calibrated_prob": round(p_normal, 3), "ci_lower": round(max(0.01, p_normal - 0.06), 3), "ci_upper": round(min(0.99, p_normal + 0.06), 3), "severity_weight": 0.05, "is_primary": False, "anatomic_locus": "Bilateral fields"},
    ]

    # Select top finding
    findings.sort(key=lambda x: x["calibrated_prob"], reverse=True)
    findings[0]["is_primary"] = True
    primary = findings[0]

    return {
        "modality": "imaging_cxr",
        "primary_finding": primary["finding_name"],
        "calibrated_prob": primary["calibrated_prob"],
        "ci_lower": primary["ci_lower"],
        "ci_upper": primary["ci_upper"],
        "is_low_quality": False,
        "low_quality_reason": None,
        "heatmap_path": None,
        "findings": findings,
        "model_version": "MOCK-DenseNet121-Fallback",
        "is_mock": True
    }


def run_mock_tabular_inference(case_id_str: str) -> Dict[str, Any]:
    """Generates deterministic mock tabular findings with explicit `is_mock: True`."""
    prob = get_deterministic_hash_float(f"{case_id_str}_tab_prob", 0.12, 0.91)
    ci_lower = round(max(0.01, prob - 0.07), 3)
    ci_upper = round(min(0.99, prob + 0.07), 3)

    if prob >= 0.75:
        primary_finding = "Acute Coronary Syndrome"
        severity = 1.00
    elif prob >= 0.50:
        primary_finding = "High Cardiovascular Risk"
        severity = 0.80
    elif prob >= 0.25:
        primary_finding = "Moderate Cardiovascular Risk"
        severity = 0.45
    else:
        primary_finding = "Low Cardiovascular Risk"
        severity = 0.10

    mock_shap = [
        {"feature": "st_depression", "label": "ST Depression", "value": 2.2, "unit": "mm", "reference_range": "0.0 - 0.5", "is_abnormal": True, "shap_impact": 0.42, "direction": "INCREASES_RISK"},
        {"feature": "chest_pain_type", "label": "Chest Pain Severity", "value": 3.0, "unit": "grade", "reference_range": "1 - 2", "is_abnormal": True, "shap_impact": 0.28, "direction": "INCREASES_RISK"},
        {"feature": "resting_bp", "label": "Resting Systolic BP", "value": 158.0, "unit": "mmHg", "reference_range": "90 - 120", "is_abnormal": True, "shap_impact": 0.21, "direction": "INCREASES_RISK"},
        {"feature": "max_heart_rate", "label": "Max Heart Rate", "value": 115.0, "unit": "bpm", "reference_range": "110 - 175", "is_abnormal": False, "shap_impact": -0.15, "direction": "DECREASES_RISK"}
    ]

    return {
        "modality": "tabular_clinical",
        "primary_finding": primary_finding,
        "calibrated_prob": round(prob, 3),
        "ci_lower": ci_lower,
        "ci_upper": ci_upper,
        "severity_weight": severity,
        "is_low_quality": False,
        "low_quality_reason": None,
        "shap_features": mock_shap,
        "model_version": "MOCK-XGBoost-Fallback",
        "is_mock": True
    }
