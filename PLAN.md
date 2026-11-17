# MERIDIAN CDS — ARCHITECTURE & IMPLEMENTATION PLAN

## 1. Executive Summary & Clinical Context

**System Name:** Meridian CDS (Clinical Decision-Support & Diagnostic Triage System)  
**Repository:** `https://github.com/Hunter-of-pros/apex.git`  
**Modalities:** 
1. **Imaging (Chest Radiography / CXR):** Calibrated multi-label inference for critical thoracic findings (Pneumothorax, Consolidation/Pneumonia, Pleural Effusion, Cardiomegaly, Normal/No Finding) with Grad-CAM localization heatmaps and image degradation/blur detection.
2. **Tabular Clinical Data:** High-dimensional clinical lab and vital measurements (Cardiovascular / Metabolic Risk cohort based on UCI Heart Disease) using gradient-boosted decision trees (XGBoost), isotonic probability calibration, and local TreeSHAP explanations paired with physiologic reference ranges.

**Non-Diagnostic Framing:**  
Meridian CDS prioritizes worklists and flags findings. It explicitly does not diagnose, auto-dismiss, or suppress cases. Clinician oversight is required for every study, backed by an immutable audit log.

---

## 2. System Architecture

```
apex/
├── DESIGN.md                         # Clinical design system specification
├── PLAN.md                           # Architecture and implementation plan (this document)
├── README.md                         # Humanized setup, architecture, and clinical guidance
├── MODEL_CARD.md                     # Formal clinical AI model card (metrics, subgroups, limitations)
├── Makefile                          # One-command orchestration (`make dev`, `make test`, `make seed`)
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI application factory & lifespan
│   │   ├── config.py                 # Application settings and environment bounds
│   │   ├── database.py               # SQLite asynchronous and synchronous session handlers
│   │   ├── models/                   # SQLAlchemy schemas
│   │   │   ├── case.py               # Cases, modalities, quality flags, priority scores
│   │   │   ├── finding.py            # Calibrated findings, confidence intervals, heatmaps
│   │   │   ├── model_run.py          # Provenance, model versions, execution duration
│   │   │   ├── clinician_action.py   # Agree / Disagree / Defer dispositions with reasons
│   │   │   └── audit_log.py          # Tamper-evident ledger of all events
│   │   ├── schemas/                  # Pydantic v2 validation contracts
│   │   │   ├── case.py
│   │   │   ├── finding.py
│   │   │   ├── action.py
│   │   │   ├── transparency.py
│   │   │   └── ingest.py
│   │   ├── api/                      # REST endpoints
│   │   │   ├── cases.py              # Worklist listing, sorting, multi-criteria filtering
│   │   │   ├── detail.py             # Single case deep-dive with findings and artifacts
│   │   │   ├── actions.py            # Clinician disposition recording and tier overrides
│   │   │   ├── ingest.py             # Image and tabular ingestion with PHI scrub preview
│   │   │   ├── audit.py              # Audit log inspection and export
│   │   │   └── transparency.py       # Live evaluation metrics, ROC, calibration curves
│   │   ├── privacy/
│   │   │   └── deid.py               # PHI scrubbing, DICOM/EXIF tag stripping, rejection rules
│   │   ├── triage/
│   │   │   ├── scoring.py            # Configurable multi-component triage scoring formula
│   │   │   └── weights.py            # Weights configuration (severity, uncertainty, risk)
│   │   └── ml/
│   │       ├── imaging.py            # PyTorch CXR model inference, Grad-CAM transparent PNG
│   │       ├── tabular.py            # XGBoost tabular model, Isotonic calibration, SHAP
│   │       ├── quality.py            # Image blur (Laplacian variance) and tabular OOD checks
│   │       ├── evaluation.py         # AUROC, Brier, ECE, subgroup disparity calculations
│   │       └── mock_model.py         # Isolated, deterministic fallback with visible banner
│   ├── scripts/
│   │   ├── train_eval.py             # Reproducible training & evaluation split generator
│   │   └── seed_demo_data.py         # Seeds ~40 realistic clinical cases (CXR + Tabular)
│   ├── tests/
│   │   ├── test_privacy.py           # Unit tests: PHI strip & identifier rejection
│   │   ├── test_triage_scoring.py    # Unit tests: Triage formula, uncertainty & tiering
│   │   └── test_api.py               # Integration tests for all core endpoints
│   └── requirements.txt              # Locked Python dependencies
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx                   # Top-level shell with safety perimeter & route state
    │   ├── index.css                 # Custom CSS variables, IBM Plex / JetBrains Mono
    │   ├── types/                    # TypeScript interfaces matching backend schemas
    │   ├── api/                      # Typed API client
    │   ├── hooks/
    │   │   ├── useKeyboardNavigation.ts # J/K, Enter, 1/2/3, H shortcuts
    │   │   └── useCases.ts
    │   └── components/
    │       ├── layout/
    │       │   ├── Header.tsx        # Title, environment badge, navigation tabs
    │       │   └── SafetyBanner.tsx  # Persistent clinical disclaimer strip
    │       ├── worklist/
    │       │   ├── WorklistView.tsx  # High-density ranked table
    │       │   ├── WorklistRow.tsx   # Row with confidence interval bar & glyph
    │       │   ├── FiltersBar.tsx    # Modality, status, tier, quality filters
    │       │   └── ShortcutHUD.tsx   # Discreet keyboard legend
    │       ├── viewer/
    │       │   ├── CaseDetailView.tsx # Master split-pane case inspector
    │       │   ├── PacsViewer.tsx    # Canvas: zoom, pan, window/level, invert, Grad-CAM
    │       │   ├── TabularViewer.tsx # Lab/vital parameter matrix with reference ranges
    │       │   ├── ShapWaterfall.tsx # Hand-tuned SVG SHAP attribution bars
    │       │   ├── FindingsList.tsx  # Finding cards with confidence intervals & loci
    │       │   ├── TriageScoreBreakdown.tsx # Formula breakdown visualizer
    │       │   └── ClinicianDeck.tsx # Agree/Disagree/Defer form with required reason
    │       ├── transparency/
    │       │   ├── TransparencyView.tsx # Model card, metrics, datasets, limitations
    │       │   ├── CalibrationPlot.tsx # Scientific SVG calibration curve + ECE
    │       │   ├── RocCurvePlot.tsx  # Scientific SVG ROC curve with operating points
    │       │   └── SubgroupTable.tsx # Performance across sex and age brackets
    │       ├── audit/
    │       │   └── AuditLogView.tsx  # Monospace tamper-evident event table
    │       └── ingest/
    │           └── IngestModal.tsx   # File upload with real-time PHI strip preview
    ├── package.json
    ├── vite.config.ts
    └── tailwind.config.js
```

