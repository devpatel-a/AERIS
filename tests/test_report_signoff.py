"""Report dual sign-off: each slot needs its clearance role; the maintenance signature approves."""

from __future__ import annotations

from fastapi.testclient import TestClient

from aerotwin.api.main import app

ALPHA = {"operator_id": "MIL-9842-ALPHA", "pin": "20250704"}  # demo roster: holds all three roles


def _token(client: TestClient, role: str) -> dict[str, str]:
    r = client.post("/api/auth/login", json={**ALPHA, "role": role, "tail_id": "UAV-07"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_signoff_slots_enforce_roles_and_approve():
    with TestClient(app) as client:
        created = client.post("/api/reports", json={"report_type": "fleet"}, headers=_token(client, "uav_operator"))
        assert created.status_code == 200, created.text
        rid = created.json()["report_id"]

        # Wrong role for the engineering slot; no session at all is rejected too.
        assert client.post(f"/api/reports/{rid}/sign", json={"slot": "engineering"}, headers=_token(client, "uav_operator")).status_code == 403
        assert client.post(f"/api/reports/{rid}/sign", json={"slot": "engineering"}).status_code == 401

        eng = client.post(f"/api/reports/{rid}/sign", json={"slot": "engineering"}, headers=_token(client, "propulsion_engineer"))
        assert eng.status_code == 200
        body = eng.json()
        assert body["signed_by"] == "Flight-Line Alpha" and body["signer_operator_id"] == "MIL-9842-ALPHA"
        assert len(body["signature_sha256"]) == 64 and body["maint_signed_by"] is None

        maint = client.post(f"/api/reports/{rid}/sign", json={"slot": "maintenance"}, headers=_token(client, "maint_tech")).json()
        assert maint["maint_signature_sha256"] and maint["maint_signature_sha256"] != body["signature_sha256"]
        assert maint["status"] == "APPROVED"

        view = client.get(f"/api/reports/{rid}").json()
        assert view["pdf_pages"] >= 1 and view["software_version"]
