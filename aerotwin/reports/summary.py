"""Shared post-flight mission summary: computed once from a mission's telemetry
DataFrame, consumed by both the PDF report generator (`aerotwin.reports.pdf`)
and the JSON report/replay-list API endpoints, so both always agree on the
same numbers instead of maintaining two separate computations.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd

from aerotwin.twin.config import EngineConfig

CYL_TEMP_COLS = [f"cht_{i}_k" for i in range(1, 5)]
CYL_EGT_COLS = [f"egt_{i}_k" for i in range(1, 5)]

# (EngineConfig.limits attribute == this summary's peak_values/limits key, source columns, "max" or "min")
LIMIT_CHECKS = [
    ("max_cht_k", CYL_TEMP_COLS, "max"),
    ("max_egt_k", CYL_EGT_COLS, "max"),
    ("max_oil_temp_k", ["oil_temp_k"], "max"),
    ("min_oil_pressure_kpa", ["oil_pressure_kpa"], "min"),
    ("max_coolant_temp_k", ["coolant_temp_k"], "max"),
]

LIMIT_LABELS = {
    "max_cht_k": "Max CHT (K)",
    "max_egt_k": "Max EGT (K)",
    "max_oil_temp_k": "Max oil temp (K)",
    "min_oil_pressure_kpa": "Min oil pressure (kPa)",
    "max_coolant_temp_k": "Max coolant temp (K)",
}

RISK_ORDER = ["NORMAL", "WATCH", "WARNING", "CRITICAL"]


@dataclass
class MissionSummary:
    """Everything the Reports/Replay screens and the PDF report need about one run."""

    n_samples: int
    duration_hours: float
    peak_values: dict[str, float] = field(default_factory=dict)  # keyed by EngineConfig.limits attribute name
    limits: dict[str, float] = field(default_factory=dict)  # same keys, the corresponding limit value
    exceeded: dict[str, bool] = field(default_factory=dict)  # same keys, whether the peak crossed the limit
    time_above_limit_s: dict[str, float] = field(default_factory=dict)
    health_start: dict[str, float] = field(default_factory=dict)
    health_end: dict[str, float] = field(default_factory=dict)
    health_index_start: float | None = None
    health_index_end: float | None = None
    health_index_min: float | None = None
    health_risk_end: str | None = None  # risk level at the last logged tick — "current" status
    worst_health_risk: str | None = None  # worst risk level seen at any point — for alerting/history
    subsystem_index_end: dict[str, float] = field(default_factory=dict)
    rul_hours_end: float | None = None
    faults_observed: list[str] = field(default_factory=list)
    total_alarms: int = 0


def _time_above_limit_s(df: pd.DataFrame, cols: list[str], limit: float) -> float:
    if not all(c in df.columns for c in cols) or len(df) < 2:
        return 0.0
    above = (df[cols].max(axis=1) >= limit).sum()
    dt = float(df["t_s"].diff().median())
    return float(above * dt)


def compute_post_flight_summary(df: pd.DataFrame, config: EngineConfig) -> MissionSummary:
    """Compute the full post-flight summary for one mission's telemetry DataFrame
    (either freshly simulated in-memory, or loaded back from a stored Parquet log).
    """
    n = len(df)
    duration_hours = (df["t_s"].iloc[-1] - df["t_s"].iloc[0]) / 3600.0 if n else 0.0

    peak_values: dict[str, float] = {}
    limits: dict[str, float] = {}
    exceeded: dict[str, bool] = {}
    time_above: dict[str, float] = {}
    for limit_attr, cols, kind in LIMIT_CHECKS:
        present = [c for c in cols if c in df.columns]
        if not present:
            continue
        value = float(df[present].max(axis=1).max()) if kind == "max" else float(df[present].min(axis=1).min())
        limit = float(getattr(config.limits, limit_attr))
        peak_values[limit_attr] = value
        limits[limit_attr] = limit
        exceeded[limit_attr] = value >= limit if kind == "max" else value <= limit
        if kind == "max":
            time_above[limit_attr] = _time_above_limit_s(df, present, limit)

    health_cols = [c for c in df.columns if c.startswith("health_") and c not in ("health_index", "health_risk")]
    health_start = {c.replace("health_", ""): float(df[c].iloc[0]) for c in health_cols} if n else {}
    health_end = {c.replace("health_", ""): float(df[c].iloc[-1]) for c in health_cols} if n else {}

    health_index_start = float(df["health_index"].iloc[0]) if "health_index" in df.columns and n else None
    health_index_end = float(df["health_index"].iloc[-1]) if "health_index" in df.columns and n else None
    health_index_min = float(df["health_index"].min()) if "health_index" in df.columns and n else None

    health_risk_end = None
    worst_health_risk = None
    if "health_risk" in df.columns and n:
        health_risk_end = str(df["health_risk"].iloc[-1])
        ranked = df["health_risk"].map(lambda r: RISK_ORDER.index(r) if r in RISK_ORDER else 0)
        worst_health_risk = str(df["health_risk"].iloc[ranked.idxmax()])

    # diagnosis_fault: the live AI classifier's prediction, for runs captured through the
    # FastAPI session loop. fault_type: ground-truth label, present when a run was built
    # from FaultInjector.postprocess() (synthetic dataset / offline mission simulation).
    faults_observed: list[str] = []
    if "diagnosis_fault" in df.columns:
        faults_observed = sorted({f for f in df["diagnosis_fault"].dropna().unique() if f and f != "healthy"})
    elif "fault_type" in df.columns:
        faults_observed = sorted(set(df["fault_type"].dropna()) - {"healthy"})

    total_alarms = int(df["alarm_count"].sum()) if "alarm_count" in df.columns else 0

    subsystem_cols = [c for c in df.columns if c.startswith("subsystem_")]
    subsystem_index_end = {c.replace("subsystem_", ""): float(df[c].iloc[-1]) for c in subsystem_cols} if n else {}
    rul_hours_end = float(df["rul_mean_hours"].iloc[-1]) if "rul_mean_hours" in df.columns and n else None

    return MissionSummary(
        n_samples=n,
        duration_hours=duration_hours,
        peak_values=peak_values,
        limits=limits,
        exceeded=exceeded,
        time_above_limit_s=time_above,
        health_start=health_start,
        health_end=health_end,
        health_index_start=health_index_start,
        health_index_end=health_index_end,
        health_index_min=health_index_min,
        health_risk_end=health_risk_end,
        worst_health_risk=worst_health_risk,
        subsystem_index_end=subsystem_index_end,
        rul_hours_end=rul_hours_end,
        faults_observed=faults_observed,
        total_alarms=total_alarms,
    )
