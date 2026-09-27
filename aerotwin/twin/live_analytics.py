"""Live analytics layered on the twin's per-tick output, for the operator screens:

- fault matrix (classifier probabilities tracked over time: first detection,
  trend, state ACTIVE / PREDICTED / MONITOR, cylinder/channel localization)
- anomaly banner with early-detection lead time (time-to-limit at detection)
- residual anomaly score
- per-cylinder assembly view (measured vs twin, local cooling, assembly health)
- fault-source attribution (engine vs sensor, loop self-test, tracking correlation)
- mission event timeline (phase changes, injections, detections, AI diagnoses,
  RUL revisions, limit warnings)

Everything here is derived from the twin/estimator/classifier outputs of the
running session; nothing is synthesized for display.
"""

from __future__ import annotations

import math
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any

import numpy as np

from aerotwin.maintenance.service import MaintenanceKB
from aerotwin.physics.state import HIDX_INJECTOR0
from aerotwin.twin.config import EngineConfig

N_CYL = 4
ACTIVE_P = 0.5
PREDICTED_P = 0.2
MONITOR_P = 0.08
ANOMALY_SCORE_SCALE = 5.0  # EWMA z at which the score saturates toward 1
ANOMALY_SCORE_ALARM = 0.45
LIMIT_WARNING_S = 20 * 60.0  # warn when the projected time-to-limit drops below this
TREND_WINDOW_S = 1800.0

FAULT_SUBSYSTEM = {
    "cooling_degradation": "cooling",
    "overheating_trend": "cooling",
    "lubrication_issue": "lubrication",
    "injector_abnormality": "fuel_injection",
    "misfire": "combustion",
    "combustion_instability": "combustion",
    "abnormal_vibration": "mechanical_vibration",
    "alternator_degradation": "electrical",
    "turbo_degradation": "turbo_air",
    "sensor_fault": "sensors",
}
FAULT_CHANNELS = {
    "cooling_degradation": [f"cht_{i}_k" for i in range(1, 5)],
    "overheating_trend": [f"cht_{i}_k" for i in range(1, 5)],
    "lubrication_issue": ["oil_pressure_kpa", "oil_temp_k"],
    "injector_abnormality": [f"egt_{i}_k" for i in range(1, 5)],
    "misfire": [f"egt_{i}_k" for i in range(1, 5)],
    "combustion_instability": [f"egt_{i}_k" for i in range(1, 5)],
    "abnormal_vibration": ["vibration_rms_g"],
    "alternator_degradation": ["alternator_current_a", "alternator_voltage_v"],
    "turbo_degradation": ["map_kpa"],
}
CYLINDER_FAULTS = {"cooling_degradation", "overheating_trend", "injector_abnormality", "misfire"}
SCORE_CHANNELS = [
    "rpm", "map_kpa", *[f"cht_{i}_k" for i in range(1, 5)], *[f"egt_{i}_k" for i in range(1, 5)],
    "oil_pressure_kpa", "oil_temp_k", "coolant_temp_k", "fuel_flow_kg_s", "alternator_current_a", "vibration_rms_g",
]
PHASE_TITLES = {
    "takeoff": "Takeoff Roll",
    "climb": "Climb Commenced",
    "descent": "Descent Initiated",
    "landing": "Landing / Rollout",
}


@dataclass
class FaultTrack:
    """Probability history of one fault class during the session."""

    first_detected_t: float | None = None
    history: deque = field(default_factory=lambda: deque(maxlen=400))  # (t_s, p)


def _state_for(p: float) -> str:
    if p >= ACTIVE_P:
        return "ACTIVE"
    if p >= PREDICTED_P:
        return "PREDICTED"
    if p >= MONITOR_P:
        return "MONITOR"
    return "NONE"


def channel_label(channel: str) -> str:
    """Operator-facing channel name, e.g. cht_3_k -> 'CHT Cyl 3', egt_4_k -> 'EGT-4'."""
    if channel.startswith("cht_"):
        return f"CHT Cyl {channel.split('_')[1]}"
    if channel.startswith("egt_"):
        return f"EGT-{channel.split('_')[1]}"
    return {
        "oil_pressure_kpa": "Oil pressure", "oil_temp_k": "Oil temp", "coolant_temp_k": "Coolant temp",
        "map_kpa": "MAP", "rpm": "RPM", "fuel_flow_kg_s": "Fuel flow", "vibration_rms_g": "Vibration",
        "alternator_current_a": "Alternator current", "alternator_voltage_v": "Bus voltage",
    }.get(channel, channel)


