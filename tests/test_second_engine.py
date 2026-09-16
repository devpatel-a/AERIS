"""Generalization proof (M9): the full pipeline works with a second engine
(naturally-aspirated, air-cooled, carbureted) via config alone — no code changes.
"""

from __future__ import annotations

from aerotwin.faults.injector import FaultInjector
from aerotwin.faults.specs import FaultSpec
from aerotwin.physics.state import HIDX_COOLING_EFF, EngineInputs, nominal_health_vector
from aerotwin.simulation.mission import (
    EnvironmentConfig,
    MissionConfig,
    MissionRunner,
    SegmentConfig,
)
from aerotwin.simulation.risk import run_mission_go_no_go
from aerotwin.twin.config import EngineRegistry
from aerotwin.twin.digital_twin import DigitalTwin


def test_registry_loads_both_engines():
    """Both engines should be discoverable via the same registry."""
    registry = EngineRegistry()
    ids = registry.list_engines()
    assert "rotax914_like" in ids
    assert "na_carbureted_like" in ids

    cfg = registry.get("na_carbureted_like")
    assert cfg.turbo.present is False
    assert cfg.cooling.type == "air_cooled"
    assert cfg.fuel.system_type == "carburetor"


def test_na_engine_reaches_steady_state_and_stays_within_limits():
    """WOT should settle near rated RPM/power without exceeding configured limits."""
    from aerotwin.physics.engine_model import EngineModel

    config = EngineRegistry().get("na_carbureted_like")
    model = EngineModel(config)
    inputs = EngineInputs(
        throttle=1.0, ambient_pressure_pa=101325.0, ambient_temp_k=288.15, altitude_m=0.0, airspeed_mps=40.0
    )
    out = None
    for _ in range(int(400 / model.dt)):
        out = model.step(inputs)

    assert abs(out.rpm - config.rating.rated_rpm) < 200.0
    assert out.map_kpa <= config.limits.max_map_kpa + 1.0
    assert out.cht_k.max() < config.limits.max_cht_k
    assert out.egt_k.max() < config.limits.max_egt_k
    assert out.oil_pressure_kpa >= config.limits.min_oil_pressure_kpa


def test_na_engine_mission_and_fault_injection():
    """A mission with an injected fault should run end-to-end on the second engine."""
    config = EngineRegistry().get("na_carbureted_like")
    mission = MissionConfig(
        mission_id="na_test", display_name="na test",
        environment=EnvironmentConfig(base_isa_deviation_k=0.0),
        segments=[
            SegmentConfig(name="cruise", duration_s=200.0, target_altitude_m=500.0,
                           target_airspeed_mps=30.0, throttle=0.7),
        ],
    )
    runner = MissionRunner(config, mission)
    injector = FaultInjector(
        [FaultSpec(fault_type="cooling_degradation", onset_s=0.0, profile="step", severity=0.5)], seed=0
    )
    df = runner.run(log_interval_s=1.0, step_callback=injector.step_callback)
    df = injector.postprocess(df)
    assert len(df) > 0
    assert "measured_cht_1_k" in df.columns
    assert (df["fault_type"] == "cooling_degradation").all()


def test_na_engine_digital_twin_and_go_no_go():
    """The DigitalTwin and mission-risk pipeline should both work unmodified on the second engine."""
    config = EngineRegistry().get("na_carbureted_like")
    twin = DigitalTwin(config, dt=0.05)
    assert twin.model.health.shape[0] == 10

    healthy = nominal_health_vector(config.nominal_health.injector_flow_coeff)
    degraded = healthy.copy()
    degraded[HIDX_COOLING_EFF] = 0.4

    mission = MissionConfig(
        mission_id="na_risk", display_name="na risk",
        environment=EnvironmentConfig(base_isa_deviation_k=25.0),
        segments=[
            SegmentConfig(name="climb", duration_s=300.0, target_altitude_m=800.0,
                           target_airspeed_mps=25.0, throttle=0.95),
        ],
    )
    result = run_mission_go_no_go(config, mission, degraded, n_monte_carlo=3, max_duration_s=300.0)
    assert result.verdict in {"GO", "CAUTION", "NO-GO"}
    assert len(result.margins) > 0
