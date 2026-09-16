"""FaultInjector: ties engine-fault step effects and sensor-fault post-processing together.

Usage:
    injector = FaultInjector([spec1, spec2], seed=42)
    df = runner.run(step_callback=injector.step_callback)
    df = injector.postprocess(df)
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from aerotwin.faults.engine_faults import apply_engine_fault
from aerotwin.faults.sensor_faults import apply_sensor_fault
from aerotwin.faults.sensor_model import apply_sensor_model
from aerotwin.faults.specs import ENGINE_FAULT_TYPES, SENSOR_FAULT_TYPES, FaultSpec, severity_at
from aerotwin.physics.engine_model import EngineModel


class FaultInjector:
    """Applies zero or more `FaultSpec`s to a mission run."""

    def __init__(self, specs: list[FaultSpec] | None = None, seed: int = 0) -> None:
        self.specs = specs or []
        self.rng = np.random.default_rng(seed)
        self._engine_specs = [s for s in self.specs if s.fault_type in ENGINE_FAULT_TYPES]
        self._sensor_specs = [s for s in self.specs if s.fault_type in SENSOR_FAULT_TYPES]
        self._state: dict[int, dict] = {id(s): {} for s in self._engine_specs}

    def add_spec(self, spec: FaultSpec) -> None:
        """Add a fault spec to a running injector (e.g. live demo fault injection)."""
        self.specs.append(spec)
        if spec.fault_type in ENGINE_FAULT_TYPES:
            self._engine_specs.append(spec)
            self._state[id(spec)] = {}
        elif spec.fault_type in SENSOR_FAULT_TYPES:
            self._sensor_specs.append(spec)

    def step_callback(self, t: float, model: EngineModel) -> None:
        """Apply all engine-level faults' effect on `model` at time t."""
        for spec in self._engine_specs:
            apply_engine_fault(t, model, spec, self.rng, self._state[id(spec)])

    def postprocess(self, df: pd.DataFrame, log_interval_s: float = 1.0) -> pd.DataFrame:
        """Add measured_* columns (base sensor model + any sensor faults) and fault labels."""
        df = apply_sensor_model(df, self.rng, log_interval_s=log_interval_s)
        for spec in self._sensor_specs:
            df = apply_sensor_fault(df, spec, self.rng)

        primary = self.specs[0] if self.specs else None
        df["fault_type"] = primary.fault_type if primary else "healthy"
        df["fault_target"] = str(primary.target) if primary and primary.target is not None else ""
        if primary is not None:
            df["fault_severity"] = [severity_at(ti, primary) for ti in df["t_s"]]
        else:
            df["fault_severity"] = 0.0
        return df

    @property
    def is_healthy(self) -> bool:
        """True if this injector carries no faults at all (a healthy baseline run)."""
        return len(self.specs) == 0
