"""Tests for the services behind the Stitch screens: prognostics, vibration
harmonics, live sensor faults/self-test, fault locus, maintenance, planner,
and the live-session analytics + Simulation Control / Replay / Reports / Fleet APIs.
"""

from __future__ import annotations

import os
import sqlite3
import time

import numpy as np
import pytest
from fastapi.testclient import TestClient

from aerotwin.api.main import app
from aerotwin.faults.sensor_faults import apply_live_sensor_faults, sensor_selftest
from aerotwin.faults.specs import FaultSpec
from aerotwin.health.prognostics import PrognosticsConfig, prognose
from aerotwin.maintenance.service import (
    ActiveFault,
    MaintenanceKB,
    build_advisories,
    create_work_order,
    scheduled_due,
)
from aerotwin.physics.vibration import compute_vibration, overall_velocity_ips, vibration_spectrum
from aerotwin.simulation.mission import MissionRegistry
from aerotwin.simulation.planner import PlanRequest, build_mission, environment_factors
from aerotwin.storage.db import SCHEMA
from aerotwin.twin.config import EngineRegistry
from aerotwin.twin.residuals import classify_fault_locus

AUTH = {"Authorization": "Bearer devtoken"}
CONFIG = EngineRegistry().get("rotax914_like")


@pytest.fixture()
def db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def test_prognosis_degrading_vs_flat():
    hours = list(np.linspace(250, 450, 12))
    noise = np.random.default_rng(3).normal(0, 0.4, 12)
    degrading = prognose(hours, list(np.linspace(96, 84, 12) + noise), PrognosticsConfig())
    assert 0 < degrading.rul_mean_hours < 2000
    assert degrading.rul_p05_hours - 1e-6 <= degrading.rul_mean_hours <= degrading.rul_p95_hours + 1e-6
    assert degrading.rul_p95_hours > degrading.rul_p05_hours
    assert degrading.degradation_rate_per_hour < 0
    flat = prognose(hours, [95.0] * 12, PrognosticsConfig())
    assert flat.rul_mean_hours == PrognosticsConfig().horizon_cap_hours


def test_vibration_harmonics_preserve_rms_and_envelope():
    rms, bands = compute_vibration(5400.0, np.ones(4), CONFIG, 0.0)
    assert len(bands) == len(CONFIG.vibration.crank_orders)
    assert rms == pytest.approx(CONFIG.vibration.baseline_rms_g * (0.5 + 0.5 * 5400 / CONFIG.rating.rated_rpm), rel=1e-6)
    spec = vibration_spectrum(bands, 5400.0, CONFIG)
    assert all(p["envelope_ips"] >= p["velocity_ips"] for p in spec)
    _, imbalanced = compute_vibration(5400.0, np.ones(4), CONFIG, 0.8)
    one_x = next(p for p in vibration_spectrum(imbalanced, 5400.0, CONFIG) if p["order"] == 1.0)
    assert one_x["velocity_ips"] > one_x["envelope_ips"]
    assert overall_velocity_ips(spec) > 0


def test_live_sensor_faults_and_selftest():
    rng = np.random.default_rng(0)
    drift = FaultSpec(fault_type="sensor_drift", target="cht_3_k", onset_s=0, profile="step", severity=1.0, extra={"max_drift": 5.0})
    drop = FaultSpec(fault_type="sensor_dropout", target="egt_2_k", onset_s=0, profile="step", severity=1.0)
    out = apply_live_sensor_faults(10.0, {"cht_3_k": 400.0, "egt_2_k": 900.0}, [drift, drop], rng, {})
    assert out["cht_3_k"] == pytest.approx(405.0)
    assert out["egt_2_k"] != out["egt_2_k"]  # NaN
    st = sensor_selftest(10.0, ["cht_1_k", "cht_3_k", "egt_2_k"], [drift, drop])
    assert st["cht_1_k"]["status"] == "OK"
    assert st["cht_3_k"]["status"] == "DEGRADED"
    assert st["egt_2_k"]["status"] == "OPEN"


def test_fault_locus_uses_selftest():
    case = {"cht_1_k": 0.2, "cht_2_k": 0.1, "cht_3_k": 8.0, "cht_4_k": -0.1}
    assert classify_fault_locus(case)["cht_3_k"] == "sensor"
    assert classify_fault_locus(case, selftest_ok={"cht_3_k": True})["cht_3_k"] == "engine"
    assert classify_fault_locus(case, selftest_ok={"cht_3_k": False})["cht_3_k"] == "sensor"


def test_maintenance_advisories_and_schedule(db):
    kb = MaintenanceKB.load()
    advisories = build_advisories(db, kb, "UAV-07", [ActiveFault("cooling_degradation", 3)])
    titles = [a.title for a in advisories]
    assert "CHT Cylinder 3 Sensor Calibration" in titles
    assert advisories[0].priority == "HIGH" and advisories[0].ata.startswith("75")
    create_work_order(db, "UAV-07", "radiator_inspection", "Radiator inspection", status="COMPLETED",
                      completed_at=time.time(), engine_hours_at_completion=300.0)
    due = {t.key: t for t in scheduled_due(db, kb, "UAV-07", 400.0)}
    assert due["radiator_inspection"].due_in_hours == pytest.approx(50.0)
    assert due["inspection_100h"].due_in_hours == pytest.approx(100.0)


