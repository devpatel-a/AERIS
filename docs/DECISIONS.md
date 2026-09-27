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

## D23 — Two M1 physics bugs found and fixed via mission go/no-go testing (M7)
Building the Monte Carlo go/no-go check surfaced two latent M1 calibration
bugs that the M1 unit tests hadn't exercised:
1. **EGT vs altitude.** The original `load_fraction = map_pa / ambient_pressure_pa`
   proxy for combustion load grows with altitude even at constant fueling,
   because a turbo holds MAP ~constant while ambient pressure falls below
   critical altitude — this spuriously pushed EGT far past its limit on
   any climb. Fixed by normalizing MAP against the fixed
   `wastegate_max_map_kpa` ceiling instead of the (altitude-varying)
   ambient pressure (`aerotwin/physics/combustion.py`); `BASE_EGT_K_ABOVE_AMBIENT`
   retuned 670 -> 860 to keep the WOT-sea-level calibration point (~1148 K)
   unchanged.
2. **Oil pressure at idle.** `oil_pressure_kpa` scaled purely linearly with
   RPM from zero, so idle RPM produced pressure below `limits.min_oil_pressure_kpa`
   on every mission's taxi segment, healthy or not. Real oil pumps are
   relief-valve regulated (quick rise off idle, then a plateau); the
   formula now floors at 0.5x the reference pressure
   (`aerotwin/physics/lubrication.py`).

Both are exactly the kind of bug integration testing at the mission level
is supposed to catch that isolated unit tests miss — recorded here per the
"if you get stuck / find an issue, note it and keep going" rule. The full
M1 test suite was re-run after both fixes and still passes.

## D24 — LIVE mode in the API/demo is simulated telemetry, not real CAN
`aerotwin.api.state.Session` runs a hidden "plant" `EngineModel` (ground
truth, degrades under injected faults) alongside the `DigitalTwin`, feeding
the twin only `inputs` and comparing against plant-plus-sensor-noise
`measured` values — the same technique `test_early_detection.py` (M5)
validates. This is what "LIVE" means in the API/dashboard demo: it exactly
matches the LIVE-mode contract (inputs into the model, compare predicted
vs measured) without requiring a live SocketCAN link for the demo to run
anywhere. The CAN publisher/receiver/DataSource stack (M4) remains
independently built and tested for a real deployment; `CanDataSource`
already exists as a drop-in replacement for the plant/sensor-noise path.

## D25 — One global session, async endpoints where they touch it
The API holds exactly one active `Session` at a time (starting a new one
stops the old one) — adequate for a single-operator GCS demo, not a
multi-tenant service. Endpoints that create or cancel the background
physics task (`/api/live/start`, `/api/live/stop`, `/api/simulate/start`)
are `async def` so they run on the actual event-loop thread where
`asyncio.create_task`/`Task.cancel()` are valid; endpoints that only read
state stay plain `def` (FastAPI runs those in a worker thread, which is
fine for read-only access). The SQLite connection is opened with
`check_same_thread=False` for the same reason — access is effectively
serialized by there being one session, not genuinely concurrent.

## D26 — Mission risk checks run on a bounded time window
`run_mission_go_no_go` caps each Monte Carlo sample to `max_duration_s`
(default 45 minutes) via `MissionRunner.run(max_duration_s=...)` regardless
of the requested mission's nominal length — an 18-hour endurance mission's
worst-case thermal margins are already visible within its climb/early
-cruise window, and running 10+ full-length Monte Carlo samples through the
API within an interactive request would be far too slow.

