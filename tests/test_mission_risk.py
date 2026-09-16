"""Tests for the mission go/no-go Monte Carlo risk analysis."""

from __future__ import annotations

from aerotwin.physics.state import HIDX_COOLING_EFF, nominal_health_vector
from aerotwin.simulation.mission import EnvironmentConfig, MissionConfig, SegmentConfig
from aerotwin.simulation.risk import run_mission_go_no_go
from aerotwin.twin.config import EngineRegistry


def _short_mission(throttle: float, isa_dev: float, duration_s: float = 120.0) -> MissionConfig:
    return MissionConfig(
        mission_id="risk_test", display_name="risk test",
        environment=EnvironmentConfig(base_isa_deviation_k=isa_dev),
        segments=[
            SegmentConfig(name="cruise", duration_s=duration_s, target_altitude_m=1000.0,
                           target_airspeed_mps=35.0, throttle=throttle),
        ],
    )


def test_mild_mission_returns_go_for_healthy_engine():
    """A mild-throttle, standard-day mission should clear all limits comfortably."""
    config = EngineRegistry().get("rotax914_like")
    healthy = nominal_health_vector(config.nominal_health.injector_flow_coeff)
    mission = _short_mission(throttle=0.4, isa_dev=0.0)
    result = run_mission_go_no_go(config, mission, healthy, n_monte_carlo=4, max_duration_s=120.0)
    assert result.verdict == "GO"


def test_degraded_cooling_hot_mission_returns_no_go_or_caution():
    """Severely degraded cooling on a hot, high-throttle mission should not be a clean GO."""
    config = EngineRegistry().get("rotax914_like")
    degraded = nominal_health_vector(config.nominal_health.injector_flow_coeff)
    degraded[HIDX_COOLING_EFF] = 0.35
    mission = _short_mission(throttle=0.9, isa_dev=30.0, duration_s=600.0)
    result = run_mission_go_no_go(config, mission, degraded, n_monte_carlo=4, max_duration_s=600.0)
    assert result.verdict in {"NO-GO", "CAUTION"}
    assert len(result.reasons) > 0


def test_margins_report_probability_of_exceedance():
    """Each reported margin should carry a valid 0-1 probability-of-exceedance."""
    config = EngineRegistry().get("rotax914_like")
    healthy = nominal_health_vector(config.nominal_health.injector_flow_coeff)
    mission = _short_mission(throttle=0.5, isa_dev=0.0)
    result = run_mission_go_no_go(config, mission, healthy, n_monte_carlo=4, max_duration_s=120.0)
    assert len(result.margins) > 0
    for m in result.margins:
        assert 0.0 <= m.probability_exceeded <= 1.0
