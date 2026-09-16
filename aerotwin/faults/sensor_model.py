"""Generic sensor realism layer: per-channel noise + quantization + sample rate.

Applied to every telemetry channel regardless of faults — this is the
baseline measurement layer that `aerotwin.faults.sensor_faults` then
perturbs further for specific target channels.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class SensorSpec:
    """Noise/quantization/rate characteristics for one measured channel."""

    noise_std: float
    quantization_step: float
    sample_rate_hz: float = 20.0


# approx — replace with OEM sensor datasheets
SENSOR_SPECS: dict[str, SensorSpec] = {
    "rpm": SensorSpec(noise_std=5.0, quantization_step=1.0, sample_rate_hz=20.0),
    "map_kpa": SensorSpec(noise_std=0.3, quantization_step=0.1, sample_rate_hz=20.0),
    "oil_pressure_kpa": SensorSpec(noise_std=2.0, quantization_step=1.0, sample_rate_hz=10.0),
    "oil_temp_k": SensorSpec(noise_std=0.5, quantization_step=0.5, sample_rate_hz=2.0),
    "coolant_temp_k": SensorSpec(noise_std=0.5, quantization_step=0.5, sample_rate_hz=2.0),
    "fuel_flow_kg_s": SensorSpec(noise_std=0.00005, quantization_step=0.00002, sample_rate_hz=5.0),
    "alternator_voltage_v": SensorSpec(noise_std=0.1, quantization_step=0.05, sample_rate_hz=5.0),
    "alternator_current_a": SensorSpec(noise_std=0.3, quantization_step=0.1, sample_rate_hz=5.0),
    "battery_soc": SensorSpec(noise_std=0.005, quantization_step=0.01, sample_rate_hz=1.0),
    "vibration_rms_g": SensorSpec(noise_std=0.005, quantization_step=0.001, sample_rate_hz=20.0),
    "injection_timing_deg": SensorSpec(noise_std=0.1, quantization_step=0.1, sample_rate_hz=10.0),
}
for _i in range(1, 5):
    SENSOR_SPECS[f"cht_{_i}_k"] = SensorSpec(noise_std=0.8, quantization_step=1.0, sample_rate_hz=2.0)
    SENSOR_SPECS[f"egt_{_i}_k"] = SensorSpec(noise_std=1.5, quantization_step=1.0, sample_rate_hz=2.0)


def _quantize(values: np.ndarray, step: float) -> np.ndarray:
    if step <= 0:
        return values
    return np.round(values / step) * step


def apply_sensor_model(
    df: pd.DataFrame, rng: np.random.Generator, log_interval_s: float = 1.0
) -> pd.DataFrame:
    """Add `measured_<channel>` columns with noise + quantization for all known channels.

    Sample-rate limiting is approximated by holding the previous sample
    for channels whose `sample_rate_hz` implies an update period longer
    than the log tick — this is a coarse but adequate stand-in given
    logging already happens at a fixed tick.
    """
    out = df.copy()
    for channel, spec in SENSOR_SPECS.items():
        if channel not in out.columns:
            continue
        true_vals = out[channel].to_numpy(dtype=float)
        noisy = true_vals + rng.normal(0.0, spec.noise_std, size=len(true_vals))
        quantized = _quantize(noisy, spec.quantization_step)

        hold_every = max(1, int(round((1.0 / spec.sample_rate_hz) / max(log_interval_s, 1e-6))))
        if hold_every > 1:
            held = quantized.copy()
            for i in range(1, len(held)):
                if i % hold_every != 0:
                    held[i] = held[i - 1]
            quantized = held
        out[f"measured_{channel}"] = quantized
    return out
