# AeroTwin User Guide

This guide covers operating the AeroTwin dashboard and CLI tools once the
backend (`make api`) and dashboard (`make dashboard`) are running.

## Signing in

The dashboard opens on the **Secure Access** screen. Sign in with an operator
ID, a 6-8 digit PIN, a clearance role and the airframe you are assigned to.
Demo operators (seeded from `configs/users/operators.yaml` on first API start;
`make users` reseeds them):

| Operator ID | Name | Roles | Demo PIN |
|---|---|---|---|
| MIL-9842-ALPHA | Flight-Line Alpha | all three | 20250704 |
| MIL-4471-ALVAREZ | Lt. Cmdr. Alvarez | UAV Operator, Propulsion Engineer | 44710914 |
| MIL-2210-VANCE | Capt. M. Vance | Propulsion Engineer, Maintenance Technician | 22100914 |
| MIL-3307-VAUGHN | Eng. Vaughn | Propulsion Engineer, Maintenance Technician | 33070914 |

Add real operators with `python -m scripts.create_user <ID> "<Name>" --roles ...`.

## Fleet history

`make seed` simulates each airframe's recorded sorties (see
`configs/history/fleet_history.yaml`) through the physics plant, the twin and
the fault classifier, so Trends & Fleet, Mission Replay and Reports have real
history to show. It takes roughly 15-20 minutes on a 10-core machine.

## Starting a session

1. Open the dashboard at `http://localhost:5173` (or wherever Vite/nginx
   serves it).
2. Go to **Demo Control**. Pick a mission and a playback speed, then click
   **Start LIVE**. This starts a LIVE-mode session: a hidden "ground truth"
   engine model runs the mission, the digital twin is fed only its inputs
   (throttle, ambient conditions, altitude, airspeed) and compares its
   predictions against noisy "measured" telemetry — exactly like a real
   aircraft's CAN bus would provide. See `docs/DECISIONS.md` D24 for why
   this is how the demo/dashboard runs LIVE mode without a physical CAN
   link.
3. Watch **Live Ops** for gauges, per-cylinder CHT/EGT bars (with limit
   lines), oil/coolant/electrical/vibration readouts, health tiles, and
   active alerts, all updating over the WebSocket feed.

## Pages

The eight screens and the login page are rebuilt from the Stitch project
"AeroTwin Drone Engine Intelligence" and share one shell (sidebar + telemetry
header). Live screens show a "waiting for live telemetry" card when no LIVE
session is streaming; start one from Simulation Control.

- **Live Ops** — anomaly banner, overall engine health + lifetime RUL, subsystem
  tiles, RPM/MAP/fuel/power gauges, per-cylinder CHT/EGT matrix, vibration orders.
- **Digital Twin** — three.js parametric boxer engine (camera presets, layers:
  heat map, airflow, x-ray, vibration, exploded view). Click a cylinder for its
  observed vs twin popover (`?cyl=3` deep-links it); observed-vs-expected table,
  UKF health parameters, channel history with the residual anomaly track.
- **Diagnostics** — fault matrix, SHAP attribution, maintenance advisories
  (create work orders), RUL prognostics curve, sensor correlation, event log.
- **Trends & Fleet** — degradation KPIs over the last 20 sorties, fleet status
  table, subsystem health matrix across sorties; CSV export.
- **Mission Planner** — GO / NO-GO: sliders for altitude, duration, ambient ISA
  deviation, airspeed and power; runs the full mission on the twin (with the
  current health estimate if ticked), shows breach points, counter-measures and
  predicted CHT/oil curves.
- **Mission Replay** — sortie archive per tail, synchronized twin + telemetry
  traces with the anomaly marker, playback, key events, root-cause analysis and
  batch HDF5 export (CRC-32 in the `X-CRC32` header).
- **Reports** — airworthiness & mission reports: filter by type, dispatch a new
  report from the quick parameter setup, preview the STANAG A4 sheet, download
  the PDF or raw CSV/HDF5/1553B JSON, send to the flight line. Dual sign-off:
  the chief-engineer slot needs a Propulsion Engineer session, the maintenance
  slot a Maintenance Technician session; the maintenance signature approves
  the report.
- **Simulation Control** — pause/stop/restart/step, time warp, atmosphere
  presets, HIL CAN-bus status, the 10-card fault injection matrix (card 1's
  blockage bar sets severity), twin response log (innovation score, parameter
  convergence, incident timeline with detection latency) and the recommended
  throttle-limit contingency.

Detection, AI diagnosis, RUL revisions and limit warnings are armed once the
engine is past taxi/takeoff and the UKF has converged (or 15 min of mission time
has passed), so warm-up transients are not reported as faults.

## CLI tools

```bash
# Run one named mission and log it to data/missions/
python -m scripts.run_mission --engine rotax914_like --mission isr_18h_endurance

# Generate a synthetic labeled dataset for ML training
python -m scripts.generate_dataset --size small   # or medium / large

# Train anomaly/classifier/RUL/edge models and write docs/ML_RESULTS.md
python -m scripts.train_all

# Run the full M10 demo storyline
python -m scripts.demo

# Regenerate the M1 sanity plots in docs/figures/
python -m scripts.make_sanity_plots
```

## Authentication

State-changing REST endpoints (`/api/live/start`, `/api/live/stop`,
`/api/simulate/start`, `/api/faults/inject`, `/api/replay/start`,
`/api/replay/control`) require a bearer token:

```
Authorization: Bearer devtoken
```

Set `AEROTWIN_TOKEN` in the backend's environment to change it. Read-only
endpoints (engines/missions list, health/latest, advisories, mission risk
check, reports) are unauthenticated in this hackathon build — see
`docs/DEPLOYMENT_ROADMAP.md` for what a production deployment would add.

## Troubleshooting

- **Dashboard shows all zeros / IDLE** — no session is running. Go to
  Demo Control and click Start LIVE.
- **WebSocket keeps reconnecting** — check the backend is running on the
  URL configured in `VITE_API_BASE` (default `http://localhost:8000`);
  the dashboard's WebSocket hook retries with backoff automatically.
- **Mission risk check feels slow** — it's genuinely running several full
  mission simulations (Monte Carlo). Only one check runs at a time; a
  second concurrent request gets a `409` rather than silently queueing
  (see `docs/DECISIONS.md` for why).
- **"No trained model found" on Diagnostics** — run `make dataset && make train`
  first; the classifier/anomaly/RUL artifacts are gitignored under `models/`.
