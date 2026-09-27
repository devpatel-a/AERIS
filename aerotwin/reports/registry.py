"""Airworthiness & mission reports: generation, lifecycle and exports.

A report's content (everything the in-app A4 preview and the PDF show) is
computed once at generation from stored telemetry, the twin's analysis and the
maintenance knowledge base, and saved as JSON with the report record, so the
document stays fixed after issue. Status: PENDING_REVIEW -> APPROVED /
ARCHIVED / WORK_ORDER_ISSUED. A signature is a SHA-256 over the content.
"""

from __future__ import annotations

import hashlib
import io
import json
import time
from typing import TYPE_CHECKING, Any

import numpy as np
import pandas as pd

from aerotwin.fleet import records
from aerotwin.fleet.service import fleet_status
from aerotwin.health.prognostics import prognose
from aerotwin.maintenance.service import (
    ActiveFault,
    build_advisories,
    create_work_order,
    list_work_orders,
    scheduled_due,
)
from aerotwin.ml.labels import feature_label
from aerotwin.physics.atmosphere import isa_pressure_temp
from aerotwin.replay import service as replay

if TYPE_CHECKING:
    from aerotwin.api.state import AppState

REPORT_TYPES = {
    "post_mission": "Post-Mission",
    "scheduled_maintenance": "Scheduled Maintenance",
    "anomaly_investigation": "Anomaly Investigation",
    "airworthiness_cert": "Airworthiness Cert",
    "fleet": "Fleet Analysis",
}
STATUSES = ("PENDING_REVIEW", "APPROVED", "ARCHIVED", "WORK_ORDER_ISSUED")
COMPLIANCE = ("STANAG 4671 PDF", "HDF5 Raw Sensor Dump", "MIL-STD-1553B JSON")
from aerotwin.twin.live_analytics import ARM_MAX_WAIT_S  # noqa: E402

FIXED_SEGMENTS = {"taxi", "takeoff", "climb", "descent", "landing"}


def _next_report_id(state: AppState) -> str:
    year = time.strftime("%Y", time.gmtime())
    ids = state.db.execute("SELECT report_id FROM reports WHERE report_id LIKE ?", (f"REP-{year}-%",)).fetchall()
    n = max((int(r[0].rsplit("-", 1)[1]) for r in ids if r[0].rsplit("-", 1)[1].isdigit()), default=0)
    return f"REP-{year}-{n + 1:03d}"


def _mission_df(state: AppState, run_id: str) -> pd.DataFrame | None:
    session = state.session
    if session is not None and session.run_id == run_id:
        return pd.DataFrame(session.rows) if session.rows else None
    return records.load_mission_df(run_id)


def _envelope(df: pd.DataFrame) -> dict[str, float] | None:
    if "altitude_m" not in df.columns or "ambient_temp_k" not in df.columns:
        return None
    work = df[~df["segment"].isin(FIXED_SEGMENTS)] if "segment" in df.columns else df
    if work.empty:
        work = df
    alt = float(work["altitude_m"].median())
    oat_k = float(work["ambient_temp_k"].median())
    p, _ = isa_pressure_temp(alt, 0.0)
    rho = p / (287.05 * oat_k)
    return {"altitude_m": alt, "oat_c": oat_k - 273.15, "density_altitude_m": 44330.8 * (1.0 - (rho / 1.225) ** 0.234969)}


def _tail_prognosis(state: AppState, tail, until_run: str | None):
    runs = records.tail_runs(state.db, tail, state.engine_registry)
    hours, values = [], []
    for r in runs:
        if r.summary and r.summary.health_index_end is not None and not r.is_test:
            hours.append(r.engine_hours_end)
            values.append(r.summary.health_index_end)
        if r.run_id == until_run:
            break
    return (prognose(hours, values, state.prognostics_config) if hours else None), runs


