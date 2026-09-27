"""Token auth for the dashboard API + HMAC signing for edge->ground telemetry packets."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import time

from fastapi import Header, HTTPException, status

from aerotwin.auth.service import AuthError, AuthSession, resolve_token

API_TOKEN = os.environ.get("AEROTWIN_TOKEN", "devtoken")
EDGE_HMAC_SECRET = os.environ.get("AEROTWIN_EDGE_SECRET", "aerotwin-edge-secret-devonly").encode()


def _bearer(authorization: str | None) -> str | None:
    if authorization and authorization.startswith("Bearer "):
        return authorization[len("Bearer ") :]
    return None


def current_session(authorization: str | None = Header(default=None)) -> AuthSession:
    """FastAPI dependency: the signed-in operator's session (401 if absent/invalid/expired)."""
    from aerotwin.api.state import get_app_state

    token = _bearer(authorization)
    if token is None or token == API_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Operator sign-in required")
    try:
        return resolve_token(get_app_state().db, token)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


def require_token(authorization: str | None = Header(default=None)) -> None:
    """FastAPI dependency for write endpoints: accept a signed-in operator's session
    token, or the static service token (AEROTWIN_TOKEN) used by scripts and tests.
    """
    token = _bearer(authorization)
    if token is not None and hmac.compare_digest(token, API_TOKEN):
        return
    current_session(authorization)


def sign_telemetry_packet(payload: dict, secret: bytes = EDGE_HMAC_SECRET) -> dict:
    """Wrap `payload` with a timestamp and an HMAC-SHA256 signature (edge-side)."""
    body = {"payload": payload, "ts": time.time()}
    body_bytes = json.dumps(body, sort_keys=True).encode()
    signature = hmac.new(secret, body_bytes, hashlib.sha256).hexdigest()
    return {**body, "signature": signature}


def verify_telemetry_packet(packet: dict, secret: bytes = EDGE_HMAC_SECRET, max_age_s: float = 30.0) -> dict:
    """Verify an HMAC-signed telemetry packet (ground-side); returns the inner payload.

    Raises ValueError if the signature is invalid or the packet is stale
    (stale/replayed packets are rejected the same way a bad signature is).
    """
    signature = packet.get("signature")
    body = {"payload": packet.get("payload"), "ts": packet.get("ts")}
    body_bytes = json.dumps(body, sort_keys=True).encode()
    expected = hmac.new(secret, body_bytes, hashlib.sha256).hexdigest()
    if not signature or not hmac.compare_digest(signature, expected):
        raise ValueError("Invalid HMAC signature")
    if time.time() - float(body["ts"]) > max_age_s:
        raise ValueError("Telemetry packet is stale")
    return body["payload"]
