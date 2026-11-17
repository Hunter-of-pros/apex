import React from 'react';
import { CaseSummary, UrgencyTier } from '../../types';
import { AlertTriangle, Clock } from 'lucide-react';

interface WorklistRowProps {
  caseItem: CaseSummary;
  isSelected: boolean;
  onSelect: (c: CaseSummary) => void;
  onOpen: (c: CaseSummary) => void;
}

export const WorklistRow: React.FC<WorklistRowProps> = ({
  caseItem,
  isSelected,
  onSelect,
  onOpen
}) => {
  // Format elapsed time
  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.max(1, Math.floor(diffMs / 60000));
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch {
      return 'recent';
    }
  };

  // Urgency styling tokens
  const tierConfig: Record<UrgencyTier, { glyph: string; fg: string; bg: string; border: string }> = {
    CRITICAL: {
      glyph: '◆',
      fg: 'text-urgency-critical-fg',
      bg: 'bg-urgency-critical-bg',
      border: 'border-urgency-critical-border'
    },
    HIGH: {
      glyph: '▲',
      fg: 'text-urgency-high-fg',
      bg: 'bg-urgency-high-bg',
      border: 'border-urgency-high-border'
    },
    MODERATE: {
      glyph: '■',
      fg: 'text-urgency-moderate-fg',
      bg: 'bg-urgency-moderate-bg',
      border: 'border-urgency-moderate-border'
    },
    ROUTINE: {
      glyph: '●',
      fg: 'text-urgency-routine-fg',
      bg: 'bg-urgency-routine-bg',
      border: 'border-urgency-routine-border'
    }
  };

  const currentTier = tierConfig[caseItem.priority_tier] || tierConfig.ROUTINE;

  // Confidence Interval bar dimensions
  const ciLeftPct = Math.max(0, Math.min(100, Math.round(caseItem.ci_lower * 100)));
  const ciRightPct = Math.max(0, Math.min(100, Math.round(caseItem.ci_upper * 100)));
  const ciWidthPct = Math.max(3, ciRightPct - ciLeftPct);
  const pointPct = Math.max(0, Math.min(100, Math.round(caseItem.calibrated_prob * 100)));

  return (
    <tr
      onClick={() => onSelect(caseItem)}
      onDoubleClick={() => onOpen(caseItem)}
      className={`border-b border-border-subtle cursor-pointer select-none transition-colors text-xs ${
        isSelected
          ? 'bg-bg-elevated/70 ring-1 ring-inset ring-accent/40'
          : 'hover:bg-bg-secondary/80 bg-bg-primary'
      }`}
    >
      {/* 1. Urgency Tier Badge */}
      <td className="py-2 px-3 whitespace-nowrap">
        <div className="flex items-center space-x-1.5">
          <span className={`text-[11px] font-bold ${currentTier.fg}`}>
            {currentTier.glyph}
          </span>
          <span
            className={`font-mono text-2xs font-semibold px-1.5 py-0.5 rounded-xs border uppercase tracking-wider ${currentTier.bg} ${currentTier.fg} ${currentTier.border}`}
          >
            {caseItem.priority_tier}
          </span>
          <span className="font-mono text-2xs text-text-muted">
            {Math.round(caseItem.priority_score)}
          </span>
        </div>
      </td>

      {/* 2. Accession ID & Modality */}
      <td className="py-2 px-3 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-text-primary font-medium tracking-tight">
            {caseItem.accession_number}
          </span>
          <span
            className={`font-mono text-[9px] px-1 py-0.2 rounded-xs border font-semibold ${
              caseItem.modality === 'imaging_cxr'
                ? 'bg-blue-950/40 text-blue-300 border-blue-800/60'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
            }`}
          >
            {caseItem.modality === 'imaging_cxr' ? 'CXR' : 'TAB'}
          </span>
        </div>
      </td>

      {/* 3. Patient Info */}
      <td className="py-2 px-3 whitespace-nowrap text-text-secondary font-mono text-xs">
        <span>{caseItem.patient_display_id}</span>
        <span className="text-text-muted ml-1.5">
          ({caseItem.age ? `${caseItem.age}y` : '—'}, {caseItem.sex || '—'})
        </span>
      </td>

      {/* 4. Primary Finding & Quality Flag */}
      <td className="py-2 px-3 min-w-[200px]">
        <div className="flex items-center space-x-1.5">
          <span className="font-medium text-text-primary">
            {caseItem.primary_finding}
          </span>

          {caseItem.is_low_quality && (
            <span
              className="inline-flex items-center space-x-0.5 text-2xs px-1.5 py-0.2 bg-quality-alert-bg text-quality-alert-fg border border-quality-alert-border rounded-xs font-mono"
              title={caseItem.low_quality_reason || 'Degraded acquisition quality'}
            >
              <span>⚑</span>
              <span>DEGRADED</span>
            </span>
          )}

          {caseItem.is_uncertain && !caseItem.is_low_quality && (
            <span
              className="text-2xs px-1 py-0.2 bg-amber-950/30 text-amber-300 border border-amber-800/50 rounded-xs font-mono"
              title="Wide confidence interval - manual verification suggested"
            >
              UNCERTAIN
            </span>
          )}
        </div>
      </td>

      {/* 5. Calibrated Probability & 95% Confidence Interval Bar */}
      <td className="py-2 px-3 min-w-[190px]">
        <div className="space-y-1">
          <div className="flex items-center justify-between font-mono text-2xs text-text-secondary">
            <span className="font-semibold text-text-primary">
              {caseItem.calibrated_prob.toFixed(2)}
            </span>
            <span className="text-text-muted text-[10px]">
              [{caseItem.ci_lower.toFixed(2)} — {caseItem.ci_upper.toFixed(2)}]
            </span>
          </div>

          {/* Graphical CI Interval Bar */}
          <div className="w-full h-1.5 bg-bg-tertiary rounded-none relative overflow-hidden border border-border-subtle">
            {/* Interval Band */}
            <div
              className="absolute top-0 bottom-0 bg-accent/30 border-x border-accent"
              style={{ left: `${ciLeftPct}%`, width: `${ciWidthPct}%` }}
            />
            {/* Calibrated Point Marker */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white -ml-0.5"
              style={{ left: `${pointPct}%` }}
            />
          </div>
        </div>
      </td>

      {/* 6. Ingest Timestamp */}
      <td className="py-2 px-3 whitespace-nowrap text-text-muted font-mono text-2xs">
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3 text-text-muted" />
          <span>{formatTimeAgo(caseItem.ingested_at)}</span>
        </div>
      </td>

      {/* 7. Clinician Review Status */}
      <td className="py-2 px-3 whitespace-nowrap text-right">
        <span
          className={`font-mono text-2xs px-2 py-0.5 rounded-xs border font-medium ${
            caseItem.status === 'actioned'
              ? 'bg-emerald-950/30 text-emerald-300 border-emerald-800/60'
              : caseItem.status === 'in_review'
              ? 'bg-amber-950/30 text-amber-300 border-amber-800/60'
              : 'bg-bg-tertiary text-text-muted border-border-subtle'
          }`}
        >
          {caseItem.status === 'actioned'
            ? 'ACTIONED'
            : caseItem.status === 'in_review'
            ? 'IN REVIEW'
            : 'UNREVIEWED'}
        </span>
      </td>
    </tr>
  );
};
