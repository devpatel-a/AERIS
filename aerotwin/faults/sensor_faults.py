"""Sensor faults: drift, stuck, noise, dropout — applied on top of the base sensor model.

These perturb the *measured* signal only, leaving the true physics output
untouched, so downstream analytical redundancy (M5) can tell a sensor fault
apart from a real engine fault by checking whether correlated channels and
the state estimator agree.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from aerotwin.faults.specs import FaultSpec, severity_at


def apply_sensor_fault(
    df: pd.DataFrame, spec: FaultSpec, rng: np.random.Generator
) -> pd.DataFrame:
    """Apply one sensor fault to `df["measured_<target>"]` in place, returning `df`."""
    channel = str(spec.target)
    col = f"measured_{channel}"
    if col not in df.columns:
        raise KeyError(f"No measured column for sensor fault target '{channel}'")

    t = df["t_s"].to_numpy(dtype=float)
    sev = np.array([severity_at(ti, spec) for ti in t])
    active = sev > 0
    values = df[col].to_numpy(dtype=float).copy()

    if spec.fault_type == "sensor_drift":
        max_drift = spec.extra.get("max_drift", values.std() * 3.0 + 1.0)
        values = values + sev * max_drift

    elif spec.fault_type == "sensor_stuck":
        if active.any():
            freeze_idx = int(np.argmax(active))
            frozen_value = values[freeze_idx]
            values[freeze_idx:] = frozen_value

    elif spec.fault_type == "sensor_noise":
        extra_std = spec.extra.get("extra_noise_std", values.std() * 2.0 + 1.0)
        values = values + rng.normal(0.0, 1.0, size=len(values)) * sev * extra_std

    elif spec.fault_type == "sensor_dropout":
        dropout_prob = spec.extra.get("dropout_prob", 0.5)
        drop_mask = active & (rng.uniform(size=len(values)) < dropout_prob * np.clip(sev, 0, 1))
        values[drop_mask] = np.nan

    else:
        raise ValueError(f"Unknown sensor fault_type '{spec.fault_type}'")

    df[col] = values
    df[f"sensor_fault_active_{channel}"] = active
    return df
