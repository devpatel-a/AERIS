"""Mission Planner (GO / NO-GO) endpoints."""

from __future__ import annotations

import numpy as np
from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from aerotwin.api.deps import jsonable
from aerotwin.api.state import get_app_state
from aerotwin.fleet import records
from aerotwin.physics.state import HEALTH_NAMES, HIDX_COOLING_EFF, nominal_health_vector
from aerotwin.simulation.planner import PlanRequest, build_mission, environment_factors, evaluate

router = APIRouter(tags=["planner"])


class PlannerRequest(BaseModel):
    mission_id: str = "isr_18h_endurance"
    tail_id: str | None = None
    cruise_altitude_m: float | None = None
    duration_h: float | None = None
    surface_temp_c: float | None = None
    airspeed_ktas: float | None = None
    power_pct_mcp: float | None = None
    use_current_health: bool = True


def _health(state, tail_id: str | None, use_current: bool, engine_config) -> tuple[np.ndarray, str]:
    nominal = nominal_health_vector(engine_config.nominal_health.injector_flow_coeff)
    if not use_current:
        return nominal, "factory"
    session = state.session
    if session is not None and session.mode == "LIVE" and (tail_id is None or session.tail_id == tail_id):
        return session.twin.model.health.copy(), "live"
    tail = records.tail_for(state.fleet_registry, tail_id)
    if tail is not None:
        runs = records.tail_runs(state.db, tail, state.engine_registry)
        last = runs[-1] if runs else None
        if last and last.summary and last.summary.health_end:
            return np.array([last.summary.health_end.get(n, v) for n, v in zip(HEALTH_NAMES, nominal, strict=True)]), "last_sortie"
    return nominal, "factory"


def _plan_request(req: PlannerRequest) -> tuple[PlanRequest, str]:
    state = get_app_state()
    try:
        mission = state.mission_registry.get(req.mission_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    engine = state.engine_registry.get(mission.engine_id)
    health, source = _health(state, req.tail_id, req.use_current_health, engine)
    return PlanRequest(engine.engine_id, mission, health, req.cruise_altitude_m, req.duration_h,
                       req.surface_temp_c, req.airspeed_ktas, req.power_pct_mcp), source


@router.get("/api/planner/presets")
def planner_presets() -> list[dict]:
    """Mission profiles with their default planner parameters."""
    state = get_app_state()
    out = []
    for mid in state.mission_registry.list_missions():
        m = state.mission_registry.get(mid)
        engine = state.engine_registry.get(m.engine_id)
        env = environment_factors(m, engine)
        work = [s for s in m.segments if s.name not in ("taxi", "takeoff", "climb", "descent", "landing")] or m.segments
        cruise = max(work, key=lambda s: s.duration_s)
        mcp = engine.rating.max_continuous_power_w or engine.rating.rated_power_w
        out.append({
            "mission_id": mid, "display_name": m.display_name, "short_name": m.short_name, "profile": m.profile,
            "duration_h": m.total_duration_s / 3600.0, "cruise_altitude_m": env["cruise_altitude_m"],
            "surface_temp_c": 15.0 + env["isa_deviation_k"], "airspeed_ktas": cruise.target_airspeed_mps * 1.943844,
            "power_pct_mcp": cruise.throttle * engine.rating.rated_power_w / mcp * 100.0,
        })
    return out


@router.post("/api/planner/environment")
def planner_environment(req: PlannerRequest) -> dict:
    """Environmental factors for the current slider settings (instant, no simulation)."""
    plan, source = _plan_request(req)
    engine = get_app_state().engine_registry.get(plan.engine_id)
    return jsonable({**environment_factors(build_mission(plan, engine), engine), "health_source": source,
                     "cooling_effectiveness": float(plan.health[HIDX_COOLING_EFF])})


@router.post("/api/planner/evaluate")
async def planner_evaluate(req: PlannerRequest) -> dict:
    """Run the full twin go/no-go evaluation (parallel full-length simulations)."""
    state = get_app_state()
    if not state.mission_risk_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="A planner evaluation is already running; please wait for it to finish.")
    try:
        plan, source = _plan_request(req)
        result = await run_in_threadpool(evaluate, plan)
    finally:
        state.mission_risk_lock.release()
    return jsonable({**result, "health_source": source, "tail_id": req.tail_id})
