import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const SafetyBanner: React.FC = () => {
  return (
    <div className="w-full bg-bg-secondary border-b border-border-subtle px-4 py-1 flex items-center justify-between text-2xs select-none">
      <div className="flex items-center space-x-2 text-text-secondary">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        <span className="font-mono uppercase tracking-wider font-semibold text-text-primary">
          CLINICAL DECISION SUPPORT
        </span>
        <span className="text-border-strong">|</span>
        <span className="tracking-wide text-text-secondary font-medium">
          Not a diagnostic device. Prioritizes and flags suspected findings only. Attending clinician review and final disposition mandatory.
        </span>
      </div>

      <div className="flex items-center space-x-3 text-text-muted font-mono">
        <span>HIPAA SAFE-HARBOR DE-IDENTIFIED</span>
        <span className="text-border-strong">•</span>
        <span>ZERO OUTBOUND PATIENT TELEMETRY</span>
      </div>
    </div>
  );
};
