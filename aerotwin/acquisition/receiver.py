"""CAN receiver: decodes DBC-defined frames, timestamps them, and tracks link health.

Detects missing frames (heartbeat counter gaps) and corrupted heartbeats
(checksum mismatch), and exposes the latest decoded value + age for every
signal so `aerotwin.processing` can flag stale/stuck channels.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path

import cantools
from can import BusABC

from aerotwin.acquisition.publisher import checksum16

DBC_PATH = Path(__file__).resolve().parents[2] / "configs" / "can" / "aerotwin.dbc"


@dataclass
class SignalSample:
    """One decoded signal value with its reception timestamp."""

    value: float
    t_received: float


class CanReceiver:
    """Decodes incoming CAN frames and tracks the latest value of every signal."""

    def __init__(self, bus: BusABC, dbc_path: Path = DBC_PATH) -> None:
        self.bus = bus
        self.db = cantools.database.load_file(str(dbc_path))
        self.latest: dict[str, SignalSample] = {}
        self.n_frames_received = 0
        self.n_heartbeats_received = 0
        self.n_heartbeat_gaps = 0
        self.n_heartbeat_crc_errors = 0
        self._last_heartbeat_counter: int | None = None

    def poll_once(self, timeout_s: float = 0.1) -> bool:
        """Receive and decode one frame, if available within `timeout_s`. Returns True if received."""
        msg = self.bus.recv(timeout=timeout_s)
        if msg is None:
            return False
        self._handle_frame(msg.arbitration_id, msg.data, time.time())
        return True

    def _handle_frame(self, arbitration_id: int, data: bytes, t_received: float) -> None:
        try:
            msg_def = self.db.get_message_by_frame_id(arbitration_id)
            decoded = msg_def.decode(data)
        except (KeyError, ValueError):
            return
        self.n_frames_received += 1
        for name, value in decoded.items():
            self.latest[name] = SignalSample(value=float(value), t_received=t_received)

        if msg_def.name == "HEARTBEAT":
            self._check_heartbeat(decoded)

    def _check_heartbeat(self, decoded: dict) -> None:
        self.n_heartbeats_received += 1
        counter = int(decoded["COUNTER"])
        crc = int(decoded["CRC"])
        status = int(decoded["STATUS"])
        if crc != checksum16(counter, status):
            self.n_heartbeat_crc_errors += 1
        if self._last_heartbeat_counter is not None:
            expected = (self._last_heartbeat_counter + 1) & 0xFFFF
            if counter != expected:
                gap = (counter - expected) & 0xFFFF
                self.n_heartbeat_gaps += gap
        self._last_heartbeat_counter = counter

    def get_value(self, signal_name: str, max_age_s: float = 5.0) -> float | None:
        """Return the latest value of `signal_name`, or None if missing/stale."""
        sample = self.latest.get(signal_name)
        if sample is None:
            return None
        if time.time() - sample.t_received > max_age_s:
            return None
        return sample.value

    def snapshot(self) -> dict[str, float]:
        """Return a plain dict of all currently-known signal values (regardless of age)."""
        return {name: s.value for name, s in self.latest.items()}
