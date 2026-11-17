"""
Integration tests for Meridian CDS API
"""

import pytest
from httpx import AsyncClient, ASGITransport
import io
from PIL import Image

from backend.app.main import app


@pytest.mark.anyio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "operational"
        assert "Meridian CDS" in data["system"]


@pytest.mark.anyio
async def test_list_cases_and_filtering():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # All cases
        resp = await ac.get("/api/cases")
        assert resp.status_code == 200
        cases = resp.json()
        assert len(cases) >= 40

        # Filter by modality: CXR
        resp_cxr = await ac.get("/api/cases?modality=imaging_cxr")
        assert resp_cxr.status_code == 200
        cxr_cases = resp_cxr.json()
        assert len(cxr_cases) > 0
        assert all(c["modality"] == "imaging_cxr" for c in cxr_cases)

        # Filter by tier: CRITICAL
        resp_crit = await ac.get("/api/cases?priority_tier=CRITICAL")
        assert resp_crit.status_code == 200
        crit_cases = resp_crit.json()
        assert len(crit_cases) > 0
        assert all(c["priority_tier"] == "CRITICAL" for c in crit_cases)


@pytest.mark.anyio
async def test_case_detail():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Fetch first case
        list_resp = await ac.get("/api/cases")
        case_id = list_resp.json()[0]["id"]

        detail_resp = await ac.get(f"/api/cases/{case_id}")
        assert detail_resp.status_code == 200
        data = detail_resp.json()
        assert data["id"] == case_id
        assert "findings" in data
        assert len(data["findings"]) > 0
        assert "triage_breakdown" in data


@pytest.mark.anyio
async def test_clinician_action_recording():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        list_resp = await ac.get("/api/cases?status=unreviewed")
        unreviewed = list_resp.json()
        assert len(unreviewed) > 0
        case_id = unreviewed[0]["id"]

        # 1. Disagree without reason should fail with 422
        bad_action = await ac.post(
            f"/api/cases/{case_id}/action",
            json={"action": "DISAGREE", "disagree_reason": ""}
        )
        assert bad_action.status_code == 422

        # 2. Valid AGREE
        good_action = await ac.post(
            f"/api/cases/{case_id}/action",
            json={
                "action": "AGREE",
                "clinical_notes": "Prioritization clinically verified.",
                "clinician_id": "DR-TEST-SUITE"
            }
        )
        assert good_action.status_code == 200
        updated_case = good_action.json()
        assert updated_case["status"] == "actioned"


@pytest.mark.anyio
async def test_transparency_metrics_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/transparency")
        assert resp.status_code == 200
        models = resp.json()
        assert len(models) == 2  # CXR and Tabular

        cxr_mod = next(m for m in models if m["modality"] == "imaging_cxr")
        assert cxr_mod["overall_auroc"] > 0.70
        assert len(cxr_mod["calibration_curve"]) > 0
        assert len(cxr_mod["roc_curve"]) > 0
        assert len(cxr_mod["subgroup_metrics"]) > 0


@pytest.mark.anyio
async def test_audit_log_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/audit")
        assert resp.status_code == 200
        events = resp.json()
        assert len(events) > 0
        assert any("STUDY_INGESTED" in e["event_type"] for e in events)


@pytest.mark.anyio
async def test_tabular_ingest_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "age": 63,
            "sex": "M",
            "resting_bp": 154,
            "cholesterol": 260,
            "fasting_blood_sugar": 125,
            "max_heart_rate": 142,
            "st_depression": 2.1,
            "chest_pain_type": 3,
            "resting_ecg": 1,
            "clinical_history": "Referred from urgent care for exertional angina"
        }
        resp = await ac.post("/api/ingest/tabular", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["modality"] == "tabular_clinical"
        assert data["priority_score"] > 0
        assert data["accession_number"].startswith("ACC-TAB-")
