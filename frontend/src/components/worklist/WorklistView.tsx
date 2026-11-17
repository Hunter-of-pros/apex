import React, { useState, useEffect, useMemo } from 'react';
import { CaseSummary, Modality, UrgencyTier } from '../../types';
import { FiltersBar } from './FiltersBar';
import { WorklistRow } from './WorklistRow';
import { Activity, ShieldAlert, ArrowUpDown } from 'lucide-react';

interface WorklistViewProps {
  cases: CaseSummary[];
  loading: boolean;
  selectedCaseId: number | null;
  onSelectCase: (c: CaseSummary) => void;
  onOpenCase: (c: CaseSummary) => void;
}

export const WorklistView: React.FC<WorklistViewProps> = ({
  cases,
  loading,
  selectedCaseId,
  onSelectCase,
  onOpenCase
}) => {
  const [search, setSearch] = useState('');
  const [modality, setModality] = useState('');
  const [tier, setTier] = useState('');
  const [status, setStatus] = useState('');
  const [onlyLowQuality, setOnlyLowQuality] = useState(false);
  const [sortBy, setSortBy] = useState('priority');

  // Filter and sort cases locally or via state
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (modality && c.modality !== modality) return false;
      if (tier && c.priority_tier !== tier) return false;
      if (status && c.status !== status) return false;
      if (onlyLowQuality && !c.is_low_quality) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matches =
          c.accession_number.toLowerCase().includes(q) ||
          c.patient_display_id.toLowerCase().includes(q) ||
          c.primary_finding.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'priority') return b.priority_score - a.priority_score;
      if (sortBy === 'time') return new Date(b.ingested_at).getTime() - new Date(a.ingested_at).getTime();
      if (sortBy === 'confidence') return b.calibrated_prob - a.calibrated_prob;
      return 0;
    });
  }, [cases, modality, tier, status, onlyLowQuality, search, sortBy]);

  // Aggregate counts
  const counts = useMemo(() => {
    return {
      total: cases.length,
      critical: cases.filter((c) => c.priority_tier === 'CRITICAL').length,
      high: cases.filter((c) => c.priority_tier === 'HIGH').length,
      unreviewed: cases.filter((c) => c.status === 'unreviewed').length,
      lowQuality: cases.filter((c) => c.is_low_quality).length,
    };
  }, [cases]);

  // Keyboard navigation (J / K / Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredCases.length === 0) return;
        const currentIndex = filteredCases.findIndex((c) => c.id === selectedCaseId);
        const nextIndex = currentIndex < filteredCases.length - 1 ? currentIndex + 1 : 0;
        onSelectCase(filteredCases[nextIndex]);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredCases.length === 0) return;
        const currentIndex = filteredCases.findIndex((c) => c.id === selectedCaseId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredCases.length - 1;
        onSelectCase(filteredCases[prevIndex]);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const active = filteredCases.find((c) => c.id === selectedCaseId);
        if (active) onOpenCase(active);
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCases, selectedCaseId, onSelectCase, onOpenCase]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-primary">
      {/* Top Filter and Search Bar */}
      <FiltersBar
        search={search}
        onSearchChange={setSearch}
        modality={modality}
        onModalityChange={setModality}
        tier={tier}
        onTierChange={setTier}
        status={status}
        onStatusChange={setStatus}
        onlyLowQuality={onlyLowQuality}
        onToggleLowQuality={() => setOnlyLowQuality(!onlyLowQuality)}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        counts={counts}
      />

      {/* Main Table Container */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          {/* Table Header */}
          <thead className="bg-bg-secondary sticky top-0 z-10 border-b border-border-strong text-2xs font-mono uppercase tracking-wider text-text-muted select-none">
            <tr>
              <th className="py-2 px-3 font-semibold w-32">Priority Tier</th>
              <th className="py-2 px-3 font-semibold w-40">Accession / Modality</th>
              <th className="py-2 px-3 font-semibold w-36">Patient / Demographics</th>
              <th className="py-2 px-3 font-semibold">Primary Flagged Finding</th>
              <th className="py-2 px-3 font-semibold w-56">
                Calibrated Prob [95% CI]
              </th>
              <th className="py-2 px-3 font-semibold w-24">Ingested</th>
              <th className="py-2 px-3 font-semibold w-24 text-right">Status</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-text-muted font-mono text-xs">
                  Loading calibrated clinical worklist...
                </td>
              </tr>
            ) : filteredCases.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-text-muted font-mono text-xs">
                  No cases match the active filter criteria.
                </td>
              </tr>
            ) : (
              filteredCases.map((c) => (
                <WorklistRow
                  key={c.id}
                  caseItem={c}
                  isSelected={c.id === selectedCaseId}
                  onSelect={onSelectCase}
                  onOpen={onOpenCase}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Status Bar */}
      <div className="bg-bg-secondary border-t border-border-subtle h-7 px-4 flex items-center justify-between text-2xs font-mono text-text-muted select-none">
        <div className="flex items-center space-x-3">
          <span>
            SHOWING <strong className="text-text-primary">{filteredCases.length}</strong> OF{' '}
            <strong className="text-text-primary">{cases.length}</strong> ACTIVE STUDIES
          </span>
          <span className="text-border-strong">•</span>
          <span>SORTED BY TRIAGE RANK (ASSISTIVE ASSIGNMENT)</span>
        </div>

        <div className="flex items-center space-x-2">
          <span>NAVIGATION:</span>
          <span className="px-1 py-0.2 bg-bg-tertiary border border-border-subtle rounded-xs text-text-secondary">
            J
          </span>
          <span className="px-1 py-0.2 bg-bg-tertiary border border-border-subtle rounded-xs text-text-secondary">
            K
          </span>
          <span>OPEN:</span>
          <span className="px-1 py-0.2 bg-bg-tertiary border border-border-subtle rounded-xs text-text-secondary">
            ENTER
          </span>
        </div>
      </div>
    </div>
  );
};
