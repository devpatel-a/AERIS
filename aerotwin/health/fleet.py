"""Fleet-level health aggregation: rolls up each tail's stored mission runs
into a fleet status table and a subsystem x mission heatmap, for the Trends &
Fleet Health Analytics screen. Every number here is computed from real stored
physics/health output (via aerotwin.reports.summary) — nothing is fabricated.

Mission-run -> tail attribution comes from the `tail_id` column on the
`missions` DB table, set when a LIVE/SIMULATION session is started with a
tail selected (see StartLiveRequest/StartSimulationRequest). Runs captured
before that concept existed have no recorded tail_id; this module attributes
them to a tail deterministically (a stable hash of mission_run_id) so the
fleet view has continuity with pre-existing demo data — only the tail
*label* is a fallback, never the telemetry itself.
"""

from __future__ import annotations

import hashlib
import sqlite3
from dataclasses import dataclass, field

import pandas as pd

from aerotwin.reports.summary import compute_post_flight_summary
from aerotwin.storage.db import list_missions
from aerotwin.storage.parquet_store import DEFAULT_MISSION_LOG_DIR
from aerotwin.twin.config import EngineRegistry
from aerotwin.twin.fleet import FleetRegistry


def _fallback_tail_id(mission_run_id: str, tail_ids: list[str]) -> str:
    """Deterministic tail assignment for a run with no recorded tail_id."""
    digest = hashlib.sha1(mission_run_id.encode()).hexdigest()
    return tail_ids[int(digest, 16) % len(tail_ids)]


def _runs_by_tail(db: sqlite3.Connection, tail_ids: list[str]) -> dict[str, list[sqlite3.Row]]:
    runs_by_tail: dict[str, list[sqlite3.Row]] = {t: [] for t in tail_ids}
    for run in list_missions(db):
        tail_id = run["tail_id"] if run["tail_id"] in runs_by_tail else _fallback_tail_id(run["mission_run_id"], tail_ids)
        runs_by_tail[tail_id].append(run)
    for t in runs_by_tail:
        runs_by_tail[t].sort(key=lambda r: r["start_time"], reverse=True)
    return runs_by_tail


@dataclass
class TailStatus:
    """One fleet table row: a tail's identity + its latest computed health/RUL/status."""

    tail_id: str
    tail_number: str
    engine_id: str
    engine_serial: str
    total_hours: float
    n_missions: int
    last_mission_run_id: str | None = None
    last_mission_id: str | None = None
    health_index: float | None = None
    health_risk: str | None = None  # status at the end of the last mission
    worst_health_risk: str | None = None  # worst risk level reached during the last mission
    rul_hours: float | None = None
    subsystem_index: dict[str, float] = field(default_factory=dict)
    faults_observed: list[str] = field(default_factory=list)
    notes: str = ""


def compute_fleet_table(db: sqlite3.Connection, fleet: FleetRegistry, engines: EngineRegistry) -> list[TailStatus]:
    """One row per fleet tail: latest health/RUL/status + cumulative logged hours."""
    tail_ids = fleet.list_tails()
    runs_by_tail = _runs_by_tail(db, tail_ids)

    rows: list[TailStatus] = []
    for tail in fleet.all():
        runs = runs_by_tail.get(tail.tail_id, [])
        engine_config = engines.get(tail.engine_id)

        total_hours = 0.0
        last_summary = None
        last_run = None
        faults: set[str] = set()
        for run in runs:
            log_path = DEFAULT_MISSION_LOG_DIR / f"{run['mission_run_id']}.parquet"
            if not log_path.exists():
                continue
            try:
                summary = compute_post_flight_summary(pd.read_parquet(log_path), engine_config)
            except Exception:
                continue
            total_hours += summary.duration_hours
            faults.update(summary.faults_observed)
            if last_summary is None:
                last_summary, last_run = summary, run

        rows.append(
            TailStatus(
                tail_id=tail.tail_id,
                tail_number=tail.tail_number,
                engine_id=tail.engine_id,
                engine_serial=tail.engine_serial,
                total_hours=total_hours,
                n_missions=len(runs),
                last_mission_run_id=last_run["mission_run_id"] if last_run else None,
                last_mission_id=last_run["mission_id"] if last_run else None,
                health_index=last_summary.health_index_end if last_summary else None,
                health_risk=last_summary.health_risk_end if last_summary else None,
                worst_health_risk=last_summary.worst_health_risk if last_summary else None,
                rul_hours=last_summary.rul_hours_end if last_summary else None,
                subsystem_index=last_summary.subsystem_index_end if last_summary else {},
                faults_observed=sorted(faults),
                notes=tail.notes,
            )
        )
    return rows


@dataclass
class TailHeatmap:
    """One tail's subsystem-health-by-mission grid, oldest mission first."""

    tail_id: str
    mission_labels: list[str] = field(default_factory=list)
    subsystems: dict[str, list[float | None]] = field(default_factory=dict)  # subsystem -> per-mission index
    health_index: list[float | None] = field(default_factory=list)  # overall index -> per-mission trend
    rul_hours: list[float | None] = field(default_factory=list)


def compute_tail_heatmap(
    db: sqlite3.Connection, fleet: FleetRegistry, engines: EngineRegistry, tail_id: str, n_missions: int = 12
) -> TailHeatmap:
    """A single tail's per-subsystem health index across its last `n_missions` runs."""
    tail = fleet.get(tail_id)
    engine_config = engines.get(tail.engine_id)
    runs_by_tail = _runs_by_tail(db, fleet.list_tails())
    runs = list(reversed(runs_by_tail.get(tail_id, [])[:n_missions]))  # oldest-first for a left-to-right timeline

    mission_labels: list[str] = []
    subsystems: dict[str, list[float | None]] = {}
    health_index: list[float | None] = []
    rul_hours: list[float | None] = []
    for i, run in enumerate(runs):
        mission_labels.append(f"M-{len(runs) - i:02d}")
        log_path = DEFAULT_MISSION_LOG_DIR / f"{run['mission_run_id']}.parquet"
        summary = None
        if log_path.exists():
            try:
                summary = compute_post_flight_summary(pd.read_parquet(log_path), engine_config)
            except Exception:
                summary = None
        values = summary.subsystem_index_end if summary else {}
        for name, value in values.items():
            subsystems.setdefault(name, []).append(value)
        for name in subsystems:
            if name not in values:
                subsystems[name].append(None)
        health_index.append(summary.health_index_end if summary else None)
        rul_hours.append(summary.rul_hours_end if summary else None)

    return TailHeatmap(
        tail_id=tail_id, mission_labels=mission_labels, subsystems=subsystems, health_index=health_index, rul_hours=rul_hours
    )
