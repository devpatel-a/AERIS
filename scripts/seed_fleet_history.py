"""Seed each airframe's recorded history by simulating its sorties.

For every sortie in configs/history/fleet_history.yaml this runs, at 1 Hz:
  - the hidden plant (physics model at that sortie's wear state, plus any
    localized duct blockage / injected test fault) -> sensor readings with noise
  - the twin model at the globally estimated health (what the UKF converges to)
    -> expected values and residuals
  - a nominal-health model -> the classifier's residual features, classified
    every 60 s with the trained fault classifier
and stores the log (Parquet), mission row, post-flight summary, key events,
completed maintenance history and a few generated reports.

    python -m scripts.seed_fleet_history            # add history (skips tails already seeded)
    python -m scripts.seed_fleet_history --reset    # remove previously seeded history first
"""

from __future__ import annotations

import os

# Pure-Python physics in many worker processes: one BLAS thread each (must be
# set before numpy is imported, which also happens in spawned workers).
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")

import argparse  # noqa: E402
import json  # noqa: E402
import pickle  # noqa: E402
import time  # noqa: E402
import uuid  # noqa: E402
from concurrent.futures import ProcessPoolExecutor  # noqa: E402
from pathlib import Path  # noqa: E402

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import yaml  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
HISTORY_PATH = ROOT / "configs" / "history" / "fleet_history.yaml"
SEED_NOTE = "seeded-history"
DETECT_P = 0.5


def _init_worker() -> None:
    os.environ["OMP_NUM_THREADS"] = "1"


def _health_vector(names, nominal, wear: dict, frac: float) -> np.ndarray:
    h = nominal.copy()
    for name, (a, b) in wear.items():
        h[names.index(name)] = a + (b - a) * frac
    return h


