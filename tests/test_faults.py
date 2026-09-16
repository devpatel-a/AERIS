"""Tests that each fault type produces its expected signature (M3)."""

from __future__ import annotations

import numpy as np
import pytest

from aerotwin.faults.injector import FaultInjector
from aerotwin.faults.specs import FaultSpec
from aerotwin.simulation.mission import (
    EnvironmentConfig,
    MissionConfig,
    MissionRunner,
    SegmentConfig,
)
from aerotwin.twin.config import EngineRegistry


@pytest.fixture(scope="module")
def engine_config():
    """Reference engine config, loaded once."""
    return EngineRegistry().get("rotax914_like")


def _short_mission(duration_s: float = 200.0, throttle: float = 0.65, isa_dev: float = 0.0) -> MissionConfig:
    return MissionConfig(
        mission_id="test_short",
        display_name="test short cruise",
        environment=EnvironmentConfig(base_isa_deviation_k=isa_dev),
        segments=[
            SegmentConfig(
                name="cruise", duration_s=duration_s, target_altitude_m=1500.0,
                target_airspeed_mps=40.0, throttle=throttle,
            )
        ],
    )


def _run(engine_config, specs: list[FaultSpec], duration_s: float = 200.0, seed: int = 0, **mission_kwargs):
    mission = _short_mission(duration_s=duration_s, **mission_kwargs)
    runner = MissionRunner(engine_config, mission)
    injector = FaultInjector(specs, seed=seed)
    df = runner.run(log_interval_s=1.0, step_callback=injector.step_callback)
    df = injector.postprocess(df)
    return df


def test_healthy_baseline_has_no_fault_label(engine_config):
    """A run with no injected faults should be labeled healthy."""
    df = _run(engine_config, [])
    assert (df["fault_type"] == "healthy").all()
    assert (df["fault_severity"] == 0.0).all()


def test_cooling_degradation_raises_cht(engine_config):
    """cooling_degradation should raise CHT vs a healthy baseline over the same run."""
    baseline = _run(engine_config, [])
    fault = _run(
        engine_config,
        [FaultSpec(fault_type="cooling_degradation", onset_s=0.0, profile="step", severity=0.5)],
    )
    assert fault["cht_1_k"].iloc[-1] > baseline["cht_1_k"].iloc[-1] + 3.0


def test_lubrication_issue_lowers_oil_pressure(engine_config):
    """lubrication_issue should lower oil pressure vs baseline."""
    baseline = _run(engine_config, [])
    fault = _run(
        engine_config,
        [FaultSpec(fault_type="lubrication_issue", onset_s=0.0, profile="step", severity=0.5)],
    )
    assert fault["oil_pressure_kpa"].iloc[-1] < baseline["oil_pressure_kpa"].iloc[-1] * 0.7


def test_turbo_degradation_lowers_map_and_power(engine_config):
    """turbo_degradation should reduce achievable MAP/power at high throttle."""
    baseline = _run(engine_config, [], throttle=1.0)
    fault = _run(
        engine_config,
        [FaultSpec(fault_type="turbo_degradation", onset_s=0.0, profile="step", severity=0.6)],
        throttle=1.0,
    )
    assert fault["map_kpa"].iloc[-1] < baseline["map_kpa"].iloc[-1] * 0.9
    assert fault["power_w"].iloc[-1] < baseline["power_w"].iloc[-1] * 0.9


def test_alternator_degradation_lowers_current(engine_config):
    """alternator_degradation should reduce alternator current output."""
    baseline = _run(engine_config, [])
    fault = _run(
        engine_config,
        [FaultSpec(fault_type="alternator_degradation", onset_s=0.0, profile="step", severity=0.7)],
    )
    assert fault["alternator_current_a"].iloc[-1] < baseline["alternator_current_a"].iloc[-1] * 0.5


def test_injector_abnormality_creates_cylinder_imbalance(engine_config):
    """injector_abnormality on one cylinder should create EGT spread across cylinders."""
    fault = _run(
        engine_config,
        [FaultSpec(fault_type="injector_abnormality", target=0, onset_s=0.0, profile="step", severity=0.6)],
    )
    egt_cols = ["egt_1_k", "egt_2_k", "egt_3_k", "egt_4_k"]
    last = fault[egt_cols].iloc[-1]
    spread = last.max() - last.min()
    assert spread > 20.0


