"""Tests for mission config loading and MissionRunner."""

from __future__ import annotations

from aerotwin.simulation.mission import MissionRegistry, MissionRunner
from aerotwin.twin.config import EngineRegistry


def test_mission_registry_loads_all_four():
    """All four required missions should be discoverable."""
    registry = MissionRegistry()
    ids = registry.list_missions()
    for expected in [
        "isr_18h_endurance",
        "high_altitude_6km",
        "hot_weather_45c",
        "rapid_throttle_transitions",
    ]:
        assert expected in ids


def test_mission_runner_produces_plausible_short_run():
    """A short synthetic mission should produce a log with sane columns/values."""
    engine_cfg = EngineRegistry().get("rotax914_like")
    mission_cfg = MissionRegistry().get("rapid_throttle_transitions")
    runner = MissionRunner(engine_cfg, mission_cfg)
    df = runner.run(log_interval_s=1.0)

    assert len(df) > 0
    for col in ["rpm", "map_kpa", "cht_1_k", "egt_1_k", "oil_pressure_kpa", "fuel_flow_kg_s"]:
        assert col in df.columns

    assert df["rpm"].min() > 0
    assert df["altitude_m"].max() > 1000.0
    assert df["throttle"].max() > 0.9
    assert df["throttle"].min() < 0.3


def test_inputs_at_time_ramps_between_segments():
    """Altitude/throttle should ramp continuously across a segment boundary."""
    engine_cfg = EngineRegistry().get("rotax914_like")
    mission_cfg = MissionRegistry().get("isr_18h_endurance")
    runner = MissionRunner(engine_cfg, mission_cfg)

    taxi_end = runner.inputs_at_time(299.0)
    takeoff_mid = runner.inputs_at_time(330.0)
    assert takeoff_mid.altitude_m > taxi_end.altitude_m
    assert takeoff_mid.throttle > taxi_end.throttle
