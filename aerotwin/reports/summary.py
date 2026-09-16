"""Post-flight summary metrics shared by the PDF report and (optionally) the dashboard:
time above limits, peak values, anomalies, and health change during the mission.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd

from aerotwin.twin.config import EngineConfig

CHT_COLS = [f"cht_{i}_k" for i in range(1, 5)]
EGT_COLS = [f"egt_{i}_k" for i in range(1, 5)]


@dataclass
class PostFlightSummary:
    """A structured post-flight summary for one stored mission run."""

    duration_hours: float
    n_samples: int
    peak_values: dict[str, float] = field(default_factory=dict)
    time_above_limit_s: dict[str, float] = field(default_factory=dict)
    health_change: dict[str, tuple[float, float]] = field(default_factory=dict)
    faults_observed: list[str] = field(default_factory=list)


def _time_above(df: pd.DataFrame, cols: list[str], limit: float) -> float:
    present = [c for c in cols if c in df.columns]
    if not present or len(df) < 2:
        return 0.0
    dt = float(df["t_s"].diff().median())
    return float((df[present].max(axis=1) >= limit).sum() * dt)


def compute_post_flight_summary(df: pd.DataFrame, config: EngineConfig) -> PostFlightSummary:
    """Compute the full post-flight summary for a mission log DataFrame."""
    duration_hours = (df["t_s"].iloc[-1] - df["t_s"].iloc[0]) / 3600.0 if len(df) else 0.0

    peak_values: dict[str, float] = {}
    if all(c in df.columns for c in CHT_COLS):
        peak_values["max_cht_k"] = float(df[CHT_COLS].max(axis=1).max())
    if all(c in df.columns for c in EGT_COLS):
        peak_values["max_egt_k"] = float(df[EGT_COLS].max(axis=1).max())
    for col in ("oil_temp_k", "coolant_temp_k"):
        if col in df.columns:
            peak_values[f"max_{col}"] = float(df[col].max())
    if "oil_pressure_kpa" in df.columns:
        peak_values["min_oil_pressure_kpa"] = float(df["oil_pressure_kpa"].min())

    time_above_limit_s = {
        "cht": _time_above(df, CHT_COLS, config.limits.max_cht_k),
        "egt": _time_above(df, EGT_COLS, config.limits.max_egt_k),
    }

    health_change: dict[str, tuple[float, float]] = {}
    for col in df.columns:
        if col.startswith("health_"):
            name = col.replace("health_", "")
            health_change[name] = (float(df[col].iloc[0]), float(df[col].iloc[-1]))

    faults_observed: list[str] = []
    if "fault_type" in df.columns:
        faults_observed = sorted(set(df["fault_type"]) - {"healthy"})

    return PostFlightSummary(
        duration_hours=duration_hours,
        n_samples=len(df),
        peak_values=peak_values,
        time_above_limit_s=time_above_limit_s,
        health_change=health_change,
        faults_observed=faults_observed,
    )


def anomaly_windows(df: pd.DataFrame, alarm_cols: list[str] | None = None) -> list[dict[str, float]]:
    """Return contiguous [start_s, end_s] windows where any `*_range_invalid`/alarm flag is set."""
    cols = alarm_cols or [c for c in df.columns if c.endswith("_range_invalid")]
    if not cols or "t_s" not in df.columns:
        return []
    active = df[cols].any(axis=1).to_numpy()
    t = df["t_s"].to_numpy()
    windows = []
    start = None
    for i, is_active in enumerate(active):
        if is_active and start is None:
            start = t[i]
        elif not is_active and start is not None:
            windows.append({"start_s": float(start), "end_s": float(t[i - 1])})
            start = None
    if start is not None:
        windows.append({"start_s": float(start), "end_s": float(t[-1])})
    return windows
