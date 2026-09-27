"""Mission Planner (GO / NO-GO) endpoints: presets, planning envelope, route
validation, twin evaluation and saved mission plans.

Saved plans compile to ordinary MissionConfigs registered in the app's mission
registry (`plan_NNNN`), so a plan is flown with the existing session start
(`POST /api/live/start {mission_id}`) and appears in replay/fleet history like
any preset mission.
"""

from __future__ import annotations

from typing import Annotated

import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from aerotwin.api.deps import jsonable, operator_name
from aerotwin.api.security import require_token
from aerotwin.api.state import get_app_state
from aerotwin.fleet import records
from aerotwin.fleet.service import fleet_status
from aerotwin.physics.state import HEALTH_NAMES, HIDX_COOLING_EFF, nominal_health_vector
from aerotwin.simulation import plans
from aerotwin.simulation.mission import MissionConfig
from aerotwin.simulation.planner import PlanRequest, build_mission, environment_factors, evaluate
from aerotwin.simulation.route import PlannerConfig, PlanSpec, Waypoint, compile_plan, validate_plan

router = APIRouter(tags=["planner"])
Operator = Annotated[str | None, Depends(operator_name)]
_CFG: PlannerConfig | None = None


def planner_config() -> PlannerConfig:
    global _CFG
    if _CFG is None:
        _CFG = PlannerConfig.load()
    return _CFG


class PlannerRequest(BaseModel):
    mission_id: str = "isr_18h_endurance"  # mission type: the preset template the plan is built on
    tail_id: str | None = None
    cruise_altitude_m: float | None = None
    duration_h: float | None = None
    surface_temp_c: float | None = None
    airspeed_ktas: float | None = None
    power_pct_mcp: float | None = None
    use_current_health: bool = True
    name: str = ""
    code: str = ""
    waypoints: list[Waypoint] = Field(default_factory=list)
    plan_id: str | None = None  # saved plan being edited / evaluated


def _preset_defaults(m: MissionConfig) -> dict:
    state = get_app_state()
    engine = state.engine_registry.get(m.engine_id)
    env = environment_factors(m, engine)
    work = [s for s in m.segments if s.name not in ("taxi", "takeoff", "climb", "descent", "landing")] or m.segments
    cruise = max(work, key=lambda s: s.duration_s)
    mcp = engine.rating.max_continuous_power_w or engine.rating.rated_power_w
    return {
        "duration_h": m.total_duration_s / 3600.0, "cruise_altitude_m": env["cruise_altitude_m"],
        "surface_temp_c": 15.0 + env["isa_deviation_k"], "airspeed_ktas": cruise.target_airspeed_mps * 1.943844,
        "power_pct_mcp": cruise.throttle * engine.rating.rated_power_w / mcp * 100.0,
    }


