"""Post-flight PDF mission report generation (reportlab)."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from aerotwin.reports.summary import LIMIT_LABELS, compute_post_flight_summary
from aerotwin.twin.config import EngineConfig


def generate_mission_report(
    log_path: Path, config: EngineConfig, out_path: Path, mission_run_id: str
) -> Path:
    """Build a post-flight PDF summary for a stored mission Parquet log."""
    df = pd.read_parquet(log_path)
    summary = compute_post_flight_summary(df, config)
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(str(out_path), pagesize=letter)
    story = [Paragraph(f"AeroTwin Post-Flight Report — {mission_run_id}", styles["Title"]), Spacer(1, 0.2 * inch)]

    story.append(
        Paragraph(
            f"Mission duration: {summary.duration_hours:.2f} hours ({summary.n_samples} logged samples)",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 0.15 * inch))

    story.append(Paragraph("Peak values", styles["Heading2"]))
    peak_rows = [["Channel", "Peak value", "Limit"]]
    for key, value in summary.peak_values.items():
        peak_rows.append([LIMIT_LABELS.get(key, key), f"{value:.1f}", f"{summary.limits[key]:.1f}"])
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
    for key, seconds in summary.time_above_limit_s.items():
        time_rows.append([LIMIT_LABELS.get(key, key), f"{seconds:.0f}"])
    t_table = Table(time_rows, hAlign="LEFT")
    t_table.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.grey), ("FONTSIZE", (0, 0), (-1, -1), 9)]))
    story.append(t_table)
    story.append(Spacer(1, 0.2 * inch))

    if summary.health_start:
        story.append(Paragraph("Health change during mission", styles["Heading2"]))
        h_rows = [["Health parameter", "Start", "End"]]
        for name in summary.health_start:
            h_rows.append([name, f"{summary.health_start[name]:.3f}", f"{summary.health_end[name]:.3f}"])
        if summary.health_index_start is not None:
            h_rows.append(
                ["overall_index", f"{summary.health_index_start:.1f}", f"{summary.health_index_end:.1f}"]
            )
        h_table = Table(h_rows, hAlign="LEFT")
        h_table.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.grey), ("FONTSIZE", (0, 0), (-1, -1), 9)]))
        story.append(h_table)
        story.append(Spacer(1, 0.2 * inch))

    story.append(
        KeepTogether(
            [
                Paragraph("Anomalies / faults observed", styles["Heading2"]),
                Paragraph(", ".join(summary.faults_observed) if summary.faults_observed else "None", styles["Normal"]),
            ]
        )
    )

    doc.build(story)
    return out_path
