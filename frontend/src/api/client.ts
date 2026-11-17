import { CaseSummary, CaseDetail, ModelTransparency, AuditLogEntry, ActionType, UrgencyTier } from '../types';

const API_BASE = '/api';

export async function fetchCases(params?: {
  modality?: string;
  status?: string;
  priority_tier?: string;
  is_low_quality?: boolean;
  search?: string;
  sort_by?: string;
}): Promise<CaseSummary[]> {
  const query = new URLSearchParams();
  if (params?.modality) query.set('modality', params.modality);
  if (params?.status) query.set('status', params.status);
  if (params?.priority_tier) query.set('priority_tier', params.priority_tier);
  if (params?.is_low_quality !== undefined) query.set('is_low_quality', String(params.is_low_quality));
  if (params?.search) query.set('search', params.search);
  if (params?.sort_by) query.set('sort_by', params.sort_by);

  const res = await fetch(`${API_BASE}/cases?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch worklist cases: ${res.statusText}`);
  return res.json();
}

export async function fetchCaseDetail(caseId: number): Promise<CaseDetail> {
  const res = await fetch(`${API_BASE}/cases/${caseId}`);
  if (!res.ok) throw new Error(`Failed to load case detail #${caseId}`);
  return res.json();
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
  const res = await fetch(`${API_BASE}/cases/${caseId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to record clinician action');
  }
  return res.json();
}

export async function fetchTransparency(): Promise<ModelTransparency[]> {
  const res = await fetch(`${API_BASE}/transparency`);
  if (!res.ok) throw new Error('Failed to fetch model transparency metrics');
  return res.json();
}

export async function fetchAuditLog(params?: { case_id?: number; event_type?: string }): Promise<AuditLogEntry[]> {
  const query = new URLSearchParams();
  if (params?.case_id) query.set('case_id', String(params.case_id));
  if (params?.event_type) query.set('event_type', params.event_type);

  const res = await fetch(`${API_BASE}/audit?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch audit log');
  return res.json();
}

export async function ingestRadiograph(formData: FormData): Promise<any> {
  const res = await fetch(`${API_BASE}/ingest/image`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Radiograph ingestion failed');
  }
  return res.json();
}

export async function ingestTabularData(payload: any): Promise<any> {
  const res = await fetch(`${API_BASE}/ingest/tabular`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Clinical dataset ingestion failed');
  }
  return res.json();
}
