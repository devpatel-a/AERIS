"""Feature engineering for the AI/ML layer: residual-window features built
from the M3 synthetic dataset, using the same physics model as a
nominal-health baseline (never comparing the model against its own inputs).
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from aerotwin.faults.specs import ENGINE_FAULT_TYPES, SENSOR_FAULT_TYPES
from aerotwin.physics.engine_model import EngineModel
from aerotwin.physics.state import EngineInputs, nominal_health_vector
from aerotwin.twin.config import EngineConfig

FEATURE_CHANNELS = [
    "rpm", "map_kpa",
    "cht_1_k", "cht_2_k", "cht_3_k", "cht_4_k",
    "egt_1_k", "egt_2_k", "egt_3_k", "egt_4_k",
    "oil_pressure_kpa", "oil_temp_k", "coolant_temp_k",
    "fuel_flow_kg_s", "alternator_voltage_v", "alternator_current_a",
    "battery_soc", "vibration_rms_g",
]

CLASS_NAMES = ["healthy", *ENGINE_FAULT_TYPES, "sensor_fault"]


def collapse_fault_class(fault_type: str) -> str:
    """Collapse the 4 sensor-fault types into one "sensor_fault" class."""
    return "sensor_fault" if fault_type in SENSOR_FAULT_TYPES else fault_type


def nominal_residual_pass(df: pd.DataFrame, config: EngineConfig) -> pd.DataFrame:
    """Re-simulate the sample's logged inputs through a nominal-health model at 1Hz.

    Adds `expected_<channel>` and `resid_<channel>` = measured - expected for
    every channel in FEATURE_CHANNELS. This is the model-based residual the
    ML layer trains on — never a comparison against the model's own inputs.
    """
    health = nominal_health_vector(config.nominal_health.injector_flow_coeff)
    model = EngineModel(config, health=health, dt=1.0)
    expected_rows = []
    for _, row in df.iterrows():
        inputs = EngineInputs(
            throttle=row["throttle"],
            ambient_pressure_pa=row["ambient_pressure_pa"],
            ambient_temp_k=row["ambient_temp_k"],
            altitude_m=row["altitude_m"],
            airspeed_mps=row["airspeed_mps"],
        )
        out = model.step(inputs)
        expected_rows.append(out.as_flat_dict())
    expected_df = pd.DataFrame(expected_rows, index=df.index)

    out_df = df.copy()
    for c in FEATURE_CHANNELS:
        measured_col = f"measured_{c}"
        if measured_col not in out_df.columns or c not in expected_df.columns:
            continue
        out_df[f"expected_{c}"] = expected_df[c]
        out_df[f"resid_{c}"] = out_df[measured_col] - expected_df[c]
    return out_df


def _window_features(window: pd.DataFrame) -> dict[str, float]:
    feats: dict[str, float] = {}
    for c in FEATURE_CHANNELS:
        resid_col = f"resid_{c}"
        if resid_col not in window.columns:
            continue
        r = window[resid_col].to_numpy(dtype=float)
        feats[f"{c}_resid_mean"] = float(np.mean(r))
        feats[f"{c}_resid_std"] = float(np.std(r))
        feats[f"{c}_resid_slope"] = float(np.polyfit(np.arange(len(r)), r, 1)[0]) if len(r) > 1 else 0.0

    egt_cols = [f"measured_egt_{i}_k" for i in range(1, 5)]
    if all(c in window.columns for c in egt_cols):
        spread = window[egt_cols].max(axis=1) - window[egt_cols].min(axis=1)
        feats["egt_spread_mean"] = float(spread.mean())
        feats["egt_spread_max"] = float(spread.max())
    cht_cols = [f"measured_cht_{i}_k" for i in range(1, 5)]
    if all(c in window.columns for c in cht_cols):
        spread = window[cht_cols].max(axis=1) - window[cht_cols].min(axis=1)
        feats["cht_spread_mean"] = float(spread.mean())

    if "measured_vibration_rms_g" in window.columns:
        feats["vibration_mean"] = float(window["measured_vibration_rms_g"].mean())
        feats["vibration_std"] = float(window["measured_vibration_rms_g"].std())

    return feats


def build_windowed_features(
    df: pd.DataFrame,
    config: EngineConfig,
    sample_id: str,
    window_s: float = 30.0,
    stride_s: float = 15.0,
    active_severity_threshold: float = 0.05,
) -> pd.DataFrame:
    """Slide a window over one sample's residual-augmented log, emitting labeled feature rows."""
    df = nominal_residual_pass(df, config)
    t = df["t_s"].to_numpy(dtype=float)
    if len(t) == 0:
        return pd.DataFrame()
    t0, t1 = t[0], t[-1]

    fault_type = collapse_fault_class(df["fault_type"].iloc[0])
    rows = []
    w_start = t0
    while w_start + window_s <= t1 + 1e-9:
        mask = (t >= w_start) & (t < w_start + window_s)
        window = df.loc[mask]
        if len(window) < 3:
            w_start += stride_s
            continue
        feats = _window_features(window)
        mean_severity = float(window["fault_severity"].mean()) if "fault_severity" in window else 0.0
        feats["label"] = fault_type if mean_severity > active_severity_threshold else "healthy"
        feats["sample_id"] = sample_id
        feats["window_start_s"] = w_start
        feats["window_center_s"] = w_start + window_s / 2.0
        feats["mean_severity"] = mean_severity
        feats["true_fault_type"] = fault_type
        rows.append(feats)
        w_start += stride_s
    return pd.DataFrame(rows)


def build_dataset_feature_table(
    dataset_dir: Path, config: EngineConfig, window_s: float = 30.0, stride_s: float = 15.0
) -> pd.DataFrame:
    """Build the full windowed-feature table across every sample in a generated dataset."""
    dataset_dir = Path(dataset_dir)
    manifest = pd.read_parquet(dataset_dir / "manifest.parquet")
    tables = []
    for _, m in manifest.iterrows():
        path = dataset_dir / f"{m['sample_id']}.parquet"
        if not path.exists():
            continue
        df = pd.read_parquet(path)
        feats = build_windowed_features(df, config, m["sample_id"], window_s=window_s, stride_s=stride_s)
        if not feats.empty:
            tables.append(feats)
    if not tables:
        return pd.DataFrame()
    return pd.concat(tables, ignore_index=True)
