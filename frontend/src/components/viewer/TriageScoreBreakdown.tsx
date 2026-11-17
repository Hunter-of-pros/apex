import React from 'react';
import { TriageBreakdown, UrgencyTier } from '../../types';

interface TriageScoreBreakdownProps {
  breakdown?: TriageBreakdown;
  priorityTier: UrgencyTier;
  tierGlyph: string;
}

export const TriageScoreBreakdown: React.FC<TriageScoreBreakdownProps> = ({
  breakdown,
  priorityTier,
  tierGlyph
}) => {
  if (!breakdown) {
    return (
      <div className="text-text-muted font-mono text-2xs p-3">
        Triage calculation breakdown unavailable.
      </div>
    );
  }

  const tierColors: Record<UrgencyTier, string> = {
    CRITICAL: 'text-urgency-critical-fg bg-urgency-critical-bg border-urgency-critical-border',
    HIGH: 'text-urgency-high-fg bg-urgency-high-bg border-urgency-high-border',
    MODERATE: 'text-urgency-moderate-fg bg-urgency-moderate-bg border-urgency-moderate-border',
    ROUTINE: 'text-urgency-routine-fg bg-urgency-routine-bg border-urgency-routine-border'
  };

  return (
    <div className="bg-bg-secondary p-3.5 rounded-xs border border-border-subtle space-y-3 font-mono text-2xs">
      {/* Header and Composite Score */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-2">
        <div className="space-y-0.5">
          <span className="font-semibold uppercase tracking-wider text-text-primary font-sans text-xs">
            Triage Prioritization Breakdown
          </span>
          <p className="text-[10px] text-text-muted font-sans">
            Configurable weighted multi-factor ranking formula
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-base font-bold text-text-primary">
            {breakdown.final_score.toFixed(1)} <span className="text-2xs text-text-muted">/ 100</span>
          </span>
          <span
            className={`px-2 py-0.5 rounded-xs border font-semibold flex items-center space-x-1 ${
              tierColors[priorityTier] || tierColors.ROUTINE
            }`}
          >
            <span>{tierGlyph}</span>
            <span>{priorityTier}</span>
          </span>
        </div>
      </div>

      {/* Component Grid */}
      <div className="grid grid-cols-2 gap-2 text-2xs">
        {/* Probability Component */}
        <div className="p-2 bg-bg-primary rounded-xs border border-border-subtle space-y-1">
          <div className="flex justify-between text-text-muted">
            <span>Calibrated Prob</span>
            <span>w={breakdown.probability_weight}</span>
          </div>
          <div className="flex justify-between items-baseline font-bold text-text-primary">
            <span>{(breakdown.calibrated_probability * 100).toFixed(1)}%</span>
            <span className="text-accent">+{breakdown.weighted_probability_points.toFixed(1)} pts</span>
          </div>
        </div>

        {/* Severity Component */}
        <div className="p-2 bg-bg-primary rounded-xs border border-border-subtle space-y-1">
          <div className="flex justify-between text-text-muted">
            <span>Clinical Gravity</span>
            <span>w={breakdown.severity_weight}</span>
          </div>
          <div className="flex justify-between items-baseline font-bold text-text-primary">
            <span className="truncate max-w-[90px]">{breakdown.severity_finding}</span>
            <span className="text-accent">+{breakdown.weighted_severity_points.toFixed(1)} pts</span>
          </div>
        </div>

        {/* Epistemic Uncertainty Component */}
        <div className="p-2 bg-bg-primary rounded-xs border border-border-subtle space-y-1">
          <div className="flex justify-between text-text-muted">
            <span>Uncertainty Width</span>
            <span>w={breakdown.uncertainty_weight}</span>
          </div>
          <div className="flex justify-between items-baseline font-bold text-text-primary">
            <span>Δ {breakdown.uncertainty_width.toFixed(2)}</span>
            <span className="text-accent">+{breakdown.weighted_uncertainty_points.toFixed(1)} pts</span>
          </div>
        </div>

        {/* Patient Baseline Risk Component */}
        <div className="p-2 bg-bg-primary rounded-xs border border-border-subtle space-y-1">
          <div className="flex justify-between text-text-muted">
            <span>Patient Risk Factor</span>
            <span>w={breakdown.patient_risk_weight}</span>
          </div>
          <div className="flex justify-between items-baseline font-bold text-text-primary">
            <span>R = {breakdown.patient_risk_factor.toFixed(2)}</span>
            <span className="text-accent">+{breakdown.weighted_risk_points.toFixed(1)} pts</span>
          </div>
        </div>
      </div>

      {/* Quality Penalty if Applicable */}
      {breakdown.quality_penalty > 0 && (
        <div className="flex items-center justify-between p-2 bg-quality-alert-bg border border-quality-alert-border text-quality-alert-fg rounded-xs">
          <span>Degraded Input Quality Override:</span>
          <span className="font-bold">+{breakdown.quality_penalty.toFixed(1)} pts (Forced Elevation)</span>
        </div>
      )}
    </div>
  );
};
