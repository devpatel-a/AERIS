"""SQLite metadata store: mission runs, alerts, and maintenance records."""

from __future__ import annotations

import os
import sqlite3
import time
from pathlib import Path

DATA_DIR = Path(os.environ.get("AEROTWIN_DATA_DIR", Path(__file__).resolve().parents[2] / "data"))
DEFAULT_DB_PATH = DATA_DIR / "aerotwin.db"

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
    tail_id TEXT,
    sortie_label TEXT,
    kind TEXT NOT NULL DEFAULT 'operational',
    injected_faults_json TEXT NOT NULL DEFAULT '[]',
    flight_s REAL,
    engine_hours_start REAL
);

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_run_id TEXT NOT NULL,
    t_s REAL NOT NULL,
    subsystem TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    acknowledged INTEGER NOT NULL DEFAULT 0,
    created_at REAL NOT NULL,
    muted_until REAL
);

CREATE TABLE IF NOT EXISTS mission_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_run_id TEXT NOT NULL,
    t_s REAL NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS work_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wo_number TEXT UNIQUE NOT NULL,
    tail_id TEXT NOT NULL,
    task_key TEXT NOT NULL,
    fault_type TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    ata_ref TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    status TEXT NOT NULL DEFAULT 'OPEN',
    source TEXT NOT NULL DEFAULT 'advisory',
    report_id TEXT,
    created_by TEXT,
    created_at REAL NOT NULL,
    completed_at REAL,
    engine_hours_at_completion REAL
);

CREATE TABLE IF NOT EXISTS advisory_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tail_id TEXT NOT NULL,
    advisory_key TEXT NOT NULL,
    reviewed_by TEXT,
    reviewed_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS mission_summaries (
    mission_run_id TEXT PRIMARY KEY,
    summary_json TEXT NOT NULL,
    computed_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id TEXT UNIQUE NOT NULL,
    report_type TEXT NOT NULL,
    title TEXT NOT NULL,
    tail_id TEXT,
    mission_run_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    compliance TEXT NOT NULL DEFAULT 'STANAG 4671 PDF',
    subsystems_json TEXT NOT NULL DEFAULT '[]',
    include_shap INTEGER NOT NULL DEFAULT 1,
    content_json TEXT NOT NULL DEFAULT '{}',
    pdf_path TEXT,
    dispatched_to TEXT,
    dispatched_at REAL,
    signed_by TEXT,
    signed_at REAL,
    signature_sha256 TEXT,
    created_by TEXT,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS mission_plans (
    plan_id TEXT PRIMARY KEY,          -- PLN-0001
    mission_id TEXT UNIQUE NOT NULL,   -- plan_0001: id in the mission registry / missions table
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,         -- mission identifier / sortie callsign stem
    tail_id TEXT,
    template_id TEXT NOT NULL,
    spec_json TEXT NOT NULL,           -- planner form (PlanSpec)
    mission_json TEXT NOT NULL,        -- compiled MissionConfig
    last_verdict TEXT,
    last_confidence REAL,
    last_evaluated_at REAL,
    created_by TEXT,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operator_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    initials TEXT NOT NULL,
    roles TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    pin_salt TEXT NOT NULL,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    role TEXT NOT NULL,
    tail_id TEXT,
    issued_at REAL NOT NULL,
    expires_at REAL NOT NULL,
    revoked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS maintenance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    engine_id TEXT NOT NULL,
    action TEXT NOT NULL,
    notes TEXT,
    created_at REAL NOT NULL
);
"""


# Old sequential fleet tail id -> current squadron tail id (see _migrate).
# Some old ids are reused as new ids, so the remap is applied once, in a
# single CASE statement, guarded by the schema_version pragma.
LEGACY_TAIL_IDS = {
    "UAV-01": "UAV-07",
    "UAV-02": "UAV-03",
    "UAV-03": "UAV-11",
    "UAV-04": "UAV-02",
    "UAV-05": "UAV-09",
    "UAV-06": "UAV-05",
}
SCHEMA_VERSION = 2

# Columns added after first deployment: (table, column, declaration).
ADDED_COLUMNS = [
    ("missions", "tail_id", "TEXT"),
    ("missions", "sortie_label", "TEXT"),
    ("missions", "kind", "TEXT NOT NULL DEFAULT 'operational'"),
    ("missions", "injected_faults_json", "TEXT NOT NULL DEFAULT '[]'"),
    ("missions", "flight_s", "REAL"),
    ("missions", "engine_hours_start", "REAL"),
    ("alerts", "muted_until", "REAL"),
    ("reports", "signer_operator_id", "TEXT"),
    ("reports", "maint_signed_by", "TEXT"),
    ("reports", "maint_signer_operator_id", "TEXT"),
    ("reports", "maint_signed_at", "REAL"),
    ("reports", "maint_signature_sha256", "TEXT"),
]


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
    for table, column, decl in ADDED_COLUMNS:
        cols = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
        if column not in cols:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")
    conn.commit()
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    if version < 2:
        # Fleet tails were renumbered to the squadron identities (configs/fleet/);
        # carry runs attributed to the old sequential ids over to their new tails.
        cases = " ".join(f"WHEN '{old}' THEN '{new}'" for old, new in LEGACY_TAIL_IDS.items())
        conn.execute(f"UPDATE missions SET tail_id = CASE tail_id {cases} ELSE tail_id END")
    conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
    conn.commit()


def insert_mission(
    conn: sqlite3.Connection,
    mission_run_id: str,
    engine_id: str,
    mission_id: str,
    parquet_path: str = "",
    notes: str = "",
    tail_id: str | None = None,
    sortie_label: str | None = None,
    kind: str = "operational",
    engine_hours_start: float | None = None,
    start_time: float | None = None,
) -> int:
    """Record a new mission run; returns its row id."""
    cur = conn.execute(
        "INSERT OR REPLACE INTO missions (mission_run_id, engine_id, mission_id, start_time, parquet_path, notes, "
        "tail_id, sortie_label, kind, engine_hours_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            mission_run_id, engine_id, mission_id, start_time if start_time is not None else time.time(),
            parquet_path, notes, tail_id, sortie_label, kind, engine_hours_start,
        ),
    )
    conn.commit()
    return cur.lastrowid


def close_mission(
    conn: sqlite3.Connection,
    mission_run_id: str,
    flight_s: float | None = None,
    parquet_path: str | None = None,
    injected_faults_json: str | None = None,
    end_time: float | None = None,
) -> None:
    """Mark a mission run as finished: wall-clock end time, simulated flight time flown,
    its telemetry log path and the faults injected during it (if any).
    """
    conn.execute(
        "UPDATE missions SET end_time = ?, flight_s = COALESCE(?, flight_s), "
        "parquet_path = COALESCE(?, parquet_path), "
        "injected_faults_json = COALESCE(?, injected_faults_json) WHERE mission_run_id = ?",
        (end_time if end_time is not None else time.time(), flight_s, parquet_path, injected_faults_json, mission_run_id),
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
    created_at: float | None = None,
    acknowledged: bool = False,
) -> int:
    """Insert a new alert row; returns its row id."""
    cur = conn.execute(
        "INSERT INTO alerts (mission_run_id, t_s, subsystem, severity, message, acknowledged, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (mission_run_id, t_s, subsystem, severity, message, int(acknowledged), created_at if created_at is not None else time.time()),
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
