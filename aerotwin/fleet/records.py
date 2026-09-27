"""Per-tail mission history: stored runs, cached post-flight summaries, engine hours.

Every number is derived from stored mission telemetry (Parquet logs written by
the live session loop or the history seeder) and the `missions` table. Runs
recorded without a tail (pre-fleet development runs) are not attributed to
any airframe.
"""

from __future__ import annotations

import json
import sqlite3
import time
from dataclasses import asdict, dataclass, fields

import pandas as pd

from aerotwin.reports.summary import MissionSummary, compute_post_flight_summary
from aerotwin.storage.parquet_store import DEFAULT_MISSION_LOG_DIR
from aerotwin.twin.config import EngineConfig, EngineRegistry
from aerotwin.twin.fleet import FleetRegistry, TailConfig

SUMMARY_VERSION = 5  # bump when MissionSummary gains fields, to recompute cached summaries
_SUMMARY_FIELDS = {f.name for f in fields(MissionSummary)}


@dataclass
class TailRun:
    """One recorded sortie of a tail, with its summary and engine-hour position."""

    run: sqlite3.Row
    summary: MissionSummary | None
    flight_hours: float
    engine_hours_start: float
    engine_hours_end: float

    @property
    def run_id(self) -> str:
        return self.run["mission_run_id"]

    @property
    def is_test(self) -> bool:
        """Bench/test sorties (injected faults) count toward engine hours but not trends/RUL."""
        return self.run["kind"] == "test"


def load_mission_df(mission_run_id: str) -> pd.DataFrame | None:
    """Load a run's stored telemetry, or None if it has no log."""
    path = DEFAULT_MISSION_LOG_DIR / f"{mission_run_id}.parquet"
    if not path.exists():
        return None
    return pd.read_parquet(path)


def store_summary(db: sqlite3.Connection, mission_run_id: str, summary: MissionSummary) -> None:
    """Cache a computed post-flight summary."""
    payload = {"_v": SUMMARY_VERSION, **asdict(summary)}
    db.execute(
        "INSERT OR REPLACE INTO mission_summaries (mission_run_id, summary_json, computed_at) VALUES (?, ?, ?)",
        (mission_run_id, json.dumps(payload), time.time()),
    )
    db.commit()


def get_summary(db: sqlite3.Connection, mission_run_id: str, config: EngineConfig) -> MissionSummary | None:
    """Cached post-flight summary for a run (computed from its log on first use)."""
    row = db.execute("SELECT summary_json FROM mission_summaries WHERE mission_run_id = ?", (mission_run_id,)).fetchone()
    if row is not None:
        payload = json.loads(row["summary_json"])
        if payload.pop("_v", None) == SUMMARY_VERSION:
            return MissionSummary(**{k: v for k, v in payload.items() if k in _SUMMARY_FIELDS})
    df = load_mission_df(mission_run_id)
    if df is None or df.empty:
        return None
    summary = compute_post_flight_summary(df, config)
    store_summary(db, mission_run_id, summary)
    return summary


def tail_runs(
    db: sqlite3.Connection, tail: TailConfig, engines: EngineRegistry, include_active: str | None = None
) -> list[TailRun]:
    """A tail's finished sorties, oldest first, with cumulative engine hours.

    `include_active` names a running session's run id to include even though it
    has no end_time yet (its flight hours come from the caller).
    """
    config = engines.get(tail.engine_id)
    rows = db.execute(
        "SELECT * FROM missions WHERE tail_id = ? ORDER BY start_time ASC", (tail.tail_id,)
    ).fetchall()
    out: list[TailRun] = []
    hours = tail.hours_at_induction
    for run in rows:
        if run["end_time"] is None and run["mission_run_id"] != include_active:
            continue
        summary = get_summary(db, run["mission_run_id"], config) if run["end_time"] is not None else None
        if run["flight_s"] is not None:
            flight_h = float(run["flight_s"]) / 3600.0
        elif summary is not None:
            flight_h = summary.duration_hours
        else:
            flight_h = 0.0
        start = run["engine_hours_start"] if run["engine_hours_start"] is not None else hours
        out.append(TailRun(run, summary, flight_h, float(start), float(start) + flight_h))
        hours = float(start) + flight_h
    return out


def engine_hours(db: sqlite3.Connection, tail: TailConfig, engines: EngineRegistry) -> float:
    """Total engine hours on a tail's engine at the end of its last recorded sortie."""
    runs = tail_runs(db, tail, engines)
    return runs[-1].engine_hours_end if runs else tail.hours_at_induction


def tail_for(fleet: FleetRegistry, tail_id: str | None) -> TailConfig | None:
    """Look up a tail, or None when unknown/unset."""
    if tail_id is None:
        return None
    try:
        return fleet.get(tail_id)
    except KeyError:
        return None
