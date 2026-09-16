#!/usr/bin/env bash
# Best-effort SocketCAN vcan0 setup for a real Linux host.
# Not usable inside most containers (kernel module load requires host
# privileges) — aerotwin.acquisition.bus falls back to python-can's virtual
# bus automatically when this hasn't been run / isn't available.
set -euo pipefail

IFACE="${1:-vcan0}"

if ! command -v ip >/dev/null 2>&1; then
    echo "error: 'ip' (iproute2) not found on this system" >&2
    exit 1
fi

sudo modprobe vcan
if ! ip link show "$IFACE" >/dev/null 2>&1; then
    sudo ip link add dev "$IFACE" type vcan
fi
sudo ip link set up "$IFACE"
echo "vcan interface '$IFACE' is up."
