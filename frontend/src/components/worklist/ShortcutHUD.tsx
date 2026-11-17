import React from 'react';
import { X, Command } from 'lucide-react';

interface ShortcutHUDProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutHUD: React.FC<ShortcutHUDProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'J / K', label: 'Navigate up / down worklist rows' },
    { key: 'Enter', label: 'Open selected study inspector' },
    { key: 'Esc', label: 'Return to worklist / close modal' },
    { key: '1', label: 'Clinical Action: Agree' },
    { key: '2', label: 'Clinical Action: Disagree (requires reason)' },
    { key: '3', label: 'Clinical Action: Defer' },
    { key: 'H', label: 'Toggle Grad-CAM Heatmap overlay' },
    { key: '+ / -', label: 'Zoom PACS radiograph canvas' },
    { key: 'R', label: 'Reset PACS zoom & pan orientation' },
    { key: 'I', label: 'Invert radiograph black/white film' },
    { key: '[ / ]', label: 'Previous / next case in worklist' },
    { key: '?', label: 'Toggle this shortcut guide' },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-bg-secondary border border-border-strong rounded-xs shadow-2xl p-3 w-80 text-xs">
      <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-2">
        <div className="flex items-center space-x-1.5 font-mono text-2xs font-semibold text-text-primary uppercase tracking-wider">
          <Command className="w-3.5 h-3.5 text-accent" />
          <span>Workstation Hotkeys</span>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary p-0.5 rounded-xs"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1.5 font-mono text-2xs">
        {shortcuts.map((s) => (
          <div key={s.key} className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 bg-bg-tertiary border border-border-subtle rounded-xs text-text-primary font-bold">
              {s.key}
            </span>
            <span className="text-text-secondary text-right font-sans text-xs">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
