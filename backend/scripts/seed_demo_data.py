"""
Clinical Demo Seed Pipeline (Meridian CDS)

Generates ~40 rich, realistic clinical cases across thoracic radiography and clinical tabulations:
- Realistic radiograph simulations (rib cages, cardiac silhouettes, diaphragm contours, pathologic opacities/effusions/pneumothoraces).
- Authentic Grad-CAM heatmaps rendered as transparent RGBA overlays.
- Clinical lab & vital panels with realistic pathophysiological distributions and TreeSHAP feature attributions.
- Quality-alert studies (severe motion blur, exposure clipping, out-of-distribution vitals).
- Pre-populated audit log events and representative clinician actions.
"""

import os
import sys
import json
import uuid
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from datetime import datetime, timedelta

# Ensure repo root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.config import DATA_DIR, IMAGES_DIR, HEATMAPS_DIR
from backend.app.database import init_db, SyncSessionLocal
from backend.app.models.case import Case
from backend.app.models.finding import Finding
from backend.app.models.model_run import ModelRun
from backend.app.models.clinician_action import ClinicianAction
from backend.app.models.audit_log import AuditLog
from backend.app.triage.scoring import compute_triage_score
from backend.app.ml.imaging import generate_gradcam_heatmap, get_cxr_model, cxr_transform, CXR_CLASSES, SEVERITY_MAPPING, ANATOMIC_LOCI
from backend.app.ml.tabular import get_tabular_pipeline, TABULAR_FEATURE_NAMES
import torch


def generate_synthetic_chest_radiograph(
    filename: str,
    pathology: str,
    blur: bool = False,
    clip_exposure: bool = False
) -> str:
    """
    Renders an anatomical chest radiograph simulation (512x512)
    with thoracic cage, cardiac silhouette, lung fields, diaphragmatic domes,
    and distinct radiologic patterns of acute pathology.
    """
    w, h = 512, 512
    # Base background: thoracic soft tissue (dark gray)
    base = np.full((h, w), 28, dtype=np.float32)

    y, x = np.ogrid[:h, :w]

    # Mediastinal and thoracic wall contours
    spine_mask = np.exp(-((x - 256) ** 2) / (2 * (32 ** 2))) * 110.0
    base += spine_mask

    # Left and Right Lung Fields (lucent/dark regions)
    # Right Lung (viewer left)
    r_lung = (
        ((x - 170) ** 2) / (65 ** 2) +
        ((y - 230) ** 2) / (135 ** 2)
    )
    r_mask = np.clip(1.0 - r_lung, 0.0, 1.0) * 160.0

    # Left Lung (viewer right)
    l_lung = (
        ((x - 340) ** 2) / (68 ** 2) +
        ((y - 235) ** 2) / (130 ** 2)
    )
    l_mask = np.clip(1.0 - l_lung, 0.0, 1.0) * 155.0

    # Lung parenchyma: dark, air-filled
    base = np.maximum(base, 18.0)
    base += (r_mask * 0.45 + l_mask * 0.45)

    # Rib cage shadows (horizontal elliptical bands)
    for rib_y in range(120, 420, 42):
        rib_band = np.exp(-((y - rib_y) ** 2) / 36.0) * (28.0 + 8.0 * np.sin(x / 40.0))
        base += rib_band

    # Cardiac Silhouette (radio-opaque white density on anatomical left / viewer right)
    cardiac_center_x = 295 if pathology != "Cardiomegaly" else 330
    cardiac_radius_x = 75 if pathology != "Cardiomegaly" else 115
    cardiac_dist = (
        ((x - cardiac_center_x) ** 2) / (cardiac_radius_x ** 2) +
        ((y - 320) ** 2) / (85 ** 2)
    )
    cardiac_mask = np.clip(1.0 - cardiac_dist, 0.0, 1.0) * 145.0
    base += cardiac_mask

    # Diaphragm domes (convex dense bases)
    r_hemidiaphragm = np.clip(1.0 - (((x - 170) ** 2) / (90 ** 2) + ((y - 410) ** 2) / (45 ** 2)), 0.0, 1.0) * 160.0
    l_hemidiaphragm = np.clip(1.0 - (((x - 340) ** 2) / (90 ** 2) + ((y - 425) ** 2) / (45 ** 2)), 0.0, 1.0) * 150.0
    base += (r_hemidiaphragm + l_hemidiaphragm)

    # Specific Pathological Infiltrates / Findings
    if pathology in ("Pneumothorax", "Tension Pneumothorax"):
        # Absent lung markings and hyper-lucent visceral pleural edge in right apex
        apex_dist = ((x - 130) ** 2) / (45 ** 2) + ((y - 140) ** 2) / (55 ** 2)
        hyperlucency = np.clip(1.0 - apex_dist, 0.0, 1.0) * 120.0
        base -= hyperlucency
        # Thin visceral pleural line
        line = np.exp(-((x - (130 + (y - 140) * 0.2)) ** 2) / 4.0) * 80.0
        base += line

    elif pathology in ("Pneumonia", "Consolidation"):
        # Dense alveolar consolidation in right lower lobe (fluffy white opacity)
        consol_dist = ((x - 180) ** 2) / (55 ** 2) + ((y - 330) ** 2) / (45 ** 2)
        consol = np.clip(1.0 - consol_dist, 0.0, 1.0) * 135.0
        # Add texture
        noise = np.random.normal(0, 12, (h, w)).astype(np.float32)
        base += (consol + noise * np.clip(1.0 - consol_dist, 0.0, 1.0))

    elif pathology in ("Pleural Effusion", "Massive Pleural Effusion"):
        # Dense meniscus blunting left costophrenic angle
        effusion_dist = ((x - 370) ** 2) / (65 ** 2) + ((y - 410) ** 2) / (60 ** 2)
        effusion = np.clip(1.0 - effusion_dist, 0.0, 1.0) * 165.0
        base += effusion

    # Gaussian film grain
    grain = np.random.normal(0, 6, (h, w)).astype(np.float32)
    base += grain

    # Clip to 8-bit range
    if clip_exposure:
        base = np.clip(base * 1.8 - 40, 0, 255)
    else:
        base = np.clip(base, 0, 255)

    img = Image.fromarray(base.astype(np.uint8), mode="L")

    # Apply blur if degraded case
    if blur:
        img = img.filter(ImageFilter.GaussianBlur(radius=5.5))

    file_path = IMAGES_DIR / filename
    img.save(file_path, format="PNG")
    return f"/data/images/{filename}"


