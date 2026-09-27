"""Shared application state: the active LIVE/SIMULATION session, replay session,
alert manager, and storage handles used by the FastAPI routes.
"""

from __future__ import annotations

import asyncio
import json
import pickle
import threading
import time
import uuid
from dataclasses import asdict, dataclass, field, replace
from pathlib import Path
from typing import Any, Literal

import numpy as np
import pandas as pd

from aerotwin.acquisition.bus import get_can_bus
from aerotwin.acquisition.datasource import ParquetReplayDataSource
from aerotwin.acquisition.hil_bus import HilBusMonitor
from aerotwin.acquisition.link import StationConfig, link_margin_db
from aerotwin.auth.service import seed_operators
from aerotwin.diagnostics.alerts import Alert, AlertManager
from aerotwin.diagnostics.diagnosis import Diagnosis, build_diagnosis
from aerotwin.faults.injector import FaultInjector
from aerotwin.faults.sensor_faults import apply_live_sensor_faults, sensor_selftest
from aerotwin.faults.sensor_model import SENSOR_SPECS
from aerotwin.faults.specs import FaultSpec
from aerotwin.fleet import records
from aerotwin.health.prognostics import PrognosticsConfig, RulPrognosis, prognose
from aerotwin.maintenance.service import MaintenanceKB
from aerotwin.ml.classifier import FaultClassifier
from aerotwin.ml.features import FEATURE_CHANNELS, _window_features
from aerotwin.physics.engine_model import EngineModel
from aerotwin.physics.state import nominal_health_vector
from aerotwin.physics.vibration import overall_velocity_ips, vibration_spectrum
from aerotwin.reports.summary import compute_post_flight_summary
from aerotwin.simulation.mission import MissionConfig, MissionRegistry, MissionRunner
from aerotwin.storage.buffer import LiveBuffer
from aerotwin.storage.db import close_mission, get_connection, insert_alert, insert_mission
from aerotwin.storage.parquet_store import save_mission_log
from aerotwin.twin.config import EngineConfig, EngineRegistry
from aerotwin.twin.digital_twin import DigitalTwin
from aerotwin.twin.estimator import MEASUREMENT_CHANNELS
from aerotwin.twin.fleet import FleetRegistry, TailConfig
from aerotwin.twin.live_analytics import LiveAnalytics

# Live fault-classification cadence: residual features are computed from a 1Hz
# nominal-baseline re-simulation (matching the training feature pipeline in
# aerotwin/ml/features.py exactly), over a sliding window, re-classified every
# stride — mirrors build_windowed_features(window_s=30.0, stride_s=15.0).
FEATURE_WINDOW_S = 30.0
FEATURE_STRIDE_S = 15.0
PERSIST_INTERVAL_S = 1.0  # stored telemetry rate (1 Hz) for Replay/Reports/Trends
PROGNOSIS_INTERVAL_S = 60.0  # lifetime-RUL refit cadence (sim seconds)
HEALTH_EWMA_TAU_S = 600.0  # smoothing of the live health index fed to prognostics
PERSISTED_EXPECTED = [
    *[f"cht_{i}_k" for i in range(1, 5)], *[f"egt_{i}_k" for i in range(1, 5)],
    "oil_temp_k", "oil_pressure_kpa", "coolant_temp_k", "fuel_flow_kg_s", "map_kpa", "rpm",
]

SessionMode = Literal["LIVE", "SIMULATION"]

# Simulation Control atmosphere presets: ISA deviation (K) and optional cruise altitude (m).
ATMOSPHERE_PRESETS: dict[str, dict[str, Any]] = {
    "isa": {"label": "Standard Day (ISA)", "isa_deviation_k": 0.0, "cruise_altitude_m": None},
    "high_altitude": {"label": "High Altitude (6,000 m)", "isa_deviation_k": 0.0, "cruise_altitude_m": 6000.0},
    "hot_day": {"label": "Extreme Hot Day (45 °C)", "isa_deviation_k": 30.0, "cruise_altitude_m": None},
    "cold_day": {"label": "Cold Weather (-20 °C)", "isa_deviation_k": -35.0, "cruise_altitude_m": None},
}


