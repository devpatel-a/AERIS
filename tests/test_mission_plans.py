"""Mission Planner routes, validation and saved plans (one mission system with the presets)."""

from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

from aerotwin.acquisition.link import StationConfig
from aerotwin.api.main import app
from aerotwin.api.security import API_TOKEN
from aerotwin.api.state import get_app_state
from aerotwin.simulation.mission import MissionRegistry
from aerotwin.simulation.route import PlannerConfig, PlanSpec, Waypoint, compile_plan, validate_plan
from aerotwin.twin.config import EngineRegistry

AUTH = {"Authorization": f"Bearer {API_TOKEN}"}


@pytest.fixture(scope="module")
def ctx():
    reg = MissionRegistry()
    return {
        "template": reg.get("isr_18h_endurance"), "engine": EngineRegistry().get("rotax914_like"),
        "cfg": PlannerConfig.load(), "link": StationConfig.load().datalink,
    }


def _spec(**kw) -> PlanSpec:
    base = dict(name="North ISR", code="ISR-N", tail_id="UAV-07", cruise_altitude_m=3000, duration_h=12,
                airspeed_ktas=87, power_pct_mcp=55,
                waypoints=[Waypoint(name="IP", east_km=20, north_km=40), Waypoint(name="STN", east_km=35, north_km=90, station=True)])
    base.update(kw)
    return PlanSpec(**base)


def _validate(ctx, spec):
    return validate_plan(spec, ctx["template"], ctx["engine"], ctx["cfg"], ctx["link"], {"UAV-07"})


def test_route_compiles_to_mission_segments_and_station_fills_duration(ctx):
    r = _validate(ctx, _spec())
    assert r["valid"], r["issues"]
    m = r["metrics"]
    names = [s["name"] for s in m["timeline"]]
    assert names == ["taxi", "takeoff", "climb", "transit", "transit", "loiter", "transit_home", "descent", "landing"]
    assert m["total_s"] == pytest.approx(12 * 3600, abs=1.0)  # station absorbs the remaining endurance
    # Route distance = base -> IP -> STN -> base.
    assert m["route_km"] == pytest.approx(44.72 + 52.2 + 96.57, abs=0.2)
    assert m["waypoints"][0]["eta_s"] < m["waypoints"][1]["eta_s"]
    # Transit legs fly at ground speed = TAS - headwind.
    leg = m["legs"][0]
    assert leg["duration_s"] == pytest.approx(leg["distance_km"] * 1000 / (87 / 1.943844 - ctx["template"].environment.headwind_mps), rel=1e-6)


def test_validation_catches_invalid_plans(ctx):
    texts = lambda r: " ".join(i["text"] for i in r["issues"] if i["level"] == "error")  # noqa: E731
    r = _validate(ctx, _spec(airspeed_ktas=30, code="bad code", name=""))
    assert not r["valid"]
    assert "Cruising airspeed 30" in texts(r) and "Identifier must be" in texts(r) and "name is required" in texts(r)
    # Beyond the radio horizon at cruise altitude.
    r = _validate(ctx, _spec(waypoints=[Waypoint(east_km=0, north_km=300, station=True)]))
    assert "radio horizon" in texts(r)
    # Route longer than the mission duration.
    r = _validate(ctx, _spec(duration_h=2, waypoints=[Waypoint(east_km=0, north_km=150, station=True)]))
    assert "longer than the 2 h mission duration" in texts(r)
    # Two on-station points; negative hold.
    r = _validate(ctx, _spec(waypoints=[Waypoint(east_km=10, north_km=10, station=True), Waypoint(east_km=20, north_km=10, station=True, hold_min=-5)]))
    assert "Only one waypoint" in texts(r) and "hold time cannot be negative" in texts(r)
    # Unknown airframe.
    assert "Unknown airframe" in texts(_validate(ctx, _spec(tail_id="UAV-99")))


def test_turbo_critical_altitude_warning(ctx):
    r = _validate(ctx, _spec(cruise_altitude_m=5000))
    assert r["valid"]
    assert any(i["level"] == "warning" and "critical altitude" in i["text"] for i in r["issues"])


def test_no_route_plan_matches_preset_profile(ctx):
    mission = compile_plan(_spec(waypoints=[], duration_h=10), ctx["template"], ctx["engine"], ctx["cfg"], ctx["link"])
    assert [s.name for s in mission.segments] == [s.name for s in ctx["template"].segments]
    assert mission.total_duration_s == pytest.approx(10 * 3600, rel=1e-6)


