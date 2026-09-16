"""Parquet mission-log storage conventions."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

DEFAULT_MISSION_LOG_DIR = Path(__file__).resolve().parents[2] / "data" / "missions"


def save_mission_log(df: pd.DataFrame, mission_run_id: str, base_dir: Path | str = DEFAULT_MISSION_LOG_DIR) -> Path:
    """Save a mission run's DataFrame to `<base_dir>/<mission_run_id>.parquet`."""
    base = Path(base_dir)
    base.mkdir(parents=True, exist_ok=True)
    path = base / f"{mission_run_id}.parquet"
    df.to_parquet(path, index=False)
    return path


def load_mission_log(mission_run_id: str, base_dir: Path | str = DEFAULT_MISSION_LOG_DIR) -> pd.DataFrame:
    """Load a previously saved mission log by its run id."""
    return pd.read_parquet(Path(base_dir) / f"{mission_run_id}.parquet")


def list_mission_logs(base_dir: Path | str = DEFAULT_MISSION_LOG_DIR) -> list[str]:
    """List all stored mission run ids (Parquet filenames without extension)."""
    base = Path(base_dir)
    if not base.exists():
        return []
    return sorted(p.stem for p in base.glob("*.parquet"))
