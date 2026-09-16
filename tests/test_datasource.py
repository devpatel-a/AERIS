"""Tests for the interchangeable DataSource implementations."""

from __future__ import annotations

from pathlib import Path

from aerotwin.acquisition.datasource import ParquetReplayDataSource, SimulatorDataSource
from aerotwin.physics.engine_model import EngineModel
from aerotwin.physics.state import EngineInputs
from aerotwin.simulation.mission import (
    EnvironmentConfig,
    MissionConfig,
    MissionRunner,
    SegmentConfig,
)
from aerotwin.twin.config import EngineRegistry


def test_simulator_datasource_steps_physics():
    """Each read() should advance the physics by one step and return a flattened row."""
    engine_cfg = EngineRegistry().get("rotax914_like")
    model = EngineModel(engine_cfg)

    def input_fn(t: float) -> EngineInputs:
        return EngineInputs(throttle=0.5, ambient_pressure_pa=101325.0, ambient_temp_k=288.15, altitude_m=0.0, airspeed_mps=30.0)

    source = SimulatorDataSource(model, input_fn)
    row1 = source.read()
    row2 = source.read()
    assert row1["mode"] == "SIMULATION"
    assert row2["t_s"] > row1["t_s"]
    assert "rpm" in row1


def test_parquet_replay_datasource_seek_and_read(tmp_path: Path):
    """ParquetReplayDataSource should replay rows in order and support seeking."""
    engine_cfg = EngineRegistry().get("rotax914_like")
    mission = MissionConfig(
        mission_id="t", display_name="t", environment=EnvironmentConfig(),
        segments=[SegmentConfig(name="c", duration_s=30.0, target_altitude_m=500.0, target_airspeed_mps=30.0, throttle=0.5)],
    )
    df = MissionRunner(engine_cfg, mission).run(log_interval_s=1.0)
    path = tmp_path / "mission.parquet"
    df.to_parquet(path, index=False)

    source = ParquetReplayDataSource(path)
    assert source.total_rows == len(df)
    row = source.read()
    assert row["mode"] == "REPLAY"
    assert row["t_s"] == df["t_s"].iloc[0]

    source.seek(15.0)
    row_seek = source.read()
    assert row_seek["t_s"] >= 15.0
