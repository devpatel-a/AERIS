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

## D10 — Engine faults act on health/hooks, sensor faults act on logged columns (M3)
Engine-level faults (`aerotwin.faults.engine_faults`) mutate the model's
health-parameter vector or its fault-injection attributes
(`misfire_mask`, `vibration_imbalance_severity`, `combustion_efficiency_override`)
once per physics step via `FaultInjector.step_callback`, so their effect
propagates through the real physics. Sensor faults (drift/stuck/noise/
dropout) instead post-process the already-logged `measured_<channel>`
columns after the mission run completes — they perturb *what a sensor
reports*, never the underlying physics — which is exactly the asymmetry
M5's analytical-redundancy logic needs to tell the two apart later.

## D11 — Baseline "sensor realism" vs "sensor faults" are separate layers
`aerotwin.faults.sensor_model.apply_sensor_model` adds noise + quantization
+ a coarse sample-rate hold to *every* known telemetry channel on *every*
run (healthy or faulty) — this is the generic measurement layer the spec
asks for. `aerotwin.faults.sensor_faults` then perturbs one target channel
further, only when a sensor fault is actually injected. Both write into the
same `measured_<channel>` column so downstream consumers never need to know
which layer touched it.

## D12 — Dataset generation uses synthetic short missions, not the 4 named ones
`scripts/generate_dataset.py` builds randomized 5-40 minute missions
in-memory (3-6 segments with random altitude/airspeed/throttle) rather than
running the 4 curated mission YAMLs end-to-end — the latter include an
18-hour endurance profile that would dominate the generation budget. The 4
named missions remain the ones used for the Mission Planner / go-no-go UX
and the M10 demo. Default `--size small` (45 samples) generates in ~90s on
4 cores, comfortably inside the 10-minute budget.

