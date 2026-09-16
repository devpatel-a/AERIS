"""Rotational dynamics: engine crankshaft + propeller load, and crank-angle phase."""

from __future__ import annotations

from aerotwin.twin.config import EngineConfig


def friction_torque_nm(omega_rad_s: float, config: EngineConfig, friction_factor_health: float) -> float:
    """Speed-proportional mechanical friction torque (approx — replace with OEM data)."""
    friction_rpm_ref_rad_s = config.friction.friction_rpm_ref * 2 * 3.141592653589793 / 60.0
    return (
        config.friction.friction_torque_ref_nm
        * (max(omega_rad_s, 0.0) / friction_rpm_ref_rad_s)
        * friction_factor_health
    )


def propeller_load_torque_nm(omega_rad_s: float, config: EngineConfig) -> float:
    """Propeller absorbs torque ~ k * omega^2 (referred to crankshaft via gear ratio)."""
    prop_omega = omega_rad_s / config.propeller.gear_ratio
    load_at_prop = config.propeller.load_coefficient * prop_omega * prop_omega
    return load_at_prop / config.propeller.gear_ratio


def domega_dt(
    torque_engine_nm: float,
    omega_rad_s: float,
    config: EngineConfig,
    friction_factor_health: float,
) -> float:
    """Crankshaft angular acceleration (rad/s^2)."""
    t_friction = friction_torque_nm(omega_rad_s, config, friction_factor_health)
    t_load = propeller_load_torque_nm(omega_rad_s, config)
    inertia = config.propeller.inertia_kg_m2
    return (torque_engine_nm - t_friction - t_load) / inertia
