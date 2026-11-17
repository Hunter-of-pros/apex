import React, { useState } from 'react';
import { ingestRadiograph, ingestTabularData } from '../../api/client';
import { X, UploadCloud, ShieldCheck, AlertCircle, FileCheck } from 'lucide-react';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestSuccess: (caseId: number) => void;
}

export const IngestModal: React.FC<IngestModalProps> = ({
  isOpen,
  onClose,
  onIngestSuccess
}) => {
  const [modality, setModality] = useState<'cxr' | 'tabular'>('cxr');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [age, setAge] = useState<number>(58);
  const [sex, setSex] = useState<string>('M');
  const [clinicalHistory, setClinicalHistory] = useState<string>(
    'Referred for acute thoracic pain and exertional dyspnea'
  );

  // Tabular Fields
  const [restingBp, setRestingBp] = useState<number>(145);
  const [cholesterol, setCholesterol] = useState<number>(235);
  const [fastingBs, setFastingBs] = useState<number>(115);
  const [maxHr, setMaxHr] = useState<number>(140);
  const [stDepression, setStDepression] = useState<number>(1.5);
  const [chestPainType, setChestPainType] = useState<number>(3);
  const [restingEcg, setRestingEcg] = useState<number>(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (modality === 'cxr') {
        if (!selectedFile) {
          throw new Error('Please select a radiograph file to ingest.');
        }
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('age', String(age));
        formData.append('sex', sex);
        formData.append('clinical_history', clinicalHistory);

        const res = await ingestRadiograph(formData);
        onIngestSuccess(res.case_id);
        onClose();
      } else {
        const payload = {
          age: Number(age),
          sex,
          resting_bp: Number(restingBp),
          cholesterol: Number(cholesterol),
          fasting_blood_sugar: Number(fastingBs),
          max_heart_rate: Number(maxHr),
          st_depression: Number(stDepression),
          chest_pain_type: Number(chestPainType),
          resting_ecg: Number(restingEcg),
          clinical_history: clinicalHistory
        };
        const res = await ingestTabularData(payload);
        onIngestSuccess(res.case_id);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ingestion failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-border-strong rounded-xs shadow-2xl max-w-xl w-full text-xs font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-border-subtle">
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-4 h-4 text-accent" />
            <span className="font-bold text-sm text-text-primary">
              Ingest & De-identify Clinical Study
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-0.5 rounded-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modality Tabs */}
        <div className="p-3.5 border-b border-border-subtle bg-bg-primary/50 flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setModality('cxr')}
              className={`px-3 py-1 font-mono text-2xs font-semibold rounded-xs border transition-colors ${
                modality === 'cxr'
                  ? 'bg-accent text-white border-accent'
                  : 'bg-bg-secondary text-text-secondary border-border-subtle'
              }`}
            >
              Thoracic Radiograph (CXR)
            </button>
            <button
              type="button"
              onClick={() => setModality('tabular')}
              className={`px-3 py-1 font-mono text-2xs font-semibold rounded-xs border transition-colors ${
                modality === 'tabular'
                  ? 'bg-accent text-white border-accent'
                  : 'bg-bg-secondary text-text-secondary border-border-subtle'
              }`}
            >
              Cardiovascular Lab Panel (Tabular)
            </button>
          </div>

          <div className="flex items-center space-x-1 text-2xs font-mono text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>HIPAA Scrubbing Active</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* File Picker or Tabular Fields */}
          {modality === 'cxr' ? (
            <div className="space-y-2">
              <label className="block text-2xs font-mono text-text-muted uppercase">
                Chest Radiograph File (DICOM/PNG/JPEG):
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full bg-bg-primary border border-border-subtle rounded-xs p-2 text-xs text-text-secondary font-mono file:mr-3 file:py-1 file:px-2.5 file:rounded-xs file:border-0 file:text-2xs file:font-semibold file:bg-bg-tertiary file:text-text-primary hover:file:bg-bg-elevated cursor-pointer"
              />
              <p className="text-[10px] text-text-muted font-mono">
                System automatically strips all EXIF, TIFF, and private DICOM header tags on reception.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="block text-2xs font-mono text-text-muted uppercase">
                Clinical Lab & Hemodynamic Parameters:
              </span>
              <div className="grid grid-cols-3 gap-2 font-mono text-2xs">
                <div>
                  <label className="text-text-muted block">Resting BP (mmHg)</label>
                  <input
                    type="number"
                    value={restingBp}
                    onChange={(e) => setRestingBp(Number(e.target.value))}
                    className="w-full bg-bg-primary border border-border-subtle rounded-xs p-1.5 text-xs text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-text-muted block">Cholesterol (mg/dL)</label>
                  <input
                    type="number"
                    value={cholesterol}
                    onChange={(e) => setCholesterol(Number(e.target.value))}
                    className="w-full bg-bg-primary border border-border-subtle rounded-xs p-1.5 text-xs text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-text-muted block">Fasting Glucose (mg/dL)</label>
                  <input
                    type="number"
                    value={fastingBs}
                    onChange={(e) => setFastingBs(Number(e.target.value))}
                    className="w-full bg-bg-primary border border-border-subtle rounded-xs p-1.5 text-xs text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-text-muted block">Max Heart Rate (bpm)</label>
                  <input
                    type="number"
                    value={maxHr}
                    onChange={(e) => setMaxHr(Number(e.target.value))}
                    className="w-full bg-bg-primary border border-border-subtle rounded-xs p-1.5 text-xs text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-text-muted block">ST Depression (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={stDepression}
                    onChange={(e) => setStDepression(Number(e.target.value))}
                    className="w-full bg-bg-primary border border-border-subtle rounded-xs p-1.5 text-xs text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-text-muted block">Chest Pain Grade (1-4)</label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={chestPainType}
                    onChange={(e) => setChestPainType(Number(e.target.value))}
                    className="w-full bg-bg-primary border border-border-subtle rounded-xs p-1.5 text-xs text-text-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Patient Demographic & Clinical Context */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-2xs font-mono text-text-muted uppercase">Age (Years)</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full bg-bg-primary border border-border-subtle rounded-xs p-1.5 text-xs text-text-primary font-mono"
              />
            </div>
            <div>
              <label className="block text-2xs font-mono text-text-muted uppercase">Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full bg-bg-primary border border-border-subtle rounded-xs p-1.5 text-xs text-text-primary font-mono"
              >
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
                <option value="O">Other / Unspecified (O)</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-2xs font-mono text-text-muted uppercase">Synthetic UID</label>
              <div className="p-1.5 bg-bg-tertiary border border-border-subtle rounded-xs text-2xs font-mono text-text-secondary truncate">
                PT-SYN-AUTO
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-2xs font-mono text-text-muted uppercase">
              Clinical Indication / Presenting Symptom History:
            </label>
            <input
              type="text"
              value={clinicalHistory}
              onChange={(e) => setClinicalHistory(e.target.value)}
              className="w-full bg-bg-primary border border-border-subtle rounded-xs p-2 text-xs text-text-primary"
            />
          </div>

          {/* Privacy attestation */}
          <div className="p-2.5 bg-bg-primary rounded-xs border border-border-subtle flex items-start space-x-2 text-2xs font-mono text-text-muted">
            <FileCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="leading-tight">
              By submitting, patient identifiers are scrubbed per HIPAA § 164.514(b)(2). The study is assigned a non-reversible accession token and queued for model decision support.
            </p>
          </div>

          {errorMsg && (
            <div className="p-2 bg-red-950/40 border border-red-800 text-red-300 text-2xs font-mono rounded-xs flex items-center space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end space-x-2 pt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary rounded-xs border border-border-subtle"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold bg-accent hover:bg-accent-hover text-white rounded-xs transition-colors flex items-center space-x-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Scrubbing & Inferring...' : 'De-identify & Ingest'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