## D13 — One fault per sample, ~30% healthy, ~15% run-to-failure
Each dataset sample carries at most one injected fault (engine or sensor),
matching how the M6 classifier's label space is defined (one class per
fault type + "healthy"). ~30% of samples are healthy baselines. Among
faulty engine-fault samples, ~15% are "run-to-failure" trajectories (a ramp
profile from onset=0 reaching severity=1.0 exactly at the run's end) for
the M6 RUL model; the rest step to a fixed mid-severity partway through the
run, which is more representative of a detectable-but-not-yet-critical
fault window.

## D14 — CAN bus fallback is capability-based, not OS-based (M4)
`aerotwin.acquisition.bus.get_can_bus` always *tries* SocketCAN on `vcan0`
first and only falls back to python-can's in-process `virtual` bus on
failure, rather than branching on `platform.system()`. This is more
correct (a Linux container without the `vcan` kernel module loaded behaves
like "non-Linux" for this purpose) and is what makes the test suite
portable: `tests/test_can_acquisition.py` always exercises the virtual bus
directly, since this sandboxed build environment cannot load kernel
modules. `scripts/setup_vcan.sh` is provided for a real Linux host/CI
runner with the right privileges.

## D15 — Heartbeat "CRC" is a 16-bit rolling checksum
`checksum16` (sum of the counter and status bytes mod 65536) stands in for
a real CRC-16/CCITT — it is enough to prove the corruption-detection and
gap-counting mechanics end-to-end (and is what
`test_heartbeat_gap_detection` / `test_checksum_detects_corruption`
verify) without pulling in a CRC library for a hackathon build. Swapping in
a real CRC-16 later is a one-function change in
`aerotwin/acquisition/publisher.py` / `receiver.py`.

## D16 — DataSource is the seam between LIVE/REPLAY/SIMULATION
`aerotwin.acquisition.datasource.DataSource` is a 4-line ABC
(`read() -> dict | None`, `close()`), with `SimulatorDataSource`,
`ParquetReplayDataSource`, and `CanDataSource` behind it. `aerotwin.api`
(M7) and the Digital Twin Core (M5) depend only on this interface, never on
which concrete source is active — switching LIVE/REPLAY/SIMULATION is a
matter of swapping which `DataSource` is plugged into the same
processing/twin pipeline, not writing three separate code paths.

## D17 — UKF correction runs at ~1 Hz, not the full 20 Hz tick (M5)
The augmented UKF state is 23-dim (13 reduced physics states + 10 health
params), so each predict+update needs 2*(2*23+1)=94 sigma-point
evaluations; reusing `EngineModel` for each (for a single, non-duplicated
physics implementation) measured ~17ms per full UKF step regardless of its
internal `dt`. Running that every 20 Hz tick (50ms budget) would leave
almost no headroom for anything else in the loop or for accelerated
playback. Since health parameters are explicitly "slowly varying" per the
spec, `DigitalTwin` instead runs one UKF correction per
`ukf_update_interval_s` (default 1.0s) — reseeding the UKF's physics
substate from the twin's own fine-grained (20 Hz) `EngineModel` state each
time — while computing residuals every tick from the twin's continuously
-integrated `EngineModel` (held at the last corrected health estimate).
This is a predictor-corrector pattern: 20 Hz predictor (deterministic
physics), ~1 Hz corrector (UKF), and it is what
`test_cooling_degradation_early_detection` validates end-to-end (UKF
converges to within ~0.6% of true `cooling_effectiveness`; runs in ~40s
wall time for a 1300s scenario).

## D18 — Health indices combine estimated health params with limit margins
Each subsystem's 0-100 index is driven primarily by its corresponding UKF
health parameter (e.g. `cooling_effectiveness` -> cooling index), with a
secondary margin-based penalty as the relevant measured output approaches
its configured hard limit (e.g. CHT nearing `max_cht_k`). This is what lets
the index move *before* any hard-limit alarm fires (the M5 key test), since
the health parameter degrades continuously while the limit is a discrete
threshold crossed only much later. Overall risk level is the *worst* of any
subsystem's risk level (bottleneck-driven), while the overall numeric index
is a weighted average (approx weights) for dashboard trending.

## D19 — Sensor-vs-engine fault locus uses a simple odd-one-out heuristic
`classify_fault_locus` compares each channel's normalized-residual
magnitude against the median of its correlated-group siblings
(`CORRELATED_GROUPS`: the 4 CHTs, the 4 EGTs). A channel far above both an
absolute threshold and a multiple of its siblings' median is flagged
`"sensor"`; if the whole group is elevated together, every member is
flagged `"engine"` (common-mode). This is the M5 "core rule" analytical
redundancy check, kept to the two grouped channel families that actually
have per-cylinder redundancy in this engine.

## D20 — ML training uses a cheap nominal-health residual, not per-sample UKF (M6)
Running the full 17ms/step UKF (D17) across every dataset sample for
feature engineering would take hours even on the small dataset (many
thousands of 1Hz updates). Since `nominal_residual_pass` only needs a
*consistent* comparison signal (not a corrected health estimate) to expose
fault signatures to the classifier, M6 instead re-simulates each sample's
logged inputs through a single nominal-health `EngineModel` at the sample's
own 1 Hz logging cadence and takes `measured - nominal_expected` as the
residual. This is cheap (one extra physics pass per sample, same row
count) and is exactly the "never compare the model against its own inputs"
rule applied to offline training data. The already-built, already-tested
UKF (M5) remains what actually drives health estimation in LIVE/REPLAY.

## D21 — Windowed labeling, RUL ground truth, and the "sensor_fault" class
Features are built as sliding 30s windows (15s stride) over each sample,
labeled `"healthy"` unless the window's mean injected-fault severity
exceeds 0.05 — so pre-onset windows of an otherwise-faulty run are
correctly labeled healthy instead of leaking the sample-level label onto
healthy segments. Per the spec's explicit "(including 'healthy' and
'sensor_fault' classes)" phrasing, all 4 sensor-fault types collapse into
one `sensor_fault` class (`collapse_fault_class`) — telling *that* a
channel is misbehaving matters more than which drift/stuck/noise/dropout
mode caused it. RUL evaluation uses the dataset's own ground-truth health
parameters (not a live UKF) to build the health-index trajectory fed to
the particle filter, since `run_to_failure` samples are constructed to
reach severity=1.0 exactly at the log's last row — giving a known true
time-to-failure to RMSE against.

## D22 — Small default dataset gives an honest, imperfect ML_RESULTS.md
`scripts/train_all.py` runs end-to-end against the default `--size small`
(45-sample) dataset in under 2 minutes. With only ~2-4 samples per fault
class, some classes land zero rows in the 25%-by-mission test split and
the classifier under-performs on visually-similar pairs (`misfire` vs
`injector_abnormality`, and the 4-way-collapsed `sensor_fault`). Rather
than hand-tune the demo to hide this, `ML_RESULTS.md` reports it plainly
under "Known limitations" and names `--size medium`/`large` as the fix —
consistent with "choose the simpler working approach and record it."

(Further decisions appended below as milestones progress.)
