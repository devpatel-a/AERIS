"""Simulation Control: session transport, time warp, atmosphere, fault injection
matrix, twin response log and the recommended throttle contingency.
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Annotated, Any

import numpy as np
import yaml
from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from aerotwin.api.deps import jsonable, live_session, operator_name
from aerotwin.api.security import require_token
from aerotwin.api.state import ATMOSPHERE_PRESETS, get_app_state, run_session_loop
from aerotwin.faults.specs import FaultSpec
from aerotwin.physics.engine_model import EngineModel
from aerotwin.physics.state import HEALTH_NAMES, nominal_health_vector
from aerotwin.simulation.mission import MissionRunner

router = APIRouter(prefix="/api/sim", tags=["simulation-control"])
Operator = Annotated[str | None, Depends(operator_name)]
CATALOG_PATH = Path(__file__).resolve().parents[3] / "configs" / "faults" / "catalog.yaml"
INCIDENT_KINDS = {"INJECTED", "DETECTED", "AI_DIAGNOSIS", "RUL_UPDATE", "CLEARED", "THRESHOLD", "LIMIT_WARNING"}


def _catalog() -> dict[str, Any]:
    with CATALOG_PATH.open() as f:
        return yaml.safe_load(f)


def _session_view() -> dict[str, Any]:
    state = get_app_state()
    s = state.session
    catalog = _catalog()
    if s is None:
        return {"running": False, "catalog": catalog, "atmospheres": ATMOSPHERE_PRESETS}
    injected = {i.spec.fault_type: i for i in s.injected if i.cleared_t is None}
    cards = []
    for card in catalog["cards"]:
        active = injected.get(card["fault_type"])
        cards.append({
            **card,
            "active": active is not None,
            "fault_id": active.fault_id if active else None,
            "injected_t": active.injected_t if active else None,
            "current_severity": _severity_now(active, s.t) if active else None,
            "live_target": active.spec.target if active else None,
            "live_profile": active.spec.profile if active else None,
            "live_ramp_s": active.spec.ramp_duration_s if active else None,
            "live_severity": active.spec.severity if active else None,
        })
    return {
        "running": s.running, "paused": s.paused, "mode": s.mode, "run_id": s.run_id, "tail_id": s.tail_id,
        "mission_id": s.mission.mission_id, "t_s": s.t, "loop_ms": s.twin.dt * 1000.0, "speed": s.speed,
        "atmosphere": s.atmosphere, "atmospheres": ATMOSPHERE_PRESETS, "throttle_cap": s.throttle_cap,
        "time_warp_options": catalog.get("time_warp_options", [1, 2, 5, 10, 20]),
        "hil_bus": s.hil.stats() if s.hil else None, "bus_interface": state.bus_interface,
        "cards": cards, "active_faults": len(injected),
    }


def _severity_now(injected, t: float) -> float:
    from aerotwin.faults.specs import severity_at

    return severity_at(t, injected.spec)


@router.get("/state")
def sim_state() -> dict:
    return jsonable(_session_view())


class ControlRequest(BaseModel):
    action: str  # pause | resume | stop | restart | step
    step_s: float = 1.0


@router.post("/control", dependencies=[Depends(require_token)])
async def sim_control(req: ControlRequest) -> dict:
    state = get_app_state()
    s = state.session
    if s is None:
        raise HTTPException(status_code=400, detail="No session running")
    if req.action == "pause":
        s.paused = True
    elif req.action == "resume":
        s.paused = False
    elif req.action == "step":
        s.paused = True
        s.step_ticks += max(1, int(round(req.step_s / s.twin.dt)))
    elif req.action == "stop":
        state.stop_session()
    elif req.action == "restart":
        mode, engine_id, mission_id, speed, tail_id, atmosphere = (
            s.mode, s.engine_config.engine_id, s.mission.mission_id, s.speed, s.tail_id, s.atmosphere,
        )
        new = state.start_session(mode, engine_id, mission_id, speed, tail_id=tail_id, atmosphere=atmosphere)
        new.task = asyncio.create_task(run_session_loop(new, state))
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action '{req.action}'")
    return jsonable(_session_view())


class WarpRequest(BaseModel):
    speed: float


@router.post("/time-warp", dependencies=[Depends(require_token)])
def sim_time_warp(req: WarpRequest) -> dict:
    s = get_app_state().session
    if s is None:
        raise HTTPException(status_code=400, detail="No session running")
    if not 0.1 <= req.speed <= 500:
        raise HTTPException(status_code=400, detail="Speed must be between 0.1x and 500x")
    s.speed = req.speed
    return jsonable(_session_view())


class AtmosphereRequest(BaseModel):
    preset: str


@router.post("/atmosphere", dependencies=[Depends(require_token)])
def sim_atmosphere(req: AtmosphereRequest) -> dict:
    """Switch the environment preset mid-flight (mission inputs change from now on)."""
    state = get_app_state()
    s = state.session
    if s is None:
        raise HTTPException(status_code=400, detail="No session running")
    preset = ATMOSPHERE_PRESETS.get(req.preset)
    if preset is None:
        raise HTTPException(status_code=400, detail=f"Unknown preset '{req.preset}'")
    base = state.mission_registry.get(s.mission.mission_id)
    s.mission = base.with_overrides(preset["cruise_altitude_m"], preset["isa_deviation_k"]) if req.preset != "isa" else base
    s.mission_helper = MissionRunner(s.engine_config, s.mission)
    s.atmosphere = req.preset
    if s.analytics is not None:
        s.analytics.add_event(s.t, "ENVIRONMENT", f"Atmosphere set to {preset['label']}", "Source: Ground Station Operator")
    return jsonable(_session_view())


class InjectCard(BaseModel):
    card_id: int
    target: int | str | None = None
    severity: float | None = None
    ramp_duration_s: float | None = None


@router.post("/faults", dependencies=[Depends(require_token)])
def sim_inject(req: InjectCard, operator: Operator) -> dict:
    """Inject the fault described by one catalog card (optionally overriding target/severity/ramp)."""
    state = get_app_state()
    s = live_session(state)
    card = next((c for c in _catalog()["cards"] if c["id"] == req.card_id), None)
    if card is None:
        raise HTTPException(status_code=404, detail=f"No fault card {req.card_id}")
    if any(i.spec.fault_type == card["fault_type"] and i.cleared_t is None for i in s.injected):
        raise HTTPException(status_code=409, detail="That fault is already active")
    spec = FaultSpec(
        fault_type=card["fault_type"],
        target=req.target if req.target is not None else card.get("target"),
        onset_s=s.t,
        profile=card.get("profile", "ramp"),
        severity=req.severity if req.severity is not None else card.get("severity", 0.5),
        ramp_duration_s=req.ramp_duration_s if req.ramp_duration_s is not None else card.get("ramp_duration_s", 600.0),
        extra=card.get("extra") or {},
    )
    state.inject_fault(spec, operator or "Ground Station Operator")
    return jsonable(_session_view())


@router.delete("/faults/{fault_id}", dependencies=[Depends(require_token)])
def sim_clear(fault_id: int) -> dict:
    state = get_app_state()
    live_session(state)
    try:
        state.clear_fault(fault_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return jsonable(_session_view())


@router.post("/faults/reset", dependencies=[Depends(require_token)])
def sim_reset() -> dict:
    state = get_app_state()
    s = live_session(state)
    for inj in [i for i in s.injected if i.cleared_t is None]:
        state.clear_fault(inj.fault_id)
    return jsonable(_session_view())


@router.get("/response-log")
def sim_response_log() -> dict:
    """Twin response: residual innovation score, parameter convergence, incident timeline."""
    state = get_app_state()
    s = live_session(state)
    row = state.buffer.latest() or {}
    nominal = dict(zip(HEALTH_NAMES, nominal_health_vector(s.engine_config.nominal_health.injector_flow_coeff), strict=True))
    current = dict(zip(HEALTH_NAMES, (float(v) for v in s.twin.model.health), strict=True))
    measured = row.get("measured") or {}
    power = row.get("power_w") or 0.0
    bsfc = measured.get("fuel_flow_kg_s", 0.0) * 3.6e9 / power if power > 1000 else None
    events = [e for e in (s.analytics.events if s.analytics else []) if e["kind"] in INCIDENT_KINDS]
    return jsonable({
        "innovation": row.get("anomaly_score"),
        "detection_armed": bool(s.analytics.armed) if s.analytics else False,
        "estimator": {"name": "UKF", "updates": int(s.t / s.twin.ukf_update_interval_s), "confidence_pct": s.twin.estimator.confidence_pct},
        "parameters": [
            {"name": n, "value": current[n], "delta": (current[n] - nominal[n]) / nominal[n] if nominal[n] else 0.0}
            for n in ("cooling_effectiveness", "volumetric_efficiency_factor", "oil_pump_efficiency", "turbo_efficiency", "friction_factor")
        ],
        "bsfc_g_per_kwh": bsfc,
        "incidents": list(reversed(events))[:20],
    })


def _max_cht_with_cap(s, cap: float, horizon_s: float = 900.0) -> float:
    """Forward-simulate the twin's current state/health for `horizon_s` with a throttle cap."""
    model = EngineModel(s.engine_config, health=s.twin.model.health.copy(), state=s.twin.model.state.copy(), dt=1.0)
    model.cylinder_cooling_bias = s.twin.model.cylinder_cooling_bias
    worst = 0.0
    for k in range(int(horizon_s)):
        inp = s.mission_helper.inputs_at_time(s.t + k)
        if inp.throttle > cap:
            inp.throttle = cap
        out = model.step(inp)
        worst = max(worst, float(np.max(out.cht_k)))
    return worst


