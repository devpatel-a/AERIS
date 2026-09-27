"""Saved Mission Planner plans (SQLite `mission_plans`).

A saved plan stores the planner form (PlanSpec) and its compiled MissionConfig,
and is registered in the app's MissionRegistry under `plan_NNNN`, so sessions,
replay and fleet history treat it like any mission preset.
"""

from __future__ import annotations

import json
import sqlite3
import time
from typing import Any

from aerotwin.simulation.mission import MissionConfig, MissionRegistry
from aerotwin.simulation.route import PlanSpec


def _row(row: sqlite3.Row, flights: int = 0) -> dict[str, Any]:
    d = dict(row)
    d["spec"] = json.loads(d.pop("spec_json"))
    d.pop("mission_json", None)
    d["flights"] = flights
    return d


def flights_by_mission(db: sqlite3.Connection) -> dict[str, int]:
    rows = db.execute("SELECT mission_id, COUNT(*) FROM missions WHERE mission_id LIKE 'plan_%' GROUP BY mission_id").fetchall()
    return {r[0]: r[1] for r in rows}


def list_plans(db: sqlite3.Connection, tail_id: str | None = None) -> list[dict[str, Any]]:
    flown = flights_by_mission(db)
    q = "SELECT * FROM mission_plans" + (" WHERE tail_id = ?" if tail_id else "") + " ORDER BY updated_at DESC"
    return [_row(r, flown.get(r["mission_id"], 0)) for r in db.execute(q, (tail_id,) if tail_id else ())]


def get_plan(db: sqlite3.Connection, plan_id: str) -> dict[str, Any]:
    row = db.execute("SELECT * FROM mission_plans WHERE plan_id = ?", (plan_id,)).fetchone()
    if row is None:
        raise KeyError(plan_id)
    return _row(row, flights_by_mission(db).get(row["mission_id"], 0))


def code_taken(db: sqlite3.Connection, code: str, except_plan: str | None = None) -> bool:
    row = db.execute("SELECT plan_id FROM mission_plans WHERE code = ?", (code,)).fetchone()
    return row is not None and row["plan_id"] != except_plan


def next_ids(db: sqlite3.Connection) -> tuple[str, str]:
    ids = [r[0] for r in db.execute("SELECT plan_id FROM mission_plans").fetchall()]
    n = max((int(i.split("-")[1]) for i in ids if i.split("-")[-1].isdigit()), default=0) + 1
    return f"PLN-{n:04d}", f"plan_{n:04d}"


def save_plan(db: sqlite3.Connection, registry: MissionRegistry, spec: PlanSpec, mission: MissionConfig,
              plan_id: str | None, created_by: str | None) -> dict[str, Any]:
    """Insert (plan_id None) or update a plan and (re-)register its compiled mission."""
    now = time.time()
    if plan_id is None:
        plan_id, mission_id = next_ids(db)
        mission = mission.model_copy(update={"mission_id": mission_id, "origin": "plan"})
        db.execute(
            "INSERT INTO mission_plans (plan_id, mission_id, name, code, tail_id, template_id, spec_json, mission_json, "
            "created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (plan_id, mission_id, spec.name, spec.code, spec.tail_id, spec.template_id, spec.model_dump_json(),
             mission.model_dump_json(), created_by, now, now),
        )
    else:
        existing = get_plan(db, plan_id)
        mission = mission.model_copy(update={"mission_id": existing["mission_id"], "origin": "plan"})
        # Editing the plan invalidates the previous twin verdict.
        db.execute(
            "UPDATE mission_plans SET name = ?, code = ?, tail_id = ?, template_id = ?, spec_json = ?, mission_json = ?, "
            "last_verdict = NULL, last_confidence = NULL, last_evaluated_at = NULL, updated_at = ? WHERE plan_id = ?",
            (spec.name, spec.code, spec.tail_id, spec.template_id, spec.model_dump_json(), mission.model_dump_json(), now, plan_id),
        )
    db.commit()
    registry.register(mission)
    return get_plan(db, plan_id)


def record_verdict(db: sqlite3.Connection, plan_id: str, verdict: str, confidence: float) -> None:
    db.execute("UPDATE mission_plans SET last_verdict = ?, last_confidence = ?, last_evaluated_at = ? WHERE plan_id = ?",
               (verdict, confidence, time.time(), plan_id))
    db.commit()


def delete_plan(db: sqlite3.Connection, registry: MissionRegistry, plan_id: str) -> None:
    """Delete a never-flown plan (flown plans stay so replay/history keep their mission definition)."""
    plan = get_plan(db, plan_id)
    if plan["flights"]:
        raise ValueError(f"{plan_id} has been flown {plan['flights']} time(s) and is kept for mission history.")
    db.execute("DELETE FROM mission_plans WHERE plan_id = ?", (plan_id,))
    db.commit()
    registry.unregister(plan["mission_id"])


def load_into_registry(db: sqlite3.Connection, registry: MissionRegistry) -> int:
    """Register every saved plan's compiled mission (called at API start-up)."""
    n = 0
    for row in db.execute("SELECT mission_json FROM mission_plans"):
        registry.register(MissionConfig.model_validate_json(row["mission_json"]))
        n += 1
    return n
