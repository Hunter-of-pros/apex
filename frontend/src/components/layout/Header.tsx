import React from 'react';
import { Activity, ShieldCheck, SlidersHorizontal, FileText, UploadCloud, Command, Eye } from 'lucide-react';

interface HeaderProps {
  currentView: 'worklist' | 'case' | 'transparency' | 'audit';
  onNavigate: (view: 'worklist' | 'case' | 'transparency' | 'audit') => void;
  caseCount: number;
  activeCaseId: number | null;
  onOpenIngest: () => void;
  onToggleShortcuts: () => void;
  shortcutsOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  caseCount,
  activeCaseId,
  onOpenIngest,
  onToggleShortcuts,
  shortcutsOpen
}) => {
  return (
    <header className="bg-bg-primary border-b border-border-subtle h-12 px-4 flex items-center justify-between select-none">
      {/* Brand & Instrumentation Identity */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-xs bg-accent flex items-center justify-center text-white font-mono text-xs font-bold shadow-none">
            M
          </div>
          <span className="font-sans font-bold tracking-tight text-sm text-text-primary">
            MERIDIAN <span className="font-mono font-medium text-text-muted text-xs">CDS</span>
          </span>
        </div>

        <span className="text-border-strong">/</span>

        <span className="text-2xs font-mono text-text-muted hidden md:inline-block">
          WORKSTATION v1.0.4 • DUAL MODALITY
        </span>
      </div>

      {/* Primary Navigation Tabs */}
      <nav className="flex items-center space-x-1">
        <button
          onClick={() => onNavigate('worklist')}
          className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors flex items-center space-x-1.5 ${
            currentView === 'worklist'
              ? 'bg-bg-elevated text-text-primary border border-border-strong'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary border border-transparent'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Worklist</span>
          <span className="font-mono text-2xs px-1.5 py-0.2 bg-bg-tertiary text-text-muted rounded-xs border border-border-subtle">
            {caseCount}
          </span>
        </button>

        {activeCaseId && (
          <button
            onClick={() => onNavigate('case')}
            className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors flex items-center space-x-1.5 ${
              currentView === 'case'
                ? 'bg-bg-elevated text-text-primary border border-border-strong'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary border border-transparent'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-accent" />
            <span>Case #{activeCaseId}</span>
          </button>
        )}

        <button
          onClick={() => onNavigate('transparency')}
          className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors flex items-center space-x-1.5 ${
            currentView === 'transparency'
              ? 'bg-bg-elevated text-text-primary border border-border-strong'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary border border-transparent'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Model Transparency & Card</span>
        </button>

        <button
          onClick={() => onNavigate('audit')}
          className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors flex items-center space-x-1.5 ${
            currentView === 'audit'
              ? 'bg-bg-elevated text-text-primary border border-border-strong'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary border border-transparent'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Audit Ledger</span>
        </button>
      </nav>

      {/* Global Actions */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onToggleShortcuts}
          className={`px-2 py-1 text-2xs font-mono rounded-xs border transition-colors flex items-center space-x-1 ${
            shortcutsOpen
              ? 'bg-accent-subtle text-accent border-accent'
              : 'bg-bg-secondary text-text-muted border-border-subtle hover:text-text-secondary'
          }`}
          title="Toggle keyboard shortcut legend (?)"
        >
          <Command className="w-3 h-3" />
          <span className="hidden sm:inline">Shortcuts</span>
        </button>

        <button
          onClick={onOpenIngest}
          className="px-2.5 py-1 text-xs font-medium bg-accent hover:bg-accent-hover text-white rounded-xs transition-colors flex items-center space-x-1.5 shadow-none"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Ingest Study</span>
        </button>
      </div>
    </header>
  );
};
