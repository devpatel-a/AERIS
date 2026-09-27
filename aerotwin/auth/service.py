"""Operator accounts and session tokens for the ground-station login.

A simple application auth flow suitable for the demo: operators sign in with
their operator/DoD ID, a numeric CAC PIN and a clearance role. PINs are stored
as salted PBKDF2-SHA256 hashes. A successful login issues an HMAC-signed
bearer token whose id is recorded in `auth_sessions`, so tokens expire and can
be revoked on logout.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path

import yaml

ROLES: dict[str, dict[str, str]] = {
    "uav_operator": {
        "label": "UAV Operator",
        "description": "Flight-line real-time telemetry and mission execution",
        "icon": "flight_takeoff",
    },
    "propulsion_engineer": {
        "label": "Propulsion Engineer",
        "description": "Digital twin simulation, physics parameters & anomaly diagnostics",
        "icon": "model_training",
    },
    "maint_tech": {
        "label": "Maintenance Technician",
        "description": "Work orders, health degradation & overhaul checklists",
        "icon": "build_circle",
    },
}

PBKDF2_ITERATIONS = 200_000
TOKEN_TTL_S = float(os.environ.get("AEROTWIN_SESSION_TTL_S", 12 * 3600))
SESSION_SECRET = os.environ.get("AEROTWIN_SESSION_SECRET", "aerotwin-session-secret-devonly").encode()
DEFAULT_OPERATORS_PATH = Path(__file__).resolve().parents[2] / "configs" / "users" / "operators.yaml"


class AuthError(Exception):
    """Raised for any failed login or invalid/expired/revoked token."""


@dataclass
class Operator:
    """One ground-station operator account (never carries the PIN hash out of this module)."""

    id: int
    operator_id: str
    display_name: str
    title: str
    initials: str
    roles: list[str]


@dataclass
class AuthSession:
    """A validated, live session: who is signed in, as which role, on which airframe."""

    token_id: str
    operator: Operator
    role: str
    tail_id: str | None
    expires_at: float


def hash_pin(pin: str, salt: bytes | None = None) -> tuple[str, str]:
    """Return (hash_hex, salt_hex) for `pin` using salted PBKDF2-SHA256."""
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt, PBKDF2_ITERATIONS)
    return digest.hex(), salt.hex()


def _verify_pin(pin: str, pin_hash: str, salt_hex: str) -> bool:
    candidate, _ = hash_pin(pin, bytes.fromhex(salt_hex))
    return hmac.compare_digest(candidate, pin_hash)


def _row_to_operator(row: sqlite3.Row) -> Operator:
    return Operator(
        id=row["id"],
        operator_id=row["operator_id"],
        display_name=row["display_name"],
        title=row["title"],
        initials=row["initials"],
        roles=[r for r in row["roles"].split(",") if r],
    )


def create_operator(
    conn: sqlite3.Connection,
    operator_id: str,
    display_name: str,
    pin: str,
    roles: list[str],
    title: str = "",
    initials: str | None = None,
) -> Operator:
    """Insert (or replace) one operator account with a freshly hashed PIN."""
    unknown = [r for r in roles if r not in ROLES]
    if unknown:
        raise ValueError(f"Unknown roles {unknown}; expected any of {sorted(ROLES)}")
    if not pin.isdigit() or not 6 <= len(pin) <= 8:
        raise ValueError("CAC PIN must be 6-8 numeric digits")
    pin_hash, salt = hash_pin(pin)
    initials = initials or "".join(w[0] for w in display_name.split()[:2]).upper()
    conn.execute(
        "INSERT OR REPLACE INTO users (operator_id, display_name, title, initials, roles, pin_hash, pin_salt, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (operator_id, display_name, title, initials, ",".join(roles), pin_hash, salt, time.time()),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE operator_id = ?", (operator_id,)).fetchone()
    return _row_to_operator(row)


def seed_operators(conn: sqlite3.Connection, path: Path = DEFAULT_OPERATORS_PATH, force: bool = False) -> int:
    """Seed the operator roster from YAML if the users table is empty (or `force`). Returns count added."""
    if not force and conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] > 0:
        return 0
    with path.open() as f:
        roster = yaml.safe_load(f)["operators"]
    for op in roster:
        create_operator(
            conn, op["operator_id"], op["display_name"], str(op["demo_pin"]), op["roles"],
            title=op.get("title", ""), initials=op.get("initials"),
        )
    return len(roster)


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _sign(body: str) -> str:
    return _b64(hmac.new(SESSION_SECRET, body.encode(), hashlib.sha256).digest())


def login(
    conn: sqlite3.Connection, operator_id: str, pin: str, role: str, tail_id: str | None = None
) -> tuple[str, AuthSession]:
    """Authenticate an operator and open a session. Returns (bearer_token, session)."""
    row = conn.execute("SELECT * FROM users WHERE operator_id = ?", (operator_id.strip().upper(),)).fetchone()
    # Same error for unknown operator and wrong PIN, so IDs can't be enumerated.
    if row is None or not _verify_pin(pin, row["pin_hash"], row["pin_salt"]):
        raise AuthError("Invalid operator ID or CAC PIN")
    operator = _row_to_operator(row)
    if role not in operator.roles:
        raise AuthError(f"Operator {operator.operator_id} is not cleared for role '{ROLES.get(role, {}).get('label', role)}'")

    token_id = secrets.token_hex(16)
    now = time.time()
    expires_at = now + TOKEN_TTL_S
    conn.execute(
        "INSERT INTO auth_sessions (token_id, user_id, role, tail_id, issued_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
        (token_id, operator.id, role, tail_id, now, expires_at),
    )
    conn.commit()
    body = _b64(json.dumps({"tid": token_id, "exp": expires_at}).encode())
    token = f"{body}.{_sign(body)}"
    return token, AuthSession(token_id, operator, role, tail_id, expires_at)


def resolve_token(conn: sqlite3.Connection, token: str) -> AuthSession:
    """Validate a bearer token (signature, expiry, not revoked) and return its session."""
    try:
        body, signature = token.split(".", 1)
    except ValueError as exc:
        raise AuthError("Malformed token") from exc
    if not hmac.compare_digest(signature, _sign(body)):
        raise AuthError("Invalid token signature")
    claims = json.loads(_unb64(body))
    if claims["exp"] < time.time():
        raise AuthError("Session expired")
    row = conn.execute(
        "SELECT s.*, u.id AS uid FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_id = ?",
        (claims["tid"],),
    ).fetchone()
    if row is None or row["revoked"]:
        raise AuthError("Session revoked")
    user = conn.execute("SELECT * FROM users WHERE id = ?", (row["uid"],)).fetchone()
    return AuthSession(row["token_id"], _row_to_operator(user), row["role"], row["tail_id"], row["expires_at"])


def set_session_tail(conn: sqlite3.Connection, token_id: str, tail_id: str) -> None:
    """Switch the airframe a session is assigned to."""
    conn.execute("UPDATE auth_sessions SET tail_id = ? WHERE token_id = ?", (tail_id, token_id))
    conn.commit()


def logout(conn: sqlite3.Connection, token_id: str) -> None:
    """Revoke a session so its token stops working immediately."""
    conn.execute("UPDATE auth_sessions SET revoked = 1 WHERE token_id = ?", (token_id,))
    conn.commit()
