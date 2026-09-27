"""Mission Replay endpoints (sortie archive, traces, twin state, events, root cause)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from aerotwin.api.deps import jsonable
from aerotwin.api.state import get_app_state
from aerotwin.replay import service

router = APIRouter(prefix="/api/replay", tags=["replay"])


@router.get("/sorties")
def replay_sorties(tail_id: str | None = None, q: str = "", category: str = "all") -> dict:
    state = get_app_state()
    items = service.sorties(state, tail_id, q, category)
    return jsonable({"tail_id": tail_id, "count": len(items), "sorties": items})


def _wrap(fn, *args):
    try:
        return jsonable(fn(get_app_state(), *args))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"No stored telemetry for {exc}") from exc


@router.get("/{run_id}/traces")
def replay_traces(run_id: str, max_points: int = 600) -> dict:
    return _wrap(service.traces, run_id, max_points)


@router.get("/{run_id}/twin-state")
def replay_twin_state(run_id: str, t: float) -> dict:
    return _wrap(service.twin_state, run_id, t)


@router.get("/{run_id}/extremes")
def replay_extremes(run_id: str) -> dict:
    return _wrap(service.extremes, run_id)


@router.get("/{run_id}/events")
def replay_events(run_id: str) -> list[dict]:
    return _wrap(service.events, run_id)


class RootCauseRequest(BaseModel):
    t_s: float | None = None


@router.post("/{run_id}/root-cause")
async def replay_root_cause(run_id: str, req: RootCauseRequest) -> dict:
    """AI root-cause analysis of the stored residual window at `t_s` (default: first detection)."""
    try:
        return jsonable(await run_in_threadpool(service.root_cause, get_app_state(), run_id, req.t_s))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"No stored telemetry for {exc}") from exc
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
