# Deployment Roadmap

This hackathon build proves the architecture end to end on synthetic data
with a representative (not OEM-calibrated) engine model. This document
outlines what changes at each step toward a real, fielded system.

## 1. Onboard edge unit and GCS integration

**Today**: `aerotwin.acquisition` already implements the edge/ground split
architecturally — a CAN publisher/receiver over SocketCAN `vcan0` (with an
automatic virtual-bus fallback), a DBC-defined message set
(`configs/can/aerotwin.dbc`), and a tiny ONNX-exported autoencoder
(`aerotwin/ml/edge_export.py`) sized and benchmarked for low-latency
onboard screening (measured: single-digit-KB model, sub-millisecond CPU
inference in this build).

**To field it**:
- Deploy the acquisition + processing layers on an embedded Linux target
  (e.g. a Raspberry Pi CM4-class or automotive-grade SBC) wired to the
  engine ECU/sensors via a real CAN transceiver, running `vcan0` replaced
  by the physical `can0` interface — `aerotwin.acquisition.bus.get_can_bus`
  already tries SocketCAN first, so this requires no code change, only
  `scripts/setup_vcan.sh`-equivalent interface bring-up for the real bus.
  On a real deployment, be careful to avoid dropping frames the aircraft
  actually needs by sizing SocketCAN's receive buffer/queue for the DBC's
  bus loading, since heartbeat gap detection assumes bounded loss.
- Run only the edge ONNX model + a lightweight rules-based screen onboard;
  stream compressed features/alerts (not full raw telemetry) down a
  bandwidth-limited link to the GCS, where the full Digital Twin Core, UKF
  estimator, and heavier ML models run (this is exactly the split already
  drawn in `docs/ARCHITECTURE.md`).
- Replace the demo's HMAC-signing helper (`aerotwin/api/security.py`,
  currently a hand-rolled SHA-256 HMAC with a static dev secret) with a
  proper key-management story (per-airframe keys, rotation, a real
  transport like DTLS/mTLS over the telemetry radio) before flying it.

## 2. Engine test-rig mode and fleet monitoring

**Today**: `aerotwin.twin.config.EngineRegistry` loads every YAML in
`configs/engines/`, and `tests/test_second_engine.py` proves the full
pipeline (physics, faults, twin, mission risk) works unmodified against a
second engine definition — this is the mechanism a test-rig or fleet
deployment would use.

**To field it**:
- Add a `test_rig` mode to `DigitalTwin` that accepts real dynamometer
  telemetry in place of a mission's simulated inputs, for engine-level
  bench validation and OEM-data calibration campaigns (replacing every
  `# approx — replace with OEM data` tag in the configs and physics
  modules with measured coefficients).
- Extend `aerotwin.storage` (currently a single-process SQLite + local
  Parquet tree) to a shared database (Postgres/TimescaleDB for time
  series, object storage for Parquet logs) and give `AppState` a
  per-airframe `engine_serial` key so one deployment can track a fleet, not
  one aircraft — the Trends page's "engine selector" is already a stub
  for exactly this.
- The health/RUL/diagnosis layers are already per-engine-instance (a
  `DigitalTwin` owns one `EngineModel`); fleet rollup is a dashboard/
  aggregation-query concern on top of unchanged per-engine logic.

## 3. Federated learning

**Today**: `scripts/train_all.py` trains on one process's local synthetic
dataset (`data/dataset/`), split by mission/`sample_id` to avoid leakage.

**To field it**:
- Each aircraft/rig accumulates its own labeled residual-window features
  locally (the same `aerotwin.ml.features.build_windowed_features`
  pipeline already used offline can run incrementally onboard or at the
  GCS).
- Replace the single `train_classifier`/`train_anomaly_models` calls with
  a federated-averaging round: each site trains a local update on its own
  data (never uploading raw telemetry), a central aggregator averages
  model weights (straightforward for the autoencoder's PyTorch weights;
  XGBoost federated averaging typically uses a boosting-round-compatible
  scheme like gradient histogram aggregation rather than naive weight
  averaging), and the aggregated model is redistributed. This keeps
  operationally sensitive flight data at each site while still improving
  the shared fault-classification and anomaly models fleet-wide.
- Validate the federated model against the same held-out, mission-level
  split methodology already used in `scripts/train_all.py` before
  promoting it.

## 4. Real ECU/FADEC integration and OEM calibration

**Today**: `EngineConfig` (pydantic, `aerotwin/twin/config.py`) is the
single seam between "constants" and "physics" — every physical constant
comes from YAML, tagged `# approx` where it isn't traceable to public OEM
data (see `docs/DECISIONS.md` D0, D6, D23).

**To field it**:
- Work with the OEM (or a FADEC integration partner) to replace every
  approximate constant with measured data: VE maps from flow-bench testing,
  EGT/CHT thermal time constants from instrumented ground/flight test,
  propeller load coefficients from static thrust stand data, and so on.
  Because the physics modules only ever read these values through the
  `EngineConfig` schema, this is a data-only exercise — no code changes to
  `aerotwin/physics`.
- Where a real FADEC/ECU exposes its own internal state (e.g. actual
  injection pulse width, ignition timing, wastegate duty cycle) over a
  proprietary or ARINC-standard bus, extend the DBC and
  `aerotwin.acquisition.publisher`/`receiver` mappings to carry those
  channels directly instead of the MVEM's derived estimates, and use them
  to validate/replace the corresponding physics component.
- Re-run the M1 physics tests and the M5 early-detection test against the
  recalibrated config before trusting its health estimates operationally
  — they are the regression suite that would catch a recalibration
  introducing a new instability (as D23's two calibration bugs show,
  integration-level testing catches things unit tests on the original
  constants did not).

## 5. Secure telemetry and certification considerations

**Today**: bearer-token auth on state-changing REST endpoints
(`aerotwin/api/security.py`), permissive CORS (`allow_origins=["*"]"`), and
an HMAC-signing helper for edge→ground packets — adequate for a hackathon
demo, explicitly not for flight.

**To field it**:
- **Telemetry security**: replace the static bearer token with per-operator
  credentials (OAuth2/OIDC against a GCS identity provider), tighten CORS
  to the actual dashboard origin(s), and terminate the edge↔ground link
  over an authenticated, encrypted transport (mTLS or a certified secure
  datalink) rather than signing bare HMAC packets over an assumed-trusted
  channel.
- **Data integrity**: the heartbeat counter/CRC mechanism
  (`aerotwin/acquisition/publisher.py`/`receiver.py`) already detects
  frame loss and corruption for link-health purposes; a certified system
  would additionally need tamper-evident logging of raw telemetry (for
  post-incident investigation) and signed provenance on any ML model
  deployed to the edge unit.
- **Certification**: a system that influences maintenance or go/no-go
  decisions for a flight vehicle sits in a safety-relevant (if advisory)
  role. Path to certification would involve: DO-178C-style software
  assurance for the edge/onboard components, a documented V&V plan tracing
  requirements to the physics/estimator tests already in `tests/` (M1-M5),
  independent review of the health-index thresholds and go/no-go
  probability cutoffs (currently `NO_GO_PROBABILITY`/`CAUTION_PROBABILITY`
  constants in `aerotwin/simulation/risk.py`) against the OEM's actual
  engine limits and the operator's risk posture, and a clear statement
  that AeroTwin's outputs are advisory/decision-support unless and until
  formally certified as a monitoring system of record.