@dataclass
class InjectedFault:
    """A fault injected into the running session (Simulation Control cards)."""

    fault_id: int
    spec: FaultSpec
    injected_t: float
    operator: str | None = None
    cleared_t: float | None = None


@dataclass
class Session:
    """One running LIVE or SIMULATION demo session."""

    mode: SessionMode
    engine_config: EngineConfig
    mission: MissionConfig
    twin: DigitalTwin
    plant: EngineModel | None  # hidden ground-truth model, LIVE mode only
    mission_helper: MissionRunner  # used only for .inputs_at_time()
    run_id: str
    tail_id: str | None = None
    speed: float = 50.0
    running: bool = True
    paused: bool = False
    step_ticks: int = 0  # ticks to advance while paused ("Step Forward")
    t: float = 0.0
    fault_injector: FaultInjector = field(default_factory=lambda: FaultInjector([], seed=0))
    injected: list[InjectedFault] = field(default_factory=list)
    alert_manager: AlertManager = field(default_factory=AlertManager)
    alerts: list[Alert] = field(default_factory=list)
    rng: np.random.Generator = field(default_factory=lambda: np.random.default_rng(0))
    rows: list[dict[str, Any]] = field(default_factory=list)
    task: asyncio.Task | None = None
    # Fault classifier: nominal_model + feature_window feed it, re-run every
    # FEATURE_STRIDE_S seconds. LIVE mode only.
    nominal_model: EngineModel | None = None
    feature_window: list[dict[str, float]] = field(default_factory=list)
    last_diagnosis: Diagnosis | None = None
    last_probs: dict[str, float] = field(default_factory=dict)
    last_classify_t: float = -1e9
    last_nominal_step_t: float = -1e9
    last_persist_t: float = -1e9
    last_feat_row: dict[str, float] = field(default_factory=dict)
    throttle_cap: float | None = None  # applied contingency (Simulation Control)
    # Identity + lifetime prognostics.
    tail: TailConfig | None = None
    sortie_label: str | None = None
    atmosphere: str = "isa"
    engine_hours_start: float = 0.0
    rul_history: tuple[list[float], list[float]] = field(default_factory=lambda: ([], []))
    prognosis: RulPrognosis | None = None
    health_ewma: float | None = None
    last_prognosis_t: float = -1e9
    analytics: LiveAnalytics | None = None
    hil: HilBusMonitor | None = None
    sensor_fault_state: dict = field(default_factory=dict)

    @property
    def engine_hours(self) -> float:
        return self.engine_hours_start + self.t / 3600.0


@dataclass
class ReplaySession:
    """One active replay of a stored mission Parquet log."""

    source: ParquetReplayDataSource
    speed: float = 10.0
    playing: bool = True


