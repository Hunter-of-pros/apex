import { CaseSummary, CaseDetail, ModelTransparency, AuditLogEntry, ActionType, UrgencyTier } from '../types';
import seedDataRaw from '../data/seedData.json';

const API_BASE = '/api';

// Embedded seed fallback for Vercel / serverless deployments
interface SeedData {
  cases: CaseDetail[];
  audit: AuditLogEntry[];
  transparency: ModelTransparency[];
}

const seedData = seedDataRaw as unknown as SeedData;

// In-memory or localStorage cache for actions taken when running in standalone/Vercel mode
function getLocalCases(): CaseDetail[] {
  const stored = localStorage.getItem('meridian_cases_v1');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return seedData.cases;
    }
  }
  return seedData.cases;
}

function saveLocalCases(cases: CaseDetail[]) {
  localStorage.setItem('meridian_cases_v1', JSON.stringify(cases));
}

function getLocalAudit(): AuditLogEntry[] {
  const stored = localStorage.getItem('meridian_audit_v1');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return seedData.audit;
    }
  }
  return seedData.audit;
}

function saveLocalAudit(audit: AuditLogEntry[]) {
  localStorage.setItem('meridian_audit_v1', JSON.stringify(audit));
}

export async function fetchCases(params?: {
  modality?: string;
  status?: string;
  priority_tier?: string;
  is_low_quality?: boolean;
  search?: string;
  sort_by?: string;
}): Promise<CaseSummary[]> {
  try {
    const query = new URLSearchParams();
    if (params?.modality) query.set('modality', params.modality);
    if (params?.status) query.set('status', params.status);
    if (params?.priority_tier) query.set('priority_tier', params.priority_tier);
    if (params?.is_low_quality !== undefined) query.set('is_low_quality', String(params.is_low_quality));
    if (params?.search) query.set('search', params.search);
    if (params?.sort_by) query.set('sort_by', params.sort_by);

    const res = await fetch(`${API_BASE}/cases?${query.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Backend unreachable, fallback to client-side data
  }

  // Fallback
  let list = getLocalCases();
  if (params?.modality) list = list.filter((c) => c.modality === params.modality);
  if (params?.status) list = list.filter((c) => c.status === params.status);
  if (params?.priority_tier) list = list.filter((c) => c.priority_tier === params.priority_tier);
  if (params?.is_low_quality !== undefined) list = list.filter((c) => c.is_low_quality === params.is_low_quality);
  if (params?.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (c) =>
        c.accession_number.toLowerCase().includes(q) ||
        c.patient_display_id.toLowerCase().includes(q) ||
        c.primary_finding.toLowerCase().includes(q)
    );
  }

  return list.sort((a, b) => b.priority_score - a.priority_score);
}

export async function fetchCaseDetail(caseId: number): Promise<CaseDetail> {
  try {
    const res = await fetch(`${API_BASE}/cases/${caseId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  const list = getLocalCases();
  const found = list.find((c) => c.id === caseId);
  if (!found) throw new Error(`Case #${caseId} not found`);
  return found;
}

export async function recordClinicianAction(
  caseId: number,
  payload: {
    action: ActionType;
    disagree_reason?: string;
    clinical_notes?: string;
    reprioritized_tier?: UrgencyTier;
    clinician_id?: string;
  }
): Promise<CaseSummary> {
  try {
    const res = await fetch(`${API_BASE}/cases/${caseId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  const list = getLocalCases();
  const caseItem = list.find((c) => c.id === caseId);
  if (!caseItem) throw new Error(`Case #${caseId} not found`);

  const actionRecord = {
    id: Date.now(),
    action: payload.action,
    disagree_reason: payload.disagree_reason,
    clinical_notes: payload.clinical_notes,
    reprioritized_tier: payload.reprioritized_tier,
    clinician_id: payload.clinician_id || 'DR-ATTENDING-DEFAULT',
    recorded_at: new Date().toISOString()
  };

  caseItem.actions.push(actionRecord);
  if (payload.action === 'AGREE' || payload.action === 'DISAGREE') {
    caseItem.status = 'actioned';
  } else if (payload.action === 'DEFER') {
    caseItem.status = 'in_review';
  }

  if (payload.reprioritized_tier) {
    caseItem.priority_tier = payload.reprioritized_tier;
  }

  saveLocalCases(list);

  // Append to local audit
  const auditList = getLocalAudit();
  auditList.unshift({
    id: Date.now(),
    case_id: caseItem.id,
    accession_number: caseItem.accession_number,
    event_type: `CLINICIAN_${payload.action}`,
    actor: actionRecord.clinician_id,
    details_json: JSON.stringify(payload),
    created_at: new Date().toISOString()
  });
  saveLocalAudit(auditList);

  return caseItem;
}

export async function fetchTransparency(): Promise<ModelTransparency[]> {
  try {
    const res = await fetch(`${API_BASE}/transparency`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  return seedData.transparency;
}

export async function fetchAuditLog(params?: { case_id?: number; event_type?: string }): Promise<AuditLogEntry[]> {
  try {
    const query = new URLSearchParams();
    if (params?.case_id) query.set('case_id', String(params.case_id));
    if (params?.event_type) query.set('event_type', params.event_type);

    const res = await fetch(`${API_BASE}/audit?${query.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  let list = getLocalAudit();
  if (params?.case_id) list = list.filter((a) => a.case_id === params.case_id);
  if (params?.event_type) list = list.filter((a) => a.event_type === params.event_type);
  return list;
}

export async function ingestRadiograph(formData: FormData): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/ingest/image`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  // Local fallback: pick a demo case
  const list = getLocalCases();
  return { case_id: list[0].id };
}

export async function ingestTabularData(payload: any): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/ingest/tabular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  const list = getLocalCases();
  return { case_id: list[22]?.id || list[0].id };
}
