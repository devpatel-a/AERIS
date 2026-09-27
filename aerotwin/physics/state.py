"""State, health-parameter, and input vector definitions for the MVEM.

The `EngineModel` integrates a *state vector* (fast dynamics) while treating
the *health-parameter vector* as slowly varying (updated externally by the
UKF in LIVE mode, or held/ramped by the fault injector in SIMULATION mode).
Keeping these two vectors explicit and separate is a core modelling rule.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

N_CYL = 4

# --- State vector layout -----------------------------------------------
IDX_OMEGA = 0
IDX_MAP_PA = 1
IDX_CHT0 = 2  # CHT for cylinders 2..5 -> indices 2,3,4,5
IDX_COOLANT_T = 6
IDX_OIL_T = 7
IDX_EGT0 = 8  # EGT for cylinders 8..11
IDX_BATTERY_SOC = 12
IDX_THETA = 13
STATE_DIM = 14

# --- Health-parameter vector layout -------------------------------------
HIDX_VE_FACTOR = 0
HIDX_COOLING_EFF = 1
HIDX_INJECTOR0 = 2  # injector_flow_coeff[0..3] -> indices 2,3,4,5
HIDX_FRICTION = 6
HIDX_OIL_PUMP_EFF = 7
HIDX_TURBO_EFF = 8
HIDX_ALT_EFF = 9
HEALTH_DIM = 10

HEALTH_NAMES = [
    "volumetric_efficiency_factor",
    "cooling_effectiveness",
    "injector_flow_coeff_0",
    "injector_flow_coeff_1",
    "injector_flow_coeff_2",
    "injector_flow_coeff_3",
    "friction_factor",
    "oil_pump_efficiency",
    "turbo_efficiency",
    "alternator_efficiency",
]


@dataclass
class EngineInputs:
    """Exogenous model inputs (control + environment). Never derived from outputs."""

    throttle: float  # 0..1
    ambient_pressure_pa: float
    ambient_temp_k: float
    altitude_m: float
    airspeed_mps: float


def nominal_health_vector(nominal_injector: list[float] | None = None) -> np.ndarray:
    """Return the pristine (nominal) health-parameter vector."""
    h = np.ones(HEALTH_DIM, dtype=float)
    if nominal_injector is not None:
        h[HIDX_INJECTOR0 : HIDX_INJECTOR0 + N_CYL] = nominal_injector
    return h


def initial_state_vector(
    ambient_temp_k: float = 288.15,
    idle_rpm: float = 1400.0,
) -> np.ndarray:
    """Return a plausible cold/idle initial state vector."""
    x = np.zeros(STATE_DIM, dtype=float)
    x[IDX_OMEGA] = idle_rpm * 2 * np.pi / 60.0
    x[IDX_MAP_PA] = 60_000.0
    x[IDX_CHT0 : IDX_CHT0 + N_CYL] = ambient_temp_k + 20.0
    x[IDX_COOLANT_T] = ambient_temp_k + 10.0
    x[IDX_OIL_T] = ambient_temp_k + 10.0
    x[IDX_EGT0 : IDX_EGT0 + N_CYL] = ambient_temp_k + 50.0
    x[IDX_BATTERY_SOC] = 0.9
    x[IDX_THETA] = 0.0
    return x


@dataclass
class EngineOutputs:
    """Named, physically-unit outputs derived from state+health each step.

    This is what LIVE mode compares against measured telemetry, and what
    gets logged to Parquet during missions.
    """

    rpm: float
    map_kpa: float
    cht_k: np.ndarray  # shape (4,)
    egt_k: np.ndarray  # shape (4,)
    oil_pressure_kpa: float
    oil_temp_k: float
    coolant_temp_k: float
    fuel_flow_kg_s: float
    torque_nm: float
    power_w: float
    injection_timing_deg: float
    alternator_voltage_v: float
    alternator_current_a: float
    battery_soc: float
    vibration_rms_g: float
    vibration_bands_g: dict[str, float] = field(default_factory=dict)
    oil_consumption_l_h: float = 0.0
    coolant_mass_flow_kg_s: float = 0.0
    coolant_pressure_kpa: float = 0.0

    def as_flat_dict(self) -> dict[str, float]:
        """Flatten to a dict suitable for a Parquet row / CAN frame payload."""
        d: dict[str, float] = {
            "rpm": self.rpm,
            "map_kpa": self.map_kpa,
            "oil_pressure_kpa": self.oil_pressure_kpa,
            "oil_temp_k": self.oil_temp_k,
            "coolant_temp_k": self.coolant_temp_k,
            "fuel_flow_kg_s": self.fuel_flow_kg_s,
            "torque_nm": self.torque_nm,
            "power_w": self.power_w,
            "injection_timing_deg": self.injection_timing_deg,
            "alternator_voltage_v": self.alternator_voltage_v,
            "alternator_current_a": self.alternator_current_a,
            "battery_soc": self.battery_soc,
            "vibration_rms_g": self.vibration_rms_g,
            "oil_consumption_l_h": self.oil_consumption_l_h,
            "coolant_mass_flow_kg_s": self.coolant_mass_flow_kg_s,
            "coolant_pressure_kpa": self.coolant_pressure_kpa,
        }
        for i in range(N_CYL):
            d[f"cht_{i + 1}_k"] = float(self.cht_k[i])
            d[f"egt_{i + 1}_k"] = float(self.egt_k[i])
        for name, val in self.vibration_bands_g.items():
            d[f"vib_{name}_g"] = val
        return d
