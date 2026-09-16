"""AeroTwin FastAPI backend: engines/missions, LIVE/SIMULATION sessions,
fault injection, replay control, health/RUL/advisories, mission risk, and
a WebSocket live feed.
"""

from __future__ import annotations

import asyncio
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from aerotwin.acquisition.datasource import ParquetReplayDataSource
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
from aerotwin.faults.specs import FaultSpec
from aerotwin.physics.state import HEALTH_NAMES
from aerotwin.reports.pdf import generate_mission_report
from aerotwin.simulation.risk import run_mission_go_no_go
from aerotwin.storage.db import list_alerts, list_maintenance_records
from aerotwin.storage.parquet_store import DEFAULT_MISSION_LOG_DIR, list_mission_logs

app = FastAPI(title="AeroTwin API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    }


@app.post("/api/live/start", dependencies=[Depends(require_token)])
async def start_live(req: StartLiveRequest) -> dict:
    """Start a LIVE-mode demo session (simulated telemetry standing in for CAN)."""
    state = get_app_state()
    session = state.start_session("LIVE", req.engine_id, req.mission_id, req.speed)
    session.task = asyncio.create_task(run_session_loop(session, state.buffer))
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
    session = state.start_session("SIMULATION", req.engine_id, req.mission_id, req.speed)
    session.task = asyncio.create_task(run_session_loop(session, state.buffer))
    return {"run_id": session.run_id, "mode": session.mode}


@app.post("/api/faults/inject", dependencies=[Depends(require_token)])
def inject_fault(req: InjectFaultRequest) -> dict:
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
    state.inject_fault(spec)
    return {"injected": req.fault_type, "onset_s": state.session.t}


@app.get("/api/health/latest")
def health_latest() -> dict:
    """Return the most recent buffered telemetry/health row."""
    row = get_app_state().buffer.latest()
    if row is None:
        raise HTTPException(status_code=404, detail="No active session data yet")
    return _jsonable(row)


@app.get("/api/health/history")
def health_history(seconds: float = 300.0) -> list[dict]:
    """Return buffered rows from the last `seconds` of the active session."""
    return [_jsonable(r) for r in get_app_state().buffer.window(seconds)]


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


@app.get("/api/reports/{mission_run_id}")
def download_report(mission_run_id: str) -> FileResponse:
    """Generate (if needed) and return the PDF post-flight report for a stored mission run."""
    log_path = DEFAULT_MISSION_LOG_DIR / f"{mission_run_id}.parquet"
    if not log_path.exists():
        raise HTTPException(status_code=404, detail=f"No stored mission log '{mission_run_id}'")
    engine_config = get_app_state().engine_registry.get("rotax914_like")
    out_path = Path("data") / "reports" / f"{mission_run_id}.pdf"
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
def replay_list() -> list[str]:
    """List stored mission run ids available for replay."""
    return list_mission_logs()


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
                    await websocket.send_json(_jsonable(row))
            else:
                row = state.buffer.latest()
                if row is not None:
                    await websocket.send_json(_jsonable(row))
            await asyncio.sleep(1.0 / 7.0)
    except WebSocketDisconnect:
        pass


def _jsonable(row: dict) -> dict:
    """Coerce numpy/pandas scalars in a row dict to plain JSON-serializable types."""
    import numpy as np

    out = {}
    for k, v in row.items():
        if isinstance(v, np.generic):
            out[k] = v.item()
        elif isinstance(v, dict):
            out[k] = _jsonable(v)
        else:
            out[k] = v
    return out


__all__ = ["app", "Session"]
