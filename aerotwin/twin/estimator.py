"""UKF state/health estimator: fuses measured telemetry with the MVEM to
track slowly-varying health parameters online.

The augmented state is [reduced physics state (13, crank-phase theta
dropped since it's unmeasured and unbounded), health parameters (10)].
Health parameters are modeled as a random walk (small process noise); the
physics substate's process model is the *actual* RK4 physics step, reusing
`EngineModel` directly so there is exactly one physics implementation in
the codebase.
"""

from __future__ import annotations

import numpy as np
from filterpy.kalman import MerweScaledSigmaPoints, UnscentedKalmanFilter

from aerotwin.physics.engine_model import EngineModel
from aerotwin.physics.state import (
    HEALTH_DIM,
    IDX_THETA,
    STATE_DIM,
    EngineInputs,
    initial_state_vector,
    nominal_health_vector,
)
from aerotwin.twin.config import EngineConfig

N_PHYS = STATE_DIM - 1  # drop crank-phase theta from the estimated state
N_AUG = N_PHYS + HEALTH_DIM

MEASUREMENT_CHANNELS = [
    "rpm", "map_kpa",
    "cht_1_k", "cht_2_k", "cht_3_k", "cht_4_k",
    "egt_1_k", "egt_2_k", "egt_3_k", "egt_4_k",
    "oil_pressure_kpa", "oil_temp_k", "coolant_temp_k",
    "fuel_flow_kg_s", "alternator_voltage_v", "alternator_current_a",
    "battery_soc", "vibration_rms_g",
]

# approx measurement noise std per channel — replace with OEM sensor datasheets
MEASUREMENT_NOISE_STD = {
    "rpm": 8.0, "map_kpa": 0.5,
    "cht_1_k": 1.5, "cht_2_k": 1.5, "cht_3_k": 1.5, "cht_4_k": 1.5,
    "egt_1_k": 3.0, "egt_2_k": 3.0, "egt_3_k": 3.0, "egt_4_k": 3.0,
    "oil_pressure_kpa": 3.0, "oil_temp_k": 1.0, "coolant_temp_k": 1.0,
    "fuel_flow_kg_s": 0.0001, "alternator_voltage_v": 0.2, "alternator_current_a": 0.5,
    "battery_soc": 0.01, "vibration_rms_g": 0.01,
}

# Process noise: near-zero on physics substates (the RK4 model already
# captures their dynamics), small random-walk variance on health params.
PHYS_PROCESS_VAR = 1e-4
HEALTH_PROCESS_VAR = 1e-6


def _split(z: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    return z[:N_PHYS], z[N_PHYS:]


def _to_full_state(phys: np.ndarray) -> np.ndarray:
    x = np.zeros(STATE_DIM)
    x[:N_PHYS] = phys
    x[IDX_THETA] = 0.0
    return x


def fx(z: np.ndarray, dt: float, config: EngineConfig, inputs: EngineInputs) -> np.ndarray:
    """UKF process model: step physics forward, hold health constant (Q adds the walk)."""
    phys, health = _split(z)
    model = EngineModel(config, health=health.copy(), state=_to_full_state(phys), dt=dt)
    model.step(inputs)
    return np.concatenate([model.state[:N_PHYS], health])


def hx(z: np.ndarray, config: EngineConfig, inputs: EngineInputs) -> np.ndarray:
    """UKF measurement model: map the augmented state to the measured-channel vector."""
    phys, health = _split(z)
    model = EngineModel(config, health=health.copy(), state=_to_full_state(phys))
    out = model.compute_outputs(inputs)
    flat = out.as_flat_dict()
    return np.array([flat[c] for c in MEASUREMENT_CHANNELS])


class TwinEstimator:
    """Wraps a filterpy UKF for online health-parameter estimation."""

    def __init__(
        self,
        config: EngineConfig,
        dt: float = 0.05,
        initial_health: np.ndarray | None = None,
        initial_physics_state: np.ndarray | None = None,
    ) -> None:
        self.config = config
        self.dt = dt
        health0 = (
            initial_health.copy()
            if initial_health is not None
            else nominal_health_vector(config.nominal_health.injector_flow_coeff)
        )
        phys0 = (initial_physics_state if initial_physics_state is not None else initial_state_vector())[:N_PHYS]

        points = MerweScaledSigmaPoints(n=N_AUG, alpha=0.3, beta=2.0, kappa=3 - N_AUG)
        self.ukf = UnscentedKalmanFilter(
            dim_x=N_AUG, dim_z=len(MEASUREMENT_CHANNELS), dt=dt, hx=hx, fx=fx, points=points
        )
        self.ukf.x = np.concatenate([phys0, health0])
        self.ukf.P = np.diag(
            [1.0] * N_PHYS + [0.02] * HEALTH_DIM
        )
        self.ukf.Q = np.diag([PHYS_PROCESS_VAR] * N_PHYS + [HEALTH_PROCESS_VAR] * HEALTH_DIM)
        self.ukf.R = np.diag([MEASUREMENT_NOISE_STD[c] ** 2 for c in MEASUREMENT_CHANNELS])

    @property
    def health(self) -> np.ndarray:
        """Current health-parameter estimate (10,)."""
        return self.ukf.x[N_PHYS:].copy()

    @property
    def physics_state(self) -> np.ndarray:
        """Current reduced physics-state estimate (13,), theta excluded."""
        return self.ukf.x[:N_PHYS].copy()

    @property
    def confidence_pct(self) -> float:
        """0-100: how converged the health-parameter estimate is (posterior vs. prior variance).

        100% would mean the UKF has fully resolved health-parameter uncertainty
        from its 0.02 prior; 0% (the value before any update has run) means no
        information has been incorporated yet.
        """
        health_var = np.diag(self.ukf.P)[N_PHYS:]
        prior_var = 0.02
        return float(np.clip(100.0 * (1.0 - np.mean(health_var) / prior_var), 0.0, 100.0))

    @property
    def measurement_variance(self) -> dict[str, float]:
        """Per-channel predicted-measurement variance (diag of the innovation covariance `S`)
        from the most recent UKF update — 0.0 for every channel before the first update.
        """
        s = getattr(self.ukf, "S", None)
        if s is None:
            return dict.fromkeys(MEASUREMENT_CHANNELS, 0.0)
        return dict(zip(MEASUREMENT_CHANNELS, (float(v) for v in np.diag(s)), strict=True))

    def step(self, inputs: EngineInputs, measured: dict[str, float]) -> np.ndarray:
        """Predict + update with one measurement row; returns the innovation (residual) vector."""
        self.ukf.predict(config=self.config, inputs=inputs)
        z = np.array([measured[c] for c in MEASUREMENT_CHANNELS])
        expected_z = hx(self.ukf.x, self.config, inputs)
        self.ukf.update(z, config=self.config, inputs=inputs)
        return z - expected_z
