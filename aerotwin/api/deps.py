"""Shared helpers for API routers: JSON coercion and optional operator identity."""

from __future__ import annotations

import math
from typing import Any

import numpy as np
from fastapi import Header, HTTPException

from aerotwin.api.state import AppState, Session, get_app_state
from aerotwin.auth.service import AuthError, resolve_token


def jsonable(v: Any) -> Any:
    """Recursively coerce numpy scalars/arrays and non-finite floats to JSON-safe values."""
    if isinstance(v, dict):
        return {k: jsonable(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [jsonable(x) for x in v]
    if isinstance(v, np.ndarray):
        return [jsonable(x) for x in v.tolist()]
    if isinstance(v, np.generic):
        v = v.item()
    if isinstance(v, float) and not math.isfinite(v):
        return None
    return v


def operator_name(authorization: str | None = Header(default=None)) -> str | None:
    """Display name of the signed-in operator, or None (service token / anonymous)."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return resolve_token(get_app_state().db, authorization[7:]).operator.display_name
    except AuthError:
        return None


def live_session(state: AppState | None = None) -> Session:
    """The active LIVE session, or 404."""
    state = state or get_app_state()
    if state.session is None or state.session.mode != "LIVE":
        raise HTTPException(status_code=404, detail="No live session running")
    return state.session
