"""Trends & Fleet: squadron status table, per-tail (or fleet-mean) degradation
trends across sorties, and the subsystem x sortie health matrix.

All values come from stored sortie summaries (aerotwin.fleet.records) and, for
the airframe currently flying, the live session.
"""

from __future__ import annotations

import csv
import io
import time
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

import numpy as np

from aerotwin.fleet.records import TailRun, tail_runs
from aerotwin.health.prognostics import prognose
from aerotwin.maintenance.service import scheduled_due

if TYPE_CHECKING:
    from aerotwin.api.state import AppState

HEATMAP_SUBSYSTEMS = [
    ("combustion", "Combustion"),
    ("cooling", "Cooling"),
    ("lubrication", "Lubrication"),
    ("fuel_injection", "Fuel / Inj"),
    ("electrical", "Electrical"),
    ("turbo_air", "Turbo / Air"),
    ("sensors", "Sensors"),
]
RISK_RANK = {"NORMAL": 0, "WATCH": 1, "WARNING": 2, "CRITICAL": 3}
MAINT_DUE_HOURS = 15.0  # a scheduled task due within this many engine hours => MAINTENANCE REQ
RUL_WATCH_HOURS = 300.0
RUL_MAINT_HOURS = 100.0


@dataclass
class FleetRow:
    tail_id: str
    is_current: bool
    engine_class: str
    engine_serial: str
    total_hours: float
    health_index: float | None
    health_risk: str | None
    rul_hours: float | None
    rul_p05_hours: float | None
    rul_p95_hours: float | None
    last_mission: dict[str, Any] | None
    status: str  # MISSION READY | WATCH | MAINTENANCE REQ
    next_maintenance: dict[str, Any] | None
    n_sorties: int


def _mission_meta(state: AppState, mission_id: str) -> dict[str, str]:
    try:
        m = state.mission_registry.get(mission_id)
        return {"name": m.description or m.display_name, "short_name": m.short_name, "profile": m.profile}
    except KeyError:
        return {"name": mission_id, "short_name": mission_id, "profile": "other"}


def _rul(runs: list[TailRun], state: AppState, live: tuple[float, float] | None = None):
    usable = [r for r in runs if r.summary and r.summary.health_index_end is not None and not r.is_test]
    hours = [r.engine_hours_end for r in usable]
    values = [r.summary.health_index_end for r in usable]
    if live is not None:
        hours.append(live[0])
        values.append(live[1])
    if not hours:
        return None
    return prognose(hours, values, state.prognostics_config)


def fleet_status(state: AppState) -> list[FleetRow]:
    """One row per airframe: hours, health, RUL, last sortie, readiness and next maintenance."""
    session = state.session
    rows: list[FleetRow] = []
    for tail in state.fleet_registry.all():
        engine = state.engine_registry.get(tail.engine_id)
        runs = tail_runs(state.db, tail, state.engine_registry)
        flying = session is not None and session.tail_id == tail.tail_id and session.mode == "LIVE"
        last = runs[-1] if runs else None

        if flying:
            hours = session.engine_hours
            hi = session.health_ewma
            prog = session.prognosis
            risk = state.buffer.latest().get("health_risk") if state.buffer.latest() else None
            meta = _mission_meta(state, session.mission.mission_id)
            last_mission = {"sortie_label": session.sortie_label, "name": meta["short_name"], "active": True, "ended_at": None}
        else:
            hours = last.engine_hours_end if last else tail.hours_at_induction
            hi = last.summary.health_index_end if last and last.summary else None
            prog = _rul(runs, state)
            risk = last.summary.worst_health_risk if last and last.summary else None
            last_mission = None
            if last is not None:
                meta = _mission_meta(state, last.run["mission_id"])
                last_mission = {
                    "sortie_label": last.run["sortie_label"], "name": meta["name"], "active": False,
                    "ended_at": last.run["end_time"],
                }

        due = scheduled_due(state.db, state.maintenance_kb, tail.tail_id, hours)
        open_wo = state.db.execute(
            "SELECT title, priority FROM work_orders WHERE tail_id = ? AND status != 'COMPLETED' ORDER BY priority = 'HIGH' DESC",
            (tail.tail_id,),
        ).fetchone()
        next_task = due[0] if due else None
        next_maintenance = (
            {"due_in_hours": next_task.due_in_hours, "title": next_task.title, "task_key": next_task.key}
            if next_task else None
        )

        rul = prog.rul_mean_hours if prog else None
        threshold = state.prognostics_config.threshold_index
        if (
            (next_task and next_task.due_in_hours <= MAINT_DUE_HOURS)
            or (hi is not None and hi <= threshold)
            or (rul is not None and rul <= RUL_MAINT_HOURS)
            or (open_wo is not None and open_wo["priority"] == "HIGH")
        ):
            status = "MAINTENANCE REQ"
        elif (risk is not None and RISK_RANK.get(risk, 0) >= 1) or (rul is not None and rul <= RUL_WATCH_HOURS):
            status = "WATCH"
        else:
            status = "MISSION READY"

        rows.append(FleetRow(
            tail_id=tail.tail_id, is_current=flying or (session is None and tail.primary),
            engine_class=engine.short_name or engine.display_name, engine_serial=tail.engine_serial,
            total_hours=hours, health_index=hi, health_risk=risk,
            rul_hours=rul, rul_p05_hours=prog.rul_p05_hours if prog else None, rul_p95_hours=prog.rul_p95_hours if prog else None,
            last_mission=last_mission, status=status, next_maintenance=next_maintenance, n_sorties=len(runs),
        ))
    return rows


