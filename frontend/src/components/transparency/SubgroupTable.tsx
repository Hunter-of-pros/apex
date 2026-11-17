import React from 'react';
import { SubgroupMetric } from '../../types';

interface SubgroupTableProps {
  metrics: SubgroupMetric[];
}

export const SubgroupTable: React.FC<SubgroupTableProps> = ({ metrics }) => {
  return (
    <div className="bg-bg-secondary p-3.5 rounded-xs border border-border-subtle space-y-2.5">
      <div className="flex items-center justify-between border-b border-border-subtle pb-1 text-2xs font-mono text-text-muted">
        <span className="font-semibold uppercase tracking-wider text-text-primary font-sans text-xs">
          Demographic Subgroup Disparity Analysis
        </span>
        <span>HELD-OUT VALIDATION COHORT</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-2xs border-collapse">
          <thead>
            <tr className="border-b border-border-strong text-text-muted uppercase text-[10px]">
              <th className="py-1.5 px-2 font-semibold">Cohort</th>
              <th className="py-1.5 px-2 font-semibold text-right">Sample (N)</th>
              <th className="py-1.5 px-2 font-semibold text-right">AUROC</th>
              <th className="py-1.5 px-2 font-semibold text-right">Sensitivity</th>
              <th className="py-1.5 px-2 font-semibold text-right">Specificity</th>
              <th className="py-1.5 px-2 font-semibold text-right">Brier</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, idx) => (
              <tr
                key={idx}
                className="border-b border-border-subtle/60 hover:bg-bg-tertiary/60 transition-colors"
              >
                <td className="py-2 px-2 font-medium text-text-primary">
                  {m.subgroup}
                </td>
                <td className="py-2 px-2 text-right text-text-secondary">
                  {m.sample_size}
                </td>
                <td className="py-2 px-2 text-right font-bold text-accent">
                  {m.auroc.toFixed(3)}
                </td>
                <td className="py-2 px-2 text-right text-text-primary">
                  {(m.sensitivity * 100).toFixed(1)}%
                </td>
                <td className="py-2 px-2 text-right text-text-primary">
                  {(m.specificity * 100).toFixed(1)}%
                </td>
                <td className="py-2 px-2 text-right text-text-muted">
                  {m.brier_score.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-text-muted font-mono leading-tight">
        Performance gaps are audited for algorithmic fairness. Subgroups with lower sensitivity are flagged to attending clinicians for enhanced vigilance.
      </p>
    </div>
  );
};
