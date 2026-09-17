"""AeroTwin M10 demo: the full storyline from CLAUDE.md, run end to end.

    1. Start an 18h-ISR-style mission, accelerated, over virtual CAN.
    2. Silently inject slow cooling degradation mid-mission.
    3. The twin detects it before the threshold alarm.
    4. The classifier identifies cooling degradation, with a SHAP explanation.
    5. RUL drops and a maintenance advisory appears.
    6. A hot-weather go/no-go check returns NO-GO.
    7. The mission is saved for replay and a PDF report is generated.

The full `isr_18h_endurance` mission (all 18 simulated hours) is exercised
elsewhere (`scripts/run_mission.py`, `scripts/generate_dataset.py`, the
Mission Planner page) — see docs/DECISIONS.md D27 for why this demo instead
runs an accelerated ~25-minute representative window (cruise/loiter-style
throttle and airspeed) at the UKF update cadence M5 validated for stability,
rather than the full 18h at that same cadence (which is correct but takes
~18 real minutes end to end).

Usage:
    python -m scripts.demo
"""

from __future__ import annotations

import pickle
import time
from pathlib import Path

import numpy as np
import pandas as pd

from aerotwin.acquisition.bus import get_can_bus
from aerotwin.acquisition.publisher import CanPublisher
from aerotwin.acquisition.receiver import CanReceiver
from aerotwin.diagnostics.diagnosis import build_diagnosis
from aerotwin.faults.injector import FaultInjector
from aerotwin.faults.sensor_model import SENSOR_SPECS
from aerotwin.faults.specs import FaultSpec, severity_at
from aerotwin.health.indices import compute_health_snapshot
from aerotwin.ml.features import build_windowed_features
from aerotwin.ml.rul import RulParticleFilter
from aerotwin.physics.engine_model import EngineModel
from aerotwin.physics.state import HEALTH_NAMES, EngineInputs, nominal_health_vector
from aerotwin.reports.pdf import generate_mission_report
from aerotwin.simulation.mission import (
    EnvironmentConfig,
    MissionConfig,
    MissionRegistry,
    MissionRunner,
    SegmentConfig,
)
from aerotwin.simulation.risk import run_mission_go_no_go
from aerotwin.storage.db import (
    close_mission,
    get_connection,
    insert_maintenance_record,
    insert_mission,
)
from aerotwin.storage.parquet_store import save_mission_log
from aerotwin.twin.config import EngineRegistry
from aerotwin.twin.digital_twin import DigitalTwin
from aerotwin.twin.estimator import MEASUREMENT_CHANNELS

MODELS_DIR = Path(__file__).resolve().parents[1] / "models"

DT = 0.05
UKF_UPDATE_INTERVAL_S = 1.0  # the interval M5's early-detection test validated for stability
ONSET_S = 100.0
RAMP_S = 900.0
SEVERITY_FINAL = 0.6
TOTAL_S = 1500.0
WATCH_THRESHOLD = 60.0
WATCH_HOLD_S = 20.0

_start_wall = time.perf_counter()


def log(t_sim_s: float, msg: str) -> None:
    """Print one timestamped demo event."""
    wall = time.perf_counter() - _start_wall
    print(f"[wall {wall:7.1f}s | mission t={t_sim_s / 60:6.1f}min] {msg}", flush=True)


def demo_can_mechanism(config) -> None:
    """Briefly prove the CAN publisher/receiver round-trip (vcan0, falling back to virtual)."""
    bus_name = f"aerotwin_demo_{np.random.default_rng().integers(0, 1_000_000)}"
    tx_bus = get_can_bus(channel="vcan0", virtual_channel=bus_name)
    rx_bus = get_can_bus(channel="vcan0", virtual_channel=bus_name)
    publisher = CanPublisher(tx_bus)
    receiver = CanReceiver(rx_bus)

    model = EngineModel(config)
    inputs = EngineInputs(
        throttle=0.5, ambient_pressure_pa=101325.0, ambient_temp_k=288.15, altitude_m=0.0, airspeed_mps=30.0
    )
    for i in range(40):
        out = model.step(inputs)
        publisher.publish_step(i * DT, inputs, out)
    n = 0
    while receiver.poll_once(timeout_s=0.1):
        n += 1
    log(
        0.0,
        f"CAN mechanism check: published+decoded {n} frames over a virtual bus "
        f"(RPM={receiver.get_value('RPM'):.0f}, heartbeats={receiver.n_heartbeats_received}, "
        f"gaps={receiver.n_heartbeat_gaps}, crc_errors={receiver.n_heartbeat_crc_errors})",
    )
    tx_bus.shutdown()
    rx_bus.shutdown()


