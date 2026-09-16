"""ISA atmosphere model with deviation support.

All quantities are SI (Pa, K, kg/m^3, m).
"""

from __future__ import annotations

R_AIR = 287.05  # J/(kg K) specific gas constant for dry air
G0 = 9.80665  # m/s^2
LAPSE_RATE = 0.0065  # K/m, troposphere (0-11km)
T0_ISA = 288.15  # K, sea-level standard temperature
P0_ISA = 101325.0  # Pa, sea-level standard pressure


def isa_pressure_temp(altitude_m: float, isa_deviation_k: float = 0.0) -> tuple[float, float]:
    """Return (pressure_pa, temperature_k) for a given altitude and ISA deviation.

    Valid for the troposphere (0-11000 m), which covers all AeroTwin mission
    profiles. `isa_deviation_k` shifts the temperature profile uniformly
    (e.g. +20 K for a hot day) while pressure follows the standard lapse.
    """
    altitude_m = max(0.0, min(altitude_m, 11000.0))
    temp_k = T0_ISA - LAPSE_RATE * altitude_m + isa_deviation_k
    # Pressure lapse uses the *standard* temperature profile (deviation does
    # not materially change the hydrostatic pressure lapse at these altitudes).
    temp_std_k = T0_ISA - LAPSE_RATE * altitude_m
    pressure_pa = P0_ISA * (temp_std_k / T0_ISA) ** (G0 / (LAPSE_RATE * R_AIR))
    return pressure_pa, temp_k


def air_density(pressure_pa: float, temp_k: float) -> float:
    """Ideal-gas air density (kg/m^3)."""
    return pressure_pa / (R_AIR * max(temp_k, 1.0))


def dynamic_pressure(density_kg_m3: float, airspeed_mps: float) -> float:
    """Dynamic pressure q = 1/2 rho V^2 (Pa), used for cooling-airflow scaling."""
    return 0.5 * density_kg_m3 * airspeed_mps * abs(airspeed_mps)


__all__ = [
    "R_AIR",
    "isa_pressure_temp",
    "air_density",
    "dynamic_pressure",
]
