"""Physics/MVEM tests for M1: turbo/altitude, cooling, steady state, misfire, speed."""

from __future__ import annotations

import time

import numpy as np
import pytest

from aerotwin.physics.atmosphere import isa_pressure_temp
from aerotwin.physics.engine_model import EngineModel
from aerotwin.physics.state import HIDX_COOLING_EFF, EngineInputs
from aerotwin.twin.config import EngineRegistry

SEA_LEVEL_PA, SEA_LEVEL_T = isa_pressure_temp(0.0)


@pytest.fixture(scope="module")
def config():
    """Load the reference Rotax-914-like engine config once per module."""
    return EngineRegistry().get("rotax914_like")


def run_to_steady(config, inputs: EngineInputs, seconds: float = 300.0, health=None) -> EngineModel:
    """Run a fresh EngineModel forward and return it once (assumed) near steady state."""
    model = EngineModel(config, health=health)
    n_steps = int(seconds / model.dt)
    for _ in range(n_steps):
        model.step(inputs)
    return model


def test_rpm_reaches_steady_state(config):
    """RPM should settle to a near-constant value under fixed inputs."""
    inputs = EngineInputs(
        throttle=0.6, ambient_pressure_pa=SEA_LEVEL_PA, ambient_temp_k=SEA_LEVEL_T,
        altitude_m=0.0, airspeed_mps=40.0,
    )
    model = run_to_steady(config, inputs, seconds=250.0)
    rpms = []
    for _ in range(int(5.0 / model.dt)):
        rpms.append(model.step(inputs).rpm)
    rpms = np.array(rpms)
    assert rpms.std() < 0.5, f"RPM did not settle, std={rpms.std()}"
    assert 1000.0 < rpms.mean() < config.rating.max_rpm


def test_turbo_holds_power_below_critical_altitude(config):
    """Below critical altitude the wastegate should hold MAP/power roughly constant."""
    inputs_sea = EngineInputs(
        throttle=1.0, ambient_pressure_pa=SEA_LEVEL_PA, ambient_temp_k=SEA_LEVEL_T,
        altitude_m=0.0, airspeed_mps=50.0,
    )
    p_mid, t_mid = isa_pressure_temp(2000.0)
    inputs_mid = EngineInputs(
        throttle=1.0, ambient_pressure_pa=p_mid, ambient_temp_k=t_mid,
        altitude_m=2000.0, airspeed_mps=50.0,
    )
    power_sea = run_to_steady(config, inputs_sea, seconds=300.0).compute_outputs(inputs_sea).power_w
    power_mid = run_to_steady(config, inputs_mid, seconds=300.0).compute_outputs(inputs_mid).power_w
    assert power_mid > 0.9 * power_sea, "Turbo should hold ~sea-level power below critical altitude"


def test_turbo_loses_power_above_critical_altitude(config):
    """Above critical altitude, power should drop noticeably as MAP can no longer be sustained."""
    inputs_sea = EngineInputs(
        throttle=1.0, ambient_pressure_pa=SEA_LEVEL_PA, ambient_temp_k=SEA_LEVEL_T,
        altitude_m=0.0, airspeed_mps=50.0,
    )
    p_high, t_high = isa_pressure_temp(7000.0)
    inputs_high = EngineInputs(
        throttle=1.0, ambient_pressure_pa=p_high, ambient_temp_k=t_high,
        altitude_m=7000.0, airspeed_mps=50.0,
    )
    power_sea = run_to_steady(config, inputs_sea, seconds=300.0).compute_outputs(inputs_sea).power_w
    power_high = run_to_steady(config, inputs_high, seconds=300.0).compute_outputs(inputs_high).power_w
    assert power_high < 0.8 * power_sea, "Power should fall well below sea-level rating above critical altitude"


