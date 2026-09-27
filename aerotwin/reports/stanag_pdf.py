"""STANAG-4671-style A4 airworthiness report PDF, rendered from a stored report's content
(the same content the dashboard's A4 preview shows).
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.shapes import Drawing, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

NAVY = colors.HexColor("#0F172A")
SLATE = colors.HexColor("#475569")
MUTED = colors.HexColor("#94A3B8")
HAIR = colors.HexColor("#E3E8EF")
BLUE = colors.HexColor("#1E5EFF")
TEAL = colors.HexColor("#0EA5A4")
WARN_BG = colors.HexColor("#FFF7ED")
WARN = colors.HexColor("#C2410C")
CRIT = colors.HexColor("#B91C1C")


def _c(k: float | None) -> str:
    return "--" if k is None else f"{k - 273.15:.1f}"


def _styles():
    base = getSampleStyleSheet()
    return {
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=15, textColor=NAVY, spaceAfter=2),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=11, textColor=NAVY, spaceBefore=8, spaceAfter=4),
        "caps": ParagraphStyle("caps", fontName="Helvetica", fontSize=7, textColor=SLATE, leading=9),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=8.5, textColor=SLATE, leading=11.5),
        "mono": ParagraphStyle("mono", fontName="Courier", fontSize=8, textColor=NAVY, leading=10),
        "warn": ParagraphStyle("warn", fontName="Helvetica", fontSize=8.5, textColor=WARN, leading=11.5),
    }


def _divergence_chart(div: dict[str, Any]) -> Drawing:
    d = Drawing(85 * mm, 45 * mm)
    lp = LinePlot()
    lp.x, lp.y, lp.width, lp.height = 8 * mm, 6 * mm, 75 * mm, 34 * mm
    t_h = [t / 3600.0 for t in div["t_s"]]
    lp.data = [
        list(zip(t_h, [m - 273.15 for m in div["measured_k"]], strict=False)),
        list(zip(t_h, [e - 273.15 for e in div["expected_k"]], strict=False)),
    ]
    lp.lines[0].strokeColor, lp.lines[0].strokeWidth = BLUE, 1.2
    lp.lines[1].strokeColor, lp.lines[1].strokeWidth, lp.lines[1].strokeDashArray = TEAL, 1.0, [2, 2]
    for axis in (lp.xValueAxis, lp.yValueAxis):
        axis.labels.fontSize = 6
        axis.strokeColor = HAIR
    d.add(lp)
    d.add(String(8 * mm, 42 * mm, f"CHT CYLINDER {div['cylinder']} vs. TWIN (°C, flight hours)", fontSize=6.5, fillColor=SLATE))
    return d


def render_report_pdf(report: dict[str, Any], station: dict[str, Any], out_path: Path) -> Path:
    """Write the report as an A4 PDF and return its path."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    c = report["content"]
    st = _styles()
    doc = SimpleDocTemplate(str(out_path), pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=14 * mm, bottomMargin=14 * mm)
    story: list = []

    header = Table(
        [[
            Paragraph("<b>AeroTwin DEFENSE SYSTEMS</b>", st["h1"]),
            Paragraph(f"<font color='#B91C1C'><b>RESTRICTED // MIL-STD-882E</b></font><br/>REF: {c.get('ref', '')}", st["caps"]),
        ], [Paragraph("PROPULSION DIGITAL TWIN AIRWORTHINESS ASSESSMENT", st["caps"]), ""]],
        colWidths=[120 * mm, 58 * mm],
    )
    story += [header, Spacer(1, 3 * mm)]

    tail = c.get("tail", {})
    issued = time.strftime("%d-%b-%Y", time.gmtime(c.get("issued_at", time.time()))).upper()
    ident = Table([[
        Paragraph(f"SERIAL: {tail.get('tail_id') or 'FLEET'} ({tail.get('engine_class', '')})", st["mono"]),
        Paragraph(f"PROPULSION SN: {tail.get('engine_serial') or '--'}", st["mono"]),
        Paragraph(f"TOTAL FLIGHT HRS: {tail.get('total_hours') or 0:.1f} hrs", st["mono"]),
        Paragraph(f"DATE OF ISSUANCE: {issued}", st["mono"]),
    ]], colWidths=[48 * mm, 40 * mm, 45 * mm, 45 * mm])
    ident.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.5, HAIR), ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC"))]))
    story += [ident, Spacer(1, 4 * mm)]

    s1 = c.get("section1", {})
    mission = c.get("mission") or {}
    story.append(Paragraph(f"1.0 Executive Propulsion Assessment &amp; In-Flight Telemetry — {mission.get('name', report['title'])}", st["h2"]))
    env = s1.get("envelope") or {}
    ehi = s1.get("ehi")
    delta = s1.get("ehi_delta_vs_baseline")
    rul = s1.get("rul_mean_hours")
    cells = [
        Paragraph(f"ENGINE HEALTH INDEX (EHI)<br/><font size=16 color='#C2410C'><b>{ehi:.0f}</b></font> / 100 {s1.get('ehi_risk') or ''}"
                  + (f"<br/>{delta:+.1f} delta against baseline" if delta is not None else ""), st["body"]) if ehi is not None else Paragraph("EHI --", st["body"]),
        Paragraph(f"REMAINING USEFUL LIFE (RUL)<br/><font size=16 color='#0F172A'><b>{rul:.0f}</b></font> hours"
                  + (f" ({s1.get('rul_p05_hours'):.0f}–{s1.get('rul_p95_hours'):.0f})" if s1.get('rul_p05_hours') is not None else ""), st["body"]) if rul is not None else Paragraph("RUL --", st["body"]),
        Paragraph(f"FLIGHT ENVELOPE PROFILE<br/><b>{env.get('altitude_m', 0):,.0f}m ALT · {env.get('oat_c', 0):.0f}°C OAT</b><br/>Density altitude: {env.get('density_altitude_m', 0):,.0f}m", st["body"]) if env else Paragraph(f"STATUS: {s1.get('status', '--')}", st["body"]),
    ]
    kpis = Table([cells], colWidths=[59 * mm] * 3)
    kpis.setStyle(TableStyle([("BOX", (0, 0), (0, 0), 0.5, HAIR), ("BOX", (1, 0), (1, 0), 0.5, HAIR), ("BOX", (2, 0), (2, 0), 0.5, HAIR), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story += [kpis, Spacer(1, 3 * mm)]

    anomaly = s1.get("primary_anomaly")
    if anomaly:
        text = anomaly.get("diagnosis", "")
        if anomaly.get("residual_k") is not None:
            text = (f"Digital twin detected a {anomaly['residual_k']:+.1f} °C residual above the expected cylinder head temperature"
                    + (f" (CHT {anomaly['cylinder']})" if anomaly.get("cylinder") else "")
                    + (f" at {anomaly['rpm']:,.0f} RPM" if anomaly.get("rpm") else "") + ". "
                    + ("Manifold pressure remained nominal, isolating the vector to a localized thermal path. " if anomaly.get("manifold_nominal") else "")
                    + text)
        box = Table([[Paragraph(f"<b>{anomaly['title']}</b><br/>{text}", st["warn"])]], colWidths=[178 * mm])
        box.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), WARN_BG), ("LINEBEFORE", (0, 0), (0, -1), 2, colors.HexColor("#EA580C"))]))
        story += [box, Spacer(1, 3 * mm)]

    s2 = c.get("section2", {})
    if s2.get("divergence") or s2.get("shap") or s2.get("scheduled"):
        hz = s2.get("sampling_hz")
        story.append(Paragraph("2.0 Digital Twin Telemetry Divergence &amp; Feature Attribution" + (f" — sampling {hz:.0f} Hz" if hz else ""), st["h2"]))
        left = _divergence_chart(s2["divergence"]) if s2.get("divergence") else Paragraph("", st["body"])
        shap_rows = [[Paragraph("<b>AI SHAPLEY ATTRIBUTION VALUES</b>", st["caps"]), ""]] + [
            [Paragraph(f["label"], st["body"]), Paragraph(f"<font color='{'#C2410C' if f['value'] > 0 else '#1E5EFF'}'>{f['value']:+.2f} Φ</font>", st["mono"])]
            for f in s2.get("shap", [])
        ]
        if s2.get("twin_confidence_pct") is not None:
            shap_rows.append([Paragraph(f"Twin model confidence: {s2['twin_confidence_pct']:.1f}%", st["caps"]), ""])
        right = Table(shap_rows, colWidths=[62 * mm, 22 * mm]) if len(shap_rows) > 1 else Paragraph("", st["body"])
        story += [Table([[left, right]], colWidths=[92 * mm, 86 * mm]), Spacer(1, 3 * mm)]
        if s2.get("scheduled"):
            rows = [["Task", "ATA", "Due in (hrs)"]] + [[t["title"], t["ata"], f"{t['due_in_hours']:.0f}"] for t in s2["scheduled"]]
            tbl = Table(rows, colWidths=[110 * mm, 30 * mm, 38 * mm])
            tbl.setStyle(TableStyle([("FONTSIZE", (0, 0), (-1, -1), 8), ("LINEBELOW", (0, 0), (-1, 0), 0.5, HAIR)]))
            story.append(tbl)

    actions = (c.get("section3") or {}).get("actions", [])
    if actions:
        story.append(Paragraph("3.0 Mandatory Pre-Flight Corrective Actions", st["h2"]))
        for a in actions:
            story.append(Paragraph(f"<b>{a['n']}. {a['title']}</b> — <font color='#B91C1C'>{a['tag']}</font> · ATA {a['ata']} / {a['location']}", st["body"]))
            story.append(Paragraph(a["detail"], st["body"]))
            story.append(Spacer(1, 1.5 * mm))

    signed = report.get("signed_by")
    sig = Table([[
        Paragraph("<b>PROPULSION CHIEF ENGINEER</b><br/>" + (
            f"DIGITALLY SIGNED — {signed}<br/>{time.strftime('%Y-%m-%d %H:%M:%SZ', time.gmtime(report['signed_at']))}<br/>SHA-256: {report['signature_sha256'][:4]}...{report['signature_sha256'][-4:]}"
            if signed else "AWAITING SIGNATURE"), st["caps"]),
        Paragraph("<b>CHIEF MAINTENANCE OFFICER</b><br/>" + (
            f"DIGITALLY SIGNED — {report['maint_signed_by']}<br/>{time.strftime('%Y-%m-%d %H:%M:%SZ', time.gmtime(report['maint_signed_at']))}<br/>SHA-256: {report['maint_signature_sha256'][:4]}...{report['maint_signature_sha256'][-4:]}"
            if report.get("maint_signed_by") else "ACTION REQUIRED — awaiting physical ground inspection verification"), st["caps"]),
    ]], colWidths=[89 * mm, 89 * mm])
    sig.setStyle(TableStyle([("BOX", (0, 0), (0, 0), 0.5, HAIR), ("BOX", (1, 0), (1, 0), 0.5, HAIR)]))
    story += [Spacer(1, 4 * mm), sig, Spacer(1, 4 * mm)]
    story.append(Paragraph(
        f"STANAG 4671 ED.3 // AIRWORTHINESS CODE FOR MILITARY UAV SYSTEMS · AeroTwin GCS v{station.get('software_version', '')} · {report['report_id']}",
        st["caps"],
    ))
    doc.build(story)
    return out_path
