"""Mission Planner routes: waypoints -> mission segments, validation and route metrics.

A planned mission is a mission *template* (one of configs/missions, which fixes
the mission type, taxi/takeoff/landing and the on-station segment name) plus the
planner's settings and an optional waypoint route. Waypoints are given in the
launch-site plan frame (km east / km north of the GCS), since AERIS has no
geographic base data. `compile_plan` turns the plan into an ordinary
`MissionConfig`, so the planner, live/simulation sessions, replay and fleet
history all run it through the same mission system as the YAML presets:

    taxi, takeoff (template) -> climb (to the first leg altitude, at the airframe
    climb rate) -> one "transit" segment per leg, a "hold" segment at each waypoint
    with a hold time (the station waypoint's hold uses the template's on-station
    segment name, e.g. "loiter" or "cap_station") -> "transit_home" back to base -> descent (at the descent
    rate) -> landing (template).

The waypoint flagged as the *station* holds for whatever endurance the mission
duration leaves after every other segment, so the duration setting stays the
total mission length. Without a station waypoint the mission ends when the
route is flown and the duration is the computed route time.

Ground speed on every transit leg is airspeed minus the template's mean headwind
(the conservative planning assumption the Stitch "Headwind" factor already uses).
"""

from __future__ import annotations

import math
import re
from pathlib import Path
from typing import Any

import numpy as np
import yaml
from pydantic import BaseModel, Field

from aerotwin.acquisition.link import DatalinkConfig, link_margin_at_range_db, radio_horizon_km
from aerotwin.simulation.mission import MissionConfig, SegmentConfig
from aerotwin.twin.config import EngineConfig

KT_PER_MPS = 1.943844
FIXED_SEGMENTS = {"taxi", "takeoff", "climb", "descent", "landing"}
DEFAULT_PLANNER_CONFIG = Path(__file__).resolve().parents[2] / "configs" / "planner.yaml"
CODE_RE = re.compile(r"^[A-Z0-9][A-Z0-9-]{1,15}$")
LANDING_ALT_M = 200.0  # descent ends on the approach, as in the preset missions


class AirframeEnvelope(BaseModel):
    min_airspeed_ktas: float
    max_airspeed_ktas: float
    service_ceiling_m: float
    min_route_altitude_m: float
    climb_rate_mps: float
    descent_rate_mps: float


class PlannerLimits(BaseModel):
    min_duration_h: float
    max_duration_h: float
    min_power_pct_mcp: float
    max_power_pct_mcp: float
    min_surface_temp_c: float
    max_surface_temp_c: float
    max_waypoints: int
    max_waypoint_range_km: float
    link_margin_warn_db: float
    min_leg_km: float


class PlannerConfig(BaseModel):
    airframe: AirframeEnvelope
    limits: PlannerLimits

    @classmethod
    def load(cls, path: Path = DEFAULT_PLANNER_CONFIG) -> PlannerConfig:
        with path.open() as f:
            return cls.model_validate(yaml.safe_load(f))


class Waypoint(BaseModel):
    """One route point in the launch-site plan frame."""

    name: str = ""
    east_km: float
    north_km: float
    altitude_m: float | None = None  # None -> the plan's cruise altitude
    airspeed_ktas: float | None = None  # None -> the plan's cruising airspeed
    hold_min: float = 0.0
    station: bool = False


class PlanSpec(BaseModel):
    """Everything the planner form holds; persisted as a saved mission plan."""

    name: str = ""
    code: str = ""  # mission identifier / sortie callsign stem, e.g. "ISR-NORTH"
    tail_id: str | None = None
    template_id: str = "isr_18h_endurance"
    cruise_altitude_m: float = 3000.0
    duration_h: float = 18.0
    surface_temp_c: float = 15.0
    airspeed_ktas: float = 87.0
    power_pct_mcp: float = 55.0
    use_current_health: bool = True
    waypoints: list[Waypoint] = Field(default_factory=list)


def _issue(level: str, field: str, text: str, waypoint: int | None = None) -> dict[str, Any]:
    return {"level": level, "field": field, "text": text, "waypoint": waypoint}


