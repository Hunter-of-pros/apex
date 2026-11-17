from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Dict

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
ARTIFACTS_DIR = DATA_DIR / "artifacts"
HEATMAPS_DIR = ARTIFACTS_DIR / "heatmaps"
IMAGES_DIR = DATA_DIR / "images"

for d in [DATA_DIR, UPLOAD_DIR, ARTIFACTS_DIR, HEATMAPS_DIR, IMAGES_DIR]:
    d.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    APP_NAME: str = "Meridian CDS"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    
    # Storage
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DATA_DIR}/meridian.db"
    SYNC_DATABASE_URL: str = f"sqlite:///{DATA_DIR}/meridian.db"
    
    # Model Execution
    FORCE_MOCK_MODEL: bool = False
    MOCK_MODEL_ACTIVE: bool = False
    
    # Clinical Triage Formula Weights
    WEIGHT_CALIBRATED_PROBABILITY: float = 0.45
    WEIGHT_CLINICAL_SEVERITY: float = 0.35
    WEIGHT_UNCERTAINTY: float = 0.10
    WEIGHT_PATIENT_RISK: float = 0.10
    QUALITY_PENALTY_SCORE: float = 25.0
    
    # Severity Weights by Finding
    FINDING_SEVERITY_WEIGHTS: Dict[str, float] = {
        # Thoracic Radiography
        "Pneumothorax": 1.00,
        "Tension Pneumothorax": 1.00,
        "Pleural Effusion": 0.75,
        "Pneumonia": 0.70,
        "Consolidation": 0.70,
        "Cardiomegaly": 0.45,
        "Atelectasis": 0.40,
        "Normal": 0.05,
        "No Finding": 0.05,
        # Cardiovascular / Tabular
        "Acute Coronary Syndrome": 1.00,
        "High Cardiovascular Risk": 0.85,
        "Metabolic Decompensation": 0.65,
        "Moderate Cardiac Risk": 0.50,
        "Low Risk": 0.10,
    }
    
    # Thresholds for Urgency Tiers (Score 0-100)
    TIER_CRITICAL_THRESHOLD: float = 75.0
    TIER_HIGH_THRESHOLD: float = 50.0
    TIER_MODERATE_THRESHOLD: float = 25.0

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
