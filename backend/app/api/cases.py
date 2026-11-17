from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_
from typing import List, Optional
import json

from backend.app.database import get_db
from backend.app.models.case import Case
from backend.app.schemas.case import CaseSummary

router = APIRouter(prefix="/cases", tags=["Worklist Cases"])


@router.get("", response_model=List[CaseSummary])
async def list_worklist_cases(
    modality: Optional[str] = Query(None, description="imaging_cxr | tabular_clinical"),
    status: Optional[str] = Query(None, description="unreviewed | in_review | actioned"),
    priority_tier: Optional[str] = Query(None, description="CRITICAL | HIGH | MODERATE | ROUTINE"),
    is_low_quality: Optional[bool] = Query(None, description="Filter degraded inputs"),
    search: Optional[str] = Query(None, description="Search by Accession ID or Patient ID"),
    sort_by: str = Query("priority", description="priority | time | confidence"),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns ranked clinical worklist ordered by triage urgency.
    Assistive ordering only; no cases are ever hidden or auto-dismissed.
    """
    stmt = select(Case)

    if modality:
        stmt = stmt.where(Case.modality == modality)
    if status:
        stmt = stmt.where(Case.status == status)
    if priority_tier:
        stmt = stmt.where(Case.priority_tier == priority_tier)
    if is_low_quality is not None:
        stmt = stmt.where(Case.is_low_quality == is_low_quality)
    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Case.accession_number.ilike(search_pattern),
                Case.patient_display_id.ilike(search_pattern),
                Case.primary_finding.ilike(search_pattern)
            )
        )

    # Sorting
    if sort_by == "priority":
        stmt = stmt.order_by(desc(Case.priority_score), desc(Case.ingested_at))
    elif sort_by == "time":
        stmt = stmt.order_by(desc(Case.ingested_at))
    elif sort_by == "confidence":
        stmt = stmt.order_by(desc(Case.calibrated_prob))
    else:
        stmt = stmt.order_by(desc(Case.priority_score))

    result = await db.execute(stmt)
    cases = result.scalars().all()
    return cases
