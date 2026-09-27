"""Ground-station identity and C2 datalink budget (configs/gcs/station.yaml)."""

from __future__ import annotations

import math
from pathlib import Path

import yaml
from pydantic import BaseModel

DEFAULT_STATION_PATH = Path(__file__).resolve().parents[2] / "configs" / "gcs" / "station.yaml"


class DatalinkConfig(BaseModel):
    """Line-of-sight datalink budget parameters."""

    frequency_mhz: float
    tx_power_dbm: float
    tx_antenna_gain_dbi: float
    rx_antenna_gain_dbi: float
    cable_losses_db: float
    rx_sensitivity_dbm: float
    standoff_range_km: float


class StationConfig(BaseModel):
    """Ground control station identity, compliance labels and datalink budget."""

    station_id: str
    software_version: str
    software_tag: str
    classification: str
    gateway: str
    compliance: str
    crypto_level: int
    fips_cert: str
    link_cipher: str
    avionics_bus: str
    operator_callsign: str
    restricted_notice: str
    datalink: DatalinkConfig

    @classmethod
    def load(cls, path: Path = DEFAULT_STATION_PATH) -> StationConfig:
        """Load and validate the station config."""
        with path.open() as f:
            return cls.model_validate(yaml.safe_load(f))


def link_margin_db(link: DatalinkConfig, altitude_m: float) -> float:
    """Datalink margin (dB) at the slant range to an airframe at `altitude_m` over the standoff orbit."""
    slant_km = math.hypot(link.standoff_range_km, altitude_m / 1000.0)
    fspl_db = 20 * math.log10(max(slant_km, 0.01)) + 20 * math.log10(link.frequency_mhz) + 32.44
    rx_dbm = link.tx_power_dbm + link.tx_antenna_gain_dbi + link.rx_antenna_gain_dbi - link.cable_losses_db - fspl_db
    return rx_dbm - link.rx_sensitivity_dbm
