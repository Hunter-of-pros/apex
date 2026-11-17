# MERIDIAN CDS — DESIGN SYSTEM SPECIFICATION (DESIGN.md)

**Product Name:** Meridian CDS (Clinical Decision-Support & Diagnostic Triage System)  
**System Purpose:** Calibrated clinical worklist prioritization and decision-support for multi-modal healthcare data (radiology and clinical tabulations).  
**Core Safety Doctrine:** Meridian CDS is an assistive prioritization instrument, not an autonomous diagnostic agent. The attending clinician retains total diagnostic authority. The interface enforces this through behavioral constraints, transparent scoring breakdowns, explicit uncertainty bars, and an immutable audit trail.

---

## 1. Design Philosophy & Aesthetic Intent

Meridian CDS is styled as a serious clinical instrument: a high-density, calm, and trustworthy workstation operating at the intersection of a modern picture archiving and communication system (PACS) and an edited scientific journal.

* **Dignity over novelty:** No consumer SaaS tropes, no floating card drops, no decorative gradients, and no generic AI iconography.
* **Density and legibility:** Data is compact, high-contrast, and aligned to a strict 4px grid. Radiologists and triage clinicians process dozens of cases per hour; every pixel must serve clinical comprehension.
* **Uncertainty as a first-class citizen:** We never display isolated point predictions (e.g. "94% Pneumonia"). Every probability is accompanied by a confidence interval bar and calibration context.
* **Persistent safety framing:** An unobtrusive, hairline-bordered safety perimeter is present on every viewport:  
  `DECISION SUPPORT INSTRUMENT — NOT A DIAGNOSTIC DEVICE. CLINICIAN REVIEW AND FINAL DISPOSITION REQUIRED.`

---

## 2. Design Tokens

### 2.1 Color Palette

The interface employs a dual-surface architecture:
1. **PACS Dark Surface (`--surface-viewer`):** Deep, neutral slate-blacks engineered for high-contrast radiological inspection in subdued ambient lighting.
2. **Workstation Neutral Surface (`--surface-workstation`):** Warm, low-fatigue slate-neutrals with subtle 1px hairline separators.

```css
:root {
  /* Surface Tokens (Workstation Base) */
  --bg-primary: #0e1015;
  --bg-secondary: #151820;
  --bg-tertiary: #1c202a;
  --bg-elevated: #242936;
  --bg-subtle: #12141a;

  /* Hairline Border Tokens */
  --border-subtle: #262c3a;
  --border-strong: #384155;
  --border-focus: #3b82f6;

  /* Typography Colors */
  --text-primary: #f1f3f7;
  --text-secondary: #9da6b8;
  --text-muted: #647087;
  --text-inverse: #090a0d;

  /* Monochrome & Radiological Greys */
  --mono-50: #fafaf9;
  --mono-100: #f5f5f4;
  --mono-300: #d6d3d1;
  --mono-500: #78716c;
  --mono-700: #44403c;
  --mono-900: #1c1917;

  /* Single Interaction Accent (Surgical Cobalt) */
  --accent-base: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-subtle: rgba(37, 99, 235, 0.12);
  --accent-contrast: #ffffff;

  /* Clinical Urgency Spectrum (Accessible 4-Tier Scale) */
  --urgency-critical-fg: #f87171;
  --urgency-critical-bg: rgba(239, 68, 68, 0.14);
  --urgency-critical-border: #ef4444;

  --urgency-high-fg: #fbbf24;
  --urgency-high-bg: rgba(245, 158, 11, 0.14);
  --urgency-high-border: #f59e0b;

  --urgency-moderate-fg: #60a5fa;
  --urgency-moderate-bg: rgba(37, 99, 235, 0.14);
  --urgency-moderate-border: #3b82f6;

  --urgency-routine-fg: #94a3b8;
  --urgency-routine-bg: rgba(148, 163, 184, 0.10);
  --urgency-routine-border: #64748b;

  /* Quality & Degraded Input Tokens */
  --quality-alert-fg: #e879f9;
  --quality-alert-bg: rgba(217, 70, 239, 0.12);
  --quality-alert-border: #d946ef;
}
```

### 2.2 Typography Scale

