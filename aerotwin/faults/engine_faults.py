"""Engine-level fault effects: mutate an EngineModel's health vector / hooks in place.

Called once per physics step via `FaultInjector.step_callback`. Faults act on
the *health-parameter vector* or the model's fault-injection attributes
(`misfire_mask`, `vibration_imbalance_severity`, `combustion_efficiency_override`)
— never by poking state variables directly — so their effect flows through
the same physics as a real degradation would.
"""

from __future__ import annotations

import numpy as np

from aerotwin.faults.specs import FaultSpec, severity_at
from aerotwin.physics.combustion import COMBUSTION_EFFICIENCY_NOMINAL
from aerotwin.physics.engine_model import EngineModel
from aerotwin.physics.state import (
    HIDX_ALT_EFF,
    HIDX_COOLING_EFF,
    HIDX_INJECTOR0,
    HIDX_OIL_PUMP_EFF,
    HIDX_TURBO_EFF,
)

_COMBUSTION_RESAMPLE_PERIOD_S = 0.25


def apply_engine_fault(
    t: float,
    model: EngineModel,
    spec: FaultSpec,
    rng: np.random.Generator,
    state: dict,
) -> None:
    """Mutate `model` in place to reflect `spec`'s effect at time t.

    `state` is a plain dict private to this fault instance, used to carry
    resample timers (e.g. for combustion_instability) across calls.
    """
    sev = severity_at(t, spec)

    if spec.fault_type == "cooling_degradation":
        model.health[HIDX_COOLING_EFF] = 1.0 - sev

    elif spec.fault_type == "overheating_trend":
        # Same mechanism as cooling_degradation but intended for milder severities,
        # meant to be combined with a hot/low-airspeed mission segment.
        model.health[HIDX_COOLING_EFF] = 1.0 - 0.5 * sev

    elif spec.fault_type == "lubrication_issue":
        model.health[HIDX_OIL_PUMP_EFF] = 1.0 - sev

    elif spec.fault_type == "turbo_degradation":
        model.health[HIDX_TURBO_EFF] = 1.0 - sev

    elif spec.fault_type == "alternator_degradation":
        model.health[HIDX_ALT_EFF] = 1.0 - sev

    elif spec.fault_type == "injector_abnormality":
        cyl = int(spec.target) if spec.target is not None else 0
        sign = spec.extra.get("direction", -1.0)  # -1 = lean/under-fuel, +1 = rich/over-fuel
        model.health[HIDX_INJECTOR0 + cyl] = float(np.clip(1.0 + sign * sev, 0.05, 1.8))

    elif spec.fault_type == "misfire":
        cyl = int(spec.target) if spec.target is not None else 0
        period_s = spec.extra.get("period_s", 2.0)
        cut_fraction = spec.extra.get("cut_fraction", 1.0)
        mask = np.ones(4)
        if sev > 0:
            duty = sev
            phase = (t - spec.onset_s) % period_s
            if phase < duty * period_s:
                mask[cyl] = 1.0 - cut_fraction
        model.misfire_mask = mask

    elif spec.fault_type == "abnormal_vibration":
        model.vibration_imbalance_severity = sev

    elif spec.fault_type == "combustion_instability":
        if sev <= 0:
            model.combustion_efficiency_override = None
        else:
            last_t = state.get("last_resample_t", -1.0)
            if t - last_t >= _COMBUSTION_RESAMPLE_PERIOD_S:
                noise = rng.normal(0.0, sev * 0.15)
                state["value"] = float(
                    np.clip(COMBUSTION_EFFICIENCY_NOMINAL * (1.0 + noise), 0.5, 1.0)
                )
                state["last_resample_t"] = t
            model.combustion_efficiency_override = state.get("value", COMBUSTION_EFFICIENCY_NOMINAL)

    else:
        raise ValueError(f"Unknown engine fault_type '{spec.fault_type}'")
