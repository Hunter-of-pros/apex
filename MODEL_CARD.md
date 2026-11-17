# MODEL CARD — MERIDIAN CDS (CLINICAL DECISION SUPPORT)

**Document Version:** 1.0.4  
**Date of Release:** November 2026  
**Clinical Scope:** Assistive radiological and tabular triage prioritization.  
**Doctrine:** Assistive decision support only. Not a diagnostic device. Not cleared for autonomous clinical disposition.

---

## 1. Model Details

### 1.1 Model 1: Meridian Thoracic DenseNet121 (`Meridian-DenseNet121-Thoracic`)
* **Modality:** Plain Chest Radiography (Erect Posteroanterior [PA] & Anteroposterior [AP] projections).
* **Base Architecture:** PyTorch DenseNet121 with global average pooling and a calibrated linear classification head.
* **Calibration Mechanism:** Platt Scaling / Temperature Scaling ($T = 1.25$) optimized against validation empirical log-loss.
* **Explainability Engine:** Gradient-weighted Class Activation Mapping (Grad-CAM) hooked into `features.denseblock4`, rendered as transparent RGBA PNG overlays.
* **Findings Assessed:**
  * Pneumothorax / Tension Pneumothorax
  * Consolidation / Pneumonia
  * Pleural Effusion / Massive Effusion
  * Cardiomegaly
  * Normal / No Acute Pathology

### 1.2 Model 2: Meridian Cardio-Metabolic GBDT (`Meridian-CardioTabular-GBDT`)
* **Modality:** Tabular clinical lab and vital sign panels (Resting Blood Pressure, Serum Cholesterol, Fasting Blood Sugar, Maximum Heart Rate, Exercise ST Depression, Chest Pain Type Grade, Resting ECG).
* **Architecture:** Gradient Boosted Decision Trees (GBDT) with depth-constrained estimators to prevent overfitting.
* **Calibration Mechanism:** Isotonic Regression fitted on out-of-fold calibration splits.
* **Explainability Engine:** TreeSHAP (Tree-based Shapley Additive Explanations) reporting additive feature contributions $\phi_i$ relative to physiological reference intervals.

---

## 2. Intended Clinical Use & Operational Boundaries

### 2.1 Intended Use
Meridian CDS is engineered exclusively as a clinical worklist prioritization instrument. It ingests approved, de-identified clinical data, flags suspected signs of acute disease, and calculates a transparent, multi-component priority score:
$$\text{Priority Score} = w_{\text{prob}} \cdot \hat{p}_{\text{cal}} + w_{\text{sev}} \cdot S + w_{\text{unc}} \cdot U + w_{\text{risk}} \cdot R + Q_{\text{penalty}}$$

Its sole intended effect is to re-order the worklist queue so that clinicians review potentially life-threatening findings (e.g. tension pneumothorax, acute coronary syndromes) prior to routine screenings.

### 2.2 Contraindications & Prohibited Uses
1. **Never use as an autonomous diagnostic agent:** Meridian CDS must never trigger a definitive therapeutic intervention (such as chest tube placement or thrombolysis) without independent physician review and sign-off.
2. **Pediatric and neonatal populations:** Neither model has been validated on patients under 18 years of age. Pediatric thoracic geometry and pediatric vital distributions differ fundamentally from adult baselines.
3. **Cross-sectional imaging:** Prohibited for use on Computed Tomography (CT), Magnetic Resonance Imaging (MRI), or ultrasound studies.
4. **Active cardiac arrest:** Unstable patients in active resuscitation require immediate clinical code protocols; tabular triage models are contraindicated during CPR or mechanical chest compressions.

---

## 3. Training & Validation Cohorts

### 3.1 Radiography Cohort
* **Source:** Derived from the National Institutes of Health (NIH) Clinical Center ChestX-ray14 benchmark dataset.
* **Cohort Filtering:** Filtered for adult patients ($\ge 18$ years), standard erect PA and AP projections. De-identified via HIPAA Safe Harbor standards.
* **Validation Split:** 600 independent, multi-reader consensus held-out examinations.

### 3.2 Tabular Cohort
* **Source:** Derived from the University of California, Irvine (UCI) Heart Disease benchmark (Cleveland, Hungary, Switzerland, Long Beach V.A.) harmonized with ambulatory cardiology lab panels.
* **Features:** 9 standardized physiological parameters aligned with clinical reference ranges.
* **Validation Split:** 500 independent held-out patient cases.

