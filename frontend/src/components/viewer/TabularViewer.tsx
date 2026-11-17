import React from 'react';
import { ShapWaterfall } from './ShapWaterfall';
import { ShapFeature } from '../../types';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TabularViewerProps {
  tabularData?: Record<string, any>;
  shapFeatures?: ShapFeature[];
  isLowQuality?: boolean;
  lowQualityReason?: string;
}

export const TabularViewer: React.FC<TabularViewerProps> = ({
  tabularData,
  shapFeatures,
  isLowQuality,
  lowQualityReason
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-bg-primary overflow-y-auto p-4 space-y-5 border-r border-border-subtle">
      {/* Degraded / OOD Alert */}
      {isLowQuality && (
        <div className="bg-quality-alert-bg border border-quality-alert-border text-quality-alert-fg p-3 rounded-xs text-xs font-mono space-y-1">
          <div className="flex items-center space-x-1.5 font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>OUT-OF-DISTRIBUTION PHYSIOLOGIC VARIANCE</span>
          </div>
          <p className="text-2xs text-text-secondary">
            {lowQualityReason || 'Vital signs or lab results fall outside physiological bounds. Immediate specimen redraw or manual bedside verification required.'}
          </p>
        </div>
      )}

      {/* Primary Measured Vitals & Lab Matrix */}
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-border-subtle pb-1.5 text-text-muted text-2xs font-mono">
          <span className="font-semibold uppercase tracking-wider text-text-primary font-sans text-xs">
            Measured Physiological & Lab Profile
          </span>
          <span>STANDARD METRIC UNITS</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {shapFeatures && shapFeatures.length > 0 ? (
            shapFeatures.map((item) => (
              <div
                key={item.feature}
                className={`p-2.5 rounded-xs border transition-colors ${
                  item.is_abnormal
                    ? 'bg-urgency-high-bg/50 border-urgency-high-border/70 text-text-primary'
                    : 'bg-bg-secondary border-border-subtle text-text-secondary'
                }`}
              >
                <div className="flex items-center justify-between text-2xs text-text-muted font-mono mb-1">
                  <span>{item.label}</span>
                  {item.is_abnormal && (
                    <span className="text-urgency-high-fg font-bold text-[9px] uppercase px-1 bg-bg-tertiary rounded-xs">
                      FLAGGED
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-base font-bold text-text-primary">
                    {item.value} <span className="text-2xs font-normal text-text-muted">{item.unit}</span>
                  </span>
                  <span className="text-[10px] text-text-muted">
                    Ref: {item.reference_range}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-text-muted font-mono text-2xs p-4 text-center">
              No raw tabular parameters available.
            </div>
          )}
        </div>
      </div>

      {/* SHAP Feature Waterfall Explanation */}
      {shapFeatures && shapFeatures.length > 0 && (
        <div className="bg-bg-secondary p-3.5 rounded-xs border border-border-subtle">
          <ShapWaterfall features={shapFeatures} />
        </div>
      )}
    </div>
  );
};
