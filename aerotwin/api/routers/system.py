"""Ground-station status (login screen banner/footer, shell) and the fleet airframe roster."""

from __future__ import annotations

import time

from fastapi import APIRouter

from aerotwin.acquisition.link import link_margin_db
from aerotwin.api.state import get_app_state

router = APIRouter(tags=["system"])


@router.get("/api/system/status")
def system_status() -> dict:
    """Station identity + live datalink/bus status. Public: the login screen shows it pre-auth."""
    state = get_app_state()
    station = state.station
    session = state.session
    latest = state.buffer.latest()
    ctx = (latest or {}).get("context") or {}
    altitude_m = ctx.get("altitude_m", 0.0)
    return {
        "station": station.model_dump(exclude={"datalink"}),
        "server_time": time.time(),
        "bus": {"ready": state.bus_interface is not None, "name": station.avionics_bus, "interface": state.bus_interface},
        "session": {
            "state": "ACTIVE" if session is not None and session.running else "IDLE",
            "mode": session.mode if session is not None else None,
            "tail_id": session.tail_id if session is not None else None,
            "run_id": session.run_id if session is not None else None,
        },
        "link": {
            # Twin sampling rate: the physics/twin step (dt) the telemetry stream runs at.
            "rate_hz": 1.0 / session.twin.dt if session is not None else 1.0 / 0.05,
            "margin_db": link_margin_db(station.datalink, altitude_m),
        },
    }


@router.get("/api/fleet/tails")
def fleet_tails() -> list[dict]:
    """Every airframe in the fleet roster with its engine identity (login airframe selector)."""
    state = get_app_state()
    out = []
    for tail in state.fleet_registry.all():
        engine = state.engine_registry.get(tail.engine_id)
        out.append({
            **tail.model_dump(),
            "engine_class": engine.short_name or engine.display_name,
            "engine_display_name": engine.display_name,
            "engine_monitor_label": engine.monitor_label or engine.display_name,
        })
    return out
