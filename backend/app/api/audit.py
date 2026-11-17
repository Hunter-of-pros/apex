from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from backend.app.database import get_db
from backend.app.models.audit_log import AuditLog

router = APIRouter(prefix="/audit", tags=["Audit Log"])


class AuditLogSchema(BaseModel):
    id: int
    case_id: Optional[int]
    accession_number: Optional[str]
    event_type: str
    actor: str
    details_json: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[AuditLogSchema])
async def list_audit_trail(
    case_id: Optional[int] = Query(None, description="Filter by Case ID"),
    event_type: Optional[str] = Query(None, description="Filter by Event Type"),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns immutable audit trail entries in reverse chronological order.
    Every ingestion, scrub, model run, view, and clinical action is captured.
    """
    stmt = select(AuditLog)
    if case_id:
        stmt = stmt.where(AuditLog.case_id == case_id)
    if event_type:
        stmt = stmt.where(AuditLog.event_type == event_type)

    stmt = stmt.order_by(desc(AuditLog.created_at)).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()
