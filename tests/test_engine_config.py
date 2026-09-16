"""Tests for engine config validation and the engine registry."""

from __future__ import annotations

from aerotwin.twin.config import EngineRegistry


def test_registry_loads_rotax914_like():
    """The reference engine YAML validates and is discoverable by id."""
    registry = EngineRegistry()
    assert "rotax914_like" in registry.list_engines()
    cfg = registry.get("rotax914_like")
    assert cfg.geometry.cylinders == 4
    assert cfg.turbo.present is True
    assert len(cfg.nominal_health.injector_flow_coeff) == cfg.geometry.cylinders