def test_planner_mission_overrides_and_environment():
    base = MissionRegistry().get("isr_18h_endurance")
    req = PlanRequest("rotax914_like", base, np.ones(10), 5200.0, 12.0, 27.0, 90.0, 70.0)
    mission = build_mission(req, CONFIG)
    assert mission.total_duration_s == pytest.approx(12 * 3600, rel=1e-3)
    env = environment_factors(mission, CONFIG)
    assert env["cruise_altitude_m"] == 5200.0
    assert env["isa_deviation_k"] == pytest.approx(12.0)
    assert env["density_altitude_m"] > 5200.0  # warmer than ISA -> higher density altitude


# Wall-clock ceiling for sim-time conditions: the 500x session is CPU-bound, so on a busy
# host reaching cruise (T+21 min) can take minutes; the wait returns as soon as it is met.
WAIT_S = float(os.environ.get("AEROTWIN_TEST_WAIT_S", "300"))


def _wait_for(client, predicate, timeout=WAIT_S):
    t0 = time.time()
    while time.time() - t0 < timeout:
        row = client.get("/api/health/latest")
        if row.status_code == 200 and predicate(row.json()):
            return row.json()
        time.sleep(0.5)
    raise AssertionError("condition not reached")


def test_live_session_screens_end_to_end():
    """Live analytics, Simulation Control, Replay, Reports and Fleet APIs on one real session."""
    with TestClient(app) as c:
        start = c.post("/api/live/start", json={"mission_id": "isr_18h_endurance", "speed": 500, "tail_id": "UAV-07"}, headers=AUTH)
        assert start.status_code == 200
        run_id = start.json()["run_id"]
        row = _wait_for(c, lambda r: r["context"]["phase"] == "cruise")
        for key in ("cylinders", "fault_matrix", "anomaly_score", "sensor_selftest", "hil_bus", "vibration_spectrum", "rul_mean_hours"):
            assert key in row
        assert row["context"]["tail_id"] == "UAV-07" and row["context"]["sortie_label"]
        assert row["hil_bus"]["frames_per_s"] and row["hil_bus"]["dropped_frames"] == 0

        state = c.get("/api/sim/state").json()
        assert len(state["cards"]) == 10
        inj = c.post("/api/sim/faults", json={"card_id": 1}, headers=AUTH)
        assert inj.status_code == 200 and inj.json()["active_faults"] == 1
        assert c.post("/api/sim/faults", json={"card_id": 1}, headers=AUTH).status_code == 409
        assert c.post("/api/sim/time-warp", json={"speed": 400}, headers=AUTH).status_code == 200
        log = c.get("/api/sim/response-log").json()
        assert any(e["kind"] == "INJECTED" for e in log["incidents"])
        fid = next(card["fault_id"] for card in c.get("/api/sim/state").json()["cards"] if card["active"])
        assert c.delete(f"/api/sim/faults/{fid}", headers=AUTH).json()["active_faults"] == 0

        assert c.get("/api/twin/history?channel=cht_3_k&window_s=120").status_code == 200
        assert c.get("/api/twin/health-parameters").json()["parameters"]
        assert c.get("/api/twin/assembly/3").json()["cylinder"] == 3
        assert c.get("/api/diagnostics/summary").json()["tail_id"] == "UAV-07"
        assert c.get("/api/diagnostics/rul-curve").json()["history"]
        assert c.get("/api/diagnostics/correlation").json()["bus"]
        fleet = c.get("/api/fleet").json()
        assert fleet["units_online"] == 6
        assert next(r for r in fleet["rows"] if r["tail_id"] == "UAV-07")["is_current"]

        c.post("/api/sim/control", json={"action": "pause"}, headers=AUTH)
        t_paused = c.get("/api/sim/state").json()["t_s"]
        c.post("/api/sim/control", json={"action": "step", "step_s": 2.0}, headers=AUTH)
        time.sleep(1.0)
        assert c.get("/api/sim/state").json()["t_s"] == pytest.approx(t_paused + 2.0, abs=0.2)
        assert c.post("/api/live/stop", headers=AUTH).status_code == 200

        sorties = c.get("/api/replay/sorties?tail_id=UAV-07").json()["sorties"]
        mine = next(s for s in sorties if s["run_id"] == run_id)
        assert mine["chip"] == "ALERT" and mine["injected_faults"]
        traces = c.get(f"/api/replay/{run_id}/traces").json()
        assert len(traces["t_s"]) > 10 and "cht_3_k" in traces
        ts = c.get(f"/api/replay/{run_id}/twin-state?t={traces['t_s'][-1]}").json()
        assert len(ts["cylinders"]) == 4
        assert c.get(f"/api/replay/{run_id}/extremes").json()["peak_cht"]
        assert any(e["kind"] == "INJECTED" for e in c.get(f"/api/replay/{run_id}/events").json())

        rep = c.post("/api/reports", json={"report_type": "post_mission", "mission_run_id": run_id}, headers=AUTH)
        assert rep.status_code == 200, rep.text
        rid = rep.json()["report_id"]
        assert rep.json()["content"]["section1"]["ehi"] is not None
        pdf = c.get(f"/api/reports/{rid}/pdf")
        assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"
        for fmt in ("csv", "hdf5", "1553json"):
            assert c.get(f"/api/reports/{rid}/raw?fmt={fmt}").status_code == 200
        assert c.post(f"/api/reports/{rid}/dispatch", headers=AUTH).json()["dispatched_to"]
        assert c.patch(f"/api/reports/{rid}/status", json={"status": "APPROVED"}, headers=AUTH).json()["status"] == "APPROVED"
        assert c.get("/api/fleet/UAV-07/trends").status_code == 200
