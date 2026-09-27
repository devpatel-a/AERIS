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


# ---------------------------------------------------------------------------
# Live (per-sample) sensor faults + loop self-test
# ---------------------------------------------------------------------------

# Default full-scale drift per channel family when a spec gives no `max_drift`
# (SI units). approx — replace with sensor datasheets.
LIVE_MAX_DRIFT = {"cht": 15.0, "egt": 40.0, "oil_temp_k": 8.0, "coolant_temp_k": 8.0, "oil_pressure_kpa": 60.0, "map_kpa": 8.0}

# Nominal loop resistance (ohm) the ECU's sensor self-test reads per channel
# family (thermocouple loops, RTDs, pressure transducer bridges). A degrading
# junction/connector raises it; an open circuit reads as infinite. approx.
NOMINAL_LOOP_OHM = {"cht": 12.0, "egt": 14.0, "oil_temp_k": 110.0, "coolant_temp_k": 110.0, "oil_pressure_kpa": 350.0, "map_kpa": 350.0}
LOOP_DEGRADED_FRACTION = 0.15  # >15% above nominal loop resistance => self-test DEGRADED


def _family(channel: str) -> str:
    return channel.split("_")[0] if channel.startswith(("cht_", "egt_")) else channel


def apply_live_sensor_faults(
    t: float, measured: dict[str, float], specs: list[FaultSpec], rng: np.random.Generator, state: dict
) -> dict[str, float]:
    """Apply active sensor faults to one live measurement sample (returns a new dict).

    `state` persists per-fault memory across samples (e.g. the frozen value of a
    stuck sensor). Dropped samples are NaN.
    """
    out = dict(measured)
    for spec in specs:
        channel = str(spec.target)
        if channel not in out:
            continue
        sev = severity_at(t, spec)
        if sev <= 0:
            continue
        key = id(spec)
        if spec.fault_type == "sensor_drift":
            max_drift = spec.extra.get("max_drift", LIVE_MAX_DRIFT.get(_family(channel), 5.0))
            out[channel] = out[channel] + sev * max_drift
        elif spec.fault_type == "sensor_stuck":
            frozen = state.setdefault(key, out[channel])
            out[channel] = frozen
        elif spec.fault_type == "sensor_noise":
            extra = spec.extra.get("extra_noise_std", 0.25 * LIVE_MAX_DRIFT.get(_family(channel), 5.0))
            out[channel] = out[channel] + float(rng.normal(0.0, sev * extra))
        elif spec.fault_type == "sensor_dropout":
            if rng.uniform() < spec.extra.get("dropout_prob", 1.0) * min(sev, 1.0):
                out[channel] = float("nan")
    return out


def sensor_selftest(t: float, channels: list[str], specs: list[FaultSpec]) -> dict[str, dict]:
    """Simulated ECU loop self-test per monitored channel: loop resistance + status.

    Only a sensor-side fault changes a loop's electrical signature (a real
    engine fault changes the physical quantity, not the sensor circuit), which
    is what lets the twin tell a localized engine fault from a failing sensor.
    """
    result: dict[str, dict] = {}
    for channel in channels:
        family = _family(channel)
        if family not in NOMINAL_LOOP_OHM:
            continue
        nominal = NOMINAL_LOOP_OHM[family]
        ohm, status = nominal, "OK"
        for spec in specs:
            if str(spec.target) != channel:
                continue
            sev = severity_at(t, spec)
            if sev <= 0:
                continue
            if spec.fault_type == "sensor_dropout":
                ohm, status = float("inf"), "OPEN"
            elif spec.fault_type in ("sensor_drift", "sensor_noise"):
                ohm = nominal * (1.0 + 0.6 * sev)
            elif spec.fault_type == "sensor_stuck":
                status = "STUCK"
        if status == "OK" and ohm > nominal * (1.0 + LOOP_DEGRADED_FRACTION):
            status = "DEGRADED"
        result[channel] = {"loop_ohm": ohm, "nominal_ohm": nominal, "status": status}
    return result
