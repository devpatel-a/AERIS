"""Tests for the FastAPI backend using TestClient."""

from __future__ import annotations

import time

from fastapi.testclient import TestClient

from aerotwin.api.main import app
from aerotwin.api.security import API_TOKEN, sign_telemetry_packet, verify_telemetry_packet

AUTH = {"Authorization": f"Bearer {API_TOKEN}"}


def test_list_engines_and_missions():
    """The public engines/missions endpoints should list the registries' contents."""
    with TestClient(app) as client:
        engines = client.get("/api/engines").json()
        assert "rotax914_like" in engines
        missions = client.get("/api/missions").json()
        assert "isr_18h_endurance" in missions


def test_protected_endpoint_requires_token():
    """Starting a session without a bearer token should be rejected."""
    with TestClient(app) as client:
        resp = client.post("/api/live/start", json={"engine_id": "rotax914_like", "mission_id": "isr_18h_endurance"})
        assert resp.status_code == 401


def test_live_session_start_stop_and_health_latest():
    """Starting a LIVE session should populate the buffer; stopping should persist and clear it."""
    with TestClient(app) as client:
        start = client.post(
            "/api/live/start",
            json={"engine_id": "rotax914_like", "mission_id": "rapid_throttle_transitions", "speed": 500.0},
            headers=AUTH,
        )
        assert start.status_code == 200
        run_id = start.json()["run_id"]

        time.sleep(0.5)  # let the background loop push a few rows
        latest = client.get("/api/health/latest")
        assert latest.status_code == 200
        assert "t_s" in latest.json()

        history = client.get("/api/health/history", params={"seconds": 10.0})
        assert history.status_code == 200
        assert isinstance(history.json(), list)

        deg = client.get("/api/degradation_state")
        assert deg.status_code == 200
        assert "cooling_effectiveness" in deg.json()

        stop = client.post("/api/live/stop", headers=AUTH)
        assert stop.status_code == 200

        advisories = client.get("/api/advisories", params={"mission_run_id": run_id})
        assert advisories.status_code == 200


def test_inject_fault_requires_active_session():
    """Injecting a fault with no active session should 400."""
    with TestClient(app) as client:
        resp = client.post(
            "/api/faults/inject",
            json={"fault_type": "cooling_degradation", "severity": 0.5},
            headers=AUTH,
        )
        assert resp.status_code == 400


def test_inject_fault_on_active_session():
    """Injecting a fault on a running session should succeed and be reflected in the injector."""
    with TestClient(app) as client:
        client.post(
            "/api/live/start",
            json={"engine_id": "rotax914_like", "mission_id": "rapid_throttle_transitions", "speed": 500.0},
            headers=AUTH,
        )
        resp = client.post(
            "/api/faults/inject",
            json={"fault_type": "cooling_degradation", "severity": 0.6},
            headers=AUTH,
        )
        assert resp.status_code == 200
        assert resp.json()["injected"] == "cooling_degradation"
        client.post("/api/live/stop", headers=AUTH)


def test_mission_risk_check_returns_verdict():
    """A small, fast mission-risk check should return a valid verdict and margins."""
    with TestClient(app) as client:
        resp = client.post(
            "/api/mission_risk/check",
            json={
                "engine_id": "rotax914_like", "mission_id": "rapid_throttle_transitions",
                "n_monte_carlo": 2, "max_duration_s": 60.0, "use_current_health": False,
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["verdict"] in {"GO", "CAUTION", "NO-GO"}
        assert len(body["margins"]) > 0


def test_websocket_streams_after_live_start():
    """The WS endpoint should stream at least one JSON message once a session is running."""
    with TestClient(app) as client:
        client.post(
            "/api/live/start",
            json={"engine_id": "rotax914_like", "mission_id": "rapid_throttle_transitions", "speed": 500.0},
            headers=AUTH,
        )
        time.sleep(0.3)
        with client.websocket_connect("/ws/live") as ws:
            msg = ws.receive_json()
            assert "t_s" in msg
        client.post("/api/live/stop", headers=AUTH)


def test_hmac_sign_and_verify_roundtrip():
    """A correctly signed telemetry packet should verify; a tampered one should not."""
    packet = sign_telemetry_packet({"rpm": 4000.0})
    payload = verify_telemetry_packet(packet)
    assert payload == {"rpm": 4000.0}

    tampered = dict(packet)
    tampered["payload"] = {"rpm": 9999.0}
    try:
        verify_telemetry_packet(tampered)
        raise AssertionError("Tampered packet should not verify")
    except ValueError:
        pass
