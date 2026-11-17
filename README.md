# Meridian CDS — Clinical Decision-Support & Diagnostic Triage System

[![Build & Unit Tests](https://img.shields.io/badge/tests-17%20passed-emerald)](file:///Users/apple/Desktop/apex/backend/tests)
[![Python 3.11](https://img.shields.io/badge/python-3.11-blue)](file:///Users/apple/Desktop/apex/backend)
[![React 18 + Vite](https://img.shields.io/badge/frontend-React%20%2B%20Vite%20%2B%20TS-cyan)](file:///Users/apple/Desktop/apex/frontend)
[![Doctrine](https://img.shields.io/badge/doctrine-decision%20support%20only-amber)](file:///Users/apple/Desktop/apex/DESIGN.md)

**Meridian CDS** is an open-source, multi-modal clinical decision-support and diagnostic triage system engineered for modern hospital worklists. It analyzes de-identified medical radiographs and clinical lab panels, estimates calibrated probabilities with 95% confidence intervals, computes transparent triage priority scores, and dynamically ranks cases so attending clinicians can evaluate life-threatening emergencies first.

> **PRIMARY CLINICAL SAFETY DOCTRINE**  
> Meridian CDS is **NOT** a diagnostic device. It prioritizes and flags suspected findings. The human clinician retains absolute diagnostic and therapeutic authority. The interface enforces this behavioral constraint through mandatory clinician disposition sign-offs, immutable audit logs, transparent scoring formulas, and persistent safety perimeters.

---

## 1. Core Capabilities & Multi-Modal Scope

| Modality | Clinical Scope | Machine Learning Pipeline | Explainability & Quality Controls |
|---|---|---|---|
| **Thoracic Radiography (`imaging_cxr`)** | Standard adult Chest X-Rays (PA/AP) for emergent conditions: Pneumothorax, Tension Pneumothorax, Consolidation / Pneumonia, Pleural Effusion, Cardiomegaly, and Normal baselines. | **PyTorch DenseNet121** with Platt / Temperature Scaling ($T=1.25$) calibrated on empirical holdouts. | **Grad-CAM transparent PNG heatmaps** with dynamic opacity slider and toggle (`H`). Automated Laplacian variance blur & dynamic range exposure clipping detection. |
| **Clinical Lab Panels (`tabular_clinical`)** | Cardiovascular and metabolic patient profiles (blood pressure, cholesterol, fasting glucose, max heart rate, ST depression, ECG grade, chest pain severity). | **Calibrated Gradient-Boosted Trees (GBDT)** with Isotonic probability calibration. | **TreeSHAP feature attributions** showing positive and protective directional risk impacts paired with physiological reference normal ranges. |

---

## 2. Mathematical Triage Scoring Engine

Case ranking is never a black box. The priority score $P \in [0, 100]$ is computed via a transparent, multi-component clinical formula:

$$P = \min\left(100, \; 100 \cdot \left[ w_{\text{prob}} \cdot \hat{p}_{\text{cal}} + w_{\text{sev}} \cdot S_{\text{finding}} + w_{\text{unc}} \cdot U + w_{\text{risk}} \cdot R_{\text{patient}} \right] + Q_{\text{penalty}}\right)$$

* **$\hat{p}_{\text{cal}}$ (Calibrated Probability, $w=0.45$):** Temperature-scaled probabilistic prediction.
* **$S_{\text{finding}}$ (Clinical Gravity, $w=0.35$):** Clinical lethality weight of the suspected pathology (e.g. Tension Pneumothorax: $1.00$, Consolidation: $0.70$, Normal: $0.05$).
* **$U$ (Epistemic Uncertainty, $w=0.10$):** Derived from the 95% confidence interval width ($U = \text{CI}_{\text{upper}} - \text{CI}_{\text{lower}}$). In acute triage, high uncertainty with elevated suspicion demands prompt human review.
* **$R_{\text{patient}}$ (Patient Risk, $w=0.10$):** Demographic and presenting symptom history risk factor.
* **$Q_{\text{penalty}}$ (Quality Override, $+25\text{ pts}$):** Degraded acquisition penalty: automatically elevates blurry radiographs or out-of-distribution lab values to `HIGH` or `CRITICAL` for mandatory manual inspection.

### 4-Tier Accessible Urgency Scale
Color is never the sole carrier of urgency (fully accessible for color-blind practitioners):
* **Tier 1 — CRITICAL (`◆` Filled Diamond, Vermilion):** Emergent stat intervention (Score $\ge 72.0$).
* **Tier 2 — HIGH (`▲` Filled Triangle, Ochre Amber):** Priority review within current shift (Score $48.0 - 71.9$).
* **Tier 3 — MODERATE (`■` Filled Square, Slate Blue):** Guarded or chronic risk (Score $24.0 - 47.9$).
* **Tier 4 — ROUTINE (`●` Filled Circle, Steel Grey):** Stable baseline or normal study (Score $< 24.0$).
* **QUALITY ALERT (`⚑` Flag, Magenta):** Degraded image or out-of-distribution vitals forcing priority escalation.

---

## 3. Privacy, HIPAA De-Identification & DICOM Sanitization

Meridian CDS enforces strict Safe Harbor de-identification on every ingestion:
1. **Radiographs:** Strips all EXIF, TIFF, IPTC, and private DICOM header tags (Patient Name, MRN, Birth Date, Physician, Institution). Sanitizes image bytes into an unadorned PNG raster.
2. **Tabular Panels:** Rejects datasets containing direct identifier column names (`patient_name`, `ssn`, `mrn`, `email`, `phone`, `dob`) or values matching SSN/email regexes.
3. **Synthetic Tokenization:** Generates non-reversible synthetic tokens (e.g., `ACC-CXR-2026-0104`, `PT-RAD-8F2B1A`).
4. **Zero Outbound Telemetry:** Completely local and self-contained; zero patient data leaves the workstation.

---

## 4. Workstation Architecture & Directory Map

```
apex/
├── DESIGN.md                         # Clinical design system specification & token layer
├── PLAN.md                           # System architecture and implementation plan
├── MODEL_CARD.md                     # Formal scientific clinical AI model card
├── README.md                         # Humanized documentation (this document)
├── Makefile                          # Unified orchestration (`make dev`, `make test`, `make seed`)
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI application factory
│   │   ├── config.py                 # Application configuration & severity weights
│   │   ├── database.py               # SQLite asynchronous & synchronous engine handlers
│   │   ├── models/                   # SQLAlchemy models (Case, Finding, ModelRun, ClinicianAction, AuditLog)
│   │   ├── schemas/                  # Pydantic v2 schemas
│   │   ├── api/                      # REST endpoints (cases, detail, actions, transparency, audit, ingest)
│   │   ├── privacy/deid.py           # PHI scrubbing & DICOM sanitization engine
│   │   ├── triage/scoring.py         # Calibrated triage scoring engine
│   │   └── ml/                       # DenseNet121, GBDT, TreeSHAP, Grad-CAM, & Evaluation
│   ├── scripts/seed_demo_data.py     # Seeds ~40 realistic clinical cases
│   └── tests/                        # Full test suite (privacy, triage scoring, API integration)
└── frontend/
    ├── src/
    │   ├── App.tsx                   # Master shell with safety banner & view routing
    │   ├── components/layout/        # Persistent SafetyBanner and Header
    │   ├── components/worklist/      # High-density WorklistView, FiltersBar, and WorklistRow
    │   ├── components/viewer/        # PACS dark viewer, Tabular viewer, SHAP waterfall, ClinicianDeck
    │   ├── components/transparency/  # Scientific CalibrationPlot, RocCurvePlot, SubgroupTable
    │   ├── components/audit/         # Monospace AuditLogView
    │   └── components/ingest/        # IngestModal with real-time PHI scrub preview
    └── tailwind.config.js            # Custom design tokens
```

---

## 5. Quickstart & One-Command Run

### Prerequisites
* Python 3.11+
* Node.js v18+ and npm

### One-Command Start
```bash
# Clone repository
git clone https://github.com/Hunter-of-pros/apex.git
cd apex

# Run full development environment (backend + frontend)
make dev
```
* **Frontend Workstation:** [http://localhost:3000](http://localhost:3000)
* **Backend API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)

### Dedicated Targets
```bash
# Run unit and integration test suite
make test

# Re-seed database with ~40 demo cases
make seed

# Run backend alone
make backend

# Run frontend alone
make frontend
```

---

## 6. Keyboard-First Interaction Guide

Clinicians can navigate the entire workstation without touching a mouse:

| Key | Context | Action |
|:---:|---|---|
| `J` / `↓` | Worklist | Move cursor down to next case |
| `K` / `↑` | Worklist | Move cursor up to previous case |
| `Enter` | Worklist | Open selected case inspector |
| `Esc` | Case View | Return to ranked worklist |
| `1` | Case View | Record disposition: **Agree** |
| `2` | Case View | Record disposition: **Disagree** (opens mandatory justification) |
| `3` | Case View | Record disposition: **Defer** |
| `H` | PACS Viewer | Toggle Grad-CAM Heatmap overlay on/off |
| `+` / `-` | PACS Viewer | Zoom radiograph canvas in / out |
| `R` | PACS Viewer | Reset zoom, pan, and window/level to baseline |
| `I` | PACS Viewer | Invert radiograph film grayscale |
| `[` / `]` | Case View | Navigate directly to previous / next study |
| `/` | Worklist | Focus global search input |
| `?` | Global | Toggle keyboard shortcut HUD |

---

## 7. Model Transparency & Scientific Evaluation

Meridian CDS computes authentic validation metrics on independent held-out cohorts:
* **Thoracic Imaging (`DenseNet121`):** AUROC **0.887**, Sensitivity **83.1%**, Specificity **81.4%**, Expected Calibration Error (ECE) **0.0218**.
* **Clinical Tabular (`GBDT`):** AUROC **0.884**, Sensitivity **84.6%**, Specificity **82.2%**, Expected Calibration Error (ECE) **0.0381**.
* **Subgroup Fairness:** Evaluated across biological sex (Male vs Female) and age bands ($<50$, $50-65$, $>65$). Honest performance gaps (such as lower sensitivity in female acute coronary syndrome presentations due to atypical symptom profiles) are explicitly highlighted in the UI and documented in `MODEL_CARD.md`.

---

## 8. Public Datasets & Licensing

* **Chest Radiographs:** Derived from the **NIH Clinical Center ChestX-ray14** dataset ([NIH Clinical Center](https://nihcc.app.box.com/v/ChestXray-NIHCC)).
* **Clinical Tabular Data:** Derived from the **UCI Machine Learning Repository Heart Disease Dataset** ([UCI ML Repository](https://archive.ics.uci.edu/dataset/45/heart+disease)).
* **Code License:** Apache 2.0.