class AppState:
    """Process-wide singleton holding the active demo/replay session and shared registries."""

    def __init__(self) -> None:
        self.engine_registry = EngineRegistry()
        self.mission_registry = MissionRegistry()
        self.fleet_registry = FleetRegistry()
        self.station = StationConfig.load()
        self.maintenance_kb = MaintenanceKB.load()
        self.prognostics_config = PrognosticsConfig.load()
        self.buffer = LiveBuffer()
        self.db = get_connection()
        seed_operators(self.db)
        self.bus_interface = self._probe_bus()
        self.session: Session | None = None
        self.replay: ReplaySession | None = None
        self.classifier: FaultClassifier | None = self._load_classifier()
        # Mission-risk Monte Carlo is CPU-bound pure-Python physics work that holds the
        # GIL; letting two overlapping requests (e.g. an impatient double-click, or a
        # client retrying after its own timeout) run concurrently makes both — and
        # everything else in the process — many times slower rather than sharing
        # progress. One at a time; a second caller gets a clear 409 instead of a stall.
        self.mission_risk_lock = threading.Lock()

    @staticmethod
    def _probe_bus() -> str | None:
        """Open the CAN bus once to report which interface is available (None if none)."""
        try:
            bus = get_can_bus()
        except Exception:
            return None
        name = f"{bus.__class__.__name__}:{getattr(bus, 'channel_info', '')}"
        bus.shutdown()
        return name

    @staticmethod
    def _load_classifier() -> FaultClassifier | None:
        """Load the offline-trained fault classifier (`scripts/train_all.py` output), if present."""
        path = Path("models") / "fault_classifier.pkl"
        if not path.exists():
            return None
        try:
            with path.open("rb") as f:
                return pickle.load(f)
        except Exception:
            return None

    def _sortie_label(self, tail_id: str | None, mission: MissionConfig) -> str:
        n = self.db.execute(
            "SELECT COUNT(*) FROM missions m WHERE m.tail_id IS ? AND m.sortie_label LIKE ?",
            (tail_id, f"{mission.sortie_prefix}-%"),
        ).fetchone()[0]
        return f"{mission.sortie_prefix}-{n + 1:02d}"

    def start_session(
        self,
        mode: SessionMode,
        engine_id: str,
        mission_id: str,
        speed: float,
        tail_id: str | None = None,
        atmosphere: str = "isa",
    ) -> Session:
        """Create and register a new LIVE or SIMULATION session (stops any existing one)."""
        current_health = None
        if mode == "SIMULATION" and self.session is not None:
            current_health = self.session.twin.model.health.copy()
        self.stop_session()
        engine_config = self.engine_registry.get(engine_id)
        base_mission = self.mission_registry.get(mission_id)
        preset = ATMOSPHERE_PRESETS.get(atmosphere, ATMOSPHERE_PRESETS["isa"])
        mission = (
            base_mission.with_overrides(preset["cruise_altitude_m"], preset["isa_deviation_k"])
            if atmosphere != "isa"
            else base_mission
        )
        mission_helper = MissionRunner(engine_config, mission)

        twin = DigitalTwin(engine_config, dt=0.05, mode=mode)
        if current_health is not None:
            twin.reset_for_simulation(initial_health=current_health)

        plant = EngineModel(engine_config, dt=0.05) if mode == "LIVE" else None
        # Nominal-health model for fault-classifier residual features — matches
        # aerotwin/ml/features.py's nominal_residual_pass exactly (same health
        # vector, same dt=1.0 baseline), so live features match training features.
        nominal_model = (
            EngineModel(
                engine_config,
                health=nominal_health_vector(engine_config.nominal_health.injector_flow_coeff),
                dt=1.0,
            )
            if mode == "LIVE"
            else None
        )
        run_id = f"{mode.lower()}_{mission_id}_{uuid.uuid4().hex[:8]}"

        tail = records.tail_for(self.fleet_registry, tail_id)
        engine_hours_start = 0.0
        history: tuple[list[float], list[float]] = ([], [])
        if tail is not None:
            runs = records.tail_runs(self.db, tail, self.engine_registry)
            engine_hours_start = runs[-1].engine_hours_end if runs else tail.hours_at_induction
            for r in runs:
                if r.summary is not None and r.summary.health_index_end is not None and not r.is_test:
                    history[0].append(r.engine_hours_end)
                    history[1].append(r.summary.health_index_end)

        session = Session(
            mode=mode, engine_config=engine_config, mission=mission, twin=twin, plant=plant,
            mission_helper=mission_helper, run_id=run_id, tail_id=tail_id, speed=speed,
            nominal_model=nominal_model, tail=tail, atmosphere=atmosphere,
            engine_hours_start=engine_hours_start, rul_history=history,
            sortie_label=self._sortie_label(tail_id, mission),
            analytics=LiveAnalytics(engine_config, self.maintenance_kb) if mode == "LIVE" else None,
            hil=HilBusMonitor(uuid.uuid4().hex[:8]) if mode == "LIVE" else None,
        )
        if history[0]:
            session.prognosis = prognose(history[0], history[1], self.prognostics_config)
        self.session = session
        insert_mission(
            self.db, run_id, engine_id, mission_id, tail_id=tail_id, sortie_label=session.sortie_label,
            kind="test" if mission.profile == "test" else "operational", engine_hours_start=engine_hours_start,
        )
        self.buffer.clear()
        return session

    def stop_session(self) -> str | None:
        """Stop and persist the currently active session, if any. Returns the saved log path."""
        session = self.session
        if session is None:
            return None
        session.running = False
        if session.task is not None:
            session.task.cancel()

        saved_path: str | None = None
        if session.rows:
            df = pd.DataFrame(session.rows)
            saved_path = str(save_mission_log(df, session.run_id))
            if session.mode == "LIVE":
                records.store_summary(self.db, session.run_id, compute_post_flight_summary(df, session.engine_config))
        injected = [
            {**i.spec.model_dump(), "fault_id": i.fault_id, "injected_t": i.injected_t, "cleared_t": i.cleared_t}
            for i in session.injected
        ]
        close_mission(
            self.db, session.run_id, flight_s=session.t, parquet_path=saved_path,
            injected_faults_json=json.dumps(injected),
        )
        if injected:
            self.db.execute("UPDATE missions SET kind = 'test' WHERE mission_run_id = ?", (session.run_id,))
        for alert in session.alerts:
            insert_alert(self.db, session.run_id, alert.t_s, alert.subsystem, alert.severity, alert.message)
        if session.analytics is not None:
            for ev in session.analytics.events:
                self.db.execute(
                    "INSERT INTO mission_events (mission_run_id, t_s, kind, title, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (session.run_id, ev["t_s"], ev["kind"], ev["title"], ev["detail"], ev["wall_ts"]),
                )
        self.db.commit()
        if session.hil is not None:
            session.hil.close()
        self.session = None
        return saved_path

    def inject_fault(self, spec: FaultSpec, operator: str | None = None) -> InjectedFault:
        """Add a fault to the active session's injector (LIVE mode perturbs the hidden plant)."""
        session = self.session
        if session is None:
            raise RuntimeError("No active session")
        session.fault_injector.add_spec(spec)
        injected = InjectedFault(len(session.injected) + 1, spec, session.t, operator)
        session.injected.append(injected)
        if session.analytics is not None:
            session.analytics.on_injection(session.t, spec.fault_type, spec.target, spec.severity, spec.ramp_duration_s, operator)
        return injected

    def clear_fault(self, fault_id: int) -> None:
        """Remove an injected fault; the plant returns to nominal for that mechanism."""
        session = self.session
        if session is None:
            raise RuntimeError("No active session")
        match = next((i for i in session.injected if i.fault_id == fault_id and i.cleared_t is None), None)
        if match is None:
            raise KeyError(f"No active injected fault {fault_id}")
        match.cleared_t = session.t
        remaining = [i.spec for i in session.injected if i.cleared_t is None]
        session.fault_injector = FaultInjector(remaining, seed=0)
        if session.plant is not None:
            session.plant.health = nominal_health_vector(session.engine_config.nominal_health.injector_flow_coeff)
            session.plant.cylinder_cooling_factor = np.ones(4)
            session.plant.misfire_mask = np.ones(4)
            session.plant.vibration_imbalance_severity = 0.0
            session.plant.combustion_efficiency_override = None
        session.sensor_fault_state.clear()
        if session.analytics is not None:
            session.analytics.add_event(session.t, "CLEARED", f"{self.maintenance_kb.fault_label(match.spec.fault_type)} injection cleared.", "Source: Ground Station Operator")


