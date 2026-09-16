"""Lubrication model: oil pressure as a function of RPM, oil temperature and health."""

from __future__ import annotations

from aerotwin.twin.config import EngineConfig

VISCOSITY_DERATE_REF_K = 353.0  # ~80 C, above which pressure starts to fall, approx
VISCOSITY_DERATE_SPAN_K = 50.0
VISCOSITY_DERATE_MAX_FRACTION = 0.2


def oil_pressure_kpa(
    rpm: float,
    oil_temp_k: float,
    config: EngineConfig,
    oil_pump_efficiency_health: float,
) -> float:
    """Oil pressure (kPa), roughly proportional to RPM, derated by high oil temp."""
    base = (
        config.lubrication.oil_pressure_ref_kpa
        * (rpm / config.lubrication.oil_pressure_rpm_ref)
        * oil_pump_efficiency_health
    )
    overtemp = max(0.0, (oil_temp_k - VISCOSITY_DERATE_REF_K) / VISCOSITY_DERATE_SPAN_K)
    derate = 1.0 - min(overtemp, 1.0) * VISCOSITY_DERATE_MAX_FRACTION
    return max(base * derate, 0.0)
