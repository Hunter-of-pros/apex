"""
Clinical Input Quality and Artifact Detection Engine (Meridian CDS)

Inspects incoming data before inference:
1. Radiograph Blur Detection: Laplacian variance kernel inspection.
2. Dynamic Range / Contrast Deficiency: Histogram distribution checks.
3. Tabular Out-of-Distribution (OOD) Vitals: Physiologic range checks.
"""

import numpy as np
from PIL import Image
from typing import Tuple, Optional, Dict, Any


def assess_image_quality(img: Image.Image) -> Tuple[bool, float, Optional[str]]:
    """
    Evaluates radiograph quality.
    Returns: (is_low_quality, blur_metric, failure_reason)
    """
    # Convert to grayscale numpy array
    gray = img.convert("L")
    arr = np.array(gray, dtype=np.float32)

    # 1. Dynamic range / Exposure clipping check
    hist, _ = np.histogram(arr, bins=16, range=(0, 256))
    pct_clipped = (hist[0] + hist[-1]) / float(arr.size)
    if pct_clipped > 0.65:
        return True, 12.0, "Severe exposure clipping / sub-optimal dynamic range"

    # 2. Laplacian variance blur estimation
    # Discrete 3x3 Laplacian kernel
    kernel = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float32)
    # Fast 2D convolution via spatial slice differences
    laplacian = (
        arr[:-2, 1:-1] + arr[2:, 1:-1] +
        arr[1:-1, :-2] + arr[1:-1, 2:] -
        4.0 * arr[1:-1, 1:-1]
    )
    variance = float(np.var(laplacian))

    # Threshold: radiographs with variance < 45 typically exhibit severe motion blur
    # or heavy post-processing smoothing artifacts
    if variance < 45.0:
        return True, round(variance, 2), f"Degraded resolution / motion blur (Laplacian variance: {round(variance, 1)})"

    return False, round(variance, 2), None


def assess_tabular_quality(data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Checks for physiologically implausible or extreme out-of-distribution values.
    """
    age = data.get("age")
    if age is not None and (age < 1 or age > 115):
        return True, f"Physiologically implausible age: {age}"

    bp = data.get("resting_bp")
    if bp is not None and (bp < 45 or bp > 280):
        return True, f"Out-of-distribution systolic blood pressure: {bp} mmHg"

    chol = data.get("cholesterol")
    if chol is not None and (chol < 60 or chol > 650):
        return True, f"Extreme out-of-distribution serum cholesterol: {chol} mg/dL"

    fbs = data.get("fasting_blood_sugar")
    if fbs is not None and (fbs < 30 or fbs > 500):
        return True, f"Critical glucose variance: {fbs} mg/dL"

    hr = data.get("max_heart_rate")
    if hr is not None and (hr < 30 or hr > 240):
        return True, f"Extreme cardiac rate: {hr} bpm"

    return False, None
