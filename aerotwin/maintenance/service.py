"""Maintenance: condition-based advisories (ATA-referenced), work orders,
scheduled-task due hours and component service records.

Advisories are raised from the faults the twin/classifier currently detects or
predicts (configs/maintenance/maintenance.yaml). Scheduled tasks count engine
hours since the matching work order was last completed.
"""

from __future__ import annotations

import sqlite3
import time
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from aerotwin.health.prognostics import DEFAULT_MAINTENANCE_PATH

PRIORITY_RANK = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}


@dataclass
class ScheduledTask:
    key: str
    title: str
    interval_hours: float
    ata: str
    location: str


@dataclass
class AdvisoryTemplate:
    key: str
    title: str
    detail: str
    ata: str
    location: str
    priority: str
    requires_cylinder: bool = False
    service_task: str | None = None


@dataclass
class MaintenanceKB:
    """Parsed maintenance knowledge base."""

    scheduled: list[ScheduledTask]
    advisories: dict[str, list[AdvisoryTemplate]]
    faults: dict[str, dict[str, str]]

    @classmethod
    def load(cls, path: Path = DEFAULT_MAINTENANCE_PATH) -> MaintenanceKB:
        with path.open() as f:
            raw = yaml.safe_load(f)
        return cls(
            scheduled=[ScheduledTask(**t) for t in raw.get("scheduled_tasks", [])],
            advisories={k: [AdvisoryTemplate(**a) for a in v] for k, v in (raw.get("advisories") or {}).items()},
            faults=raw.get("faults") or {},
        )

    def fault_label(self, fault: str) -> str:
        return self.faults.get(fault, {}).get("label", fault.replace("_", " ").capitalize())

    def fault_subsystem(self, fault: str) -> str:
        return self.faults.get(fault, {}).get("subsystem", "Engine")


@dataclass
class Advisory:
    """One maintenance action recommended for a tail right now."""

    advisory_key: str  # template key + cylinder, stable across refreshes
    fault_type: str
    title: str
    detail: str
    ata: str
    location: str
    priority: str
    reviewed: bool = False
    work_order: str | None = None


@dataclass
class TaskDue:
    key: str
    title: str
    due_in_hours: float
    ata: str
    location: str
    last_completed_hours: float | None = None
    interval_hours: float | None = None


@dataclass
class ComponentRecord:
    """Service history line for a component (Digital Twin 'Maintenance Record')."""

    task_key: str
    title: str
    hours_since_service: float | None
    next_due_in_hours: float
    last_work_order: str | None = None


@dataclass
class ActiveFault:
    """A fault the twin currently detects or predicts (input to advisories)."""

    fault_type: str
    cylinder: int | None = None  # 1-based, when cylinder-specific
    extra: dict = field(default_factory=dict)


def build_advisories(
    db: sqlite3.Connection, kb: MaintenanceKB, tail_id: str, faults: list[ActiveFault]
) -> list[Advisory]:
    """Advisories for the given active/predicted faults, with review + work-order state."""
    reviewed = {r["advisory_key"] for r in db.execute("SELECT advisory_key FROM advisory_reviews WHERE tail_id = ?", (tail_id,))}
    open_wos = {
        r["task_key"]: r["wo_number"]
        for r in db.execute(
            "SELECT task_key, wo_number FROM work_orders WHERE tail_id = ? AND status != 'COMPLETED'", (tail_id,)
        )
    }
    out: list[Advisory] = []
    seen: set[str] = set()
    for fault in faults:
        for tpl in kb.advisories.get(fault.fault_type, []):
            if tpl.requires_cylinder and fault.cylinder is None:
                continue
            cyl = str(fault.cylinder) if fault.cylinder is not None else ""
            key = f"{tpl.key}:{cyl}" if tpl.requires_cylinder else tpl.key
            if key in seen:
                continue
            seen.add(key)
            out.append(
                Advisory(
                    advisory_key=key,
                    fault_type=fault.fault_type,
                    title=tpl.title.format(cyl=cyl),
                    detail=tpl.detail.format(cyl=cyl),
                    ata=tpl.ata,
                    location=tpl.location.format(cyl=cyl),
                    priority=tpl.priority,
                    reviewed=key in reviewed,
                    work_order=open_wos.get(key),
                )
            )
    out.sort(key=lambda a: PRIORITY_RANK.get(a.priority, 9))
    return out