def _station_segment_name(template: MissionConfig) -> str:
    work = [s for s in template.segments if s.name not in FIXED_SEGMENTS] or template.segments
    return max(work, key=lambda s: s.duration_s).name


def _throttle(power_pct_mcp: float, engine: EngineConfig) -> float:
    mcp = engine.rating.max_continuous_power_w or engine.rating.rated_power_w
    return float(np.clip(power_pct_mcp / 100.0 * mcp / engine.rating.rated_power_w, 0.2, 1.0))


def route_geometry(spec: PlanSpec, template: MissionConfig, link: DatalinkConfig) -> dict[str, Any]:
    """Legs (base -> waypoints -> base) with distances, bearings, ground speeds and link budget."""
    headwind = template.environment.headwind_mps
    pts = [(0.0, 0.0)] + [(w.east_km, w.north_km) for w in spec.waypoints] + [(0.0, 0.0)]
    legs = []
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        dist = math.hypot(x1 - x0, y1 - y0)
        to_wp = spec.waypoints[i] if i < len(spec.waypoints) else None
        alt = (to_wp.altitude_m if to_wp and to_wp.altitude_m is not None else spec.cruise_altitude_m)
        tas_kt = to_wp.airspeed_ktas if to_wp and to_wp.airspeed_ktas is not None else spec.airspeed_ktas
        gs = tas_kt / KT_PER_MPS - headwind
        legs.append({
            "from": i, "to": i + 1, "distance_km": dist,
            "bearing_deg": (math.degrees(math.atan2(x1 - x0, y1 - y0)) + 360.0) % 360.0 if dist > 0 else None,
            "altitude_m": alt, "airspeed_ktas": tas_kt, "ground_speed_mps": gs,
            "duration_s": dist * 1000.0 / gs if gs > 0 else math.inf,
        })
    wps = []
    for i, w in enumerate(spec.waypoints):
        alt = w.altitude_m if w.altitude_m is not None else spec.cruise_altitude_m
        rng = math.hypot(w.east_km, w.north_km)
        wps.append({
            "index": i, "range_km": rng, "altitude_m": alt,
            "link_margin_db": link_margin_at_range_db(link, rng, alt),
            "radio_horizon_km": radio_horizon_km(link, alt),
        })
    return {"legs": legs, "waypoints": wps}


