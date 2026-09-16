"""Tests for per-subsystem health indices and risk-level mapping."""

from __future__ import annotations

from aerotwin.health.indices import compute_health_snapshot, risk_level
from aerotwin.physics.state import HIDX_COOLING_EFF, nominal_health_vector
from aerotwin.twin.config import EngineRegistry


def test_risk_level_thresholds():
    """Risk level should map monotonically from index."""
    assert risk_level(95.0) == "NORMAL"
    assert risk_level(70.0) == "WATCH"
    assert risk_level(50.0) == "WARNING"
    assert risk_level(10.0) == "CRITICAL"


def test_healthy_engine_has_high_overall_index():
    """A pristine health vector under nominal outputs should score NORMAL overall."""
    config = EngineRegistry().get("rotax914_like")
    health = nominal_health_vector(config.nominal_health.injector_flow_coeff)
    outputs = {f"cht_{i}_k": 360.0 for i in range(1, 5)}
    outputs["oil_pressure_kpa"] = 380.0
    outputs["vibration_rms_g"] = config.vibration.baseline_rms_g
    snap = compute_health_snapshot(health, outputs, config)
    assert snap.overall_index > 80.0
    assert snap.overall_risk == "NORMAL"


def test_degraded_cooling_lowers_cooling_index():
    """A degraded cooling_effectiveness should lower the cooling subsystem index."""
    config = EngineRegistry().get("rotax914_like")
    healthy = nominal_health_vector(config.nominal_health.injector_flow_coeff)
    degraded = healthy.copy()
    degraded[HIDX_COOLING_EFF] = 0.4
    outputs = {f"cht_{i}_k": 360.0 for i in range(1, 5)}
    outputs["oil_pressure_kpa"] = 380.0
    outputs["vibration_rms_g"] = config.vibration.baseline_rms_g

    snap_healthy = compute_health_snapshot(healthy, outputs, config)
    snap_degraded = compute_health_snapshot(degraded, outputs, config)
    assert snap_degraded.subsystem_index["cooling"] < snap_healthy.subsystem_index["cooling"]
