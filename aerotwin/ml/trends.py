"""Trend metrics: efficiency, BSFC (brake-specific fuel consumption), CHT margin."""

from __future__ import annotations

import numpy as np
import pandas as pd

from aerotwin.twin.config import EngineConfig


def compute_trends(df: pd.DataFrame, config: EngineConfig, power_col: str = "power_w") -> pd.DataFrame:
    """Add efficiency, BSFC (g/kWh), and CHT margin (K to limit) columns."""
    out = df.copy()
    power_kw = np.maximum(out.get(power_col, out.get("measured_power_w", 1.0)), 1.0) / 1000.0
    fuel_flow_col = "fuel_flow_kg_s" if "fuel_flow_kg_s" in out.columns else "measured_fuel_flow_kg_s"
    fuel_flow_g_h = out[fuel_flow_col] * 1000.0 * 3600.0
    out["bsfc_g_per_kwh"] = fuel_flow_g_h / power_kw

    cht_cols = [c for c in out.columns if c.startswith("cht_") and c.endswith("_k")]
    if not cht_cols:
        cht_cols = [c for c in out.columns if c.startswith("measured_cht_") and c.endswith("_k")]
    if cht_cols:
        out["cht_margin_k"] = config.limits.max_cht_k - out[cht_cols].max(axis=1)

    # approx overall efficiency proxy: mechanical power / fuel thermal power
    fuel_lhv_j_per_kg = 44.0e6
    thermal_power_w = out[fuel_flow_col] * fuel_lhv_j_per_kg
    out["efficiency"] = np.clip(out.get(power_col, 0.0) / np.maximum(thermal_power_w, 1.0), 0.0, 1.0)
    return out


def summarize_trend(df: pd.DataFrame, column: str) -> dict[str, float]:
    """Simple linear-trend summary (slope, start, end) for a metric over a run."""
    if column not in df.columns or len(df) < 2:
        return {"slope_per_hour": 0.0, "start": 0.0, "end": 0.0}
    t_hours = (df["t_s"] - df["t_s"].iloc[0]) / 3600.0
    slope = float(np.polyfit(t_hours, df[column], 1)[0])
    return {"slope_per_hour": slope, "start": float(df[column].iloc[0]), "end": float(df[column].iloc[-1])}
