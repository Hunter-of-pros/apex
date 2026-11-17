"""
Triage Prioritization & Scoring Engine (Meridian CDS)

Implements the multi-component clinical priority calculation:
Score = 100 * (w_prob * P_cal + w_sev * S_finding + w_unc * U + w_risk * R) + Q_penalty

Guarantees transparency by returning an exact numerical breakdown of all contributors.
"""

from typing import Dict, Any, Optional
from backend.app.triage.weights import (
    DEFAULT_WEIGHTS,
    FINDING_SEVERITIES,
    TIER_THRESHOLDS,
    LOW_QUALITY_SCORE_PENALTY
)


def calculate_patient_risk(age: Optional[int], clinical_history: Optional[str] = None) -> float:
    """
    Computes a normalized patient risk factor [0.0 - 1.0] from demographic
    and clinical context (e.g., geriatric baseline, reported chest pain, dyspnea).
    """
    risk = 0.10  # Baseline
    if age is not None:
        if age >= 75:
            risk += 0.35
        elif age >= 60:
            risk += 0.25
        elif age >= 45:
            risk += 0.15

    if clinical_history:
        hist = clinical_history.lower()
        if any(w in hist for w in ["shock", "tamponade", "hypotension", "desaturation", "severe sob"]):
            risk += 0.40
        elif any(w in hist for w in ["chest pain", "angina", "dyspnea", "hemoptysis", "syncope"]):
            risk += 0.25
        elif any(w in hist for w in ["hypertension", "diabetes", "smoker", "copd"]):
            risk += 0.10

    return min(1.0, round(risk, 4))


def compute_triage_score(
    calibrated_prob: float,
    finding_name: str,
    ci_lower: float,
    ci_upper: float,
    patient_age: Optional[int] = None,
    clinical_history: Optional[str] = None,
    is_low_quality: bool = False,
    low_quality_reason: Optional[str] = None,
    custom_weights: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Computes transparent triage score and urgency tier with complete contributor breakdown.
    """
    weights = custom_weights or DEFAULT_WEIGHTS
    w_prob = weights.get("probability", 0.45)
    w_sev = weights.get("severity", 0.35)
    w_unc = weights.get("uncertainty", 0.10)
    w_risk = weights.get("patient_risk", 0.10)

    # 1. Calibrated probability clamped to [0.0, 1.0]
    p_cal = max(0.0, min(1.0, float(calibrated_prob)))

    # 2. Finding clinical severity lookup
    sev = FINDING_SEVERITIES.get(finding_name, 0.40)

    # 3. Uncertainty width (wider confidence interval = higher epistemic uncertainty)
    unc_width = max(0.0, min(1.0, float(ci_upper - ci_lower)))
    # In acute triage, high uncertainty with elevated suspicion demands prompt human review
    uncertainty_component_val = unc_width

    # 4. Patient baseline risk
    risk = calculate_patient_risk(patient_age, clinical_history)

    # Weighted composite sum [0.0 - 1.0]
    composite = (
        (w_prob * p_cal) +
        (w_sev * sev) +
        (w_unc * uncertainty_component_val) +
        (w_risk * risk)
    )

    raw_base_score = round(composite * 100.0, 2)
    quality_penalty = LOW_QUALITY_SCORE_PENALTY if is_low_quality else 0.0

    final_score = min(100.0, round(raw_base_score + quality_penalty, 2))

    # Determine Urgency Tier
    if is_low_quality:
        # Degraded quality automatically elevates to at least HIGH or CRITICAL
        if final_score >= TIER_THRESHOLDS["CRITICAL"]:
            tier = "CRITICAL"
        else:
            tier = "HIGH"
    elif final_score >= TIER_THRESHOLDS["CRITICAL"]:
        tier = "CRITICAL"
    elif final_score >= TIER_THRESHOLDS["HIGH"]:
        tier = "HIGH"
    elif final_score >= TIER_THRESHOLDS["MODERATE"]:
        tier = "MODERATE"
    else:
        tier = "ROUTINE"

    glyph_map = {
        "CRITICAL": "◆",
        "HIGH": "▲",
        "MODERATE": "■",
        "ROUTINE": "●"
    }

    is_uncertain = (unc_width >= 0.28) or is_low_quality

    return {
        "priority_score": final_score,
        "priority_tier": tier,
        "tier_glyph": glyph_map.get(tier, "●"),
        "is_low_quality": is_low_quality,
        "low_quality_reason": low_quality_reason,
        "is_uncertain": is_uncertain,
        "uncertainty_status": "NEEDS_MANUAL_REVIEW" if is_uncertain else "STABLE_ESTIMATE",
        "breakdown": {
            "calibrated_probability": round(p_cal, 4),
            "probability_weight": w_prob,
            "weighted_probability_points": round(w_prob * p_cal * 100.0, 2),

            "severity_finding": finding_name,
            "severity_value": sev,
            "severity_weight": w_sev,
            "weighted_severity_points": round(w_sev * sev * 100.0, 2),

            "ci_range": [round(ci_lower, 4), round(ci_upper, 4)],
            "uncertainty_width": round(unc_width, 4),
            "uncertainty_weight": w_unc,
            "weighted_uncertainty_points": round(w_unc * uncertainty_component_val * 100.0, 2),

            "patient_risk_factor": round(risk, 4),
            "patient_risk_weight": w_risk,
            "weighted_risk_points": round(w_risk * risk * 100.0, 2),

            "quality_penalty": quality_penalty,
            "base_score_pre_penalty": raw_base_score,
            "final_score": final_score
        }
    }
