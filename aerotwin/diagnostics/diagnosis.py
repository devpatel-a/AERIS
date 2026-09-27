"""Diagnosis: fuses health, anomaly, classifier, and RUL outputs into one
actionable object with a rule-based maintenance recommendation.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from aerotwin.health.indices import HealthSnapshot

MAINTENANCE_ACTIONS: dict[str, str] = {
    "healthy": "No action required — continue normal maintenance schedule.",
    "misfire": "Inspect spark/ignition and fuel injector on the affected cylinder; "
    "check compression before next flight.",
    "injector_abnormality": "Inspect/clean or replace the affected fuel injector; verify "
    "injector flow calibration.",
    "cooling_degradation": "Inspect cooling fins/coolant circuit for blockage, leaks, or "
    "airflow obstruction; check coolant level and radiator condition.",
    "lubrication_issue": "Inspect oil pump, oil filter, and oil lines; check oil level and "
    "viscosity/condition before next flight.",
    "combustion_instability": "Inspect ignition timing, fuel quality, and injector spray "
    "pattern; check for intake air leaks.",
    "overheating_trend": "Reduce sustained low-airspeed/high-power operation; inspect cooling "
    "system margin ahead of hot-weather missions.",
    "abnormal_vibration": "Inspect propeller balance, engine mounts, and bearings for wear or "
    "looseness.",
    "alternator_degradation": "Inspect alternator brushes/bearings and wiring; verify charging "
    "system output on ground test.",
    "turbo_degradation": "Inspect turbocharger shaft play, wastegate actuation, and intake/"
    "exhaust piping for leaks.",
    "sensor_fault": "Inspect and recalibrate/replace the flagged sensor and its wiring/"
    "connector before trusting that channel again.",
}

SEVERITY_FROM_RISK = {"NORMAL": "none", "WATCH": "low", "WARNING": "moderate", "CRITICAL": "high"}


@dataclass
class Diagnosis:
    """One point-in-time diagnostic conclusion."""

    fault: str
    confidence: float
    explanation: str
    severity: str
    recommended_action: str
    overall_health_index: float
    overall_risk: str
    subsystem_index: dict[str, float] = field(default_factory=dict)
    rul_mean_hours: float | None = None
    rul_p05_hours: float | None = None
    rul_p95_hours: float | None = None
    shap_features: list[dict[str, float | str]] = field(default_factory=list)


def build_diagnosis(
    health: HealthSnapshot,
    fault: str,
    confidence: float,
    explanation: str,
    rul_mean_hours: float | None = None,
    rul_p05_hours: float | None = None,
    rul_p95_hours: float | None = None,
    shap_features: list[dict[str, float | str]] | None = None,
) -> Diagnosis:
    """Combine a health snapshot + classifier output (+ optional RUL/SHAP) into a Diagnosis."""
    severity = SEVERITY_FROM_RISK.get(health.overall_risk, "unknown")
    action = MAINTENANCE_ACTIONS.get(fault, "Inspect engine per maintenance manual.")
    return Diagnosis(
        fault=fault,
        confidence=confidence,
        explanation=explanation,
        severity=severity,
        recommended_action=action,
        overall_health_index=health.overall_index,
        overall_risk=health.overall_risk,
        subsystem_index=dict(health.subsystem_index),
        rul_mean_hours=rul_mean_hours,
        rul_p05_hours=rul_p05_hours,
        rul_p95_hours=rul_p95_hours,
        shap_features=shap_features or [],
    )
