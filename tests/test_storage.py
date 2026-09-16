"""Tests for the live buffer, Parquet store, and SQLite metadata store."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from aerotwin.storage.buffer import LiveBuffer
from aerotwin.storage.db import (
    close_mission,
    get_connection,
    insert_alert,
    insert_maintenance_record,
    insert_mission,
    list_alerts,
    list_maintenance_records,
)
from aerotwin.storage.parquet_store import list_mission_logs, load_mission_log, save_mission_log


def test_live_buffer_window_and_latest():
    """LiveBuffer should track the latest row and windowed slices correctly."""
    buf = LiveBuffer(maxlen=100)
    for i in range(20):
        buf.push({"t_s": float(i), "rpm": 4000 + i})
    assert buf.latest()["t_s"] == 19.0
    window = buf.window(seconds=5.0)
    assert all(19.0 - r["t_s"] <= 5.0 for r in window)
    assert len(buf) == 20


def test_parquet_store_roundtrip(tmp_path: Path):
    """A saved mission log should be loadable and listable by id."""
    df = pd.DataFrame({"t_s": [0.0, 1.0, 2.0], "rpm": [4000, 4010, 4020]})
    save_mission_log(df, "test_run_1", base_dir=tmp_path)
    loaded = load_mission_log("test_run_1", base_dir=tmp_path)
    pd.testing.assert_frame_equal(df, loaded)
    assert "test_run_1" in list_mission_logs(base_dir=tmp_path)


def test_sqlite_store_missions_alerts_maintenance(tmp_path: Path):
    """Missions, alerts, and maintenance records should insert and query correctly."""
    conn = get_connection(tmp_path / "test.db")
    insert_mission(conn, "run_1", "rotax914_like", "isr_18h_endurance", parquet_path="run_1.parquet")
    close_mission(conn, "run_1")

    insert_alert(conn, "run_1", t_s=120.0, subsystem="cooling", severity="WARNING", message="CHT trending high")
    alerts = list_alerts(conn, "run_1")
    assert len(alerts) == 1
    assert alerts[0]["severity"] == "WARNING"

    insert_maintenance_record(conn, "rotax914_like", action="Inspect cooling fins", notes="cooling_effectiveness low")
    records = list_maintenance_records(conn, "rotax914_like")
    assert len(records) == 1
    assert "cooling" in records[0]["notes"]
