"""DigitalTwin: the shared twin core — LIVE mode compares model vs measurement,
SIMULATION mode runs the model forward for planning, both driven by the same
EngineModel/physics kernel.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

import numpy as np

from aerotwin.health.indices import HealthSnapshot, compute_health_snapshot
from aerotwin.physics.engine_model import EngineModel
from aerotwin.physics.state import HEALTH_NAMES, EngineInputs, EngineOutputs, nominal_health_vector
from aerotwin.twin.config import EngineConfig
from aerotwin.twin.estimator import N_PHYS, TwinEstimator
from aerotwin.twin.residuals import (
    CORRELATED_GROUPS,
    EwmaCusumDetector,
    classify_fault_locus,
    compute_residuals,
    normalize_residuals,
)

TwinMode = Literal["LIVE", "SIMULATION", "REPLAY"]

DEFAULT_UKF_UPDATE_INTERVAL_S = 1.0


@dataclass
class TwinStepResult:
    """Everything one LIVE-mode twin tick produces."""

    t_s: float
    expected: dict[str, float]
    measured: dict[str, float] | None
    residuals: dict[str, float]
    normalized_residuals: dict[str, float]
    alarms: dict[str, bool]
    fault_locus: dict[str, str]
    degradation_state: dict[str, float]
    health: HealthSnapshot
    confidence_pct: float
    expected_ci: dict[str, list[float]]


@dataclass
class DigitalTwin:
    """Owns one EngineModel and (in LIVE mode) one UKF estimator."""

    config: EngineConfig
    dt: float = 0.05
    mode: TwinMode = "SIMULATION"
    ukf_update_interval_s: float = DEFAULT_UKF_UPDATE_INTERVAL_S
    model: EngineModel = field(init=False)
    estimator: TwinEstimator = field(init=False)
    detector: EwmaCusumDetector = field(init=False)
    t: float = field(default=0.0, init=False)
    _last_ukf_update_t: float = field(default=-1e9, init=False)

    def __post_init__(self) -> None:
        self.model = EngineModel(self.config, dt=self.dt)
        self.estimator = TwinEstimator(self.config, dt=self.ukf_update_interval_s)
        self.detector = EwmaCusumDetector()

    def reset_for_simulation(self, initial_health: np.ndarray | None = None) -> None:
        """Start a fresh SIMULATION-mode run, optionally seeded from a known health state.

        This is the feedback-loop entry point: mission go/no-go analysis
        seeds `initial_health` from the LIVE twin's latest `degradation_state`
        so a planned mission is evaluated against the engine's *current*
        condition, not a pristine one.
        """
        health = (
            initial_health.copy()
            if initial_health is not None
            else nominal_health_vector(self.config.nominal_health.injector_flow_coeff)
        )
        self.mode = "SIMULATION"
        self.model = EngineModel(self.config, health=health, dt=self.dt)
        self.t = 0.0

    def step_simulation(self, inputs: EngineInputs) -> EngineOutputs:
        """Advance the model forward under mission inputs (no measurement comparison)."""
        self.t += self.dt
        return self.model.step(inputs)

    def step_live(
        self, inputs: EngineInputs, measured: dict[str, float], selftest_ok: dict[str, bool] | None = None
    ) -> TwinStepResult:
        """Advance the twin one tick in LIVE mode: predict, compare, periodically correct.

        Core rule: only `inputs` (throttle/ambient/altitude/airspeed) drive
        the model — `measured` is used solely for comparison/correction,
        never fed into the model as an input.
        """
        self.t += self.dt
        expected_out = self.model.step(inputs)
        expected_flat = expected_out.as_flat_dict()

        # Failsafe: a dropped/invalid sample (NaN) is synthesized from the twin's
        # own prediction so the estimator and detectors keep running.
        synthesized = [c for c, v in measured.items() if v != v]
        if synthesized:
            measured = {c: (expected_flat[c] if c in synthesized else v) for c, v in measured.items()}
        residuals = compute_residuals(measured, expected_flat)
        normalized = normalize_residuals(residuals)
        alarms = self.detector.update(normalized)
        fault_locus = classify_fault_locus(normalized, CORRELATED_GROUPS, selftest_ok=selftest_ok)
        for c in synthesized:
            fault_locus[c] = "sensor"

        if self.t - self._last_ukf_update_t >= self.ukf_update_interval_s:
            self.estimator.ukf.x[:N_PHYS] = self.model.state[:N_PHYS]
            self.estimator.step(inputs, measured)
            self.model.health = self.estimator.health
            self._last_ukf_update_t = self.t

        sensor_fault_fraction = (
            sum(1 for v in fault_locus.values() if v == "sensor") / len(fault_locus) if fault_locus else 0.0
        )
        health_snapshot = compute_health_snapshot(
            self.model.health, expected_flat, self.config, sensor_fault_fraction=sensor_fault_fraction
        )
        degradation_state = dict(zip(HEALTH_NAMES, (float(v) for v in self.model.health), strict=True))

        # 95% prediction interval per measured channel, from the UKF's innovation
        # covariance — powers the Twin Comparison confidence-envelope ribbon.
        variance = self.estimator.measurement_variance
        expected_ci = {
            c: [float(expected_flat[c] - 1.96 * variance[c] ** 0.5), float(expected_flat[c] + 1.96 * variance[c] ** 0.5)]
            for c in variance
            if c in expected_flat
        }

        return TwinStepResult(
            t_s=self.t,
            expected=expected_flat,
            measured=measured,
            residuals=residuals,
            normalized_residuals=normalized,
            alarms=alarms,
            fault_locus=fault_locus,
            degradation_state=degradation_state,
            health=health_snapshot,
            confidence_pct=self.estimator.confidence_pct,
            expected_ci=expected_ci,
        )

    @property
    def degradation_state(self) -> dict[str, float]:
        """Current best estimate of the health-parameter vector, by name."""
        return dict(zip(HEALTH_NAMES, (float(v) for v in self.model.health), strict=True))
