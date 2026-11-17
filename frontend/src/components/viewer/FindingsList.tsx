import React from 'react';
import { Finding } from '../../types';

interface FindingsListProps {
  findings: Finding[];
}

export const FindingsList: React.FC<FindingsListProps> = ({ findings }) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between border-b border-border-subtle pb-1 text-2xs font-mono text-text-muted">
        <span className="font-semibold uppercase tracking-wider text-text-primary font-sans text-xs">
          Calibrated Pathology Probabilities
        </span>
        <span>95% CONFIDENCE INTERVALS</span>
      </div>

      <div className="space-y-2">
        {findings.map((f) => {
          const ciLeft = Math.max(0, Math.min(100, Math.round(f.ci_lower * 100)));
          const ciRight = Math.max(0, Math.min(100, Math.round(f.ci_upper * 100)));
          const ciWidth = Math.max(3, ciRight - ciLeft);
          const point = Math.max(0, Math.min(100, Math.round(f.calibrated_prob * 100)));

          return (
            <div
              key={f.finding_name}
              className={`p-2.5 rounded-xs border transition-colors ${
                f.is_primary
                  ? 'bg-bg-secondary border-accent/60 ring-1 ring-accent/30'
                  : 'bg-bg-primary border-border-subtle hover:border-border-strong'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-text-primary font-sans">
                    {f.finding_name}
                  </span>
                  {f.is_primary && (
                    <span className="font-mono text-[9px] px-1 py-0.2 rounded-xs bg-accent text-white font-bold uppercase tracking-wider">
                      PRIMARY
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1.5 font-mono text-xs">
                  <span className="font-bold text-text-primary">
                    {f.calibrated_prob.toFixed(2)}
                  </span>
                  <span className="text-text-muted text-2xs">
                    [{f.ci_lower.toFixed(2)} — {f.ci_upper.toFixed(2)}]
                  </span>
                </div>
              </div>

              {/* Graphical Confidence Interval Bar */}
              <div className="w-full h-1.5 bg-bg-tertiary rounded-none relative overflow-hidden border border-border-subtle my-1.5">
                <div
                  className="absolute top-0 bottom-0 bg-accent/30 border-x border-accent"
                  style={{ left: `${ciLeft}%`, width: `${ciWidth}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white -ml-0.5"
                  style={{ left: `${point}%` }}
                />
              </div>

              {/* Anatomical Locus and Clinical Rationale */}
              <div className="flex items-center justify-between text-2xs text-text-secondary font-mono mt-1">
                <span className="text-text-muted truncate max-w-[260px]">
                  {f.anatomic_locus && f.anatomic_locus !== 'General thoracic field'
                    ? f.anatomic_locus
                    : f.shap_features && f.shap_features.length > 0
                    ? 'Cardiovascular & Hemodynamic Axis'
                    : 'Bilateral lung fields'}
                </span>
                <span className="text-[10px] text-text-muted">
                  Severity: {f.severity_weight.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