@router.get("/contingency")
async def sim_contingency() -> dict:
    """Highest cruise throttle that keeps the predicted CHT below the limit over the next 15 minutes."""
    state = get_app_state()
    s = live_session(state)
    limit = s.engine_config.limits.max_cht_k - 2.0

    def search() -> dict:
        uncapped = _max_cht_with_cap(s, 1.0)
        if uncapped < limit:
            return {"needed": False, "predicted_max_cht_k": uncapped}
        lo, hi = 0.3, 1.0
        for _ in range(7):
            mid = (lo + hi) / 2
            if _max_cht_with_cap(s, mid) < limit:
                lo = mid
            else:
                hi = mid
        return {"needed": True, "throttle_cap": lo, "predicted_max_cht_k": _max_cht_with_cap(s, lo), "uncapped_max_cht_k": uncapped,
                "limit_k": s.engine_config.limits.max_cht_k}

    return jsonable({**(await run_in_threadpool(search)), "applied_cap": s.throttle_cap})


class ApplyCap(BaseModel):
    throttle_cap: float | None


@router.post("/contingency", dependencies=[Depends(require_token)])
def sim_apply_contingency(req: ApplyCap, operator: Operator) -> dict:
    s = live_session()
    s.throttle_cap = req.throttle_cap
    if s.analytics is not None:
        text = f"Throttle limit {req.throttle_cap * 100:.0f}% applied." if req.throttle_cap else "Throttle limit removed."
        s.analytics.add_event(s.t, "CONTINGENCY", text, f"Source: {operator or 'Ground Station Operator'}")
    return jsonable(_session_view())
