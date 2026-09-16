"""Mission definition schema, registry, and MissionRunner.

A mission is a sequence of segments (taxi, takeoff, climb, cruise, loiter,
descent, landing). Within each segment, altitude/airspeed/throttle ramp
linearly from the value at the end of the previous segment to the segment's
own target by the end of its duration, giving continuous, physically
plausible profiles across segment boundaries.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
import yaml
from pydantic import BaseModel

from aerotwin.physics.atmosphere import isa_pressure_temp
from aerotwin.physics.engine_model import EngineModel
from aerotwin.physics.state import HEALTH_NAMES, EngineInputs
from aerotwin.twin.config import EngineConfig

DEFAULT_MISSION_CONFIG_DIR = Path(__file__).resolve().parents[2] / "configs" / "missions"


class SegmentConfig(BaseModel):
    """One mission segment; targets are reached by linear ramp over `duration_s`."""

    name: str
    duration_s: float
    target_altitude_m: float
    target_airspeed_mps: float
    throttle: float
    isa_deviation_k: float | None = None


class EnvironmentConfig(BaseModel):
    """Mission-wide environment baseline; segments may override `isa_deviation_k`."""

    base_isa_deviation_k: float = 0.0


class MissionConfig(BaseModel):
    """Top-level, validated mission definition loaded from YAML."""

    mission_id: str
    display_name: str
    engine_id: str = "rotax914_like"
    environment: EnvironmentConfig
    segments: list[SegmentConfig]

    @classmethod
    def from_yaml(cls, path: Path) -> MissionConfig:
        """Load and validate a mission config from a YAML file."""
        with path.open() as f:
            raw = yaml.safe_load(f)
        return cls.model_validate(raw)

    @property
    def total_duration_s(self) -> float:
        """Sum of all segment durations, in seconds."""
        return sum(s.duration_s for s in self.segments)


class MissionRegistry:
    """Loads and caches every mission YAML found in a config directory."""

    def __init__(self, config_dir: Path | str = DEFAULT_MISSION_CONFIG_DIR) -> None:
        self.config_dir = Path(config_dir)
        self._missions: dict[str, MissionConfig] = {}
        self._load_all()

    def _load_all(self) -> None:
        for path in sorted(self.config_dir.glob("*.yaml")):
            cfg = MissionConfig.from_yaml(path)
            self._missions[cfg.mission_id] = cfg

    def get(self, mission_id: str) -> MissionConfig:
        """Return the validated config for `mission_id`, raising KeyError if unknown."""
        if mission_id not in self._missions:
            raise KeyError(
                f"Unknown mission_id '{mission_id}'. Available: {sorted(self._missions)}"
            )
        return self._missions[mission_id]

    def list_missions(self) -> list[str]:
        """Return all discovered mission ids."""
        return sorted(self._missions)


@dataclass
class _SegmentBounds:
    start_t: float
    end_t: float
    segment: SegmentConfig
    start_altitude: float
    start_airspeed: float
    start_throttle: float


def _build_segment_bounds(mission: MissionConfig) -> list[_SegmentBounds]:
    bounds: list[_SegmentBounds] = []
    t = 0.0
    altitude, airspeed, throttle = 0.0, 0.0, 0.0
    for seg in mission.segments:
        bounds.append(
            _SegmentBounds(
                start_t=t,
                end_t=t + seg.duration_s,
                segment=seg,
                start_altitude=altitude,
                start_airspeed=airspeed,
                start_throttle=throttle,
            )
        )
        t += seg.duration_s
        altitude, airspeed, throttle = seg.target_altitude_m, seg.target_airspeed_mps, seg.throttle
    return bounds


class MissionRunner:
    """Drives an EngineModel through a mission profile, logging results."""

    def __init__(
        self,
        engine_config: EngineConfig,
        mission: MissionConfig,
        dt: float = 0.05,
        initial_health: np.ndarray | None = None,
        initial_state: np.ndarray | None = None,
    ) -> None:
        self.engine_config = engine_config
        self.mission = mission
        self.dt = dt
        self.model = EngineModel(engine_config, health=initial_health, state=initial_state, dt=dt)
        self._bounds = _build_segment_bounds(mission)

    def inputs_at_time(self, t: float) -> EngineInputs:
        """Interpolate mission inputs (throttle, altitude, airspeed, ambient) at time t."""
        b = self._bounds[-1]
        for cand in self._bounds:
            if cand.start_t <= t <= cand.end_t:
                b = cand
                break
        frac = 0.0 if b.end_t == b.start_t else (t - b.start_t) / (b.end_t - b.start_t)
        frac = min(max(frac, 0.0), 1.0)
        altitude = b.start_altitude + frac * (b.segment.target_altitude_m - b.start_altitude)
        airspeed = b.start_airspeed + frac * (b.segment.target_airspeed_mps - b.start_airspeed)
        throttle = b.start_throttle + frac * (b.segment.throttle - b.start_throttle)
        isa_dev = (
            b.segment.isa_deviation_k
            if b.segment.isa_deviation_k is not None
            else self.mission.environment.base_isa_deviation_k
        )
        p_amb, t_amb = isa_pressure_temp(altitude, isa_dev)
        return EngineInputs(
            throttle=throttle,
            ambient_pressure_pa=p_amb,
            ambient_temp_k=t_amb,
            altitude_m=altitude,
            airspeed_mps=airspeed,
        )

    def current_segment_name(self, t: float) -> str:
        """Return the name of the segment active at time t."""
        for cand in self._bounds:
            if cand.start_t <= t <= cand.end_t:
                return cand.segment.name
        return self._bounds[-1].segment.name

    def run(
        self,
        log_interval_s: float = 1.0,
        step_callback: Callable[[float, EngineModel], None] | None = None,
    ) -> pd.DataFrame:
        """Run the full mission and return a per-log-tick DataFrame.

        `step_callback(t, model)` is invoked after each raw physics step,
        before logging — this is the hook faults (M3) use to mutate
        `model.misfire_mask` / `model.health` / etc. as a function of time.
        """
        total_s = self.mission.total_duration_s
        n_steps = int(round(total_s / self.dt))
        log_every = max(1, int(round(log_interval_s / self.dt)))

        rows: list[dict] = []
        t = 0.0
        for i in range(n_steps):
            inputs = self.inputs_at_time(t)
            out = self.model.step(inputs)
            if step_callback is not None:
                step_callback(t, self.model)
            if i % log_every == 0:
                row: dict = {
                    "t_s": t,
                    "segment": self.current_segment_name(t),
                    "throttle": inputs.throttle,
                    "ambient_pressure_pa": inputs.ambient_pressure_pa,
                    "ambient_temp_k": inputs.ambient_temp_k,
                    "altitude_m": inputs.altitude_m,
                    "airspeed_mps": inputs.airspeed_mps,
                }
                row.update(out.as_flat_dict())
                for name, val in zip(HEALTH_NAMES, self.model.health, strict=True):
                    row[f"health_{name}"] = float(val)
                rows.append(row)
            t += self.dt
        return pd.DataFrame(rows)