@dataclass
class SortiePoint:
    label: str  # M-01 .. M-nn, oldest first
    run_id: str | None
    sortie_label: str | None
    profile: str | None
    start_time: float | None
    engine_hours_end: float | None
    health_index: float | None
    bsfc_g_per_kwh: float | None
    cht_margin_k: float | None
    oil_l_per_10h: float | None
    subsystems: dict[str, float | None] = field(default_factory=dict)


def _select_runs(runs: list[TailRun], range_: str, profile: str | None, state: AppState) -> list[TailRun]:
    runs = [r for r in runs if r.summary is not None and not r.is_test]
    if profile and profile != "all":
        runs = [r for r in runs if _mission_meta(state, r.run["mission_id"])["profile"] == profile]
    if range_ == "30d":
        cutoff = time.time() - 30 * 86400
        runs = [r for r in runs if (r.run["start_time"] or 0) >= cutoff]
    else:
        runs = runs[-20:]
    return runs


def _point(label: str, r: TailRun, state: AppState) -> SortiePoint:
    s = r.summary
    assert s is not None
    return SortiePoint(
        label=label, run_id=r.run_id, sortie_label=r.run["sortie_label"],
        profile=_mission_meta(state, r.run["mission_id"])["profile"], start_time=r.run["start_time"],
        engine_hours_end=r.engine_hours_end, health_index=s.health_index_end, bsfc_g_per_kwh=s.bsfc_g_per_kwh,
        cht_margin_k=s.cht_margin_k, oil_l_per_10h=s.oil_consumption_l_per_10h,
        subsystems={k: s.subsystem_index_end.get(k) for k, _ in HEATMAP_SUBSYSTEMS},
    )


def _mean(values: list[float | None]) -> float | None:
    vals = [v for v in values if v is not None]
    return float(np.mean(vals)) if vals else None


def _kpi(points: list[SortiePoint], attr: str, per: str) -> dict[str, Any]:
    series = [getattr(p, attr) for p in points]
    vals = [(i, v) for i, v in enumerate(series) if v is not None]
    if not vals:
        return {"current": None, "first": None, "series": series}
    xs, ys = zip(*vals, strict=True)
    slope = float(np.polyfit(xs, ys, 1)[0]) if len(vals) >= 3 else 0.0
    recent = [v for v in series[-6:] if v is not None]
    recent_slope = float(np.polyfit(range(len(recent)), recent, 1)[0]) if len(recent) >= 3 else slope
    return {
        "current": ys[-1], "first": ys[0], "previous": ys[-2] if len(ys) > 1 else None,
        "slope_per_mission": slope, "recent_slope_per_mission": recent_slope, "unit_basis": per, "series": series,
    }


