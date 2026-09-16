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
    """Oil pressure (kPa) vs RPM, oil temperature and health.

    Real oil pumps are relief-valve regulated: pressure rises quickly off
    idle and plateaus, rather than scaling purely linearly with RPM from
    zero. `fraction_of_ref` is clipped to a floor of 0.5x the reference
    pressure so a healthy engine clears `limits.min_oil_pressure_kpa` even
    at idle RPM — approx — replace with OEM pump curve data.
    """
    fraction_of_ref = min(max(0.5 + 0.5 * (rpm / config.lubrication.oil_pressure_rpm_ref), 0.5), 1.3)
    base = config.lubrication.oil_pressure_ref_kpa * fraction_of_ref * oil_pump_efficiency_health
    overtemp = max(0.0, (oil_temp_k - VISCOSITY_DERATE_REF_K) / VISCOSITY_DERATE_SPAN_K)
    derate = 1.0 - min(overtemp, 1.0) * VISCOSITY_DERATE_MAX_FRACTION
    return max(base * derate, 0.0)