---

## 3. Mathematical & Algorithmic Specifications

### 3.1 Calibrated Triage Priority Score

Priority rank must never be opaque. The priority score $P_{\text{triage}} \in [0, 100]$ is computed as:

$$P_{\text{triage}} = \min\left(100, \; 100 \cdot \left[ w_{\text{prob}} \cdot \hat{p}_{\text{cal}} + w_{\text{sev}} \cdot S_{\text{finding}} + w_{\text{unc}} \cdot U + w_{\text{risk}} \cdot R_{\text{patient}} \right] + Q_{\text{penalty}}\right)$$

Where:
* $\hat{p}_{\text{cal}}$: Calibrated probability of the primary acute finding ($0.0 \le \hat{p}_{\text{cal}} \le 1.0$).
* $S_{\text{finding}}$: Normalized clinical severity weight of the finding:
  * Tension Pneumothorax / Cardiogenic shock: $1.00$
  * Lobar Consolidation / Severe Effusion: $0.75$
  * Cardiomegaly: $0.45$
  * Baseline / No Acute Finding: $0.05$
* $U$: Uncertainty metric derived from 95% confidence interval width ($U = \text{CI}_{\text{upper}} - \text{CI}_{\text{lower}}$). High uncertainty in acute contexts penalizes toward higher attention.
* $R_{\text{patient}}$: Patient risk multiplier based on age, comorbid history, or vitals.
* $Q_{\text{penalty}}$: Degraded input penalty: $+25$ points if input fails quality checks (blur or out-of-distribution), automatically forcing elevated triage tier (`HIGH` or `CRITICAL`).
* Configurable weights (default: $w_{\text{prob}}=0.45, w_{\text{sev}}=0.35, w_{\text{unc}}=0.10, w_{\text{risk}}=0.10$).

### 3.2 Probability Calibration
* Imaging: Temperature scaling / Platt scaling calibrated against empirical log-loss on a validation split.
* Tabular: Isotonic regression calibrated on out-of-fold predictions.
* Metrics reported: Expected Calibration Error (ECE), Brier Score, and reliability deciles.

### 3.3 Explainability
* **Grad-CAM for CXR:** Computes gradients of the target finding score with respect to feature maps of the final convolutional layer of the DenseNet architecture. The resulting $2D$ activation map is normalized, colormapped with an authentic thermal scale (inferno/turbo), and rendered into an RGBA PNG with transparent background.
* **TreeSHAP for Tabular:** Computes additive feature attributions $\phi_i$ such that:
  $$f(x) = \phi_0 + \sum_{i=1}^M \phi_i$$
  Displayed as a hand-tuned SVG waterfall with clinical reference boundaries.

---

## 4. Work Phases & Verification Milestones

1. **Phase 1: Backend Foundation & Privacy Module**
   * SQLite models, database initialization, schemas.
   * Privacy / PHI scrubbing engine and unit tests.
   * Triage scoring engine and unit tests.
2. **Phase 2: Machine Learning, Calibration & Explainability**
   * CXR DenseNet model & Grad-CAM heatmap generator.
   * Tabular XGBoost model, Isotonic calibration, and SHAP engine.
   * Evaluation pipeline: ROC, ECE, Subgroup matrices across sex and age.
   * Mock fallback mechanism with visible flag.
3. **Phase 3: Seed Pipeline & Demo Scenarios (~40 cases)**
   * Realistic synthetic radiographs with true pathology features and Grad-CAM maps.
   * Tabular cardiovascular panels with out-of-range flags.
   * Mixed quality cases (blurry X-rays, motion artifacts) to test uncertainty and safety flags.
4. **Phase 4: High-Density Frontend Implementation**
   * CSS variables, typography (IBM Plex Sans, JetBrains Mono), custom components.
   * Keyboard-navigable Worklist with filters and shortcut HUD.
   * Full PACS Viewer with zoom/pan/window/level/invert/heatmap opacity.
   * Tabular view with SVG SHAP waterfall and reference ranges.
   * Clinician Action Deck with mandatory disagree justification.
   * Scientific Model Transparency view with calibration and ROC SVG charts.
   * Tamper-evident Audit Trail view.
   * PHI-scrubbing Ingestion modal.
5. **Phase 5: Verification & Browser Walkthrough**
   * Run full backend and frontend simultaneously.
   * Browser walkthrough & screenshots (Worklist, CXR case, Tabular case, Transparency page, Quality alert case).
   * Design audit against `DESIGN.md` rules and iterative polish.
6. **Phase 6: Documentation, Deliverables & Final Git Push**
   * `README.md`, `MODEL_CARD.md`, `Makefile`.
   * Final verification of test suite and humanized final summary.
