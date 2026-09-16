# Engineering Decisions Log

Running log of pragmatic choices made while building AeroTwin, in
chronological order. Each entry: what, why, impact.

## D0 — Overall scope calibration
This is a hackathon-grade reference implementation, not a certified flight
system. Where the spec allows "simple, stable, fast first", we take the
simplest model that produces physically-plausible, monotonic, testable
behaviour rather than chasing OEM-accurate coefficients. All such
placeholders are tagged `# approx — replace with OEM data` in YAML/code.

## D1 — Repo/package naming
Task text alternates between "aero-twin/" (repo) and `aerotwin` (Python
package). We use `aerotwin` as the importable package name (valid Python
identifier) living at the repo root (this repo *is* aero-twin), avoiding an
unnecessary nested `aero-twin/aerotwin/` directory since the git repo itself
is already the project root.

## D2 — Physics fidelity
MVEM (mean value engine model) uses lumped per-cylinder thermal nodes and a
Wiebe-derived combustion efficiency curve, not full crank-angle-resolved
combustion. This keeps the model fast (target: 50x+ real time) and stable
under RK4 at 20 Hz, while still exposing per-cylinder CHT/EGT spread needed
for fault signatures (misfire, injector imbalance).

## D3 — State/health vector layout (M1)
Fast state vector (14 floats): crank omega, manifold pressure, 4x CHT,
coolant temp, oil temp, 4x EGT (first-order lag), battery SOC, crank phase
theta (integrated for future use, not yet consumed). Health vector (10
floats): VE factor, cooling effectiveness, 4x injector flow coefficient,
friction factor, oil pump efficiency, turbo efficiency, alternator
efficiency — a plain random-walk vector owned externally (UKF in LIVE mode,
fault injector in SIMULATION mode); `EngineModel` never mutates it itself.

## D4 — Turbo/NA unification
Rather than two separate intake code paths, `intake.map_target_pa` uses one
formula: achievable MAP = min(wastegate_max, ambient_pressure *
max_pressure_ratio * turbo_efficiency), where `max_pressure_ratio` is
calibrated so ambient_pressure(critical_altitude) * max_pressure_ratio ==
wastegate_max. Below critical altitude the wastegate has spare capacity and
clamps MAP constant (power held); above it, achievable MAP falls with
ambient pressure like a real turbo running out of exhaust energy. Setting
`turbo.present=False` (max_pressure_ratio=1.0) reduces this exactly to the
NA case with no separate code path — this is what generalizes to the second
engine in M9.

## D5 — No crank-resolved combustion or true RPM oscillation
The MVEM has no crank-angle-resolved heat release, so there is no physical
mechanism for continuous per-firing-event RPM ripple. "Misfire causes RPM
ripple" is realized by treating misfire as an *intermittent* fuel-cutout on
one cylinder (matching the M3 fault spec's "misfire, intermittent"): each
on/off transition perturbs the torque balance and produces a measurable
increase in RPM variance over a window, together with a measurable rise in
the synthetic vibration RMS (which reacts to per-cylinder fuel imbalance).
This is validated directly by `test_misfire_causes_rpm_ripple_and_vibration_change`.

## D6 — Calibration approach
Component-level constants (thermal effective efficiency, propeller load
coefficient, cooling/oil heat-transfer coefficients) were hand-tuned by
running the model to steady state across a throttle sweep and adjusting
until: WOT reaches ~rated RPM/power, CHT/EGT/oil-pressure/oil-temp stay
within the configured `limits` at rated power, and all M1 tests pass. This
is a first-order calibration for demonstration purposes, not an OEM match —
all tuned constants keep their `# approx — replace with OEM data` tags.

## D7 — Mission profile interpolation (M2)
Each segment's altitude/airspeed/throttle targets are reached by linear ramp
from the value at the end of the previous segment over that segment's
`duration_s`. This keeps mission YAMLs simple (one target triple per phase)
while avoiding input discontinuities that would otherwise create
unphysical instantaneous jumps at segment boundaries (e.g. throttle
snapping 0.15 -> 0.95 in one timestep). `isa_deviation_k` may be overridden
per-segment (else falls back to the mission's `environment.base_isa_deviation_k`)
to support time-varying weather, though none of the four initial missions
need per-segment overrides yet.

## D8 — MissionRunner fault hook
`MissionRunner.run()` takes an optional `step_callback(t, model)` invoked
every raw physics step (before logging). This is the only integration point
the M3 `FaultInjector` needs — it mutates `model.misfire_mask`,
`model.health`, etc. directly — so `aerotwin.simulation.mission` does not
need to import or know about `aerotwin.faults` at all.

## D9 — `--speed` is a pacing knob, not a physics shortcut
`scripts/run_mission.py --speed` is reserved for the M4 CAN publisher's
real-time playback pacing (sleeping between frames to simulate a given
speed-up over wall-clock flight time). It does not change the number of
20 Hz physics steps computed — a full 18h mission always integrates
~1.3M RK4 steps. Offline dataset generation always runs at full compute
speed (no sleep); at the M1-benchmarked speedup this takes low
single-digit minutes per 18h mission, which is why M3's dataset generator
biases toward shorter missions and uses multiprocessing across mission
workers to hit its 10-minute default budget.

(Further decisions appended below as milestones progress.)
