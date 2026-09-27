"""Tests for operator authentication (aerotwin.auth) and the login-screen API."""

from __future__ import annotations

import sqlite3

import pytest
from fastapi.testclient import TestClient

from aerotwin.api.main import app
from aerotwin.auth.service import (
    AuthError,
    create_operator,
    login,
    logout,
    resolve_token,
    seed_operators,
)
from aerotwin.storage.db import SCHEMA


@pytest.fixture()
def db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def test_pin_is_hashed_and_login_round_trips(db):
    """PINs are never stored in clear; a valid login yields a token that resolves to the operator."""
    create_operator(db, "MIL-0001-TEST", "Test Operator", "123456", ["uav_operator"])
    row = db.execute("SELECT pin_hash FROM users").fetchone()
    assert "123456" not in row["pin_hash"]
    token, session = login(db, "mil-0001-test", "123456", "uav_operator", "UAV-07")
    resolved = resolve_token(db, token)
    assert resolved.operator.operator_id == "MIL-0001-TEST"
    assert resolved.tail_id == "UAV-07"
    assert session.operator.initials == "TO"


def test_login_rejects_bad_pin_unknown_operator_and_uncleared_role(db):
    create_operator(db, "MIL-0001-TEST", "Test Operator", "123456", ["uav_operator"])
    for operator_id, pin, role in [
        ("MIL-0001-TEST", "654321", "uav_operator"),
        ("MIL-9999-NONE", "123456", "uav_operator"),
        ("MIL-0001-TEST", "123456", "maint_tech"),
    ]:
        with pytest.raises(AuthError):
            login(db, operator_id, pin, role)


def test_tampered_and_revoked_tokens_are_rejected(db):
    create_operator(db, "MIL-0001-TEST", "Test Operator", "123456", ["uav_operator"])
    token, session = login(db, "MIL-0001-TEST", "123456", "uav_operator")
    with pytest.raises(AuthError):
        resolve_token(db, token[:-2] + ("AA" if not token.endswith("AA") else "BB"))
    logout(db, session.token_id)
    with pytest.raises(AuthError):
        resolve_token(db, token)


def test_operator_pin_policy(db):
    with pytest.raises(ValueError):
        create_operator(db, "MIL-0002-TEST", "Short Pin", "12ab", ["uav_operator"])


def test_seed_operators_only_when_empty(db):
    assert seed_operators(db) > 0
    assert seed_operators(db) == 0


def test_login_api_session_and_protected_write():
    """The login endpoint's token authorizes /api/auth/me and token-protected writes."""
    with TestClient(app) as client:
        roles = client.get("/api/auth/roles").json()
        assert {r["role"] for r in roles} == {"uav_operator", "propulsion_engineer", "maint_tech"}
        bad = client.post("/api/auth/login", json={"operator_id": "MIL-9842-ALPHA", "pin": "00000000", "role": "uav_operator"})
        assert bad.status_code == 401
        ok = client.post(
            "/api/auth/login",
            json={"operator_id": "MIL-9842-ALPHA", "pin": "20250704", "role": "propulsion_engineer", "tail_id": "UAV-07"},
        )
        assert ok.status_code == 200
        headers = {"Authorization": f"Bearer {ok.json()['token']}"}
        me = client.get("/api/auth/me", headers=headers).json()
        assert me["tail_id"] == "UAV-07" and me["role_label"] == "Propulsion Engineer"
        assert client.post("/api/live/stop", headers=headers).status_code == 200
        assert client.post("/api/auth/logout", headers=headers).status_code == 200
        assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_system_status_and_fleet_tails():
    with TestClient(app) as client:
        status = client.get("/api/system/status").json()
        assert status["station"]["station_id"]
        assert status["link"]["rate_hz"] == pytest.approx(20.0)
        assert status["link"]["margin_db"] > 0
        tails = client.get("/api/fleet/tails").json()
        assert {t["tail_id"] for t in tails} == {"UAV-07", "UAV-03", "UAV-11", "UAV-02", "UAV-09", "UAV-05"}
        assert sum(t["primary"] for t in tails) == 1
