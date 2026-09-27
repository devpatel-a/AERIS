"""Mission Planner (GO / NO-GO): run the requested mission on the digital twin,
from the airframe's current estimated health, over the full mission length.

- central run (current health) -> predicted CHT / oil-temp / MAP trajectories,
  first CHT limit breach (time + mission phase)
- Monte Carlo over health-estimate uncertainty -> probability of CHT exceedance,
  oil-temperature buffer violation and MAP overboost
- mitigation re-runs: "GO with condition" (cooler ambient or reduced power) and
  "GO after maintenance" (degraded parameters restored to nominal)
- environmental factors at cruise: OAT, density altitude, headwind

Runs are independent, so they execute in parallel worker processes.
"""

from __future__ import annotations

import math
import os
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass
from typing import Any

import numpy as np

from aerotwin.physics.atmosphere import isa_pressure_temp
from aerotwin.physics.state import HEALTH_NAMES, HIDX_COOLING_EFF, nominal_health_vector
from aerotwin.simulation.mission import MissionConfig, MissionRunner
from aerotwin.twin.config import EngineConfig, EngineRegistry

PLAN_DT_S = 1.0  # coarsest stable physics step (see docs/DECISIONS.md)
LOG_S = 60.0
N_MONTE_CARLO = 5
HEALTH_STD = 0.03
NO_GO_P = 0.3
CAUTION_P = 0.05
FIXED_SEGMENTS = {"taxi", "takeoff", "climb", "descent", "landing"}
HOT_DAY_CAP_C = 30.0
KT_PER_MPS = 1.943844

_REGISTRY: EngineRegistry | None = None


def _engine(engine_id: str) -> EngineConfig:
    global _REGISTRY
    if _REGISTRY is None:
        _REGISTRY = EngineRegistry()
    return _REGISTRY.get(engine_id)


def _init_worker() -> None:
    # One BLAS thread per worker process: runs are pure-Python physics, and
    # oversubscribing threads across processes only adds contention.
    os.environ["OMP_NUM_THREADS"] = "1"


def _run(engine_id: str, mission_json: str, health: list[float]) -> dict[str, list]:
    """Worker: simulate one mission variant at PLAN_DT_S, logged every LOG_S."""
    config = _engine(engine_id)
    mission = MissionConfig.model_validate_json(mission_json)
    runner = MissionRunner(config, mission, dt=PLAN_DT_S, initial_health=np.array(health))
    df = runner.run(log_interval_s=LOG_S)
    cols = ["t_s", "segment", "altitude_m", "oil_temp_k", "map_kpa", "coolant_temp_k", *[f"cht_{i}_k" for i in range(1, 5)]]
    return {c: df[c].tolist() for c in cols}


@dataclass
class PlanRequest:
    engine_id: str
    mission: MissionConfig
    health: np.ndarray
    cruise_altitude_m: float | None
    duration_h: float | None
    surface_temp_c: float | None
    airspeed_ktas: float | None
    power_pct_mcp: float | None


def build_mission(req: PlanRequest, config: EngineConfig) -> MissionConfig:
    """Apply the planner's parameter overrides to a preset mission."""
    isa_dev = None if req.surface_temp_c is None else req.surface_temp_c - 15.0
    mission = req.mission.with_overrides(req.cruise_altitude_m, isa_dev)
    if req.cruise_altitude_m is not None:
        # The climb must end at the requested station altitude, not the preset's.
        for s in mission.segments:
            if s.name == "climb":
                s.target_altitude_m = req.cruise_altitude_m
    work = [s for s in mission.segments if s.name not in FIXED_SEGMENTS]
    if req.duration_h is not None and work:
        fixed = sum(s.duration_s for s in mission.segments if s.name in FIXED_SEGMENTS)
        scale = max(req.duration_h * 3600.0 - fixed, 600.0) / sum(s.duration_s for s in work)
        for s in work:
            s.duration_s *= scale
    for s in work:
        if req.airspeed_ktas is not None:
            s.target_airspeed_mps = req.airspeed_ktas / KT_PER_MPS
        if req.power_pct_mcp is not None:
            mcp = config.rating.max_continuous_power_w or config.rating.rated_power_w
            s.throttle = float(np.clip(req.power_pct_mcp / 100.0 * mcp / config.rating.rated_power_w, 0.2, 1.0))
        if req.cruise_altitude_m is not None:
            s.target_altitude_m = req.cruise_altitude_m
    return mission


def _hot(run: dict[str, list]) -> np.ndarray:
    return np.max(np.array([run[f"cht_{i}_k"] for i in range(1, 5)]), axis=0)


def _hottest_cyl(run: dict[str, list]) -> int:
    peaks = [max(run[f"cht_{i}_k"]) for i in range(1, 5)]
    return int(np.argmax(peaks)) + 1


