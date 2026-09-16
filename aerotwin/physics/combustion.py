"""Combustion model: VE-map air induction, per-injector fuel, Wiebe-derived
torque and per-cylinder EGT.

Kept intentionally simple (no crank-angle-resolved heat release) to hit the
"simple, stable, fast first" requirement, while still exposing per-cylinder
fuel/EGT so cylinder-level faults (misfire, injector imbalance) are visible.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from aerotwin.physics.state import N_CYL
from aerotwin.twin.config import EngineConfig

R_AIR = 287.05
FUEL_LHV_J_PER_KG = 44.0e6  # avgas approx — replace with OEM data
COMBUSTION_EFFICIENCY_NOMINAL = 0.95  # approx — replace with OEM data
THERMAL_EFFICIENCY_NOMINAL = 0.40  # lumped MVEM effective efficiency, approx — replace with OEM data
CYLINDER_HEAT_FRACTION = 0.22  # fraction of fuel energy conducted to cylinder walls, approx
BASE_EGT_K_ABOVE_AMBIENT = 670.0  # approx — replace with OEM data


def ve_lookup(rpm: float, map_kpa: float, config: EngineConfig) -> float:
    """Bilinear-interpolated volumetric efficiency from the engine's VE map."""
    rpm_bp = np.array(config.ve_map.rpm_breakpoints, dtype=float)
    map_bp = np.array(config.ve_map.map_breakpoints_kpa, dtype=float)
    table = np.array(config.ve_map.ve_table, dtype=float)  # shape (len(rpm_bp), len(map_bp))
    rpm_c = min(max(rpm, rpm_bp[0]), rpm_bp[-1])
    map_c = min(max(map_kpa, map_bp[0]), map_bp[-1])
    i = int(np.searchsorted(rpm_bp, rpm_c, side="right") - 1)
    i = min(max(i, 0), len(rpm_bp) - 2)
    j = int(np.searchsorted(map_bp, map_c, side="right") - 1)
    j = min(max(j, 0), len(map_bp) - 2)
    r0, r1 = rpm_bp[i], rpm_bp[i + 1]
    m0, m1 = map_bp[j], map_bp[j + 1]
    tr = 0.0 if r1 == r0 else (rpm_c - r0) / (r1 - r0)
    tm = 0.0 if m1 == m0 else (map_c - m0) / (m1 - m0)
    v00, v01 = table[i, j], table[i, j + 1]
    v10, v11 = table[i + 1, j], table[i + 1, j + 1]
    v0 = v00 + tm * (v01 - v00)
    v1 = v10 + tm * (v11 - v10)
    return float(v0 + tr * (v1 - v0))


@dataclass
class CombustionResult:
    """Per-step combustion output, feeding thermal, rotational and vibration models."""

    air_mass_flow_kg_s: float
    fuel_per_cyl_kg_s: np.ndarray  # shape (4,)
    fuel_flow_kg_s: float
    heat_release_per_cyl_w: np.ndarray  # shape (4,)
    torque_nm: float
    egt_target_k: np.ndarray  # shape (4,)
    combustion_efficiency: float


def compute_combustion(
    omega_rad_s: float,
    map_pa: float,
    manifold_temp_k: float,
    ambient_pressure_pa: float,
    ambient_temp_k: float,
    config: EngineConfig,
    ve_factor_health: float,
    injector_flow_coeff_health: np.ndarray,
    combustion_efficiency_override: float | None = None,
    misfire_mask: np.ndarray | None = None,
) -> CombustionResult:
    """Compute air/fuel induction, torque and per-cylinder EGT targets for one step.

    `misfire_mask` (shape (4,), 0..1 per cylinder) scales fuel delivered to
    that cylinder to zero (complete misfire) or partially (partial misfire);
    defaults to no misfire.
    """
    if misfire_mask is None:
        misfire_mask = np.ones(N_CYL)
    rpm = omega_rad_s * 60.0 / (2 * np.pi)
    map_kpa = map_pa / 1000.0
    ve = ve_lookup(rpm, map_kpa, config) * ve_factor_health
    rho_manifold = map_pa / (R_AIR * max(manifold_temp_k, 1.0))
    rev_per_s = max(omega_rad_s, 0.0) / (2 * np.pi)
    intake_events_per_s = rev_per_s / 2.0  # 4-stroke
    air_mass_flow_kg_s = rho_manifold * config.geometry.displacement_m3 * intake_events_per_s * ve

    air_per_cyl = air_mass_flow_kg_s / N_CYL
    fuel_per_cyl_nominal = air_per_cyl / config.fuel.stoich_afr
    fuel_per_cyl = fuel_per_cyl_nominal * injector_flow_coeff_health * misfire_mask
    fuel_flow_kg_s = float(np.sum(fuel_per_cyl))

    eta_comb = (
        combustion_efficiency_override
        if combustion_efficiency_override is not None
        else COMBUSTION_EFFICIENCY_NOMINAL
    )
    heat_release_per_cyl_w = fuel_per_cyl * FUEL_LHV_J_PER_KG * eta_comb
    total_thermal_power_w = float(np.sum(heat_release_per_cyl_w))
    mechanical_power_w = total_thermal_power_w * THERMAL_EFFICIENCY_NOMINAL
    torque_nm = mechanical_power_w / max(omega_rad_s, 1.0)

    load_fraction = map_pa / max(ambient_pressure_pa, 1.0)
    fuel_ratio = np.divide(
        fuel_per_cyl,
        max(float(np.mean(fuel_per_cyl_nominal)), 1e-9),
        out=np.zeros_like(fuel_per_cyl),
        where=fuel_per_cyl_nominal > 0,
    )
    egt_target_k = ambient_temp_k + BASE_EGT_K_ABOVE_AMBIENT * load_fraction * fuel_ratio

    return CombustionResult(
        air_mass_flow_kg_s=air_mass_flow_kg_s,
        fuel_per_cyl_kg_s=fuel_per_cyl,
        fuel_flow_kg_s=fuel_flow_kg_s,
        heat_release_per_cyl_w=heat_release_per_cyl_w,
        torque_nm=torque_nm,
        egt_target_k=egt_target_k,
        combustion_efficiency=eta_comb,
    )
