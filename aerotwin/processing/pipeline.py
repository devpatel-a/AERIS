"""Signal processing: resample to 20 Hz, filter, validate ranges/rates, flag
stale/stuck channels, and extract rolling features (used by health/ML layers).
"""

from __future__ import annotations

import numpy as np
import pandas as pd

TARGET_RATE_HZ = 20.0

# approx — replace with OEM sensor/engine limits where they differ from configs/engines
VALID_RANGES: dict[str, tuple[float, float]] = {
    "rpm": (0.0, 7000.0),
    "map_kpa": (10.0, 150.0),
    "oil_pressure_kpa": (0.0, 600.0),
    "oil_temp_k": (250.0, 420.0),
    "coolant_temp_k": (250.0, 400.0),
    "fuel_flow_kg_s": (0.0, 0.05),
    "alternator_voltage_v": (0.0, 32.0),
    "alternator_current_a": (-10.0, 45.0),
    "battery_soc": (0.0, 1.0),
    "vibration_rms_g": (0.0, 2.0),
}
for _i in range(1, 5):
    VALID_RANGES[f"cht_{_i}_k"] = (250.0, 560.0)
    VALID_RANGES[f"egt_{_i}_k"] = (250.0, 1300.0)

MAX_RATE_OF_CHANGE_PER_S: dict[str, float] = {
    "rpm": 3000.0,
    "map_kpa": 200.0,
    "oil_pressure_kpa": 300.0,
    "oil_temp_k": 5.0,
    "coolant_temp_k": 5.0,
    "cht_1_k": 15.0,
    "cht_2_k": 15.0,
    "cht_3_k": 15.0,
    "cht_4_k": 15.0,
    "egt_1_k": 60.0,
    "egt_2_k": 60.0,
    "egt_3_k": 60.0,
    "egt_4_k": 60.0,
}

STUCK_WINDOW_S = 5.0
STUCK_STD_THRESHOLD = 1e-6


def resample_to_rate(df: pd.DataFrame, time_col: str = "t_s", rate_hz: float = TARGET_RATE_HZ) -> pd.DataFrame:
    """Resample a time-indexed DataFrame onto a uniform grid at `rate_hz` via linear interpolation."""
    if df.empty:
        return df
    t0, t1 = df[time_col].iloc[0], df[time_col].iloc[-1]
    step = 1.0 / rate_hz
    n = int(np.floor((t1 - t0) / step + 1e-9)) + 1
    grid = t0 + step * np.arange(n)
    out = pd.DataFrame({time_col: grid})
    numeric_cols = [c for c in df.columns if c != time_col and pd.api.types.is_numeric_dtype(df[c])]
    for col in numeric_cols:
        out[col] = np.interp(grid, df[time_col], df[col])
    non_numeric = [c for c in df.columns if c not in numeric_cols and c != time_col]
    for col in non_numeric:
        out[col] = np.interp(grid, df[time_col], np.arange(len(df))).astype(int).clip(0, len(df) - 1)
        out[col] = df[col].to_numpy()[out[col].to_numpy()]
    return out


def moving_average_filter(series: pd.Series, window: int = 5) -> pd.Series:
    """Simple centered moving-average low-pass filter."""
    return series.rolling(window=window, center=True, min_periods=1).mean()


def validate_range_and_rate(df: pd.DataFrame, time_col: str = "t_s") -> pd.DataFrame:
    """Add `<channel>_range_invalid` and `<channel>_rate_invalid` boolean flag columns."""
    out = df.copy()
    dt = out[time_col].diff().replace(0, np.nan)
    for channel, (lo, hi) in VALID_RANGES.items():
        if channel not in out.columns:
            continue
        out[f"{channel}_range_invalid"] = ~out[channel].between(lo, hi)
    for channel, max_rate in MAX_RATE_OF_CHANGE_PER_S.items():
        if channel not in out.columns:
            continue
        rate = out[channel].diff().abs() / dt
        out[f"{channel}_rate_invalid"] = rate > max_rate
    return out


def detect_stale_stuck(
    df: pd.DataFrame, channels: list[str], time_col: str = "t_s", window_s: float = STUCK_WINDOW_S
) -> pd.DataFrame:
    """Add `<channel>_stuck` flag: True where the channel hasn't moved over a rolling window."""
    out = df.copy()
    dt = np.median(np.diff(out[time_col])) if len(out) > 1 else 1.0
    window = max(3, int(round(window_s / max(dt, 1e-6))))
    for channel in channels:
        if channel not in out.columns:
            continue
        rolling_std = out[channel].rolling(window=window, min_periods=window).std()
        out[f"{channel}_stuck"] = rolling_std < STUCK_STD_THRESHOLD
    return out


def handle_missing_data(df: pd.DataFrame, columns: list[str] | None = None) -> pd.DataFrame:
    """Forward-fill then back-fill missing values (e.g. from sensor dropout)."""
    out = df.copy()
    cols = columns or [c for c in out.columns if pd.api.types.is_numeric_dtype(out[c])]
    out[cols] = out[cols].ffill().bfill()
    return out


def extract_rolling_features(
    df: pd.DataFrame, channels: list[str], time_col: str = "t_s", window_s: float = 10.0
) -> pd.DataFrame:
    """Add rolling mean/std/slope features per channel, plus EGT spread if all 4 EGTs present."""
    out = df.copy()
    dt = np.median(np.diff(out[time_col])) if len(out) > 1 else 1.0
    window = max(2, int(round(window_s / max(dt, 1e-6))))
    for channel in channels:
        if channel not in out.columns:
            continue
        roll = out[channel].rolling(window=window, min_periods=2)
        out[f"{channel}_roll_mean"] = roll.mean()
        out[f"{channel}_roll_std"] = roll.std()
        out[f"{channel}_slope"] = out[channel].diff(window) / (window * dt)

    egt_cols = [f"egt_{i}_k" for i in range(1, 5)]
    if all(c in out.columns for c in egt_cols):
        out["egt_spread_k"] = out[egt_cols].max(axis=1) - out[egt_cols].min(axis=1)
    cht_cols = [f"cht_{i}_k" for i in range(1, 5)]
    if all(c in out.columns for c in cht_cols):
        out["cht_spread_k"] = out[cht_cols].max(axis=1) - out[cht_cols].min(axis=1)
    return out


def process(
    df: pd.DataFrame,
    resample: bool = True,
    filter_window: int = 5,
    feature_channels: list[str] | None = None,
) -> pd.DataFrame:
    """Run the full processing pipeline: resample -> filter -> validate -> stale/stuck -> features."""
    out = resample_to_rate(df) if resample else df.copy()
    numeric_cols = [c for c in out.columns if c != "t_s" and pd.api.types.is_numeric_dtype(out[c])]
    for col in numeric_cols:
        out[col] = moving_average_filter(out[col], window=filter_window)
    out = validate_range_and_rate(out)
    channels = feature_channels or list(VALID_RANGES.keys())
    out = detect_stale_stuck(out, channels)
    out = handle_missing_data(out)
    out = extract_rolling_features(out, channels)
    out = handle_missing_data(out)  # fill edge NaNs introduced by rolling/diff features
    return out
