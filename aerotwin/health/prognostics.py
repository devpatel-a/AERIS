"""Engine-lifetime prognostics: Remaining Useful Life (engine hours) until the
overall health index reaches the maintenance threshold.

Model: the health index declines linearly with engine hours over the tail's
recent sorties (plus the live point during a flight), fitted by least squares.
A residual bootstrap gives the 90% interval. The trend must be statistically
real (slope below zero by more than two standard errors); otherwise, or when
the projection is beyond it, RUL is capped at the configured horizon (TBO).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import yaml

DEFAULT_MAINTENANCE_PATH = Path(__file__).resolve().parents[2] / "configs" / "maintenance" / "maintenance.yaml"


@dataclass
class PrognosticsConfig:
    """Prognostics settings (configs/maintenance/maintenance.yaml `prognostics`)."""

    model: str = "Linear degradation trend · bootstrap 90% CI"
    threshold_index: float = 70.0
    horizon_cap_hours: float = 2000.0
    window_missions: int = 12

    @classmethod
    def load(cls, path: Path = DEFAULT_MAINTENANCE_PATH) -> PrognosticsConfig:
        with path.open() as f:
            return cls(**(yaml.safe_load(f).get("prognostics") or {}))


@dataclass
class RulPrognosis:
    """Lifetime RUL estimate plus the curve the Diagnostics RUL chart draws."""

    rul_mean_hours: float | None
    rul_p05_hours: float | None
    rul_p95_hours: float | None
    engine_hours_now: float
    health_index_now: float | None
    threshold_index: float
    model: str
    degradation_rate_per_hour: float | None  # d(health index)/d(engine hour), negative = degrading
    history: list[dict[str, float]] = field(default_factory=list)  # [{engine_hours, health_index}]
    projection: list[dict[str, float]] = field(default_factory=list)  # [{engine_hours, mean, p05, p95}]


def _fit(h: np.ndarray, hi: np.ndarray) -> tuple[float, float, float]:
    """Least-squares fit hi = a + b*h. Returns (a, b, standard error of b)."""
    if len(h) < 3 or np.ptp(h) < 1e-6:
        return float(hi[-1]), 0.0, float("inf")
    b, a = np.polyfit(h, hi, 1)
    resid = hi - (a + b * h)
    se = float(np.sqrt(np.sum(resid**2) / max(len(h) - 2, 1) / np.sum((h - h.mean()) ** 2)))
    return float(a), float(b), se


def _hours_to_threshold(a: float, b: float, h_now: float, threshold: float, cap: float) -> float:
    if b >= 0.0:
        return cap
    return float(np.clip((threshold - a) / b - h_now, 0.0, cap))


def prognose(
    engine_hours: list[float],
    health_index: list[float],
    config: PrognosticsConfig | None = None,
    n_bootstrap: int = 300,
    seed: int = 0,
) -> RulPrognosis:
    """Fit the degradation trend over (engine_hours, health_index) points and project RUL."""
    cfg = config or PrognosticsConfig()
    h = np.asarray(engine_hours, dtype=float)
    hi = np.asarray(health_index, dtype=float)
    history = [{"engine_hours": float(x), "health_index": float(y)} for x, y in zip(h, hi, strict=True)]
    if len(h) == 0:
        return RulPrognosis(None, None, None, 0.0, None, cfg.threshold_index, cfg.model, None)

    h_now = float(h[-1])
    window = slice(max(0, len(h) - cfg.window_missions), len(h))
    hw, yw = h[window], hi[window]
    a, b, se = _fit(hw, yw)
    significant = b < 0.0 and -b > 2.0 * se
    mean = _hours_to_threshold(a, b, h_now, cfg.threshold_index, cfg.horizon_cap_hours) if significant else cfg.horizon_cap_hours

    samples = np.array([mean])
    if significant:
        rng = np.random.default_rng(seed)
        fitted = a + b * hw
        resid = yw - fitted
        boot = []
        for _ in range(n_bootstrap):
            bb, ab = np.polyfit(hw, fitted + rng.choice(resid, size=len(resid), replace=True), 1)
            boot.append(_hours_to_threshold(float(ab), float(bb), h_now, cfg.threshold_index, cfg.horizon_cap_hours))
        samples = np.array(boot)
    rate = b if significant else 0.0

    projection = []
    horizon = min(max(mean * 1.15, 50.0), cfg.horizon_cap_hours)
    lo_b = b - 1.645 * se if significant else rate
    hi_b = min(b + 1.645 * se, 0.0) if significant else rate
    base = a + b * h_now if significant else float(hi[-1])
    for step in np.linspace(0.0, horizon, 16):
        m = base + rate * float(step)
        p05, p95 = base + lo_b * float(step), base + hi_b * float(step)
        projection.append({"engine_hours": h_now + float(step), "mean": m, "p05": min(p05, p95), "p95": min(100.0, max(p05, p95))})

    return RulPrognosis(
        rul_mean_hours=float(mean),
        rul_p05_hours=float(np.percentile(samples, 5)),
        rul_p95_hours=float(np.percentile(samples, 95)),
        engine_hours_now=h_now,
        health_index_now=float(hi[-1]),
        threshold_index=cfg.threshold_index,
        model=cfg.model,
        degradation_rate_per_hour=rate,
        history=history,
        projection=projection,
    )
