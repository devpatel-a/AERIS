"""Pydantic schema and registry for engine definition YAML files.

All physical constants used by the physics layer come from these configs —
never hard-coded in `aerotwin.physics`. See `configs/engines/*.yaml`.
"""

from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel, Field

DEFAULT_ENGINE_CONFIG_DIR = Path(__file__).resolve().parents[2] / "configs" / "engines"


class GeometryConfig(BaseModel):
    """Cylinder geometry and layout."""

    cylinders: int = Field(gt=0)
    firing_order: list[int]
    bore_m: float = Field(gt=0)
    stroke_m: float = Field(gt=0)
    displacement_m3: float = Field(gt=0)
    compression_ratio: float = Field(gt=1)
    layout: str = "inline"


class RatingConfig(BaseModel):
    """Power/RPM rating."""

    rated_power_w: float = Field(gt=0)
    rated_rpm: float = Field(gt=0)
    max_rpm: float = Field(gt=0)
    idle_rpm: float = Field(gt=0)
    max_continuous_power_w: float | None = None  # MCP; defaults to rated power when unset


class TurboConfig(BaseModel):
    """Turbocharger + wastegate parameters. `present=False` selects an NA engine."""

    present: bool = False
    critical_altitude_m: float = 0.0
    wastegate_max_map_kpa: float = 101.3
    spool_time_constant_s: float = 1.0
    turbo_efficiency_nominal: float = 0.7


class CoolingConfig(BaseModel):
    """Cooling architecture. `type` selects liquid/air/hybrid heat rejection."""

    type: str  # "liquid_heads_air_cylinders" | "air_cooled" | "liquid_cooled"
    cooling_effectiveness_nominal: float = 1.0
    coolant_target_k: float = 363.0
    cylinder_ambient_htc_ref: float = 50.0
    # Per-cylinder heat-rejection multipliers (shroud/duct geometry): rear or
    # shielded cylinders reject less heat and run hotter. 1.0 = reference.
    cylinder_cooling_bias: list[float] = Field(default_factory=lambda: [1.0, 1.0, 1.0, 1.0])
    # Engine-driven centrifugal coolant pump: mass flow scales with engine speed.
    coolant_pump_kg_s_at_rated: float = 1.9
    # Sealed pressurized circuit: pressure rises with coolant temperature above
    # fill temperature; coolant-path degradation (loss/blockage) lowers it.
    coolant_pressure_fill_kpa: float = 100.0
    coolant_pressure_fill_temp_k: float = 293.0
    coolant_pressure_kpa_per_k: float = 0.9


class FuelConfig(BaseModel):
    """Fuel delivery system."""

    density_kg_per_l: float = 0.72  # fuel density for volumetric flow display
    max_flow_l_per_h: float = 36.0  # gauge full scale (~takeoff power flow)

    system_type: str  # "injection" | "carburetor"
    stoich_afr: float = 14.7
    injector_flow_coeff_nominal: list[float]
    base_injection_advance_deg: float = 20.0


class VeMapConfig(BaseModel):
    """Volumetric efficiency map VE(rpm, map_kpa), bilinear-interpolated."""

    rpm_breakpoints: list[float]
    map_breakpoints_kpa: list[float]
    ve_table: list[list[float]]


class LimitsConfig(BaseModel):
    """Operating limits used by health monitoring and go/no-go analysis."""

    max_cht_k: float
    max_egt_k: float
    max_oil_temp_k: float
    min_oil_pressure_kpa: float
    max_oil_pressure_kpa: float
    max_map_kpa: float
    min_coolant_temp_k: float
    max_coolant_temp_k: float
    cht_target_k: float | None = None  # normal cruise CHT target (display + health margin nominal)
    cht_caution_k: float | None = None  # caution threshold: CHT above this counts toward exceedance time
    oil_temp_buffer_k: float = 10.0  # minimum safe margin below max oil temp for mission planning


class PropellerConfig(BaseModel):
    """Propeller load model: torque_load = load_coefficient * omega^2."""

    diameter_m: float
    load_coefficient: float
    gear_ratio: float = 1.0
    inertia_kg_m2: float


