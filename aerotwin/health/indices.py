"""Per-subsystem 0-100 health indices and risk-level mapping.

Indices are derived primarily from the UKF's estimated health-parameter
vector (the slow degradation state), with a small margin-based penalty
where a subsystem is also close to an operating limit — so the index can
move *before* a hard limit alarm fires, which is the whole point of a
model-based early-warning system.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from aerotwin.physics.state import (
    HIDX_ALT_EFF,
    HIDX_COOLING_EFF,
    HIDX_FRICTION,
    HIDX_INJECTOR0,
    HIDX_OIL_PUMP_EFF,
    HIDX_TURBO_EFF,
    HIDX_VE_FACTOR,
    N_CYL,
)
from aerotwin.twin.config import EngineConfig

RISK_LEVELS = ["NORMAL", "WATCH", "WARNING", "CRITICAL"]
RISK_THRESHOLDS = {"NORMAL": 80.0, "WATCH": 60.0, "WARNING": 40.0}  # index >= threshold for that level

SUBSYSTEMS = [
    "combustion",
    "cooling",
    "lubrication",
    "fuel_injection",
    "electrical",
    "mechanical_vibration",
    "sensors",
]

# Weights for the overall weighted-average index — approx, tuned for demo purposes.
SUBSYSTEM_WEIGHTS = {
    "combustion": 0.18,
    "cooling": 0.22,
    "lubrication": 0.2,
    "fuel_injection": 0.12,
    "electrical": 0.1,
    "mechanical_vibration": 0.13,
    "sensors": 0.05,
}


def risk_level(index: float) -> str:
    """Map a 0-100 index to a NORMAL/WATCH/WARNING/CRITICAL risk level."""
    if index >= RISK_THRESHOLDS["NORMAL"]:
        return "NORMAL"
    if index >= RISK_THRESHOLDS["WATCH"]:
        return "WATCH"
    if index >= RISK_THRESHOLDS["WARNING"]:
        return "WARNING"
    return "CRITICAL"


def _margin_penalty(value: float, limit: float, nominal: float, span_fraction: float = 0.3) -> float:
    """0..1 penalty that ramps up as `value` approaches `limit` from `nominal`."""
    span = abs(limit - nominal) * span_fraction
    if span <= 0:
        return 0.0
    over = (value - (limit - span)) / span if limit > nominal else ((limit + span) - value) / span
    return float(np.clip(over, 0.0, 1.0))


@dataclass
class HealthSnapshot:
    """One timestep's full health assessment."""

    subsystem_index: dict[str, float]
    subsystem_risk: dict[str, str]
    overall_index: float
    overall_risk: str


def compute_health_snapshot(
    health: np.ndarray,
    outputs_flat: dict[str, float],
    config: EngineConfig,
    sensor_fault_fraction: float = 0.0,
    vibration_baseline_g: float | None = None,
) -> HealthSnapshot:
    """Compute the full per-subsystem + overall health snapshot for one timestep."""
    idx: dict[str, float] = {}

    ve = float(health[HIDX_VE_FACTOR])
    idx["combustion"] = float(np.clip(100.0 * (2.0 * ve - 1.0), 0.0, 100.0))

    cooling_eff = float(health[HIDX_COOLING_EFF])
    # CHT margin: no penalty up to the caution band, ramping to full at the limit.
    cht_nominal = config.limits.cht_caution_k or 350.0
    cht_span = 1.0 if config.limits.cht_caution_k else 0.3
    cht_penalty = max(
        (
            _margin_penalty(outputs_flat.get(f"cht_{i}_k", 0.0), config.limits.max_cht_k, cht_nominal, cht_span)
            for i in range(1, N_CYL + 1)
        ),
        default=0.0,
    )
    idx["cooling"] = float(np.clip(100.0 * cooling_eff * (1.0 - 0.5 * cht_penalty), 0.0, 100.0))

    oil_eff = float(health[HIDX_OIL_PUMP_EFF])
    oil_p = outputs_flat.get("oil_pressure_kpa", config.limits.min_oil_pressure_kpa)
    oil_p_penalty = _margin_penalty(-oil_p, -config.limits.min_oil_pressure_kpa, -400.0)
    idx["lubrication"] = float(np.clip(100.0 * oil_eff * (1.0 - 0.5 * oil_p_penalty), 0.0, 100.0))

    injector = health[HIDX_INJECTOR0 : HIDX_INJECTOR0 + N_CYL]
    imbalance = float(np.mean(np.abs(injector - 1.0)))
    idx["fuel_injection"] = float(np.clip(100.0 * (1.0 - 2.5 * imbalance), 0.0, 100.0))

    alt_eff = float(health[HIDX_ALT_EFF])
    idx["electrical"] = float(np.clip(100.0 * alt_eff, 0.0, 100.0))

    baseline = vibration_baseline_g or config.vibration.baseline_rms_g
    vib_ratio = outputs_flat.get("vibration_rms_g", baseline) / max(baseline, 1e-6)
    idx["mechanical_vibration"] = float(np.clip(100.0 * (1.0 - 0.35 * max(vib_ratio - 1.0, 0.0)), 0.0, 100.0))

    idx["sensors"] = float(np.clip(100.0 * (1.0 - sensor_fault_fraction), 0.0, 100.0))

    # friction_factor and turbo_efficiency fold into combustion/mechanical as secondary penalties
    friction = float(health[HIDX_FRICTION])
    idx["mechanical_vibration"] = float(np.clip(idx["mechanical_vibration"] * min(1.0, 2.0 - friction), 0.0, 100.0))
    turbo_eff = float(health[HIDX_TURBO_EFF])
    idx["combustion"] = float(np.clip(idx["combustion"] * (0.5 + 0.5 * turbo_eff), 0.0, 100.0))

    # Auxiliary (not in the weighted overall index): induction path health —
    # turbo efficiency health (1.0 = nominal) x volumetric efficiency health.
    turbo_rel = min(turbo_eff, 1.0) if config.turbo.present else 1.0
    idx["turbo_air"] = float(np.clip(100.0 * turbo_rel * min(ve, 1.0), 0.0, 100.0))

    risk = {s: risk_level(v) for s, v in idx.items()}
    overall_index = float(sum(idx[s] * SUBSYSTEM_WEIGHTS[s] for s in SUBSYSTEMS))
    worst_rank = max(RISK_LEVELS.index(r) for r in risk.values())
    overall_risk = RISK_LEVELS[worst_rank]

    return HealthSnapshot(
        subsystem_index=idx, subsystem_risk=risk, overall_index=overall_index, overall_risk=overall_risk
    )
