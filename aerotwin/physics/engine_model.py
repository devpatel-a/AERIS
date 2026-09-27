"""EngineModel: the Mean Value Engine Model (MVEM) kernel.

Fixed-step RK4 integration at 20 Hz. State vector and health-parameter
vector are kept explicitly separate (see `aerotwin.physics.state`) — the
health vector is treated as externally supplied/updated (by the UKF in
LIVE mode, or the fault injector in SIMULATION mode), never integrated by
this model's own dynamics beyond a plain pass-through.

Fault hooks (`misfire_mask`, `vibration_imbalance_severity`,
`combustion_efficiency_override`) are exposed as plain attributes so
`aerotwin.faults` can perturb the model without this module depending on it.
"""

from __future__ import annotations

import numpy as np

from aerotwin.physics import cooling, electrical, intake, rotational, vibration
from aerotwin.physics.combustion import compute_combustion
from aerotwin.physics.lubrication import oil_consumption_l_per_h, oil_pressure_kpa
from aerotwin.physics.state import (
    HIDX_ALT_EFF,
    HIDX_COOLING_EFF,
    HIDX_FRICTION,
    HIDX_INJECTOR0,
    HIDX_OIL_PUMP_EFF,
    HIDX_TURBO_EFF,
    HIDX_VE_FACTOR,
    IDX_BATTERY_SOC,
    IDX_CHT0,
    IDX_COOLANT_T,
    IDX_EGT0,
    IDX_MAP_PA,
    IDX_OIL_T,
    IDX_OMEGA,
    IDX_THETA,
    N_CYL,
    STATE_DIM,
    EngineInputs,
    EngineOutputs,
    initial_state_vector,
    nominal_health_vector,
)
from aerotwin.twin.config import EngineConfig

DEFAULT_DT_S = 0.05  # 20 Hz


def _dxdt(
    x: np.ndarray,
    inputs: EngineInputs,
    health: np.ndarray,
    config: EngineConfig,
    misfire_mask: np.ndarray,
    combustion_efficiency_override: float | None,
    cylinder_cooling: np.ndarray | None = None,
) -> np.ndarray:
    """Compute the state derivative vector at (x, inputs, health)."""
    omega = max(x[IDX_OMEGA], 1e-3)
    map_pa = x[IDX_MAP_PA]
    cht = x[IDX_CHT0 : IDX_CHT0 + N_CYL]
    coolant_t = x[IDX_COOLANT_T]
    oil_t = x[IDX_OIL_T]
    egt = x[IDX_EGT0 : IDX_EGT0 + N_CYL]

    rpm = omega * 60.0 / (2 * np.pi)

    map_targ = intake.map_target_pa(
        inputs.throttle, inputs.ambient_pressure_pa, config, health[HIDX_TURBO_EFF]
    )
    tau_map = intake.intake_time_constant_s(config)
    dmap_dt = (map_targ - map_pa) / tau_map

    manifold_t = intake.manifold_temp_k(map_pa, inputs.ambient_pressure_pa, inputs.ambient_temp_k)
    injector_health = health[HIDX_INJECTOR0 : HIDX_INJECTOR0 + N_CYL]
    comb = compute_combustion(
        omega,
        map_pa,
        manifold_t,
        inputs.ambient_pressure_pa,
        inputs.ambient_temp_k,
        config,
        health[HIDX_VE_FACTOR],
        injector_health,
        combustion_efficiency_override=combustion_efficiency_override,
        misfire_mask=misfire_mask,
    )

    airflow_factor = cooling.cooling_airflow_factor(
        inputs.ambient_pressure_pa, inputs.ambient_temp_k, inputs.airspeed_mps
    )
    dcht = cooling.dcht_dt(
        cht,
        comb.heat_release_per_cyl_w,
        inputs.ambient_temp_k,
        airflow_factor,
        config,
        health[HIDX_COOLING_EFF],
        cylinder_cooling,
    )
    dcoolant = cooling.dcoolant_dt(
        coolant_t, cht, inputs.ambient_temp_k, airflow_factor, config, health[HIDX_COOLING_EFF]
    )

    friction_power_w = rotational.friction_torque_nm(omega, config, health[HIDX_FRICTION]) * omega
    doil = cooling.doil_temp_dt(
        oil_t, friction_power_w, inputs.ambient_temp_k, airflow_factor, config, health[HIDX_COOLING_EFF]
    )

    domega = rotational.domega_dt(comb.torque_nm, omega, config, health[HIDX_FRICTION])
    degt = (comb.egt_target_k - egt) / config.thermal_masses.egt_lag_time_constant_s

    alt_a = electrical.alternator_output_a(rpm, config, health[HIDX_ALT_EFF])
    dsoc = electrical.dbattery_soc_dt(alt_a, config.electrical.base_load_a, config)

    dx = np.zeros(STATE_DIM)
    dx[IDX_OMEGA] = domega
    dx[IDX_MAP_PA] = dmap_dt
    dx[IDX_CHT0 : IDX_CHT0 + N_CYL] = dcht
    dx[IDX_COOLANT_T] = dcoolant
    dx[IDX_OIL_T] = doil
    dx[IDX_EGT0 : IDX_EGT0 + N_CYL] = degt
    dx[IDX_BATTERY_SOC] = dsoc
    dx[IDX_THETA] = omega
    return dx


