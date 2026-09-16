"""Residual computation, normalization, and EWMA/CUSUM change detection.

Anomaly detection must run on residuals (observed - expected), never on raw
values — this module is the shared place that produces them.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from aerotwin.twin.estimator import MEASUREMENT_NOISE_STD

# Normalize each channel's raw residual by its expected measurement-noise
# scale, so a "1.0" normalized residual means "about one sensor-noise sigma"
# regardless of the channel's physical units — this is the "operating
# context" normalization the spec asks for, kept simple: noise-scale rather
# than a full operating-envelope model.
NORMALIZATION_SCALE = MEASUREMENT_NOISE_STD


def compute_residuals(measured: dict[str, float], expected: dict[str, float]) -> dict[str, float]:
    """Return {channel: observed - expected} for every channel present in both."""
    return {c: measured[c] - expected[c] for c in expected if c in measured}


def normalize_residuals(residuals: dict[str, float]) -> dict[str, float]:
    """Scale each residual by its channel's measurement-noise sigma."""
    out = {}
    for c, r in residuals.items():
        scale = NORMALIZATION_SCALE.get(c, 1.0) or 1.0
        out[c] = r / scale
    return out


@dataclass
class EwmaCusumDetector:
    """Per-channel EWMA smoothing + two-sided CUSUM change detection."""

    alpha: float = 0.1
    threshold: float = 5.0
    drift: float = 0.5
    _ewma: dict[str, float] = field(default_factory=dict)
    _cusum_pos: dict[str, float] = field(default_factory=dict)
    _cusum_neg: dict[str, float] = field(default_factory=dict)

    def update(self, normalized_residuals: dict[str, float]) -> dict[str, bool]:
        """Update EWMA/CUSUM state for each channel; return {channel: alarm_active}."""
        alarms: dict[str, bool] = {}
        for c, r in normalized_residuals.items():
            prev = self._ewma.get(c, 0.0)
            ewma = self.alpha * r + (1 - self.alpha) * prev
            self._ewma[c] = ewma

            pos = max(0.0, self._cusum_pos.get(c, 0.0) + ewma - self.drift)
            neg = min(0.0, self._cusum_neg.get(c, 0.0) + ewma + self.drift)
            self._cusum_pos[c] = pos
            self._cusum_neg[c] = neg
            alarms[c] = pos > self.threshold or -neg > self.threshold
        return alarms

    def ewma_value(self, channel: str) -> float:
        """Current EWMA-smoothed normalized residual for `channel`."""
        return self._ewma.get(channel, 0.0)

    def reset(self, channel: str | None = None) -> None:
        """Reset CUSUM accumulators (e.g. after an acknowledged alert), one channel or all."""
        if channel is None:
            self._cusum_pos.clear()
            self._cusum_neg.clear()
        else:
            self._cusum_pos.pop(channel, None)
            self._cusum_neg.pop(channel, None)


# Channels expected to move together under a common-mode *engine* fault;
# a single channel deviating while its group siblings stay quiet points to
# a *sensor* fault on that one channel instead (analytical redundancy).
CORRELATED_GROUPS: dict[str, list[str]] = {
    "cht": ["cht_1_k", "cht_2_k", "cht_3_k", "cht_4_k"],
    "egt": ["egt_1_k", "egt_2_k", "egt_3_k", "egt_4_k"],
}


def classify_fault_locus(
    normalized_residuals: dict[str, float], groups: dict[str, list[str]] = CORRELATED_GROUPS,
    odd_one_out_ratio: float = 3.0, group_alarm_threshold: float = 2.0,
) -> dict[str, str]:
    """Classify each grouped channel as "sensor", "engine", or "nominal".

    A channel is a likely *sensor* fault if its |normalized residual| is far
    larger than the group median while the rest of the group stays quiet
    (analytical redundancy: correlated channels + the estimator disagree
    with just this one channel). If the whole group moves together, it's an
    *engine* fault (common-mode), not attributed to any single sensor.
    """
    result: dict[str, str] = {}
    for _, channels in groups.items():
        mags = {c: abs(normalized_residuals.get(c, 0.0)) for c in channels}
        values = np.array(list(mags.values()))
        median = float(np.median(values))
        for c, mag in mags.items():
            others_median = float(np.median([v for cc, v in mags.items() if cc != c])) or 1e-6
            if mag > group_alarm_threshold and mag > odd_one_out_ratio * others_median:
                result[c] = "sensor"
            elif median > group_alarm_threshold:
                result[c] = "engine"
            else:
                result[c] = "nominal"
    return result
