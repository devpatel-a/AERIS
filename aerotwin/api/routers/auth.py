"""Operator sign-in for the ground-station login screen."""

from __future__ import annotations

from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from aerotwin.api.security import current_session
from aerotwin.api.state import get_app_state
from aerotwin.auth.service import ROLES, AuthError, AuthSession, login, logout, set_session_tail

router = APIRouter(prefix="/api/auth", tags=["auth"])

SignedIn = Annotated[AuthSession, Depends(current_session)]


class LoginRequest(BaseModel):
    """Login form: operator/DoD ID, CAC PIN, clearance role and assigned airframe."""

    operator_id: str
    pin: str
    role: str
    tail_id: str | None = None


class TailRequest(BaseModel):
    """Switch the session's assigned airframe."""

    tail_id: str


def _session_payload(session: AuthSession) -> dict:
    return {
        "operator": asdict(session.operator),
        "role": session.role,
        "role_label": ROLES[session.role]["label"],
        "tail_id": session.tail_id,
        "expires_at": session.expires_at,
    }


@router.get("/roles")
def roles() -> list[dict]:
    """Clearance roles offered on the login screen."""
    return [{"role": k, **v} for k, v in ROLES.items()]


@router.post("/login")
def do_login(req: LoginRequest) -> dict:
    """Authenticate and return a bearer token plus the session it opens."""
    state = get_app_state()
    if req.tail_id is not None:
        try:
            state.fleet_registry.get(req.tail_id)
        except KeyError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    try:
        token, session = login(state.db, req.operator_id, req.pin, req.role, req.tail_id)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    return {"token": token, **_session_payload(session)}


@router.get("/me")
def me(session: SignedIn) -> dict:
    """The signed-in operator's session."""
    return _session_payload(session)


@router.post("/tail")
def switch_tail(req: TailRequest, session: SignedIn) -> dict:
    """Assign the session to a different airframe."""
    state = get_app_state()
    try:
        state.fleet_registry.get(req.tail_id)
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    set_session_tail(state.db, session.token_id, req.tail_id)
    session.tail_id = req.tail_id
    return _session_payload(session)


@router.post("/logout")
def do_logout(session: SignedIn) -> dict:
    """Revoke the current session's token."""
    logout(get_app_state().db, session.token_id)
    return {"ok": True}
