import React, { useState } from 'react';
import { ModelTransparency } from '../../types';
import { CalibrationPlot } from './CalibrationPlot';
import { RocCurvePlot } from './RocCurvePlot';
import { SubgroupTable } from './SubgroupTable';
import { ShieldAlert, BookOpen, AlertCircle, FileCheck, Layers } from 'lucide-react';

interface TransparencyViewProps {
  transparencyData: ModelTransparency[];
  loading: boolean;
}

export const TransparencyView: React.FC<TransparencyViewProps> = ({
  transparencyData,
  loading
}) => {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary font-mono text-xs text-text-muted">
        Evaluating held-out splits and computing calibration metrics...
      </div>
    );
  }

  if (!transparencyData || transparencyData.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary font-mono text-xs text-text-muted">
        No model evaluation records available.
      </div>
    );
  }

  const model = transparencyData[selectedIdx] || transparencyData[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-primary overflow-y-auto">
      {/* Top Model Switcher Bar */}
      <div className="bg-bg-secondary border-b border-border-subtle p-3 flex items-center justify-between select-none">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-4 h-4 text-accent" />
          <span className="font-sans font-bold text-sm text-text-primary">
            Scientific Model Cards & Calibration Audit
          </span>
        </div>

        <div className="flex items-center space-x-1.5 bg-bg-primary p-0.5 rounded-xs border border-border-subtle">
          {transparencyData.map((m, idx) => (
            <button
              key={m.model_name}
              onClick={() => setSelectedIdx(idx)}
              className={`px-3 py-1 text-xs font-mono font-medium rounded-xs transition-colors ${
                selectedIdx === idx
                  ? 'bg-bg-elevated text-text-primary border border-border-strong'
                  : 'text-text-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              {m.modality === 'imaging_cxr' ? 'Thoracic DenseNet121 (CXR)' : 'Cardio GBDT (Tabular)'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 max-w-6xl mx-auto space-y-6 w-full font-sans">
        {/* Model Card Header Card */}
        <div className="bg-bg-secondary p-4 rounded-xs border border-border-subtle space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
            <div>
              <h2 className="text-base font-bold text-text-primary flex items-center space-x-2">
                <span>{model.model_name}</span>
                <span className="font-mono text-2xs px-1.5 py-0.2 rounded-xs bg-bg-tertiary border border-border-strong text-text-secondary">
                  {model.model_version}
                </span>
                {model.is_mock && (
                  <span className="font-mono text-2xs px-1.5 py-0.2 rounded-xs bg-amber-950/50 text-amber-300 border border-amber-800">
                    VALIDATION MOCK ACTIVE
                  </span>
                )}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {model.training_cohort_description}
              </p>
            </div>

            {/* Overall Score Badges */}
            <div className="flex items-center space-x-2 font-mono text-2xs">
              <div className="px-2 py-1 bg-bg-primary rounded-xs border border-border-subtle">
                <span className="text-text-muted block text-[10px]">AUROC</span>
                <span className="text-sm font-bold text-emerald-400">{model.overall_auroc.toFixed(3)}</span>
              </div>
              <div className="px-2 py-1 bg-bg-primary rounded-xs border border-border-subtle">
                <span className="text-text-muted block text-[10px]">SENSITIVITY</span>
                <span className="text-sm font-bold text-text-primary">{(model.overall_sensitivity * 100).toFixed(1)}%</span>
              </div>
              <div className="px-2 py-1 bg-bg-primary rounded-xs border border-border-subtle">
                <span className="text-text-muted block text-[10px]">SPECIFICITY</span>
                <span className="text-sm font-bold text-text-primary">{(model.overall_specificity * 100).toFixed(1)}%</span>
              </div>
              <div className="px-2 py-1 bg-bg-primary rounded-xs border border-border-subtle">
                <span className="text-text-muted block text-[10px]">ECE ERROR</span>
                <span className="text-sm font-bold text-accent">{model.expected_calibration_error.toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* Intended Use & Contraindications Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="font-mono text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                Intended Clinical Use & Prioritization Scope:
              </span>
              <p className="text-text-secondary leading-relaxed bg-bg-primary p-2.5 rounded-xs border border-border-subtle">
                {model.intended_use}
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-mono text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                Explicit Contraindications & Exclusions:
              </span>
              <ul className="text-text-secondary leading-relaxed bg-bg-primary p-2.5 rounded-xs border border-border-subtle space-y-1 list-disc list-inside">
                {model.contraindications.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Scientific Figures: Calibration Reliability Plot & ROC Curve */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CalibrationPlot
            data={model.calibration_curve}
            ece={model.expected_calibration_error}
            brierScore={model.brier_score}
          />
          <RocCurvePlot
            data={model.roc_curve}
            auroc={model.overall_auroc}
            sensitivity={model.overall_sensitivity}
            specificity={model.overall_specificity}
          />
        </div>

        {/* Demographic Subgroup Disparity Table */}
        <SubgroupTable metrics={model.subgroup_metrics} />

        {/* Known Limitations & Failure Modes */}
        <div className="bg-bg-secondary p-4 rounded-xs border border-border-subtle space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-400 font-mono uppercase tracking-wider">
            <AlertCircle className="w-4 h-4" />
            <span>Documented Limitations & Boundary Failure Modes</span>
          </div>

          <div className="space-y-1.5 text-xs text-text-secondary">
            {model.known_limitations.map((lim, i) => (
              <div
                key={i}
                className="p-2 bg-bg-primary rounded-xs border border-border-subtle flex items-start space-x-2"
              >
                <span className="text-amber-500 font-bold font-mono">[{i + 1}]</span>
                <span className="leading-relaxed">{lim}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dataset Provenance & Statutory Declarations */}
        <div className="bg-bg-secondary/60 p-3 rounded-xs border border-border-subtle text-2xs font-mono text-text-muted space-y-1 select-none">
          <div className="flex items-center justify-between">
            <span>DATASET CITATIONS: NIH CHESTX-RAY14 (U.S. NIH CLINICAL CENTER) • UCI MACHINE LEARNING REPOSITORY</span>
            <span>LICENSED UNDER CC-BY 4.0 / OPEN RESEARCH DATA</span>
          </div>
          <p>
            Regulatory Notice: Meridian CDS is an investigational decision-support instrument. Not cleared by the FDA or CE-marked as a standalone medical device. All clinical dispositions require independent human verification.
          </p>
        </div>
      </div>
    </div>
  );
};
