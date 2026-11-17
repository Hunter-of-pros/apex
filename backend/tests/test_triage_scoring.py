"""
Unit tests for Triage Prioritization & Scoring Formula
"""

import pytest
from backend.app.triage.scoring import compute_triage_score, calculate_patient_risk
from backend.app.triage.weights import DEFAULT_WEIGHTS, FINDING_SEVERITIES


def test_triage_score_critical_finding():
    # Pneumothorax with high calibrated probability and tension suspicion
    result = compute_triage_score(
        calibrated_prob=0.88,
        finding_name="Tension Pneumothorax",
        ci_lower=0.81,
        ci_upper=0.94,
        patient_age=68,
        clinical_history="Severe acute chest pain and hypoxia",
        is_low_quality=False
    )

    assert result["priority_tier"] == "CRITICAL"
    assert result["priority_score"] >= 72.0
    assert result["tier_glyph"] == "◆"
    assert "breakdown" in result
    assert result["breakdown"]["severity_finding"] == "Tension Pneumothorax"
    assert result["breakdown"]["severity_value"] == 1.00


def test_triage_score_routine_case():
    # Normal CXR with low probability of pathology
    result = compute_triage_score(
        calibrated_prob=0.04,
        finding_name="Normal",
        ci_lower=0.01,
        ci_upper=0.07,
        patient_age=32,
        clinical_history="Pre-employment baseline screening",
        is_low_quality=False
    )

    assert result["priority_tier"] == "ROUTINE"
    assert result["priority_score"] < 24.0
    assert result["tier_glyph"] == "●"


def test_low_quality_penalty_forces_tier_elevation():
    # A study with otherwise low probability (e.g. 0.20) but degraded acquisition
    result = compute_triage_score(
        calibrated_prob=0.20,
        finding_name="Cardiomegaly",
        ci_lower=0.10,
        ci_upper=0.35,
        patient_age=45,
        is_low_quality=True,
        low_quality_reason="Severe motion artifact and exposure clipping"
    )

    assert result["is_low_quality"] is True
    # Base score without penalty would be low, but low quality penalty forces at least HIGH
    assert result["priority_tier"] in ("HIGH", "CRITICAL")
    assert result["breakdown"]["quality_penalty"] == 25.0
    assert result["is_uncertain"] is True
    assert result["uncertainty_status"] == "NEEDS_MANUAL_REVIEW"


def test_breakdown_transparency_components():
    result = compute_triage_score(
        calibrated_prob=0.60,
        finding_name="Pneumonia",
        ci_lower=0.50,
        ci_upper=0.70,
        patient_age=70,
        clinical_history="Fever, productive cough"
    )

    bd = result["breakdown"]
    # Verify mathematical sum
    expected_sum = (
        bd["weighted_probability_points"] +
        bd["weighted_severity_points"] +
        bd["weighted_uncertainty_points"] +
        bd["weighted_risk_points"] +
        bd["quality_penalty"]
    )
    assert abs(bd["final_score"] - expected_sum) <= 0.10


def test_patient_risk_calculation():
    young_healthy = calculate_patient_risk(age=25, clinical_history="Routine wellness check")
    elderly_acute = calculate_patient_risk(age=78, clinical_history="Acute respiratory desaturation and shock")

    assert young_healthy < 0.20
    assert elderly_acute > 0.70