def _classify_fault(session: Session, classifier: FaultClassifier, health) -> tuple[Diagnosis, dict[str, float]]:
    """Run the trained fault classifier + SHAP explainer over the session's rolling residual-feature window."""
    window_df = pd.DataFrame(session.feature_window)
    feats = _window_features(window_df)
    x = np.array([[feats.get(c, 0.0) for c in classifier.feature_cols]])
    pred = str(classifier.predict(x)[0])
    proba = classifier.predict_proba(x)[0]
    classes = [str(c) for c in classifier.encoder.classes_]
    probs = {c: float(p) for c, p in zip(classes, proba, strict=True)}
    confidence = probs.get(pred, float(np.max(proba)))
    explanation = classifier.explain(x, top_k=3)[0]
    shap_features = classifier.explain_structured(x, top_k=5)[0]
    prog = session.prognosis
    diagnosis = build_diagnosis(
        health, pred, confidence, explanation,
        rul_mean_hours=prog.rul_mean_hours if prog else None,
        rul_p05_hours=prog.rul_p05_hours if prog else None,
        rul_p95_hours=prog.rul_p95_hours if prog else None,
        shap_features=shap_features,
    )
    return diagnosis, probs


def session_context(session: Session, state: AppState, inputs) -> dict[str, Any]:
    """Identity + flight-condition header data for one tick (shell top bar, sidebar footer)."""
    tail = session.tail
    power_rating = session.engine_config.rating
    return {
        "tail_id": session.tail_id,
        "engine_id": session.engine_config.engine_id,
        "engine_class": session.engine_config.short_name or session.engine_config.display_name,
        "engine_serial": tail.engine_serial if tail else None,
        "run_id": session.run_id,
        "sortie_label": session.sortie_label,
        "mission_id": session.mission.mission_id,
        "mission_name": session.mission.short_name or session.mission.display_name,
        "mission_duration_s": session.mission.total_duration_s,
        "phase": session.mission_helper.current_segment_name(session.t),
        "altitude_m": inputs.altitude_m,
        "oat_c": inputs.ambient_temp_k - 273.15,
        "ambient_pressure_kpa": inputs.ambient_pressure_pa / 1000.0,
        "airspeed_mps": inputs.airspeed_mps,
        "throttle": inputs.throttle,
        "rated_power_w": power_rating.rated_power_w,
        "max_continuous_power_w": power_rating.max_continuous_power_w or power_rating.rated_power_w,
        "rated_rpm": power_rating.rated_rpm,
        "engine_hours": session.engine_hours,
        "link_hz": 1.0 / session.twin.dt,
        "link_margin_db": link_margin_db(state.station.datalink, inputs.altitude_m),
        "speed": session.speed,
        "paused": session.paused,
        "atmosphere": session.atmosphere,
        "wall_ts": time.time(),
    }