def _breach(run: dict[str, list], limit: float) -> dict[str, Any] | None:
    hot = _hot(run)
    idx = np.nonzero(hot >= limit)[0]
    if len(idx) == 0:
        return None
    i = int(idx[0])
    return {"t_s": run["t_s"][i], "segment": run["segment"][i], "cylinder": _hottest_cyl(run), "value_k": float(hot[i])}


def environment_factors(mission: MissionConfig, config: EngineConfig) -> dict[str, float]:
    """OAT and density altitude at the cruise station, plus mission headwind."""
    work = [s for s in mission.segments if s.name not in FIXED_SEGMENTS] or mission.segments
    cruise = max(work, key=lambda s: s.duration_s)
    isa_dev = cruise.isa_deviation_k if cruise.isa_deviation_k is not None else mission.environment.base_isa_deviation_k
    p, t = isa_pressure_temp(cruise.target_altitude_m, isa_dev)
    rho = p / (287.05 * t)
    # Density altitude from the ISA troposphere density-altitude relation.
    density_alt = 44330.8 * (1.0 - (rho / 1.225) ** 0.234969)
    return {
        "cruise_altitude_m": cruise.target_altitude_m,
        "oat_cruise_c": t - 273.15,
        "density_altitude_m": density_alt,
        "headwind_kts": mission.environment.headwind_mps * KT_PER_MPS,
        "isa_deviation_k": isa_dev,
    }


