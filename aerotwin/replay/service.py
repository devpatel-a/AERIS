"""Mission Replay: sortie archive, synchronized traces, twin state at a replay
time, extremes/exceedance summary, key-event chronology and on-demand AI
root-cause analysis over a stored window.
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

import numpy as np
import pandas as pd

from aerotwin.fleet.records import get_summary, load_mission_df
from aerotwin.ml.features import _window_features
from aerotwin.physics.vibration import (
    accel_g_to_velocity_ips,
    compute_vibration,
    overall_velocity_ips,
    vibration_spectrum,
)

if TYPE_CHECKING:
    from aerotwin.api.state import AppState

CHT = [f"cht_{i}_k" for i in range(1, 5)]
EGT = [f"egt_{i}_k" for i in range(1, 5)]
TRACE_COLUMNS = ["rpm", *CHT, *EGT, "oil_pressure_kpa", "oil_temp_k", "health_index", "altitude_m"]
FAULT_TITLES = {"cooling_degradation": "Injected Cooling Fault"}


def _mission(state: AppState, mission_id: str):
    try:
        return state.mission_registry.get(mission_id)
    except KeyError:
        return None


def _events(state: AppState, run_id: str) -> list[dict[str, Any]]:
    session = state.session
    if session is not None and session.run_id == run_id and session.analytics is not None:
        return [dict(e) for e in session.analytics.events]
    rows = state.db.execute(
        "SELECT t_s, kind, title, detail FROM mission_events WHERE mission_run_id = ? ORDER BY t_s", (run_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def sorties(state: AppState, tail_id: str | None, query: str = "", category: str = "all", limit: int = 50) -> list[dict[str, Any]]:
    """Sortie archive for a tail, newest first (the running sortie first)."""
    sql = "SELECT * FROM missions WHERE tail_id IS ? ORDER BY start_time DESC LIMIT ?"
    rows = state.db.execute(sql, (tail_id, limit * 2)).fetchall()
    out = []
    session = state.session
    for run in rows:
        active = session is not None and session.run_id == run["mission_run_id"]
        if run["end_time"] is None and not active:
            continue
        mission = _mission(state, run["mission_id"])
        profile = mission.profile if mission else "other"
        if category == "isr" and profile != "isr":
            continue
        if category == "cap" and profile != "cap":
            continue
        label = run["sortie_label"] or run["mission_run_id"]
        if query and query.lower() not in f"{label} {run['mission_id']} {mission.description if mission else ''}".lower():
            continue
        engine = state.engine_registry.get(run["engine_id"])
        summary = None if active else get_summary(state.db, run["mission_run_id"], engine)
        injected = json.loads(run["injected_faults_json"] or "[]")
        events = _events(state, run["mission_run_id"])
        anomaly = next((e for e in events if e["kind"] in ("DETECTED", "AI_DIAGNOSIS")), None)

        if active:
            stable = [r for r in session.rows if r.get("segment") not in ("taxi", "takeoff")]
            hi_start = (stable or session.rows)[0]["health_index"] if session.rows else None
            hi_end = session.health_ewma
            worst = state.buffer.latest().get("health_risk") if state.buffer.latest() else None
            flight_h = session.t / 3600.0
        else:
            hi_start = summary.health_index_start if summary else None
            hi_end = summary.health_index_end if summary else None
            worst = summary.worst_health_risk if summary else None
            flight_h = (run["flight_s"] or 0.0) / 3600.0 or (summary.duration_hours if summary else 0.0)

        if injected or run["kind"] == "test":
            chip = "ALERT"
        elif worst in ("WATCH", "WARNING", "CRITICAL") or anomaly is not None:
            chip = "WATCH"
        else:
            chip = "OK"
        delta = ((hi_end - hi_start) / hi_start * 100.0) if hi_start and hi_end is not None else None
        if injected:
            note, note_right = FAULT_TITLES.get(injected[0]["fault_type"], f"Injected {injected[0]['fault_type'].replace('_', ' ')}"), "Bench Test"
        elif anomaly is not None:
            note, note_right = mission.description if mission else run["mission_id"], f"Anomaly @ {_hms(anomaly['t_s'])}"
        else:
            note, note_right = mission.description if mission else run["mission_id"], "RTB Clean" if run["kind"] == "operational" else "Full Complete"
        out.append({
            "run_id": run["mission_run_id"], "sortie_label": label, "mission_id": run["mission_id"],
            "profile": profile, "kind": run["kind"], "chip": chip, "active": active,
            "paused": bool(active and session.paused), "start_time": run["start_time"], "end_time": run["end_time"],
            "flight_hours": flight_h, "health_start": hi_start, "health_end": hi_end, "health_delta_pct": delta,
            "status_label": "Nominal" if chip == "OK" else ("FAULT TEST" if chip == "ALERT" else "Degradation"),
            "note": note, "note_right": note_right, "engine_class": engine.short_name,
            "injected_faults": injected,
        })
        if len(out) >= limit:
            break
    return out


def _hms(t: float) -> str:
    t = int(max(t, 0))
    return f"{t // 3600:02d}:{(t % 3600) // 60:02d}:{t % 60:02d}"


def _df_for(state: AppState, run_id: str) -> pd.DataFrame | None:
    session = state.session
    if session is not None and session.run_id == run_id:
        return pd.DataFrame(session.rows) if session.rows else None
    return load_mission_df(run_id)


def traces(state: AppState, run_id: str, max_points: int = 600) -> dict[str, Any]:
    """Downsampled synchronized channel traces for the whole sortie."""
    df = _df_for(state, run_id)
    if df is None or df.empty:
        raise KeyError(run_id)
    step = max(1, len(df) // max_points)
    d = df.iloc[::step]
    out: dict[str, Any] = {"t_s": d["t_s"].tolist(), "duration_s": float(df["t_s"].iloc[-1])}
    for c in TRACE_COLUMNS:
        if c in d.columns:
            out[c] = [None if v != v else float(v) for v in d[c]]
    if all(c in d.columns for c in EGT):
        out["egt_avg_k"] = d[EGT].mean(axis=1).tolist()
    if "segment" in d.columns:
        out["segment"] = d["segment"].tolist()
    return out


def twin_state(state: AppState, run_id: str, t_s: float) -> dict[str, Any]:
    """Cylinder layout readings at replay time `t_s`: measured vs twin, flow, rpm, phase."""
    df = _df_for(state, run_id)
    if df is None or df.empty:
        raise KeyError(run_id)
    i = int(np.clip(np.searchsorted(df["t_s"].to_numpy(), t_s), 0, len(df) - 1))
    row = df.iloc[i]
    cyl = []
    for n in range(1, 5):
        m, e = row.get(f"cht_{n}_k"), row.get(f"expected_cht_{n}_k")
        cyl.append({
            "cylinder": n, "cht_k": None if m != m else float(m),
            "expected_cht_k": None if e is None or e != e else float(e),
            "variance_k": None if e is None or e != e or m != m else float(m - e),
        })
    variances = [c["variance_k"] for c in cyl if c["variance_k"] is not None]
    hot = int(np.argmax(variances)) + 1 if variances else None
    return {
        "t_s": float(row["t_s"]), "rpm": float(row.get("rpm", float("nan"))),
        "segment": row.get("segment"), "altitude_m": float(row.get("altitude_m", float("nan"))),
        "coolant_mass_flow_kg_s": float(row["coolant_mass_flow_kg_s"]) if "coolant_mass_flow_kg_s" in row else None,
        "cylinders": cyl, "hot_spot_cylinder": hot if variances and max(variances) > 3.0 else None,
        "health_index": float(row["health_index"]) if "health_index" in row else None,
    }


def extremes(state: AppState, run_id: str) -> dict[str, Any]:
    """Sortie telemetry summary: health delta, time over caution, located peaks."""
    run = state.db.execute("SELECT * FROM missions WHERE mission_run_id = ?", (run_id,)).fetchone()
    if run is None:
        raise KeyError(run_id)
    engine = state.engine_registry.get(run["engine_id"])
    session = state.session
    if session is not None and session.run_id == run_id:
        from aerotwin.reports.summary import compute_post_flight_summary

        df = _df_for(state, run_id)
        summary = compute_post_flight_summary(df, engine) if df is not None else None
    else:
        summary = get_summary(state.db, run_id, engine)
    if summary is None:
        raise KeyError(run_id)
    vib_ips = None
    df = _df_for(state, run_id)
    if df is not None and "vibration_ips_rms" in df.columns:
        vib_ips = float(df["vibration_ips_rms"].max())
    elif summary.max_vibration_g is not None and df is not None and "rpm" in df.columns:
        vib_ips = accel_g_to_velocity_ips(summary.max_vibration_g, 2.0 * float(df["rpm"].median()) / 60.0)
    return {
        "health_start": summary.health_index_start, "health_end": summary.health_index_end,
        "time_above_caution_s": summary.time_above_caution_s, "caution_k": engine.limits.cht_caution_k,
        "peak_cht": summary.peak_cht, "peak_egt": summary.peak_egt, "peak_map": summary.peak_map,
        "max_vibration_ips": vib_ips, "vibration_envelope_ips": _nominal_vibration_envelope(engine, df),
        "audit_complete": run["end_time"] is not None,
    }


def _nominal_vibration_envelope(engine, df: pd.DataFrame | None) -> float | None:
    """Overall alarm envelope (ips) for a healthy engine at the sortie's median rpm."""
    if df is None or "rpm" not in df.columns:
        return None
    rpm = float(df["rpm"].median())
    _, bands = compute_vibration(rpm, np.ones(4), engine, 0.0)
    return overall_velocity_ips(vibration_spectrum(bands, rpm)) * engine.vibration.envelope_factor


