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

- **Live Ops** — the primary flight-line view: mode badge, RPM/MAP gauges,
  per-cylinder CHT/EGT bar charts with hard-limit lines, oil/coolant/
  electrical/vibration readouts, a 7-tile subsystem health grid with
  NORMAL/WATCH/WARNING/CRITICAL pills, and an active-alerts panel.
- **Twin Comparison** — pick any channel and see observed (measured) vs
  expected (model-predicted) traces, the residual (observed − expected)
  time series below it, and the UKF's current estimated health-parameter
  vector. This is where you can watch the twin "notice" a fault before any
  limit is crossed.
- **Diagnostics** — recent alerts (from the SQLite alert log) and, once
  you've run `make train`, the offline-evaluated ML layer: SHAP top-factor
  explanations for sample classifier predictions, detection lead time vs a
  hard-limit alarm, RUL RMSE, and the ONNX edge-model latency/size
  benchmark.
- **Trends** — the active session's overall health index, estimated
  `cooling_effectiveness`, and vibration RMS over time, plus an engine
  selector stub for a future fleet view.
- **Mission Planner** — pick an engine + mission, optionally seed the
  check from the current session's estimated health (the "feedback loop"
  checkbox), and run a Monte Carlo go/no-go check. Results show a GO/
  CAUTION/NO-GO verdict, reasons, and a full per-channel margin table
  (limit, worst case, mean, probability of exceedance). This can take
  30-90 seconds — it's genuinely re-simulating the mission many times.
- **Replay** — load any previously saved mission run (from a LIVE session,
  a SIMULATION run, or `make demo`), then play/pause/seek/change speed.
- **Demo Control** — start/stop a LIVE or SIMULATION session, and inject a
  fault into the running session's hidden plant to see the twin react in
  real time (try this alongside Live Ops or Twin Comparison in a second
  tab).
- **Reports** — list stored mission runs and download a post-flight PDF
  report (peak values, time above limits, health-parameter change,
  faults observed) for any of them.

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