def simulate_sortie(job: dict) -> dict:
    """Worker: simulate one sortie; returns rows + events + observed faults."""
    from aerotwin.faults.engine_faults import apply_engine_fault
    from aerotwin.faults.sensor_model import SENSOR_SPECS
    from aerotwin.faults.specs import FaultSpec
    from aerotwin.health.indices import compute_health_snapshot
    from aerotwin.ml.features import FEATURE_CHANNELS, _window_features
    from aerotwin.physics.engine_model import EngineModel
    from aerotwin.physics.state import HEALTH_NAMES, nominal_health_vector
    from aerotwin.physics.vibration import overall_velocity_ips, vibration_spectrum
    from aerotwin.simulation.mission import MissionRegistry, MissionRunner
    from aerotwin.twin.config import EngineRegistry
    from aerotwin.twin.estimator import MEASUREMENT_CHANNELS
    from aerotwin.twin.live_analytics import PHASE_TITLES

    config = EngineRegistry().get(job["engine_id"])
    mission = MissionRegistry().get(job["mission_id"])
    runner = MissionRunner(config, mission, dt=1.0)
    nominal = nominal_health_vector(config.nominal_health.injector_flow_coeff)
    names = list(HEALTH_NAMES)
    health = _health_vector(names, nominal, job["wear"], job["frac"])

    plant = EngineModel(config, health=health.copy(), dt=1.0)
    twin = EngineModel(config, health=health.copy(), dt=1.0)
    nom = EngineModel(config, health=nominal.copy(), dt=1.0)
    if job.get("local_cooling") is not None:
        cyl, factor = job["local_cooling"]
        plant.cylinder_cooling_factor[cyl] = factor
    fault = FaultSpec(**job["fault"]) if job.get("fault") else None
    fault_state: dict = {}
    rng = np.random.default_rng(job["seed"])
    classifier = pickle.loads(job["classifier"]) if job.get("classifier") else None

    rows, chunks, feats, events = [], [], [], []
    detected_t = None
    limit_t = None
    phase = None
    diag_fault, diag_conf = "healthy", 0.0
    total = int(mission.total_duration_s)
    for t in range(total):
        inputs = runner.inputs_at_time(float(t))
        seg = runner.current_segment_name(float(t))
        if seg != phase:
            if phase == "climb":
                events.append({"t_s": t, "kind": "PHASE", "title": "Top of Climb Reached",
                               "detail": f"Level off at {inputs.altitude_m:,.0f}m MSL, cruise trim"})
            elif phase is not None and seg in PHASE_TITLES:
                events.append({"t_s": t, "kind": "PHASE", "title": PHASE_TITLES[seg], "detail": f"Entering {seg.replace('_', ' ')}"})
            phase = seg
        if fault is not None:
            if t == int(fault.onset_s):
                events.append({"t_s": t, "kind": "INJECTED", "title": f"{fault.fault_type.replace('_', ' ').capitalize()} "
                               f"{fault.severity * 100:.0f}% ramp initiated via HiL bus.", "detail": "Source: Ground Station Operator"})
            apply_engine_fault(float(t), plant, fault, rng, fault_state)
        true = plant.step(inputs).as_flat_dict()
        exp = twin.step(inputs).as_flat_dict()
        nom_out = nom.step(inputs).as_flat_dict()
        measured = {c: true[c] + rng.normal(0, SENSOR_SPECS[c].noise_std if c in SENSOR_SPECS else 0.0) for c in MEASUREMENT_CHANNELS}
        snap = compute_health_snapshot(plant.health, {**true, **measured}, config)
        feat = {"t_s": t}
        for c in FEATURE_CHANNELS:
            feat[f"measured_{c}"] = measured[c]
            feat[f"resid_{c}"] = measured[c] - nom_out[c]
        feats.append(feat)
        feats = feats[-30:]
        if classifier is not None and t % 60 == 0 and len(feats) >= 10:
            window_feats = _window_features(pd.DataFrame(feats))
            x = np.array([[window_feats.get(c, 0.0) for c in classifier.feature_cols]])
            proba = classifier.predict_proba(x)[0]
            k = int(np.argmax(proba))
            prev_fault = diag_fault
            diag_fault, diag_conf = str(classifier.encoder.classes_[k]), float(proba[k])
            armed = seg not in ("taxi", "takeoff") and t >= 900
            if armed and diag_fault != "healthy" and diag_fault == prev_fault and diag_conf >= DETECT_P and detected_t is None:
                detected_t = t
                events.append({"t_s": t, "kind": "AI_DIAGNOSIS", "title": f"Fault isolated: {diag_fault.replace('_', ' ')}.",
                               "detail": f"Confidence: {diag_conf * 100:.1f}%"})
        max_cht = max(true[f"cht_{i}_k"] for i in range(1, 5))
        if max_cht >= config.limits.max_cht_k and limit_t is None:
            limit_t = t
            events.append({"t_s": t, "kind": "THRESHOLD", "title": "CHT exceedance threshold flag",
                           "detail": f"{max_cht - 273.15:.1f} °C ≥ {config.limits.max_cht_k - 273.15:.0f} °C limit"})
        spectrum = vibration_spectrum({k[4:-2]: v for k, v in true.items() if k.startswith("vib_") and k.endswith("_g")}, true["rpm"])
        rows.append({
            "t_s": float(t), "segment": seg, "throttle": inputs.throttle, "altitude_m": inputs.altitude_m,
            "ambient_temp_k": inputs.ambient_temp_k, "airspeed_mps": inputs.airspeed_mps,
            **true, **measured,
            **{f"resid_{c}": feat[f"resid_{c}"] for c in FEATURE_CHANNELS},
            **{f"expected_{c}": exp[c] for c in ("cht_1_k", "cht_2_k", "cht_3_k", "cht_4_k", "egt_1_k", "egt_2_k", "egt_3_k",
                                                    "egt_4_k", "oil_temp_k", "oil_pressure_kpa", "coolant_temp_k", "fuel_flow_kg_s", "map_kpa", "rpm")},
            **{f"health_{n}": float(v) for n, v in zip(names, twin.health, strict=True)},
            **{f"subsystem_{k}": v for k, v in snap.subsystem_index.items()},
            "health_index": snap.overall_index, "health_risk": snap.overall_risk,
            "vibration_ips_rms": overall_velocity_ips(spectrum),
            "diagnosis_fault": diag_fault, "diagnosis_confidence": diag_conf,
        })
        if len(rows) >= 1800:  # keep worker memory bounded: fold rows into a DataFrame chunk
            chunks.append(pd.DataFrame(rows))
            rows = []
    if rows:
        chunks.append(pd.DataFrame(rows))
    df = pd.concat(chunks, ignore_index=True)
    df["engine_hours"] = job["engine_hours_start"] + df["t_s"] / 3600.0

    from dataclasses import asdict

    from aerotwin.reports.summary import compute_post_flight_summary
    from aerotwin.storage.parquet_store import save_mission_log

    path = save_mission_log(df, job["run_id"])
    summary = asdict(compute_post_flight_summary(df, config))
    return {"job_id": job["job_id"], "path": str(path), "summary": summary, "events": events, "flight_s": float(total)}