def test_misfire_raises_vibration(engine_config):
    """An intermittent misfire should raise vibration RMS vs baseline."""
    baseline = _run(engine_config, [])
    fault = _run(
        engine_config,
        [FaultSpec(fault_type="misfire", target=0, onset_s=0.0, profile="step", severity=0.8)],
    )
    assert fault["vibration_rms_g"].iloc[-10:].mean() > baseline["vibration_rms_g"].iloc[-10:].mean()


def test_abnormal_vibration_raises_order1_band(engine_config):
    """abnormal_vibration (imbalance) should raise the order-1 vibration band."""
    fault = _run(
        engine_config,
        [FaultSpec(fault_type="abnormal_vibration", onset_s=0.0, profile="step", severity=0.8)],
    )
    assert fault["vib_order_1p0_g"].iloc[-1] > 0.0


def test_combustion_instability_increases_variability(engine_config):
    """combustion_instability should increase cycle-to-cycle torque variability."""
    baseline = _run(engine_config, [])
    fault = _run(
        engine_config,
        [FaultSpec(fault_type="combustion_instability", onset_s=0.0, profile="step", severity=0.8)],
    )
    assert fault["torque_nm"].iloc[50:].std() > baseline["torque_nm"].iloc[50:].std()


def test_overheating_trend_raises_cht_in_hot_slow_conditions(engine_config):
    """overheating_trend combined with hot ambient should raise CHT vs a hot baseline."""
    baseline = _run(engine_config, [], isa_dev=25.0)
    fault = _run(
        engine_config,
        [FaultSpec(fault_type="overheating_trend", onset_s=0.0, profile="step", severity=0.8)],
        isa_dev=25.0,
    )
    assert fault["cht_1_k"].iloc[-1] > baseline["cht_1_k"].iloc[-1]


def test_sensor_drift_diverges_measured_from_true(engine_config):
    """sensor_drift should push the measured channel away from the true value over time."""
    df = _run(
        engine_config,
        [FaultSpec(fault_type="sensor_drift", target="oil_pressure_kpa", onset_s=0.0, profile="ramp",
                   severity=1.0, ramp_duration_s=150.0, extra={"max_drift": 100.0})],
    )
    gap_start = abs(df["measured_oil_pressure_kpa"].iloc[5] - df["oil_pressure_kpa"].iloc[5])
    gap_end = abs(df["measured_oil_pressure_kpa"].iloc[-1] - df["oil_pressure_kpa"].iloc[-1])
    assert gap_end > gap_start + 20.0


def test_sensor_stuck_freezes_measured_value(engine_config):
    """sensor_stuck should freeze the measured channel after onset."""
    df = _run(
        engine_config,
        [FaultSpec(fault_type="sensor_stuck", target="coolant_temp_k", onset_s=20.0, profile="step", severity=1.0)],
    )
    frozen_segment = df[df["t_s"] >= 25.0]["measured_coolant_temp_k"]
    assert frozen_segment.nunique() == 1


def test_sensor_dropout_produces_missing_values(engine_config):
    """sensor_dropout should produce NaNs in the measured channel after onset."""
    df = _run(
        engine_config,
        [FaultSpec(fault_type="sensor_dropout", target="rpm", onset_s=0.0, profile="step",
                   severity=1.0, extra={"dropout_prob": 0.9})],
    )
    assert df["measured_rpm"].isna().sum() > 0


def test_sensor_noise_increases_variance(engine_config):
    """sensor_noise should increase variance of the measured channel vs baseline noise."""
    baseline = _run(engine_config, [])
    fault = _run(
        engine_config,
        [FaultSpec(fault_type="sensor_noise", target="map_kpa", onset_s=0.0, profile="step",
                   severity=1.0, extra={"extra_noise_std": 20.0})],
    )
    base_std = np.std(np.diff(baseline["measured_map_kpa"].to_numpy()))
    fault_std = np.std(np.diff(fault["measured_map_kpa"].to_numpy()))
    assert fault_std > base_std * 2.0