def _template(mission_id: str) -> MissionConfig:
    try:
        m = get_app_state().mission_registry.get(mission_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if m.origin != "preset":
        raise HTTPException(status_code=400, detail=f"'{mission_id}' is a saved plan, not a mission type")
    return m


def _spec(req: PlannerRequest) -> PlanSpec:
    """The planner form with any unset parameter filled from the mission type's preset."""
    d = _preset_defaults(_template(req.mission_id))
    pick = lambda k: getattr(req, k) if getattr(req, k) is not None else d[k]  # noqa: E731
    return PlanSpec(
        name=req.name.strip(), code=req.code.strip().upper(), tail_id=req.tail_id, template_id=req.mission_id,
        cruise_altitude_m=pick("cruise_altitude_m"), duration_h=pick("duration_h"), surface_temp_c=pick("surface_temp_c"),
        airspeed_ktas=pick("airspeed_ktas"), power_pct_mcp=pick("power_pct_mcp"),
        use_current_health=req.use_current_health, waypoints=req.waypoints,
    )


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
    template = _template(req.mission_id)
    engine = state.engine_registry.get(template.engine_id)
    health, source = _health(state, req.tail_id, req.use_current_health, engine)
    if req.waypoints:
        # A routed plan: legs carry their own altitude/airspeed; the planner's power and
        # surface temperature stay overrides so the mitigation re-runs can vary them.
        spec = _spec(req)
        mission = compile_plan(spec, template, engine, planner_config(), state.station.datalink)
        return PlanRequest(engine.engine_id, mission, health, None, None, spec.surface_temp_c, None, spec.power_pct_mcp), source
    return PlanRequest(engine.engine_id, template, health, req.cruise_altitude_m, req.duration_h,
                       req.surface_temp_c, req.airspeed_ktas, req.power_pct_mcp), source


def _validation(req: PlannerRequest) -> dict:
    state = get_app_state()
    spec = _spec(req)
    template = _template(req.mission_id)
    engine = state.engine_registry.get(template.engine_id)
    out = validate_plan(spec, template, engine, planner_config(), state.station.datalink,
                        {t.tail_id for t in state.fleet_registry.all()},
                        code_taken=bool(spec.code) and plans.code_taken(state.db, spec.code, req.plan_id))
    # Airframe readiness from the fleet status (health, RUL, open maintenance).
    row = next((r for r in fleet_status(state) if r.tail_id == spec.tail_id), None)
    if row is not None and out["metrics"] is not None:
        hours = (out["metrics"].get("total_s") or spec.duration_h * 3600.0) / 3600.0
        if row.status == "MAINTENANCE REQ":
            out["issues"].append({"level": "warning", "field": "tail_id", "waypoint": None,
                                  "text": f"{row.tail_id} status is MAINTENANCE REQ — clear open maintenance before dispatch."})
        if row.rul_p05_hours is not None and row.rul_p05_hours < hours:
            out["issues"].append({"level": "warning", "field": "tail_id", "waypoint": None,
                                  "text": f"{row.tail_id} pessimistic RUL ({row.rul_p05_hours:.0f} h) is shorter than this {hours:.1f} h mission."})
        out["metrics"]["airframe"] = {"tail_id": row.tail_id, "status": row.status, "health_index": row.health_index,
                                      "rul_hours": row.rul_hours, "total_hours": row.total_hours}
    out["spec"] = spec.model_dump()
    return out


@router.get("/api/planner/presets")
def planner_presets() -> list[dict]:
    """Mission types (the YAML presets) with their default planner parameters."""
    state = get_app_state()
    out = []
    for mid in state.mission_registry.list_missions():
        m = state.mission_registry.get(mid)
        if m.origin != "preset":
            continue
        out.append({"mission_id": mid, "display_name": m.display_name, "short_name": m.short_name, "profile": m.profile,
                    "sortie_prefix": m.sortie_prefix, **_preset_defaults(m)})
    return out


@router.get("/api/planner/config")
def planner_envelope() -> dict:
    """Planning envelope (airframe/engine limits) that bounds the planner inputs and validation."""
    state = get_app_state()
    engine = state.engine_registry.get("rotax914_like")
    return jsonable({**planner_config().model_dump(), "turbo_critical_altitude_m": engine.turbo.critical_altitude_m,
                     "datalink": state.station.datalink.model_dump(), "gcs": state.station.station_id})


@router.post("/api/planner/environment")
def planner_environment(req: PlannerRequest) -> dict:
    """Environmental factors for the current slider settings (instant, no simulation)."""
    plan, source = _plan_request(req)
    engine = get_app_state().engine_registry.get(plan.engine_id)
    return jsonable({**environment_factors(build_mission(plan, engine), engine), "health_source": source,
                     "cooling_effectiveness": float(plan.health[HIDX_COOLING_EFF])})


@router.post("/api/planner/validate")
def planner_validate(req: PlannerRequest) -> dict:
    """Validate the planner form (instant): issues, route metrics and the compiled segment timeline."""
    return jsonable(_validation(req))


@router.post("/api/planner/evaluate")
async def planner_evaluate(req: PlannerRequest) -> dict:
    """Run the full twin go/no-go evaluation (parallel full-length simulations)."""
    state = get_app_state()
    if req.waypoints:
        v = _validation(req)
        errors = [i for i in v["issues"] if i["level"] == "error" and i["field"] not in ("name", "code")]
        if errors:
            raise HTTPException(status_code=422, detail={"message": "Fix the plan before simulating.", "issues": errors})
    if not state.mission_risk_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="A planner evaluation is already running; please wait for it to finish.")
    try:
        plan, source = _plan_request(req)
        result = await run_in_threadpool(evaluate, plan)
    finally:
        state.mission_risk_lock.release()
    if req.plan_id:
        try:
            plans.record_verdict(state.db, req.plan_id, result["verdict"], result["confidence"])
        except KeyError:
            pass
    return jsonable({**result, "health_source": source, "tail_id": req.tail_id})


# ------------------------------------------------------------------ saved plans
def _save(req: PlannerRequest, plan_id: str | None, operator: str | None) -> dict:
    state = get_app_state()
    v = _validation(req)
    if not v["valid"]:
        raise HTTPException(status_code=422, detail={"message": "The mission plan has validation errors.",
                                                     "issues": [i for i in v["issues"] if i["level"] == "error"]})
    spec = PlanSpec.model_validate(v["spec"])
    template = _template(req.mission_id)
    engine = state.engine_registry.get(template.engine_id)
    mission = compile_plan(spec, template, engine, planner_config(), state.station.datalink, mission_id="plan_pending")
    return plans.save_plan(state.db, state.mission_registry, spec, mission, plan_id, operator)


@router.get("/api/planner/plans")
def plans_list(tail_id: str | None = None) -> dict:
    return jsonable({"plans": plans.list_plans(get_app_state().db, tail_id)})


@router.get("/api/planner/plans/{plan_id}")
def plans_get(plan_id: str) -> dict:
    try:
        return jsonable(plans.get_plan(get_app_state().db, plan_id))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"No mission plan {plan_id}") from exc


@router.post("/api/planner/plans", dependencies=[Depends(require_token)])
def plans_create(req: PlannerRequest, operator: Operator) -> dict:
    """Save a new mission plan (validated; registered as mission `plan_NNNN`)."""
    return jsonable(_save(req, None, operator))


@router.put("/api/planner/plans/{plan_id}", dependencies=[Depends(require_token)])
def plans_update(plan_id: str, req: PlannerRequest, operator: Operator) -> dict:
    state = get_app_state()
    plan = plans_get(plan_id)
    s = state.session
    if s is not None and s.running and s.mission.mission_id == plan["mission_id"]:
        raise HTTPException(status_code=409, detail=f"{plan_id} is being flown in the active session; stop it before editing.")
    return jsonable(_save(req, plan_id, operator))


@router.delete("/api/planner/plans/{plan_id}", dependencies=[Depends(require_token)])
def plans_delete(plan_id: str) -> dict:
    state = get_app_state()
    try:
        plans.delete_plan(state.db, state.mission_registry, plan_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"No mission plan {plan_id}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {"deleted": plan_id}
