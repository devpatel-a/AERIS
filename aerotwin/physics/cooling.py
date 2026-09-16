"""Lumped thermal model: per-cylinder CHT, coolant temperature, oil temperature.

Heat rejection scales with air density * airspeed * cooling_effectiveness,
per the core modelling rule. "Coding degradation" in the original problem
statement is interpreted as COOLING degradation (falling `cooling_effectiveness`).
"""

from __future__ import annotations

import numpy as np

from aerotwin.physics.atmosphere import air_density
from aerotwin.twin.config import EngineConfig

AIRSPEED_COOLING_GAIN = 0.02  # per (m/s), approx — replace with OEM data
HEAD_TO_COOLANT_TRANSFER_W_PER_K = 70.0  # approx — replace with OEM data
FRICTION_TO_OIL_HEAT_FRACTION = 0.6  # approx — replace with OEM data
OIL_COOLER_HTC_REF = 26.0  # W/K at reference conditions, approx


def cooling_airflow_factor(
    ambient_pressure_pa: float, ambient_temp_k: float, airspeed_mps: float
) -> float:
    """Relative cooling airflow effectiveness vs sea-level-static reference."""
    rho = air_density(ambient_pressure_pa, ambient_temp_k)
    rho_ref = 1.225
    return (rho / rho_ref) * (1.0 + AIRSPEED_COOLING_GAIN * max(airspeed_mps, 0.0))


def cylinder_heat_transfer_coeff(
    config: EngineConfig,
    airflow_factor: float,
    cooling_effectiveness_health: float,
) -> float:
    """Effective W/K heat-transfer coefficient from cylinder to ambient air."""
    return config.cooling.cylinder_ambient_htc_ref * airflow_factor * cooling_effectiveness_health


def dcht_dt(
    cht_k: np.ndarray,
    heat_release_per_cyl_w: np.ndarray,
    ambient_temp_k: float,
    airflow_factor: float,
    config: EngineConfig,
    cooling_effectiveness_health: float,
) -> np.ndarray:
    """Per-cylinder CHT derivative (K/s)."""
    h_cyl = cylinder_heat_transfer_coeff(config, airflow_factor, cooling_effectiveness_health)
    heat_in = heat_release_per_cyl_w * 0.22  # CYLINDER_HEAT_FRACTION, kept local to avoid coupling
    heat_out = h_cyl * (cht_k - ambient_temp_k)
    return (heat_in - heat_out) / config.thermal_masses.cylinder_thermal_mass_j_per_k


def dcoolant_dt(
    coolant_temp_k: float,
    cht_k: np.ndarray,
    ambient_temp_k: float,
    airflow_factor: float,
    config: EngineConfig,
    cooling_effectiveness_health: float,
) -> float:
    """Coolant temperature derivative (K/s) — only meaningful for liquid-cooled heads."""
    heat_from_heads = HEAD_TO_COOLANT_TRANSFER_W_PER_K * (float(np.mean(cht_k)) - coolant_temp_k)
    h_radiator = config.cooling.cylinder_ambient_htc_ref * 0.55 * airflow_factor
    heat_rejected = h_radiator * cooling_effectiveness_health * (coolant_temp_k - ambient_temp_k)
    return (heat_from_heads - heat_rejected) / config.thermal_masses.coolant_thermal_mass_j_per_k


def doil_temp_dt(
    oil_temp_k: float,
    friction_power_w: float,
    ambient_temp_k: float,
    airflow_factor: float,
    config: EngineConfig,
    cooling_effectiveness_health: float,
) -> float:
    """Oil temperature derivative (K/s)."""
    heat_in = friction_power_w * FRICTION_TO_OIL_HEAT_FRACTION
    heat_out = (
        OIL_COOLER_HTC_REF
        * airflow_factor
        * cooling_effectiveness_health
        * (oil_temp_k - ambient_temp_k)
    )
    return (heat_in - heat_out) / config.thermal_masses.oil_thermal_mass_j_per_k
