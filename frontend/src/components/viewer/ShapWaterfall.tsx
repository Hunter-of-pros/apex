import React from 'react';
import { ShapFeature } from '../../types';

interface ShapWaterfallProps {
  features: ShapFeature[];
}

export const ShapWaterfall: React.FC<ShapWaterfallProps> = ({ features }) => {
  if (!features || features.length === 0) {
    return (
      <div className="text-text-muted font-mono text-2xs p-3">
        No SHAP attribution records available for this study.
      </div>
    );
  }

  // Max absolute impact for scaling
  const maxAbsImpact = Math.max(...features.map((f) => Math.abs(f.shap_impact)), 0.35);

  return (
    <div className="space-y-3 font-mono text-2xs">
      <div className="flex items-center justify-between border-b border-border-subtle pb-1.5 text-text-muted">
        <span className="font-semibold uppercase tracking-wider text-text-primary font-sans text-xs">
          TreeSHAP Attribution Waterfall
        </span>
        <span className="text-[10px]">
          f(x) = E[f(x)] + ∑ φ_i
        </span>
      </div>

      <div className="space-y-2">
        {features.map((feat) => {
          const isPositive = feat.shap_impact > 0;
          const absImpact = Math.abs(feat.shap_impact);
          const barWidthPct = Math.min(100, Math.round((absImpact / maxAbsImpact) * 100));

          return (
            <div key={feat.feature} className="space-y-1 group">
              <div className="flex items-center justify-between text-xs font-sans">
                <div className="flex items-center space-x-1.5">
                  <span className="font-medium text-text-primary">
                    {feat.label}
                  </span>
                  <span className="font-mono text-2xs text-text-muted">
                    ({feat.value} {feat.unit})
                  </span>
                </div>

                <div className="flex items-center space-x-2 font-mono text-2xs">
                  <span className="text-text-muted text-[10px]">
                    Ref: {feat.reference_range}
                  </span>
                  <span
                    className={`font-bold px-1 rounded-xs ${
                      isPositive
                        ? 'text-urgency-critical-fg bg-urgency-critical-bg'
                        : 'text-urgency-moderate-fg bg-urgency-moderate-bg'
                    }`}
                  >
                    {isPositive ? `+${feat.shap_impact.toFixed(3)}` : feat.shap_impact.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Hand-tuned SVG Diverging Attribution Bar */}
              <div className="w-full h-2.5 bg-bg-tertiary flex items-center relative overflow-hidden border border-border-subtle rounded-none">
                {/* Center Baseline (Zero Impact) */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-border-strong z-10" />

                {/* Left Side (Negative/Protective) */}
                {!isPositive && (
                  <div
                    className="absolute top-0 bottom-0 right-1/2 bg-urgency-moderate-border/80 border-l border-urgency-moderate-border"
                    style={{ width: `${barWidthPct / 2}%` }}
                  />
                )}

                {/* Right Side (Positive/Risk Elevating) */}
                {isPositive && (
                  <div
                    className="absolute top-0 bottom-0 left-1/2 bg-urgency-critical-border/80 border-r border-urgency-critical-border"
                    style={{ width: `${barWidthPct / 2}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-[10px] text-text-muted">
        <span className="flex items-center space-x-1">
          <span className="w-2 h-2 rounded-none bg-urgency-moderate-border inline-block" />
          <span>Left: Lowers Risk (Protective)</span>
        </span>
        <span className="flex items-center space-x-1">
          <span className="w-2 h-2 rounded-none bg-urgency-critical-border inline-block" />
          <span>Right: Elevates Risk (Pathologic)</span>
        </span>
      </div>
    </div>
  );
};