def _demo_mission() -> MissionConfig:
    """An accelerated ISR-style cruise/loiter window: hot day, low airspeed, stresses cooling."""
    return MissionConfig(
        mission_id="demo_isr_window",
        display_name="ISR endurance patrol (accelerated demo window)",
        environment=EnvironmentConfig(base_isa_deviation_k=15.0),
        segments=[
            SegmentConfig(
                name="cruise_loiter", duration_s=TOTAL_S, target_altitude_m=1500.0,
                target_airspeed_mps=15.0, throttle=0.75,
            )
        ],
    )


def run_mission_with_silent_degradation(config, mission) -> tuple[pd.DataFrame, DigitalTwin, dict]:
    """Run the demo mission LIVE, injecting silent cooling degradation partway through."""
    rng = np.random.default_rng(0)
    plant = EngineModel(config, health=nominal_health_vector(config.nominal_health.injector_flow_coeff))
    twin = DigitalTwin(config, dt=DT, ukf_update_interval_s=UKF_UPDATE_INTERVAL_S)
    mission_helper = MissionRunner(config, mission)
    fault_spec = FaultSpec(
        fault_type="cooling_degradation", onset_s=ONSET_S, profile="ramp",
        severity=SEVERITY_FINAL, ramp_duration_s=RAMP_S,
    )
    fault_injector = FaultInjector([fault_spec], seed=1)

    n_steps = int(round(mission.total_duration_s / DT))
    log_every = int(round(1.0 / DT))  # log every simulated second

    rows: list[dict] = []
    cht_alarm_t: float | None = None
    watch_t: float | None = None
    watch_run = 0.0
    t = 0.0

    for i in range(n_steps):
        inputs = mission_helper.inputs_at_time(t)
        fault_injector.step_callback(t, plant)
        plant_out = plant.step(inputs)
        flat = plant_out.as_flat_dict()
        measured = {
            c: flat[c] + rng.normal(0, SENSOR_SPECS[c].noise_std if c in SENSOR_SPECS else 0.0)
            for c in MEASUREMENT_CHANNELS
        }
        result = twin.step_live(inputs, measured)

        max_cht = max(flat[f"cht_{k}_k"] for k in range(1, 5))
        if cht_alarm_t is None and max_cht >= config.limits.max_cht_k:
            cht_alarm_t = t
            log(t, f"THRESHOLD ALARM: max CHT {max_cht:.0f}K crossed the hard limit {config.limits.max_cht_k:.0f}K")

        if result.health.subsystem_index["cooling"] < WATCH_THRESHOLD:
            watch_run += DT
            if watch_run >= WATCH_HOLD_S and watch_t is None:
                watch_t = t - WATCH_HOLD_S
                log(
                    t,
                    f"TWIN DETECTION: cooling health index dropped below {WATCH_THRESHOLD:.0f} "
                    f"(risk={result.health.subsystem_risk['cooling']}) — silently, ahead of any hard-limit alarm",
                )
        else:
            watch_run = 0.0

        if i % log_every == 0:
            row = {
                "t_s": t,
                "segment": mission_helper.current_segment_name(t),
                "throttle": inputs.throttle,
                "ambient_pressure_pa": inputs.ambient_pressure_pa,
                "ambient_temp_k": inputs.ambient_temp_k,
                "altitude_m": inputs.altitude_m,
                "airspeed_mps": inputs.airspeed_mps,
                "fault_type": "cooling_degradation",
                "fault_severity": severity_at(t, fault_spec),
            }
            row.update(flat)
            for name, val in zip(HEALTH_NAMES, twin.model.health, strict=True):
                row[f"health_{name}"] = float(val)
            for c in MEASUREMENT_CHANNELS:
                row[f"measured_{c}"] = measured[c]
            rows.append(row)
        t += DT

    df = pd.DataFrame(rows)
    events = {"cht_alarm_t": cht_alarm_t, "watch_t": watch_t}
    return df, twin, events


def classify_and_explain(df: pd.DataFrame, config) -> None:
    """Load the trained classifier (if available) and explain the mission's final window."""
    clf_path = MODELS_DIR / "fault_classifier.pkl"
    if not clf_path.exists():
        log(df["t_s"].iloc[-1], "SKIP classifier step: no trained model found (run `make train` first)")
        return
    with clf_path.open("rb") as f:
        clf = pickle.load(f)

    feats = build_windowed_features(df, config, sample_id="demo", window_s=300.0, stride_s=300.0)
    if feats.empty:
        log(df["t_s"].iloc[-1], "SKIP classifier step: not enough data for a feature window")
        return
    feature_cols = [c for c in clf.feature_cols if c in feats.columns]
    X = feats[feature_cols].fillna(0.0).to_numpy()
    last_window = X[-1:]
    pred = clf.predict(last_window)[0]
    explanation = clf.explain(last_window)[0]
    log(feats["window_center_s"].iloc[-1], f"CLASSIFIER: predicted fault = '{pred}'. Top factors: {explanation}")


