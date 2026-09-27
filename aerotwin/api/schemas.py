"""Pydantic request/response models for the AeroTwin REST API."""

from __future__ import annotations

from pydantic import BaseModel


class StartLiveRequest(BaseModel):
    """Start a LIVE-mode demo session (simulated telemetry standing in for CAN)."""

    engine_id: str = "rotax914_like"
    mission_id: str = "isr_18h_endurance"
    speed: float = 50.0
    tail_id: str | None = None  # attributes this run to a fleet tail (see aerotwin.twin.fleet)


class StartSimulationRequest(BaseModel):
    """Start a SIMULATION-mode run, seeded from the current LIVE twin's health if available."""

    engine_id: str = "rotax914_like"
    mission_id: str = "isr_18h_endurance"
    speed: float = 200.0
    use_current_health: bool = True
    tail_id: str | None = None


class InjectFaultRequest(BaseModel):
    """Inject a fault into the running demo session's hidden plant."""

    fault_type: str
    target: int | str | None = None
    severity: float = 0.6
    profile: str = "ramp"
    ramp_duration_s: float = 600.0


class ReplayStartRequest(BaseModel):
    """Start replaying a stored mission run."""

    mission_run_id: str
    speed: float = 10.0


class ReplayControlRequest(BaseModel):
    """Control an active replay session."""

    action: str  # "play" | "pause" | "seek" | "speed"
    seek_t_s: float | None = None
    speed: float | None = None


class MissionRiskRequest(BaseModel):
    """Request a mission go/no-go check."""

    engine_id: str = "rotax914_like"
    mission_id: str = "hot_weather_45c"
    n_monte_carlo: int = 10
    max_duration_s: float = 1800.0
    use_current_health: bool = True
    # Ad-hoc overrides for Mission Planner's parameter sliders — leave unset to
    # use the preset mission's own YAML values unchanged.
    cruise_altitude_m: float | None = None
    isa_deviation_k: float | None = None


class EdgeTelemetryPacket(BaseModel):
    """An HMAC-signed telemetry packet as sent by an edge process."""

    payload: dict
    ts: float
    signature: str
