"""Shared application state: the active LIVE/SIMULATION session, replay session,
alert manager, and storage handles used by the FastAPI routes.
"""

from __future__ import annotations

import asyncio
import pickle
import threading
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal

import numpy as np
import pandas as pd

from aerotwin.acquisition.bus import get_can_bus
from aerotwin.acquisition.datasource import ParquetReplayDataSource
from aerotwin.acquisition.link import StationConfig, link_margin_db
from aerotwin.auth.service import seed_operators
from aerotwin.diagnostics.alerts import Alert, AlertManager
from aerotwin.diagnostics.diagnosis import Diagnosis, build_diagnosis
from aerotwin.faults.injector import FaultInjector
from aerotwin.faults.sensor_model import SENSOR_SPECS
from aerotwin.faults.specs import FaultSpec
from aerotwin.ml.classifier import FaultClassifier
from aerotwin.ml.features import FEATURE_CHANNELS, _window_features
from aerotwin.ml.rul import RulParticleFilter
from aerotwin.physics.engine_model import EngineModel
from aerotwin.physics.state import nominal_health_vector
from aerotwin.physics.vibration import vibration_spectrum
from aerotwin.simulation.mission import MissionConfig, MissionRegistry, MissionRunner
from aerotwin.storage.buffer import LiveBuffer
from aerotwin.storage.db import close_mission, get_connection, insert_alert, insert_mission
from aerotwin.storage.parquet_store import save_mission_log
from aerotwin.twin.config import EngineConfig, EngineRegistry
from aerotwin.twin.digital_twin import DigitalTwin
from aerotwin.twin.estimator import MEASUREMENT_CHANNELS
from aerotwin.twin.fleet import FleetRegistry

# Live fault-classification cadence: residual features are computed from a 1Hz
# nominal-baseline re-simulation (matching the training feature pipeline in
# aerotwin/ml/features.py exactly), over a sliding window, re-classified every
# stride — mirrors build_windowed_features(window_s=30.0, stride_s=15.0).
FEATURE_WINDOW_S = 30.0
FEATURE_STRIDE_S = 15.0

SessionMode = Literal["LIVE", "SIMULATION"]


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
    t: float = 0.0
    fault_injector: FaultInjector = field(default_factory=lambda: FaultInjector([], seed=0))
    alert_manager: AlertManager = field(default_factory=AlertManager)
    alerts: list[Alert] = field(default_factory=list)
    rng: np.random.Generator = field(default_factory=lambda: np.random.default_rng(0))
    rows: list[dict[str, Any]] = field(default_factory=list)
    task: asyncio.Task | None = None
    # Live AI diagnosis (see run_session_loop): RUL particle filter runs every
    # tick; nominal_model + feature_window feed the fault classifier, which is
    # re-run every FEATURE_STRIDE_S seconds. LIVE mode only.
    rul_filter: RulParticleFilter = field(default_factory=lambda: RulParticleFilter(seed=0))
    nominal_model: EngineModel | None = None
    feature_window: list[dict[str, float]] = field(default_factory=list)
    last_diagnosis: Diagnosis | None = None
    last_classify_t: float = -1e9
    last_nominal_step_t: float = -1e9


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

    def start_session(
        self, mode: SessionMode, engine_id: str, mission_id: str, speed: float, tail_id: str | None = None
    ) -> Session:
        """Create and register a new LIVE or SIMULATION session (stops any existing one)."""
        self.stop_session()
        engine_config = self.engine_registry.get(engine_id)
        mission = self.mission_registry.get(mission_id)
        mission_helper = MissionRunner(engine_config, mission)

        current_health = None
        if mode == "SIMULATION" and self.session is not None:
            current_health = self.session.twin.model.health.copy()

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

        session = Session(
            mode=mode, engine_config=engine_config, mission=mission, twin=twin, plant=plant,
            mission_helper=mission_helper, run_id=run_id, tail_id=tail_id, speed=speed,
            nominal_model=nominal_model,
        )
        self.session = session
        insert_mission(self.db, run_id, engine_id, mission_id, tail_id=tail_id)
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
            import pandas as pd

            df = pd.DataFrame(session.rows)
            saved_path = str(save_mission_log(df, session.run_id))
        close_mission(self.db, session.run_id)
        for alert in session.alerts:
            insert_alert(self.db, session.run_id, alert.t_s, alert.subsystem, alert.severity, alert.message)
        self.session = None
        return saved_path

    def inject_fault(self, spec: FaultSpec) -> None:
        """Add a fault to the active session's injector (LIVE mode perturbs the hidden plant)."""
        if self.session is None:
            raise RuntimeError("No active session")
        self.session.fault_injector.add_spec(spec)


