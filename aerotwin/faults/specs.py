"""Fault specification: type, target, onset, severity profile."""

from __future__ import annotations

import math
from typing import Any, Literal

from pydantic import BaseModel, Field

EngineFaultType = Literal[
    "misfire",
    "injector_abnormality",
    "cooling_degradation",
    "lubrication_issue",
    "combustion_instability",
    "overheating_trend",
    "abnormal_vibration",
    "alternator_degradation",
    "turbo_degradation",
]

SensorFaultType = Literal["sensor_drift", "sensor_stuck", "sensor_noise", "sensor_dropout"]

FaultType = EngineFaultType | SensorFaultType

ENGINE_FAULT_TYPES: tuple[str, ...] = (
    "misfire",
    "injector_abnormality",
    "cooling_degradation",
    "lubrication_issue",
    "combustion_instability",
    "overheating_trend",
    "abnormal_vibration",
    "alternator_degradation",
    "turbo_degradation",
)
SENSOR_FAULT_TYPES: tuple[str, ...] = (
    "sensor_drift",
    "sensor_stuck",
    "sensor_noise",
    "sensor_dropout",
)
ALL_FAULT_TYPES: tuple[str, ...] = ENGINE_FAULT_TYPES + SENSOR_FAULT_TYPES


class FaultSpec(BaseModel):
    """A single injected fault: what, where, when, how it grows."""

    fault_type: str
    target: int | str | None = None  # cylinder index (engine faults) or channel name (sensor faults)
    onset_s: float = 0.0
    profile: Literal["step", "ramp", "exponential"] = "ramp"
    severity: float = Field(ge=0.0, le=1.0, default=0.5)
    ramp_duration_s: float = 1800.0
    tau_s: float = 1200.0
    extra: dict[str, Any] = Field(default_factory=dict)


def severity_at(t: float, spec: FaultSpec) -> float:
    """Return the effective 0..severity magnitude of `spec` at time t."""
    if t < spec.onset_s:
        return 0.0
    dt = t - spec.onset_s
    if spec.profile == "step":
        return spec.severity
    if spec.profile == "ramp":
        return min(spec.severity, spec.severity * dt / max(spec.ramp_duration_s, 1e-6))
    if spec.profile == "exponential":
        return spec.severity * (1.0 - math.exp(-dt / max(spec.tau_s, 1e-6)))
    raise ValueError(f"Unknown profile '{spec.profile}'")
