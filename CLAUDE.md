# AeroTwin — Project Charter (condensed working spec)

**AeroTwin**: AI-enabled real-time digital twin for health monitoring, fault
prediction and mission reliability of aero piston engines used in MALE UAVs
(Smart India Hackathon). Reference engine: Rotax 914-class turbocharged
4-cylinder boxer, ~115 hp.

## Core idea
ONE virtual engine (`EngineModel` inside `DigitalTwin`) serves both:
- **LIVE mode**: fed by real/CAN telemetry inputs, outputs compared against
  measured outputs to produce residuals.
- **SIMULATION mode**: fed by mission-defined inputs for what-if / go-no-go
  analysis, using the *current estimated health state* as its starting point.

**Golden rule**: in LIVE mode, only feed *input* signals (throttle, ambient
conditions, altitude, airspeed) into the model. Never compare the model
against its own inputs — only compare its *predicted outputs* against
*measured outputs*.

## Degradation & health
Slowly varying health parameters are tracked with an Unscented Kalman Filter
(random-walk process model): `volumetric_efficiency_factor`,
`cooling_effectiveness`, `injector_flow_coeff[i]`, `friction_factor`,
`oil_pump_efficiency`, `turbo_efficiency`, `alternator_efficiency`.

- Anomaly detection runs on **residuals** (observed − expected), never raw
  values.
- Sensor faults vs engine faults are separated via analytical redundancy:
  one channel off + correlated channels/estimator agree → sensor fault;
  correlated channels move together → engine fault.
- "Coding degradation" in the original problem statement = **cooling**
  degradation.
- Degradation state feeds back into SIMULATION mode so mission go/no-go
  reflects current engine health.

## Tech stack
Python 3.11 · numpy/scipy/pandas/pyarrow/pydantic/pyyaml/matplotlib ·
python-can/cantools/filterpy · FastAPI/uvicorn/websockets · Parquet + SQLite ·
scikit-learn/xgboost/torch(CPU)/shap/onnxruntime · reportlab · pytest/ruff ·
React+Vite+TS+Tailwind+ECharts · docker-compose · SocketCAN vcan0 with
virtual-bus fallback on non-Linux.

## Repo layout
```
aerotwin/{physics,twin,faults,acquisition,processing,health,ml,diagnostics,
          simulation,storage,api,reports}
configs/{engines,missions,can}
scripts/ tests/ data/(gitignored) models/(gitignored) dashboard/ docs/
```

## Rules that must never be violated
1. All engine constants come from YAML configs, never hard-coded. Approximate
   values are commented `# approx — replace with OEM data`.
2. SI units internally; convert only in the UI/reports.
3. Type hints + docstrings throughout.
4. Simple, stable, fast physics first; add realism once the whole loop works.
5. When stuck, pick the simpler working approach and record it in
   `docs/DECISIONS.md`, then keep going.
6. After each milestone: run `ruff` + `pytest`, fix failures, tick
   `docs/PLAN.md`, commit.

## Milestones
See `docs/PLAN.md` for the authoritative, checkable milestone list (M0–M10).

## Model I/O contract
- **Inputs**: throttle/ECU command, ambient pressure & temperature, altitude,
  airspeed.
- **Outputs**: RPM, MAP, per-cylinder CHT, per-cylinder EGT, oil pressure &
  temperature, coolant temperature, fuel flow, torque/power, injection
  timing, alternator voltage/current, battery state, vibration features.

## Demo storyline (M10, `make demo`)
1. Start an 18h ISR mission (accelerated) over virtual CAN.
2. Silently inject slow cooling degradation mid-mission.
3. Twin detects degradation before threshold alarm fires.
4. Classifier IDs cooling degradation with SHAP explanation.
5. RUL drops, maintenance advisory appears.
6. Hot-weather go/no-go check returns NO-GO.
7. Mission saved for replay; PDF report generated.
