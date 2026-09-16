"""Post-flight PDF mission report generation (reportlab)."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from aerotwin.twin.config import EngineConfig

CYL_TEMP_COLS = [f"cht_{i}_k" for i in range(1, 5)]
CYL_EGT_COLS = [f"egt_{i}_k" for i in range(1, 5)]


def _time_above_limit_s(df: pd.DataFrame, cols: list[str], limit: float) -> float:
    if not all(c in df.columns for c in cols):
        return 0.0
    above = (df[cols].max(axis=1) >= limit).sum()
    if len(df) < 2:
        return 0.0
    dt = float(df["t_s"].diff().median())
    return above * dt


def generate_mission_report(
    log_path: Path, config: EngineConfig, out_path: Path, mission_run_id: str
) -> Path:
    """Build a post-flight PDF summary for a stored mission Parquet log."""
    df = pd.read_parquet(log_path)
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(str(out_path), pagesize=letter)
    story = [Paragraph(f"AeroTwin Post-Flight Report — {mission_run_id}", styles["Title"]), Spacer(1, 0.2 * inch)]

    duration_h = (df["t_s"].iloc[-1] - df["t_s"].iloc[0]) / 3600.0 if len(df) else 0.0
    story.append(Paragraph(f"Mission duration: {duration_h:.2f} hours ({len(df)} logged samples)", styles["Normal"]))
    story.append(Spacer(1, 0.15 * inch))

    story.append(Paragraph("Peak values", styles["Heading2"]))
    peak_rows = [["Channel", "Peak value", "Limit"]]
    checks = [
        ("Max CHT (K)", CYL_TEMP_COLS, "max_cht_k", "max"),
        ("Max EGT (K)", CYL_EGT_COLS, "max_egt_k", "max"),
        ("Max oil temp (K)", ["oil_temp_k"], "max_oil_temp_k", "max"),
        ("Min oil pressure (kPa)", ["oil_pressure_kpa"], "min_oil_pressure_kpa", "min"),
        ("Max coolant temp (K)", ["coolant_temp_k"], "max_coolant_temp_k", "max"),
    ]
    for label, cols, limit_attr, kind in checks:
        present = [c for c in cols if c in df.columns]
        if not present:
            continue
        value = df[present].max(axis=1).max() if kind == "max" else df[present].min(axis=1).min()
        limit = getattr(config.limits, limit_attr)
        peak_rows.append([label, f"{value:.1f}", f"{limit:.1f}"])
    table = Table(peak_rows, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("Time above limits", styles["Heading2"]))
    time_rows = [["Channel", "Seconds above limit"]]
    time_rows.append(["CHT", f"{_time_above_limit_s(df, CYL_TEMP_COLS, config.limits.max_cht_k):.0f}"])
    time_rows.append(["EGT", f"{_time_above_limit_s(df, CYL_EGT_COLS, config.limits.max_egt_k):.0f}"])
    t_table = Table(time_rows, hAlign="LEFT")
    t_table.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.grey), ("FONTSIZE", (0, 0), (-1, -1), 9)]))
    story.append(t_table)
    story.append(Spacer(1, 0.2 * inch))

    if "health_cooling_effectiveness" in df.columns:
        story.append(Paragraph("Health change during mission", styles["Heading2"]))
        health_cols = [c for c in df.columns if c.startswith("health_")]
        h_rows = [["Health parameter", "Start", "End"]]
        for c in health_cols:
            h_rows.append([c.replace("health_", ""), f"{df[c].iloc[0]:.3f}", f"{df[c].iloc[-1]:.3f}"])
        h_table = Table(h_rows, hAlign="LEFT")
        h_table.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.grey), ("FONTSIZE", (0, 0), (-1, -1), 9)]))
        story.append(h_table)
        story.append(Spacer(1, 0.2 * inch))

    if "fault_type" in df.columns:
        fault_types = sorted(set(df["fault_type"]) - {"healthy"})
        story.append(Paragraph("Anomalies / faults observed", styles["Heading2"]))
        story.append(Paragraph(", ".join(fault_types) if fault_types else "None", styles["Normal"]))

    doc.build(story)
    return out_path
