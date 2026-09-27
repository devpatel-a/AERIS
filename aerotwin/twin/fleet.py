"""Fleet roster: which physical UAV tails exist, and which engine config/serial
each carries. Mirrors EngineRegistry/MissionRegistry's load-a-directory-of-YAML
pattern (see aerotwin/twin/config.py, aerotwin/simulation/mission.py).

A mission run only gets attributed to a tail when the session that produced it
was started with a `tail_id` (see StartLiveRequest/StartSimulationRequest);
older/un-attributed runs are not silently reassigned here — the fleet health
aggregation in aerotwin/twin/fleet_health.py documents how it handles them.
"""

from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel

DEFAULT_FLEET_CONFIG_DIR = Path(__file__).resolve().parents[2] / "configs" / "fleet"


class TailConfig(BaseModel):
    """One physical UAV airframe/tail in the fleet."""

    tail_id: str
    tail_number: str
    engine_id: str
    engine_serial: str
    unit: str = ""  # operating unit / wing shown on the login airframe selector
    primary: bool = False  # default airframe preselected on the login screen
    notes: str = ""

    @classmethod
    def from_yaml(cls, path: Path) -> TailConfig:
        """Load and validate one tail config from a YAML file."""
        with path.open() as f:
            raw = yaml.safe_load(f)
        return cls.model_validate(raw)


class FleetRegistry:
    """Loads and caches every tail YAML found in a config directory."""

    def __init__(self, config_dir: Path | str = DEFAULT_FLEET_CONFIG_DIR) -> None:
        self.config_dir = Path(config_dir)
        self._tails: dict[str, TailConfig] = {}
        self._load_all()

    def _load_all(self) -> None:
        for path in sorted(self.config_dir.glob("*.yaml")):
            cfg = TailConfig.from_yaml(path)
            self._tails[cfg.tail_id] = cfg

    def get(self, tail_id: str) -> TailConfig:
        """Return the validated config for `tail_id`, raising KeyError if unknown."""
        if tail_id not in self._tails:
            raise KeyError(f"Unknown tail_id '{tail_id}'. Available: {sorted(self._tails)}")
        return self._tails[tail_id]

    def list_tails(self) -> list[str]:
        """Return all discovered tail ids, in a stable order."""
        return sorted(self._tails)

    def all(self) -> list[TailConfig]:
        """Return every tail config, in a stable order."""
        return [self._tails[t] for t in self.list_tails()]
