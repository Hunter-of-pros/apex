"""
Clinical Severity Weights and Configurable Triage Parameters
"""

# Configurable formula coefficients
DEFAULT_WEIGHTS = {
    "probability": 0.45,   # Weight of calibrated primary finding probability
    "severity": 0.35,      # Clinical gravity/lethality of the suspected pathology
    "uncertainty": 0.10,   # Uncertainty width penalty
    "patient_risk": 0.10,  # Patient demographic and baseline risk factors
}

# Clinical finding severity weights (0.0 to 1.0)
# Calibrated based on acute lethality / required time-to-intervention
FINDING_SEVERITIES = {
    # Thoracic Imaging Findings
    "Tension Pneumothorax": 1.00,
    "Pneumothorax": 0.90,
    "Massive Pleural Effusion": 0.85,
    "Pleural Effusion": 0.70,
    "Severe Consolidation": 0.75,
    "Pneumonia": 0.65,
    "Cardiomegaly": 0.45,
    "Atelectasis": 0.35,
    "Infiltration": 0.40,
    "Nodule / Mass": 0.50,
    "Normal": 0.05,
    "No Finding": 0.05,

    # Tabular Clinical Diagnoses
    "Acute Coronary Syndrome": 1.00,
    "Cardiogenic Shock Risk": 0.95,
    "High Cardiovascular Risk": 0.80,
    "Metabolic Decompensation": 0.65,
    "Moderate Cardiovascular Risk": 0.45,
    "Low Cardiovascular Risk": 0.10,
    "Normal Lab Profile": 0.05,
}

# Thresholds for Urgency Classification
TIER_THRESHOLDS = {
    "CRITICAL": 72.0,   # Tier 1: Emergent stat intervention
    "HIGH": 48.0,       # Tier 2: Priority review within current shift
    "MODERATE": 24.0,   # Tier 3: Guarded or chronic risk
    # Below 24.0 is ROUTINE (Tier 4)
}

# Quality alert penalty (forces automatic tier escalation)
LOW_QUALITY_SCORE_PENALTY = 25.0
