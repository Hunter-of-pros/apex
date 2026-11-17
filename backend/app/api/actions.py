from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import json

from backend.app.database import get_db
from backend.app.models.case import Case
from backend.app.models.clinician_action import ClinicianAction
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.action import RecordActionRequest
from backend.app.schemas.case import CaseSummary

router = APIRouter(prefix="/cases", tags=["Clinician Actions"])


@router.post("/{case_id}/action", response_model=CaseSummary)
async def record_clinician_action(
    case_id: int,
    payload: RecordActionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Records a human clinician's decision (Agree / Disagree / Defer / Reprioritize).
    Enforces that Disagreements require an explicit reason.
    Every action is immutably appended to the audit ledger.
    """
    stmt = select(Case).where(Case.id == case_id)
    result = await db.execute(stmt)
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found."
        )

    action_norm = payload.action.upper().strip()
    valid_actions = {"AGREE", "DISAGREE", "DEFER", "REPRIORITIZE"}
    if action_norm not in valid_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action '{payload.action}'. Must be one of: {', '.join(valid_actions)}"
        )

    # Disagree validation
    if action_norm == "DISAGREE" and not (payload.disagree_reason and payload.disagree_reason.strip()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A specific clinical reason is required when disagreeing with model prioritization."
        )

    # Record action
    new_action = ClinicianAction(
        case_id=case.id,
        action=action_norm,
        disagree_reason=payload.disagree_reason.strip() if payload.disagree_reason else None,
        clinical_notes=payload.clinical_notes.strip() if payload.clinical_notes else None,
        reprioritized_tier=payload.reprioritized_tier.upper().strip() if payload.reprioritized_tier else None,
        clinician_id=payload.clinician_id or "DR-ATTENDING-DEFAULT",
        recorded_at=datetime.utcnow()
    )
    db.add(new_action)

    # Update case status
    if action_norm in ("AGREE", "DISAGREE"):
        case.status = "actioned"
    elif action_norm == "DEFER":
        case.status = "in_review"

    # Reprioritize override
    glyph_map = {"CRITICAL": "◆", "HIGH": "▲", "MODERATE": "■", "ROUTINE": "●"}
    if payload.reprioritized_tier and payload.reprioritized_tier.upper() in glyph_map:
        case.priority_tier = payload.reprioritized_tier.upper()
        case.tier_glyph = glyph_map[case.priority_tier]

    # Append to immutable audit log
    audit_entry = AuditLog(
        case_id=case.id,
        accession_number=case.accession_number,
        event_type=f"CLINICIAN_{action_norm}",
        actor=new_action.clinician_id,
        details_json=json.dumps({
            "action": action_norm,
            "disagree_reason": new_action.disagree_reason,
            "notes": new_action.clinical_notes,
            "reprioritized_tier": new_action.reprioritized_tier
        })
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(case)
    return case