class ThermalMassesConfig(BaseModel):
    """Lumped thermal capacitances for the cooling model."""

    cylinder_thermal_mass_j_per_k: float
    coolant_thermal_mass_j_per_k: float
    oil_thermal_mass_j_per_k: float
    egt_lag_time_constant_s: float


class LubricationConfig(BaseModel):
    """Oil pressure/temperature model parameters."""

    oil_pump_efficiency_nominal: float = 1.0
    oil_pressure_ref_kpa: float
    oil_pressure_rpm_ref: float
    oil_consumption_nominal_l_per_h: float = 0.015  # at rated rpm, nominal friction


class ElectricalConfig(BaseModel):
    """Alternator and battery model parameters."""

    alternator_efficiency_nominal: float = 0.85
    nominal_bus_voltage_v: float = 28.0
    battery_capacity_ah: float = 15.0
    base_load_a: float = 5.0


class VibrationConfig(BaseModel):
    """Synthetic vibration feature generator parameters."""

    crank_orders: list[float]
    baseline_rms_g: float = 0.1
    misfire_order_gain: float = 2.0
    imbalance_order_gain: float = 2.0
    # Relative amplitude of each firing/structural harmonic above 1x (order -> weight).
    # Normalized so the >1x harmonics together carry the baseline firing energy.
    harmonic_weights: dict[float, float] = Field(default_factory=lambda: {2.0: 1.0})
    # Alarm envelope: nominal band velocity x factor, never below the floor.
    envelope_factor: float = 1.5
    envelope_floor_ips: float = 0.03
    sensor_label: str = "Accelerometer"  # installed vibration pickup (display)


class FrictionConfig(BaseModel):
    """Mechanical friction torque model."""

    friction_factor_nominal: float = 1.0
    friction_torque_ref_nm: float
    friction_rpm_ref: float


class NominalHealthConfig(BaseModel):
    """Nominal (pristine) health-parameter vector for this engine."""

    volumetric_efficiency_factor: float = 1.0
    cooling_effectiveness: float = 1.0
    injector_flow_coeff: list[float]
    friction_factor: float = 1.0
    oil_pump_efficiency: float = 1.0
    turbo_efficiency: float = 1.0
    alternator_efficiency: float = 1.0


class EngineConfig(BaseModel):
    """Top-level, validated engine definition loaded from YAML."""

    engine_id: str
    display_name: str
    short_name: str = ""  # compact class label for headers, e.g. "Rotax 914-class"
    monitor_label: str = ""  # engine-monitor label, e.g. "Rotax 914 Turbocharged"
    geometry: GeometryConfig
    rating: RatingConfig
    turbo: TurboConfig
    cooling: CoolingConfig
    fuel: FuelConfig
    ve_map: VeMapConfig
    limits: LimitsConfig
    operating_ranges: dict[str, list[float]] = Field(default_factory=dict)
    propeller: PropellerConfig
    thermal_masses: ThermalMassesConfig
    lubrication: LubricationConfig
    electrical: ElectricalConfig
    vibration: VibrationConfig
    friction: FrictionConfig
    nominal_health: NominalHealthConfig

    @classmethod
    def from_yaml(cls, path: Path) -> EngineConfig:
        """Load and validate an engine config from a YAML file."""
        with path.open() as f:
            raw = yaml.safe_load(f)
        return cls.model_validate(raw)


class EngineRegistry:
    """Loads and caches every engine YAML found in a config directory."""

    def __init__(self, config_dir: Path | str = DEFAULT_ENGINE_CONFIG_DIR) -> None:
        self.config_dir = Path(config_dir)
        self._engines: dict[str, EngineConfig] = {}
        self._load_all()

    def _load_all(self) -> None:
        for path in sorted(self.config_dir.glob("*.yaml")):
            cfg = EngineConfig.from_yaml(path)
            self._engines[cfg.engine_id] = cfg

    def get(self, engine_id: str) -> EngineConfig:
        """Return the validated config for `engine_id`, raising KeyError if unknown."""
        if engine_id not in self._engines:
            raise KeyError(
                f"Unknown engine_id '{engine_id}'. Available: {sorted(self._engines)}"
            )
        return self._engines[engine_id]

    def list_engines(self) -> list[str]:
        """Return all discovered engine ids."""
        return sorted(self._engines)