def _mission_content(state: AppState, run_id: str, subsystems: list[str], include_shap: bool) -> dict[str, Any]:
    run = state.db.execute("SELECT * FROM missions WHERE mission_run_id = ?", (run_id,)).fetchone()
    if run is None:
        raise KeyError(run_id)
    df = _mission_df(state, run_id)
    if df is None or df.empty:
        raise KeyError(run_id)
    engine = state.engine_registry.get(run["engine_id"])
    tail = records.tail_for(state.fleet_registry, run["tail_id"])
    from aerotwin.reports.summary import compute_post_flight_summary

    summary = compute_post_flight_summary(df, engine)
    prog, runs = _tail_prognosis(state, tail, run_id) if tail else (None, [])
    baseline = next((r.summary.health_index_end for r in runs if r.summary and r.summary.health_index_end is not None and not r.is_test), None)
    total_hours = next((r.engine_hours_end for r in runs if r.run_id == run_id), None)
    if total_hours is None and tail is not None:
        total_hours = (run["engine_hours_start"] or tail.hours_at_induction) + float(df["t_s"].iloc[-1]) / 3600.0
    mission = state.mission_registry.get(run["mission_id"]) if run["mission_id"] in state.mission_registry.list_missions() else None

    # Hottest-divergence cylinder and the divergence trace (measured vs twin).
    div = None
    cyl = None
    exp_cols = [f"expected_cht_{i}_k" for i in range(1, 5)]
    # Airborne samples after the detector's arming time only: start-up/taxi/landing
    # transients and the estimator's convergence period are not twin divergence.
    air = df[(~df["segment"].isin(("taxi", "takeoff", "landing"))) & (df["t_s"] >= ARM_MAX_WAIT_S)] if "segment" in df.columns else df
    if air.empty:
        air = df
    if all(c in air.columns for c in exp_cols):
        deltas = {i: (air[f"cht_{i}_k"] - air[f"expected_cht_{i}_k"]) for i in range(1, 5)}
        cyl = max(deltas, key=lambda i: float(deltas[i].max()))
        step = max(1, len(air) // 240)
        d = air.iloc[::step]
        div = {
            "cylinder": cyl, "t_s": d["t_s"].tolist(),
            "measured_k": d[f"cht_{cyl}_k"].tolist(), "expected_k": d[f"expected_cht_{cyl}_k"].tolist(),
            "max_delta_k": float(deltas[cyl].max()), "segments": d["segment"].tolist() if "segment" in d.columns else [],
        }

    events = replay.events(state, run_id)
    detected = next((e for e in events if e["kind"] in ("AI_DIAGNOSIS", "DETECTED")), None)
    faults = list(summary.faults_observed)
    root = None
    if detected is not None or faults:
        try:
            root = replay.root_cause(state, run_id)
        except (RuntimeError, ValueError, KeyError):
            root = None
    primary = None
    fault = (root or {}).get("fault_type") if root and root.get("fault_type") != "healthy" else (faults[0] if faults else None)
    kb = state.maintenance_kb
    if fault:
        where = f"CYLINDER {cyl}" if cyl and fault in ("cooling_degradation", "overheating_trend") else kb.fault_subsystem(fault).upper()
        rpm = None
        map_ok = None
        if div is not None:
            i = int(np.argmax(np.array(div["measured_k"]) - np.array(div["expected_k"])))
            j = air.index[min(i * max(1, len(air) // 240), len(air) - 1)]
            rpm = float(df.loc[j, "rpm"]) if "rpm" in df.columns else None
            if "expected_map_kpa" in df.columns:
                map_ok = bool(abs(df.loc[j, "map_kpa"] - df.loc[j, "expected_map_kpa"]) < 2.0)
        primary = {
            "title": f"PRIMARY ANOMALY IDENTIFIED: {where} {kb.faults.get(fault, {}).get('health_label', kb.fault_label(fault)).upper()} RESIDUAL",
            "fault_type": fault,
            "residual_k": div["max_delta_k"] if div else None,
            "cylinder": cyl,
            "rpm": rpm,
            "manifold_nominal": map_ok,
            "diagnosis": kb.faults.get(fault, {}).get("diagnosis", ""),
        }

    shap = []
    if include_shap and root is not None:
        shap = [{"feature": f["feature"], "label": feature_label(str(f["feature"])), "value": float(f["value"])} for f in root["shap"]]

    actions = []
    if fault and tail is not None:
        for n, adv in enumerate(build_advisories(state.db, kb, tail.tail_id, [ActiveFault(fault, cyl)])[:3], start=1):
            actions.append({
                "n": n, "title": adv.title, "detail": adv.detail, "ata": adv.ata, "location": adv.location,
                "tag": "MANDATORY PRIOR TO SORTIE" if adv.priority == "HIGH" else "BENCH CALIBRATION",
                "priority": adv.priority, "advisory_key": adv.advisory_key,
            })

    return {
        "tail": {
            "tail_id": run["tail_id"], "engine_class": engine.short_name, "engine_serial": tail.engine_serial if tail else None,
            "total_hours": total_hours,
        },
        "mission": {
            "run_id": run_id, "sortie_label": run["sortie_label"], "name": mission.short_name if mission else run["mission_id"],
            "profile": mission.profile if mission else None, "flight_hours": float(df["t_s"].iloc[-1]) / 3600.0,
        },
        "section1": {
            "ehi": summary.health_index_end, "ehi_risk": summary.health_risk_end,
            "ehi_delta_vs_baseline": (summary.health_index_end - baseline) if baseline is not None and summary.health_index_end is not None else None,
            "rul_mean_hours": prog.rul_mean_hours if prog else None,
            "rul_p05_hours": prog.rul_p05_hours if prog else None,
            "rul_p95_hours": prog.rul_p95_hours if prog else None,
            "envelope": _envelope(df),
            "primary_anomaly": primary,
        },
        "section2": {
            "sampling_hz": 1.0 / float(df["t_s"].diff().median()) if len(df) > 1 else None,
            "divergence": div,
            "shap": shap,
            "twin_confidence_pct": float(df["confidence_pct"].iloc[-1]) if "confidence_pct" in df.columns else None,
            "subsystem_index_end": {k: v for k, v in summary.subsystem_index_end.items() if not subsystems or k in subsystems},
        },
        "section3": {"actions": actions},
        "peaks": {"cht": summary.peak_cht, "egt": summary.peak_egt, "map": summary.peak_map},
    }


def _maintenance_content(state: AppState, tail_id: str) -> dict[str, Any]:
    tail = state.fleet_registry.get(tail_id)
    engine = state.engine_registry.get(tail.engine_id)
    row = next(r for r in fleet_status(state) if r.tail_id == tail_id)
    due = scheduled_due(state.db, state.maintenance_kb, tail_id, row.total_hours)
    return {
        "tail": {"tail_id": tail_id, "engine_class": engine.short_name, "engine_serial": tail.engine_serial, "total_hours": row.total_hours},
        "section1": {
            "ehi": row.health_index, "ehi_risk": row.health_risk, "rul_mean_hours": row.rul_hours,
            "rul_p05_hours": row.rul_p05_hours, "rul_p95_hours": row.rul_p95_hours, "status": row.status,
        },
        "section2": {"scheduled": [t.__dict__ for t in due], "work_orders": list_work_orders(state.db, tail_id)[:12]},
        "section3": {"actions": [
            {"n": i + 1, "title": t.title, "detail": f"Due in {t.due_in_hours:.0f} engine hours.", "ata": t.ata,
             "location": t.location, "tag": "SCHEDULED", "priority": "MEDIUM"}
            for i, t in enumerate(due[:3])
        ]},
    }


def _fleet_content(state: AppState, focus: str) -> dict[str, Any]:
    rows = fleet_status(state)
    per_tail = []
    for tail in state.fleet_registry.all():
        runs = [r for r in records.tail_runs(state.db, tail, state.engine_registry) if r.summary]
        series = [r.summary.subsystem_index_end.get(focus) for r in runs[-20:]]
        vals = [v for v in series if v is not None]
        per_tail.append({
            "tail_id": tail.tail_id, "latest": vals[-1] if vals else None,
            "slope_per_mission": float(np.polyfit(range(len(vals)), vals, 1)[0]) if len(vals) >= 3 else None,
            "series": series,
        })
    return {
        "focus": focus, "units": len(rows),
        "fleet": [{"tail_id": r.tail_id, "health_index": r.health_index, "rul_hours": r.rul_hours, "status": r.status} for r in rows],
        "per_tail": per_tail,
    }


def generate(
    state: AppState,
    report_type: str,
    created_by: str | None,
    mission_run_id: str | None = None,
    tail_id: str | None = None,
    compliance: str = "STANAG 4671 PDF",
    subsystems: list[str] | None = None,
    include_shap: bool = True,
    focus: str = "turbo_air",
    created_at: float | None = None,
    status: str = "PENDING_REVIEW",
) -> dict[str, Any]:
    """Build and store a report; returns the stored record."""
    if report_type not in REPORT_TYPES:
        raise ValueError(f"Unknown report type '{report_type}'")
    subsystems = subsystems or []
    if report_type in ("post_mission", "anomaly_investigation", "airworthiness_cert"):
        if mission_run_id is None:
            raise ValueError("mission_run_id is required for this report type")
        content = _mission_content(state, mission_run_id, subsystems, include_shap)
        tail_id = content["tail"]["tail_id"]
        anomaly = content["section1"]["primary_anomaly"]
        kind = "Anomaly Debrief" if anomaly else "Debrief"
        title = {
            "post_mission": f"{tail_id} Mission {content['mission']['sortie_label']} {kind}",
            "anomaly_investigation": f"{tail_id} {state.maintenance_kb.fault_label(anomaly['fault_type']) if anomaly else 'Anomaly'} Investigation",
            "airworthiness_cert": f"{tail_id} Airworthiness Assessment",
        }[report_type]
    elif report_type == "scheduled_maintenance":
        if tail_id is None:
            raise ValueError("tail_id is required for a scheduled-maintenance report")
        content = _maintenance_content(state, tail_id)
        title = f"{tail_id} 100-Hr Inspection Report"
    else:
        content = _fleet_content(state, focus)
        engine = state.engine_registry.get(state.fleet_registry.all()[0].engine_id)
        focus_label = {"turbo_air": "Turbocharger", "cooling": "Cooling System", "lubrication": "Lubrication"}.get(focus, focus)
        title = f"Fleet {engine.short_name.replace('-class', '')} {focus_label} Wear Analysis"

    report_id = _next_report_id(state)
    tail_compact = (tail_id or "FLEET").replace("-", "")
    sortie = (content.get("mission") or {}).get("sortie_label") or "GEN"
    content["ref"] = f"STANAG-4671-REP-{tail_compact}-{sortie}"
    content["issued_at"] = created_at or time.time()
    content["compliance"] = compliance
    content["subsystems"] = subsystems
    content["include_shap"] = include_shap

    state.db.execute(
        "INSERT INTO reports (report_id, report_type, title, tail_id, mission_run_id, status, compliance, subsystems_json, "
        "include_shap, content_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (report_id, report_type, title, tail_id, mission_run_id, status, compliance, json.dumps(subsystems),
         int(include_shap), json.dumps(content, default=float), created_by, created_at or time.time()),
    )
    state.db.commit()
    return get(state, report_id)


def _row(row) -> dict[str, Any]:
    d = dict(row)
    d["content"] = json.loads(d.pop("content_json"))
    d["subsystems"] = json.loads(d.pop("subsystems_json"))
    d["type_label"] = REPORT_TYPES.get(d["report_type"], d["report_type"])
    return d


def get(state: AppState, report_id: str) -> dict[str, Any]:
    row = state.db.execute("SELECT * FROM reports WHERE report_id = ?", (report_id,)).fetchone()
    if row is None:
        raise KeyError(report_id)
    return _row(row)


def list_reports(state: AppState, report_type: str | None = None) -> list[dict[str, Any]]:
    if report_type and report_type != "all":
        rows = state.db.execute("SELECT * FROM reports WHERE report_type = ? ORDER BY created_at DESC", (report_type,))
    else:
        rows = state.db.execute("SELECT * FROM reports ORDER BY created_at DESC")
    out = []
    for r in rows:
        d = _row(r)
        c = d["content"]
        d["summary"] = {
            "health_index": (c.get("section1") or {}).get("ehi"),
            "engine": f"{c.get('tail', {}).get('engine_class', '')}".strip() or None,
            "hours": (c.get("tail") or {}).get("total_hours"),
            "units": c.get("units"),
        }
        del d["content"]
        out.append(d)
    return out


def set_status(state: AppState, report_id: str, status: str, operator: str | None) -> dict[str, Any]:
    """Change a report's status; issuing a work order opens one per corrective action."""
    if status not in STATUSES:
        raise ValueError(f"Unknown status '{status}'")
    report = get(state, report_id)
    if status == "WORK_ORDER_ISSUED" and report["tail_id"]:
        for action in report["content"].get("section3", {}).get("actions", []):
            create_work_order(
                state.db, report["tail_id"], action.get("advisory_key") or action["title"], action["title"],
                description=action.get("detail", ""), ata_ref=action.get("ata", ""), location=action.get("location", ""),
                priority=action.get("priority", "MEDIUM"), source="report", created_by=operator, report_id=report_id,
            )
    state.db.execute("UPDATE reports SET status = ? WHERE report_id = ?", (status, report_id))
    state.db.commit()
    return get(state, report_id)


def dispatch(state: AppState, report_id: str, recipient: str) -> dict[str, Any]:
    get(state, report_id)
    state.db.execute("UPDATE reports SET dispatched_to = ?, dispatched_at = ? WHERE report_id = ?", (recipient, time.time(), report_id))
    state.db.commit()
    return get(state, report_id)


SIGN_SLOTS = {
    # slot -> (required clearance role, column prefix)
    "engineering": ("propulsion_engineer", ""),
    "maintenance": ("maint_tech", "maint_"),
}


def sign(state: AppState, report_id: str, signer: str, signer_operator_id: str, slot: str = "engineering") -> dict[str, Any]:
    """Digitally sign one sign-off slot: SHA-256 over the report's canonical content
    (the maintenance sign-off also covers the engineering signature, if present).
    """
    if slot not in SIGN_SLOTS:
        raise ValueError(f"Unknown signature slot '{slot}'")
    report = get(state, report_id)
    payload = {"content": report["content"], "engineering_sha256": report.get("signature_sha256") if slot == "maintenance" else None}
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, default=float).encode()).hexdigest()
    prefix = SIGN_SLOTS[slot][1]
    who_col = "signed_by" if slot == "engineering" else "maint_signed_by"
    id_col = "signer_operator_id" if slot == "engineering" else "maint_signer_operator_id"
    state.db.execute(
        f"UPDATE reports SET {who_col} = ?, {id_col} = ?, {prefix}signed_at = ?, {prefix}signature_sha256 = ? WHERE report_id = ?",
        (signer, signer_operator_id, time.time(), digest, report_id),
    )
    if slot == "maintenance" and report["status"] == "PENDING_REVIEW":
        # The maintenance sign-off is the last gate: it releases the flight permit.
        state.db.execute("UPDATE reports SET status = 'APPROVED' WHERE report_id = ?", (report_id,))
    state.db.commit()
    return get(state, report_id)


def export_raw(state: AppState, report_id: str, fmt: str) -> tuple[bytes, str, str]:
    """Raw telemetry behind a mission report: csv | hdf5 | 1553json -> (bytes, media type, filename)."""
    report = get(state, report_id)
    run_id = report["mission_run_id"]
    if run_id is None:
        raise ValueError("This report has no mission telemetry to export")
    df = _mission_df(state, run_id)
    if df is None:
        raise KeyError(run_id)
    df = df.select_dtypes(include=["number", "bool"]).assign(segment=df.get("segment"))
    stem = f"{report['report_id']}_{run_id}"
    if fmt == "csv":
        return df.to_csv(index=False).encode(), "text/csv", f"{stem}.csv"
    if fmt == "hdf5":
        import h5py

        buf = io.BytesIO()
        with h5py.File(buf, "w") as h5:
            grp = h5.create_group("telemetry")
            for col in df.columns:
                if col == "segment":
                    grp.create_dataset(col, data=np.array([str(s) for s in df[col]], dtype="S"))
                else:
                    grp.create_dataset(col, data=df[col].to_numpy(dtype=float), compression="gzip")
            h5.attrs["report_id"] = report["report_id"]
            h5.attrs["mission_run_id"] = run_id
        return buf.getvalue(), "application/x-hdf5", f"{stem}.h5"
    if fmt == "1553json":
        payload = {
            "bus": "MIL-STD-1553B", "report_id": report["report_id"], "mission_run_id": run_id,
            "messages": json.loads(df.to_json(orient="records")),
        }
        return json.dumps(payload).encode(), "application/json", f"{stem}.1553b.json"
    raise ValueError(f"Unknown export format '{fmt}'")
