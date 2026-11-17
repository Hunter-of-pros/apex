from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from PIL import Image
import io
import json
import uuid
from typing import Optional
from datetime import datetime

from backend.app.database import get_db
from backend.app.config import IMAGES_DIR, settings
from backend.app.models.case import Case
from backend.app.models.finding import Finding
from backend.app.models.model_run import ModelRun
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.ingest import IngestResponse, TabularIngestRequest
from backend.app.privacy.deid import (
    sanitize_image_bytes,
    validate_and_scrub_tabular_payload,
    generate_deidentified_identifiers,
    PHIViolationError
)
from backend.app.ml.imaging import run_cxr_inference
from backend.app.ml.tabular import get_tabular_pipeline
from backend.app.ml.mock_model import run_mock_cxr_inference, run_mock_tabular_inference
from backend.app.triage.scoring import compute_triage_score

router = APIRouter(prefix="/ingest", tags=["Ingestion & PHI Scrub"])


@router.post("/image", response_model=IngestResponse)
async def ingest_radiograph(
    file: UploadFile = File(...),
    age: Optional[int] = Form(None),
    sex: Optional[str] = Form("O"),
    clinical_history: Optional[str] = Form("Referred for thoracic evaluation"),
    db: AsyncSession = Depends(get_db)
):
    """
    Ingests and de-identifies a medical radiograph:
    1. Strips all EXIF/DICOM/IPTC headers and sanitizes image bytes.
    2. Issues synthetic de-identified accession and patient identifiers.
    3. Runs thoracic pathology inference and Grad-CAM heatmap extraction.
    4. Computes calibrated triage priority score and stores study.
    5. Writes event ledger to audit log.
    """
    try:
        raw_bytes = await file.read()
        sanitized_bytes, scrub_report = sanitize_image_bytes(raw_bytes)
    except PHIViolationError as pve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(pve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Image processing error: {str(e)}")

    # Save sanitized image
    accession, patient_display = generate_deidentified_identifiers("CXR")
    filename = f"{accession}.png"
    file_path = IMAGES_DIR / filename
    with open(file_path, "wb") as f:
        f.write(sanitized_bytes)

    rel_image_url = f"/data/images/{filename}"

    # Open sanitized image for ML analysis
    pil_img = Image.open(io.BytesIO(sanitized_bytes))

    start_time = datetime.utcnow()
    if settings.FORCE_MOCK_MODEL:
        ml_res = run_mock_cxr_inference(accession)
    else:
        try:
            ml_res = run_cxr_inference(pil_img)
        except Exception:
            ml_res = run_mock_cxr_inference(accession)

    exec_duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000.0

    # Calculate Triage Priority Score
    triage_res = compute_triage_score(
        calibrated_prob=ml_res["calibrated_prob"],
        finding_name=ml_res["primary_finding"],
        ci_lower=ml_res["ci_lower"],
        ci_upper=ml_res["ci_upper"],
        patient_age=age,
        clinical_history=clinical_history,
        is_low_quality=ml_res["is_low_quality"],
        low_quality_reason=ml_res.get("low_quality_reason")
    )

    # Persist Case
    case = Case(
        accession_number=accession,
        patient_display_id=patient_display,
        modality="imaging_cxr",
        age=age,
        sex=sex,
        clinical_history=clinical_history,
        study_datetime=datetime.utcnow(),
        ingested_at=datetime.utcnow(),
        status="unreviewed",
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
        image_path=rel_image_url,
        heatmap_path=ml_res.get("heatmap_path"),
        triage_breakdown_json=json.dumps(triage_res["breakdown"])
    )
    db.add(case)
    await db.flush()

    # Persist Findings
    for f_item in ml_res.get("findings", []):
        finding_record = Finding(
            case_id=case.id,
            finding_name=f_item["finding_name"],
            calibrated_prob=f_item["calibrated_prob"],
            ci_lower=f_item["ci_lower"],
            ci_upper=f_item["ci_upper"],
            severity_weight=f_item["severity_weight"],
            is_primary=f_item["is_primary"],
            clinical_rationale=f_item.get("clinical_rationale"),
            anatomic_locus=f_item.get("anatomic_locus"),
            heatmap_path=f_item.get("heatmap_path")
        )
        db.add(finding_record)

    # Persist Model Run
    model_run = ModelRun(
        case_id=case.id,
        model_name="Meridian-DenseNet121",
        model_version=ml_res.get("model_version", "v1.4"),
        modality="imaging_cxr",
        is_mock=ml_res.get("is_mock", False),
        calibration_method="temperature_scaling",
        execution_time_ms=round(exec_duration_ms, 2),
        quality_metric=0.0 if ml_res["is_low_quality"] else 1.0
    )
    db.add(model_run)

    # Persist Audit Log
    db.add(AuditLog(
        case_id=case.id,
        accession_number=case.accession_number,
        event_type="STUDY_INGESTED_AND_SCRUBBED",
        actor="SYSTEM_DEID",
        details_json=json.dumps(scrub_report)
    ))
    db.add(AuditLog(
        case_id=case.id,
        accession_number=case.accession_number,
        event_type="MODEL_INFERENCE_COMPLETED",
        actor="SYSTEM_INFERENCE",
        details_json=json.dumps({
            "model": model_run.model_name,
            "version": model_run.model_version,
            "priority_score": case.priority_score,
            "tier": case.priority_tier
        })
    ))

    await db.commit()
    await db.refresh(case)

    return IngestResponse(
        case_id=case.id,
        accession_number=case.accession_number,
        patient_display_id=case.patient_display_id,
        modality=case.modality,
        status=case.status,
        priority_score=case.priority_score,
        priority_tier=case.priority_tier,
        primary_finding=case.primary_finding,
        calibrated_prob=case.calibrated_prob,
        scrub_report=scrub_report
    )


@router.post("/tabular", response_model=IngestResponse)
async def ingest_tabular_data(
    payload: TabularIngestRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Ingests and validates a clinical lab/vital dataset:
    1. Validates HIPAA safe-harbor de-identification compliance.
    2. Runs XGBoost clinical risk inference and TreeSHAP feature attributions.
    3. Computes calibrated triage priority score and stores study.
    4. Records immutable audit log entries.
    """
    try:
        scrubbed_dict, scrub_report = validate_and_scrub_tabular_payload(payload.model_dump())
    except PHIViolationError as pve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(pve))

    accession, patient_display = generate_deidentified_identifiers("TAB")

    start_time = datetime.utcnow()
    if settings.FORCE_MOCK_MODEL:
        ml_res = run_mock_tabular_inference(accession)
    else:
        try:
            pipeline = get_tabular_pipeline()
            ml_res = pipeline.predict_and_explain(scrubbed_dict)
        except Exception:
            ml_res = run_mock_tabular_inference(accession)

    exec_duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000.0

    # Triage Score
    triage_res = compute_triage_score(
        calibrated_prob=ml_res["calibrated_prob"],
        finding_name=ml_res["primary_finding"],
        ci_lower=ml_res["ci_lower"],
        ci_upper=ml_res["ci_upper"],
        patient_age=payload.age,
        clinical_history=payload.clinical_history,
        is_low_quality=ml_res["is_low_quality"],
        low_quality_reason=ml_res.get("low_quality_reason")
    )

    case = Case(
        accession_number=accession,
        patient_display_id=patient_display,
        modality="tabular_clinical",
        age=payload.age,
        sex=payload.sex,
        clinical_history=payload.clinical_history,
        study_datetime=datetime.utcnow(),
        ingested_at=datetime.utcnow(),
        status="unreviewed",
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
        tabular_data_json=json.dumps(scrubbed_dict),
        triage_breakdown_json=json.dumps(triage_res["breakdown"])
    )
    db.add(case)
    await db.flush()

    # Persist primary finding with SHAP attributes
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
    db.add(finding)

    # Persist Model Run
    model_run = ModelRun(
        case_id=case.id,
        model_name="Meridian-CardioTabular-XGB",
        model_version=ml_res.get("model_version", "v2.1"),
        modality="tabular_clinical",
        is_mock=ml_res.get("is_mock", False),
        calibration_method="isotonic_regression",
        execution_time_ms=round(exec_duration_ms, 2),
        quality_metric=0.0 if ml_res["is_low_quality"] else 1.0
    )
    db.add(model_run)

    # Audit log
    db.add(AuditLog(
        case_id=case.id,
        accession_number=case.accession_number,
        event_type="TABULAR_STUDY_INGESTED",
        actor="SYSTEM_DEID",
        details_json=json.dumps(scrub_report)
    ))
    db.add(AuditLog(
        case_id=case.id,
        accession_number=case.accession_number,
        event_type="MODEL_INFERENCE_COMPLETED",
        actor="SYSTEM_INFERENCE",
        details_json=json.dumps({
            "model": model_run.model_name,
            "version": model_run.model_version,
            "priority_score": case.priority_score,
            "tier": case.priority_tier
        })
    ))

    await db.commit()
    await db.refresh(case)

    return IngestResponse(
        case_id=case.id,
        accession_number=case.accession_number,
        patient_display_id=case.patient_display_id,
        modality=case.modality,
        status=case.status,
        priority_score=case.priority_score,
        priority_tier=case.priority_tier,
        primary_finding=case.primary_finding,
        calibrated_prob=case.calibrated_prob,
        scrub_report=scrub_report
    )