def evaluate(req: PlanRequest, workers: int | None = None) -> dict[str, Any]:
    """Full planner evaluation (central + Monte Carlo + mitigations), in parallel."""
    config = _engine(req.engine_id)
    mission = build_mission(req, config)
    limits = config.limits
    rng = np.random.default_rng(0)

    restored = req.health.copy()
    nominal = nominal_health_vector(config.nominal_health.injector_flow_coeff)
    restored = np.where(restored < nominal, nominal, restored)

    condition_req = PlanRequest(**{**req.__dict__})
    surface_c = req.surface_temp_c if req.surface_temp_c is not None else 15.0 + mission.environment.base_isa_deviation_k
    hot_day = surface_c > HOT_DAY_CAP_C
    if hot_day:
        condition_req.surface_temp_c = HOT_DAY_CAP_C
        condition_text = f"Ambient surface temp ≤ {HOT_DAY_CAP_C:.0f} °C."
    else:
        condition_req.power_pct_mcp = max((req.power_pct_mcp or 75.0) - 10.0, 40.0)
        condition_text = f"Power setting reduced to {condition_req.power_pct_mcp:.0f}% MCP."
    condition_mission = build_mission(condition_req, config)

    jobs: list[tuple[str, MissionConfig, np.ndarray]] = [
        ("central", mission, req.health),
        ("maintenance", mission, restored),
        ("condition", condition_mission, req.health),
    ]
    for k in range(N_MONTE_CARLO):
        noise = rng.normal(0.0, HEALTH_STD, size=len(req.health))
        jobs.append((f"mc{k}", mission, np.clip(req.health + noise, 0.05, 1.8)))

    # Spawned workers inherit the environment at creation: pin one BLAS thread
    # each before they import numpy (restored afterwards for this process).
    saved = os.environ.get("OMP_NUM_THREADS")
    os.environ["OMP_NUM_THREADS"] = "1"
    try:
        with ProcessPoolExecutor(max_workers=workers or min(len(jobs), os.cpu_count() or 2), initializer=_init_worker) as pool:
            futures = {name: pool.submit(_run, req.engine_id, m.model_dump_json(), h.tolist()) for name, m, h in jobs}
            results = {name: f.result() for name, f in futures.items()}
    finally:
        if saved is None:
            os.environ.pop("OMP_NUM_THREADS", None)
        else:
            os.environ["OMP_NUM_THREADS"] = saved

    central = results["central"]
    mc = [results[f"mc{k}"] for k in range(N_MONTE_CARLO)] + [central]
    p_cht = float(np.mean([_hot(r).max() >= limits.max_cht_k for r in mc]))
    oil_ceiling = limits.max_oil_temp_k - limits.oil_temp_buffer_k
    p_oil = float(np.mean([max(r["oil_temp_k"]) >= oil_ceiling for r in mc]))
    p_map = float(np.mean([max(r["map_kpa"]) >= limits.max_map_kpa for r in mc]))
    worst = max(p_cht, p_oil, p_map)
    breach = _breach(central, limits.max_cht_k)
    if worst > NO_GO_P or breach is not None:
        verdict, confidence = "NO-GO", max(p_cht, p_oil, p_map)
    elif worst > CAUTION_P:
        verdict, confidence = "CAUTION", worst
    else:
        verdict, confidence = "GO", 1.0 - worst

    oil_margin = limits.max_oil_temp_k - max(central["oil_temp_k"])
    causes = []
    if breach is not None:
        causes.append({
            "severity": "warning",
            "text": f"Predicted Cylinder {breach['cylinder']} CHT exceeds {limits.max_cht_k - 273.15:.0f} °C thermal limit",
            "t_s": breach["t_s"], "segment": breach["segment"],
        })
    if oil_margin < limits.oil_temp_buffer_k:
        causes.append({
            "severity": "warning",
            "text": f"Oil temperature margin drops below minimum buffer ({oil_margin:.1f} °C remaining vs "
                    f"{limits.oil_temp_buffer_k:.1f} °C required safe contingency).",
        })
    cooling = float(req.health[HIDX_COOLING_EFF])
    if cooling < 0.97:
        causes.append({
            "severity": "problem",
            "text": f"Cooling subsystem effectiveness degraded {(1 - cooling) * 100:.0f}% in current physical twin state.",
        })
    degraded = [
        (name, float(v)) for name, v, n in zip(HEALTH_NAMES, req.health, nominal, strict=True)
        if name != "cooling_effectiveness" and abs(v - n) / max(n, 1e-6) > 0.05
    ]
    for name, v in degraded[:2]:
        causes.append({"severity": "problem", "text": f"{name.replace('_', ' ').capitalize()} at {v:.2f} in current twin state."})

    cond_breach = _breach(results["condition"], limits.max_cht_k)
    maint_breach = _breach(results["maintenance"], limits.max_cht_k)
    mitigations = [
        {
            "kind": "condition", "title": "GO with Condition", "condition": condition_text,
            "verdict": "CAUTION" if cond_breach is None else "NO-GO",
            "breach_t_s": cond_breach["t_s"] if cond_breach else None,
            "outcome": (f"Delays cylinder thermal runaway to {cond_breach['t_s'] / 3600:.1f}h."
                        if cond_breach else "No CHT limit breach over the full mission."),
        },
        {
            "kind": "maintenance", "title": "GO after Maintenance",
            "condition": "Restore degraded parameters to nominal"
                         + (f" (recover {(1 - cooling) * 100:.0f}% cooling margin)." if cooling < 0.97 else "."),
            "verdict": "GO" if maint_breach is None else "CAUTION",
            "breach_t_s": maint_breach["t_s"] if maint_breach else None,
            "outcome": "No CHT limit breach over the full mission." if maint_breach is None
                       else f"Breach still predicted at {maint_breach['t_s'] / 3600:.1f}h.",
        },
    ]

    hot_cyl = _hottest_cyl(central)
    segments = []
    for i, seg in enumerate(central["segment"]):
        if not segments or segments[-1]["name"] != seg:
            segments.append({"name": seg, "start_s": central["t_s"][i], "end_s": central["t_s"][i]})
        segments[-1]["end_s"] = central["t_s"][i]

    return {
        "verdict": verdict,
        "confidence": confidence,
        "breach": breach,
        "root_causes": causes,
        "mitigations": mitigations,
        "risks": [
            {"key": "cht", "label": "CHT Exceedance", "probability": p_cht},
            {"key": "oil", "label": "Oil Temp Buffer", "probability": p_oil},
            {"key": "map", "label": "MAP Overboost", "probability": p_map},
        ],
        "environment": environment_factors(mission, config),
        "profile": {"t_s": central["t_s"], "altitude_m": central["altitude_m"], "segments": segments},
        "curves": {
            "t_s": central["t_s"],
            "cht_hot_k": central[f"cht_{hot_cyl}_k"],
            "hot_cylinder": hot_cyl,
            "cht_baseline_k": results["maintenance"][f"cht_{hot_cyl}_k"],
            "oil_temp_k": central["oil_temp_k"],
        },
        "limits": {"max_cht_k": limits.max_cht_k, "cht_target_k": limits.cht_target_k, "max_oil_temp_k": limits.max_oil_temp_k},
        "mission_duration_s": mission.total_duration_s,
        "n_monte_carlo": len(mc),
        "twin_model_version": f"AERO-TWIN-{_version()}-{config.engine_id.upper().replace('_LIKE', '')}",
        "cooling_effectiveness": cooling,
    }


def _version() -> str:
    try:
        from importlib.metadata import version

        return "v" + version("aerotwin")
    except Exception:
        return "v0"


def density_altitude_m(altitude_m: float, isa_dev_k: float) -> float:
    """Density altitude for a given pressure altitude and ISA deviation."""
    p, t = isa_pressure_temp(altitude_m, isa_dev_k)
    rho = p / (287.05 * t)
    return 44330.8 * (1.0 - (rho / 1.225) ** 0.234969) if rho > 0 else math.nan