def _prognosis_fields(session: Session) -> dict[str, Any]:
    prog = session.prognosis
    if prog is None:
        return {"rul_mean_hours": None, "rul_p05_hours": None, "rul_p95_hours": None}
    return {
        "rul_mean_hours": prog.rul_mean_hours,
        "rul_p05_hours": prog.rul_p05_hours,
        "rul_p95_hours": prog.rul_p95_hours,
        "rul_model": prog.model,
        "rul_threshold_index": prog.threshold_index,
        "rul_capped": prog.rul_mean_hours is not None and prog.rul_mean_hours >= PrognosticsConfig().horizon_cap_hours - 1e-6,
        "degradation_rate_per_hour": prog.degradation_rate_per_hour,
    }


def _live_tick(session: Session, state: AppState, inputs, context: dict[str, Any]) -> dict[str, Any]:
    """One LIVE-mode tick: plant -> sensors (+faults) -> HIL bus -> twin -> analytics."""
    assert session.plant is not None
    injector = session.fault_injector
    injector.step_callback(session.t, session.plant)
    plant_out = session.plant.step(inputs)
    flat = plant_out.as_flat_dict()
    measured = {
        c: flat[c] + session.rng.normal(0, SENSOR_SPECS[c].noise_std if c in SENSOR_SPECS else 0.0)
        for c in MEASUREMENT_CHANNELS
    }
    sensor_specs = injector._sensor_specs
    if sensor_specs:
        measured = apply_live_sensor_faults(session.t, measured, sensor_specs, session.rng, session.sensor_fault_state)
    selftest = sensor_selftest(session.t, MEASUREMENT_CHANNELS, sensor_specs)
    synthesized = [c for c, v in measured.items() if v != v]
    result = session.twin.step_live(inputs, measured, {c: v["status"] == "OK" for c, v in selftest.items()})
    if session.hil is not None:
        session.hil.step(session.t, inputs, plant_out, measured)

    spectrum = vibration_spectrum(
        {k[4:-2]: v for k, v in flat.items() if k.startswith("vib_") and k.endswith("_g")},
        measured.get("rpm", flat.get("rpm", 0.0)), session.engine_config,
    )
    row: dict[str, Any] = {
        "t_s": result.t_s,
        "mode": "LIVE",
        "context": context,
        "expected": result.expected,
        "measured": result.measured,
        "residuals": result.residuals,
        "normalized_residuals": result.normalized_residuals,
        "alarms": result.alarms,
        "fault_locus": result.fault_locus,
        "degradation_state": result.degradation_state,
        "health_index": result.health.overall_index,
        "health_risk": result.health.overall_risk,
        "subsystem_index": result.health.subsystem_index,
        "subsystem_risk": result.health.subsystem_risk,
        "confidence_pct": result.confidence_pct,
        "expected_ci": result.expected_ci,
        "vibration_spectrum": spectrum,
        "vibration_ips_rms": overall_velocity_ips(spectrum),
        "oil_consumption_l_h": flat.get("oil_consumption_l_h"),
        "coolant_mass_flow_kg_s": flat.get("coolant_mass_flow_kg_s"),
        "coolant_pressure_kpa": flat.get("coolant_pressure_kpa"),
        "expected_coolant_pressure_kpa": result.expected.get("coolant_pressure_kpa"),
        "power_w": flat.get("power_w"),
        "injection_timing_deg": flat.get("injection_timing_deg"),
        "hil_bus": session.hil.stats() if session.hil is not None else None,
    }
    for subsystem, risk in result.health.subsystem_risk.items():
        alert = session.alert_manager.update(session.t, subsystem, risk)
        if alert is not None:
            session.alerts.append(alert)

    # Lifetime prognostics: smoothed live health index appended to the tail's history.
    alpha = min(1.0, session.twin.dt / HEALTH_EWMA_TAU_S)
    hi = result.health.overall_index
    # Until detection is armed (estimator settled, past start-up) the live index is a
    # warm-up transient, not degradation: prognose from the stored history alone.
    settled = session.analytics is None or session.analytics.armed
    if settled:
        session.health_ewma = hi if session.health_ewma is None else (1 - alpha) * session.health_ewma + alpha * hi
    else:
        session.health_ewma = None
    if session.t - session.last_prognosis_t >= PROGNOSIS_INTERVAL_S:
        session.last_prognosis_t = session.t
        hours, values = session.rul_history
        if session.health_ewma is not None:
            hours, values = [*hours, session.engine_hours], [*values, session.health_ewma]
        session.prognosis = prognose(hours, values, state.prognostics_config)
        if session.analytics is not None:
            session.analytics.on_rul(session.t, session.prognosis.rul_mean_hours)
    row.update(_prognosis_fields(session))

    # Fault classifier: residual features vs a nominal-health baseline,
    # sampled at 1Hz and re-classified every FEATURE_STRIDE_S — mirrors
    # the offline training pipeline in aerotwin/ml/features.py exactly.
    if session.nominal_model is not None and session.t - session.last_nominal_step_t >= 1.0 - 1e-6:
        session.last_nominal_step_t = session.t
        nominal_out = session.nominal_model.step(inputs).as_flat_dict()
        feat_row: dict[str, float] = {"t_s": session.t}
        for c in FEATURE_CHANNELS:
            if c in measured and c in nominal_out:
                value = measured[c] if measured[c] == measured[c] else result.expected.get(c, nominal_out[c])
                feat_row[f"measured_{c}"] = value
                feat_row[f"resid_{c}"] = value - nominal_out[c]
        session.feature_window.append(feat_row)
        session.last_feat_row = feat_row
        cutoff = session.t - FEATURE_WINDOW_S
        session.feature_window = [r for r in session.feature_window if r["t_s"] >= cutoff]

        if (
            state.classifier is not None
            and session.t - session.last_classify_t >= FEATURE_STRIDE_S
            and len(session.feature_window) >= 3
        ):
            session.last_classify_t = session.t
            try:
                session.last_diagnosis, session.last_probs = _classify_fault(session, state.classifier, result.health)
                if session.analytics is not None:
                    session.analytics.on_classification(
                        session.t, session.last_probs, session.last_diagnosis.fault, session.last_diagnosis.confidence
                    )
            except Exception:
                pass  # keep the previous diagnosis rather than crashing the session loop

    if session.last_diagnosis is not None:
        row["diagnosis"] = asdict(session.last_diagnosis)
        row["class_probabilities"] = session.last_probs

    if session.analytics is not None:
        row.update(
            session.analytics.on_tick(
                session.t, context["phase"], inputs.altitude_m, inputs.ambient_temp_k, result, measured,
                selftest, synthesized, session.twin.model.health, result.confidence_pct,
                {c: session.twin.detector.ewma_value(c) for c in MEASUREMENT_CHANNELS},
            )
        )

    if session.t - session.last_persist_t >= PERSIST_INTERVAL_S - 1e-6:
        session.last_persist_t = session.t
        # Persisted 1 Hz columns for Replay/Reports/Trends: raw physics, flight
        # condition, twin expectations for key channels, health-parameter
        # trajectory, subsystem indices and the live AI diagnosis.
        persisted = {
            "t_s": session.t,
            "segment": context["phase"],
            "throttle": inputs.throttle,
            "altitude_m": inputs.altitude_m,
            "ambient_temp_k": inputs.ambient_temp_k,
            "airspeed_mps": inputs.airspeed_mps,
            **flat,
            # Stored telemetry is what the ground station received (sensor
            # readings, NaN on dropout), not the hidden plant's true state.
            **{c: measured[c] for c in MEASUREMENT_CHANNELS},
            **{k: v for k, v in session.last_feat_row.items() if k.startswith("resid_")},
            **{f"expected_{c}": result.expected[c] for c in PERSISTED_EXPECTED if c in result.expected},
            **{f"health_{k}": v for k, v in result.degradation_state.items()},
            **{f"subsystem_{k}": v for k, v in result.health.subsystem_index.items()},
            "health_index": result.health.overall_index,
            "health_risk": result.health.overall_risk,
            "confidence_pct": result.confidence_pct,
            "alarm_count": sum(1 for v in result.alarms.values() if v),
            "rul_mean_hours": row.get("rul_mean_hours"),
            "anomaly_score": row.get("anomaly_score", {}).get("value"),
            "vibration_ips_rms": row["vibration_ips_rms"],
            "engine_hours": session.engine_hours,
        }
        if session.last_diagnosis is not None:
            persisted["diagnosis_fault"] = session.last_diagnosis.fault
            persisted["diagnosis_confidence"] = session.last_diagnosis.confidence
        session.rows.append(persisted)
    return row