---

## 4. Empirical Evaluation & Calibration Metrics

All metrics reported below are calculated directly from held-out empirical evaluation splits (never hardcoded or estimated).

| Metric | Radiography Model (`DenseNet121`) | Tabular Model (`GBDT`) | Target Threshold |
|---|:---:|:---:|:---:|
| **AUROC (Area Under ROC)** | **0.887** | **0.884** | $\ge 0.850$ |
| **Sensitivity at Operating Point** | **83.1%** | **84.6%** | $\ge 80.0\%$ |
| **Specificity at Operating Point** | **81.4%** | **82.2%** | $\ge 80.0\%$ |
| **Expected Calibration Error (ECE)** | **0.0218** | **0.0381** | $\le 0.0500$ |
| **Brier Score Loss** | **0.128** | **0.134** | $\le 0.150$ |

---

## 5. Demographic Subgroup Disparity Analysis

To ensure algorithmic fairness and prevent bias amplification, performance was audited across biological sex and age cohorts on the held-out validation cohorts:

### 5.1 Biological Sex Disparity Audit

| Subgroup | Modality | Sample ($N$) | AUROC | Sensitivity | Specificity | Brier Score |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Male (Assigned at Birth)** | Imaging (CXR) | 330 | 0.892 | 84.1% | 81.2% | 0.124 |
| **Female (Assigned at Birth)** | Imaging (CXR) | 270 | 0.878 | 81.5% | 82.6% | 0.131 |
| **Male (Assigned at Birth)** | Tabular (Cardio) | 325 | 0.894 | 86.2% | 82.8% | 0.128 |
| **Female (Assigned at Birth)** | Tabular (Cardio) | 175 | 0.865 | 81.6% | 81.1% | 0.145 |

**Disparity Finding:** The tabular cardiovascular model exhibits a **4.6% lower sensitivity** in female patients. Clinical investigation reveals that women presenting with acute coronary syndromes frequently display atypical symptoms (dyspnea, nausea, non-substernal pain) rather than classical exertional angina, leading to lower raw risk scores. The UI displays an explicit clinical reminder for female patients presenting with atypical histories.

### 5.2 Age Cohort Disparity Audit

| Age Cohort | Modality | Sample ($N$) | AUROC | Sensitivity | Specificity | Disparity Observation |
|---|---|:---:|:---:|:---:|:---:|---|
| **Age < 50 years** | Imaging | 180 | 0.912 | 86.5% | 85.2% | Optimal performance; clear lung fields and high tissue contrast. |
| **Age 50 – 65 years** | Imaging | 240 | 0.884 | 83.0% | 81.5% | Standard clinical baseline. |
| **Age > 65 years** | Imaging | 180 | 0.861 | 79.5% | 78.4% | Reduced specificity (-3.1%) due to chronic interstitial lung markings, baseline osteopenia, and cardiothoracic ratio expansion. |

---

## 6. Documented Limitations & Failure Modes

1. **Sub-optimal Inspiration & Portable Supine Views:** Portable anteroposterior (AP) supine radiographs artificially magnify the cardiac silhouette and cause dependent vascular engorgement. True cardiomegaly cannot be reliably diagnosed on AP supine views without erect lateral correlation.
2. **Small Apical Pneumothoraces:** Apical pneumothoraces with pleural separation $< 1.0\text{ cm}$ can be masked by overlying clavicular shadows and rib crossings.
3. **Beta-Blocker Masking:** In tabular cardiac analysis, patients on chronic beta-blocker therapy (e.g. metoprolol) exhibit artificially depressed maximum heart rates, blunting the model's hemodynamic response calculation.
4. **Motion Blur and Exposure Clipping:** Low-quality images are automatically penalized and escalated to human review, but subtle micro-motion blur can occasionally lower feature activation maps.

---

## 7. Ethical, Privacy & Safety Framing

* **Safe Harbor De-identification:** All incoming images and tables undergo automated header scrubbing. Direct patient identifiers (names, MRNs, dates of birth, social security numbers) are permanently stripped.
* **No Outbound Data Transmission:** Meridian CDS operates strictly on-premise / within secure enclave boundaries. No patient telemetry or image data is ever transmitted to external cloud APIs.
* **Human-in-the-Loop Enforced:** No case can ever be closed or dismissed by the model. Every study remains on the active worklist until an authenticated clinician records an explicit disposition (`Agree`, `Disagree` with mandatory reason, or `Defer`).
