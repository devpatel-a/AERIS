"""Token auth for the dashboard API + HMAC signing for edge->ground telemetry packets."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import time

from fastapi import Header, HTTPException, status

API_TOKEN = os.environ.get("AEROTWIN_TOKEN", "devtoken")
EDGE_HMAC_SECRET = os.environ.get("AEROTWIN_EDGE_SECRET", "aerotwin-edge-secret-devonly").encode()


def require_token(authorization: str | None = Header(default=None)) -> None:
    """FastAPI dependency: require `Authorization: Bearer <token>` matching AEROTWIN_TOKEN."""
    expected = f"Bearer {API_TOKEN}"
    if authorization != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing token")


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
