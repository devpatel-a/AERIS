"""CAN bus factory: SocketCAN `vcan0` on Linux, virtual-bus fallback elsewhere.

Always try SocketCAN first (works on a Linux host/container with the
`vcan` kernel module loaded and `vcan0` brought up — see
`scripts/setup_vcan.sh`); if that raises for any reason (module not
loaded, no permission, non-Linux OS), fall back to python-can's in-process
`virtual` bus, which is what the test suite exercises for a portable
loopback.
"""

from __future__ import annotations

import logging

import can

logger = logging.getLogger(__name__)

VIRTUAL_CHANNEL = "aerotwin_virtual"


def get_can_bus(channel: str = "vcan0", virtual_channel: str = VIRTUAL_CHANNEL) -> can.BusABC:
    """Return a SocketCAN bus on `channel`, or a virtual bus if that's unavailable."""
    try:
        bus = can.interface.Bus(channel=channel, bustype="socketcan")
        logger.info("Using SocketCAN bus on %s", channel)
        return bus
    except Exception as exc:  # noqa: BLE001 - any failure means "fall back"
        logger.info("SocketCAN unavailable (%s); falling back to virtual bus '%s'", exc, virtual_channel)
        return can.interface.Bus(channel=virtual_channel, bustype="virtual")
