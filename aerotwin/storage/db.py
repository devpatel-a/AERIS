"""SQLite metadata store: mission runs, alerts, and maintenance records."""

from __future__ import annotations

import sqlite3
import time
from pathlib import Path

DEFAULT_DB_PATH = Path(__file__).resolve().parents[2] / "data" / "aerotwin.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_run_id TEXT UNIQUE NOT NULL,
    engine_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    start_time REAL NOT NULL,
    end_time REAL,
    parquet_path TEXT,
    notes TEXT,
    tail_id TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_run_id TEXT NOT NULL,
    t_s REAL NOT NULL,
    subsystem TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    acknowledged INTEGER NOT NULL DEFAULT 0,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    engine_id TEXT NOT NULL,
    action TEXT NOT NULL,
    notes TEXT,
    created_at REAL NOT NULL
);
"""


def get_connection(db_path: Path | str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    """Open (creating if needed) the AeroTwin metadata SQLite database."""
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    # check_same_thread=False: the API's sync endpoints run in FastAPI's worker
    # threadpool while async endpoints run on the event loop thread; access here
    # is effectively serialized (one active session at a time), so this is safe.
    conn = sqlite3.connect(str(path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    _migrate(conn)
    return conn


def _migrate(conn: sqlite3.Connection) -> None:
    """Add columns to a pre-existing database that predates them.

    `CREATE TABLE IF NOT EXISTS` (in SCHEMA) doesn't touch columns on a table
    that already exists, so a fleet-tail attribution added after the schema
    was first deployed needs an explicit ALTER TABLE, guarded so it's a no-op
    on a fresh database (which already has the column from SCHEMA) or one
    that's already been migrated.
    """
    cols = {row["name"] for row in conn.execute("PRAGMA table_info(missions)")}
    if "tail_id" not in cols:
        conn.execute("ALTER TABLE missions ADD COLUMN tail_id TEXT")
        conn.commit()


def insert_mission(
    conn: sqlite3.Connection,
    mission_run_id: str,
    engine_id: str,
    mission_id: str,
    parquet_path: str = "",
    notes: str = "",
    tail_id: str | None = None,
) -> int:
    """Record a new mission run; returns its row id."""
    cur = conn.execute(
        "INSERT OR REPLACE INTO missions (mission_run_id, engine_id, mission_id, start_time, parquet_path, notes, tail_id) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (mission_run_id, engine_id, mission_id, time.time(), parquet_path, notes, tail_id),
    )
    conn.commit()
    return cur.lastrowid


def close_mission(conn: sqlite3.Connection, mission_run_id: str) -> None:
    """Mark a mission run as finished (sets end_time to now)."""
    conn.execute(
        "UPDATE missions SET end_time = ? WHERE mission_run_id = ?", (time.time(), mission_run_id)
    )
    conn.commit()


def get_mission(conn: sqlite3.Connection, mission_run_id: str) -> sqlite3.Row | None:
    """Return one mission run's metadata row (engine_id/mission_id/start_time/end_time), or None."""
    cur = conn.execute("SELECT * FROM missions WHERE mission_run_id = ?", (mission_run_id,))
    return cur.fetchone()


def list_missions(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    """List every recorded mission run's metadata, newest first."""
    cur = conn.execute("SELECT * FROM missions ORDER BY start_time DESC")
    return cur.fetchall()


def insert_alert(
    conn: sqlite3.Connection,
    mission_run_id: str,
    t_s: float,
    subsystem: str,
    severity: str,
    message: str,
) -> int:
    """Insert a new alert row; returns its row id."""
    cur = conn.execute(
        "INSERT INTO alerts (mission_run_id, t_s, subsystem, severity, message, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (mission_run_id, t_s, subsystem, severity, message, time.time()),
    )
    conn.commit()
    return cur.lastrowid


def list_alerts(conn: sqlite3.Connection, mission_run_id: str | None = None) -> list[sqlite3.Row]:
    """List alerts, optionally filtered to one mission run, newest first."""
    if mission_run_id is not None:
        cur = conn.execute(
            "SELECT * FROM alerts WHERE mission_run_id = ? ORDER BY t_s DESC", (mission_run_id,)
        )
    else:
        cur = conn.execute("SELECT * FROM alerts ORDER BY t_s DESC")
    return cur.fetchall()


def insert_maintenance_record(
    conn: sqlite3.Connection, engine_id: str, action: str, notes: str = ""
) -> int:
    """Insert a maintenance-advisory record; returns its row id."""
    cur = conn.execute(
        "INSERT INTO maintenance_records (engine_id, action, notes, created_at) VALUES (?, ?, ?, ?)",
        (engine_id, action, notes, time.time()),
    )
    conn.commit()
    return cur.lastrowid


def list_maintenance_records(conn: sqlite3.Connection, engine_id: str | None = None) -> list[sqlite3.Row]:
    """List maintenance records, optionally filtered to one engine, newest first."""
    if engine_id is not None:
        cur = conn.execute(
            "SELECT * FROM maintenance_records WHERE engine_id = ? ORDER BY created_at DESC", (engine_id,)
        )
    else:
        cur = conn.execute("SELECT * FROM maintenance_records ORDER BY created_at DESC")
    return cur.fetchall()