class EngineModel:
    """The shared MVEM kernel used by both LIVE and SIMULATION twin modes."""

    def __init__(
        self,
        config: EngineConfig,
        health: np.ndarray | None = None,
        state: np.ndarray | None = None,
        dt: float = DEFAULT_DT_S,
    ) -> None:
        self.config = config
        self.dt = dt
        self.health = (
            health.copy()
            if health is not None
            else nominal_health_vector(config.nominal_health.injector_flow_coeff)
        )
        self.state = (
            state.copy()
            if state is not None
            else initial_state_vector(idle_rpm=config.rating.idle_rpm)
        )
        # Fault-injection hooks (see aerotwin.faults) — no-op by default.
        self.misfire_mask = np.ones(N_CYL)
        # Per-cylinder cooling: fixed shroud geometry (config) x fault-driven local loss.
        self.cylinder_cooling_bias = np.asarray(config.cooling.cylinder_cooling_bias, dtype=float)
        self.cylinder_cooling_factor = np.ones(N_CYL)
        self.vibration_imbalance_severity = 0.0
        self.combustion_efficiency_override: float | None = None

    def step(self, inputs: EngineInputs) -> EngineOutputs:
        """Advance the model by one fixed timestep (RK4) and return outputs."""
        x = self.state
        dt = self.dt
        cyl = self.cylinder_cooling_bias * self.cylinder_cooling_factor
        k1 = _dxdt(x, inputs, self.health, self.config, self.misfire_mask, self.combustion_efficiency_override, cyl)
        k2 = _dxdt(
            x + 0.5 * dt * k1, inputs, self.health, self.config, self.misfire_mask, self.combustion_efficiency_override,
            cyl,
        )
        k3 = _dxdt(
            x + 0.5 * dt * k2, inputs, self.health, self.config, self.misfire_mask, self.combustion_efficiency_override,
            cyl,
        )
        k4 = _dxdt(x + dt * k3, inputs, self.health, self.config, self.misfire_mask, self.combustion_efficiency_override, cyl)
        x_next = x + (dt / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4)
        x_next[IDX_OMEGA] = max(x_next[IDX_OMEGA], 1.0)
        x_next[IDX_BATTERY_SOC] = min(max(x_next[IDX_BATTERY_SOC], 0.0), 1.0)
        x_next[IDX_THETA] = np.mod(x_next[IDX_THETA], 4 * np.pi)
        self.state = x_next
        return self.compute_outputs(inputs)

    def compute_outputs(self, inputs: EngineInputs) -> EngineOutputs:
        """Compute algebraic (non-integrated) outputs from the current state."""
        x = self.state
        health = self.health
        config = self.config
        omega = max(x[IDX_OMEGA], 1e-3)
        map_pa = x[IDX_MAP_PA]
        rpm = omega * 60.0 / (2 * np.pi)

        manifold_t = intake.manifold_temp_k(map_pa, inputs.ambient_pressure_pa, inputs.ambient_temp_k)
        injector_health = health[HIDX_INJECTOR0 : HIDX_INJECTOR0 + N_CYL]
        comb = compute_combustion(
            omega,
            map_pa,
            manifold_t,
            inputs.ambient_pressure_pa,
            inputs.ambient_temp_k,
            config,
            health[HIDX_VE_FACTOR],
            injector_health,
            combustion_efficiency_override=self.combustion_efficiency_override,
            misfire_mask=self.misfire_mask,
        )
        oil_p_kpa = oil_pressure_kpa(rpm, x[IDX_OIL_T], config, health[HIDX_OIL_PUMP_EFF])
        alt_a = electrical.alternator_output_a(rpm, config, health[HIDX_ALT_EFF])
        net_a = alt_a - config.electrical.base_load_a
        bus_v = electrical.bus_voltage_v(x[IDX_BATTERY_SOC], config, net_a)
        injection_timing_deg = config.fuel.base_injection_advance_deg + 0.5 * (rpm / 1000.0)
        vib_rms, vib_bands = vibration.compute_vibration(
            rpm, comb.fuel_per_cyl_kg_s, config, self.vibration_imbalance_severity
        )
        oil_consumption = oil_consumption_l_per_h(rpm, config, health[HIDX_FRICTION], health[HIDX_OIL_PUMP_EFF])
        cool = config.cooling
        coolant_flow = cool.coolant_pump_kg_s_at_rated * rpm / max(config.rating.rated_rpm, 1.0)
        coolant_p = (
            cool.coolant_pressure_fill_kpa
            + cool.coolant_pressure_kpa_per_k * max(float(x[IDX_COOLANT_T]) - cool.coolant_pressure_fill_temp_k, 0.0)
        ) * (0.7 + 0.3 * float(health[HIDX_COOLING_EFF]))

        return EngineOutputs(
            rpm=rpm,
            map_kpa=map_pa / 1000.0,
            cht_k=x[IDX_CHT0 : IDX_CHT0 + N_CYL].copy(),
            egt_k=x[IDX_EGT0 : IDX_EGT0 + N_CYL].copy(),
            oil_pressure_kpa=oil_p_kpa,
            oil_temp_k=float(x[IDX_OIL_T]),
            coolant_temp_k=float(x[IDX_COOLANT_T]),
            fuel_flow_kg_s=comb.fuel_flow_kg_s,
            torque_nm=comb.torque_nm,
            power_w=comb.torque_nm * omega,
            injection_timing_deg=injection_timing_deg,
            alternator_voltage_v=bus_v,
            alternator_current_a=alt_a,
            battery_soc=float(x[IDX_BATTERY_SOC]),
            vibration_rms_g=vib_rms,
            vibration_bands_g=vib_bands,
            oil_consumption_l_h=oil_consumption,
            coolant_mass_flow_kg_s=coolant_flow,
            coolant_pressure_kpa=coolant_p,
        )