## D27 — The demo runs an accelerated window, not the literal 18 simulated hours (M10)
An early version of `scripts/demo.py` tried a 30-second UKF update cadence
over the full `isr_18h_endurance` mission to keep runtime short. The UKF
diverged (`LinAlgError: ... not positive definite`): a single RK4 step of
30 simulated seconds is too large for this engine's fast dynamics (intake
filling, crank speed) to stay numerically stable inside the unscented
transform — the M5 early-detection test's 1.0s cadence is the validated
stable choice (D17), and that cost (~17ms/update) is what it is. Running
that cadence for the *full* 18 hours (64800 updates) is correct but takes
~18 real minutes. Since the demo's purpose is to show the detection
storyline, not to additionally prove 18-hour runtime scaling (already
covered separately by `test_speed_benchmark_50x_realtime` and the M1/M2
timing notes), `scripts/demo.py` instead runs the *exact* scenario
`test_cooling_degradation_early_detection` already validates (a 25-minute
hot, low-airspeed cruise/loiter window, onset=100s, ramp=900s,
severity=0.6) at the stable 1.0s UKF cadence — same physics, same fault
mechanics, same detection logic, a representative slice of the mission
instead of its full duration. The full 18-hour profile remains exactly
as specified in `configs/missions/isr_18h_endurance.yaml` and is what
`scripts/run_mission.py`, `scripts/generate_dataset.py`, and the Mission
Planner page actually run.

## D28 — Generalization proof: same code, second engine config only (M9)
`configs/engines/na_carbureted_like.yaml` describes a naturally-aspirated,
air-cooled, carbureted boxer (`turbo.present: false`, `cooling.type:
"air_cooled"`, `fuel.system_type: "carburetor"`). It required zero changes
to `aerotwin/physics`, `aerotwin/twin`, `aerotwin/faults`,
`aerotwin/simulation`, or the API — only calibrating its own
`propeller.load_coefficient` and `limits.max_egt_k` the same way the
primary engine was calibrated in D6 (throttle sweep to WOT rated RPM/
power, then a small margin above the resulting steady-state EGT).
`tests/test_second_engine.py` runs the full stack against it: registry
lookup, steady-state limits, mission + fault injection, DigitalTwin, and
mission go/no-go — proving the "no code changes" claim rather than just
asserting it.

## D29 — Docker daemon unavailable in this build environment
`docker compose config` validates the compose file cleanly, and both
Dockerfiles (backend: pip install -e the package; dashboard: multi-stage
Vite build → nginx) build on standard images, but this sandboxed session
has no reachable Docker daemon (`docker info` fails to connect to
`/var/run/docker.sock`), so an actual `docker compose build`/`up` could not
be exercised end-to-end here. The backend and dashboard were instead
verified directly (`uvicorn` + `npm run dev`) against each other, including
live WebSocket streaming, fault injection, and a mission-risk check
through the real browser UI — the Dockerfiles wrap that exact same
`pip install -e .` / `npm run build` path, so this is a reasonably low-risk
gap, but it is an untested step and worth a real `docker compose up`
before relying on it operationally.

## D30 — Fresh-clone verification passed (M10 final check)
Cloned the repo into a scratch directory, created a new venv, and ran
`make install && make dataset && make train && make demo` with no manual
intervention beyond the venv itself (see D-note below on why a venv is
needed at all). It reproduced the exact same demo storyline and timings
as the working-copy runs throughout this log: CAN mechanism check, twin
detection at t≈12.1min (WARNING), CHT hard-limit alarm at t≈17.4min
(341s after detection), correct `cooling_degradation` classification with
SHAP factors, RUL 2.2h mean, maintenance advisory, hot-weather NO-GO
verdict, and a saved mission + PDF report. The only gap found was
`onnxscript` missing from the `ml` extra (torch's ONNX exporter needs it
at import time) — fixed in `pyproject.toml` and verified by re-running the
fresh clone against the fix before it passed.

Note on the venv requirement: `filterpy`'s legacy `setup.py` build fails
under this environment's system Python because of a Debian/Ubuntu
distutils patch incompatibility (`AttributeError: install_layout`) when
building in an isolated pip build environment against the system
`dist-packages`; a plain `python3 -m venv` sidesteps it entirely (a clean
venv's distutils isn't patched the same way). `make install` runs
`python3 -m pip install -e ".[dev,ml]"` as documented; on a system where
this build issue doesn't reproduce, a venv isn't strictly required, but
it's the recommended, safe default and is what every verification run in
this log used.

