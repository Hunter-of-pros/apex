import React from 'react';
import { RocPoint } from '../../types';

interface RocCurvePlotProps {
  data: RocPoint[];
  auroc: number;
  sensitivity: number;
  specificity: number;
}

export const RocCurvePlot: React.FC<RocCurvePlotProps> = ({
  data,
  auroc,
  sensitivity,
  specificity
}) => {
  const width = 340;
  const height = 240;
  const padding = 36;
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;

  const scaleX = (val: number) => padding + val * plotW;
  const scaleY = (val: number) => height - padding - val * plotH;

  const points = [...data].sort((a, b) => a.fpr - b.fpr);

  // Operating point coordinates: (FPR = 1 - Specificity, TPR = Sensitivity)
  const opX = scaleX(1 - specificity);
  const opY = scaleY(sensitivity);

  return (
    <div className="bg-bg-secondary p-3.5 rounded-xs border border-border-subtle space-y-2">
      <div className="flex items-center justify-between border-b border-border-subtle pb-1 text-2xs font-mono">
        <span className="font-semibold uppercase tracking-wider text-text-primary font-sans text-xs">
          Receiver Operating Characteristic (ROC)
        </span>
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="px-1.5 py-0.2 bg-bg-tertiary border border-border-subtle rounded-xs">
            AUROC: <strong className="text-emerald-400">{auroc.toFixed(3)}</strong>
          </span>
          <span className="px-1.5 py-0.2 bg-bg-tertiary border border-border-subtle rounded-xs">
            Sens: <strong className="text-text-primary">{(sensitivity * 100).toFixed(1)}%</strong>
          </span>
        </div>
      </div>

      <div className="flex justify-center select-none">
        <svg width={width} height={height} className="overflow-visible font-mono text-[9px]">
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1.0].map((tick) => (
            <g key={tick}>
              <line
                x1={scaleX(tick)}
                y1={scaleY(0)}
                x2={scaleX(tick)}
                y2={scaleY(1)}
                stroke="#1c202a"
                strokeWidth="1"
              />
              <line
                x1={scaleX(0)}
                y1={scaleY(tick)}
                x2={scaleX(1)}
                y2={scaleY(tick)}
                stroke="#1c202a"
                strokeWidth="1"
              />
              <text x={scaleX(tick)} y={height - padding + 14} fill="#626e85" textAnchor="middle">
                {tick.toFixed(2)}
              </text>
              <text x={padding - 8} y={scaleY(tick) + 3} fill="#626e85" textAnchor="end">
                {tick.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Random Baseline (Chance Line) */}
          <line
            x1={scaleX(0)}
            y1={scaleY(0)}
            x2={scaleX(1)}
            y2={scaleY(1)}
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Axes */}
          <line
            x1={scaleX(0)}
            y1={scaleY(0)}
            x2={scaleX(1)}
            y2={scaleY(0)}
            stroke="#374154"
            strokeWidth="1.5"
          />
          <line
            x1={scaleX(0)}
            y1={scaleY(0)}
            x2={scaleX(0)}
            y2={scaleY(1)}
            stroke="#374154"
            strokeWidth="1.5"
          />

          {/* Empirical ROC Curve Line */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            points={points.map((p) => `${scaleX(p.fpr)},${scaleY(p.tpr)}`).join(' ')}
          />

          {/* Selected Operating Point Marker */}
          <circle
            cx={opX}
            cy={opY}
            r="5"
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <text
            x={opX + 8}
            y={opY + 3}
            fill="#f1f3f7"
            className="font-bold text-[9px]"
          >
            Operating Pt (Sens: {sensitivity.toFixed(2)}, Spec: {specificity.toFixed(2)})
          </text>

          {/* Axis Labels */}
          <text
            x={width / 2}
            y={height - 4}
            fill="#9da6b8"
            textAnchor="middle"
            className="font-sans text-[10px]"
          >
            False Positive Rate (1 - Specificity)
          </text>
          <text
            x={-height / 2}
            y={12}
            fill="#9da6b8"
            textAnchor="middle"
            transform="rotate(-90)"
            className="font-sans text-[10px]"
          >
            True Positive Rate (Sensitivity)
          </text>
        </svg>
      </div>

      <p className="text-[10px] text-text-muted font-mono leading-tight">
        Operating point balances statutory sensitivity requirements against worklist fatigue.
      </p>
    </div>
  );
};
