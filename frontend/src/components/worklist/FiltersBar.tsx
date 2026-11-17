import React from 'react';
import { Search, Filter, AlertTriangle, Layers } from 'lucide-react';
import { Modality, UrgencyTier, CaseStatus } from '../../types';

interface FiltersBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  modality: string;
  onModalityChange: (val: string) => void;
  tier: string;
  onTierChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  onlyLowQuality: boolean;
  onToggleLowQuality: () => void;
  sortBy: string;
  onSortByChange: (val: string) => void;
  counts: {
    total: number;
    critical: number;
    high: number;
    unreviewed: number;
    lowQuality: number;
  };
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  search,
  onSearchChange,
  modality,
  onModalityChange,
  tier,
  onTierChange,
  status,
  onStatusChange,
  onlyLowQuality,
  onToggleLowQuality,
  sortBy,
  onSortByChange,
  counts
}) => {
  return (
    <div className="bg-bg-secondary border-b border-border-subtle p-3 space-y-2.5">
      {/* Top Row: Search and Modality Segments */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by Accession ID, Patient ID, or Finding... (/)"
            className="w-full bg-bg-primary border border-border-subtle rounded-xs pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-border-focus font-mono"
          />
        </div>

        {/* Modality Filter */}
        <div className="flex items-center space-x-1 bg-bg-primary p-0.5 rounded-xs border border-border-subtle">
          {[
            { id: '', label: 'All Modalities' },
            { id: 'imaging_cxr', label: 'CXR Radiographs' },
            { id: 'tabular_clinical', label: 'Clinical Panels' }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => onModalityChange(m.id)}
              className={`px-2.5 py-1 text-2xs font-medium rounded-xs transition-colors ${
                modality === m.id
                  ? 'bg-bg-elevated text-text-primary border border-border-strong'
                  : 'text-text-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center space-x-2 text-2xs font-mono text-text-muted">
          <span>SORT:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="bg-bg-primary border border-border-subtle rounded-xs px-2 py-1 text-xs text-text-secondary font-mono focus:border-border-focus"
          >
            <option value="priority">Priority Rank (Calibrated)</option>
            <option value="time">Ingestion Timestamp</option>
            <option value="confidence">Calibrated Probability</option>
          </select>
        </div>
      </div>

      {/* Bottom Row: Urgency Tiers, Status, and Quality Alert Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-subtle/50 text-2xs">
        {/* Urgency Filter Pills */}
        <div className="flex items-center space-x-1.5">
          <span className="font-mono text-text-muted uppercase tracking-wider mr-1">Urgency:</span>
          {[
            { id: '', label: 'All', glyph: '', count: counts.total },
            { id: 'CRITICAL', label: 'Critical', glyph: '◆', count: counts.critical, colorClass: 'text-urgency-critical-fg' },
            { id: 'HIGH', label: 'High', glyph: '▲', count: counts.high, colorClass: 'text-urgency-high-fg' },
            { id: 'MODERATE', label: 'Moderate', glyph: '■', count: null, colorClass: 'text-urgency-moderate-fg' },
            { id: 'ROUTINE', label: 'Routine', glyph: '●', count: null, colorClass: 'text-urgency-routine-fg' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => onTierChange(t.id)}
              className={`px-2 py-0.5 rounded-xs font-medium transition-colors flex items-center space-x-1 border ${
                tier === t.id
                  ? 'bg-bg-elevated text-text-primary border-border-strong'
                  : 'bg-bg-primary text-text-secondary border-border-subtle hover:border-border-strong'
              }`}
            >
              {t.glyph && <span className={`${t.colorClass} text-[10px]`}>{t.glyph}</span>}
              <span>{t.label}</span>
              {t.count !== null && t.count > 0 && (
                <span className="font-mono text-[9px] px-1 bg-bg-tertiary rounded-xs text-text-muted">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Status Filter and Quality Toggle */}
        <div className="flex items-center space-x-2">
          {/* Status Segment */}
          <div className="flex items-center space-x-1">
            <span className="font-mono text-text-muted uppercase tracking-wider mr-1">Status:</span>
            {[
              { id: '', label: 'All' },
              { id: 'unreviewed', label: 'Unreviewed', count: counts.unreviewed },
              { id: 'in_review', label: 'In Review' },
              { id: 'actioned', label: 'Actioned' }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => onStatusChange(s.id)}
                className={`px-2 py-0.5 rounded-xs font-medium transition-colors ${
                  status === s.id
                    ? 'bg-bg-elevated text-text-primary border border-border-strong'
                    : 'text-text-secondary hover:text-text-primary border border-transparent'
                }`}
              >
                <span>{s.label}</span>
                {s.count !== undefined && s.count > 0 && (
                  <span className="ml-1 font-mono text-[9px] text-accent">({s.count})</span>
                )}
              </button>
            ))}
          </div>

          <span className="text-border-subtle">|</span>

          {/* Degraded Quality Filter */}
          <button
            onClick={onToggleLowQuality}
            className={`px-2 py-0.5 rounded-xs font-medium transition-colors flex items-center space-x-1 border ${
              onlyLowQuality
                ? 'bg-quality-alert-bg text-quality-alert-fg border-quality-alert-border'
                : 'bg-bg-primary text-text-muted border-border-subtle hover:text-text-secondary'
            }`}
          >
            <span>⚑</span>
            <span>Degraded Quality ({counts.lowQuality})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
