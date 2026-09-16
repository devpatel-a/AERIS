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

(Further decisions appended below as milestones progress.)
