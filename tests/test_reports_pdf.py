"""Tests for PDF post-flight report generation."""

from __future__ import annotations

from pathlib import Path

from aerotwin.faults.injector import FaultInjector
from aerotwin.faults.specs import FaultSpec
from aerotwin.reports.pdf import generate_mission_report
from aerotwin.simulation.mission import (
    EnvironmentConfig,
    MissionConfig,
    MissionRunner,
    SegmentConfig,
)
from aerotwin.twin.config import EngineRegistry


def test_generate_mission_report_produces_pdf(tmp_path: Path):
    """A mission log with a fault should produce a non-trivial PDF file."""
    config = EngineRegistry().get("rotax914_like")
    mission = MissionConfig(
        mission_id="pdf_test", display_name="pdf test",
        environment=EnvironmentConfig(base_isa_deviation_k=10.0),
        segments=[
            SegmentConfig(name="cruise", duration_s=120.0, target_altitude_m=500.0,
                           target_airspeed_mps=30.0, throttle=0.7),
        ],
    )
    runner = MissionRunner(config, mission)
    injector = FaultInjector(
        [FaultSpec(fault_type="lubrication_issue", onset_s=0.0, profile="step", severity=0.4)], seed=0
    )
    df = runner.run(log_interval_s=1.0, step_callback=injector.step_callback)
    df = injector.postprocess(df)
    log_path = tmp_path / "mission.parquet"
    df.to_parquet(log_path, index=False)

    out_path = tmp_path / "report.pdf"
    result_path = generate_mission_report(log_path, config, out_path, "pdf_test_run")

    assert result_path == out_path
    assert out_path.exists()
    assert out_path.stat().st_size > 500
