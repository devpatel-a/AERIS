"""Digital Twin, Diagnostics, maintenance and alert endpoints (live session views)."""

from __future__ import annotations

import time
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from aerotwin.api.deps import jsonable, live_session, operator_name
from aerotwin.api.security import require_token
from aerotwin.api.state import get_app_state
from aerotwin.fleet import records
from aerotwin.health.prognostics import prognose
from aerotwin.maintenance.service import (
    ActiveFault,
    build_advisories,
    component_record,
    create_work_order,
    list_work_orders,
    mark_reviewed,
)
from aerotwin.ml.labels import feature_label
from aerotwin.physics.state import HEALTH_NAMES, nominal_health_vector

router = APIRouter(tags=["twin"])
Operator = Annotated[str | None, Depends(operator_name)]

MISSION_RISK = {"NORMAL": "GO", "WATCH": "CAUTION", "WARNING": "NO-GO", "CRITICAL": "NO-GO"}


def _latest() -> dict[str, Any]:
    row = get_app_state().buffer.latest()
    if row is None or row.get("mode") != "LIVE":
        raise HTTPException(status_code=404, detail="No live telemetry yet")
    return row


def _downsample(rows: list[dict], max_points: int) -> list[dict]:
    step = max(1, len(rows) // max_points)
    return rows[::step]


# ----------------------------------------------------------------- twin
@router.get("/api/twin/history")
def twin_history(channel: str = "cht_3_k", window_s: float = 600.0, max_points: int = 240) -> dict:
    """Measured vs twin-expected (with the UKF 95% band) for one channel over a trailing window."""
    rows = [r for r in get_app_state().buffer.window(window_s) if r.get("mode") == "LIVE"]
    if not rows:
        raise HTTPException(status_code=404, detail="No live telemetry yet")
    rows = _downsample(rows, max_points)
    return jsonable({
        "channel": channel,
        "t_s": [r["t_s"] for r in rows],
        "measured": [r["measured"].get(channel) for r in rows],
        "expected": [r["expected"].get(channel) for r in rows],
        "ci_low": [(r.get("expected_ci", {}).get(channel) or [None, None])[0] for r in rows],
        "ci_high": [(r.get("expected_ci", {}).get(channel) or [None, None])[1] for r in rows],
        "anomaly_score": [(r.get("anomaly_score") or {}).get("value") for r in rows],
    })


@router.get("/api/twin/health-parameters")
def twin_health_parameters(window_s: float = 1800.0, max_points: int = 60) -> dict:
    """UKF-estimated health parameters: current value, delta vs nominal, trailing history."""
    state = get_app_state()
    session = live_session(state)
    rows = _downsample([r for r in state.buffer.window(window_s) if r.get("mode") == "LIVE"], max_points)
    nominal = dict(zip(HEALTH_NAMES, nominal_health_vector(session.engine_config.nominal_health.injector_flow_coeff), strict=True))
    current = dict(zip(HEALTH_NAMES, (float(v) for v in session.twin.model.health), strict=True))
    params = []
    for name in HEALTH_NAMES:
        hist = [r["degradation_state"].get(name) for r in rows]
        delta = (current[name] - nominal[name]) / nominal[name] if nominal[name] else 0.0
        # Friction rising is degradation; everything else degrades by falling.
        worse = delta > 0.05 if name == "friction_factor" else delta < -0.05
        params.append({
            "name": name, "value": current[name], "nominal": nominal[name], "delta": delta,
            "status": "WATCH" if worse else "NOMINAL", "history": hist,
        })
    return jsonable({"model": "Unscented Kalman Filter", "confidence_pct": session.twin.estimator.confidence_pct, "parameters": params})


@router.get("/api/twin/assembly/{cylinder}")
def twin_assembly(cylinder: int) -> dict:
    """One cylinder assembly: live readings vs twin, health, anomaly onset, service record."""
    state = get_app_state()
    session = live_session(state)
    row = _latest()
    cyl = next((c for c in row.get("cylinders", []) if c["cylinder"] == cylinder), None)
    if cyl is None:
        raise HTTPException(status_code=404, detail=f"No cylinder {cylinder}")
    onset = None
    if session.analytics is not None:
        for fault, track in session.analytics.tracks.items():
            if fault in ("cooling_degradation", "overheating_trend") and track.first_detected_t is not None:
                onset = track.first_detected_t if onset is None else min(onset, track.first_detected_t)
    history = [r for r in state.buffer.window(300.0) if r.get("mode") == "LIVE"]
    history = _downsample(history, 60)
    record = None
    if session.tail is not None:
        rec = component_record(state.db, state.maintenance_kb, session.tail.tail_id, "cylinder_head_service", session.engine_hours)
        record = rec.__dict__ if rec else None
    return jsonable({
        **cyl,
        "anomaly_onset_t": onset,
        "maintenance_record": record,
        "divergence": {
            "t_s": [r["t_s"] for r in history],
            "measured": [r["measured"].get(f"cht_{cylinder}_k") for r in history],
            "expected": [r["expected"].get(f"cht_{cylinder}_k") for r in history],
        },
    })


@router.get("/api/twin/geometry")
def twin_geometry(engine_id: str | None = None) -> dict:
    """Engine layout for the 3D twin: cylinders, bore/stroke, turbo, sensor anchors."""
    state = get_app_state()
    engine_id = engine_id or (state.session.engine_config.engine_id if state.session else "rotax914_like")
    cfg = state.engine_registry.get(engine_id)
    g = cfg.geometry
    return {
        "engine_id": cfg.engine_id, "display_name": cfg.display_name, "short_name": cfg.short_name,
        "layout": g.layout, "cylinders": g.cylinders, "bore_m": g.bore_m, "stroke_m": g.stroke_m,
        "firing_order": g.firing_order, "turbo": cfg.turbo.present, "cooling": cfg.cooling.type,
        "gear_ratio": cfg.propeller.gear_ratio, "propeller_diameter_m": cfg.propeller.diameter_m,
        "limits": {"max_cht_k": cfg.limits.max_cht_k, "cht_caution_k": cfg.limits.cht_caution_k, "cht_target_k": cfg.limits.cht_target_k},
        "sensors": [
            *({"id": f"CHT-0{i}", "channel": f"cht_{i}_k", "cylinder": i} for i in range(1, g.cylinders + 1)),
            *({"id": f"EGT-0{i}", "channel": f"egt_{i}_k", "cylinder": i} for i in range(1, g.cylinders + 1)),
            {"id": "OIL-T", "channel": "oil_temp_k"}, {"id": "OIL-P", "channel": "oil_pressure_kpa"},
            {"id": "COOL-T", "channel": "coolant_temp_k"}, {"id": "MAP", "channel": "map_kpa"},
            {"id": "ACC-Z", "channel": "vibration_rms_g"},
        ],
    }


# ----------------------------------------------------------------- diagnostics
@router.get("/api/diagnostics/summary")
def diagnostics_summary() -> dict:
    """Header chips: active/predicted fault counts, RUL, mission risk."""
    row = _latest()
    matrix = row.get("fault_matrix", [])
    session = live_session()
    return jsonable({
        "tail_id": session.tail_id,
        "active_faults": sum(1 for f in matrix if f["state"] == "ACTIVE"),
        "predicted_faults": sum(1 for f in matrix if f["state"] == "PREDICTED"),
        "rul_mean_hours": row.get("rul_mean_hours"), "rul_p05_hours": row.get("rul_p05_hours"), "rul_p95_hours": row.get("rul_p95_hours"),
        "mission_risk": MISSION_RISK.get(row.get("health_risk", "NORMAL"), "GO"),
        "health_risk": row.get("health_risk"),
    })


@router.get("/api/diagnostics/explanation")
def diagnostics_explanation() -> dict:
    """Explainable-AI attribution for the current diagnosis (SHAP, human-readable)."""
    session = live_session()
    diag = session.last_diagnosis
    if diag is None:
        raise HTTPException(status_code=404, detail="No diagnosis available yet")
    row = _latest()
    return jsonable({
        "fault_type": diag.fault, "label": get_app_state().maintenance_kb.fault_label(diag.fault) if diag.fault != "healthy" else "No fault",
        "confidence": diag.confidence,
        "narrative": (row.get("attribution") or {}).get("diagnosis") or diag.recommended_action,
        "shap": [{"feature": f["feature"], "label": feature_label(str(f["feature"])), "value": f["value"]} for f in diag.shap_features],
        "model": "XGBoost fault classifier · TreeSHAP",
    })


@router.get("/api/diagnostics/rul-curve")
def diagnostics_rul_curve() -> dict:
    """Lifetime health-index history + projected mean/90% band to the maintenance threshold."""
    state = get_app_state()
    session = live_session(state)
    hours, values = session.rul_history
    live = [*hours, session.engine_hours], [*values, session.health_ewma if session.health_ewma is not None else 100.0]
    prog = prognose(live[0], live[1], state.prognostics_config)
    return jsonable(prog.__dict__)


@router.get("/api/diagnostics/correlation")
def diagnostics_correlation() -> dict:
    """Sensor correlation & context tiles for the most divergent head."""
    row = _latest()
    m, e = row["measured"], row["expected"]
    cyls = row.get("cylinders", [])
    hot = max(cyls, key=lambda c: c.get("cht_residual_k") or -1e9) if cyls else None
    oil_lo, oil_hi = get_app_state().session.engine_config.operating_ranges.get("oil_temp_k", [None, None])
    oil = m.get("oil_temp_k")
    return jsonable({
        "cht_delta": {"cylinder": hot["cylinder"] if hot else None, "value_k": hot.get("cht_residual_k") if hot else None},
        "coolant_pressure": {"value_kpa": row.get("coolant_pressure_kpa"), "expected_kpa": row.get("expected_coolant_pressure_kpa")},
        "oil_temp": {"value_k": oil, "status": "NORM" if oil_lo is None or (oil_lo <= oil <= oil_hi) else ("HIGH" if oil > oil_hi else "LOW")},
        "map": {"value_kpa": m.get("map_kpa"), "pct_of_expected": (m.get("map_kpa") / e["map_kpa"] * 100.0) if e.get("map_kpa") else None},
        "bus": get_app_state().station.avionics_bus,
    })


@router.get("/api/live/events")
def live_events(limit: int = 50, kinds: str | None = None) -> list[dict]:
    """Session event timeline (newest first), optionally filtered by comma-separated kinds."""
    session = live_session()
    events = session.analytics.events if session.analytics else []
    if kinds:
        wanted = set(kinds.split(","))
        events = [e for e in events if e["kind"] in wanted]
    return jsonable(list(reversed(events))[:limit])


# ----------------------------------------------------------------- maintenance
def _active_faults_for(tail_id: str) -> list[ActiveFault]:
    state = get_app_state()
    session = state.session
    if session is not None and session.tail_id == tail_id and state.buffer.latest():
        return [
            ActiveFault(f["fault_type"], f.get("cylinder"))
            for f in state.buffer.latest().get("fault_matrix", []) if f["state"] in ("ACTIVE", "PREDICTED")
        ]
    tail = records.tail_for(state.fleet_registry, tail_id)
    if tail is None:
        return []
    runs = records.tail_runs(state.db, tail, state.engine_registry)
    last = runs[-1] if runs else None
    return [ActiveFault(f) for f in (last.summary.faults_observed if last and last.summary else [])]


@router.get("/api/maintenance/advisories")
def maintenance_advisories(tail_id: str) -> list[dict]:
    """ATA-referenced maintenance advisories raised by the tail's detected/predicted faults."""
    state = get_app_state()
    advisories = build_advisories(state.db, state.maintenance_kb, tail_id, _active_faults_for(tail_id))
    return [a.__dict__ for a in advisories]


class WorkOrderRequest(BaseModel):
    tail_id: str
    advisory_keys: list[str]


class ReviewRequest(BaseModel):
    tail_id: str
    advisory_keys: list[str]


@router.post("/api/maintenance/work-orders", dependencies=[Depends(require_token)])
def maintenance_create_work_orders(req: WorkOrderRequest, operator: Operator) -> list[dict]:
    """Open a work order for each selected advisory."""
    state = get_app_state()
    advisories = {a.advisory_key: a for a in build_advisories(state.db, state.maintenance_kb, req.tail_id, _active_faults_for(req.tail_id))}
    out = []
    for key in req.advisory_keys:
        adv = advisories.get(key)
        if adv is None:
            raise HTTPException(status_code=404, detail=f"No current advisory '{key}'")
        if adv.work_order:
            continue
        out.append(create_work_order(
            state.db, req.tail_id, key, adv.title, description=adv.detail, ata_ref=adv.ata, location=adv.location,
            priority=adv.priority, fault_type=adv.fault_type, created_by=operator,
        ))
    return out


@router.post("/api/maintenance/advisories/review", dependencies=[Depends(require_token)])
def maintenance_review(req: ReviewRequest, operator: Operator) -> dict:
    mark_reviewed(get_app_state().db, req.tail_id, req.advisory_keys, operator)
    return {"reviewed": req.advisory_keys}


@router.get("/api/maintenance/work-orders")
def maintenance_work_orders(tail_id: str | None = None) -> list[dict]:
    return list_work_orders(get_app_state().db, tail_id)


# ----------------------------------------------------------------- alerts
class MuteRequest(BaseModel):
    minutes: float = 30.0


@router.post("/api/alerts/mute", dependencies=[Depends(require_token)])
def alerts_mute(req: MuteRequest) -> dict:
    """Silence the anomaly banner for `minutes` of wall-clock time."""
    session = live_session()
    if session.analytics is None:
        raise HTTPException(status_code=400, detail="No live analytics")
    session.analytics.muted_until_wall = time.time() + req.minutes * 60.0
    return {"muted_until_wall": session.analytics.muted_until_wall}


@router.get("/api/alerts")
def alerts_list() -> dict:
    """Active session alerts (newest first) for the notifications bell."""
    state = get_app_state()
    session = state.session
    alerts = [a.__dict__ for a in reversed(session.alerts)] if session else []
    return jsonable({"alerts": alerts, "unread": sum(1 for a in alerts if not a["cleared"] and a["severity"] != "NORMAL")})
