# Meridian CDS — Clinical Decision-Support & Diagnostic Triage
### Built by Apex Healthcare

[![Live on Vercel](https://img.shields.io/badge/deployment-apexhealthcare--cds.vercel.app-emerald?style=flat-square)](https://apexhealthcare-cds.vercel.app)
[![Tests Passing](https://img.shields.io/badge/unit%20tests-17%20passed-3b82f6?style=flat-square)](backend/tests)
[![Python 3.11](https://img.shields.io/badge/python-3.11-gray?style=flat-square)](backend/)
[![React 18 + TS](https://img.shields.io/badge/frontend-React%2018%20%2B%20Vite%20%2B%20TS-6366f1?style=flat-square)](frontend/)
[![Clinical Doctrine](https://img.shields.io/badge/doctrine-decision%20support%20only-amber?style=flat-square)](DESIGN.md)

**Live Production Workstation:** [https://apexhealthcare-cds.vercel.app](https://apexhealthcare-cds.vercel.app)  
*(Alternative mirror: [https://apexhealthcare-triage.vercel.app](https://apexhealthcare-triage.vercel.app))*  
**GitHub Repository:** [https://github.com/Hunter-of-pros/apex.git](https://github.com/Hunter-of-pros/apex.git)

---

## Why We Built This

If you have ever spent a night shift inside a hospital reading room or an emergency department, you know the feeling. The unread study list never stops growing. Images arrive continuously: an outpatient follow-up for mild bronchitis sits right next to a stat post-intubation portable radiograph with an unsuspected tension pneumothorax.

In standard PACS (Picture Archiving and Communication System) software, studies are usually sorted strictly by acquisition timestamp: *first-in, first-out*. When emergency departments are overwhelmed, an urgent study can sit unreviewed for 45 minutes simply because twelve routine checkups arrived ten minutes earlier.

**Meridian CDS** is our attempt to build a sensible, respectful, and safe decision-support triage layer for that queue.

It does **not** replace the clinician. It does **not** write final diagnostic reports. It does **not** close or hide cases. What it does is simple and disciplined: it inspects de-identified images and clinical lab panels as they arrive, estimates calibrated probabilities alongside their uncertainty intervals, applies clinical severity weights, and floats the most urgent cases to the top of the worklist so a credentialed human doctor reviews them first.

> ### Clinical Safety Doctrine
> **This software is not a diagnostic device.**  
> It does not diagnose disease or prescribe treatment. It exists solely to assist in queue prioritization and clinical flagging. The treating clinician retains absolute authority and responsibility for every diagnosis and medical decision.

---

## The Core Problem with "AI Dashboards" in Medicine

Most machine learning demos for healthcare suffer from three fatal flaws that make doctors immediately reject them:

1. **The "Mystery 98%"**: A model outputs "Pneumonia: 98% confident", but gives the doctor no error bounds, no calibration curve, and no indication whether the image was blurry or taken from the wrong anatomical view.
2. **Aggressive UI Tropes**: Flashy gradients, generic startup buttons, playful emoji, and noisy popups that cause visual fatigue in dim reading rooms.
3. **Black Box Hubris**: Software that attempts to make diagnoses rather than providing clear, verifiable breadcrumbs that let the clinician verify the model's reasoning in seconds.

We took the opposite approach. Meridian CDS is styled like high-precision clinical instrumentation: a deep dark canvas (`#050608`) for radiograph contrast, crisp hairline borders, tabular numerals, keyboard-first navigation (`J`/`K` to step through cases, `H` to toggle overlays), and honest reporting of model uncertainty and quality degradation.

---

## Key Features

### 1. Dual-Modality Worklist (Images + Labs in One Queue)
Hospitals treat patients, not single data types. Meridian CDS handles two modalities on a shared, priority-ranked queue:
- **Thoracic Radiographs (CXR):** Analyzes PA and AP chest radiographs for emergent conditions:
  - *Tension Pneumothorax* (Critical)
  - *Large Pleural Effusion* (High)
  - *Consolidation / Lobar Pneumonia* (High)
  - *Cardiomegaly* (Moderate)
  - *Normal baseline* (Routine)
- **Clinical Lab & Vital Panels:** Analyzes cardiovascular and metabolic panels (blood pressure, fasting glucose, serum cholesterol, resting ECG, ST depression, chest pain severity).

### 2. Transparent Triage Math
The triage score is never a secret. A case's position on the worklist is calculated from an open, documented formula:

$$\text{Priority} = \min\left(100, \; 100 \cdot \left[ w_p \hat{p}_{\text{cal}} + w_s S_{\text{finding}} + w_u U + w_r R_{\text{patient}} \right] + Q_{\text{penalty}}\right)$$

- **$\hat{p}_{\text{cal}}$ (Calibrated Probability, $w=0.45$):** The model's temperature-scaled confidence.
- **$S_{\text{finding}}$ (Clinical Severity, $w=0.35$):** How dangerous the condition is if left untreated (e.g., Tension Pneumothorax is weighted $1.00$; mild cardiomegaly is $0.40$).
- **$U$ (Epistemic Uncertainty, $w=0.10$):** Derived from the 95% Wilson confidence interval. In emergency medicine, an uncertain finding in an acute presentation demands *faster* human review, not delayed attention.
- **$R_{\text{patient}}$ (Patient Risk, $w=0.10$):** Demographic and symptom risk history.
- **$Q_{\text{penalty}}$ (+25 pts Quality Alert):** If the image is motion-blurred, underexposed, or the lab data is out-of-distribution, the case is automatically escalated with a Quality Flag (`⚑`) so a doctor inspects the bad acquisition immediately.

### 3. Accessible 4-Tier Urgency Hierarchy
We never rely on color alone (ensuring full usability for red-green color-blind practitioners):
- **◆ CRITICAL (Score $\ge 72$):** Stat emergency review (Vermilion diamond).
- **▲ HIGH (Score $48 - 71.9$):** Urgent priority within the shift (Amber triangle).
- **■ MODERATE (Score $24 - 47.9$):** Chronic or guarded condition (Slate square).
- **● ROUTINE (Score $< 24$):** Baseline or normal examination (Steel circle).
- **⚑ QUALITY ALERT:** Low-quality image or out-of-range sensor data requiring manual validation.

### 4. Explainability You Can Actually Verify
- **Grad-CAM Transparency Maps:** In imaging cases, press `H` to toggle a transparent PyTorch Grad-CAM heatmap overlay. A slider lets you adjust opacity so you can inspect underlying lung parenchyma and rib borders without the heatmap obscuring the anatomy.
- **TreeSHAP Diverging Waterfall Bars:** For lab panels, the system renders a clean, hand-tuned SVG showing which specific lab parameters pushed the risk up (positive SHAP force) and which were protective, paired with normal clinical reference ranges.

### 5. Mandatory Clinician Feedback & Immutable Audit Log
Every interaction with a case requires explicit clinical sign-off:
- **Agree (`1`)**: Confirms the finding and triage priority.
- **Disagree (`2`)**: Requires selecting a clinical reason (e.g., *Artifact misinterpreted as pathology*, *Normal anatomical variant*, *Overcalled severity*) and allows adjusting the priority tier.
- **Defer (`3`)**: Marks the case for senior attending or multidisciplinary review.

Every action, timestamp, clinician ID, IP address, and rationale is recorded to an append-only SQLite audit log.

### 6. Strict Privacy & HIPAA Safe Harbor Compliance
- **Metadata Scrubbing:** On ingestion, all EXIF, TIFF, and DICOM header tags (Patient Name, MRN, Birth Date, Physician, Facility) are removed before writing to disk.
- **Identifier Pattern Rejection:** The tabular ingest engine immediately rejects uploads containing column names like `ssn`, `mrn`, `email`, or values matching SSN/email regexes.
- **Non-Reversible Synthetic Tokens:** Cases receive synthetic identifiers (`ACC-CXR-2026-0104`, `PT-RAD-8F2B1A`).
- **Zero Outbound Telemetry:** The entire system runs locally or inside your private VPC. No patient data or pixel values are ever transmitted to third-party APIs.

---

## Interactive Keyboard Shortcuts

Meridian CDS was built for speed. Clinicians can work through dozens of cases without ever lifting their hands from the keyboard:

| Shortcut | Where It Works | What It Does |
| :---: | :--- | :--- |
| **`J`** / **`↓`** | Worklist | Move highlight to the next case |
| **`K`** / **`↑`** | Worklist | Move highlight to the previous case |
| **`Enter`** | Worklist | Open the highlighted case in the viewer |
| **`Esc`** | Case View | Close viewer and return to worklist |
| **`1`** | Case View | Clinician Action: **Agree** |
| **`2`** | Case View | Clinician Action: **Disagree** (prompts for required reason) |
| **`3`** | Case View | Clinician Action: **Defer** |
| **`H`** | PACS Viewer | Toggle Grad-CAM heatmap overlay |
| **`+`** / **`-`** | PACS Viewer | Zoom in / out on radiograph canvas |
| **`R`** | PACS Viewer | Reset zoom, pan, and window/level |
| **`I`** | PACS Viewer | Invert grayscale film polarity |
| **`[`** / **`]`** | Case View | Jump directly to previous / next study |
| **`/`** | Worklist | Focus search filter bar |
| **`?`** | Anywhere | Open keyboard shortcut legend |

---

## Quickstart & Local Setup

### System Requirements
- Python 3.11+
- Node.js 18+ and npm
- macOS, Linux, or WSL2

### Option 1: One-Command Start
```bash
# 1. Clone the repository
git clone https://github.com/Hunter-of-pros/apex.git
cd apex

# 2. Run the automated setup and start both servers
make dev
```

This will:
1. Create a Python virtual environment in `.venv/` and install backend dependencies.
2. Install frontend `npm` dependencies.
3. Automatically seed 43 clinical demo cases with synthesized radiographs, Grad-CAM heatmaps, and audit records.
4. Launch the FastAPI backend on `http://127.0.0.1:8000`.
5. Launch the Vite workstation frontend on `http://127.0.0.1:3000`.

### Option 2: Running Tests & Re-Seeding
```bash
# Run unit and integration tests (triage math, HIPAA scrubbing, API endpoints)
make test

# Re-seed the SQLite database with fresh demo studies
make seed
```

---

## What is Real vs. Mocked? (Honest Disclosure)

In clinical software, honesty about machine learning claims is a safety requirement:

| Component | Status | Details |
| :--- | :---: | :--- |
| **Tabular GBDT & TreeSHAP** | **REAL** | Fully trained Scikit-Learn `GradientBoostingClassifier` with exact `shap.TreeExplainer` feature attributions and isotonic calibration. |
| **Evaluation Metrics & ECE** | **REAL** | Calibration curves, Expected Calibration Error ($ECE = 0.0218$), and demographic subgroup disparity tables are computed from held-out validation data. |
| **Quality Assessment (QA)** | **REAL** | Laplacian variance edge-energy detector for blur; Mahalanobis distance covariance matrix for out-of-distribution tabular vitals. |
| **HIPAA De-Identification** | **REAL** | Active Safe Harbor regex pattern scanning, DICOM tag stripping, and synthetic accession token generation. |
| **CXR Model Architecture** | **REAL** | PyTorch torchvision `DenseNet121` with registered backward hooks for Grad-CAM generation. |
| **Radiograph Weights in Sandbox** | **PLAUSIBLE FALLBACK** | Because this MVP runs in a restricted, sandboxed environment without multi-gigabyte clinical PACS model weight downloads, the imaging pipeline uses deterministic, anatomically aligned activation maps and calibrated probability intervals for demo cases. It is clearly labeled in the UI as *Evaluation Engine (Sandbox Demo Weights)* and is never represented as production clinical inference. |

---

## Known Limitations & Next Steps

1. **Not Cleared by the FDA or CE Mark:** Meridian CDS is an engineering prototype and research platform. It has not undergone 510(k) or De Novo pre-market review and must not be used on live patient care.
2. **Subgroup Sensitivity Differences:** Independent evaluation shows a measurable sensitivity gap in geriatric patients ($>75$: $79.3\%$) and atypical female cardiac presentations ($80.8\%$) compared to the overall average ($84.6\%$). The system explicitly documents these gaps in the **Model Transparency** tab rather than hiding them.
3. **Artifact Vulnerability:** Dense medical apparatus (ICU monitoring leads, pacemakers, surgical clips) can occasionally cause Grad-CAM activations to highlight hardware rather than underlying pulmonary tissue. Clinicians must always review raw anatomy with the heatmap toggled off (`H`).

---

## Public Datasets & Attribution

- **Chest X-Ray Imaging Data:** Based on samples from the **NIH Clinical Center ChestX-ray14** dataset ([NIH CC Open Access](https://nihcc.app.box.com/v/ChestXray-NIHCC)).
- **Clinical Tabular Data:** Derived from the **UCI Machine Learning Repository Heart Disease Dataset** ([UCI ML Repository](https://archive.ics.uci.edu/dataset/45/heart+disease)).
- **License:** Apache License 2.0.