(Further decisions appended below as milestones progress.)

## Stitch UI rebuild — Phase 1 (shell, routes, login)
- **UI source of truth** is the Stitch project "AeroTwin Drone Engine Intelligence";
  design tokens in `dashboard/tailwind.config.js` are copied from its exports.
- **Operator login** is a simple application auth flow (no CAC/PIV hardware or
  WebAuthn): operator ID + 6-8 digit PIN (salted PBKDF2) + clearance role →
  HMAC-signed bearer token recorded in `auth_sessions` (expiry + revocation).
  The "Insert CAC" button is kept as designed and moves focus to the PIN field.
  The static `AEROTWIN_TOKEN` still authorizes scripts/tests.
- **Demo operators** are seeded from `configs/users/operators.yaml` on first
  API start (`python -m scripts.create_user --seed` to reseed).
- **Fleet tails** were renumbered to the squadron identities shown in Stitch
  (UAV-07/03/11/02/09/05); existing runs are remapped once (`PRAGMA user_version` 2).
- **Station identity + datalink budget** live in `configs/gcs/station.yaml`;
  link margin is a free-space link budget at the live slant range.

## Stitch UI rebuild — Phase 2 (backend for every screen)
- **Rotax 914 limits + cooling calibration.** CHT limit is now the real Rotax 914
  135 °C (was 235 °C, an air-cooled figure); EGT 950 °C. `cylinder_ambient_htc_ref`
  raised 55 → 70 so a healthy engine stays under 135 °C in climb on a +12 °C ISA
  day (120–130 °C), while 18 % cooling loss or a 45 °C day breach it. Rear
  cylinders carry a small cooling bias (`cylinder_cooling_bias`), so Cyl 3 runs hottest.
- **Localized cooling fault.** `cooling_degradation` with a cylinder target models a
  blocked duct: shared cooling path −25 %·severity, target head −35 %·severity.
- **Sensor vs engine attribution.** Live sensor faults are now actually applied to
  live measurements, and a simulated ECU loop self-test (thermocouple/transducer loop
  resistance) accompanies each channel. An odd-one-out residual with a healthy loop
  is attributed to a localized *engine* fault; with an abnormal loop, to the *sensor*.
  Dropped samples (NaN) are synthesized from the twin ("Failsafe: Twin Synth").
- **Retrained classifier** on 150 samples with the new physics (half of the cooling
  cases localized): macro F1 0.32 → 0.96 (docs/ML_RESULTS.md).
- **Lifetime RUL** = engine hours until the overall health index reaches the
  maintenance threshold (70), from an exponential degradation fit over the tail's
  recent sorties + the live point, bootstrap 90 % CI, capped at the TBO horizon.
  The old in-flight particle filter (hours of *this* flight) is no longer shown.
- **Stored telemetry** is 1 Hz, holds what the GCS received (measured values), the
  twin's expected values and the classifier's residual features, so Replay can re-run
  root-cause analysis on any stored window.
- **HIL CAN bus.** Each live tick publishes the DBC frames on a per-session CAN
  channel and decodes them with the receiver (heartbeat gaps/checksums); a telemetry
  packet is HMAC-signed/verified once per simulated second.
- **Planner** runs full-length missions at dt = 1 s (coarser steps are unstable) in
  a process pool: central + 5 Monte Carlo + 2 mitigation runs (~20–30 s for 18 h).
- **Fleet history** is seeded by `make seed`: every sortie in
  `configs/history/fleet_history.yaml` is simulated through plant + twin + nominal
  model + classifier. For speed the history twin uses the tail's *true* global wear
  state (what the UKF converges to) instead of running the UKF itself.
