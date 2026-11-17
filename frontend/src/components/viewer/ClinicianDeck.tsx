import React, { useState, useEffect } from 'react';
import { ActionType, UrgencyTier, ClinicianAction } from '../../types';
import { CheckCircle2, XCircle, Clock, AlertCircle, Send, Check } from 'lucide-react';

interface ClinicianDeckProps {
  caseId: number;
  currentTier: UrgencyTier;
  actions: ClinicianAction[];
  onRecordAction: (payload: {
    action: ActionType;
    disagree_reason?: string;
    clinical_notes?: string;
    reprioritized_tier?: UrgencyTier;
  }) => Promise<void>;
}

export const ClinicianDeck: React.FC<ClinicianDeckProps> = ({
  caseId,
  currentTier,
  actions,
  onRecordAction
}) => {
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [disagreeReason, setDisagreeReason] = useState('Alternative Diagnosis');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [overrideTier, setOverrideTier] = useState<UrgencyTier | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Keyboard shortcuts 1, 2, 3
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === '1') {
        setSelectedAction('AGREE');
      } else if (e.key === '2') {
        setSelectedAction('DISAGREE');
      } else if (e.key === '3') {
        setSelectedAction('DEFER');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (actionToSubmit?: ActionType) => {
    const act = actionToSubmit || selectedAction;
    if (!act) return;

    if (act === 'DISAGREE' && !disagreeReason.trim()) {
      setErrorMsg('Please specify a clinical justification for disagreement.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onRecordAction({
        action: act,
        disagree_reason: act === 'DISAGREE' ? disagreeReason : undefined,
        clinical_notes: clinicalNotes.trim() || undefined,
        reprioritized_tier: overrideTier || undefined
      });
      setSuccessMsg(`Action '${act}' permanently written to audit trail.`);
      setTimeout(() => setSuccessMsg(null), 3500);
      setClinicalNotes('');
      setSelectedAction(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit clinical decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-bg-secondary p-3.5 rounded-xs border border-border-subtle space-y-3 font-sans">
      <div className="flex items-center justify-between border-b border-border-subtle pb-1.5 text-2xs font-mono text-text-muted">
        <span className="font-semibold uppercase tracking-wider text-text-primary text-xs">
          Attending Clinician Disposition Deck
        </span>
        <span>FINAL CLINICAL AUTHORITY</span>
      </div>

      {/* Action Selector Buttons */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {/* Agree */}
        <button
          onClick={() => {
            setSelectedAction('AGREE');
            handleSubmit('AGREE');
          }}
          disabled={isSubmitting}
          className={`py-2 px-2.5 rounded-xs font-semibold flex items-center justify-center space-x-1.5 border transition-colors ${
            selectedAction === 'AGREE'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-bg-primary text-text-primary border-border-subtle hover:border-emerald-600/70 hover:text-emerald-400'
          }`}
          title="Shortcut [ 1 ]"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>[1] Agree</span>
        </button>

        {/* Disagree */}
        <button
          onClick={() => setSelectedAction('DISAGREE')}
          disabled={isSubmitting}
          className={`py-2 px-2.5 rounded-xs font-semibold flex items-center justify-center space-x-1.5 border transition-colors ${
            selectedAction === 'DISAGREE'
              ? 'bg-red-700 text-white border-red-600'
              : 'bg-bg-primary text-text-primary border-border-subtle hover:border-red-600/70 hover:text-red-400'
          }`}
          title="Shortcut [ 2 ]"
        >
          <XCircle className="w-3.5 h-3.5 text-red-400" />
          <span>[2] Disagree</span>
        </button>

        {/* Defer */}
        <button
          onClick={() => {
            setSelectedAction('DEFER');
            handleSubmit('DEFER');
          }}
          disabled={isSubmitting}
          className={`py-2 px-2.5 rounded-xs font-semibold flex items-center justify-center space-x-1.5 border transition-colors ${
            selectedAction === 'DEFER'
              ? 'bg-amber-600 text-white border-amber-500'
              : 'bg-bg-primary text-text-primary border-border-subtle hover:border-amber-600/70 hover:text-amber-400'
          }`}
          title="Shortcut [ 3 ]"
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>[3] Defer</span>
        </button>
      </div>

      {/* Disagree Mandatory Reason Panel */}
      {selectedAction === 'DISAGREE' && (
        <div className="bg-bg-primary p-3 rounded-xs border border-red-900/60 space-y-2">
          <label className="block text-2xs font-mono font-semibold text-red-400 uppercase tracking-wider">
            Mandatory Disagreement Clinical Reason:
          </label>
          <select
            value={disagreeReason}
            onChange={(e) => setDisagreeReason(e.target.value)}
            className="w-full bg-bg-secondary border border-border-strong rounded-xs p-1.5 text-xs text-text-primary font-mono focus:border-red-500"
          >
            <option value="False Positive">False Positive (No acute pathology observed)</option>
            <option value="Alternative Diagnosis">Alternative Diagnosis (Consolidation is atelectasis, etc.)</option>
            <option value="Overestimated Severity">Overestimated Severity (Chronic stable baseline)</option>
            <option value="Anatomic Variant">Benign Anatomic / Congenital Variant</option>
            <option value="Artifact / Noise">Imaging Motion Artifact / Specimen Hemolysis</option>
            <option value="Other">Other Clinical Rationale (Specify in notes)</option>
          </select>

          <button
            onClick={() => handleSubmit('DISAGREE')}
            disabled={isSubmitting}
            className="w-full py-1.5 text-xs font-semibold bg-red-700 hover:bg-red-600 text-white rounded-xs transition-colors"
          >
            Confirm Disagreement & Log Reason
          </button>
        </div>
      )}

      {/* Manual Tier Override & Impression Notes */}
      <div className="space-y-2 pt-1 border-t border-border-subtle/60 text-2xs font-mono">
        <div className="flex items-center justify-between">
          <span className="text-text-muted">REPRIORITIZE URGENCY TIER:</span>
          <select
            value={overrideTier}
            onChange={(e) => setOverrideTier(e.target.value as UrgencyTier)}
            className="bg-bg-primary border border-border-subtle rounded-xs px-2 py-1 text-xs text-text-secondary focus:border-border-focus"
          >
            <option value="">Keep Model Tier ({currentTier})</option>
            <option value="CRITICAL">Override: CRITICAL (◆)</option>
            <option value="HIGH">Override: HIGH (▲)</option>
            <option value="MODERATE">Override: MODERATE (■)</option>
            <option value="ROUTINE">Override: ROUTINE (●)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-text-muted">CLINICAL IMPRESSION / ATTESTATION NOTES:</label>
          <textarea
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            placeholder="Document rationale, recommended differential, or next steps..."
            rows={2}
            className="w-full bg-bg-primary border border-border-subtle rounded-xs p-2 text-xs text-text-primary placeholder:text-text-muted font-sans focus:border-border-focus"
          />
        </div>

        {clinicalNotes.trim() && (
          <button
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="w-full py-1 text-xs font-semibold bg-accent hover:bg-accent-hover text-white rounded-xs transition-colors flex items-center justify-center space-x-1"
          >
            <Send className="w-3 h-3" />
            <span>Save Note & Log to Audit Ledger</span>
          </button>
        )}
      </div>

      {/* Feedback Alerts */}
      {errorMsg && (
        <div className="p-2 bg-red-950/40 border border-red-800 text-red-300 text-2xs font-mono rounded-xs flex items-center space-x-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-2 bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-2xs font-mono rounded-xs flex items-center space-x-1.5">
          <Check className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Prior Case Actions Ledger */}
      {actions && actions.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border-subtle/60">
          <span className="block text-[10px] font-mono text-text-muted uppercase">
            Logged Actions on this Case ({actions.length}):
          </span>
          <div className="space-y-1 max-h-24 overflow-y-auto font-mono text-2xs">
            {actions.map((a, i) => (
              <div
                key={i}
                className="p-1.5 bg-bg-primary rounded-xs border border-border-subtle flex items-baseline justify-between text-text-secondary"
              >
                <div>
                  <span className="font-bold text-text-primary">{a.action}</span>
                  {a.disagree_reason && (
                    <span className="text-red-400 ml-1.5">({a.disagree_reason})</span>
                  )}
                  {a.clinical_notes && (
                    <p className="font-sans text-[11px] text-text-muted mt-0.5">{a.clinical_notes}</p>
                  )}
                </div>
                <span className="text-[10px] text-text-muted">{a.clinician_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
