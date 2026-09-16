"""Mission go/no-go analysis: simulate the requested mission on the twin,
starting from the engine's current estimated health, with a Monte Carlo
sweep over health-estimate uncertainty.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from aerotwin.physics.state import HEALTH_DIM
from aerotwin.simulation.mission import MissionConfig, MissionRunner
from aerotwin.twin.config import EngineConfig

DEFAULT_MC_SAMPLES = 12
DEFAULT_HEALTH_STD = 0.05
DEFAULT_MAX_DURATION_S = 2700.0  # cap interactive risk checks to a 45-minute representative window

LIMIT_CHECKS = [
    ("cht_1_k", "max", "max_cht_k", "CHT"),
    ("cht_2_k", "max", "max_cht_k", "CHT"),
    ("cht_3_k", "max", "max_cht_k", "CHT"),
    ("cht_4_k", "max", "max_cht_k", "CHT"),
    ("egt_1_k", "max", "max_egt_k", "EGT"),
    ("egt_2_k", "max", "max_egt_k", "EGT"),
    ("egt_3_k", "max", "max_egt_k", "EGT"),
    ("egt_4_k", "max", "max_egt_k", "EGT"),
    ("oil_temp_k", "max", "max_oil_temp_k", "oil temperature"),
    ("oil_pressure_kpa", "min", "min_oil_pressure_kpa", "oil pressure"),
    ("coolant_temp_k", "max", "max_coolant_temp_k", "coolant temperature"),
]

NO_GO_PROBABILITY = 0.3
CAUTION_PROBABILITY = 0.05


@dataclass
class LimitMargin:
    """Monte Carlo summary for one operating limit."""

    channel: str
    label: str
    limit: float
    kind: str  # "max" or "min"
    worst_case_value: float
    mean_value: float
    probability_exceeded: float


@dataclass
class MissionRiskResult:
    """Full go/no-go analysis result."""

    verdict: str  # "GO" | "CAUTION" | "NO-GO"
    reasons: list[str]
    margins: list[LimitMargin] = field(default_factory=list)
    n_monte_carlo: int = 0


def _perturb_health(health: np.ndarray, rng: np.random.Generator, std: float) -> np.ndarray:
    noise = rng.normal(0.0, std, size=HEALTH_DIM)
    return np.clip(health + noise, 0.05, 1.8)


def run_mission_go_no_go(
    engine_config: EngineConfig,
    mission: MissionConfig,
    current_health: np.ndarray,
    n_monte_carlo: int = DEFAULT_MC_SAMPLES,
    health_uncertainty_std: float = DEFAULT_HEALTH_STD,
    max_duration_s: float = DEFAULT_MAX_DURATION_S,
    seed: int = 0,
) -> MissionRiskResult:
    """Run a Monte Carlo go/no-go check for `mission` starting from `current_health`."""
    rng = np.random.default_rng(seed)
    per_channel_values: dict[str, list[float]] = {c: [] for c, *_ in LIMIT_CHECKS}

    for _ in range(n_monte_carlo):
        health_sample = _perturb_health(current_health, rng, health_uncertainty_std)
        runner = MissionRunner(engine_config, mission, initial_health=health_sample)
        df = runner.run(log_interval_s=2.0, max_duration_s=max_duration_s)
        for channel, kind, _, _ in LIMIT_CHECKS:
            if channel not in df.columns:
                continue
            value = df[channel].max() if kind == "max" else df[channel].min()
            per_channel_values[channel].append(float(value))

    margins: list[LimitMargin] = []
    reasons: list[str] = []
    worst_prob = 0.0

    for channel, kind, limit_attr, label in LIMIT_CHECKS:
        values = per_channel_values.get(channel, [])
        if not values:
            continue
        limit = getattr(engine_config.limits, limit_attr)
        values_arr = np.array(values)
        if kind == "max":
            exceed_frac = float(np.mean(values_arr >= limit))
            worst_case = float(values_arr.max())
        else:
            exceed_frac = float(np.mean(values_arr <= limit))
            worst_case = float(values_arr.min())
        margins.append(
            LimitMargin(
                channel=channel, label=label, limit=limit, kind=kind,
                worst_case_value=worst_case, mean_value=float(values_arr.mean()),
                probability_exceeded=exceed_frac,
            )
        )
        worst_prob = max(worst_prob, exceed_frac)
        if exceed_frac > CAUTION_PROBABILITY:
            reasons.append(
                f"{label} ({channel}) predicted to {'exceed' if kind == 'max' else 'fall below'} "
                f"limit {limit:.0f} in {exceed_frac * 100:.0f}% of Monte Carlo runs "
                f"(worst case {worst_case:.0f})"
            )

    if worst_prob > NO_GO_PROBABILITY:
        verdict = "NO-GO"
    elif worst_prob > CAUTION_PROBABILITY:
        verdict = "CAUTION"
    else:
        verdict = "GO"
        reasons.append("All monitored limits stay within margin across the Monte Carlo sweep.")

    return MissionRiskResult(verdict=verdict, reasons=reasons, margins=margins, n_monte_carlo=n_monte_carlo)
