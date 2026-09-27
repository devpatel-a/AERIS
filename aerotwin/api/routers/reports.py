"""Airworthiness & mission report endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

from aerotwin.api.deps import jsonable, operator_name
from aerotwin.api.security import require_token
from aerotwin.api.state import get_app_state
from aerotwin.reports import registry
from aerotwin.reports.stanag_pdf import render_report_pdf
from aerotwin.storage.db import DATA_DIR

router = APIRouter(prefix="/api/reports", tags=["reports"])
Operator = Annotated[str | None, Depends(operator_name)]
REPORT_DIR = DATA_DIR / "reports"


class CreateReport(BaseModel):
    report_type: str = "post_mission"
    mission_run_id: str | None = None
    tail_id: str | None = None
    compliance: str = "STANAG 4671 PDF"
    subsystems: list[str] = []
    include_shap: bool = True
    focus: str = "turbo_air"


class StatusChange(BaseModel):
    status: str


def _get(report_id: str) -> dict:
    try:
        return registry.get(get_app_state(), report_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"No report {report_id}") from exc


@router.get("")
def reports_list(report_type: str = "all") -> dict:
    state = get_app_state()
    items = registry.list_reports(state, report_type)
    counts = {k: 0 for k in registry.REPORT_TYPES}
    for r in registry.list_reports(state):
        counts[r["report_type"]] = counts.get(r["report_type"], 0) + 1
    return jsonable({"reports": items, "counts": counts, "total": sum(counts.values()), "types": registry.REPORT_TYPES})


@router.get("/options")
def reports_options(tail_id: str | None = None) -> dict:
    """Quick-setup choices: target missions for the tail (current flight first) and export formats."""
    state = get_app_state()
    rows = state.db.execute(
        "SELECT mission_run_id, sortie_label, mission_id, start_time, end_time FROM missions "
        "WHERE tail_id IS ? AND parquet_path IS NOT NULL ORDER BY start_time DESC LIMIT 12",
        (tail_id,),
    ).fetchall()
    missions = [dict(r) for r in rows]
    session = state.session
    if session is not None and session.tail_id == tail_id:
        missions.insert(0, {"mission_run_id": session.run_id, "sortie_label": session.sortie_label,
                            "mission_id": session.mission.mission_id, "current": True})
    return {"missions": missions, "compliance": list(registry.COMPLIANCE), "compliance_edition": "STANAG 4671 Ed.3"}


@router.post("", dependencies=[Depends(require_token)])
async def reports_create(req: CreateReport, operator: Operator) -> dict:
    try:
        report = await run_in_threadpool(
            registry.generate, get_app_state(), req.report_type, operator, req.mission_run_id, req.tail_id,
            req.compliance, req.subsystems, req.include_shap, req.focus,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"No stored telemetry for {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return jsonable(report)


@router.get("/{report_id}")
def reports_get(report_id: str) -> dict:
    return jsonable(_get(report_id))


@router.get("/{report_id}/pdf")
def reports_pdf(report_id: str) -> FileResponse:
    report = _get(report_id)
    out = REPORT_DIR / f"{report['content'].get('ref', report_id)}.pdf"
    render_report_pdf(report, get_app_state().station.model_dump(), out)
    return FileResponse(out, media_type="application/pdf", filename=out.name)


@router.get("/{report_id}/raw")
def reports_raw(report_id: str, fmt: str = "csv") -> Response:
    try:
        data, media, filename = registry.export_raw(get_app_state(), report_id, fmt)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"No report or telemetry {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return Response(data, media_type=media, headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.post("/{report_id}/dispatch", dependencies=[Depends(require_token)])
def reports_dispatch(report_id: str) -> dict:
    _get(report_id)
    return jsonable(registry.dispatch(get_app_state(), report_id, get_app_state().station.operator_callsign))


@router.post("/{report_id}/sign", dependencies=[Depends(require_token)])
def reports_sign(report_id: str, operator: Operator) -> dict:
    _get(report_id)
    if not operator:
        raise HTTPException(status_code=403, detail="A signed-in operator is required to sign")
    return jsonable(registry.sign(get_app_state(), report_id, operator))


@router.patch("/{report_id}/status", dependencies=[Depends(require_token)])
def reports_status(report_id: str, req: StatusChange, operator: Operator) -> dict:
    _get(report_id)
    try:
        return jsonable(registry.set_status(get_app_state(), report_id, req.status, operator))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
