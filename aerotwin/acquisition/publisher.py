"""CAN publisher: encodes EngineModel outputs into DBC-defined frames.

Publishes each message group at its own approximate rate (matching
`aerotwin.faults.sensor_model.SENSOR_SPECS` sample rates where applicable)
plus a 1 Hz heartbeat carrying a rolling counter and a checksum ("CRC") so
the receiver can detect missing frames and corruption.
"""

from __future__ import annotations

from pathlib import Path

import cantools
from can import BusABC, Message

from aerotwin.physics.state import EngineInputs, EngineOutputs

DBC_PATH = Path(__file__).resolve().parents[2] / "configs" / "can" / "aerotwin.dbc"


def checksum16(*values: int) -> int:
    """A simple 16-bit rolling checksum standing in for a real CRC-16."""
    total = 0
    for v in values:
        total = (total + int(v)) & 0xFFFF
    return total


class CanPublisher:
    """Publishes one mission timestep's worth of telemetry onto a CAN bus."""

    GROUP_RATES_HZ = {
        "ENGINE_CORE": 20.0,
        "TEMPS_CHT": 2.0,
        "TEMPS_EGT": 2.0,
        "TEMPS_OIL_COOLANT": 2.0,
        "PRESSURES_FUEL": 5.0,
        "ELECTRICAL": 5.0,
        "VIBRATION": 20.0,
        "AMBIENT": 5.0,
        "HEARTBEAT": 1.0,
    }

    def __init__(self, bus: BusABC, dbc_path: Path = DBC_PATH) -> None:
        self.bus = bus
        self.db = cantools.database.load_file(str(dbc_path))
        self._last_sent_t = dict.fromkeys(self.GROUP_RATES_HZ, -1.0)
        self._heartbeat_counter = 0

    def _due(self, group: str, t: float) -> bool:
        period = 1.0 / self.GROUP_RATES_HZ[group]
        return t - self._last_sent_t[group] >= period - 1e-9

    def _send(self, message_name: str, signals: dict[str, float]) -> None:
        msg_def = self.db.get_message_by_name(message_name)
        data = msg_def.encode(signals)
        self.bus.send(Message(arbitration_id=msg_def.frame_id, data=data, is_extended_id=False))

    def publish_step(self, t: float, inputs: EngineInputs, outputs: EngineOutputs) -> None:
        """Publish whichever message groups are due at time t."""
        if self._due("ENGINE_CORE", t):
            self._send(
                "ENGINE_CORE",
                {
                    "RPM": outputs.rpm,
                    "MAP_KPA": outputs.map_kpa,
                    "THROTTLE_PCT": inputs.throttle * 100.0,
                    "INJ_TIMING_DEG": outputs.injection_timing_deg,
                },
            )
            self._last_sent_t["ENGINE_CORE"] = t

        if self._due("TEMPS_CHT", t):
            self._send(
                "TEMPS_CHT",
                {f"CHT{i + 1}_K": outputs.cht_k[i] for i in range(4)},
            )
            self._last_sent_t["TEMPS_CHT"] = t

        if self._due("TEMPS_EGT", t):
            self._send(
                "TEMPS_EGT",
                {f"EGT{i + 1}_K": outputs.egt_k[i] for i in range(4)},
            )
            self._last_sent_t["TEMPS_EGT"] = t

        if self._due("TEMPS_OIL_COOLANT", t):
            self._send(
                "TEMPS_OIL_COOLANT",
                {"OIL_TEMP_K": outputs.oil_temp_k, "COOLANT_TEMP_K": outputs.coolant_temp_k},
            )
            self._last_sent_t["TEMPS_OIL_COOLANT"] = t

        if self._due("PRESSURES_FUEL", t):
            self._send(
                "PRESSURES_FUEL",
                {
                    "OIL_PRESSURE_KPA": outputs.oil_pressure_kpa,
                    "FUEL_PRESSURE_KPA": 300.0,  # approx — replace with OEM data (fuel rail pressure)
                    "FUEL_FLOW_G_S": outputs.fuel_flow_kg_s * 1000.0,
                },
            )
            self._last_sent_t["PRESSURES_FUEL"] = t

        if self._due("ELECTRICAL", t):
            self._send(
                "ELECTRICAL",
                {
                    "BUS_VOLTAGE_V": outputs.alternator_voltage_v,
                    "ALT_CURRENT_A": outputs.alternator_current_a,
                    "BATTERY_SOC_PCT": outputs.battery_soc * 100.0,
                },
            )
            self._last_sent_t["ELECTRICAL"] = t

        if self._due("VIBRATION", t):
            bands = outputs.vibration_bands_g
            self._send(
                "VIBRATION",
                {
                    "VIB_RMS_MG": outputs.vibration_rms_g * 1000.0,
                    "VIB_ORDER_05_MG": bands.get("order_0p5", 0.0) * 1000.0,
                    "VIB_ORDER_1_MG": bands.get("order_1p0", 0.0) * 1000.0,
                    "VIB_ORDER_2_MG": bands.get("order_2p0", 0.0) * 1000.0,
                },
            )
            self._last_sent_t["VIBRATION"] = t

        if self._due("AMBIENT", t):
            self._send(
                "AMBIENT",
                {
                    "OAT_K": inputs.ambient_temp_k,
                    "STATIC_P_PA": inputs.ambient_pressure_pa,
                    "ALTITUDE_M": inputs.altitude_m,
                    "AIRSPEED_MPS": inputs.airspeed_mps,
                },
            )
            self._last_sent_t["AMBIENT"] = t

        if self._due("HEARTBEAT", t):
            counter = self._heartbeat_counter & 0xFFFF
            status = 0
            crc = checksum16(counter, status)
            self._send("HEARTBEAT", {"COUNTER": counter, "CRC": crc, "STATUS": status})
            self._heartbeat_counter += 1
            self._last_sent_t["HEARTBEAT"] = t
