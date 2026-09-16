"""Intake manifold model: naturally-aspirated, turbocharged, or supercharged.

A single formula unifies all three: the achievable manifold pressure is
bounded by `ambient_pressure * max_pressure_ratio`, further capped by the
wastegate limit and scaled by turbo health. Setting `max_pressure_ratio=1.0`
(via `turbo.present=False`) reduces this exactly to the NA case.
"""

from __future__ import annotations

from aerotwin.physics.atmosphere import isa_pressure_temp
from aerotwin.twin.config import EngineConfig

IDLE_MAP_FRACTION = 0.35  # partial vacuum at closed throttle, approx


def max_pressure_ratio(config: EngineConfig) -> float:
    """Compressor pressure ratio the forced-induction system can sustain.

    Calibrated so that at the configured critical altitude, ambient pressure
    times this ratio exactly reaches `wastegate_max_map_kpa` — i.e. below
    critical altitude the wastegate has spare capacity and holds MAP
    constant at its max setting; above critical altitude MAP falls off with
    ambient pressure, exactly like a real turbo losing effectiveness.
    """
    if not config.turbo.present:
        return 1.0
    p_crit_pa, _ = isa_pressure_temp(config.turbo.critical_altitude_m)
    wastegate_pa = config.turbo.wastegate_max_map_kpa * 1000.0
    return wastegate_pa / p_crit_pa


def map_target_pa(
    throttle: float,
    ambient_pressure_pa: float,
    config: EngineConfig,
    turbo_efficiency: float,
) -> float:
    """Steady-state (unlagged) manifold absolute pressure target, in Pa."""
    pr_max = max_pressure_ratio(config)
    wastegate_pa = config.turbo.wastegate_max_map_kpa * 1000.0
    max_map_achievable_pa = min(
        wastegate_pa, ambient_pressure_pa * pr_max * max(turbo_efficiency, 0.05)
    )
    max_map_achievable_pa = max(max_map_achievable_pa, ambient_pressure_pa * 0.4)
    idle_map_pa = IDLE_MAP_FRACTION * ambient_pressure_pa
    throttle = min(max(throttle, 0.0), 1.0)
    return idle_map_pa + throttle * (max_map_achievable_pa - idle_map_pa)


def intake_time_constant_s(config: EngineConfig) -> float:
    """Manifold filling/turbo-spool lag time constant."""
    if config.turbo.present:
        return config.turbo.spool_time_constant_s
    return 0.08  # approx — fast throttle-body response for NA induction


def manifold_temp_k(map_pa: float, ambient_pressure_pa: float, ambient_temp_k: float) -> float:
    """Approximate manifold air temperature including boost heating.

    Uses a sub-adiabatic exponent to represent partial heat loss to the
    intake tract (no intercooler modelled) — approx — replace with OEM data.
    """
    ratio = max(map_pa / max(ambient_pressure_pa, 1.0), 1.0)
    return ambient_temp_k * ratio**0.2
