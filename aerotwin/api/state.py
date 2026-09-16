"""Shared application state: the active LIVE/SIMULATION session, replay session,
alert manager, and storage handles used by the FastAPI routes.
"""

from __future__ import annotations

import asyncio
import threading
import uuid
from dataclasses import dataclass, field
from typing import Any, Literal

import numpy as np

from aerotwin.acquisition.datasource import ParquetReplayDataSource
from aerotwin.diagnostics.alerts import Alert, AlertManager
from aerotwin.faults.injector import FaultInjector
from aerotwin.faults.sensor_model import SENSOR_SPECS
from aerotwin.faults.specs import FaultSpec
from aerotwin.physics.engine_model import EngineModel
from aerotwin.simulation.mission import MissionConfig, MissionRegistry, MissionRunner
from aerotwin.storage.buffer import LiveBuffer
from aerotwin.storage.db import close_mission, get_connection, insert_alert, insert_mission
from aerotwin.storage.parquet_store import save_mission_log
from aerotwin.twin.config import EngineConfig, EngineRegistry
from aerotwin.twin.digital_twin import DigitalTwin
from aerotwin.twin.estimator import MEASUREMENT_CHANNELS

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
    speed: float = 50.0
    running: bool = True
    t: float = 0.0
    fault_injector: FaultInjector = field(default_factory=lambda: FaultInjector([], seed=0))
    alert_manager: AlertManager = field(default_factory=AlertManager)
    alerts: list[Alert] = field(default_factory=list)
    rng: np.random.Generator = field(default_factory=lambda: np.random.default_rng(0))
    rows: list[dict[str, Any]] = field(default_factory=list)
    task: asyncio.Task | None = None


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
        self.buffer = LiveBuffer()
        self.db = get_connection()
        self.session: Session | None = None
        self.replay: ReplaySession | None = None
        # Mission-risk Monte Carlo is CPU-bound pure-Python physics work that holds the
        # GIL; letting two overlapping requests (e.g. an impatient double-click, or a
        # client retrying after its own timeout) run concurrently makes both — and
        # everything else in the process — many times slower rather than sharing
        # progress. One at a time; a second caller gets a clear 409 instead of a stall.
        self.mission_risk_lock = threading.Lock()

    def start_session(self, mode: SessionMode, engine_id: str, mission_id: str, speed: float) -> Session:
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
        run_id = f"{mode.lower()}_{mission_id}_{uuid.uuid4().hex[:8]}"

        session = Session(
            mode=mode, engine_config=engine_config, mission=mission, twin=twin, plant=plant,
            mission_helper=mission_helper, run_id=run_id, speed=speed,
        )
        self.session = session
        insert_mission(self.db, run_id, engine_id, mission_id)
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


async def run_session_loop(session: Session, buffer: LiveBuffer, max_rows: int = 200_000) -> None:
    """Background asyncio task: step the session's physics forward and publish to `buffer`."""
    dt = session.twin.dt
    total_s = session.mission.total_duration_s
    channels = MEASUREMENT_CHANNELS

    try:
        while session.running and session.t < total_s:
            inputs = session.mission_helper.inputs_at_time(session.t)

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
                    "expected": result.expected,
                    "measured": result.measured,
                    "true": flat,
                    "residuals": result.residuals,
                    "alarms": result.alarms,
                    "fault_locus": result.fault_locus,
                    "degradation_state": result.degradation_state,
                    "health_index": result.health.overall_index,
                    "health_risk": result.health.overall_risk,
                    "subsystem_index": result.health.subsystem_index,
                    "subsystem_risk": result.health.subsystem_risk,
                }
                for subsystem, risk in result.health.subsystem_risk.items():
                    alert = session.alert_manager.update(session.t, subsystem, risk)
                    if alert is not None:
                        session.alerts.append(alert)
            else:
                out = session.twin.step_simulation(inputs)
                flat = out.as_flat_dict()
                row = {"t_s": session.t, "mode": "SIMULATION", "expected": flat, "measured": flat, "true": flat}

            if len(session.rows) < max_rows:
                session.rows.append({"t_s": session.t, **flat})
            buffer.push(row)
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
