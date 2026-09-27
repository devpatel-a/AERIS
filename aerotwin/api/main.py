"""AeroTwin FastAPI backend: engines/missions, LIVE/SIMULATION sessions,
fault injection, replay control, health/RUL/advisories, mission risk, and
a WebSocket live feed.
"""

from __future__ import annotations

import asyncio
from dataclasses import asdict
from pathlib import Path
from typing import Annotated

import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response

from aerotwin.acquisition.datasource import ParquetReplayDataSource
from aerotwin.api.deps import jsonable, operator_name
from aerotwin.api.routers import auth as auth_router
from aerotwin.api.routers import fleet as fleet_router
from aerotwin.api.routers import planner as planner_router
from aerotwin.api.routers import replay as replay_router
from aerotwin.api.routers import reports as reports_router
from aerotwin.api.routers import simcontrol as simcontrol_router
from aerotwin.api.routers import system as system_router
from aerotwin.api.routers import twin as twin_router
from aerotwin.api.schemas import (
    InjectFaultRequest,
    MissionRiskRequest,
    ReplayControlRequest,
    ReplayStartRequest,
    StartLiveRequest,
    StartSimulationRequest,
)
from aerotwin.api.security import require_token
from aerotwin.api.state import ReplaySession, Session, get_app_state, run_session_loop
from aerotwin.faults.specs import ENGINE_FAULT_TYPES, SENSOR_FAULT_TYPES, FaultSpec
from aerotwin.fleet.records import get_summary
from aerotwin.physics.state import HEALTH_NAMES
from aerotwin.reports.pdf import generate_mission_report
from aerotwin.reports.summary import compute_post_flight_summary
from aerotwin.simulation.risk import run_mission_go_no_go
from aerotwin.storage.db import DATA_DIR, get_mission, list_alerts, list_maintenance_records
from aerotwin.storage.parquet_store import DEFAULT_MISSION_LOG_DIR, list_mission_logs