* **Primary Interface Font:** `IBM Plex Sans`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`.
* **Data, Identifiers & Numerics Font:** `JetBrains Mono`, `IBM Plex Mono`, `monospace`.
* All numerical displays enforce tabular figures: `font-feature-settings: "tnum" 1`.

| Token | Size | Line Height | Weight | Tracking | Primary Application |
|---|---|---|---|---|---|
| `text-2xs` | 10px / 0.625rem | 14px | 500 / 600 | +0.06em (Caps) | Urgency badges, status chips, table column headers |
| `text-xs` | 11px / 0.6875rem | 16px | 400 / 500 | +0.02em | Secondary metadata, accession IDs, audit timestamps |
| `text-sm` | 13px / 0.8125rem | 18px | 400 / 500 | 0.00em | Worklist row text, findings list, lab parameters |
| `text-base` | 14px / 0.875rem | 20px | 400 / 600 | -0.01em | Body prose, modal instructions, clinician notes |
| `text-lg` | 16px / 1.000rem | 22px | 600 | -0.02em | Section titles, viewer toolbar headers |
| `text-xl` | 20px / 1.250rem | 26px | 600 | -0.02em | Case accession title, modal headline |

### 2.3 Spacing & Layout Rhythm

* Base grid multiplier: **4px**.
* Standard spacing increments: `2px`, `4px`, `8px`, `12px`, `16px`, `24px`, `32px`.
* Layout divisions: Strict 1px hairline dividers (`--border-subtle`). Cards do not use drop-shadows or heavy paddings; sections are delimited by structured borders and alternating background tones.

### 2.4 Border Radius

* `rounded-none` (0px): Worklist table cells, viewer canvas container, split view frames.
* `rounded-xs` (2px): Buttons, input fields, urgency glyph indicators, slider thumbs.
* `rounded-sm` (3px): Modals, dropdown menus, toast notifications.
* **Explicit rule:** No border-radius larger than 4px anywhere in the application.

---

## 3. Four-Tier Clinical Urgency Scale

To guarantee accessibility for all clinicians (including anomalous trichromacy and dichromacy color blindness), **color is never used as the sole carrier of urgency**. Every tier pairs an explicit geometric glyph, a textual classification, and a designated hue.

| Urgency Tier | Glyph | Primary Indication | Calibrated Probability Range / Clinical Trigger | Visual Token Set |
|---|:---:|---|---|---|
| **Tier 1 — CRITICAL** | `◆` (Filled Diamond) | Emergent / Life-threatening finding requiring immediate stat review (e.g. Tension Pneumothorax, Acute Cardiogenic Shock). | Calibrated Score $\ge 0.80$ or High Severity with high confidence. | Vermilion red (`--urgency-critical-fg`), solid diamond, bold uppercase label. |
| **Tier 2 — HIGH** | `▲` (Filled Triangle) | Acute abnormality requiring priority assessment within current shift (e.g. Consolidation / Lobar Pneumonia, Severe Pleural Effusion). | Calibrated Score $0.55 - 0.79$. | Ochre amber (`--urgency-high-fg`), upright triangle. |
| **Tier 3 — MODERATE** | `■` (Filled Square) | Sub-acute finding, guarded chronic risk, or significant clinical flag (e.g. Cardiomegaly, elevated fasting glucose). | Calibrated Score $0.30 - 0.54$. | Slate blue (`--urgency-moderate-fg`), square. |
| **Tier 4 — ROUTINE** | `●` (Filled Circle) | Low suspicion of acute pathology, stable baseline, or normal study. | Calibrated Score $< 0.30$. | Neutral steel grey (`--urgency-routine-fg`), circle. |
| **QUALITY ALERT** | `⚑` (Flag) | Degraded acquisition, severe blur, low dynamic range, or out-of-distribution tabular values. Automatically escalates case for manual clinician review. | Quality variance index below validation threshold ($< 40$). | Magenta violet (`--quality-alert-fg`), flag icon. |

---

## 4. Component Inventory

### 4.1 Global Clinical Header & Safety Banner
* **Safety Perimeter:** Top-level continuous 24px bar with 1px bottom border. Crisp monospace disclaimer: `ASSISTIVE DECISION SUPPORT SYSTEM — NOT A DIAGNOSTIC DEVICE. ATTENDING CLINICIAN REVIEW REQUIRED.`
* **Environment Banner:** Visible indication if system is running in `VALIDATION MOCK MODE` or `LIVE INFERENCE MODE`.
* **Primary Navigation:** Minimalist tab navigation (`Worklist`, `Model Transparency & Metrics`, `Audit Trail`, `Ingest Study`).

### 4.2 Worklist View
* **Filters Toolbar:** Modality selector (`All`, `Chest Radiograph (CXR)`, `Clinical Tabular`), Urgency filter, Review status (`Unreviewed`, `In Review`, `Actioned`), Quality alert toggle, Search by Case ID/Accession.
* **Keyboard Shortcut Legend:** Floating or docked HUD showing active shortcuts (`J`/`K` navigation, `Enter` to open, `1`/`2`/`3` for Agree/Disagree/Defer, `H` for heatmap, `+/-` for viewer zoom).
* **Worklist Table:**
  * Columns: Tier Glyph + Name, Accession ID, Age/Sex, Modality, Top Flagged Finding, Calibrated Confidence Interval Bar, Quality Status, Ingest Time, Review Status.
  * Interactive row highlighting with keyboard cursor indicator.

### 4.3 Radiological Viewer (PACS Canvas)
* **Canvas Area:** 100% dark backdrop (`#050608`).
* **Interactive Tooling:**
  * Zoom (`0.25x` to `4.0x`) with pan reset.
  * Window/Level (Brightness / Contrast adjustments).
  * Color Inversion (positive/negative film mode).
  * Grad-CAM Heatmap Overlay: Transparent RGBA PNG overlay with dynamic alpha slider (`0%` to `100%`) and togglable heatmap layer (`H`).
