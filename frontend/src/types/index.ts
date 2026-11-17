export type Modality = 'imaging_cxr' | 'tabular_clinical';
export type UrgencyTier = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'ROUTINE';
export type CaseStatus = 'unreviewed' | 'in_review' | 'actioned';
export type ActionType = 'AGREE' | 'DISAGREE' | 'DEFER' | 'REPRIORITIZE';

export interface ShapFeature {
  feature: string;
  label: string;
  value: number;
  unit: string;
  reference_range: string;
  is_abnormal: boolean;
  shap_impact: number;
  direction: 'INCREASES_RISK' | 'DECREASES_RISK';
}

export interface Finding {
  id?: number;
  finding_name: string;
  calibrated_prob: number;
  ci_lower: number;
  ci_upper: number;
  severity_weight: number;
  is_primary: boolean;
  clinical_rationale?: string;
  anatomic_locus?: string;
  heatmap_path?: string;
  shap_features?: ShapFeature[];
}

export interface ClinicianAction {
  id?: number;
  action: ActionType;
  disagree_reason?: string;
  clinical_notes?: string;
  reprioritized_tier?: UrgencyTier;
  clinician_id: string;
  recorded_at: string;
}

export interface TriageBreakdown {
  calibrated_probability: number;
  probability_weight: number;
  weighted_probability_points: number;

  severity_finding: string;
  severity_value: number;
  severity_weight: number;
  weighted_severity_points: number;

  ci_range: [number, number];
  uncertainty_width: number;
  uncertainty_weight: number;
  weighted_uncertainty_points: number;

  patient_risk_factor: number;
  patient_risk_weight: number;
  weighted_risk_points: number;

  quality_penalty: number;
  base_score_pre_penalty: number;
  final_score: number;
}

export interface CaseSummary {
  id: number;
  accession_number: string;
  patient_display_id: string;
  modality: Modality;
  age?: number;
  sex?: string;
  clinical_history?: string;
  study_datetime: string;
  ingested_at: string;
  status: CaseStatus;
  priority_score: number;
  priority_tier: UrgencyTier;
  tier_glyph: string;
  primary_finding: string;
  calibrated_prob: number;
  ci_lower: number;
  ci_upper: number;
  is_uncertain: boolean;
  is_low_quality: boolean;
  low_quality_reason?: string;
}

export interface CaseDetail extends CaseSummary {
  image_url?: string;
  heatmap_url?: string;
  tabular_data?: Record<string, any>;
  triage_breakdown?: TriageBreakdown;
  findings: Finding[];
  actions: ClinicianAction[];
}

export interface CalibrationPoint {
  bin_mid: number;
  observed_prob: number;
  sample_count: number;
}

export interface RocPoint {
  fpr: number;
  tpr: number;
  threshold: number;
}

export interface SubgroupMetric {
  subgroup: string;
  sample_size: number;
  auroc: number;
  sensitivity: number;
  specificity: number;
  brier_score: number;
}

export interface ModelTransparency {
  model_name: string;
  model_version: string;
  modality: Modality;
  intended_use: string;
  contraindications: string[];
  training_cohort_description: string;
  validation_cohort_size: number;
  overall_auroc: number;
  overall_sensitivity: number;
  overall_specificity: number;
  expected_calibration_error: number;
  brier_score: number;
  calibration_curve: CalibrationPoint[];
  roc_curve: RocPoint[];
  subgroup_metrics: SubgroupMetric[];
  known_limitations: string[];
  is_mock: boolean;
}

export interface AuditLogEntry {
  id: number;
  case_id?: number;
  accession_number?: string;
  event_type: string;
  actor: string;
  details_json: string;
  created_at: string;
}
