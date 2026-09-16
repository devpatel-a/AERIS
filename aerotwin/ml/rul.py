"""Remaining Useful Life (RUL): exponential degradation model + particle filter.

Fits `degradation(t) = exp(log_d0 + k * t)` where `degradation = 100 - health_index`,
using a particle filter over `(log_d0, k)` so that each new health-index
observation refines the belief, and the ensemble of particles' implied
time-to-failure gives a mean and 90% interval in engine hours.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

FAILURE_INDEX_THRESHOLD = 20.0  # health index considered "failed" (CRITICAL floor)
N_PARTICLES = 500


@dataclass
class RulEstimate:
    """A single RUL estimate: mean and 90% bounds, in engine hours."""

    mean_hours: float
    p05_hours: float
    p95_hours: float
    current_index: float


class RulParticleFilter:
    """Online particle filter tracking exponential-degradation parameters."""

    def __init__(self, seed: int = 0, n_particles: int = N_PARTICLES) -> None:
        rng = np.random.default_rng(seed)
        self.rng = rng
        self.n = n_particles
        self.log_d0 = rng.normal(np.log(2.0), 1.0, size=n_particles)
        self.k = np.abs(rng.normal(0.001, 0.001, size=n_particles))
        self.weights = np.ones(n_particles) / n_particles
        self.t0: float | None = None

    def update(self, t_s: float, health_index: float, obs_noise: float = 5.0) -> None:
        """Incorporate one new (time, health_index) observation."""
        if self.t0 is None:
            self.t0 = t_s
        dt = max(t_s - self.t0, 0.0)
        deg_obs = max(100.0 - health_index, 0.1)

        # small random walk on parameters (process noise) then reweight by likelihood
        self.log_d0 += self.rng.normal(0, 0.02, size=self.n)
        self.k = np.clip(self.k + self.rng.normal(0, 1e-5, size=self.n), 1e-6, 0.05)

        deg_pred = np.exp(self.log_d0 + self.k * dt)
        likelihood = np.exp(-0.5 * ((deg_pred - deg_obs) / obs_noise) ** 2)
        self.weights *= likelihood + 1e-12
        self.weights /= self.weights.sum()

        ess = 1.0 / np.sum(self.weights**2)
        if ess < self.n / 2:
            idx = self.rng.choice(self.n, size=self.n, p=self.weights)
            self.log_d0 = self.log_d0[idx]
            self.k = self.k[idx]
            self.weights = np.ones(self.n) / self.n

    def estimate_rul(self, t_s: float, health_index: float) -> RulEstimate:
        """Return the current RUL estimate (mean + 90% bounds) in engine hours."""
        dt = max(t_s - (self.t0 or t_s), 0.0)
        deg_fail = 100.0 - FAILURE_INDEX_THRESHOLD
        # time-to-failure per particle: exp(log_d0 + k*t_fail) = deg_fail
        with np.errstate(divide="ignore", invalid="ignore"):
            t_fail = (np.log(deg_fail) - self.log_d0) / np.where(self.k > 1e-9, self.k, np.nan)
        rul_s = np.clip(t_fail - dt, 0.0, None)
        rul_s = rul_s[np.isfinite(rul_s)]
        if len(rul_s) == 0:
            rul_s = np.array([0.0])
        rul_hours = rul_s / 3600.0
        return RulEstimate(
            mean_hours=float(np.mean(rul_hours)),
            p05_hours=float(np.percentile(rul_hours, 5)),
            p95_hours=float(np.percentile(rul_hours, 95)),
            current_index=health_index,
        )


def fit_rul_trajectory(t_s: np.ndarray, health_index: np.ndarray, seed: int = 0) -> list[RulEstimate]:
    """Run the particle filter over a full health-index trajectory; returns one estimate per step."""
    pf = RulParticleFilter(seed=seed)
    estimates = []
    for t, idx in zip(t_s, health_index, strict=True):
        pf.update(float(t), float(idx))
        estimates.append(pf.estimate_rul(float(t), float(idx)))
    return estimates
