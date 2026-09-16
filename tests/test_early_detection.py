"""The key M5 test: under a cooling-degradation ramp, the UKF's estimated
cooling_effectiveness should track ground truth within ~10%, and the twin's
cooling health index should drop into WATCH *before* the CHT hard-limit
alarm fires. Also saves the comparison plot to docs/figures/early_detection.png.
"""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from aerotwin.faults.sensor_model import SENSOR_SPECS
from aerotwin.physics.engine_model import EngineModel
from aerotwin.physics.state import HIDX_COOLING_EFF, EngineInputs, nominal_health_vector
from aerotwin.twin.config import EngineRegistry
from aerotwin.twin.digital_twin import DigitalTwin
from aerotwin.twin.estimator import MEASUREMENT_CHANNELS

FIG_PATH = Path(__file__).resolve().parents[1] / "docs" / "figures" / "early_detection.png"

ONSET_S = 100.0
RAMP_S = 900.0
SEVERITY_FINAL = 0.6
TOTAL_S = 1300.0
DT = 0.05
WATCH_THRESHOLD = 60.0
WATCH_HOLD_S = 20.0


def test_cooling_degradation_early_detection():
    """UKF tracks cooling_effectiveness accurately and detects degradation before the CHT alarm."""
    config = EngineRegistry().get("rotax914_like")
    rng = np.random.default_rng(1)

    plant = EngineModel(config, health=nominal_health_vector(config.nominal_health.injector_flow_coeff))
    twin = DigitalTwin(config, dt=DT, ukf_update_interval_s=1.0)
    inputs = EngineInputs(
        throttle=0.75, ambient_pressure_pa=101325.0, ambient_temp_k=303.15, altitude_m=0.0, airspeed_mps=15.0
    )

    n_steps = int(TOTAL_S / DT)
    true_cool_hist, est_cool_hist, cool_idx_hist, max_cht_hist, t_hist = [], [], [], [], []

    cht_alarm_t: float | None = None
    watch_t: float | None = None
    watch_run = 0.0

    for i in range(n_steps):
        t = i * DT
        sev = 0.0 if t < ONSET_S else min(SEVERITY_FINAL, SEVERITY_FINAL * (t - ONSET_S) / RAMP_S)
        plant.health[HIDX_COOLING_EFF] = 1.0 - sev
        out = plant.step(inputs)
        flat = out.as_flat_dict()
        measured = {
            c: flat[c] + rng.normal(0, SENSOR_SPECS[c].noise_std if c in SENSOR_SPECS else 0.0)
            for c in MEASUREMENT_CHANNELS
        }
        result = twin.step_live(inputs, measured)
        max_cht = max(flat[f"cht_{k}_k"] for k in range(1, 5))

        if cht_alarm_t is None and max_cht >= config.limits.max_cht_k:
            cht_alarm_t = t
        if result.health.subsystem_index["cooling"] < WATCH_THRESHOLD:
            watch_run += DT
            if watch_run >= WATCH_HOLD_S and watch_t is None:
                watch_t = t - WATCH_HOLD_S
        else:
            watch_run = 0.0

        if i % 40 == 0:  # log every ~2s for the plot, keep memory small
            t_hist.append(t)
            true_cool_hist.append(1.0 - sev)
            est_cool_hist.append(float(twin.model.health[HIDX_COOLING_EFF]))
            cool_idx_hist.append(result.health.subsystem_index["cooling"])
            max_cht_hist.append(max_cht)

    final_true = true_cool_hist[-1]
    final_est = est_cool_hist[-1]
    assert abs(final_est - final_true) < 0.10 * max(final_true, 0.1), (
        f"UKF cooling_effectiveness estimate {final_est:.3f} vs true {final_true:.3f} "
        "should track within ~10%"
    )

    assert cht_alarm_t is not None, "Scenario should eventually cross the CHT hard limit"
    assert watch_t is not None, "Health index should drop into WATCH at some point"
    assert watch_t < cht_alarm_t, (
        f"Health-index WATCH detection (t={watch_t:.1f}s) should precede "
        f"the CHT hard-limit alarm (t={cht_alarm_t:.1f}s)"
    )

    _save_plot(t_hist, true_cool_hist, est_cool_hist, cool_idx_hist, max_cht_hist, config, watch_t, cht_alarm_t)


def _save_plot(t_hist, true_cool, est_cool, cool_idx, max_cht, config, watch_t, cht_alarm_t) -> None:
    FIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    fig, axes = plt.subplots(3, 1, figsize=(8, 9), sharex=True)

    axes[0].plot(t_hist, true_cool, label="true cooling_effectiveness")
    axes[0].plot(t_hist, est_cool, "--", label="UKF-estimated cooling_effectiveness")
    axes[0].set_ylabel("cooling_effectiveness")
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)
    axes[0].set_title("Early detection: UKF health estimate vs ground truth")

    axes[1].plot(t_hist, cool_idx, color="tab:orange")
    axes[1].axhline(WATCH_THRESHOLD, color="gray", linestyle=":", label="WATCH threshold")
    if watch_t is not None:
        axes[1].axvline(watch_t, color="tab:orange", linestyle="--", label=f"health WATCH @ {watch_t:.0f}s")
    axes[1].set_ylabel("cooling health index (0-100)")
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)

    axes[2].plot(t_hist, max_cht, color="tab:red")
    axes[2].axhline(config.limits.max_cht_k, color="black", linestyle=":", label="CHT hard limit")
    if cht_alarm_t is not None:
        axes[2].axvline(cht_alarm_t, color="tab:red", linestyle="--", label=f"CHT alarm @ {cht_alarm_t:.0f}s")
    axes[2].set_ylabel("max CHT (K)")
    axes[2].set_xlabel("time (s)")
    axes[2].legend()
    axes[2].grid(True, alpha=0.3)

    fig.tight_layout()
    fig.savefig(FIG_PATH, dpi=120)
    plt.close(fig)