* **DICOM Orientation Indicators:** Right/Left and Superior/Inferior anatomic markers (`R`, `L`, `S`, `I`).

### 4.4 Clinical Decision Support (CDS) Findings Panel
* **Triage Score Breakdown:** Mathematical decomposition of the ranking:
  $$\text{Priority} = w_{\text{prob}} \cdot P(x) + w_{\text{sev}} \cdot S + w_{\text{unc}} \cdot U + w_{\text{risk}} \cdot R$$
* **Findings Matrix:** Per-finding entry with calibrated probability, 95% confidence interval graphic, and clinical anatomical description.
* **Tabular Feature Waterfall:** For tabular studies, SVG horizontal bar chart presenting SHAP feature impacts alongside clinical reference intervals.

### 4.5 Clinician Disposition Deck
* **Action Buttons:**
  * `[1] Agree`: Confirms model prioritization and flags case for routine archival.
  * `[2] Disagree`: Reclassifies model findings. **Mandatory reason modal** (`False Positive`, `Anatomic Variant`, `Overestimated Severity`, `Artifact / Noise`, `Alternative Diagnosis`, `Other`).
  * `[3] Defer / Second Opinion`: Escalates case to senior attending or sub-specialist.
  * `Override Tier`: Allows clinician to manually elevate or demote urgency tier.
* **Clinical Notes Box:** Rapid markdown-free clinician impression text.

### 4.6 Model Transparency & Scientific Evaluation Suite
* **Model Card:** Formal clinical AI documentation detailing intended use, contraindications, training cohort, and validation methodologies.
* **Scientific Calibration Curves:** SVG plot contrasting predicted risk deciles against observed empirical event rates, including calculated Expected Calibration Error (ECE).
* **Receiver Operating Characteristic (ROC):** Plot of True Positive Rate vs False Positive Rate across thresholds with operating point markers.
* **Subgroup Performance Matrix:** Tabular breakdown of AUROC, Sensitivity, and Specificity across biological sex and age cohorts ($<50$, $50-65$, $>65$).

### 4.7 Audit Trail & Event Ledger
* Monospace event ledger logging: Ingestion, Preprocessing/PHI Scrubbing, Model Inference, Clinician Opens, Actions, Disagreement Justifications, and Re-prioritizations.

---

## 5. Three Explicit "We Will Not Do" Rules

1. **WE WILL NOT display raw, uncalibrated, point-estimate probabilities as hero statistics.**  
   We will never show a standalone "94%" badge without an accompanying confidence interval, calibration context, and uncertainty categorization. Point estimates without uncertainty induce automation bias and erode clinical judgment.

2. **WE WILL NOT permit automated case closure, dismissal, or triage auto-filtering.**  
   The system shall never automatically mark a case as resolved, discard a routine study, or bury an ambiguous study. Case reordering is strictly assistive; every study remains in the worklist until an authenticated human clinician signs off.

3. **WE WILL NOT use consumer SaaS or generic AI design tropes.**  
   We will not use decorative drop-shadows, pastel gradients, celebratory microcopy ("Great job! All caught up!"), floating AI sparkle icons (`✨`), or chat-assistant personas. Meridian CDS is an unembellished, high-density scientific instrument.
