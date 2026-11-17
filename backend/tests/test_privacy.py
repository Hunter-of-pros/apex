"""
Unit tests for Privacy & PHI De-identification engine
"""

import io
import pytest
from PIL import Image
from backend.app.privacy.deid import (
    sanitize_image_bytes,
    validate_and_scrub_tabular_payload,
    PHIViolationError,
    generate_deidentified_identifiers
)


def test_sanitize_image_strips_metadata():
    # Create an in-memory image with synthetic metadata
    img = Image.new("RGB", (256, 256), color=(128, 128, 128))
    buffer = io.BytesIO()
    # Save with PNG info chunk containing simulated PHI
    from PIL.PngImagePlugin import PngInfo
    info = PngInfo()
    info.add_text("PatientName", "DOE^JOHN")
    info.add_text("PatientID", "123456789")
    info.add_text("InstitutionName", "Memorial Hospital")
    img.save(buffer, format="PNG", pnginfo=info)
    raw_bytes = buffer.getvalue()

    # Sanitize
    clean_bytes, scrub_report = sanitize_image_bytes(raw_bytes)

    assert scrub_report["stripped_tags_count"] > 0
    assert "IMG-DEID-" in scrub_report["deidentified_uid"]

    # Re-open sanitized image and verify info metadata is empty of PHI
    with Image.open(io.BytesIO(clean_bytes)) as inspected_img:
        assert "PatientName" not in inspected_img.info
        assert "PatientID" not in inspected_img.info
        assert "InstitutionName" not in inspected_img.info


def test_tabular_accepts_clean_clinical_payload():
    clean_data = {
        "age": 62,
        "sex": "M",
        "resting_bp": 142,
        "cholesterol": 245,
        "fasting_blood_sugar": 120,
        "max_heart_rate": 138,
        "st_depression": 1.8
    }
    scrubbed, report = validate_and_scrub_tabular_payload(clean_data)
    assert report["status"] == "PASSED_HIPAA_SAFE_HARBOR"
    assert scrubbed["age"] == 62
    assert scrubbed["resting_bp"] == 142
    assert "ACC-TAB-" in report["synthetic_accession"]


def test_tabular_rejects_direct_identifier_keys():
    bad_data = {
        "age": 55,
        "patient_name": "Jane Doe",
        "cholesterol": 210
    }
    with pytest.raises(PHIViolationError) as exc_info:
        validate_and_scrub_tabular_payload(bad_data)
    assert "patient_name" in str(exc_info.value)


def test_tabular_rejects_ssn_pattern():
    bad_data = {
        "age": 58,
        "notes": "Patient SSN is 000-12-3456, prior bypass"
    }
    with pytest.raises(PHIViolationError) as exc_info:
        validate_and_scrub_tabular_payload(bad_data)
    assert "SSN" in str(exc_info.value)


def test_synthetic_identifier_generation():
    acc, pt = generate_deidentified_identifiers("CXR")
    assert acc.startswith("ACC-CXR-")
    assert pt.startswith("PT-")
    assert len(acc) >= 12
    assert len(pt) >= 6
