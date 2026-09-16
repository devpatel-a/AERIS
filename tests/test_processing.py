"""Tests for the M4 processing pipeline: resample, validate, stale/stuck, features."""

from __future__ import annotations

import numpy as np
import pandas as pd

from aerotwin.processing.pipeline import (
    detect_stale_stuck,
    extract_rolling_features,
    process,
    resample_to_rate,
    validate_range_and_rate,
)


def _synthetic_df(n: int = 100, dt: float = 0.1) -> pd.DataFrame:
    t = np.arange(n) * dt
    return pd.DataFrame(
        {
            "t_s": t,
            "rpm": 4000 + 50 * np.sin(t),
            "cht_1_k": 350 + 0.01 * t,
            "cht_2_k": 350 + 0.01 * t,
            "cht_3_k": 355 + 0.01 * t,
            "cht_4_k": 348 + 0.01 * t,
            "egt_1_k": 900 + 0.02 * t,
            "egt_2_k": 900 + 0.02 * t,
            "egt_3_k": 950 + 0.02 * t,
            "egt_4_k": 890 + 0.02 * t,
        }
    )


def test_resample_to_rate_produces_uniform_grid():
    """Resampling should produce a uniformly-spaced time grid at the target rate."""
    df = _synthetic_df(n=50, dt=0.07)
    out = resample_to_rate(df, rate_hz=20.0)
    dt_grid = np.diff(out["t_s"])
    assert np.allclose(dt_grid, dt_grid[0], atol=1e-9)
    assert abs(dt_grid[0] - 1 / 20.0) < 1e-9


def test_validate_range_flags_out_of_range_values():
    """An RPM value far outside the valid range should be flagged."""
    df = _synthetic_df()
    df.loc[10, "rpm"] = 50_000.0
    out = validate_range_and_rate(df)
    assert out["rpm_range_invalid"].iloc[10]
    assert not out["rpm_range_invalid"].iloc[0]


def test_detect_stale_stuck_flags_frozen_channel():
    """A channel that never changes should be flagged stuck; a healthy one should not."""
    df = _synthetic_df(n=200, dt=0.05)
    df["frozen_channel"] = 42.0
    out = detect_stale_stuck(df, channels=["frozen_channel", "rpm"], window_s=2.0)
    assert out["frozen_channel_stuck"].iloc[-1]
    assert not out["rpm_stuck"].iloc[-1]


def test_extract_rolling_features_adds_egt_spread():
    """EGT spread should reflect the max-min gap across the 4 cylinders."""
    df = _synthetic_df()
    out = extract_rolling_features(df, channels=["rpm"], window_s=1.0)
    assert "egt_spread_k" in out.columns
    assert (out["egt_spread_k"] > 0).any()


def test_full_pipeline_runs_end_to_end():
    """The full process() pipeline should run without error and add expected columns."""
    df = _synthetic_df(n=300, dt=0.05)
    out = process(df, feature_channels=["rpm", "cht_1_k"])
    assert "rpm_roll_mean" in out.columns
    assert "egt_spread_k" in out.columns
    assert out.isna().sum().sum() == 0 or out.isna().sum().sum() < len(out)
