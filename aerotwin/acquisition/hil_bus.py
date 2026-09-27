"""Hardware-in-the-loop CAN bus for a live session.

Each live tick the plant's outputs are encoded into the DBC frames
(`CanPublisher`) and sent on the session's CAN channel (SocketCAN when
available, else python-can's virtual bus); a `CanReceiver` on the same channel
decodes them, tracking heartbeat counter gaps (dropped frames) and checksum
errors. Once per simulated second a telemetry packet is HMAC-signed and
verified end to end (aerotwin.api.security). The Simulation Control and Live
Ops screens read these counters.
"""

from __future__ import annotations

import time
from collections import deque

import can

from aerotwin.acquisition.publisher import CanPublisher
from aerotwin.acquisition.receiver import CanReceiver
from aerotwin.physics.state import EngineInputs, EngineOutputs

BITRATE_BPS = 1_000_000  # CAN FD-less classic CAN at 1 Mbit/s


class _CountingBus:
    """Wraps a bus to count frames sent."""

    def __init__(self, bus: can.BusABC) -> None:
        self.bus = bus
        self.n_sent = 0

    def send(self, msg: can.Message, timeout: float | None = None) -> None:
        self.bus.send(msg, timeout)
        self.n_sent += 1


class HilBusMonitor:
    """Publishes + receives a session's telemetry on its own CAN channel."""

    def __init__(self, session_id: str, interface: str = "virtual") -> None:
        self.channel = f"aerotwin_hil_{session_id}"
        self.interface = interface
        self._tx_raw = can.interface.Bus(channel=self.channel, interface=interface)
        self._rx_raw = can.interface.Bus(channel=self.channel, interface=interface)
        self._tx = _CountingBus(self._tx_raw)
        self.publisher = CanPublisher(self._tx)  # type: ignore[arg-type]
        self.receiver = CanReceiver(self._rx_raw)
        self._sent_window: deque = deque(maxlen=64)  # (sim_t, n_sent) samples at ~1 Hz
        self._last_sample_t = -1e9
        self.hmac_ok = 0
        self.hmac_failed = 0
        self._last_hmac_t = -1e9

    def step(self, t: float, inputs: EngineInputs, outputs: EngineOutputs, measured: dict[str, float]) -> None:
        """Publish due frames for this tick, drain the receiver, and HMAC-check once per sim second."""
        self.publisher.publish_step(t, inputs, outputs)
        while self.receiver.poll_once(timeout_s=0.0):
            pass
        if t - self._last_sample_t >= 1.0:
            self._last_sample_t = t
            self._sent_window.append((t, self._tx.n_sent))
        if t - self._last_hmac_t >= 1.0:
            self._last_hmac_t = t
            from aerotwin.api.security import sign_telemetry_packet, verify_telemetry_packet

            packet = sign_telemetry_packet({"t_s": t, **{k: v for k, v in measured.items() if v == v}})
            try:
                verify_telemetry_packet(packet)
                self.hmac_ok += 1
            except ValueError:
                self.hmac_failed += 1

    def stats(self) -> dict:
        """Throughput (frames per simulated second), drops, checksum and HMAC status."""
        fps = None
        if len(self._sent_window) >= 2:
            (t0, n0), (t1, n1) = self._sent_window[0], self._sent_window[-1]
            if t1 > t0:
                fps = (n1 - n0) / (t1 - t0)
        return {
            "channel": self.channel,
            "interface": self.interface,
            "bitrate_bps": BITRATE_BPS,
            "frames_sent": self._tx.n_sent,
            "frames_received": self.receiver.n_frames_received,
            "frames_per_s": fps,
            "dropped_frames": self.receiver.n_heartbeat_gaps,
            "crc_errors": self.receiver.n_heartbeat_crc_errors,
            "hmac_ok": self.hmac_ok,
            "hmac_failed": self.hmac_failed,
            "hmac_verified": self.hmac_ok > 0 and self.hmac_failed == 0,
            "updated_at": time.time(),
        }

    def close(self) -> None:
        for bus in (self._tx_raw, self._rx_raw):
            try:
                bus.shutdown()
            except Exception:
                pass
