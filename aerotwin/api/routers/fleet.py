"""Trends & Fleet endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from aerotwin.api.deps import jsonable
from aerotwin.api.state import get_app_state
from aerotwin.fleet.service import fleet_status, tail_trends, trends_csv

router = APIRouter(tags=["fleet"])


@router.get("/api/fleet")
def fleet() -> dict:
    """Squadron status table."""
    state = get_app_state()
    rows = fleet_status(state)
    return jsonable({"units_online": len(rows), "rul_model": state.prognostics_config.model, "rows": [r.__dict__ for r in rows]})


@router.get("/api/fleet/{tail_id}/trends")
def fleet_trends(tail_id: str, range: str = "last20", profile: str = "all") -> dict:  # noqa: A002
    """Degradation KPIs and subsystem x sortie matrix for a tail (or 'fleet')."""
    try:
        return jsonable(tail_trends(get_app_state(), tail_id, range, profile))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/api/fleet/{tail_id}/trends.csv")
def fleet_trends_csv(tail_id: str, range: str = "last20", profile: str = "all") -> Response:  # noqa: A002
    try:
        csv_text = trends_csv(tail_trends(get_app_state(), tail_id, range, profile))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(csv_text, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={tail_id}_trends.csv"})