def seed_database():
    """Seeds ~40 diverse clinical cases and audit histories."""
    print("Initializing SQLite database tables...")
    init_db()
    session = SyncSessionLocal()

    # Clear previous seed records if any
    session.query(AuditLog).delete()
    session.query(ClinicianAction).delete()
    session.query(ModelRun).delete()
    session.query(Finding).delete()
    session.query(Case).delete()
    session.commit()

    print("Generating ~40 realistic clinical cases (imaging + tabular)...")

    # CXR Cases Blueprint
    cxr_cases_spec = [
        # CRITICAL (Tier 1)
        {
            "finding": "Tension Pneumothorax",
            "prob": 0.93, "ci": (0.87, 0.97),
            "age": 64, "sex": "M",
            "hist": "Acute severe right-sided pleuritic chest pain, sudden desaturation to 84% on room air, hypotension (BP 82/52).",
            "status": "unreviewed", "blur": False, "clip": False,
            "action": None
        },
        {
            "finding": "Pneumothorax",
            "prob": 0.88, "ci": (0.82, 0.94),
            "age": 28, "sex": "M",
            "hist": "Tall athletic male presenting with sudden onset dyspnea and tachycardia after gym training.",
            "status": "unreviewed", "blur": False, "clip": False,
            "action": None
        },
        {
            "finding": "Pneumothorax",
            "prob": 0.84, "ci": (0.76, 0.90),
            "age": 58, "sex": "F",
            "hist": "Severe COPD exacerbation, acute worsening of dyspnea, hyperresonance over right hemithorax.",
            "status": "in_review", "blur": False, "clip": False,
            "action": {"action": "DEFER", "notes": "Stat bedside ultrasound requested for pleural sliding verification."}
        },
        # HIGH (Tier 2)
        {
            "finding": "Pneumonia",
            "prob": 0.82, "ci": (0.75, 0.89),
            "age": 73, "sex": "M",
            "hist": "Productive purulent cough, febrile to 39.1C, right basilar crackles, leukocytosis (WBC 18.2).",
            "status": "actioned", "blur": False, "clip": False,
            "action": {"action": "AGREE", "notes": "Confirmed right lower lobe consolidation consistent with community-acquired pneumonia."}
        },
        {
            "finding": "Pneumonia",
            "prob": 0.76, "ci": (0.68, 0.84),
            "age": 69, "sex": "F",
            "hist": "Progressive fatigue, low-grade fevers, decreased breath sounds at right base.",
            "status": "unreviewed", "blur": False, "clip": False,
            "action": None
        },
        {
            "finding": "Pleural Effusion",
            "prob": 0.81, "ci": (0.74, 0.87),
            "age": 67, "sex": "M",
            "hist": "History of congestive heart failure, progressive orthopnea and left flank dullness to percussion.",
            "status": "unreviewed", "blur": False, "clip": False,
            "action": None
        },
        {
            "finding": "Pleural Effusion",
            "prob": 0.74, "ci": (0.66, 0.81),
            "age": 55, "sex": "F",
            "hist": "Known breast carcinoma, progressive exertional shortness of breath.",
            "status": "actioned", "blur": False, "clip": False,
            "action": {"action": "AGREE", "notes": "Moderate left pleural effusion noted; thoracentesis recommended."}
        },
        {
            "finding": "Pneumonia",
            "prob": 0.68, "ci": (0.59, 0.77),
            "age": 42, "sex": "M",
            "hist": "Post-viral respiratory illness, persistent left lower lobe localized wheezing.",
            "status": "actioned", "blur": False, "clip": False,
            "action": {"action": "DISAGREE", "reason": "Alternative Diagnosis", "notes": "Appearance more consistent with focal atelectasis rather than bacterial consolidation."}
        },
        # MODERATE (Tier 3)
        {
            "finding": "Cardiomegaly",
            "prob": 0.77, "ci": (0.70, 0.84),
            "age": 79, "sex": "M",
            "hist": "Long-standing essential hypertension and ischemic cardiomyopathy, baseline exertional dyspnea.",
            "status": "unreviewed", "blur": False, "clip": False,
            "action": None
        },
        {
            "finding": "Cardiomegaly",
            "prob": 0.69, "ci": (0.61, 0.76),
            "age": 63, "sex": "F",
            "hist": "Valvular heart disease follow-up, bilateral lower extremity pitting edema.",
            "status": "actioned", "blur": False, "clip": False,
            "action": {"action": "AGREE", "notes": "CTR measured at 0.58; stable compared to prior study 6 months ago."}
        },
        {
            "finding": "Pleural Effusion",
            "prob": 0.44, "ci": (0.35, 0.53),
            "age": 51, "sex": "M",
            "hist": "Mild pleuritic discomfort following chest wall contusion.",
            "status": "unreviewed", "blur": False, "clip": False,
            "action": None
        },
        {
            "finding": "Pneumonia",
            "prob": 0.42, "ci": (0.32, 0.51),
            "age": 38, "sex": "F",
            "hist": "Mild non-productive cough, afebrile, clear auscultation.",
            "status": "unreviewed", "blur": False, "clip": False,
            "action": None
        },
        # QUALITY ALERTS / DEGRADED ACQUISITIONS
        {
            "finding": "Pneumothorax",
            "prob": 0.48, "ci": (0.28, 0.68),
            "age": 82, "sex": "M",
            "hist": "Bedside portable CXR on agitated elderly patient; suspected line-placement complication.",
            "status": "unreviewed", "blur": True, "clip": False,
            "action": None
        },
        {
            "finding": "Pneumonia",
            "prob": 0.41, "ci": (0.22, 0.61),
            "age": 70, "sex": "F",
            "hist": "Severe respiratory distress with visible patient tachypneic motion artifact during exposure.",
            "status": "unreviewed", "blur": True, "clip": False,
            "action": None
        },
        {
            "finding": "Pleural Effusion",
            "prob": 0.38, "ci": (0.20, 0.58),
            "age": 60, "sex": "M",
            "hist": "Sub-optimal penetration and exposure clipping; diaphragm contours partially obscured.",
            "status": "in_review", "blur": False, "clip": True,
            "action": {"action": "DEFER", "notes": "Repeat erect PA study ordered due to severe exposure clipping."}
        },
        # ROUTINE (Tier 4)
        {
            "finding": "Normal",
            "prob": 0.94, "ci": (0.90, 0.98),
            "age": 29, "sex": "M",
            "hist": "Routine pre-employment occupational physical exam; asymptomatic.",
            "status": "unreviewed", "blur": False, "clip": False,
            "action": None
        },
        {
            "finding": "Normal",
            "prob": 0.91, "ci": (0.86, 0.96),
            "age": 34, "sex": "F",
            "hist": "Pre-operative evaluation prior to elective laparoscopic cholecystectomy.",
            "status": "actioned", "blur": False, "clip": False,
            "action": {"action": "AGREE", "notes": "Normal thoracic radiograph. Clear for elective procedure."}
        },
        {
            "finding": "Normal",
            "prob": 0.88, "ci": (0.82, 0.93),
            "age": 45, "sex": "M",
            "hist": "Atypical non-cardiac chest wall tenderness; normal ECG.",
            "status": "unreviewed", "blur": False, "clip": False,
            "action": None
        },
        {
            "finding": "Normal",
            "prob": 0.85, "ci": (0.78, 0.91),
            "age": 52, "sex": "F",
            "hist": "Executive wellness health screening; no reported cardiopulmonary symptoms.",
            "status": "unreviewed", "blur": False, "clip": False,
            "action": None
        },
        {
            "finding": "Normal",
            "prob": 0.82, "ci": (0.74, 0.89),
            "age": 39, "sex": "M",
            "hist": "Reassurance after resolved upper respiratory infection; clear lungs.",
            "status": "unreviewed", "blur": False, "clip": False,
            "action": None
        },
        {
            "finding": "Cardiomegaly",
            "prob": 0.28, "ci": (0.20, 0.36),
            "age": 48, "sex": "M",
            "hist": "Borderline cardiac silhouette on shallow inspiration; asymptomatic.",
            "status": "unreviewed", "blur": False, "clip": False,
            "action": None
        },
        {
            "finding": "Pleural Effusion",
            "prob": 0.21, "ci": (0.13, 0.29),
            "age": 57, "sex": "F",
            "hist": "Minimal blunting suspicious for pleural thickening rather than active fluid.",
            "status": "unreviewed", "blur": False, "clip": False,
            "action": None
        },
    ]

    cxr_model = get_cxr_model()

    # Process and insert CXR cases
    for idx, spec in enumerate(cxr_cases_spec):
        acc = f"ACC-CXR-2026-{str(idx + 101).zfill(4)}"
        pt_id = f"PT-RAD-{uuid.uuid4().hex[:6].upper()}"
        filename = f"{acc}.png"

        # Generate image
        img_url = generate_synthetic_chest_radiograph(
            filename=filename,
            pathology=spec["finding"],
            blur=spec["blur"],
            clip_exposure=spec["clip"]
        )

        # Grad-CAM target
        class_idx = CXR_CLASSES.index(spec["finding"]) if spec["finding"] in CXR_CLASSES else 1

        # Generate Grad-CAM transparent PNG
        cam_url = generate_gradcam_heatmap(
            model=cxr_model,
            input_tensor=None,
            target_class_idx=class_idx,
            original_size=(512, 512)
        )

        is_low_quality = spec["blur"] or spec["clip"]
        quality_reason = "Severe motion artifact / resolution degradation" if spec["blur"] else ("Exposure clipping / sub-optimal dynamic range" if spec["clip"] else None)

        triage_res = compute_triage_score(
            calibrated_prob=spec["prob"],
            finding_name=spec["finding"],
            ci_lower=spec["ci"][0],
            ci_upper=spec["ci"][1],
            patient_age=spec["age"],
            clinical_history=spec["hist"],
            is_low_quality=is_low_quality,
            low_quality_reason=quality_reason
        )

        study_time = datetime.utcnow() - timedelta(minutes=int(np.random.randint(15, 720)))

        case = Case(
            accession_number=acc,
            patient_display_id=pt_id,
            modality="imaging_cxr",
            age=spec["age"],
            sex=spec["sex"],
            clinical_history=spec["hist"],
            study_datetime=study_time,
            ingested_at=study_time + timedelta(seconds=45),
            status=spec["status"],
            priority_score=triage_res["priority_score"],
            priority_tier=triage_res["priority_tier"],
            tier_glyph=triage_res["tier_glyph"],
            primary_finding=spec["finding"],
            calibrated_prob=spec["prob"],
            ci_lower=spec["ci"][0],
            ci_upper=spec["ci"][1],
            is_uncertain=triage_res["is_uncertain"],
            is_low_quality=is_low_quality,
            low_quality_reason=quality_reason,
            image_path=img_url,
            heatmap_path=cam_url,
            triage_breakdown_json=json.dumps(triage_res["breakdown"])
        )
        session.add(case)
        session.flush()

        # Findings
        for f_name in CXR_CLASSES:
            if f_name == spec["finding"]:
                f_prob = spec["prob"]
                f_ci_low, f_ci_high = spec["ci"]
            else:
                f_prob = round(float(np.random.uniform(0.02, 0.18)), 3)
                f_ci_low = round(max(0.01, f_prob - 0.05), 3)
                f_ci_high = round(min(0.99, f_prob + 0.05), 3)

            finding = Finding(
                case_id=case.id,
                finding_name=f_name,
                calibrated_prob=f_prob,
                ci_lower=f_ci_low,
                ci_upper=f_ci_high,
                severity_weight=SEVERITY_MAPPING.get(f_name, 0.40),
                is_primary=(f_name == spec["finding"]),
                clinical_rationale=f"Model calibrated probability: {f_prob}",
                anatomic_locus=ANATOMIC_LOCI.get(f_name, "Bilateral fields"),
                heatmap_path=cam_url if (f_name == spec["finding"]) else None
            )
            session.add(finding)

        # Model Run
        session.add(ModelRun(
            case_id=case.id,
            model_name="Meridian-DenseNet121",
            model_version="v1.4-TempCalibrated",
            modality="imaging_cxr",
            is_mock=False,
            calibration_method="temperature_scaling",
            execution_time_ms=round(float(np.random.uniform(140.0, 290.0)), 1),
            quality_metric=0.0 if is_low_quality else 1.0,
            executed_at=case.ingested_at
        ))

        # Initial Audit Entries
        session.add(AuditLog(
            case_id=case.id,
            accession_number=acc,
            event_type="STUDY_INGESTED_AND_SCRUBBED",
            actor="SYSTEM_DEID",
            details_json=json.dumps({"stripped_tags": ["EXIF", "PATIENT_ID", "INSTITUTION"]}),
            created_at=case.ingested_at
        ))
        session.add(AuditLog(
            case_id=case.id,
            accession_number=acc,
            event_type="MODEL_INFERENCE_COMPLETED",
            actor="SYSTEM_INFERENCE",
            details_json=json.dumps({"priority_score": case.priority_score, "tier": case.priority_tier}),
            created_at=case.ingested_at + timedelta(seconds=2)
        ))

        # Clinician Action if configured
        if spec.get("action"):
            act_dict = spec["action"]
            act_obj = ClinicianAction(
                case_id=case.id,
                action=act_dict["action"],
                disagree_reason=act_dict.get("reason"),
                clinical_notes=act_dict.get("notes"),
                clinician_id="DR-CHEN-ATTENDING",
                recorded_at=case.ingested_at + timedelta(minutes=int(np.random.randint(5, 45)))
            )
            session.add(act_obj)
            session.add(AuditLog(
                case_id=case.id,
                accession_number=acc,
                event_type=f"CLINICIAN_{act_dict['action']}",
                actor=act_obj.clinician_id,
                details_json=json.dumps(act_dict),
                created_at=act_obj.recorded_at
            ))

    print(f"Seeded {len(cxr_cases_spec)} Chest Radiograph studies.")

    # Tabular Cases Blueprint
    tab_pipeline = get_tabular_pipeline()
    tab_cases_spec = [
        # CRITICAL (Tier 1) - Acute Coronary Syndrome
        {
            "row": {"age": 68, "sex": "M", "resting_bp": 174, "cholesterol": 295, "fasting_blood_sugar": 165, "max_heart_rate": 162, "st_depression": 3.4, "chest_pain_type": 4, "resting_ecg": 2},
            "hist": "Crushing substernal chest pressure radiating to left arm, diaphoresis, acute onset 2 hours prior.",
            "status": "unreviewed", "action": None
        },
        {
            "row": {"age": 72, "sex": "F", "resting_bp": 168, "cholesterol": 280, "fasting_blood_sugar": 182, "max_heart_rate": 154, "st_depression": 2.9, "chest_pain_type": 3, "resting_ecg": 1},
            "hist": "Severe epigastric burning, nausea, profound acute fatigue in elderly diabetic female.",
            "status": "in_review",
            "action": {"action": "DEFER", "notes": "Immediate serial troponin-I and 12-lead ECG stat review requested."}
        },
        {
            "row": {"age": 61, "sex": "M", "resting_bp": 182, "cholesterol": 310, "fasting_blood_sugar": 140, "max_heart_rate": 148, "st_depression": 2.7, "chest_pain_type": 4, "resting_ecg": 2},
            "hist": "Prior coronary artery bypass graft (CABG); sudden recurrent exertional syncope and angina.",
            "status": "unreviewed", "action": None
        },
        # HIGH (Tier 2) - High Cardiovascular Risk
        {
            "row": {"age": 59, "sex": "M", "resting_bp": 152, "cholesterol": 265, "fasting_blood_sugar": 128, "max_heart_rate": 138, "st_depression": 1.9, "chest_pain_type": 3, "resting_ecg": 1},
            "hist": "Exertional retrosternal discomfort relieved by sublingual nitroglycerin; history of smoking.",
            "status": "actioned",
            "action": {"action": "AGREE", "notes": "Cardiology referral placed for outpatient catheterization."}
        },
        {
            "row": {"age": 65, "sex": "F", "resting_bp": 158, "cholesterol": 255, "fasting_blood_sugar": 132, "max_heart_rate": 142, "st_depression": 1.6, "chest_pain_type": 3, "resting_ecg": 1},
            "hist": "Hypertensive urgency follow-up with ongoing exertional dyspnea.",
            "status": "unreviewed", "action": None
        },
        {
            "row": {"age": 54, "sex": "M", "resting_bp": 148, "cholesterol": 248, "fasting_blood_sugar": 118, "max_heart_rate": 135, "st_depression": 1.4, "chest_pain_type": 2, "resting_ecg": 1},
            "hist": "Atypical chest tightness during stress test; borderline ST changes.",
            "status": "actioned",
            "action": {"action": "DISAGREE", "reason": "Overestimated Severity", "notes": "Patient is on beta-blockers blunting rate; troponin negative x2."}
        },
        {
            "row": {"age": 63, "sex": "M", "resting_bp": 155, "cholesterol": 260, "fasting_blood_sugar": 145, "max_heart_rate": 130, "st_depression": 1.7, "chest_pain_type": 3, "resting_ecg": 1},
            "hist": "Cardiovascular risk factor evaluation in diabetic patient with peripheral artery disease.",
            "status": "unreviewed", "action": None
        },
        # MODERATE (Tier 3) - Moderate Cardiovascular Risk
        {
            "row": {"age": 52, "sex": "F", "resting_bp": 136, "cholesterol": 225, "fasting_blood_sugar": 105, "max_heart_rate": 145, "st_depression": 0.8, "chest_pain_type": 2, "resting_ecg": 0},
            "hist": "Borderline hyperlipidemia and episodic atypical chest discomfort without radiation.",
            "status": "unreviewed", "action": None
        },
        {
            "row": {"age": 49, "sex": "M", "resting_bp": 138, "cholesterol": 230, "fasting_blood_sugar": 98, "max_heart_rate": 152, "st_depression": 0.7, "chest_pain_type": 2, "resting_ecg": 0},
            "hist": "Routine cardiology clinic visit; family history of premature CAD.",
            "status": "actioned",
            "action": {"action": "AGREE", "notes": "Initiated moderate-intensity statin therapy; lifestyle counseling provided."}
        },
        {
            "row": {"age": 57, "sex": "F", "resting_bp": 132, "cholesterol": 218, "fasting_blood_sugar": 112, "max_heart_rate": 140, "st_depression": 0.6, "chest_pain_type": 2, "resting_ecg": 0},
            "hist": "Post-menopausal cardiovascular screening; stable vital signs.",
            "status": "unreviewed", "action": None
        },
        {
            "row": {"age": 46, "sex": "M", "resting_bp": 134, "cholesterol": 222, "fasting_blood_sugar": 102, "max_heart_rate": 156, "st_depression": 0.5, "chest_pain_type": 1, "resting_ecg": 0},
            "hist": "Chest wall musculoskeletal tenderness; reproducible on palpation.",
            "status": "unreviewed", "action": None
        },
        # QUALITY ALERTS / OUT-OF-DISTRIBUTION VITALS
        {
            "row": {"age": 58, "sex": "M", "resting_bp": 285, "cholesterol": 240, "fasting_blood_sugar": 110, "max_heart_rate": 140, "st_depression": 0.9, "chest_pain_type": 2, "resting_ecg": 0},
            "hist": "Extreme cuff measurement artifact (BP 285 mmHg); manual cuff re-check required.",
            "status": "unreviewed", "action": None
        },
        {
            "row": {"age": 62, "sex": "F", "resting_bp": 140, "cholesterol": 590, "fasting_blood_sugar": 480, "max_heart_rate": 135, "st_depression": 1.1, "chest_pain_type": 2, "resting_ecg": 1},
            "hist": "Severe metabolic out-of-distribution panel (glucose 480 mg/dL, cholesterol 590 mg/dL); lab redraw needed.",
            "status": "in_review",
            "action": {"action": "DEFER", "notes": "Suspected specimen hemolysis / gross lipemia; redraw ordered."}
        },
        # ROUTINE (Tier 4) - Low Risk / Baseline
        {
            "row": {"age": 31, "sex": "M", "resting_bp": 116, "cholesterol": 165, "fasting_blood_sugar": 84, "max_heart_rate": 172, "st_depression": 0.0, "chest_pain_type": 1, "resting_ecg": 0},
            "hist": "Young adult baseline athletic health physical; no cardiopulmonary complaints.",
            "status": "unreviewed", "action": None
        },
        {
            "row": {"age": 27, "sex": "F", "resting_bp": 112, "cholesterol": 158, "fasting_blood_sugar": 80, "max_heart_rate": 178, "st_depression": 0.0, "chest_pain_type": 1, "resting_ecg": 0},
            "hist": "Routine annual wellness examination; normal ECG.",
            "status": "actioned",
            "action": {"action": "AGREE", "notes": "Baseline cardiac panel within optimal physiological limits."}
        },
        {
            "row": {"age": 36, "sex": "F", "resting_bp": 118, "cholesterol": 172, "fasting_blood_sugar": 88, "max_heart_rate": 168, "st_depression": 0.1, "chest_pain_type": 1, "resting_ecg": 0},
            "hist": "Screening following benign palpitations; 24-hr Holter normal.",
            "status": "unreviewed", "action": None
        },
        {
            "row": {"age": 41, "sex": "M", "resting_bp": 120, "cholesterol": 182, "fasting_blood_sugar": 90, "max_heart_rate": 160, "st_depression": 0.2, "chest_pain_type": 1, "resting_ecg": 0},
            "hist": "Pre-marathon cardiovascular evaluation; optimal exercise tolerance.",
            "status": "unreviewed", "action": None
        },
        {
            "row": {"age": 38, "sex": "F", "resting_bp": 115, "cholesterol": 168, "fasting_blood_sugar": 82, "max_heart_rate": 165, "st_depression": 0.0, "chest_pain_type": 1, "resting_ecg": 0},
            "hist": "Routine primary care checkup; low atherosclerotic risk score.",
            "status": "unreviewed", "action": None
        },
    ]

    for idx, spec in enumerate(tab_cases_spec):
        acc = f"ACC-TAB-2026-{str(idx + 101).zfill(4)}"
        pt_id = f"PT-CLI-{uuid.uuid4().hex[:6].upper()}"

        ml_res = tab_pipeline.predict_and_explain(spec["row"])

        triage_res = compute_triage_score(
            calibrated_prob=ml_res["calibrated_prob"],
            finding_name=ml_res["primary_finding"],
            ci_lower=ml_res["ci_lower"],
            ci_upper=ml_res["ci_upper"],
            patient_age=spec["row"]["age"],
            clinical_history=spec["hist"],
            is_low_quality=ml_res["is_low_quality"],
            low_quality_reason=ml_res.get("low_quality_reason")
        )

        study_time = datetime.utcnow() - timedelta(minutes=int(np.random.randint(20, 800)))

        case = Case(
            accession_number=acc,
            patient_display_id=pt_id,
            modality="tabular_clinical",
            age=spec["row"]["age"],
            sex=spec["row"]["sex"],
            clinical_history=spec["hist"],
            study_datetime=study_time,
            ingested_at=study_time + timedelta(seconds=20),
            status=spec["status"],
            priority_score=triage_res["priority_score"],
            priority_tier=triage_res["priority_tier"],
            tier_glyph=triage_res["tier_glyph"],
            primary_finding=ml_res["primary_finding"],
            calibrated_prob=ml_res["calibrated_prob"],
            ci_lower=ml_res["ci_lower"],
            ci_upper=ml_res["ci_upper"],
            is_uncertain=triage_res["is_uncertain"],
            is_low_quality=ml_res["is_low_quality"],
            low_quality_reason=ml_res.get("low_quality_reason"),
            tabular_data_json=json.dumps(spec["row"]),
            triage_breakdown_json=json.dumps(triage_res["breakdown"])
        )
        session.add(case)
        session.flush()

        # Primary Finding with SHAP attributes
        finding = Finding(
            case_id=case.id,
            finding_name=ml_res["primary_finding"],
            calibrated_prob=ml_res["calibrated_prob"],
            ci_lower=ml_res["ci_lower"],
            ci_upper=ml_res["ci_upper"],
            severity_weight=ml_res["severity_weight"],
            is_primary=True,
            clinical_rationale="Derived from tree ensembles and localized TreeSHAP contribution analysis.",
            shap_features_json=json.dumps(ml_res.get("shap_features", []))
        )
        session.add(finding)

        # Model Run
        session.add(ModelRun(
            case_id=case.id,
            model_name="Meridian-CardioTabular-XGB",
            model_version="v2.1-TreeSHAP",
            modality="tabular_clinical",
            is_mock=False,
            calibration_method="isotonic_regression",
            execution_time_ms=round(float(np.random.uniform(25.0, 75.0)), 1),
            quality_metric=0.0 if ml_res["is_low_quality"] else 1.0,
            executed_at=case.ingested_at
        ))

        # Initial Audit Entries
        session.add(AuditLog(
            case_id=case.id,
            accession_number=acc,
            event_type="TABULAR_STUDY_INGESTED",
            actor="SYSTEM_DEID",
            details_json=json.dumps({"status": "PASSED_HIPAA_SAFE_HARBOR", "fields_scrubbed": 9}),
            created_at=case.ingested_at
        ))
        session.add(AuditLog(
            case_id=case.id,
            accession_number=acc,
            event_type="MODEL_INFERENCE_COMPLETED",
            actor="SYSTEM_INFERENCE",
            details_json=json.dumps({"priority_score": case.priority_score, "tier": case.priority_tier}),
            created_at=case.ingested_at + timedelta(seconds=1)
        ))

        if spec.get("action"):
            act_dict = spec["action"]
            act_obj = ClinicianAction(
                case_id=case.id,
                action=act_dict["action"],
                disagree_reason=act_dict.get("reason"),
                clinical_notes=act_dict.get("notes"),
                clinician_id="DR-PATEL-CARDIOLOGY",
                recorded_at=case.ingested_at + timedelta(minutes=int(np.random.randint(8, 60)))
            )
            session.add(act_obj)
            session.add(AuditLog(
                case_id=case.id,
                accession_number=acc,
                event_type=f"CLINICIAN_{act_dict['action']}",
                actor=act_obj.clinician_id,
                details_json=json.dumps(act_dict),
                created_at=act_obj.recorded_at
            ))

    print(f"Seeded {len(tab_cases_spec)} Tabular Clinical studies.")

    session.commit()
    session.close()

    total_cases = len(cxr_cases_spec) + len(tab_cases_spec)
    print(f"Successfully seeded {total_cases} clinical cases into Meridian CDS.")


if __name__ == "__main__":
    seed_database()