- Coolant pressure/flow, oil consumption and harmonic vibration (ips + envelope) are
  new model outputs, all tagged approx in the engine YAML.

## Phase 3 — Stitch screens (visual fidelity notes)

- **Source of truth** is the Stitch project "AeroTwin Drone Engine Intelligence";
  each page was converted from its exported HTML and compared side by side at
  1280×1024. Values differ from Stitch's mock numbers wherever the data is real.
- **Intentional deviations:** Digital Twin toolbar/layer panel sits above the
  cylinder popover (z-40) so the layers stay clickable; "Breach Probability"
  wording in the planner; the twin version chip reads "PARAMETRIC MODEL"; model
  names are the real ones (UKF, XGBoost fault classifier, linear degradation
  trend) instead of Stitch's "PINN-Prop-v4" / "L-M Solver" / "Weibull"; HIL/HMAC
  footer text reflects the virtual bus on non-Linux; Replay export reads
  "CRC-32 on export"; no Settings screen (not designed).
- **Detection arming.** Detection, diagnosis, RUL events and limit warnings wait
  for UKF convergence or `ARM_MAX_WAIT_S` (900 s), past taxi/takeoff. A fault
  injected before convergence can hold confidence below 95 % indefinitely, so the
  time fallback keeps detection working; the seeder uses the same rule.
- **Live RUL** ignores the live health index until armed (warm-up health is not
  wear); before that the prognosis uses the stored sortie history only.
- **Report sign-off** has two slots signed by SHA-256 over the content (the
  maintenance digest also covers the engineering digest); each needs its clearance
  role in the current session.
- **Report divergence chart** uses airborne samples after 900 s only.
- **Twin confidence in seeded reports** is "--": the history seeder runs the twin
  open-loop (no UKF) for speed, so there is no estimator confidence to report.

## Mission Planner as a real planning tool

- **One mission system.** A saved plan (`mission_plans`) stores the planner form
  and its compiled `MissionConfig`, registered in the app's `MissionRegistry` as
  `plan_NNNN` (loaded at API start). Sessions, replay, fleet history and reports
  resolve it like a YAML preset; presets are the *mission types*
  (`MissionConfig.origin == "preset"`), plans are never offered as types.
- **Plan frame, not geography.** AERIS has no base coordinates, so waypoints are
  km east/north of the GCS. Leg ground speed = TAS − the template's mean headwind
  on every transit leg (conservative; the headwind the Stitch "Headwind" factor
  shows). Climb/descent times use the airframe climb/descent rates in
  `configs/planner.yaml` (approx — replace with the flight manual).
- **Route → segments.** taxi/takeoff (template) → climb → one `transit` per leg,
  a `hold` at waypoints with a hold time, the station waypoint's hold named after
  the template's on-station segment (`loiter`, `cap_station`, …) and absorbing
  the remaining endurance → `transit_home` → descent → landing (template).
- **Datalink check** uses the station budget: free-space margin at the slant range
  from the GCS mast and the 4/3-earth radio horizon (`gcs_antenna_height_m`).
- **Edits invalidate the stored verdict**; a plan in flight cannot be edited and a
  flown plan cannot be deleted (replay/history keep its mission definition).
- **Twin evaluation** of a routed plan keeps power and surface temperature as
  overrides so the "GO with condition" re-run can still vary them.

## Interaction fixes (click audit)

- Notifications bell had no handler: now a popover of the session's alerts with
  acknowledge (`POST /api/alerts/ack`, persisted in the `alerts.acknowledged`
  column when the sortie is saved); the dot shows unacknowledged alerts.
- Digital Twin camera presets could not re-snap after orbiting/panning (clicking
  the selected preset did nothing): presets now always re-frame and reset the pan.
- Mission Replay timeline markers seconds apart overlapped and hid each other:
  markers closer than 1 % of the timeline are clustered (tooltip lists all).
- Simulation Control labels the "Standard Day" chip as the plan's own environment
  when flying a saved plan.