def _next_wo_number(db: sqlite3.Connection) -> str:
    n = db.execute("SELECT COALESCE(MAX(id), 0) FROM work_orders").fetchone()[0] + 1
    return f"WO-{time.strftime('%Y', time.gmtime())}-{n:04d}"


def create_work_order(
    db: sqlite3.Connection,
    tail_id: str,
    task_key: str,
    title: str,
    description: str = "",
    ata_ref: str = "",
    location: str = "",
    priority: str = "MEDIUM",
    fault_type: str | None = None,
    source: str = "advisory",
    created_by: str | None = None,
    report_id: str | None = None,
    status: str = "OPEN",
    created_at: float | None = None,
    completed_at: float | None = None,
    engine_hours_at_completion: float | None = None,
) -> dict:
    """Open (or, for history seeding, record an already-completed) work order."""
    wo = _next_wo_number(db)
    db.execute(
        "INSERT INTO work_orders (wo_number, tail_id, task_key, fault_type, title, description, ata_ref, location, "
        "priority, status, source, report_id, created_by, created_at, completed_at, engine_hours_at_completion) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            wo, tail_id, task_key, fault_type, title, description, ata_ref, location, priority, status, source,
            report_id, created_by, created_at if created_at is not None else time.time(), completed_at,
            engine_hours_at_completion,
        ),
    )
    db.commit()
    return dict(db.execute("SELECT * FROM work_orders WHERE wo_number = ?", (wo,)).fetchone())


def complete_work_order(db: sqlite3.Connection, wo_number: str, engine_hours: float) -> None:
    db.execute(
        "UPDATE work_orders SET status = 'COMPLETED', completed_at = ?, engine_hours_at_completion = ? WHERE wo_number = ?",
        (time.time(), engine_hours, wo_number),
    )
    db.commit()


def mark_reviewed(db: sqlite3.Connection, tail_id: str, advisory_keys: list[str], reviewed_by: str | None) -> None:
    now = time.time()
    for key in advisory_keys:
        db.execute(
            "INSERT INTO advisory_reviews (tail_id, advisory_key, reviewed_by, reviewed_at) VALUES (?, ?, ?, ?)",
            (tail_id, key, reviewed_by, now),
        )
    db.commit()


def list_work_orders(db: sqlite3.Connection, tail_id: str | None = None) -> list[dict]:
    if tail_id:
        rows = db.execute("SELECT * FROM work_orders WHERE tail_id = ? ORDER BY created_at DESC", (tail_id,))
    else:
        rows = db.execute("SELECT * FROM work_orders ORDER BY created_at DESC")
    return [dict(r) for r in rows]


def _last_completion_hours(db: sqlite3.Connection, tail_id: str, task_key: str) -> tuple[float | None, str | None]:
    row = db.execute(
        "SELECT engine_hours_at_completion, wo_number FROM work_orders WHERE tail_id = ? AND task_key = ? "
        "AND status = 'COMPLETED' ORDER BY engine_hours_at_completion DESC LIMIT 1",
        (tail_id, task_key),
    ).fetchone()
    if row is None:
        return None, None
    return row["engine_hours_at_completion"], row["wo_number"]


def scheduled_due(db: sqlite3.Connection, kb: MaintenanceKB, tail_id: str, engine_hours_now: float) -> list[TaskDue]:
    """Every scheduled task with hours remaining until due (negative = overdue), soonest first."""
    out = []
    for task in kb.scheduled:
        last, _ = _last_completion_hours(db, tail_id, task.key)
        base = last if last is not None else 0.0
        due_in = base + task.interval_hours - engine_hours_now
        # Periodic: a task never completed is due at the next multiple of its interval.
        if last is None:
            due_in = task.interval_hours - (engine_hours_now % task.interval_hours)
        out.append(TaskDue(task.key, task.title, float(due_in), task.ata, task.location, last, task.interval_hours))
    out.sort(key=lambda t: t.due_in_hours)
    return out


def component_record(
    db: sqlite3.Connection, kb: MaintenanceKB, tail_id: str, task_key: str, engine_hours_now: float
) -> ComponentRecord | None:
    """Service record for one scheduled task (e.g. cylinder head service)."""
    task = next((t for t in kb.scheduled if t.key == task_key), None)
    if task is None:
        return None
    last, wo = _last_completion_hours(db, tail_id, task_key)
    since = engine_hours_now - last if last is not None else None
    due = (last + task.interval_hours - engine_hours_now) if last is not None else task.interval_hours - (engine_hours_now % task.interval_hours)
    return ComponentRecord(task_key, task.title, since, float(due), wo)
