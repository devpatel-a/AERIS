"""Tests for the Diagnosis object and alert de-dup/hysteresis."""

from __future__ import annotations

from aerotwin.diagnostics.alerts import AlertManager
from aerotwin.diagnostics.diagnosis import build_diagnosis
from aerotwin.health.indices import compute_health_snapshot
from aerotwin.physics.state import HIDX_COOLING_EFF, nominal_health_vector
from aerotwin.twin.config import EngineRegistry


def test_build_diagnosis_includes_recommended_action():
    """A cooling-degradation diagnosis should carry the cooling maintenance action."""
    config = EngineRegistry().get("rotax914_like")
    health = nominal_health_vector(config.nominal_health.injector_flow_coeff)
    health[HIDX_COOLING_EFF] = 0.4
    outputs = {f"cht_{i}_k": 480.0 for i in range(1, 5)}
    outputs["oil_pressure_kpa"] = 380.0
    outputs["vibration_rms_g"] = config.vibration.baseline_rms_g
    snapshot = compute_health_snapshot(health, outputs, config)

    diag = build_diagnosis(snapshot, "cooling_degradation", confidence=0.85, explanation="CHT trending high")
    assert diag.fault == "cooling_degradation"
    assert "cooling" in diag.recommended_action.lower()
    assert diag.severity in {"none", "low", "moderate", "high"}


def test_alert_manager_hysteresis_suppresses_flapping():
    """A brief risk-level blip that reverts before the hold time should not fire an alert."""
    mgr = AlertManager(hold_time_s=10.0)
    assert mgr.update(0.0, "cooling", "NORMAL") is None
    assert mgr.update(1.0, "cooling", "WARNING") is None  # not held long enough yet
    assert mgr.update(2.0, "cooling", "NORMAL") is None  # reverted before hold time


def test_alert_manager_fires_on_sustained_escalation():
    """A risk level sustained past the hold time should fire exactly one escalation alert."""
    mgr = AlertManager(hold_time_s=5.0)
    mgr.update(0.0, "cooling", "NORMAL")
    mgr.update(1.0, "cooling", "WARNING")
    alert = None
    for t in [2.0, 4.0, 6.0, 8.0]:
        result = mgr.update(t, "cooling", "WARNING")
        if result is not None:
            alert = result
    assert alert is not None
    assert alert.severity == "WARNING"
    assert not alert.cleared

    # Repeated updates at the same level should not re-fire.
    assert mgr.update(10.0, "cooling", "WARNING") is None