def tail_trends(state: AppState, tail_id: str, range_: str = "last20", profile: str | None = None) -> dict[str, Any]:
    """Degradation KPIs + subsystem matrix for one tail, or `tail_id='fleet'` for the fleet mean."""
    if tail_id == "fleet":
        per_tail = [
            _select_runs(tail_runs(state.db, t, state.engine_registry), range_, profile, state)
            for t in state.fleet_registry.all()
        ]
        n = max((len(r) for r in per_tail), default=0)
        points = []
        for i in range(n):
            # Align sorties from the most recent backwards so M-nn is every tail's latest.
            members = [_point("", runs[len(runs) - n + i], state) for runs in per_tail if len(runs) - n + i >= 0]
            points.append(SortiePoint(
                label=f"M-{i + 1:02d}", run_id=None, sortie_label=None, profile=None, start_time=None,
                engine_hours_end=None,
                health_index=_mean([m.health_index for m in members]),
                bsfc_g_per_kwh=_mean([m.bsfc_g_per_kwh for m in members]),
                cht_margin_k=_mean([m.cht_margin_k for m in members]),
                oil_l_per_10h=_mean([m.oil_l_per_10h for m in members]),
                subsystems={k: _mean([m.subsystems.get(k) for m in members]) for k, _ in HEATMAP_SUBSYSTEMS},
            ))
    else:
        tail = state.fleet_registry.get(tail_id)
        runs = _select_runs(tail_runs(state.db, tail, state.engine_registry), range_, profile, state)
        points = [_point(f"M-{i + 1:02d}", r, state) for i, r in enumerate(runs)]

    engine = state.engine_registry.get(state.fleet_registry.all()[0].engine_id if tail_id == "fleet" else state.fleet_registry.get(tail_id).engine_id)
    heatmap = []
    for key, label in HEATMAP_SUBSYSTEMS:
        values = [p.subsystems.get(key) for p in points]
        vals = [v for v in values if v is not None]
        heatmap.append({"key": key, "label": label, "values": values, "average": float(np.mean(vals)) if vals else None,
                        "latest": vals[-1] if vals else None})

    return {
        "tail_id": tail_id,
        "range": range_,
        "profile": profile or "all",
        "missions": [p.__dict__ for p in points],
        "kpis": {
            "health_index": _kpi(points, "health_index", "mission"),
            "bsfc_g_per_kwh": _kpi(points, "bsfc_g_per_kwh", "mission"),
            "cht_margin_k": _kpi(points, "cht_margin_k", "sortie"),
            "oil_l_per_10h": _kpi(points, "oil_l_per_10h", "mission"),
        },
        "limits": {
            "cht_nominal_margin_k": engine.limits.max_cht_k - (engine.limits.cht_target_k or engine.limits.max_cht_k),
            "cht_critical_margin_k": engine.limits.max_cht_k - (engine.limits.cht_caution_k or engine.limits.max_cht_k),
            "oil_limit_l_per_10h": engine.lubrication.oil_consumption_nominal_l_per_h * 10.0 * OIL_LIMIT_FACTOR,
        },
        "heatmap": heatmap,
        "correlation": _correlation_note(tail_id, points),
        "rul_model": state.prognostics_config.model,
    }


OIL_LIMIT_FACTOR = 2.2  # consumption above ~2.2x nominal burn flags ring/guide wear, approx


def _correlation_note(tail_id: str, points: list[SortiePoint]) -> dict[str, Any] | None:
    """Which subsystems degraded over the latest sorties while others stayed at baseline."""
    if len(points) < 6:
        return None
    recent, base = points[-4:], points[:4]
    degraded, stable = [], []
    for key, label in HEATMAP_SUBSYSTEMS:
        r = _mean([p.subsystems.get(key) for p in recent])
        b = _mean([p.subsystems.get(key) for p in base])
        if r is None or b is None:
            continue
        if b - r >= 5.0:
            degraded.append({"key": key, "label": label, "drop": b - r})
        elif r >= 95.0:
            stable.append({"key": key, "label": label, "value": r})
    if not degraded:
        return None
    return {
        "tail_id": tail_id,
        "from_label": recent[0].label,
        "to_label": recent[-1].label,
        "degraded": degraded,
        "stable": stable,
    }


def trends_csv(trends: dict[str, Any]) -> str:
    """CSV export of the per-sortie trend table."""
    out = io.StringIO()
    keys = [k for k, _ in HEATMAP_SUBSYSTEMS]
    w = csv.writer(out)
    w.writerow(["mission", "sortie", "profile", "engine_hours", "health_index", "bsfc_g_per_kwh", "cht_margin_k", "oil_l_per_10h", *keys])
    for m in trends["missions"]:
        w.writerow([
            m["label"], m["sortie_label"] or "", m["profile"] or "", m["engine_hours_end"] or "", m["health_index"],
            m["bsfc_g_per_kwh"], m["cht_margin_k"], m["oil_l_per_10h"], *(m["subsystems"].get(k) for k in keys),
        ])
    return out.getvalue()
