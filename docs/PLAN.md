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
- [ ] configs/can/aerotwin.dbc
- [ ] CAN publisher + receiver (vcan0 / virtual fallback)
- [ ] Processing pipeline (resample 20Hz, filter, validate, feature extract)
- [ ] DataSource interface (CAN / Parquet replay / simulator)
- [ ] Storage (live buffer, Parquet, SQLite)
- [ ] Tests: loopback bus

## M5 — Twin core, UKF estimator, residuals, health
- [ ] DigitalTwin class (mode, current/expected/performance/degradation/
      health state)
- [ ] UKF estimator (augmented health parameters, random walk)
- [ ] Residual normalization + EWMA/CUSUM + sensor-vs-engine fault logic
- [ ] Health indices per subsystem + risk levels
- [ ] Key test + docs/figures/early_detection.png

## M6 — AI/ML layer
- [ ] Feature extraction from residual windows
- [ ] Anomaly detection: IsolationForest + autoencoder
- [ ] Fault classifier: XGBoost + SHAP
- [ ] RUL: exponential fit + particle filter
- [ ] Trends: efficiency, BSFC, CHT margin
- [ ] Edge model: ONNX export + benchmark
- [ ] docs/ML_RESULTS.md
- [ ] scripts/train_all.py

## M7 — Diagnostics, mission risk, API
- [ ] Diagnosis object + alert de-dup/hysteresis
- [ ] Mission go/no-go with Monte Carlo
- [ ] FastAPI endpoints (WS /ws/live, REST engines/missions/live/faults/
      replay/health/RUL/advisories/mission-risk/report)
- [ ] Token auth + CORS + HMAC telemetry signing
- [ ] Tests: TestClient

## M8 — Dashboard
- [ ] React/Vite/TS/Tailwind/ECharts app, dark GCS theme
- [ ] Pages: Live Ops, Twin Comparison, Diagnostics, Trends, Mission Planner,
      Replay, Demo Control, Reports
- [ ] Auto-reconnecting WebSocket

## M9 — Replay, reports, generalization, deployment
- [ ] Replay engine
- [ ] Post-flight summary + PDF report
- [ ] Second engine YAML (NA, air-cooled, carbureted) — no code changes
- [ ] docker-compose (backend + dashboard)

## M10 — Demo and documentation
- [ ] scripts/demo.py full storyline with timestamps
- [ ] README.md, ARCHITECTURE.md final, USER_GUIDE.md,
      DEPLOYMENT_ROADMAP.md
- [ ] Fresh-clone check: make install && make dataset && make train && make demo
