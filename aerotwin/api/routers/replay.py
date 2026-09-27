"""Mission Replay endpoints (sortie archive, traces, twin state, events, root cause)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from pydantic import BaseModel

from aerotwin.api.deps import jsonable
from aerotwin.api.state import get_app_state
from aerotwin.fleet.records import load_mission_df
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


@router.get("/export.h5")
def replay_batch_export(tail_id: str) -> Response:
    """All of a tail's stored sorties in one HDF5 file (one group per sortie), with its
    CRC-32 in the `X-CRC32` header so the operator can validate the transfer.
    """
    import io
    import zlib

    import h5py
    import numpy as np

    state = get_app_state()
    rows = state.db.execute(
        "SELECT mission_run_id, sortie_label, mission_id, start_time FROM missions "
        "WHERE tail_id = ? AND parquet_path IS NOT NULL AND end_time IS NOT NULL ORDER BY start_time",
        (tail_id,),
    ).fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail=f"No stored sorties for {tail_id}")
    buf = io.BytesIO()
    with h5py.File(buf, "w") as h5:
        h5.attrs["tail_id"] = tail_id
        for r in rows:
            df = load_mission_df(r["mission_run_id"])
            if df is None:
                continue
            g = h5.create_group(r["sortie_label"] or r["mission_run_id"])
            g.attrs.update({"mission_run_id": r["mission_run_id"], "mission_id": r["mission_id"], "start_time": r["start_time"]})
            for col in df.select_dtypes(include=["number", "bool"]).columns:
                g.create_dataset(col, data=df[col].to_numpy(dtype=float), compression="gzip")
            if "segment" in df.columns:
                g.create_dataset("segment", data=np.array([str(s) for s in df["segment"]], dtype="S"))
    data = buf.getvalue()
    crc = f"{zlib.crc32(data) & 0xFFFFFFFF:08X}"
    return Response(
        data, media_type="application/x-hdf5",
        headers={"Content-Disposition": f"attachment; filename={tail_id}_sorties.h5", "X-CRC32": crc, "Access-Control-Expose-Headers": "X-CRC32"},
    )