class LiveAnalytics:
    """Per-session analytics state; call `on_tick` every twin step."""

    def __init__(self, config: EngineConfig, kb: MaintenanceKB) -> None:
        self.config = config
        self.kb = kb
        self.tracks: dict[str, FaultTrack] = {}
        self.probs: dict[str, float] = {}
        self.events: list[dict[str, Any]] = []
        self.phase: str | None = None
        self.phase_alt: float | None = None
        self.detect_t: float | None = None
        self.detect_lead_s: float | None = None
        self.limit_warned = False
        self.limit_crossed_t: float | None = None
        self.kalman_converged = False
        self.score_hist: deque = deque(maxlen=1200)  # 1 Hz (t, score)
        self.series: dict[str, deque] = {}  # 1 Hz measured/expected pairs per channel for correlation
        self.max_cht_hist: deque = deque(maxlen=900)  # 1 Hz (t, max CHT K)
        self._last_1hz = -1e9
        self.last_diag_fault: str | None = None
        self.last_rul: float | None = None
        self.muted_until_wall: float = 0.0

    # ------------------------------------------------------------------ events
    def add_event(self, t_s: float, kind: str, title: str, detail: str = "", **extra: Any) -> dict:
        event = {"t_s": float(t_s), "wall_ts": time.time(), "kind": kind, "title": title, "detail": detail, **extra}
        self.events.append(event)
        return event

    def on_injection(self, t_s: float, fault_type: str, target: Any, severity: float, ramp_s: float, operator: str | None) -> None:
        where = f" on {channel_label(str(target))}" if isinstance(target, str) else (
            f" on Cyl {int(target) + 1}" if target is not None else ""
        )
        self.add_event(
            t_s, "INJECTED",
            f"{self.kb.fault_label(fault_type)} {severity * 100:.0f}% ramp initiated via HiL bus{where}.",
            f"Source: {operator or 'Ground Station Operator'}", ramp_s=ramp_s,
        )

    def on_rul(self, t_s: float, rul_hours: float | None) -> None:
        if rul_hours is None:
            return
        prev = self.last_rul
        if prev is not None and prev > 0 and abs(rul_hours - prev) / prev >= 0.05:
            delta = rul_hours - prev
            self.add_event(
                t_s, "RUL_UPDATE",
                f"Remaining Useful Life (RUL) revised from {prev:.0f} hrs to {rul_hours:.0f} hrs.",
                f"Δ: {delta:+.0f} flight hours ({delta / prev * 100:+.1f}%)", delta_hours=delta,
            )
            self.last_rul = rul_hours
        elif prev is None:
            self.last_rul = rul_hours

    def on_classification(self, t_s: float, probs: dict[str, float], predicted: str, confidence: float) -> None:
        """Record a classifier cycle's class probabilities."""
        self.probs = {k: v for k, v in probs.items() if k != "healthy"}
        for fault, p in self.probs.items():
            track = self.tracks.setdefault(fault, FaultTrack())
            state = _state_for(p)
            if state != "NONE" and track.first_detected_t is None:
                track.first_detected_t = t_s
            track.history.append((t_s, p))
        if predicted != "healthy" and predicted != self.last_diag_fault and confidence >= ACTIVE_P:
            self.add_event(
                t_s, "AI_DIAGNOSIS", f"Fault isolated: {self.kb.fault_label(predicted)}.",
                f"Confidence: {confidence * 100:.1f}%", fault_type=predicted, confidence=confidence,
            )
        self.last_diag_fault = predicted

    # ------------------------------------------------------------------ tick
    def on_tick(
        self,
        t_s: float,
        phase: str,
        altitude_m: float,
        ambient_temp_k: float,
        result: Any,
        measured: dict[str, float],
        selftest: dict[str, dict],
        synthesized: list[str],
        health_vector: np.ndarray,
        confidence_pct: float,
        detector_ewma: dict[str, float],
    ) -> dict[str, Any]:
        """Update analytics for one twin step; returns fields to merge into the live row."""
        self._phase_events(t_s, phase, altitude_m)
        if not self.kalman_converged and confidence_pct >= 95.0:
            self.kalman_converged = True
            self.add_event(t_s, "KALMAN", "Digital Twin Kalman filter converged", f"Estimator confidence {confidence_pct:.1f}%")

        cht = [measured.get(f"cht_{i}_k") for i in range(1, 5)]
        max_cht = max(v for v in cht if v is not None and v == v) if any(v is not None for v in cht) else None
        if t_s - self._last_1hz >= 1.0:
            self._last_1hz = t_s
            if max_cht is not None:
                self.max_cht_hist.append((t_s, max_cht))
            for c in SCORE_CHANNELS:
                if c in measured and c in result.expected:
                    self.series.setdefault(c, deque(maxlen=300)).append((measured[c], result.expected[c]))

        score = float(math.tanh(max((abs(detector_ewma.get(c, 0.0)) for c in SCORE_CHANNELS), default=0.0) / ANOMALY_SCORE_SCALE))
        if not self.score_hist or t_s - self.score_hist[-1][0] >= 1.0:
            self.score_hist.append((t_s, score))
        baseline = float(np.percentile([s for _, s in self.score_hist], 10)) if len(self.score_hist) > 10 else score

        ttl = self._time_to_limit()
        self._detection(t_s, result, ttl, max_cht)

        return {
            "anomaly_score": {"value": score, "threshold": ANOMALY_SCORE_ALARM, "baseline": baseline},
            "time_to_limit_s": ttl,
            "fault_matrix": self.fault_matrix(result),
            "banner": self.banner(result, ttl),
            "cylinders": self.cylinders(result, measured, ambient_temp_k, health_vector),
            "attribution": self.attribution(result, selftest),
            "sensor_selftest": selftest,
            "synthesized_channels": synthesized,
            "events_count": len(self.events),
        }

    def _phase_events(self, t_s: float, phase: str, altitude_m: float) -> None:
        if phase == self.phase:
            return
        prev, prev_alt = self.phase, self.phase_alt
        self.phase, self.phase_alt = phase, altitude_m
        if prev is None:
            return
        if prev == "climb":
            self.add_event(t_s, "PHASE", "Top of Climb Reached", f"Level off at {altitude_m:,.0f}m MSL, cruise trim", phase=phase)
        elif phase in PHASE_TITLES:
            self.add_event(t_s, "PHASE", PHASE_TITLES[phase], f"Entering {phase.replace('_', ' ')} at {altitude_m:,.0f}m", phase=phase)
        elif prev_alt is not None and abs(altitude_m - prev_alt) > 150:
            self.add_event(t_s, "PHASE", "Altitude Step Climb", f"Commenced {phase.replace('_', ' ')} at {altitude_m:,.0f}m station", phase=phase)
        else:
            self.add_event(t_s, "PHASE", f"{phase.replace('_', ' ').title()} Phase", f"Station at {altitude_m:,.0f}m", phase=phase)

    def _time_to_limit(self) -> float | None:
        """Linear extrapolation of the hottest head's last 5 minutes to the CHT limit (sim seconds)."""
        pts = [(t, v) for t, v in self.max_cht_hist if t >= (self.max_cht_hist[-1][0] - 300.0)] if self.max_cht_hist else []
        if len(pts) < 30:
            return None
        t = np.array([p[0] for p in pts])
        v = np.array([p[1] for p in pts])
        slope = float(np.polyfit(t - t[0], v, 1)[0])
        limit = self.config.limits.max_cht_k
        if v[-1] >= limit:
            return 0.0
        if slope <= 1e-5:
            return None
        return float((limit - v[-1]) / slope)

    def _detection(self, t_s: float, result: Any, ttl: float | None, max_cht: float | None) -> None:
        # Armed only once the estimator has converged and the engine is past
        # start-up/taxi, so warm-up transients are not reported as detections.
        armed = self.kalman_converged and self.phase not in (None, "taxi", "takeoff")
        residual_alarm = any(result.alarms.get(c) for c in SCORE_CHANNELS)
        classifier_active = any(p >= ACTIVE_P for p in self.probs.values())
        if armed and self.detect_t is None and (residual_alarm or classifier_active):
            self.detect_t = t_s
            self.detect_lead_s = ttl
            top = self._top_residual(result, SCORE_CHANNELS)
            resid = result.residuals.get(top, 0.0) if top else 0.0
            self.add_event(
                t_s, "DETECTED",
                f"Digital Twin anomaly flagged: '{channel_label(top) if top else 'residual'} divergence ({resid:+.1f})'.",
                "", channel=top, residual=resid,
            )
        if max_cht is not None and max_cht >= self.config.limits.max_cht_k and self.limit_crossed_t is None:
            self.limit_crossed_t = t_s
            self.add_event(t_s, "THRESHOLD", "CHT exceedance threshold flag", f"{max_cht - 273.15:.1f} °C ≥ {self.config.limits.max_cht_k - 273.15:.0f} °C limit")
            if self.detect_t is not None and self.detect_lead_s is None:
                self.detect_lead_s = t_s - self.detect_t
        if ttl is not None and ttl <= LIMIT_WARNING_S and not self.limit_warned and self.limit_crossed_t is None:
            self.limit_warned = True
            self.add_event(t_s, "LIMIT_WARNING", "Digital Twin Limit Warning", f"Model predicts redline breach in {ttl / 60:.0f}m", ttl_s=ttl)

    @staticmethod
    def _top_residual(result: Any, channels: list[str]) -> str | None:
        cand = [(abs(result.normalized_residuals.get(c, 0.0)), c) for c in channels if c in result.normalized_residuals]
        return max(cand)[1] if cand else None

    # ------------------------------------------------------------------ views
    def _localize(self, fault: str, result: Any) -> tuple[int | None, str | None]:
        if fault == "sensor_fault":
            sensor = [c for c, v in result.fault_locus.items() if v == "sensor"]
            return None, sensor[0] if sensor else None
        channels = FAULT_CHANNELS.get(fault, [])
        top = self._top_residual(result, channels)
        if fault in CYLINDER_FAULTS and top:
            return int(top.split("_")[1]), top
        return None, top

    def fault_matrix(self, result: Any) -> list[dict[str, Any]]:
        rows = []
        for fault, p in sorted(self.probs.items(), key=lambda kv: -kv[1]):
            state = _state_for(p)
            if state == "NONE":
                continue
            track = self.tracks[fault]
            hist = [(t, q) for t, q in track.history if t >= track.history[-1][0] - TREND_WINDOW_S]
            rate = float(np.polyfit([t for t, _ in hist], [q for _, q in hist], 1)[0] * 3600 * 100) if len(hist) >= 3 else 0.0
            # Intermittent: repeatedly crossing the PREDICTED band with hysteresis.
            flips, above = 0, None
            for _, q in hist:
                if above is None:
                    above = q >= PREDICTED_P
                elif above and q < PREDICTED_P - 0.05:
                    above, flips = False, flips + 1
                elif not above and q >= PREDICTED_P + 0.05:
                    above, flips = True, flips + 1
            if flips >= 4:
                trend = "Intermittent"
            elif rate > 2.0:
                trend = "Increasing"
            elif rate < -2.0:
                trend = "Decreasing"
            else:
                trend = "Stable"
            cyl, channel = self._localize(fault, result)
            subsystem = FAULT_SUBSYSTEM.get(fault, "")
            risk = result.health.subsystem_risk.get(subsystem, "NORMAL")
            severity = (risk if risk != "NORMAL" else "WATCH") if state == "ACTIVE" else ("PREDICTED" if state == "PREDICTED" else "LOW/MONITOR")
            label = self.kb.fault_label(fault)
            if cyl is not None:
                label += f" Cyl {cyl}"
            elif fault == "sensor_fault" and channel:
                label = f"Sensor drift {channel_label(channel)}"
            rows.append({
                "fault_type": fault, "label": label, "subsystem": self.kb.fault_subsystem(fault),
                "confidence": p, "state": state, "severity": severity,
                "first_detected_t": track.first_detected_t, "trend": trend, "trend_rate_pct_per_h": rate,
                "cylinder": cyl, "channel": channel,
            })
        return rows[:5]

    def banner(self, result: Any, ttl: float | None) -> dict[str, Any] | None:
        active = [(p, f) for f, p in self.probs.items() if p >= ACTIVE_P]
        if not active:
            return None
        p, fault = max(active)
        meta = self.kb.faults.get(fault, {})
        _, channel = self._localize(fault, result)
        return {
            "fault_type": fault,
            "title": meta.get("banner", "Anomaly Detected"),
            "confidence": p,
            "health_label": meta.get("health_label", self.kb.fault_label(fault)),
            "channel": channel,
            "channel_label": channel_label(channel) if channel else None,
            "residual": result.residuals.get(channel) if channel else None,
            "detected_t": self.detect_t,
            "lead_time_s": self.detect_lead_s,
            "time_to_limit_s": ttl,
            "muted": time.time() < self.muted_until_wall,
            "muted_until_wall": self.muted_until_wall or None,
        }

    def cylinders(self, result: Any, measured: dict[str, float], ambient_k: float, health: np.ndarray) -> list[dict[str, Any]]:
        global_cooling = float(result.degradation_state.get("cooling_effectiveness", 1.0))
        out = []
        for i in range(1, N_CYL + 1):
            cht_m, cht_e = measured.get(f"cht_{i}_k"), result.expected.get(f"cht_{i}_k")
            egt_m, egt_e = measured.get(f"egt_{i}_k"), result.expected.get(f"egt_{i}_k")
            local = global_cooling
            if cht_m is not None and cht_e is not None and cht_m - ambient_k > 5.0:
                local = global_cooling * min(1.0, (cht_e - ambient_k) / (cht_m - ambient_k))
            inj = float(health[HIDX_INJECTOR0 + i - 1])
            assembly = 100.0 * min(local, max(0.0, 1.0 - 2.5 * abs(inj - 1.0)))
            z = result.normalized_residuals.get(f"cht_{i}_k", 0.0)
            status = "WATCH" if assembly < 85 or abs(z) > 3 else "NORMAL"
            if assembly < 70:
                status = "WARNING"
            out.append({
                "cylinder": i, "cht_k": cht_m, "expected_cht_k": cht_e, "egt_k": egt_m, "expected_egt_k": egt_e,
                "cht_residual_k": (cht_m - cht_e) if cht_m is not None and cht_e is not None else None,
                "local_cooling_effectiveness": local, "injector_flow_coeff": inj,
                "assembly_health": assembly, "status": status,
                "sensor_binds": [f"CHT-0{i}", f"EGT-0{i}", f"Spark Igniter {i} (Dual)"],
            })
        return out

    def _integrity_correlation(self, channel: str | None) -> float | None:
        """Sensor-integrity correlation: a grouped channel vs the mean of its siblings
        (same thermal/combustion drivers, so a healthy sensor co-moves with them even
        when its level diverges); other channels vs the twin's expectation.
        """
        if not channel:
            return None
        series = self.series.get(channel, [])
        if len(series) < 20:
            return None
        own = np.array([m for m, _ in series])
        if channel.startswith(("cht_", "egt_")):
            prefix = channel.split("_")[0]
            sib = [self.series.get(f"{prefix}_{i}_k", []) for i in range(1, N_CYL + 1) if f"{prefix}_{i}_k" != channel]
            n = min(len(own), *(len(x) for x in sib))
            if n < 20:
                return None
            ref = np.mean([[m for m, _ in list(x)[-n:]] for x in sib], axis=0)
            own = own[-n:]
        else:
            ref = np.array([e for _, e in series])
        if np.std(own) < 1e-9 or np.std(ref) < 1e-9:
            return 0.0
        return float(np.corrcoef(own, ref)[0, 1])

    def attribution(self, result: Any, selftest: dict[str, dict]) -> dict[str, Any] | None:
        active = [(p, f) for f, p in self.probs.items() if p >= PREDICTED_P]
        if not active:
            return None
        _, fault = max(active)
        _, channel = self._localize(fault, result)
        locus = result.fault_locus.get(channel, "engine") if channel else "engine"
        kind = "sensor" if fault == "sensor_fault" or locus == "sensor" else "engine"
        corr = self._integrity_correlation(channel)
        meta = self.kb.faults.get(fault, {})
        return {
            "fault_type": fault, "kind": kind, "channel": channel,
            "channel_label": channel_label(channel) if channel else None,
            "selftest": selftest.get(channel) if channel else None,
            "tracking_correlation": corr,
            "diagnosis": meta.get("diagnosis", ""),
        }
