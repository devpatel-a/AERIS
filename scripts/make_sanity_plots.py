"""Generate M1 sanity plots into docs/figures/ (not part of the pytest suite)."""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from aerotwin.physics.atmosphere import isa_pressure_temp
from aerotwin.physics.engine_model import EngineModel
from aerotwin.physics.state import HIDX_COOLING_EFF, EngineInputs, nominal_health_vector
from aerotwin.twin.config import EngineRegistry

FIG_DIR = Path(__file__).resolve().parents[1] / "docs" / "figures"
FIG_DIR.mkdir(parents=True, exist_ok=True)


def run(model: EngineModel, inputs: EngineInputs, seconds: float) -> list:
    """Step a model forward and return the list of EngineOutputs."""
    outs = []
    for _ in range(int(seconds / model.dt)):
        outs.append(model.step(inputs))
    return outs


def plot_rpm_steady_state(config) -> None:
    """RPM vs time for a throttle step, showing convergence to steady state."""
    inputs = EngineInputs(throttle=0.6, ambient_pressure_pa=101325.0, ambient_temp_k=288.15, altitude_m=0.0, airspeed_mps=40.0)
    model = EngineModel(config)
    outs = run(model, inputs, 120.0)
    t = np.arange(len(outs)) * model.dt
    rpm = [o.rpm for o in outs]
    plt.figure(figsize=(7, 4))
    plt.plot(t, rpm)
    plt.xlabel("time (s)")
    plt.ylabel("RPM")
    plt.title("RPM step response reaching steady state (throttle=0.6)")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(FIG_DIR / "rpm_steady_state.png", dpi=120)
    plt.close()


def plot_turbo_altitude(config) -> None:
    """Power vs altitude at WOT, showing the critical-altitude knee."""
    altitudes = np.linspace(0, 9000, 19)
    powers = []
    for alt in altitudes:
        p, t = isa_pressure_temp(float(alt))
        inputs = EngineInputs(throttle=1.0, ambient_pressure_pa=p, ambient_temp_k=t, altitude_m=float(alt), airspeed_mps=50.0)
        model = EngineModel(config)
        out = run(model, inputs, 200.0)[-1]
        powers.append(out.power_w / 1000.0)
    plt.figure(figsize=(7, 4))
    plt.plot(altitudes, powers, marker="o")
    plt.axvline(config.turbo.critical_altitude_m, color="r", linestyle="--", label="critical altitude")
    plt.xlabel("altitude (m)")
    plt.ylabel("power (kW)")
    plt.title("WOT power vs altitude — turbo holds power below critical altitude")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(FIG_DIR / "turbo_altitude_power.png", dpi=120)
    plt.close()


def plot_cooling_degradation(config) -> None:
    """CHT vs time for healthy vs degraded cooling_effectiveness."""
    inputs = EngineInputs(throttle=0.7, ambient_pressure_pa=101325.0, ambient_temp_k=298.15, altitude_m=0.0, airspeed_mps=30.0)
    healthy = nominal_health_vector(config.nominal_health.injector_flow_coeff)
    degraded = healthy.copy()
    degraded[HIDX_COOLING_EFF] = 0.55

    model_h = EngineModel(config, health=healthy)
    model_d = EngineModel(config, health=degraded)
    outs_h = run(model_h, inputs, 300.0)
    outs_d = run(model_d, inputs, 300.0)
    t = np.arange(len(outs_h)) * model_h.dt
    plt.figure(figsize=(7, 4))
    plt.plot(t, [o.cht_k[0] for o in outs_h], label="healthy cooling")
    plt.plot(t, [o.cht_k[0] for o in outs_d], label="degraded cooling_effectiveness=0.55")
    plt.xlabel("time (s)")
    plt.ylabel("CHT cyl-1 (K)")
    plt.title("Cooling degradation raises steady-state CHT")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(FIG_DIR / "cooling_degradation_cht.png", dpi=120)
    plt.close()


def plot_misfire_vibration(config) -> None:
    """Vibration RMS before/during an intermittent misfire."""
    inputs = EngineInputs(throttle=0.6, ambient_pressure_pa=101325.0, ambient_temp_k=288.15, altitude_m=0.0, airspeed_mps=40.0)
    model = EngineModel(config)
    run(model, inputs, 200.0)
    vib = []
    for i in range(int(10.0 / model.dt)):
        if 100 < i < 150:
            model.misfire_mask = np.array([0.0, 1.0, 1.0, 1.0]) if (i // 4) % 2 == 0 else np.ones(4)
        else:
            model.misfire_mask = np.ones(4)
        vib.append(model.step(inputs).vibration_rms_g)
    t = np.arange(len(vib)) * model.dt
    plt.figure(figsize=(7, 4))
    plt.plot(t, vib)
    plt.axvspan(100 * model.dt, 150 * model.dt, color="r", alpha=0.15, label="intermittent misfire")
    plt.xlabel("time (s)")
    plt.ylabel("vibration RMS (g)")
    plt.title("Intermittent misfire raises vibration RMS")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(FIG_DIR / "misfire_vibration.png", dpi=120)
    plt.close()


def main() -> None:
    """Generate all M1 sanity plots."""
    config = EngineRegistry().get("rotax914_like")
    plot_rpm_steady_state(config)
    plot_turbo_altitude(config)
    plot_cooling_degradation(config)
    plot_misfire_vibration(config)
    print(f"Wrote sanity plots to {FIG_DIR}")


if __name__ == "__main__":
    main()
