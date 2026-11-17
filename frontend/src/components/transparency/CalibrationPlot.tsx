import React from 'react';
import { CalibrationPoint } from '../../types';

interface CalibrationPlotProps {
  data: CalibrationPoint[];
  ece: number;
  brierScore: number;
}

export const CalibrationPlot: React.FC<CalibrationPlotProps> = ({
  data,
  ece,
  brierScore
}) => {
  // SVG plot dimensions
  const width = 340;
  const height = 240;
  const padding = 36;
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;

  // Scale functions [0, 1] -> SVG coordinates
  const scaleX = (val: number) => padding + val * plotW;
  const scaleY = (val: number) => height - padding - val * plotH;

  // Sorted calibration points
  const points = [...data].sort((a, b) => a.bin_mid - b.bin_mid);

  return (
    <div className="bg-bg-secondary p-3.5 rounded-xs border border-border-subtle space-y-2">
      <div className="flex items-center justify-between border-b border-border-subtle pb-1 text-2xs font-mono">
        <span className="font-semibold uppercase tracking-wider text-text-primary font-sans text-xs">
          Reliability Calibration Curve
        </span>
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="px-1.5 py-0.2 bg-bg-tertiary border border-border-subtle rounded-xs">
            ECE: <strong className="text-accent">{ece.toFixed(4)}</strong>
          </span>
          <span className="px-1.5 py-0.2 bg-bg-tertiary border border-border-subtle rounded-xs">
            Brier: <strong className="text-text-primary">{brierScore.toFixed(3)}</strong>
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

          {/* Perfect Calibration Diagonal Reference (y = x) */}
          <line
            x1={scaleX(0)}
            y1={scaleY(0)}
            x2={scaleX(1)}
            y2={scaleY(1)}
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Empirical Calibration Curve Line */}
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            points={points
              .map((p) => `${scaleX(p.bin_mid)},${scaleY(p.observed_prob)}`)
              .join(' ')}
          />

          {/* Empirical Points & Sample Counts */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle
                cx={scaleX(p.bin_mid)}
                cy={scaleY(p.observed_prob)}
                r="3.5"
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth="1"
              />
            </g>
          ))}

          {/* Axis Labels */}
          <text
            x={width / 2}
            y={height - 4}
            fill="#9da6b8"
            textAnchor="middle"
            className="font-sans text-[10px]"
          >
            Mean Predicted Probability Decile
          </text>
          <text
            x={-height / 2}
            y={12}
            fill="#9da6b8"
            textAnchor="middle"
            transform="rotate(-90)"
            className="font-sans text-[10px]"
          >
            Observed Empirical Frequency
          </text>
        </svg>
      </div>

      <p className="text-[10px] text-text-muted font-mono leading-tight">
        Reliability diagram evaluates isotonic/temperature calibration. Points close to the dashed 45° diagonal indicate truthful probabilistic estimates.
      </p>
    </div>
  );
};
