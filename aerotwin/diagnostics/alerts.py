"""Alert de-duplication and hysteresis: only emit a new alert when a
subsystem's risk level *worsens*, and only clear it after staying better
for a hold period (avoids flapping on noisy borderline readings).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from aerotwin.health.indices import RISK_LEVELS

RANK = {name: i for i, name in enumerate(RISK_LEVELS)}  # NORMAL=0 ... CRITICAL=3


@dataclass
class Alert:
    """One raised (or cleared) alert event."""

    t_s: float
    subsystem: str
    severity: str
    message: str
    cleared: bool = False


@dataclass
class _SubsystemState:
    current_risk: str = "NORMAL"
    displayed_risk: str = "NORMAL"
    time_at_current: float = 0.0
    last_change_t: float = 0.0


@dataclass
class AlertManager:
    """Tracks per-subsystem risk transitions and emits de-duplicated, hysteresis-gated alerts."""

    hold_time_s: float = 10.0
    _state: dict[str, _SubsystemState] = field(default_factory=dict)

    def update(self, t_s: float, subsystem: str, risk_level: str) -> Alert | None:
        """Feed one subsystem's current risk level; returns a new Alert if one should fire."""
        st = self._state.setdefault(subsystem, _SubsystemState())

        if risk_level != st.current_risk:
            st.current_risk = risk_level
            st.last_change_t = t_s

        held_long_enough = (t_s - st.last_change_t) >= self.hold_time_s
        if not held_long_enough:
            return None

        if st.current_risk == st.displayed_risk:
            return None  # already reflected, nothing to (re)announce

        worsened = RANK[st.current_risk] > RANK[st.displayed_risk]
        alert = Alert(
            t_s=t_s,
            subsystem=subsystem,
            severity=st.current_risk,
            message=(
                f"{subsystem} risk {'escalated' if worsened else 'improved'} to {st.current_risk}"
            ),
            cleared=not worsened,
        )
        st.displayed_risk = st.current_risk
        return alert