def compile_plan(spec: PlanSpec, template: MissionConfig, engine: EngineConfig, cfg: PlannerConfig,
                 link: DatalinkConfig, mission_id: str | None = None) -> MissionConfig:
    """Compile the plan into a MissionConfig (see module docstring). Assumes a valid plan."""
    throttle = _throttle(spec.power_pct_mcp, engine)
    tmpl = {s.name: s for s in template.segments}
    mission = MissionConfig(
        mission_id=mission_id or f"draft_{template.mission_id}",
        display_name=spec.name or template.display_name,
        short_name=spec.name or template.short_name,
        profile=template.profile,
        sortie_prefix=spec.code or template.sortie_prefix,
        description=spec.name or template.description,
        engine_id=template.engine_id,
        environment=template.environment.model_copy(update={"base_isa_deviation_k": spec.surface_temp_c - 15.0}),
        segments=[],
        origin="plan" if mission_id else "draft",
    )
    segs = mission.segments
    for name in ("taxi", "takeoff"):
        if name in tmpl:
            segs.append(tmpl[name].model_copy(update={"isa_deviation_k": None}))
    if not spec.waypoints:
        # No route: the template's profile flown at the planner's altitude/speed/power/duration.
        work = [s for s in template.segments if s.name not in FIXED_SEGMENTS]
        fixed = sum(s.duration_s for s in template.segments if s.name in FIXED_SEGMENTS)
        scale = max(spec.duration_h * 3600.0 - fixed, 600.0) / max(sum(s.duration_s for s in work), 1.0)
        for s in template.segments:
            if s.name in ("taxi", "takeoff"):
                continue
            s2 = s.model_copy(update={"isa_deviation_k": None})
            if s.name == "climb":
                s2.target_altitude_m = spec.cruise_altitude_m
            elif s.name not in FIXED_SEGMENTS:
                s2.duration_s = s.duration_s * scale
                s2.target_altitude_m = spec.cruise_altitude_m
                s2.target_airspeed_mps = spec.airspeed_ktas / KT_PER_MPS
                s2.throttle = throttle
            segs.append(s2)
        return mission

    geo = route_geometry(spec, template, link)
    legs = geo["legs"]
    climb_tmpl = tmpl.get("climb")
    first_alt = legs[0]["altitude_m"]
    segs.append(SegmentConfig(
        name="climb", duration_s=max(120.0, first_alt / cfg.airframe.climb_rate_mps), target_altitude_m=first_alt,
        target_airspeed_mps=climb_tmpl.target_airspeed_mps if climb_tmpl else legs[0]["airspeed_ktas"] / KT_PER_MPS,
        throttle=climb_tmpl.throttle if climb_tmpl else 0.85,
    ))
    station_name = _station_segment_name(template)
    station_idx = next((i for i, w in enumerate(spec.waypoints) if w.station), None)
    for i, leg in enumerate(legs):
        home = i == len(legs) - 1
        segs.append(SegmentConfig(
            name="transit_home" if home else "transit", duration_s=max(leg["duration_s"], 1.0),
            target_altitude_m=leg["altitude_m"], target_airspeed_mps=leg["airspeed_ktas"] / KT_PER_MPS, throttle=throttle,
        ))
        if home:
            break
        w = spec.waypoints[i]
        if w.station or w.hold_min > 0:
            segs.append(SegmentConfig(
                name=station_name if w.station else "hold", duration_s=max(w.hold_min * 60.0, 1.0),
                target_altitude_m=leg["altitude_m"], target_airspeed_mps=leg["airspeed_ktas"] / KT_PER_MPS, throttle=throttle,
            ))
    last_alt = legs[-1]["altitude_m"]
    descent_tmpl = tmpl.get("descent")
    segs.append(SegmentConfig(
        name="descent", duration_s=max(180.0, (last_alt - LANDING_ALT_M) / cfg.airframe.descent_rate_mps),
        target_altitude_m=LANDING_ALT_M,
        target_airspeed_mps=descent_tmpl.target_airspeed_mps if descent_tmpl else 35.0,
        throttle=descent_tmpl.throttle if descent_tmpl else 0.28,
    ))
    if "landing" in tmpl:
        segs.append(tmpl["landing"].model_copy(update={"isa_deviation_k": None}))
    if station_idx is not None:
        # The station hold absorbs the remaining endurance (explicit hold is its minimum).
        station_seg = next(s for s in segs if s.name == station_name)
        other = sum(s.duration_s for s in segs if s is not station_seg)
        station_seg.duration_s = max(spec.duration_h * 3600.0 - other, station_seg.duration_s)
    return mission


