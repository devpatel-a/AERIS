"""DataSource interface: interchangeable telemetry origins (CAN / Parquet replay / simulator).

Everything downstream of acquisition (processing, the twin, the API) reads
telemetry through this uniform interface, so LIVE, REPLAY, and SIMULATION
modes only differ in which `DataSource` is plugged in.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

import pandas as pd

from aerotwin.acquisition.receiver import CanReceiver
from aerotwin.physics.engine_model import EngineModel
from aerotwin.physics.state import EngineInputs


class DataSource(ABC):
    """A source of one telemetry row at a time, keyed by channel name."""

    @abstractmethod
    def read(self) -> dict[str, Any] | None:
        """Return the next/latest telemetry row, or None if nothing is available."""

    def close(self) -> None:
        """Release any underlying resources. Default: no-op."""
        return None


class SimulatorDataSource(DataSource):
    """Steps an EngineModel forward using a caller-supplied input function."""

    def __init__(self, model: EngineModel, input_fn) -> None:
        self.model = model
        self.input_fn = input_fn
        self.t = 0.0

    def read(self) -> dict[str, Any] | None:
        """Advance one physics step and return its flattened output row."""
        inputs: EngineInputs = self.input_fn(self.t)
        out = self.model.step(inputs)
        row = {"t_s": self.t, "mode": "SIMULATION"}
        row.update(out.as_flat_dict())
        self.t += self.model.dt
        return row


class ParquetReplayDataSource(DataSource):
    """Replays a previously logged mission Parquet file row by row, with seek/speed control."""

    def __init__(self, path: Path | str) -> None:
        self.df = pd.read_parquet(path)
        self.index = 0
        self.speed = 1.0
        self.playing = True

    def seek(self, t_s: float) -> None:
        """Jump to the first row at or after `t_s`."""
        matches = self.df.index[self.df["t_s"] >= t_s]
        self.index = int(matches[0]) if len(matches) else len(self.df) - 1

    def read(self) -> dict[str, Any] | None:
        """Return the current row and advance, or None at end-of-log / while paused."""
        if not self.playing or self.index >= len(self.df):
            return None
        row = self.df.iloc[self.index].to_dict()
        row["mode"] = "REPLAY"
        self.index += 1
        return row

    @property
    def total_rows(self) -> int:
        """Number of rows in the replay log."""
        return len(self.df)


class CanDataSource(DataSource):
    """Wraps a CanReceiver: each `read()` polls the bus once and returns the latest snapshot."""

    def __init__(self, receiver: CanReceiver, timeout_s: float = 0.05) -> None:
        self.receiver = receiver
        self.timeout_s = timeout_s

    def read(self) -> dict[str, Any] | None:
        """Poll the CAN bus once and return the latest known signal snapshot."""
        self.receiver.poll_once(timeout_s=self.timeout_s)
        if not self.receiver.latest:
            return None
        row = self.receiver.snapshot()
        row["mode"] = "LIVE"
        return row

    def close(self) -> None:
        """Shut down the underlying CAN bus."""
        self.receiver.bus.shutdown()
