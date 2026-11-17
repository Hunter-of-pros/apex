from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import json

from backend.app.database import get_db
from backend.app.models.case import Case
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.case import CaseDetail, FindingSchema, ClinicianActionSchema

router = APIRouter(prefix="/cases", tags=["Case Detail"])


@router.get("/{case_id}", response_model=CaseDetail)
async def get_case_detail(case_id: int, db: AsyncSession = Depends(get_db)):
    """
    Returns single case detail view with all associated findings,
    calibrated confidence intervals, media paths, and clinician action log.
    Logs access event to immutable audit log.
    """
    stmt = (
        select(Case)
        .options(
            selectinload(Case.findings),
            selectinload(Case.actions)
        )
        .where(Case.id == case_id)
    )
    result = await db.execute(stmt)
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found."
        )

    # Log case access in audit trail
    audit_entry = AuditLog(
        case_id=case.id,
        accession_number=case.accession_number,
        event_type="CASE_OPENED_FOR_REVIEW",
        actor="CLINICIAN",
        details_json=json.dumps({"modality": case.modality, "tier": case.priority_tier})
    )
    db.add(audit_entry)
    await db.commit()

    # Parse JSON fields
    tabular_dict = None
    if case.tabular_data_json:
        try:
            tabular_dict = json.loads(case.tabular_data_json)
        except Exception:
            pass

    triage_breakdown_dict = None
    if case.triage_breakdown_json:
        try:
            triage_breakdown_dict = json.loads(case.triage_breakdown_json)
        except Exception:
            pass

    # Findings schemas
    findings_list = []
    for f in case.findings:
        shap_list = None
        if f.shap_features_json:
            try:
                shap_list = json.loads(f.shap_features_json)
            except Exception:
                pass

        findings_list.append(
            FindingSchema(
                id=f.id,
                finding_name=f.finding_name,
                calibrated_prob=f.calibrated_prob,
                ci_lower=f.ci_lower,
                ci_upper=f.ci_upper,
                severity_weight=f.severity_weight,
                is_primary=f.is_primary,
                clinical_rationale=f.clinical_rationale,
                anatomic_locus=f.anatomic_locus,
                heatmap_path=f.heatmap_path,
                shap_features=shap_list
            )
        )

    # Actions schemas
    actions_list = [
        ClinicianActionSchema(
            id=a.id,
            action=a.action,
            disagree_reason=a.disagree_reason,
            clinical_notes=a.clinical_notes,
            reprioritized_tier=a.reprioritized_tier,
            clinician_id=a.clinician_id,
            recorded_at=a.recorded_at
        )
        for a in case.actions
    ]

    return CaseDetail(
        id=case.id,
        accession_number=case.accession_number,
        patient_display_id=case.patient_display_id,
        modality=case.modality,
        age=case.age,
        sex=case.sex,
        clinical_history=case.clinical_history,
        study_datetime=case.study_datetime,
        ingested_at=case.ingested_at,
        status=case.status,
        priority_score=case.priority_score,
        priority_tier=case.priority_tier,
        tier_glyph=case.tier_glyph,
        primary_finding=case.primary_finding,
        calibrated_prob=case.calibrated_prob,
        ci_lower=case.ci_lower,
        ci_upper=case.ci_upper,
        is_uncertain=case.is_uncertain,
        is_low_quality=case.is_low_quality,
        low_quality_reason=case.low_quality_reason,
        image_url=case.image_path,
        heatmap_url=case.heatmap_path,
        tabular_data=tabular_dict,
        triage_breakdown=triage_breakdown_dict,
        findings=findings_list,
        actions=actions_list
    )