def _classify_fault(session: Session, classifier: FaultClassifier, health) -> Diagnosis:
    """Run the trained fault classifier + SHAP explainer over the session's rolling residual-feature window."""
    window_df = pd.DataFrame(session.feature_window)
    feats = _window_features(window_df)
    x = np.array([[feats.get(c, 0.0) for c in classifier.feature_cols]])
    pred = str(classifier.predict(x)[0])
    proba = classifier.predict_proba(x)[0]
    classes = list(classifier.encoder.classes_)
    confidence = float(proba[classes.index(pred)]) if pred in classes else float(np.max(proba))
    explanation = classifier.explain(x, top_k=3)[0]
    shap_features = classifier.explain_structured(x, top_k=5)[0]
    rul_est = session.rul_filter.estimate_rul(session.t, health.overall_index)
    return build_diagnosis(
        health, pred, confidence, explanation,
        rul_mean_hours=rul_est.mean_hours, rul_p05_hours=rul_est.p05_hours, rul_p95_hours=rul_est.p95_hours,
        shap_features=shap_features,
    )


def session_context(session: Session, state: AppState, inputs) -> dict[str, Any]:
    """Identity + flight-condition header data for one tick (shell top bar, sidebar footer)."""
    tail = None
    if session.tail_id is not None:
        try:
            tail = state.fleet_registry.get(session.tail_id)
        except KeyError:
            tail = None
    return {
        "tail_id": session.tail_id,
        "engine_id": session.engine_config.engine_id,
        "engine_class": session.engine_config.short_name or session.engine_config.display_name,
        "engine_serial": tail.engine_serial if tail else None,
        "run_id": session.run_id,
        "mission_id": session.mission.mission_id,
        "mission_name": session.mission.short_name or session.mission.display_name,
        "phase": session.mission_helper.current_segment_name(session.t),
        "altitude_m": inputs.altitude_m,
        "oat_c": inputs.ambient_temp_k - 273.15,
        "airspeed_mps": inputs.airspeed_mps,
        "link_hz": 1.0 / session.twin.dt,
        "link_margin_db": link_margin_db(state.station.datalink, inputs.altitude_m),
        "speed": session.speed,
        "wall_ts": time.time(),
    }


