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

G_TO_IN_PER_S2 = 386.089  # 1 g in in/s^2


def _harmonic_share(order: float, config: EngineConfig) -> float:
    """Fraction (by amplitude) of the baseline firing energy carried by one >1x harmonic."""
    weights = {float(k): v for k, v in config.vibration.harmonic_weights.items()}
    above = [o for o in config.vibration.crank_orders if o > 1.0]
    norm = float(np.sqrt(sum(weights.get(o, 0.0) ** 2 for o in above)))
    if norm <= 0.0:
        return 1.0 / np.sqrt(max(len(above), 1))
    return weights.get(order, 0.0) / norm


def compute_vibration(
    rpm: float,
    fuel_per_cyl_kg_s: np.ndarray,
    config: EngineConfig,
    imbalance_severity: float = 0.0,
) -> tuple[float, dict[str, float]]:
    """Return (overall_rms_g, {order_label: amplitude_g}).

    Harmonics above 1x split the baseline firing-signature energy between
    them per `harmonic_weights` (normalized), so the overall RMS is the same
    however many harmonics are resolved.
    """
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
            bands[label] = config.vibration.baseline_rms_g * rpm_factor * _harmonic_share(order, config)

    rms_g = float(np.sqrt(sum(v * v for v in bands.values())))
    return rms_g, bands


def accel_g_to_velocity_ips(amplitude_g: float, frequency_hz: float) -> float:
    """Convert a sinusoidal acceleration amplitude (g) at `frequency_hz` to velocity (in/s)."""
    if frequency_hz <= 0:
        return 0.0
    return amplitude_g * G_TO_IN_PER_S2 / (2.0 * np.pi * frequency_hz)


def vibration_spectrum(
    bands: dict[str, float], rpm: float, config: EngineConfig | None = None
) -> list[dict[str, float]]:
    """Convert crank-order vibration bands to labeled frequency-domain points
    (order x crank rotational frequency), for a vibration spectrum display.

    This is real physically-grounded harmonic content — not a synthesized
    broadband FFT — because the vibration model only simulates discrete crank
    orders (see EngineConfig.vibration.crank_orders), not raw high-rate
    accelerometer samples a true FFT would need. Returned sorted by frequency.
    Each point also carries its velocity in ips and, when `config` is given,
    the alarm envelope for that order (nominal velocity x envelope factor).
    """
    crank_hz = rpm / 60.0
    nominal: dict[str, float] = {}
    if config is not None:
        _, nominal = compute_vibration(rpm, np.ones(4), config, 0.0)
    points = []
    for label, amplitude_g in bands.items():
        order_str = label.replace("order_", "").replace("p", ".")
        try:
            order = float(order_str)
        except ValueError:
            continue
        freq = order * crank_hz
        point = {
            "order": order,
            "frequency_hz": freq,
            "amplitude_g": amplitude_g,
            "velocity_ips": accel_g_to_velocity_ips(amplitude_g, freq),
        }
        if config is not None:
            nominal_ips = accel_g_to_velocity_ips(nominal.get(label, 0.0), freq)
            point["envelope_ips"] = max(
                nominal_ips * config.vibration.envelope_factor, config.vibration.envelope_floor_ips
            )
        points.append(point)
    return sorted(points, key=lambda p: p["frequency_hz"])


def overall_velocity_ips(spectrum: list[dict[str, float]]) -> float:
    """Overall RMS velocity (ips) across all resolved orders."""
    return float(np.sqrt(sum(p["velocity_ips"] ** 2 for p in spectrum)))