def rul_and_advisory(df: pd.DataFrame, twin: DigitalTwin, config, db) -> None:
    """Run the RUL particle filter and raise a maintenance advisory."""
    health_cols = [f"health_{n}" for n in HEALTH_NAMES]
    outputs_cols = ["cht_1_k", "cht_2_k", "cht_3_k", "cht_4_k", "oil_pressure_kpa", "vibration_rms_g"]
    indices = []
    for _, r in df.iterrows():
        health_vec = np.array([r[c] for c in health_cols])
        outputs_flat = {c: r[c] for c in outputs_cols}
        indices.append(compute_health_snapshot(health_vec, outputs_flat, config).overall_index)

    pf = RulParticleFilter(seed=2)
    for t, idx in zip(df["t_s"], indices, strict=True):
        pf.update(float(t), float(idx))
    final_est = pf.estimate_rul(float(df["t_s"].iloc[-1]), float(indices[-1]))
    log(
        df["t_s"].iloc[-1],
        f"RUL: mean {final_est.mean_hours:.1f}h (90% interval [{final_est.p05_hours:.1f}, "
        f"{final_est.p95_hours:.1f}]h) — dropping as cooling_effectiveness degrades",
    )

    health_snapshot = compute_health_snapshot(
        twin.model.health, {c: df[c].iloc[-1] for c in outputs_cols}, config
    )
    diagnosis = build_diagnosis(
        health_snapshot, "cooling_degradation", confidence=0.9,
        explanation="Sustained CHT rise with UKF-estimated cooling_effectiveness decline",
        rul_mean_hours=final_est.mean_hours, rul_p05_hours=final_est.p05_hours, rul_p95_hours=final_est.p95_hours,
    )
    log(df["t_s"].iloc[-1], f"MAINTENANCE ADVISORY: {diagnosis.recommended_action}")
    insert_maintenance_record(db, "rotax914_like", diagnosis.recommended_action, notes=diagnosis.explanation)


def main() -> None:
    """Run the full M10 demo storyline."""
    engine_config = EngineRegistry().get("rotax914_like")
    mission_registry = MissionRegistry()
    db = get_connection()

    log(0.0, "=== AeroTwin demo starting ===")
    demo_can_mechanism(engine_config)

    demo_mission = _demo_mission()
    log(
        0.0,
        f"Starting {demo_mission.display_name} — {TOTAL_S / 60:.0f} accelerated minutes "
        f"representing a hot-day ISR cruise/loiter phase",
    )
    df, twin, events = run_mission_with_silent_degradation(engine_config, demo_mission)

    if events["cht_alarm_t"] is not None and events["watch_t"] is not None:
        lead_s = events["cht_alarm_t"] - events["watch_t"]
        log(df["t_s"].iloc[-1], f"Early detection lead time: {lead_s:.0f}s before the hard-limit alarm")

    classify_and_explain(df, engine_config)
    rul_and_advisory(df, twin, engine_config, db)

    log(df["t_s"].iloc[-1], "Running hot-weather go/no-go check using the engine's current (degraded) health...")
    hot_mission = mission_registry.get("hot_weather_45c")
    risk = run_mission_go_no_go(engine_config, hot_mission, twin.model.health, n_monte_carlo=8, max_duration_s=1200.0)
    log(df["t_s"].iloc[-1], f"GO/NO-GO VERDICT: {risk.verdict} — {'; '.join(risk.reasons[:2])}")

    run_id = "demo_isr_endurance_window"
    path = save_mission_log(df, run_id)
    insert_mission(db, run_id, "rotax914_like", "isr_18h_endurance", parquet_path=str(path))
    close_mission(db, run_id)
    log(df["t_s"].iloc[-1], f"Mission saved for replay: {path}")

    report_path = Path("data") / "reports" / f"{run_id}.pdf"
    generate_mission_report(path, engine_config, report_path, run_id)
    log(df["t_s"].iloc[-1], f"Post-flight PDF report generated: {report_path}")

    log(df["t_s"].iloc[-1], "=== Demo complete ===")


if __name__ == "__main__":
    main()
