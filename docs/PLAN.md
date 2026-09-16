# AeroTwin — Milestone Plan

Legend: [ ] pending  [x] done  [~] partial/simplified (see DECISIONS.md)

## M0 — Scaffold
- [x] Package structure, pyproject.toml, Makefile, .gitignore, git init
- [x] docs/ARCHITECTURE.md with Mermaid 11-layer diagram

## M1 — Engine definition and MVEM physics
- [x] configs/engines/rotax914_like.yaml
- [x] pydantic EngineConfig schema + registry
- [x] aerotwin/physics/* MVEM components (atmosphere, intake, fuel,
      combustion, cooling, lubrication, rotational dynamics, electrical,
      vibration)
- [x] EngineModel (RK4, 20 Hz, state vs health vector separated)
- [x] Tests: turbo/altitude, CHT vs airspeed, RPM steady state, cooling
      degradation, misfire vibration, speed benchmark (>=50x real time)
- [x] Sanity plots in docs/figures/

## M2 — Missions and environment
- [x] Mission YAML schema + 4 missions (isr_18h_endurance, high_altitude_6km,
      hot_weather_45c, rapid_throttle_transitions)
- [x] MissionRunner with accelerated time, Parquet output
- [x] CLI: scripts/run_mission.py

## M3 — Fault injection and synthetic dataset
- [x] FaultInjector (misfire, injector_abnormality, cooling_degradation,
      lubrication_issue, sensor faults, combustion_instability,
      overheating_trend, abnormal_vibration, alternator_degradation,
      turbo_degradation)
- [x] Sensor noise/quantization/sample-rate layer
- [x] scripts/generate_dataset.py (multiprocessing, manifest, --size)
- [x] Tests: each fault signature

## M4 — CAN acquisition, processing, storage
- [x] configs/can/aerotwin.dbc
- [x] CAN publisher + receiver (vcan0 / virtual fallback)
- [x] Processing pipeline (resample 20Hz, filter, validate, feature extract)
- [x] DataSource interface (CAN / Parquet replay / simulator)
- [x] Storage (live buffer, Parquet, SQLite)
- [x] Tests: loopback bus

## M5 — Twin core, UKF estimator, residuals, health
- [x] DigitalTwin class (mode, current/expected/performance/degradation/
      health state)
- [x] UKF estimator (augmented health parameters, random walk)
- [x] Residual normalization + EWMA/CUSUM + sensor-vs-engine fault logic
- [x] Health indices per subsystem + risk levels
- [x] Key test + docs/figures/early_detection.png

## M6 — AI/ML layer
- [x] Feature extraction from residual windows
- [x] Anomaly detection: IsolationForest + autoencoder
- [x] Fault classifier: XGBoost + SHAP
- [x] RUL: exponential fit + particle filter
- [x] Trends: efficiency, BSFC, CHT margin
- [x] Edge model: ONNX export + benchmark
- [x] docs/ML_RESULTS.md
- [x] scripts/train_all.py

## M7 — Diagnostics, mission risk, API
- [x] Diagnosis object + alert de-dup/hysteresis
- [x] Mission go/no-go with Monte Carlo
- [x] FastAPI endpoints (WS /ws/live, REST engines/missions/live/faults/
      replay/health/RUL/advisories/mission-risk/report)
- [x] Token auth + CORS + HMAC telemetry signing
- [x] Tests: TestClient

## M8 — Dashboard
- [x] React/Vite/TS/Tailwind/ECharts app, dark GCS theme
- [x] Pages: Live Ops, Twin Comparison, Diagnostics, Trends, Mission Planner,
      Replay, Demo Control, Reports
- [x] Auto-reconnecting WebSocket

## M9 — Replay, reports, generalization, deployment
- [x] Replay engine
- [x] Post-flight summary + PDF report
- [x] Second engine YAML (NA, air-cooled, carbureted) — no code changes
- [x] docker-compose (backend + dashboard)

## M10 — Demo and documentation
- [ ] scripts/demo.py full storyline with timestamps
- [ ] README.md, ARCHITECTURE.md final, USER_GUIDE.md,
      DEPLOYMENT_ROADMAP.md
- [ ] Fresh-clone check: make install && make dataset && make train && make demo