def events(state: AppState, run_id: str) -> list[dict[str, Any]]:
    return _events(state, run_id)


def root_cause(state: AppState, run_id: str, t_s: float | None = None, window_s: float = 30.0) -> dict[str, Any]:
    """Run the fault classifier + SHAP over the stored residual-feature window at `t_s`
    (default: the sortie's first detection, else its end).
    """
    if state.classifier is None:
        raise RuntimeError("No trained fault classifier available (run `make train`).")
    df = _df_for(state, run_id)
    if df is None or df.empty:
        raise KeyError(run_id)
    if t_s is None:
        evs = _events(state, run_id)
        det = next((e for e in evs if e["kind"] in ("AI_DIAGNOSIS", "DETECTED")), None)
        t_s = (det["t_s"] + 120.0) if det else float(df["t_s"].iloc[-1])
    window = df[(df["t_s"] > t_s - window_s) & (df["t_s"] <= t_s)].copy()
    resid_cols = [c for c in window.columns if c.startswith("resid_")]
    if len(window) < 3 or not resid_cols:
        raise ValueError("This sortie has no stored residual features to analyse at that time.")
    for c in [*CHT, *EGT, "vibration_rms_g"]:
        if c in window.columns:
            window[f"measured_{c}"] = window[c]
    feats = _window_features(window)
    clf = state.classifier
    x = np.array([[feats.get(c, 0.0) for c in clf.feature_cols]])
    proba = clf.predict_proba(x)[0]
    classes = [str(c) for c in clf.encoder.classes_]
    probs = dict(zip(classes, (float(p) for p in proba), strict=True))
    pred = max(probs, key=probs.get)
    kb = state.maintenance_kb
    return {
        "t_s": t_s, "fault_type": pred, "label": kb.fault_label(pred) if pred != "healthy" else "No fault",
        "confidence": probs[pred], "probabilities": probs,
        "shap": clf.explain_structured(x, top_k=5)[0],
        "diagnosis": kb.faults.get(pred, {}).get("diagnosis", ""),
    }
