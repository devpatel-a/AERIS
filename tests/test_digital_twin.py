"""Tests for the DigitalTwin core: LIVE-mode stepping and the degradation feedback loop."""

from __future__ import annotations

import numpy as np

from aerotwin.faults.sensor_model import SENSOR_SPECS
from aerotwin.physics.state import HIDX_COOLING_EFF, EngineInputs
from aerotwin.twin.config import EngineRegistry
from aerotwin.twin.digital_twin import DigitalTwin
from aerotwin.twin.estimator import MEASUREMENT_CHANNELS


def test_step_live_produces_full_result():
    """A single LIVE step should produce residuals, health, and a degradation state."""
    config = EngineRegistry().get("rotax914_like")
    twin = DigitalTwin(config, dt=0.05, ukf_update_interval_s=1.0)
    inputs = EngineInputs(throttle=0.6, ambient_pressure_pa=101325.0, ambient_temp_k=288.15, altitude_m=0.0, airspeed_mps=30.0)
    expected = twin.model.compute_outputs(inputs)
    flat = expected.as_flat_dict()
    rng = np.random.default_rng(0)
    measured = {c: flat[c] + rng.normal(0, SENSOR_SPECS[c].noise_std if c in SENSOR_SPECS else 0.0) for c in MEASUREMENT_CHANNELS}

    result = twin.step_live(inputs, measured)
    assert result.t_s > 0
    assert "rpm" in result.residuals
    assert set(result.degradation_state.keys()) == {
        "volumetric_efficiency_factor", "cooling_effectiveness",
        "injector_flow_coeff_0", "injector_flow_coeff_1", "injector_flow_coeff_2", "injector_flow_coeff_3",
        "friction_factor", "oil_pump_efficiency", "turbo_efficiency", "alternator_efficiency",
    }
    assert result.health.overall_risk in {"NORMAL", "WATCH", "WARNING", "CRITICAL"}


def test_degradation_feeds_back_into_simulation():
    """reset_for_simulation should seed the model's health from a supplied degradation state."""
    config = EngineRegistry().get("rotax914_like")
    twin = DigitalTwin(config)
    degraded_health = twin.model.health.copy()
    degraded_health[HIDX_COOLING_EFF] = 0.5

    twin.reset_for_simulation(initial_health=degraded_health)
    assert twin.mode == "SIMULATION"
    assert twin.model.health[HIDX_COOLING_EFF] == 0.5