async def run_session_loop(session: Session, state: AppState, max_rows: int = 200_000) -> None:
    """Background asyncio task: step the session's physics forward and publish to `state.buffer`."""
    dt = session.twin.dt
    total_s = session.mission.total_duration_s

    try:
        while session.running and session.t < total_s:
            if session.paused and session.step_ticks <= 0:
                await asyncio.sleep(0.05)
                continue
            if session.step_ticks > 0:
                session.step_ticks -= 1
            inputs = session.mission_helper.inputs_at_time(session.t)
            if session.throttle_cap is not None and inputs.throttle > session.throttle_cap:
                inputs = replace(inputs, throttle=session.throttle_cap)
            context = session_context(session, state, inputs)

            if session.mode == "LIVE" and session.plant is not None:
                row = _live_tick(session, state, inputs, context)
            else:
                out = session.twin.step_simulation(inputs)
                flat = out.as_flat_dict()
                row = {
                    "t_s": session.t, "mode": "SIMULATION", "context": context,
                    "expected": flat, "measured": flat, "true": flat,
                }
                if len(session.rows) < max_rows and session.t - session.last_persist_t >= PERSIST_INTERVAL_S - 1e-6:
                    session.last_persist_t = session.t
                    session.rows.append({"t_s": session.t, "segment": context["phase"], **flat})
            state.buffer.push(row)
            session.t += dt
            await asyncio.sleep(dt / max(session.speed, 1e-6))
    except asyncio.CancelledError:
        pass


_state: AppState | None = None


def get_app_state() -> AppState:
    """Return the process-wide AppState singleton, creating it on first use."""
    global _state
    if _state is None:
        _state = AppState()
    return _state
