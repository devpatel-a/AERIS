"""Alternator and battery electrical model."""

from __future__ import annotations

from aerotwin.twin.config import EngineConfig

ALTERNATOR_CAPACITY_A = 40.0  # approx — replace with OEM data
ALTERNATOR_CUTIN_RPM = 1200.0  # approx — replace with OEM data


def alternator_output_a(rpm: float, config: EngineConfig, alternator_efficiency_health: float) -> float:
    """Alternator current output (A), ramping up with RPM to its capacity."""
    if rpm < ALTERNATOR_CUTIN_RPM:
        return 0.0
    ramp = min(1.0, (rpm - ALTERNATOR_CUTIN_RPM) / (config.rating.rated_rpm - ALTERNATOR_CUTIN_RPM))
    return ALTERNATOR_CAPACITY_A * ramp * alternator_efficiency_health


def dbattery_soc_dt(
    alt_output_a: float,
    load_a: float,
    config: EngineConfig,
) -> float:
    """Battery state-of-charge derivative (1/s), clipped externally to [0, 1]."""
    net_a = alt_output_a - load_a
    capacity_as = config.electrical.battery_capacity_ah * 3600.0
    return net_a / capacity_as


def bus_voltage_v(soc: float, config: EngineConfig, net_a: float) -> float:
    """Bus voltage: nominal when charging, sagging when net current is negative."""
    sag = 0.0 if net_a >= 0 else min(4.0, -net_a * 0.05)
    return config.electrical.nominal_bus_voltage_v * (0.92 + 0.08 * soc) - sag