app = FastAPI(title="AeroTwin API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
for _router in (auth_router, system_router, fleet_router, twin_router, planner_router, replay_router, reports_router, simcontrol_router):
    app.include_router(_router.router)


@app.get("/api/engines")
def list_engines() -> list[str]:
    """List available engine ids."""
    return get_app_state().engine_registry.list_engines()


@app.get("/api/missions")
def list_missions() -> list[str]:
    """List available mission ids."""
    return get_app_state().mission_registry.list_missions()


@app.get("/api/engine_config/{engine_id}")
def engine_config(engine_id: str) -> dict:
    """Return an engine's limits/rating (used by the dashboard for gauge scaling)."""
    try:
        cfg = get_app_state().engine_registry.get(engine_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {
        "engine_id": cfg.engine_id,
        "display_name": cfg.display_name,
        "limits": cfg.limits.model_dump(),
        "rating": cfg.rating.model_dump(),
        "cylinders": cfg.geometry.cylinders,
        "short_name": cfg.short_name,
        "monitor_label": cfg.monitor_label,
        "geometry": cfg.geometry.model_dump(),
        "turbo": cfg.turbo.model_dump(),
        "fuel": {"density_kg_per_l": cfg.fuel.density_kg_per_l, "max_flow_l_per_h": cfg.fuel.max_flow_l_per_h},
        "operating_ranges": cfg.operating_ranges,
        "vibration": {"sensor_label": cfg.vibration.sensor_label, "envelope_factor": cfg.vibration.envelope_factor},
        "electrical": cfg.electrical.model_dump(),
    }


@app.get("/api/mission_config/{mission_id}")
def mission_config(mission_id: str) -> dict:
    """Return a mission's full segment profile (used for Mission Planner's flight-envelope
    chart and to bound its altitude/ISA-deviation sliders).
    """
    try:
        mission = get_app_state().mission_registry.get(mission_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return mission.model_dump()


@app.post("/api/live/start", dependencies=[Depends(require_token)])
async def start_live(req: StartLiveRequest) -> dict:
    """Start a LIVE-mode demo session (simulated telemetry standing in for CAN)."""
    state = get_app_state()
    session = state.start_session(
        "LIVE", req.engine_id, req.mission_id, req.speed, tail_id=req.tail_id, atmosphere=req.atmosphere
    )
    session.task = asyncio.create_task(run_session_loop(session, state))
    return {"run_id": session.run_id, "mode": session.mode}


@app.post("/api/live/stop", dependencies=[Depends(require_token)])
async def stop_live() -> dict:
    """Stop the active session and persist its log."""
    path = get_app_state().stop_session()
    return {"saved_path": path}


@app.post("/api/simulate/start", dependencies=[Depends(require_token)])
async def start_simulation(req: StartSimulationRequest) -> dict:
    """Start a SIMULATION-mode run, seeded from the current LIVE twin's health if requested."""
    state = get_app_state()
    session = state.start_session("SIMULATION", req.engine_id, req.mission_id, req.speed, tail_id=req.tail_id)
    session.task = asyncio.create_task(run_session_loop(session, state))
    return {"run_id": session.run_id, "mode": session.mode}


@app.post("/api/faults/inject", dependencies=[Depends(require_token)])
def inject_fault(req: InjectFaultRequest, operator: Annotated[str | None, Depends(operator_name)]) -> dict:
    """Inject a fault into the active session's hidden plant (demo purposes)."""
    state = get_app_state()
    if state.session is None:
        raise HTTPException(status_code=400, detail="No active session")
    spec = FaultSpec(
        fault_type=req.fault_type,
        target=req.target,
        onset_s=state.session.t,
        profile=req.profile,
        severity=req.severity,
        ramp_duration_s=req.ramp_duration_s,
    )
    injected = state.inject_fault(spec, operator)
    return {"injected": req.fault_type, "onset_s": state.session.t, "fault_id": injected.fault_id}


@app.get("/api/health/latest")
def health_latest() -> dict:
    """Return the most recent buffered telemetry/health row."""
    row = get_app_state().buffer.latest()
    if row is None:
        raise HTTPException(status_code=404, detail="No active session data yet")
    return jsonable(row)


@app.get("/api/health/history")
def health_history(seconds: float = 300.0) -> list[dict]:
    """Return buffered rows from the last `seconds` of the active session."""
    return [jsonable(r) for r in get_app_state().buffer.window(seconds)]


@app.get("/api/health/history.csv")
def health_history_csv(seconds: float = 300.0) -> Response:
    """CSV export of the active session's buffered telemetry — Twin Comparison's
    "Export CSV Telemetry" button. Nested fields (measured/expected/residuals/...)
    are flattened to `<field>_<channel>` columns.
    """
    rows = [_flatten_row(jsonable(r)) for r in get_app_state().buffer.window(seconds)]
    if not rows:
        raise HTTPException(status_code=404, detail="No active session data yet")
    csv_text = pd.DataFrame(rows).to_csv(index=False)
    return Response(
        content=csv_text, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=telemetry.csv"}
    )


@app.get("/api/fault_types")
def fault_types() -> dict:
    """Injectable fault types for Simulation & Fault Injection Control: 9 engine
    faults (target = cylinder index) and 4 sensor faults (target = channel name).
    The trained fault classifier collapses the 4 sensor types into one
    'sensor_fault' class — the UI surfaces them as a single card with a sub-select.
    """
    return {"engine": list(ENGINE_FAULT_TYPES), "sensor": list(SENSOR_FAULT_TYPES)}


@app.get("/api/diagnosis/latest")
def diagnosis_latest() -> dict:
    """Return the active session's latest AI fault diagnosis (fault, confidence, SHAP
    explanation, severity, recommended action, RUL) — refreshed every ~15s of sim time.
    404 until the classifier has had one full residual-feature window to run on.
    """
    state = get_app_state()
    if state.session is None or state.session.last_diagnosis is None:
        raise HTTPException(status_code=404, detail="No diagnosis available yet")
    return asdict(state.session.last_diagnosis)


@app.get("/api/advisories")
def advisories(mission_run_id: str | None = None) -> list[dict]:
    """Return recent alerts (optionally scoped to one mission run)."""
    rows = list_alerts(get_app_state().db, mission_run_id)
    return [dict(r) for r in rows]


@app.get("/api/maintenance")
def maintenance(engine_id: str | None = None) -> list[dict]:
    """Return maintenance advisory records."""
    rows = list_maintenance_records(get_app_state().db, engine_id)
    return [dict(r) for r in rows]


@app.get("/api/degradation_state")
def degradation_state() -> dict:
    """Return the active session's current health-parameter vector, by name."""
    state = get_app_state()
    if state.session is None:
        raise HTTPException(status_code=404, detail="No active session")
    return dict(zip(HEALTH_NAMES, (float(v) for v in state.session.twin.model.health), strict=True))


@app.post("/api/mission_risk/check")
def mission_risk_check(req: MissionRiskRequest) -> dict:
    """Run a mission go/no-go Monte Carlo check.

    This is CPU-bound pure-Python physics work that holds the GIL for the
    whole computation, so only one such check may run at a time (see
    `AppState.mission_risk_lock`) — a second concurrent request fails fast
    with 409 rather than silently slowing both to a crawl.
    """
    state = get_app_state()
    if not state.mission_risk_lock.acquire(blocking=False):
        raise HTTPException(
            status_code=409, detail="A mission risk check is already running; please wait for it to finish."
        )
    try:
        engine_config = state.engine_registry.get(req.engine_id)
        mission = state.mission_registry.get(req.mission_id)
        if req.cruise_altitude_m is not None or req.isa_deviation_k is not None:
            mission = mission.with_overrides(
                cruise_altitude_m=req.cruise_altitude_m, isa_deviation_k=req.isa_deviation_k
            )

        if req.use_current_health and state.session is not None:
            current_health = state.session.twin.model.health.copy()
        else:
            from aerotwin.physics.state import nominal_health_vector

            current_health = nominal_health_vector(engine_config.nominal_health.injector_flow_coeff)

        result = run_mission_go_no_go(
            engine_config, mission, current_health,
            n_monte_carlo=req.n_monte_carlo, max_duration_s=req.max_duration_s,
        )
    finally:
        state.mission_risk_lock.release()
    return {
        "verdict": result.verdict,
        "reasons": result.reasons,
        "n_monte_carlo": result.n_monte_carlo,
        "margins": [
            {
                "channel": m.channel, "label": m.label, "limit": m.limit, "kind": m.kind,
                "worst_case_value": m.worst_case_value, "mean_value": m.mean_value,
                "probability_exceeded": m.probability_exceeded,
            }
            for m in result.margins
        ],
    }


@app.get("/api/reports/{mission_run_id}/summary")
def report_summary(mission_run_id: str) -> dict:
    """JSON version of the post-flight report (peaks, time-above-limit, health delta,
    faults observed) — powers the Reports screen's in-app A4 preview pane and the
    Replay screen's mission-summary panel, both without generating a PDF.
    """
    log_path = DEFAULT_MISSION_LOG_DIR / f"{mission_run_id}.parquet"
    if not log_path.exists():
        raise HTTPException(status_code=404, detail=f"No stored mission log '{mission_run_id}'")
    state = get_app_state()
    meta = get_mission(state.db, mission_run_id)
    engine_id = meta["engine_id"] if meta else "rotax914_like"
    engine_config = state.engine_registry.get(engine_id)
    result = asdict(compute_post_flight_summary(pd.read_parquet(log_path), engine_config))
    result["mission_run_id"] = mission_run_id
    result["engine_id"] = engine_id
    result["mission_id"] = meta["mission_id"] if meta else None
    result["start_time"] = meta["start_time"] if meta else None
    result["end_time"] = meta["end_time"] if meta else None
    return result


@app.get("/api/reports/{mission_run_id}")
def download_report(mission_run_id: str) -> FileResponse:
    """Generate (if needed) and return the PDF post-flight report for a stored mission run."""
    log_path = DEFAULT_MISSION_LOG_DIR / f"{mission_run_id}.parquet"
    if not log_path.exists():
        raise HTTPException(status_code=404, detail=f"No stored mission log '{mission_run_id}'")
    engine_config = get_app_state().engine_registry.get("rotax914_like")
    out_path = DATA_DIR / "reports" / f"{mission_run_id}.pdf"
    generate_mission_report(log_path, engine_config, out_path, mission_run_id)
    return FileResponse(out_path, media_type="application/pdf", filename=out_path.name)


@app.get("/api/ml_summary")
def ml_summary() -> dict:
    """Return the latest offline training results (from `scripts/train_all.py`), if available."""
    import json

    path = Path("models") / "train_results.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="No trained model results found. Run `make train` first.")
    return json.loads(path.read_text())


@app.get("/api/replay/list")
def replay_list() -> list[dict]:
    """List stored mission runs with metadata + computed summary (duration, health
    delta, faults observed) — used by the Replay screen's mission list and the
    Reports screen's table alike, so neither needs a bare filename list plus N follow-up calls.
    """
    state = get_app_state()
    rows = []
    for run_id in list_mission_logs():
        meta = get_mission(state.db, run_id)
        engine_id = meta["engine_id"] if meta else "rotax914_like"
        summary = None
        try:
            cached = get_summary(state.db, run_id, state.engine_registry.get(engine_id))
            summary = asdict(cached) if cached else None
        except Exception:
            pass  # malformed/legacy log — still list it, just without a summary
        rows.append(
            {
                "mission_run_id": run_id,
                "engine_id": engine_id if meta else None,
                "mission_id": meta["mission_id"] if meta else None,
                "start_time": meta["start_time"] if meta else None,
                "end_time": meta["end_time"] if meta else None,
                "summary": summary,
            }
        )
    return rows


@app.post("/api/replay/start", dependencies=[Depends(require_token)])
def replay_start(req: ReplayStartRequest) -> dict:
    """Start replaying a stored mission run."""
    state = get_app_state()
    path = DEFAULT_MISSION_LOG_DIR / f"{req.mission_run_id}.parquet"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"No stored mission log '{req.mission_run_id}'")
    state.replay = ReplaySession(source=ParquetReplayDataSource(path), speed=req.speed)
    return {"mission_run_id": req.mission_run_id, "total_rows": state.replay.source.total_rows}


@app.post("/api/replay/control", dependencies=[Depends(require_token)])
def replay_control(req: ReplayControlRequest) -> dict:
    """Play/pause/seek/change speed on the active replay session."""
    state = get_app_state()
    if state.replay is None:
        raise HTTPException(status_code=400, detail="No active replay session")
    if req.action == "play":
        state.replay.playing = True
    elif req.action == "pause":
        state.replay.playing = False
    elif req.action == "seek" and req.seek_t_s is not None:
        state.replay.source.seek(req.seek_t_s)
    elif req.action == "speed" and req.speed is not None:
        state.replay.speed = req.speed
    else:
        raise HTTPException(status_code=400, detail=f"Invalid replay action '{req.action}'")
    return {"playing": state.replay.playing, "index": state.replay.source.index}


@app.websocket("/ws/live")
async def ws_live(websocket: WebSocket) -> None:
    """Stream the active session's (or replay's) latest telemetry at ~7Hz."""
    await websocket.accept()
    state = get_app_state()
    try:
        while True:
            if state.replay is not None and state.replay.playing:
                row = state.replay.source.read()
                if row is not None:
                    await websocket.send_json(jsonable(row))
            else:
                row = state.buffer.latest()
                if row is not None:
                    await websocket.send_json(jsonable(row))
            await asyncio.sleep(1.0 / 7.0)
    except WebSocketDisconnect:
        pass


def _jsonable(row: dict) -> dict:
    """Coerce numpy/pandas scalars in a row dict to plain JSON-serializable types."""
    return {k: _jsonable_value(v) for k, v in row.items()}


def _flatten_row(row: dict, prefix: str = "") -> dict:
    """Flatten a nested telemetry row (measured/expected/residuals/... sub-dicts) into
    `<field>_<channel>` columns for a tabular CSV export. List-valued fields (e.g.
    expected_ci bounds, vibration_spectrum) are kept as their string repr rather than
    exploded into more columns.
    """
    flat: dict = {}
    for k, v in row.items():
        key = f"{prefix}{k}"
        if isinstance(v, dict):
            flat.update(_flatten_row(v, prefix=f"{key}_"))
        elif isinstance(v, list):
            flat[key] = str(v)
        else:
            flat[key] = v
    return flat


def _jsonable_value(v: object) -> object:
    """Recursive helper for `_jsonable`: coerces numpy scalars found in nested dicts/lists too."""
    if isinstance(v, np.generic):
        return v.item()
    if isinstance(v, dict):
        return _jsonable(v)
    if isinstance(v, (list, tuple)):
        return [_jsonable_value(item) for item in v]
    return v


__all__ = ["app", "Session"]
