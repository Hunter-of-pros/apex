import React, { useState, useEffect, useCallback } from 'react';
import {
  CaseSummary,
  CaseDetail,
  ModelTransparency,
  AuditLogEntry,
  ActionType,
  UrgencyTier
} from './types';
import {
  fetchCases,
  fetchCaseDetail,
  recordClinicianAction,
  fetchTransparency,
  fetchAuditLog
} from './api/client';
import { SafetyBanner } from './components/layout/SafetyBanner';
import { Header } from './components/layout/Header';
import { WorklistView } from './components/worklist/WorklistView';
import { CaseDetailView } from './components/viewer/CaseDetailView';
import { TransparencyView } from './components/transparency/TransparencyView';
import { AuditLogView } from './components/audit/AuditLogView';
import { ShortcutHUD } from './components/worklist/ShortcutHUD';
import { IngestModal } from './components/ingest/IngestModal';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'worklist' | 'case' | 'transparency' | 'audit'>('worklist');
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [activeCaseDetail, setActiveCaseDetail] = useState<CaseDetail | null>(null);
  const [transparencyData, setTransparencyData] = useState<ModelTransparency[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingTransparency, setLoadingTransparency] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [ingestModalOpen, setIngestModalOpen] = useState(false);

  // Load Worklist Cases
  const loadCases = useCallback(async () => {
    try {
      setLoadingCases(true);
      const data = await fetchCases();
      setCases(data);
      if (data.length > 0 && selectedCaseId === null) {
        setSelectedCaseId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load worklist cases:', err);
    } finally {
      setLoadingCases(false);
    }
  }, [selectedCaseId]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // Load Single Case Detail
  const loadCaseDetail = useCallback(async (caseId: number) => {
    try {
      setLoadingDetail(true);
      const detail = await fetchCaseDetail(caseId);
      setActiveCaseDetail(detail);
      setSelectedCaseId(caseId);
      setCurrentView('case');
    } catch (err) {
      console.error(`Failed to load case #${caseId}:`, err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // Load Transparency
  const loadTransparencyData = useCallback(async () => {
    try {
      setLoadingTransparency(true);
      const data = await fetchTransparency();
      setTransparencyData(data);
    } catch (err) {
      console.error('Failed to load transparency metrics:', err);
    } finally {
      setLoadingTransparency(false);
    }
  }, []);

  // Load Audit Trail
  const loadAuditLogs = useCallback(async () => {
    try {
      setLoadingAudit(true);
      const data = await fetchAuditLog();
      setAuditLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  // Navigation Handler
  const handleNavigate = (view: 'worklist' | 'case' | 'transparency' | 'audit') => {
    setCurrentView(view);
    if (view === 'transparency') loadTransparencyData();
    if (view === 'audit') loadAuditLogs();
    if (view === 'worklist') loadCases();
  };

  // Open Case
  const handleOpenCase = (c: CaseSummary) => {
    loadCaseDetail(c.id);
  };

  // Select Case (in worklist)
  const handleSelectCase = (c: CaseSummary) => {
    setSelectedCaseId(c.id);
  };

  // Next Case
  const handleNextCase = () => {
    if (cases.length === 0 || selectedCaseId === null) return;
    const currentIndex = cases.findIndex((c) => c.id === selectedCaseId);
    const nextIndex = currentIndex < cases.length - 1 ? currentIndex + 1 : 0;
    loadCaseDetail(cases[nextIndex].id);
  };

  // Previous Case
  const handlePrevCase = () => {
    if (cases.length === 0 || selectedCaseId === null) return;
    const currentIndex = cases.findIndex((c) => c.id === selectedCaseId);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : cases.length - 1;
    loadCaseDetail(cases[prevIndex].id);
  };

  // Record Clinician Action
  const handleRecordAction = async (payload: {
    action: ActionType;
    disagree_reason?: string;
    clinical_notes?: string;
    reprioritized_tier?: UrgencyTier;
  }) => {
    if (!activeCaseDetail) return;
    const updated = await recordClinicianAction(activeCaseDetail.id, payload);

    // Refresh detail and worklist
    await loadCaseDetail(activeCaseDetail.id);
    await loadCases();
  };

  // Global Key Listener for '?' to toggle Shortcuts HUD
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === '?') {
        setShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-primary text-text-primary">
      {/* 1. Persistent Clinical Safety Perimeter Strip */}
      <SafetyBanner />

      {/* 2. Primary Instrumentation Header */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        caseCount={cases.length}
        activeCaseId={activeCaseDetail ? activeCaseDetail.id : null}
        onOpenIngest={() => setIngestModalOpen(true)}
        onToggleShortcuts={() => setShortcutsOpen(!shortcutsOpen)}
        shortcutsOpen={shortcutsOpen}
      />

      {/* 3. Main Dynamic Content View */}
      <main className="flex-1 flex overflow-hidden">
        {currentView === 'worklist' && (
          <WorklistView
            cases={cases}
            loading={loadingCases}
            selectedCaseId={selectedCaseId}
            onSelectCase={handleSelectCase}
            onOpenCase={handleOpenCase}
          />
        )}

        {currentView === 'case' && activeCaseDetail && (
          <CaseDetailView
            caseData={activeCaseDetail}
            onBack={() => setCurrentView('worklist')}
            onNextCase={handleNextCase}
            onPrevCase={handlePrevCase}
            onRecordAction={handleRecordAction}
          />
        )}

        {currentView === 'transparency' && (
          <TransparencyView
            transparencyData={transparencyData}
            loading={loadingTransparency}
          />
        )}

        {currentView === 'audit' && (
          <AuditLogView
            logs={auditLogs}
            loading={loadingAudit}
          />
        )}
      </main>

      {/* Floating Keyboard Shortcuts Guide */}
      <ShortcutHUD
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* Ingest Study Modal */}
      <IngestModal
        isOpen={ingestModalOpen}
        onClose={() => setIngestModalOpen(false)}
        onIngestSuccess={(newCaseId) => {
          loadCases();
          loadCaseDetail(newCaseId);
        }}
      />
    </div>
  );
};