def _reset(db, log_dir: Path) -> None:
    runs = db.execute("SELECT mission_run_id FROM missions WHERE notes = ?", (SEED_NOTE,)).fetchall()
    for r in runs:
        (log_dir / f"{r['mission_run_id']}.parquet").unlink(missing_ok=True)
        for table in ("mission_events", "mission_summaries", "alerts"):
            db.execute(f"DELETE FROM {table} WHERE mission_run_id = ?", (r["mission_run_id"],))
    db.execute("DELETE FROM missions WHERE notes = ?", (SEED_NOTE,))
    db.execute("DELETE FROM work_orders WHERE source = 'history'")
    db.execute("DELETE FROM reports WHERE created_by = 'history-seeder'")
    db.commit()
    print(f"Removed {len(runs)} seeded sorties.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reset", action="store_true")
    parser.add_argument("--workers", type=int, default=0)
    parser.add_argument("--tails", default="", help="comma-separated subset of tails")
    parser.add_argument("--reports-only", action="store_true", help="only (re)generate the historical reports")
    args = parser.parse_args()

    from aerotwin.fleet.records import store_summary
    from aerotwin.maintenance.service import create_work_order
    from aerotwin.reports.summary import MissionSummary
    from aerotwin.simulation.mission import MissionRegistry
    from aerotwin.storage.db import close_mission, get_connection, insert_mission
    from aerotwin.storage.parquet_store import DEFAULT_MISSION_LOG_DIR
    from aerotwin.twin.fleet import FleetRegistry

    db = get_connection()
    if args.reports_only:
        db.execute("DELETE FROM reports WHERE created_by = 'history-seeder'")
        db.commit()
        _seed_reports(db)
        return
    if args.reset:
        _reset(db, DEFAULT_MISSION_LOG_DIR)
    spec = yaml.safe_load(HISTORY_PATH.read_text())
    fleet, missions = FleetRegistry(), MissionRegistry()
    clf_path = ROOT / "models" / "fault_classifier.pkl"
    classifier_bytes = clf_path.read_bytes() if clf_path.exists() else None
    wanted = set(args.tails.split(",")) if args.tails else None

    jobs, meta = [], {}
    for tail_id, tspec in spec["tails"].items():
        if wanted and tail_id not in wanted:
            continue
        if db.execute("SELECT COUNT(*) FROM missions WHERE tail_id = ? AND notes = ?", (tail_id, SEED_NOTE)).fetchone()[0]:
            print(f"{tail_id}: already seeded, skipping (use --reset)")
            continue
        tail = fleet.get(tail_id)
        sorties = list(tspec["sorties"])
        tests = {t["after_sortie"]: t for t in tspec.get("test_flights", [])}
        seq = []
        for i, mid in enumerate(sorties):
            seq.append({"mission_id": mid, "frac": i / max(len(sorties) - 1, 1), "test": None})
            if i + 1 in tests:
                seq.append({"mission_id": tests[i + 1]["mission"], "frac": i / max(len(sorties) - 1, 1), "test": tests[i + 1]})
        lc = tspec.get("local_cooling")
        hours = tail.hours_at_induction
        for k, item in enumerate(seq):
            local = None
            if lc and item["frac"] >= 1.0 - lc["onset"]:
                ramp = (item["frac"] - (1.0 - lc["onset"])) / lc["onset"]
                local = (lc["cylinder"], 1.0 - (1.0 - lc["factor"]) * ramp)
            fault = None
            if item["test"]:
                t = item["test"]
                fault = {"fault_type": t["fault"], "target": t["target"], "onset_s": 120.0, "profile": "ramp",
                         "severity": t["severity"], "ramp_duration_s": t["ramp_s"]}
            job_id = f"{tail_id}:{k}"
            jobs.append({"job_id": job_id, "engine_id": tail.engine_id, "mission_id": item["mission_id"], "frac": item["frac"],
                         "wear": tspec.get("wear") or {}, "local_cooling": local, "fault": fault,
                         "seed": abs(hash(job_id)) % (2**31), "classifier": classifier_bytes,
                         "run_id": f"hist_{item['mission_id']}_{uuid.uuid4().hex[:8]}", "engine_hours_start": hours})
            meta[job_id] = (tail_id, k, len(seq), item)
            hours += int(missions.get(item["mission_id"]).total_duration_s) / 3600.0

    if not jobs:
        print("Nothing to seed.")
        return
    total_h = sum(missions.get(j["mission_id"]).total_duration_s for j in jobs) / 3600.0
    workers = args.workers or os.cpu_count() or 2
    print(f"Simulating {len(jobs)} sorties ({total_h:.0f} flight hours) on {workers} workers...")
    t0 = time.time()
    results: dict[str, dict] = {}
    with ProcessPoolExecutor(max_workers=workers, initializer=_init_worker) as pool:
        for res in pool.map(simulate_sortie, sorted(jobs, key=lambda j: -missions.get(j["mission_id"]).total_duration_s)):
            results[res["job_id"]] = res
            print(f"  {res['job_id']:<10} {res['flight_s'] / 3600:5.1f} h  ({time.time() - t0:.0f}s)")

    job_by_id = {j["job_id"]: j for j in jobs}
    now = time.time()
    for tail_id, tspec in spec["tails"].items():
        ids = sorted((j for j in results if j.startswith(f"{tail_id}:")), key=lambda j: int(j.split(":")[1]))
        if not ids:
            continue
        tail = fleet.get(tail_id)
        n = len(ids)
        last_end = now - tspec["last_ended_days_ago"] * 86400
        span = spec["days_span"] * 86400
        hours = tail.hours_at_induction
        counters: dict[str, int] = {}
        for idx, job_id in enumerate(ids):
            res = results[job_id]
            _, _, _, item = meta[job_id]
            mission = missions.get(item["mission_id"])
            counters[mission.sortie_prefix] = counters.get(mission.sortie_prefix, 0) + 1
            label = f"{mission.sortie_prefix}-{counters[mission.sortie_prefix]:02d}"
            end_t = last_end - (n - 1 - idx) * (span / max(n - 1, 1))
            start_t = end_t - res["flight_s"]
            run_id = job_by_id[job_id]["run_id"]
            hours = job_by_id[job_id]["engine_hours_start"]
            path = res["path"]
            insert_mission(db, run_id, tail.engine_id, item["mission_id"], notes=SEED_NOTE, tail_id=tail_id,
                           sortie_label=label, kind="test" if item["test"] else "operational",
                           engine_hours_start=hours, start_time=start_t)
            fault = job_by_id[job_id]["fault"]
            injected = [{**fault, "fault_id": 1, "injected_t": fault["onset_s"], "cleared_t": None}] if fault else []
            close_mission(db, run_id, flight_s=res["flight_s"], parquet_path=str(path),
                          injected_faults_json=json.dumps(injected), end_time=end_t)
            for ev in res["events"]:
                db.execute("INSERT INTO mission_events (mission_run_id, t_s, kind, title, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                           (run_id, ev["t_s"], ev["kind"], ev["title"], ev["detail"], start_t + ev["t_s"]))
            store_summary(db, run_id, MissionSummary(**res["summary"]))
            hours += res["flight_s"] / 3600.0
        db.commit()

        kb_tasks = {t["key"]: t for t in yaml.safe_load((ROOT / "configs" / "maintenance" / "maintenance.yaml").read_text())["scheduled_tasks"]}
        for task_key, done_hours in (spec.get("maintenance_history", {}).get(tail_id) or {}).items():
            for h in done_hours:
                task = kb_tasks[task_key]
                create_work_order(db, tail_id, task_key, task["title"], ata_ref=task["ata"], location=task["location"],
                                  priority="MEDIUM", source="history", status="COMPLETED", created_by="history-seeder",
                                  created_at=now - span, completed_at=now - span, engine_hours_at_completion=float(h))
        print(f"{tail_id}: {n} sorties, engine hours {tail.hours_at_induction:.0f} -> {hours:.0f}")

    _seed_reports(db)
    print(f"Done in {time.time() - t0:.0f}s.")


def _seed_reports(db) -> None:
    """Generate a few historical reports from the seeded data (content is computed)."""
    from aerotwin.api.state import get_app_state
    from aerotwin.reports import registry

    state = get_app_state()
    now = time.time()
    last07 = db.execute("SELECT mission_run_id FROM missions WHERE tail_id = 'UAV-07' AND notes = ? AND kind = 'operational' "
                        "ORDER BY start_time DESC LIMIT 1", (SEED_NOTE,)).fetchone()
    plans = [
        # Oldest first, so report numbers follow issue dates.
        ("scheduled_maintenance", {"tail_id": "UAV-02"}, "WORK_ORDER_ISSUED", 14),
        ("fleet", {"focus": "turbo_air"}, "ARCHIVED", 7),
        ("scheduled_maintenance", {"tail_id": "UAV-03"}, "APPROVED", 2),
    ]
    if last07:
        plans.append(("post_mission", {"mission_run_id": last07["mission_run_id"]}, "PENDING_REVIEW", 0.3))
    for rtype, kwargs, status, days_ago in plans:
        try:
            rep = registry.generate(state, rtype, "history-seeder", created_at=now - days_ago * 86400, status=status, **kwargs)
            if rtype == "post_mission":
                # The chief propulsion engineer has countersigned the debrief; maintenance sign-off is pending.
                registry.sign(state, rep["report_id"], "Capt. M. Vance", "MIL-2210-VANCE", "engineering")
        except Exception as exc:  # report generation is best-effort for seeding
            print(f"  report {rtype} skipped: {exc}")


if __name__ == "__main__":
    main()