def test_cht_rises_with_low_airspeed_and_hot_ambient(config):
    """Hot day + low airspeed should give substantially higher CHT than a cool, fast-airspeed case."""
    inputs_cool_fast = EngineInputs(
        throttle=0.7, ambient_pressure_pa=SEA_LEVEL_PA, ambient_temp_k=288.15,
        altitude_m=0.0, airspeed_mps=60.0,
    )
    inputs_hot_slow = EngineInputs(
        throttle=0.7, ambient_pressure_pa=SEA_LEVEL_PA, ambient_temp_k=313.15,
        altitude_m=0.0, airspeed_mps=5.0,
    )
    cht_cool_fast = run_to_steady(config, inputs_cool_fast).compute_outputs(inputs_cool_fast).cht_k[0]
    cht_hot_slow = run_to_steady(config, inputs_hot_slow).compute_outputs(inputs_hot_slow).cht_k[0]
    assert cht_hot_slow > cht_cool_fast + 10.0


def test_reduced_cooling_effectiveness_raises_cht(config):
    """Degraded cooling_effectiveness health parameter should raise steady-state CHT."""
    from aerotwin.physics.state import nominal_health_vector

    inputs = EngineInputs(
        throttle=0.7, ambient_pressure_pa=SEA_LEVEL_PA, ambient_temp_k=298.15,
        altitude_m=0.0, airspeed_mps=30.0,
    )
    healthy = nominal_health_vector(config.nominal_health.injector_flow_coeff)
    degraded = healthy.copy()
    degraded[HIDX_COOLING_EFF] = 0.55

    cht_healthy = run_to_steady(config, inputs, health=healthy).compute_outputs(inputs).cht_k[0]
    cht_degraded = run_to_steady(config, inputs, health=degraded).compute_outputs(inputs).cht_k[0]
    assert cht_degraded > cht_healthy + 5.0


def test_misfire_causes_rpm_ripple_and_vibration_change(config):
    """An intermittent single-cylinder misfire should raise RPM variance and vibration RMS."""
    inputs = EngineInputs(
        throttle=0.6, ambient_pressure_pa=SEA_LEVEL_PA, ambient_temp_k=SEA_LEVEL_T,
        altitude_m=0.0, airspeed_mps=40.0,
    )
    model = run_to_steady(config, inputs, seconds=250.0)
    baseline_out = model.compute_outputs(inputs)

    baseline_rpms = []
    for _ in range(int(6.0 / model.dt)):
        baseline_rpms.append(model.step(inputs).rpm)
    baseline_std = float(np.std(baseline_rpms))

    misfire_rpms = []
    misfire_vib_rms = []
    for i in range(int(6.0 / model.dt)):
        model.misfire_mask = np.array([0.0, 1.0, 1.0, 1.0]) if (i // 4) % 2 == 0 else np.ones(4)
        out = model.step(inputs)
        misfire_rpms.append(out.rpm)
        misfire_vib_rms.append(out.vibration_rms_g)
    misfire_std = float(np.std(misfire_rpms))

    assert misfire_std > baseline_std * 1.5, "Intermittent misfire should increase RPM variance"
    assert max(misfire_vib_rms) > baseline_out.vibration_rms_g, "Misfire should raise vibration RMS"


def test_speed_benchmark_50x_realtime(config):
    """The model must integrate at least 50x faster than real time."""
    inputs = EngineInputs(
        throttle=0.6, ambient_pressure_pa=SEA_LEVEL_PA, ambient_temp_k=SEA_LEVEL_T,
        altitude_m=0.0, airspeed_mps=40.0,
    )
    model = EngineModel(config)
    sim_seconds = 120.0
    n_steps = int(sim_seconds / model.dt)
    start = time.perf_counter()
    for _ in range(n_steps):
        model.step(inputs)
    wall_seconds = time.perf_counter() - start
    speedup = sim_seconds / wall_seconds
    assert speedup >= 50.0, f"Only achieved {speedup:.1f}x real time (need >= 50x)"