def validate_plan(spec: PlanSpec, template: MissionConfig | None, engine: EngineConfig | None, cfg: PlannerConfig,
                  link: DatalinkConfig, known_tails: set[str], code_taken: bool = False) -> dict[str, Any]:
    """Validate the plan; returns issues (error/warning/info), route metrics and the compiled timeline."""
    a, lim = cfg.airframe, cfg.limits
    issues: list[dict[str, Any]] = []
    if not spec.name.strip():
        issues.append(_issue("error", "name", "Mission name is required."))
    elif len(spec.name) > 48:
        issues.append(_issue("error", "name", "Mission name must be 48 characters or fewer."))
    if not spec.code:
        issues.append(_issue("error", "code", "Mission identifier is required (e.g. ISR-NORTH)."))
    elif not CODE_RE.match(spec.code):
        issues.append(_issue("error", "code", "Identifier must be 2-16 characters: A-Z, 0-9 and '-', starting with a letter or digit."))
    elif code_taken:
        issues.append(_issue("error", "code", f"Identifier {spec.code} is already used by another saved mission."))
    if not spec.tail_id:
        issues.append(_issue("error", "tail_id", "Select the airframe that will fly this mission."))
    elif spec.tail_id not in known_tails:
        issues.append(_issue("error", "tail_id", f"Unknown airframe {spec.tail_id}."))
    if template is None or engine is None:
        issues.append(_issue("error", "template_id", f"Unknown mission type '{spec.template_id}'."))
        return {"valid": False, "issues": issues, "metrics": None}

    def rng(field: str, value: float, lo: float, hi: float, label: str, unit: str) -> None:
        if not math.isfinite(value) or value < lo or value > hi:
            issues.append(_issue("error", field, f"{label} {value:g} {unit} is outside {lo:g}-{hi:g} {unit}."))

    rng("cruise_altitude_m", spec.cruise_altitude_m, a.min_route_altitude_m, a.service_ceiling_m, "Cruise altitude", "m")
    rng("airspeed_ktas", spec.airspeed_ktas, a.min_airspeed_ktas, a.max_airspeed_ktas, "Cruising airspeed", "KTAS")
    rng("power_pct_mcp", spec.power_pct_mcp, lim.min_power_pct_mcp, lim.max_power_pct_mcp, "Power setting", "% MCP")
    rng("duration_h", spec.duration_h, lim.min_duration_h, lim.max_duration_h, "Mission duration", "h")
    rng("surface_temp_c", spec.surface_temp_c, lim.min_surface_temp_c, lim.max_surface_temp_c, "Surface temperature", "°C")
    crit = engine.turbo.critical_altitude_m if engine.turbo.present else 0.0
    if engine.turbo.present and spec.cruise_altitude_m > crit and spec.cruise_altitude_m <= a.service_ceiling_m:
        issues.append(_issue("warning", "cruise_altitude_m",
                             f"Cruise altitude is above the turbo critical altitude ({crit:,.0f} m): available power lapses with altitude."))

    if len(spec.waypoints) > lim.max_waypoints:
        issues.append(_issue("error", "waypoints", f"At most {lim.max_waypoints} waypoints are supported."))
    stations = [i for i, w in enumerate(spec.waypoints) if w.station]
    if len(stations) > 1:
        issues.append(_issue("error", "waypoints", "Only one waypoint can be the on-station (loiter) point."))
    headwind = template.environment.headwind_mps
    for i, w in enumerate(spec.waypoints):
        label = f"WP{i + 1}{f' ({w.name})' if w.name else ''}"
        if not (math.isfinite(w.east_km) and math.isfinite(w.north_km)):
            issues.append(_issue("error", "waypoint", f"{label}: coordinates must be numbers.", i))
            continue
        if math.hypot(w.east_km, w.north_km) > lim.max_waypoint_range_km:
            issues.append(_issue("error", "waypoint", f"{label}: {math.hypot(w.east_km, w.north_km):,.0f} km from base exceeds the {lim.max_waypoint_range_km:,.0f} km planning area.", i))
        if w.altitude_m is not None:
            rng("waypoint", w.altitude_m, a.min_route_altitude_m, a.service_ceiling_m, f"{label} altitude", "m")
            if issues and issues[-1]["field"] == "waypoint" and issues[-1]["waypoint"] is None:
                issues[-1]["waypoint"] = i
        if w.airspeed_ktas is not None:
            rng("waypoint", w.airspeed_ktas, a.min_airspeed_ktas, a.max_airspeed_ktas, f"{label} airspeed", "KTAS")
            if issues and issues[-1]["field"] == "waypoint" and issues[-1]["waypoint"] is None:
                issues[-1]["waypoint"] = i
        if not math.isfinite(w.hold_min) or w.hold_min < 0:
            issues.append(_issue("error", "waypoint", f"{label}: hold time cannot be negative.", i))
    if any(i["level"] == "error" for i in issues):
        return {"valid": False, "issues": issues, "metrics": None}

    metrics: dict[str, Any] = {"headwind_kts": headwind * KT_PER_MPS}
    if spec.waypoints:
        geo = route_geometry(spec, template, link)
        for leg in geo["legs"]:
            to = f"WP{leg['to']}" if leg["to"] <= len(spec.waypoints) else "base"
            frm = "base" if leg["from"] == 0 else f"WP{leg['from']}"
            if leg["ground_speed_mps"] <= 0:
                issues.append(_issue("error", "waypoint", f"Leg {frm} → {to}: airspeed does not overcome the {headwind * KT_PER_MPS:.0f} kt headwind.",
                                     leg["to"] - 1 if leg["to"] <= len(spec.waypoints) else None))
            elif leg["distance_km"] < lim.min_leg_km:
                issues.append(_issue("warning", "waypoint", f"Leg {frm} → {to} is only {leg['distance_km'] * 1000:.0f} m: duplicate waypoint?",
                                     leg["to"] - 1 if leg["to"] <= len(spec.waypoints) else None))
        for wp in geo["waypoints"]:
            i = wp["index"]
            if wp["range_km"] > wp["radio_horizon_km"]:
                issues.append(_issue("error", "waypoint", f"WP{i + 1} is beyond the datalink radio horizon ({wp['range_km']:.0f} km > "
                                     f"{wp['radio_horizon_km']:.0f} km at {wp['altitude_m']:,.0f} m): no line-of-sight C2 link.", i))
            elif wp["link_margin_db"] < 0:
                issues.append(_issue("error", "waypoint", f"WP{i + 1}: datalink margin {wp['link_margin_db']:.1f} dB — link budget does not close.", i))
            elif wp["link_margin_db"] < lim.link_margin_warn_db:
                issues.append(_issue("warning", "waypoint", f"WP{i + 1}: datalink margin only {wp['link_margin_db']:.1f} dB (< {lim.link_margin_warn_db:.0f} dB).", i))
        metrics["legs"] = geo["legs"]
        metrics["waypoints"] = geo["waypoints"]
        metrics["route_km"] = sum(leg["distance_km"] for leg in geo["legs"])
        metrics["max_range_km"] = max((w["range_km"] for w in geo["waypoints"]), default=0.0)
        metrics["min_link_margin_db"] = min((w["link_margin_db"] for w in geo["waypoints"]), default=None)
    if any(i["level"] == "error" for i in issues):
        return {"valid": False, "issues": issues, "metrics": metrics}

    mission = compile_plan(spec, template, engine, PlannerConfig(airframe=a, limits=lim), link)
    t = 0.0
    timeline = []
    for s in mission.segments:
        timeline.append({"name": s.name, "start_s": t, "end_s": t + s.duration_s, "altitude_m": s.target_altitude_m,
                         "airspeed_ktas": s.target_airspeed_mps * KT_PER_MPS, "throttle": s.throttle})
        t += s.duration_s
    metrics["timeline"] = timeline
    metrics["total_s"] = mission.total_duration_s
    metrics["transit_s"] = sum(s.duration_s for s in mission.segments if s.name in ("transit", "transit_home"))
    station_name = _station_segment_name(template)
    metrics["station_s"] = sum(s.duration_s for s in mission.segments if s.name == station_name) if (stations or not spec.waypoints) else 0.0
    metrics["hold_s"] = sum(s.duration_s for s in mission.segments if s.name == "hold")
    if spec.waypoints:
        # Arrival time at each waypoint from the compiled timeline.
        arrivals, k = [], 0
        for seg in timeline:
            if seg["name"] in ("transit",):
                arrivals.append(seg["end_s"])
                k += 1
        for i, wp in enumerate(metrics["waypoints"]):
            wp["eta_s"] = arrivals[i] if i < len(arrivals) else None
        if stations:
            required = sum(s.duration_s for s in mission.segments) - next(
                s.duration_s for s in mission.segments if s.name == station_name) + spec.waypoints[stations[0]].hold_min * 60.0
            if required > spec.duration_h * 3600.0 + 1.0:
                issues.append(_issue("error", "duration_h", f"The route needs {required / 3600.0:.1f} h (transits, holds, climb and let-down) — "
                                     f"longer than the {spec.duration_h:g} h mission duration.", stations[0]))
        else:
            issues.append(_issue("info", "duration_h", f"No on-station waypoint: the mission ends when the route is flown "
                                 f"({mission.total_duration_s / 3600.0:.1f} h), not at the duration setting."))
    valid = not any(i["level"] == "error" for i in issues)
    return {"valid": valid, "issues": issues, "metrics": metrics}