def test_saved_plan_lifecycle_and_mission_registry():
    body = {"mission_id": "combat_air_patrol", "tail_id": "UAV-07", "name": "West CAP", "code": "CAP-TEST",
            "cruise_altitude_m": 3000, "duration_h": 8, "surface_temp_c": 20, "airspeed_ktas": 80, "power_pct_mcp": 60,
            "waypoints": [{"name": "A", "east_km": -20, "north_km": 30, "station": True}]}
    with TestClient(app) as client:
        assert client.post("/api/planner/plans", json=body).status_code == 401
        created = client.post("/api/planner/plans", json=body, headers=AUTH)
        assert created.status_code == 200, created.text
        plan = created.json()
        pid, mid = plan["plan_id"], plan["mission_id"]
        # Registered as an ordinary mission, but not offered as a mission type.
        assert mid in client.get("/api/missions").json()
        assert mid not in [p["mission_id"] for p in client.get("/api/planner/presets").json()]
        cfg = client.get(f"/api/mission_config/{mid}").json()
        assert cfg["sortie_prefix"] == "CAP-TEST" and cfg["origin"] == "plan" and cfg["profile"] == "cap"
        assert cfg["environment"]["base_isa_deviation_k"] == pytest.approx(5.0)
        # Identifier must be unique.
        dup = client.post("/api/planner/plans", json=body, headers=AUTH)
        assert dup.status_code == 422 and "already used" in dup.text
        # Update changes the registered mission and clears the stored verdict.
        get_app_state().db.execute("UPDATE mission_plans SET last_verdict = 'GO' WHERE plan_id = ?", (pid,))
        upd = client.put(f"/api/planner/plans/{pid}", json={**body, "plan_id": pid, "cruise_altitude_m": 3600}, headers=AUTH)
        assert upd.status_code == 200 and upd.json()["last_verdict"] is None
        assert get_app_state().mission_registry.get(mid).segments[3].target_altitude_m == 3600
        # Invalid update rejected with the issues.
        bad = client.put(f"/api/planner/plans/{pid}", json={**body, "plan_id": pid, "airspeed_ktas": 20}, headers=AUTH)
        assert bad.status_code == 422 and "Cruising airspeed" in bad.text
        # A flown plan cannot be deleted; an unflown one can.
        db = get_app_state().db
        db.execute("INSERT INTO missions (mission_run_id, mission_id, engine_id, start_time) VALUES (?, ?, ?, ?)",
                   ("run_plan_test", mid, "rotax914_like", time.time()))
        db.commit()
        assert client.get(f"/api/planner/plans/{pid}").json()["flights"] == 1
        assert client.delete(f"/api/planner/plans/{pid}", headers=AUTH).status_code == 409
        db.execute("DELETE FROM missions WHERE mission_run_id = 'run_plan_test'")
        db.commit()
        assert client.delete(f"/api/planner/plans/{pid}", headers=AUTH).status_code == 200
        assert mid not in client.get("/api/missions").json()


def test_planned_mission_starts_a_session():
    body = {"mission_id": "training_sortie", "tail_id": "UAV-11", "name": "Pattern work", "code": "TRN-PLAN",
            "cruise_altitude_m": 1500, "duration_h": 2, "surface_temp_c": 15, "airspeed_ktas": 75, "power_pct_mcp": 55,
            "waypoints": [{"name": "A", "east_km": 5, "north_km": 10, "station": True}]}
    with TestClient(app) as client:
        plan = client.post("/api/planner/plans", json=body, headers=AUTH).json()
        start = client.post("/api/live/start", json={"mission_id": plan["mission_id"], "tail_id": "UAV-11", "speed": 500}, headers=AUTH)
        assert start.status_code == 200
        time.sleep(0.5)
        state = client.get("/api/sim/state").json()
        assert state["mission_id"] == plan["mission_id"] and state["mission_origin"] == "plan"
        assert client.put(f"/api/planner/plans/{plan['plan_id']}", json={**body, "plan_id": plan["plan_id"]}, headers=AUTH).status_code == 409
        client.post("/api/live/stop", headers=AUTH)


def test_alerts_acknowledge():
    with TestClient(app) as client:
        client.post("/api/live/start", json={"mission_id": "rapid_throttle_transitions", "speed": 500}, headers=AUTH)
        time.sleep(0.3)
        session = get_app_state().session
        from aerotwin.diagnostics.alerts import Alert

        session.alerts.append(Alert(1.0, "cooling", "WATCH", "cooling risk escalated to WATCH"))
        assert client.get("/api/alerts").json()["unread"] >= 1
        assert client.post("/api/alerts/ack", json={"ids": None}).status_code == 401
        after = client.post("/api/alerts/ack", json={"ids": None}, headers=AUTH).json()
        assert after["unread"] == 0 and all(a["acknowledged"] for a in after["alerts"])
        client.post("/api/live/stop", headers=AUTH)