async def run_session_loop(session: Session, state: AppState, max_rows: int = 200_000) -> None:
    """Background asyncio task: step the session's physics forward and publish to `state.buffer`."""
    dt = session.twin.dt
    total_s = session.mission.total_duration_s
    channels = MEASUREMENT_CHANNELS

    try:
        while session.running and session.t < total_s:
            inputs = session.mission_helper.inputs_at_time(session.t)
            context = session_context(session, state, inputs)

            if session.mode == "LIVE" and session.plant is not None:
                session.fault_injector.step_callback(session.t, session.plant)
                plant_out = session.plant.step(inputs)
                flat = plant_out.as_flat_dict()
                measured = {
                    c: flat[c] + session.rng.normal(0, SENSOR_SPECS[c].noise_std if c in SENSOR_SPECS else 0.0)
                    for c in channels
                }
                result = session.twin.step_live(inputs, measured)
                row = {
                    "t_s": result.t_s,
                    "mode": "LIVE",
                    "context": context,
                    "expected": result.expected,
                    "measured": result.measured,
                    "true": flat,
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
                    "vibration_spectrum": vibration_spectrum(
                        {k[4:-2]: v for k, v in result.expected.items() if k.startswith("vib_") and k.endswith("_g")},
                        measured.get("rpm", flat.get("rpm", 0.0)),
                    ),
                }
                for subsystem, risk in result.health.subsystem_risk.items():
                    alert = session.alert_manager.update(session.t, subsystem, risk)
                    if alert is not None:
                        session.alerts.append(alert)

                # RUL: cheap particle-filter update + estimate every tick, so the
                # countdown streams smoothly even between classifier cycles.
                session.rul_filter.update(session.t, result.health.overall_index)
                rul_est = session.rul_filter.estimate_rul(session.t, result.health.overall_index)
                row["rul_mean_hours"] = rul_est.mean_hours
                row["rul_p05_hours"] = rul_est.p05_hours
                row["rul_p95_hours"] = rul_est.p95_hours

                # Fault classifier: residual features vs a nominal-health baseline,
                # sampled at 1Hz and re-classified every FEATURE_STRIDE_S — mirrors
                # the offline training pipeline in aerotwin/ml/features.py exactly.
                if session.nominal_model is not None and session.t - session.last_nominal_step_t >= 1.0 - 1e-6:
                    session.last_nominal_step_t = session.t
                    nominal_out = session.nominal_model.step(inputs).as_flat_dict()
                    feat_row: dict[str, float] = {"t_s": session.t}
                    for c in FEATURE_CHANNELS:
                        if c in measured and c in nominal_out:
                            feat_row[f"measured_{c}"] = measured[c]
                            feat_row[f"resid_{c}"] = measured[c] - nominal_out[c]
                    session.feature_window.append(feat_row)
                    cutoff = session.t - FEATURE_WINDOW_S
                    session.feature_window = [r for r in session.feature_window if r["t_s"] >= cutoff]

                    if (
                        state.classifier is not None
                        and session.t - session.last_classify_t >= FEATURE_STRIDE_S
                        and len(session.feature_window) >= 3
                    ):
                        session.last_classify_t = session.t
                        try:
                            session.last_diagnosis = _classify_fault(session, state.classifier, result.health)
                        except Exception:
                            pass  # keep the previous diagnosis rather than crashing the session loop

                if session.last_diagnosis is not None:
                    row["diagnosis"] = asdict(session.last_diagnosis)

                if len(session.rows) < max_rows:
                    # Persisted columns for Replay/Reports: raw physics + health-parameter
                    # trajectory (health_<name>, matching aerotwin/reports/pdf.py's expected
                    # column naming) + the live AI diagnosis, so a stored run keeps everything
                    # the Live Ops/Diagnostics screens showed while it was running.
                    persisted = {
                        "t_s": session.t,
                        **flat,
                        **{f"health_{k}": v for k, v in result.degradation_state.items()},
                        **{f"subsystem_{k}": v for k, v in result.health.subsystem_index.items()},
                        "health_index": result.health.overall_index,
                        "health_risk": result.health.overall_risk,
                        "confidence_pct": result.confidence_pct,
                        "alarm_count": sum(1 for v in result.alarms.values() if v),
                        "rul_mean_hours": row["rul_mean_hours"],
                    }
                    if session.last_diagnosis is not None:
                        persisted["diagnosis_fault"] = session.last_diagnosis.fault
                        persisted["diagnosis_confidence"] = session.last_diagnosis.confidence
                    session.rows.append(persisted)
            else:
                out = session.twin.step_simulation(inputs)
                flat = out.as_flat_dict()
                row = {
                    "t_s": session.t, "mode": "SIMULATION", "context": context,
                    "expected": flat, "measured": flat, "true": flat,
                }
                if len(session.rows) < max_rows:
                    session.rows.append({"t_s": session.t, **flat})
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
