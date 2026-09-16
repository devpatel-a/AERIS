"""CAN acquisition tests using a python-can virtual-bus loopback (portable, no vcan0 needed)."""

from __future__ import annotations

import can
import numpy as np
import pytest

from aerotwin.acquisition.publisher import CanPublisher, checksum16
from aerotwin.acquisition.receiver import CanReceiver
from aerotwin.physics.engine_model import EngineModel
from aerotwin.physics.state import EngineInputs
from aerotwin.twin.config import EngineRegistry


@pytest.fixture()
def loopback_channel():
    """A unique virtual-bus channel name per test to avoid cross-test interference."""
    return f"aerotwin_test_{np.random.default_rng().integers(0, 1_000_000)}"


def test_publisher_receiver_roundtrip(loopback_channel):
    """A published engine step should be decodable by the receiver with correct values."""
    tx_bus = can.interface.Bus(channel=loopback_channel, bustype="virtual")
    rx_bus = can.interface.Bus(channel=loopback_channel, bustype="virtual")
    publisher = CanPublisher(tx_bus)
    receiver = CanReceiver(rx_bus)

    engine_cfg = EngineRegistry().get("rotax914_like")
    model = EngineModel(engine_cfg)
    inputs = EngineInputs(
        throttle=0.6, ambient_pressure_pa=101325.0, ambient_temp_k=288.15, altitude_m=0.0, airspeed_mps=40.0
    )
    outputs = model.step(inputs)
    publisher.publish_step(0.0, inputs, outputs)

    n_received = 0
    for _ in range(20):
        if receiver.poll_once(timeout_s=0.2):
            n_received += 1
        else:
            break
    assert n_received >= 6  # all groups due at t=0

    assert receiver.get_value("RPM") == pytest.approx(round(outputs.rpm), abs=1.0)
    assert receiver.get_value("COOLANT_TEMP_K") == pytest.approx(outputs.coolant_temp_k, abs=0.5)
    tx_bus.shutdown()
    rx_bus.shutdown()


def test_heartbeat_gap_detection(loopback_channel):
    """A dropped heartbeat frame should be counted as a gap by the receiver."""
    tx_bus = can.interface.Bus(channel=loopback_channel, bustype="virtual")
    rx_bus = can.interface.Bus(channel=loopback_channel, bustype="virtual")
    publisher = CanPublisher(tx_bus)
    receiver = CanReceiver(rx_bus)

    engine_cfg = EngineRegistry().get("rotax914_like")
    model = EngineModel(engine_cfg)
    inputs = EngineInputs(
        throttle=0.5, ambient_pressure_pa=101325.0, ambient_temp_k=288.15, altitude_m=0.0, airspeed_mps=30.0
    )

    # Publish 3 heartbeats but drop the middle one at the receiver by not polling.
    for t in [0.0, 1.0, 2.0]:
        out = model.step(inputs)
        publisher.publish_step(t, inputs, out)

    # Drain everything from rx_bus but simulate a missed heartbeat by decoding all
    # non-heartbeat frames first, then skip one heartbeat frame manually.
    received_heartbeats = 0
    seen_heartbeats = 0
    while True:
        msg = rx_bus.recv(timeout=0.2)
        if msg is None:
            break
        if msg.arbitration_id == 264:
            seen_heartbeats += 1
            if seen_heartbeats == 2:
                continue  # simulate dropping the *second* heartbeat frame
        receiver._handle_frame(msg.arbitration_id, msg.data, 0.0)
        if msg.arbitration_id == 264:
            received_heartbeats += 1

    assert received_heartbeats == 2
    assert receiver.n_heartbeat_gaps >= 1
    tx_bus.shutdown()
    rx_bus.shutdown()


def test_checksum_detects_corruption():
    """checksum16 should differ if the payload is corrupted."""
    good = checksum16(10, 0)
    bad = checksum16(11, 0)
    assert good != bad
