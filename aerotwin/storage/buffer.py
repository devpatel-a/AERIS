"""In-memory live telemetry buffer, backing the LIVE-mode dashboard feed."""

from __future__ import annotations

import threading
from collections import deque
from typing import Any


class LiveBuffer:
    """Thread-safe ring buffer of the most recent telemetry rows, keyed by `t_s`."""

    def __init__(self, maxlen: int = 36_000) -> None:
        self._buf: deque[dict[str, Any]] = deque(maxlen=maxlen)
        self._lock = threading.Lock()

    def push(self, row: dict[str, Any]) -> None:
        """Append one row (expected to contain a numeric `t_s` key)."""
        with self._lock:
            self._buf.append(row)

    def latest(self) -> dict[str, Any] | None:
        """Return the most recently pushed row, or None if empty."""
        with self._lock:
            return self._buf[-1] if self._buf else None

    def window(self, seconds: float) -> list[dict[str, Any]]:
        """Return all rows within `seconds` of the most recent row's `t_s`."""
        with self._lock:
            if not self._buf:
                return []
            t_max = self._buf[-1].get("t_s", 0.0)
            return [r for r in self._buf if t_max - r.get("t_s", 0.0) <= seconds]

    def all(self) -> list[dict[str, Any]]:
        """Return a snapshot of every buffered row."""
        with self._lock:
            return list(self._buf)

    def clear(self) -> None:
        """Drop all buffered rows."""
        with self._lock:
            self._buf.clear()

    def __len__(self) -> int:
        return len(self._buf)
