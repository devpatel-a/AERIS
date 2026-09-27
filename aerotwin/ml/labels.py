"""Human-readable names for classifier features (SHAP attribution displays)."""

from __future__ import annotations

CHANNEL_NAMES = {
    "rpm": "RPM", "map_kpa": "Manifold pressure", "oil_pressure_kpa": "Oil pressure", "oil_temp_k": "Oil temp",
    "coolant_temp_k": "Coolant", "fuel_flow_kg_s": "Fuel flow", "alternator_voltage_v": "Bus voltage",
    "alternator_current_a": "Alternator current", "battery_soc": "Battery SOC", "vibration_rms_g": "Vibration",
}
STAT_NAMES = {"resid_mean": "residual offset", "resid_std": "residual scatter", "resid_slope": "residual trend"}
SPECIAL = {
    "cht_spread_mean": "Head temperature spread",
    "egt_spread_mean": "EGT spread",
    "egt_spread_max": "EGT spread (peak)",
    "vibration_mean": "Vibration level",
    "vibration_std": "Vibration variability",
}


def feature_label(feature: str) -> str:
    """e.g. 'cht_3_k_resid_slope' -> 'CHT Cyl 3 residual trend'."""
    if feature in SPECIAL:
        return SPECIAL[feature]
    for suffix, stat in STAT_NAMES.items():
        if feature.endswith("_" + suffix):
            channel = feature[: -len(suffix) - 1]
            if channel.startswith("cht_"):
                name = f"CHT Cyl {channel.split('_')[1]}"
            elif channel.startswith("egt_"):
                name = f"EGT Cyl {channel.split('_')[1]}"
            else:
                name = CHANNEL_NAMES.get(channel, channel)
            return f"{name} {stat}"
    return feature.replace("_", " ")
