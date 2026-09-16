"""Tests for the post-flight summary metrics module."""

from __future__ import annotations

from aerotwin.faults.injector import FaultInjector
from aerotwin.faults.specs import FaultSpec
from aerotwin.reports.summary import compute_post_flight_summary
from aerotwin.simulation.mission import (
    EnvironmentConfig,
    MissionConfig,
    MissionRunner,
    SegmentConfig,
)
from aerotwin.twin.config import EngineRegistry


def test_post_flight_summary_reports_peaks_and_faults():
    """A run with a cooling fault should report peak CHT and list the fault."""
    config = EngineRegistry().get("rotax914_like")
    mission = MissionConfig(
        mission_id="summary_test", display_name="summary test",
        environment=EnvironmentConfig(base_isa_deviation_k=20.0),
        segments=[
            SegmentConfig(name="cruise", duration_s=300.0, target_altitude_m=500.0,
                           target_airspeed_mps=15.0, throttle=0.9),
        ],
    )
    runner = MissionRunner(config, mission)
    injector = FaultInjector(
        [FaultSpec(fault_type="cooling_degradation", onset_s=0.0, profile="step", severity=0.6)], seed=0
    )
    df = runner.run(log_interval_s=1.0, step_callback=injector.step_callback)
    df = injector.postprocess(df)

    summary = compute_post_flight_summary(df, config)
    assert summary.n_samples == len(df)
    assert "max_cht_k" in summary.peak_values
    assert summary.faults_observed == ["cooling_degradation"]
    assert summary.duration_hours > 0
