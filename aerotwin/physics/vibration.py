"""Synthetic crank-order vibration features.

Not a physically-resolved vibration model — instead a set of order-tracked
"bands" (fractions of engine rotational frequency) whose amplitudes respond
to fuel-delivery imbalance (misfire signature, typically sub-order energy)
and mechanical imbalance (1x order energy), on top of a baseline 2x-order
firing signature for a 4-cylinder 4-stroke engine.
"""

from __future__ import annotations

import numpy as np

from aerotwin.twin.config import EngineConfig


def compute_vibration(
    rpm: float,
    fuel_per_cyl_kg_s: np.ndarray,
    config: EngineConfig,
    imbalance_severity: float = 0.0,
) -> tuple[float, dict[str, float]]:
    """Return (overall_rms_g, {order_label: amplitude_g})."""
    rpm_factor = 0.5 + 0.5 * min(rpm / max(config.rating.rated_rpm, 1.0), 1.5)
    mean_fuel = float(np.mean(fuel_per_cyl_kg_s))
    cv_fuel = float(np.std(fuel_per_cyl_kg_s) / mean_fuel) if mean_fuel > 1e-9 else 0.0

    bands: dict[str, float] = {}
    for order in config.vibration.crank_orders:
        label = f"order_{str(order).replace('.', 'p')}"
        if order < 1.0:
            bands[label] = config.vibration.misfire_order_gain * cv_fuel * config.vibration.baseline_rms_g
        elif order == 1.0:
            bands[label] = (
                config.vibration.imbalance_order_gain * imbalance_severity * config.vibration.baseline_rms_g
            )
        else:
            bands[label] = config.vibration.baseline_rms_g * rpm_factor

    rms_g = float(np.sqrt(sum(v * v for v in bands.values())))
    return rms_g, bands


def vibration_spectrum(bands: dict[str, float], rpm: float) -> list[dict[str, float]]:
    """Convert crank-order vibration bands to labeled frequency-domain points
    (order x crank rotational frequency), for a vibration spectrum display.

    This is real physically-grounded harmonic content — not a synthesized
    broadband FFT — because the vibration model only simulates discrete crank
    orders (see EngineConfig.vibration.crank_orders), not raw high-rate
    accelerometer samples a true FFT would need. Returned sorted by frequency.
    """
    crank_hz = rpm / 60.0
    points = []
    for label, amplitude_g in bands.items():
        order_str = label.replace("order_", "").replace("p", ".")
        try:
            order = float(order_str)
        except ValueError:
            continue
        points.append({"order": order, "frequency_hz": order * crank_hz, "amplitude_g": amplitude_g})
    return sorted(points, key=lambda p: p["frequency_hz"])
