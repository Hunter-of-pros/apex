import React, { useEffect } from 'react';
import { CaseDetail, ActionType, UrgencyTier } from '../../types';
import { PacsViewer } from './PacsViewer';
import { TabularViewer } from './TabularViewer';
import { TriageScoreBreakdown } from './TriageScoreBreakdown';
import { FindingsList } from './FindingsList';
import { ClinicianDeck } from './ClinicianDeck';
import { ArrowLeft, ChevronLeft, ChevronRight, AlertTriangle, ShieldCheck } from 'lucide-react';

interface CaseDetailViewProps {
  caseData: CaseDetail;
  onBack: () => void;
  onNextCase: () => void;
  onPrevCase: () => void;
  onRecordAction: (payload: {
    action: ActionType;
    disagree_reason?: string;
    clinical_notes?: string;
    reprioritized_tier?: UrgencyTier;
  }) => Promise<void>;
}

export const CaseDetailView: React.FC<CaseDetailViewProps> = ({
  caseData,
  onBack,
  onNextCase,
  onPrevCase,
  onRecordAction
}) => {
  // Hotkeys: Esc to back, [ / ] for prev / next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === 'Escape') {
        onBack();
      } else if (e.key === '[') {
        onPrevCase();
      } else if (e.key === ']') {
        onNextCase();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, onNextCase, onPrevCase]);

  // Extract primary finding SHAP features for tabular studies
  const primaryFinding = caseData.findings.find((f) => f.is_primary) || caseData.findings[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-primary overflow-hidden">
      {/* Top Case Inspector Subheader Bar */}
      <div className="bg-bg-secondary border-b border-border-subtle h-11 px-4 flex items-center justify-between text-xs select-none">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1 hover:bg-bg-tertiary rounded-xs text-text-muted hover:text-text-primary border border-border-subtle flex items-center space-x-1"
            title="Return to Worklist (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-mono text-2xs hidden sm:inline">Worklist</span>
          </button>

          <span className="text-border-strong">|</span>

          <div className="flex items-center space-x-2">
            <span className="font-mono font-bold text-text-primary text-sm tracking-tight">
              {caseData.accession_number}
            </span>
            <span className="font-mono text-2xs px-1.5 py-0.2 rounded-xs border border-border-strong text-text-secondary bg-bg-tertiary">
              {caseData.modality === 'imaging_cxr' ? 'CHEST RADIOGRAPH (PA)' : 'CLINICAL LAB PANEL'}
            </span>
          </div>

          <span className="text-border-subtle">•</span>

          <div className="font-mono text-2xs text-text-secondary hidden md:flex items-center space-x-2">
            <span>PT: <strong className="text-text-primary">{caseData.patient_display_id}</strong></span>
            <span>({caseData.age ? `${caseData.age}y` : '—'}, {caseData.sex || '—'})</span>
          </div>
        </div>

        {/* Clinical History & Navigation Pagers */}
        <div className="flex items-center space-x-2">
          {caseData.clinical_history && (
            <span
              className="text-text-muted font-sans text-2xs truncate max-w-[280px] hidden lg:inline-block"
              title={caseData.clinical_history}
            >
              Hx: {caseData.clinical_history}
            </span>
          )}

          <div className="flex items-center space-x-1 font-mono text-2xs">
            <button
              onClick={onPrevCase}
              className="px-2 py-1 bg-bg-primary hover:bg-bg-tertiary border border-border-subtle rounded-xs text-text-secondary hover:text-text-primary"
              title="Previous Case ([)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onNextCase}
              className="px-2 py-1 bg-bg-primary hover:bg-bg-tertiary border border-border-subtle rounded-xs text-text-secondary hover:text-text-primary"
              title="Next Case (])"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Viewer (PACS / Tabular) & Right Decision Support Deck */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left / Center Viewport */}
        <div className="flex-1 h-full overflow-hidden flex flex-col">
          {caseData.modality === 'imaging_cxr' ? (
            <PacsViewer
              imageUrl={caseData.image_url}
              heatmapUrl={caseData.heatmap_url}
              isLowQuality={caseData.is_low_quality}
              lowQualityReason={caseData.low_quality_reason}
            />
          ) : (
            <TabularViewer
              tabularData={caseData.tabular_data}
              shapFeatures={primaryFinding?.shap_features}
              isLowQuality={caseData.is_low_quality}
              lowQualityReason={caseData.low_quality_reason}
            />
          )}
        </div>

        {/* Right Decision Support Panel */}
        <div className="w-full lg:w-[440px] xl:w-[480px] h-full overflow-y-auto bg-bg-primary p-3.5 space-y-4 border-l border-border-subtle">
          {/* Triage Prioritization Mathematical Breakdown */}
          <TriageScoreBreakdown
            breakdown={caseData.triage_breakdown}
            priorityTier={caseData.priority_tier}
            tierGlyph={caseData.tier_glyph}
          />

          {/* Calibrated Pathology Findings & Confidence Intervals */}
          <FindingsList findings={caseData.findings} />

          {/* Clinician Disposition Action Deck */}
          <ClinicianDeck
            caseId={caseData.id}
            currentTier={caseData.priority_tier}
            actions={caseData.actions}
            onRecordAction={onRecordAction}
          />
        </div>
      </div>
    </div>
  );
};
