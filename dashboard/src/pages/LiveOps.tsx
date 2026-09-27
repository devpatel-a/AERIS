/* Stitch screen "AeroTwin — Screen 1: Live Ops", bound to the live telemetry stream. */
import { useId } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../lib/api";
import { useEngineConfig, type EngineConfigView } from "../lib/useEngineConfig";
import { useLiveSocket, type LiveRow } from "../lib/useLiveSocket";
import { fmt, fmtDuration, kgsToLph, kpaToBar, kpaToInHg, kToC, signed, slope } from "../lib/units";
import { Sparkline } from "../components/stitch/Sparkline";
import { NoLiveSession } from "../components/stitch/NoLiveSession";

const SUBSYSTEMS: [string, string][] = [
  ["combustion", "COMBUSTION"],
  ["cooling", "COOLING"],
  ["lubrication", "LUBRICATION"],
  ["fuel_injection", "FUEL / INJ"],
  ["electrical", "ELECTRICAL"],
  ["mechanical_vibration", "VIBRATION"],
  ["sensors", "SENSOR ARRAY"],
];
const RISK_LABEL: Record<string, string> = { NORMAL: "Normal", WATCH: "Watch", WARNING: "Warning", CRITICAL: "Critical" };

export default function LiveOps() {
  const { latest, history } = useLiveSocket();
  const cfg = useEngineConfig(latest?.context?.engine_id);
  if (!latest || latest.mode !== "LIVE" || !cfg) return <NoLiveSession screen="Live Ops" />;
  return (
    <main className="flex-1 overflow-y-auto px-margin py-space-md space-y-gutter bg-[#F5F7FA]">
      <AlertBanner row={latest} />
      <section className="grid grid-cols-12 gap-gutter">
        <HealthCard row={latest} />
        <div className="col-span-12 lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-gutter-dense">
          {SUBSYSTEMS.map(([key, label]) => (
            <SubsystemTile key={key} label={label} value={latest.subsystem_index?.[key]} risk={latest.subsystem_risk?.[key] ?? "NORMAL"} />
          ))}
          <SamplingTile row={latest} />
        </div>
      </section>
      <Gauges row={latest} cfg={cfg} />
      <section className="grid grid-cols-12 gap-gutter">
        <CylinderMatrix row={latest} cfg={cfg} />
        <VibrationCard row={latest} cfg={cfg} />
      </section>
      <TelemetryStreams row={latest} history={history} cfg={cfg} />
    </main>
  );
}

/* ---------------------------------------------------------------- banner */
function AlertBanner({ row }: { row: LiveRow }) {
  const navigate = useNavigate();
  const b = row.banner;
  if (!b || b.muted) return null;
  const residual = b.residual == null ? null : `${signed(b.residual, 1)} ${b.channel?.startsWith("cht") || b.channel?.startsWith("egt") || b.channel?.endsWith("_k") ? "°C" : ""}`;
  const when = b.lead_time_s != null
    ? `detected ${fmtDuration(b.lead_time_s)} before threshold`
    : b.time_to_limit_s != null
      ? `projected limit in ${fmtDuration(b.time_to_limit_s)}`
      : "trend below threshold";
  return (
    <div className="w-full bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-space-md flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-space-md">
        <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0 border border-[#FCD34D]">
          <span className="material-symbols-outlined text-[20px]">warning</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-label-caps font-label-caps text-[#B45309] tracking-wider uppercase">{b.title}</span>
            <span className="font-telemetry-sm text-[10px] text-[#D97706] bg-[#FEF3C7] px-1.5 py-0.5 rounded border border-[#FDE68A]">Confidence {fmt(b.confidence * 100, 1)}%</span>
          </div>
          <p className="text-body-md font-body-md text-[#78350F] mt-0.5">
            {b.health_label} declining — {b.channel_label ? `${b.channel_label.startsWith("CHT") ? "CHT" : b.channel_label} residual ${residual}, ` : ""}{when}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-space-sm shrink-0">
        <button onClick={() => navigate("/diagnostics")} className="h-9 px-3.5 rounded bg-[#1E5EFF] hover:bg-[#1748D1] text-white text-headline-sm font-headline-sm text-xs flex items-center gap-1.5 transition-colors duration-150 shadow-sm">
          <span className="material-symbols-outlined text-[16px]">troubleshoot</span>
          <span>View Diagnosis</span>
        </button>
        <button
          onClick={() => request("/api/alerts/mute", { method: "POST", body: JSON.stringify({ minutes: 30 }) })}
          className="h-9 px-3 rounded bg-white hover:bg-[#FEF3C7]/40 border border-[#CBD5E1] text-[#475569] text-headline-sm font-headline-sm text-xs transition-colors duration-150"
        >
          Mute for 30m
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- health */
export function RiskPill({ risk, className = "" }: { risk: string; className?: string }) {
  const s = PILL[risk] ?? PILL.NORMAL;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-telemetry-sm text-telemetry-sm font-semibold border ${s.box} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {risk}
    </span>
  );
}
const PILL: Record<string, { box: string; dot: string }> = {
  NORMAL: { box: "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]", dot: "bg-[#16A34A]" },
  WATCH: { box: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]", dot: "bg-[#F59E0B]" },
  WARNING: { box: "bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]", dot: "bg-[#EA580C]" },
  CRITICAL: { box: "bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]", dot: "bg-[#DC2626]" },
};

function HealthCard({ row }: { row: LiveRow }) {
  const hi: number = row.health_index ?? 0;
  const risk: string = row.health_risk ?? "NORMAL";
  const halfBand = row.rul_p95_hours != null && row.rul_p05_hours != null ? (row.rul_p95_hours - row.rul_p05_hours) / 2 : null;
  // Baseline drift: mean deviation of the twin's estimated health vector from nominal.
  const ds: Record<string, number> = row.degradation_state ?? {};
  const devs = Object.values(ds).map((v) => Math.abs(v - 1));
  const drift = devs.length ? (devs.reduce((a, b) => a + b, 0) / devs.length) * 100 : null;
  const worst = Object.entries((row.subsystem_index ?? {}) as Record<string, number>)
    .filter(([k]) => k !== "turbo_air")
    .sort((a, b) => a[1] - b[1])[0];
  const worstLabel = worst ? (SUBSYSTEMS.find(([k]) => k === worst[0])?.[1] ?? worst[0]) : "--";
  return (
    <div className="col-span-12 lg:col-span-4 bg-white border border-[#E3E8EF] rounded-xl p-space-md custom-shadow-card flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-space-sm">
        <div>
          <span className="text-label-caps font-label-caps text-[#94A3B8] uppercase">Overall Engine Health</span>
          <p className="text-headline-sm font-headline-sm text-[#0F172A]">Digital Twin Synthetics</p>
        </div>
        <RiskPill risk={risk} />
      </div>
      <div className="py-space-md flex items-center justify-around">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" fill="none" r="42" stroke="#EEF2F6" strokeWidth="8" />
            <circle cx="50" cy="50" fill="none" r="42" stroke="#1E5EFF" strokeDasharray="264" strokeDashoffset={264 * (1 - Math.min(Math.max(hi, 0), 100) / 100)} strokeLinecap="round" strokeWidth="8" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-telemetry-xl text-telemetry-xl text-[#0F172A] font-bold">{fmt(hi)}</span>
            <span className="font-label-caps text-[10px] text-[#64748B]">INDEX / 100</span>
          </div>
        </div>
        <div className="space-y-space-sm pl-space-sm border-l border-[#F1F5F9]">
          <div>
            <span className="text-label-caps font-label-caps text-[#64748B] text-[10px] block uppercase">Remaining Useful Life</span>
            <div className="font-telemetry-md text-telemetry-md text-[#0F172A] font-semibold">
              {fmt(row.rul_mean_hours)}{row.rul_capped ? "+" : ""} hrs{" "}
              {halfBand != null && !row.rul_capped && <span className="text-[#64748B] text-xs font-normal">(±{fmt(halfBand)})</span>}
              {row.rul_capped && <span className="text-[#64748B] text-xs font-normal">(TBO cap)</span>}
            </div>
          </div>
          <div>
            <span className="text-label-caps font-label-caps text-[#64748B] text-[10px] block uppercase">Confidence Index</span>
            <div className="font-telemetry-md text-telemetry-md text-[#0F172A] font-semibold flex items-center gap-1">
              <span>{fmt(row.confidence_pct, 1)}%</span>
              {row.confidence_pct >= 95 && <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>}
            </div>
          </div>
        </div>
      </div>
      <div className="pt-space-xs border-t border-[#F1F5F9] flex items-center justify-between text-[#64748B] font-telemetry-sm text-[10px]">
        <span>
          Baseline Drift: <strong className="text-[#0F172A]">{drift == null ? "--" : `${signed(drift, 1)}%`}</strong>
        </span>
        <span>
          Degradation: <strong className={worst && worst[1] < 95 ? "text-[#B45309]" : "text-[#0F172A]"}>{worst && worst[1] < 95 ? worstLabel.charAt(0) + worstLabel.slice(1).toLowerCase() : "None"}</strong>
        </span>
      </div>
    </div>
  );
}

const TILE: Record<string, { box: string; label: string; value: string; dot: string; pill: string; bar: string }> = {
  NORMAL: {
    box: "bg-white border border-[#E3E8EF]", label: "text-[#64748B]", value: "text-[#0F172A]",
    dot: "w-1.5 h-1.5 rounded-full bg-emerald-500", pill: "bg-[#DCFCE7] text-[#15803D]", bar: "bg-emerald-500",
  },
  WATCH: {
    box: "border-2 border-[#F59E0B]/40 bg-[#FEF3C7]/10", label: "text-[#B45309] font-bold", value: "text-[#B45309]",
    dot: "w-2 h-2 rounded-full bg-amber-500 animate-pulse", pill: "bg-[#FEF3C7] text-[#B45309] font-bold border border-[#FDE68A]", bar: "bg-amber-500",
  },
  WARNING: {
    box: "border-2 border-[#EA580C]/40 bg-[#FFEDD5]/20", label: "text-[#C2410C] font-bold", value: "text-[#C2410C]",
    dot: "w-2 h-2 rounded-full bg-[#EA580C] animate-pulse", pill: "bg-[#FFEDD5] text-[#C2410C] font-bold border border-[#FED7AA]", bar: "bg-[#EA580C]",
  },
  CRITICAL: {
    box: "border-2 border-[#DC2626]/40 bg-[#FEE2E2]/20", label: "text-[#B91C1C] font-bold", value: "text-[#B91C1C]",
    dot: "w-2 h-2 rounded-full bg-[#DC2626] animate-pulse", pill: "bg-[#FEE2E2] text-[#B91C1C] font-bold border border-[#FECACA]", bar: "bg-[#DC2626]",
  },
};

function SubsystemTile({ label, value, risk }: { label: string; value: number | undefined; risk: string }) {
  const s = TILE[risk] ?? TILE.NORMAL;
  const v = value ?? 0;
  return (
    <div className={`${s.box} rounded-xl p-space-sm flex flex-col justify-between custom-shadow-card`}>
      <div className="flex items-center justify-between">
        <span className={`text-label-caps font-label-caps text-[10px] ${s.label}`}>{label}</span>
        <span className={s.dot} />
      </div>
      <div className="my-space-xs flex items-baseline justify-between">
        <span className={`font-telemetry-xl text-[24px] font-bold ${s.value}`}>{fmt(value)}</span>
        <span className={`px-1.5 py-0.2 rounded-full font-telemetry-sm text-[10px] ${s.pill}`}>{RISK_LABEL[risk] ?? risk}</span>
      </div>
      <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
        <div className={`${s.bar} h-full rounded-full`} style={{ width: `${Math.min(Math.max(v, 0), 100)}%` }} />
      </div>
    </div>
  );
}

function SamplingTile({ row }: { row: LiveRow }) {
  const bus = row.hil_bus;
  const drops: number | null = bus?.dropped_frames ?? null;
  return (
    <div className="bg-[#F8FAFC] border border-dashed border-[#CBD5E1] rounded-xl p-space-sm flex flex-col justify-between">
      <span className="text-label-caps font-label-caps text-[#94A3B8] text-[10px]">SAMPLING RATE</span>
      <div className="font-telemetry-md text-[#0F172A] font-bold flex items-center justify-between">
        <span>{fmt(row.context?.link_hz, 2)} Hz</span>
        <span className={`text-xs font-normal ${drops ? "text-[#C2410C]" : "text-emerald-600"}`}>{drops ?? "--"} drops</span>
      </div>
      <span className="text-[10px] text-[#64748B] font-telemetry-sm">Synced with {bus?.interface === "virtual" ? "vCAN" : "CAN"}-Bus {bus?.channel ? bus.channel.slice(-2).toUpperCase() : ""}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- gauges */
// Instrument geometry, in px of the 176 x 96 gauge box (drawn 1:1 for crisp strokes).
const G = { w: 176, h: 96, cx: 88, cy: 86, r: 72, arcW: 7 };

/** Point on the gauge circle at fraction f (0 = left stop, 1 = right stop) and radius r. */
function gaugePt(f: number, r: number): [number, number] {
  const t = Math.PI * (1 - f);
  return [G.cx + r * Math.cos(t), G.cy - r * Math.sin(t)];
}

/** SVG arc path along the gauge circle from fraction f0 to f1. */
function gaugeArc(f0: number, f1: number, r = G.r): string {
  const [x0, y0] = gaugePt(f0, r);
  const [x1, y1] = gaugePt(f1, r);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

function Gauge({
  title, meta, metaClass = "text-[#64748B]", fraction, color, value, unit, status, statusClass, limitFraction,
}: {
  title: string; meta: string; metaClass?: string; fraction: number; color: string; needleDot?: string; value: string; unit: string;
  status: string; statusClass: string; limitFraction?: number;
}) {
  const f = Math.min(Math.max(fraction, 0), 1);
  const lim = limitFraction != null ? Math.min(Math.max(limitFraction, 0), 1) : null;
  const id = `gauge${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const ticks = Array.from({ length: 19 }, (_, k) => (k + 1) / 20); // minor every 5 %, major every 25 % (end stops omitted)
  const inner = G.r - G.arcW / 2 - 3; // tick ring sits just inside the arc
  const [tx, ty] = gaugePt(f, G.r);
  return (
    <div className="bg-white border border-[#E3E8EF] rounded-xl p-space-md custom-shadow-card flex flex-col items-center">
      <div className="w-full flex items-center justify-between border-b border-[#F1F5F9] pb-space-xs">
        <span className="text-label-caps font-label-caps text-[#94A3B8]">{title}</span>
        <span className={`font-telemetry-sm text-[10px] ${metaClass}`}>{meta}</span>
      </div>
      <div className="relative w-44 h-24 my-2">
        <svg className="w-44 h-24 overflow-visible" viewBox={`0 0 ${G.w} ${G.h}`} shapeRendering="geometricPrecision" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-arc`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={color} stopOpacity="0.55" />
              <stop offset="1" stopColor={color} />
            </linearGradient>
            <filter id={`${id}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0.6" stdDeviation="0.7" floodColor="#0F172A" floodOpacity="0.25" />
            </filter>
          </defs>
          {/* Inactive track, with the region beyond the limit tinted as a caution zone. */}
          <path d={gaugeArc(0, 1)} fill="none" stroke="#EDF1F6" strokeLinecap="round" strokeWidth={G.arcW} />
          {lim != null && lim < 1 && <path d={gaugeArc(lim, 1)} fill="none" stroke="#FCA5A5" strokeOpacity="0.45" strokeWidth={G.arcW} />}
          {/* Active value arc. */}
          {f > 0.002 && <path d={gaugeArc(0, f)} fill="none" stroke={`url(#${id}-arc)`} strokeLinecap="round" strokeWidth={G.arcW} />}
          {/* Scale. */}
          {ticks.map((t) => {
            const major = Math.round(t * 20) % 5 === 0;
            const [x0, y0] = gaugePt(t, inner);
            const [x1, y1] = gaugePt(t, inner - (major ? 6 : 3.5));
            const warn = lim != null && t > lim + 1e-6;
            return (
              <line key={t} x1={x0} y1={y0} x2={x1} y2={y1} strokeLinecap="round"
                stroke={warn ? "#F87171" : major ? "#94A3B8" : "#CBD5E1"} strokeWidth={major ? 1.2 : 0.8} />
            );
          })}
          {/* Limit marker: a red hairline across the arc and scale. */}
          {lim != null && (() => {
            const [a0, b0] = gaugePt(lim, G.r + G.arcW / 2 + 2);
            const [a1, b1] = gaugePt(lim, inner - 6);
            return <line x1={a0} y1={b0} x2={a1} y2={b1} stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />;
          })()}
          {/* Value marker on the arc end. */}
          <circle cx={tx} cy={ty} r="2.2" fill="#FFFFFF" stroke={color} strokeWidth="1.5" />
          {/* Pointer: thin tapered needle with a short tail, rotated about the hub. */}
          <g style={{ transform: `rotate(${(f * 180 - 90).toFixed(2)}deg)`, transformOrigin: `${G.cx}px ${G.cy}px`, transition: "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)" }} filter={`url(#${id}-shadow)`}>
            <polygon fill="#1E293B" points={`${G.cx - 1.6},${G.cy} ${G.cx - 0.35},${G.cy - (inner - 9)} ${G.cx + 0.35},${G.cy - (inner - 9)} ${G.cx + 1.6},${G.cy} ${G.cx + 0.9},${G.cy + 8} ${G.cx - 0.9},${G.cy + 8}`} />
          </g>
          {/* Hub. */}
          <circle cx={G.cx} cy={G.cy} r="5" fill="#FFFFFF" stroke={color} strokeWidth="2" />
          <circle cx={G.cx} cy={G.cy} r="1.6" fill="#1E293B" />
        </svg>
      </div>
      <div className="text-center">
        <div className="font-telemetry-xl text-telemetry-xl text-[#0F172A] font-bold tracking-tight tabular-nums">
          {value}
          <span className="ml-1.5 text-telemetry-sm font-medium tracking-wide text-[#64748B]">{unit}</span>
        </div>
        <span className={`inline-block text-label-caps text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${statusClass}`}>{status}</span>
      </div>
    </div>
  );
}

function Gauges({ row, cfg }: { row: LiveRow; cfg: EngineConfigView }) {
  const m = row.measured ?? {};
  const e = row.expected ?? {};
  const ctx = row.context ?? {};
  const rated = cfg.rating.rated_power_w;
  const mcp = cfg.rating.max_continuous_power_w ?? rated;
  const power: number = row.power_w ?? 0;
  const rpm: number = m.rpm ?? 0;
  const mapKpa: number = m.map_kpa ?? 0;
  const boostBar = kpaToBar(mapKpa - (ctx.ambient_pressure_kpa ?? 101.3)) ?? 0;
  const wastegate = cfg.turbo.present && mapKpa >= 0.97 * cfg.turbo.wastegate_max_map_kpa;
  const fuel = kgsToLph(m.fuel_flow_kg_s, cfg.fuel.density_kg_per_l) ?? 0;
  const fuelExp = kgsToLph(e.fuel_flow_kg_s, cfg.fuel.density_kg_per_l) ?? 0;
  const fuelRes = fuel - fuelExp;
  const pct = (power / rated) * 100;
  const mcpPct = (mcp / rated) * 100;
  const mapMax = cfg.limits.max_map_kpa ?? 135;
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
      <Gauge
        title="ENGINE SPEED" meta={`MAX ${fmt(cfg.rating.rated_rpm)}`} fraction={rpm / cfg.rating.rated_rpm} color="#1E5EFF" needleDot="bg-primary"
        value={fmt(rpm)} unit="RPM" limitFraction={0.97}
        status={power > mcp ? "Takeoff Power Zone" : rpm < cfg.rating.idle_rpm * 1.3 ? "Idle Zone" : "Continuous Operation Zone"}
        statusClass={power > mcp ? "text-[#B45309] bg-amber-50" : "text-emerald-600 bg-emerald-50"}
      />
      <Gauge
        title="MANIFOLD PRESSURE (MAP)" meta={cfg.turbo.present ? "TURBO BOOST" : "NATURALLY ASPIRATED"} metaClass="text-primary font-bold"
        fraction={mapKpa / mapMax} color="#0284C7" needleDot="bg-[#0284C7]" value={fmt(kpaToInHg(mapKpa), 1)} unit="inHg"
        status={boostBar > 0.02 ? `${wastegate ? "Wastegate Active" : "Turbo Boost"} (${signed(boostBar, 1)} bar)` : "Ambient Manifold Pressure"}
        statusClass="text-sky-700 bg-sky-50"
      />
      <Gauge
        title="FUEL CONSUMPTION" meta="METERED FLOW" fraction={fuel / cfg.fuel.max_flow_l_per_h} color="#059669" needleDot="bg-[#059669]"
        value={fmt(fuel, 1)} unit="L/h"
        status={Math.abs(fuelRes) < 0.05 * Math.max(fuelExp, 1) ? "Metered Flow Matches Twin" : `Flow Residual ${signed(fuelRes, 1)} L/h`}
        statusClass={Math.abs(fuelRes) < 0.05 * Math.max(fuelExp, 1) ? "text-emerald-600 bg-emerald-50" : "text-[#B45309] bg-amber-50"}
      />
      <Gauge
        title="POWER OUTPUT" meta={`MAX CONT: ${fmt(mcpPct)}%`} fraction={pct / 100} color="#1E5EFF" needleDot="bg-primary" limitFraction={mcpPct / 100}
        value={`${fmt(pct)}%`} unit="PWR"
        status={pct > mcpPct + 1 ? "Takeoff Power (5 min limit)" : pct > mcpPct - 5 ? "Continuous Max Setting" : "Cruise Power Setting"}
        statusClass={pct > mcpPct + 1 ? "text-[#B45309] bg-amber-50" : "text-primary bg-blue-50"}
      />
    </section>
  );
}

/* ---------------------------------------------------------------- cylinders */
// CHT bars on a 60-145 °C axis (the gridlines); EGT bars proportional to EGT/10 on 0-150.
const CHT_AXIS: [number, number] = [60, 145];
const chtPct = (c: number) => Math.min(Math.max(((c - CHT_AXIS[0]) / (CHT_AXIS[1] - CHT_AXIS[0])) * 100, 2), 100);

function CylinderMatrix({ row, cfg }: { row: LiveRow; cfg: EngineConfigView }) {
  const limitC = kToC(cfg.limits.max_cht_k)!;
  const targetC = kToC(cfg.limits.cht_target_k ?? null);
  const pos = (c: number) => `${(100 - chtPct(c)).toFixed(1)}%`;
  const cyls: any[] = row.cylinders ?? [];
  const attr = row.attribution;
  const combustionFlag = (row.fault_matrix ?? []).some((f: any) => ["combustion_instability", "misfire"].includes(f.fault_type) && f.state !== "MONITOR");
  return (
    <div className="col-span-12 lg:col-span-7 bg-white border border-[#E3E8EF] rounded-xl p-space-md custom-shadow-card">
      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-space-sm mb-space-md">
        <div>
          <span className="text-label-caps font-label-caps text-[#94A3B8] uppercase">Thermal Exhaust &amp; Head Analysis</span>
          <h2 className="text-headline-sm font-headline-sm text-[#0F172A]">Cylinder Temperature Matrix (CHT / EGT)</h2>
        </div>
        <div className="flex items-center gap-space-md font-telemetry-sm text-[10px]">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary inline-block" /><span>CHT (°C)</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#64748B] inline-block" /><span>EGT (°C / 10)</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 border-t-2 border-dashed border-[#DC2626] inline-block" /><span className="text-[#DC2626]">Limit: {fmt(limitC)}°C</span></div>
        </div>
      </div>
      <div className="relative h-60 w-full pt-4">
        {/* Reference lines positioned on the same 0-based scale as the bars (bar area = h-44 above the pb-8 label strip). */}
        <div className="absolute left-0 right-0 bottom-8 h-44 pointer-events-none text-right font-telemetry-sm text-[10px] text-[#94A3B8]">
          <RefLine top={pos(limitC)} className="border-dashed border-[#DC2626]/40" left={<span className="text-[#DC2626] text-[9px] bg-red-50 px-1 rounded">REDLINE CHT {fmt(limitC)}°C</span>} right={`${fmt(limitC)}°C`} />
          {targetC != null && <RefLine top={pos(targetC)} className="border-dashed border-[#CBD5E1]" left={<span className="text-[#64748B] text-[9px]">NORMAL CHT TARGET {fmt(targetC)}°C</span>} right={`${fmt(targetC)}°C`} />}
          <RefLine top={pos(100)} className="border-[#F1F5F9]" right="100°C" />
          <RefLine top={pos(80)} className="border-[#F1F5F9]" right="80°C" />
        </div>
        <div className="relative h-full flex items-end justify-around pb-8 px-4">
          {cyls.map((c) => {
            const cht = kToC(c.cht_k) ?? 0;
            const egt = kToC(c.egt_k) ?? 0;
            const hot = c.status !== "NORMAL";
            return (
              <div key={c.cylinder} className={`flex flex-col items-center gap-1 w-20 ${hot ? "bg-amber-50/70 p-1 rounded border border-amber-200" : ""}`}>
                <div className="flex items-end gap-1.5 h-44 w-full justify-center">
                  <div className={`w-6 rounded-t transition-all ${hot ? "bg-amber-500 shadow-sm" : "bg-primary"}`} style={{ height: `${chtPct(cht)}%` }}>
                    <div className={`text-[9px] font-telemetry-sm text-white text-center pt-0.5 ${hot ? "font-bold" : ""}`}>{fmt(cht)}°</div>
                  </div>
                  <div className="w-6 bg-[#94A3B8] rounded-t transition-all" style={{ height: `${Math.min((egt / 10 / 150) * 100, 100)}%` }}>
                    <div className="text-[9px] font-telemetry-sm text-white text-center pt-0.5">{fmt(egt)}°</div>
                  </div>
                </div>
                <span className={`font-telemetry-sm text-xs mt-1 ${hot ? "text-[#B45309] font-bold" : "text-[#0F172A] font-semibold"}`}>CYL {c.cylinder}{hot ? " ⚠" : ""}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-space-xs pt-space-xs border-t border-[#F1F5F9] flex items-center justify-between text-[#64748B] font-telemetry-sm text-[11px]">
        <span>
          Anomaly attribution:{" "}
          <strong className={attr ? "text-amber-700" : "text-[#0F172A]"}>
            {attr ? `${attr.channel_label ?? ""} ${attr.kind === "engine" ? "— engine fault" : "— sensor fault"}`.trim() : "None"}
          </strong>
        </span>
        <span className={combustionFlag ? "text-[#B45309]" : "text-emerald-700"}>{combustionFlag ? "Combustion Irregularity Flagged" : "No Detonation Signature Detected"}</span>
      </div>
    </div>
  );
}

function RefLine({ top, className, left, right }: { top: string; className: string; left?: React.ReactNode; right: string }) {
  return (
    <div className={`absolute left-0 right-0 border-b flex justify-between ${className}`} style={{ top }}>
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- vibration */
function VibrationCard({ row, cfg }: { row: LiveRow; cfg: EngineConfigView }) {
  const spec: any[] = row.vibration_spectrum ?? [];
  const max = Math.max(...spec.map((p) => Math.max(p.velocity_ips, p.envelope_ips ?? 0)), 0.01);
  const barPx = (v: number) => Math.max(4, (v / max) * 110);
  const rms: number = row.vibration_ips_rms ?? 0;
  const overEnvelope = spec.filter((p) => p.envelope_ips != null && p.velocity_ips > p.envelope_ips);
  const oneX = spec.find((p) => p.order === 1.0);
  const bearing = oneX && oneX.envelope_ips != null && oneX.velocity_ips > oneX.envelope_ips;
  const n = spec.length;
  const envelope = spec.map((p, i) => `${((i + 0.5) / n) * 100},${130 - barPx(p.envelope_ips ?? 0)}`).join(" ");
  return (
    <div className="col-span-12 lg:col-span-5 bg-white border border-[#E3E8EF] rounded-xl p-space-md custom-shadow-card">
      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-space-sm mb-space-md">
        <div>
          <span className="text-label-caps font-label-caps text-[#94A3B8] uppercase">Propulsion Dynamics</span>
          <h2 className="text-headline-sm font-headline-sm text-[#0F172A]">Vibration Spectrum (Engine Orders)</h2>
        </div>
        <span className={`font-telemetry-sm text-[10px] px-2 py-0.5 rounded font-semibold border ${overEnvelope.length ? "text-[#B45309] bg-amber-50 border-amber-200" : "text-emerald-700 bg-emerald-50 border-emerald-200"}`}>{fmt(rms, 2)} ips RMS</span>
      </div>
      <div className="h-60 w-full flex flex-col justify-between">
        <div className="relative flex-1 flex items-end justify-between px-2 pt-4 pb-6">
          <svg className="absolute inset-x-2 bottom-6 h-[130px] w-[calc(100%-1rem)] pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 130">
            <polyline fill="none" points={envelope} stroke="#CBD5E1" strokeDasharray="3 2" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="absolute top-2 right-2 font-telemetry-sm text-[9px] text-[#94A3B8]">Baseline Normal Envelope</span>
          {spec.map((p) => {
            const major = p.velocity_ips >= 0.5 * Math.max(...spec.map((q) => q.velocity_ips));
            const hot = p.envelope_ips != null && p.velocity_ips > p.envelope_ips;
            return (
              <div key={p.order} className={`flex flex-col items-center gap-1 ${major ? "w-10" : "w-7"}`}>
                {major && <span className={`font-telemetry-sm text-[9px] font-bold ${hot ? "text-[#B45309]" : "text-primary"}`}>{fmt(p.velocity_ips, 2)}</span>}
                <div className={`${major ? "w-5" : "w-4"} rounded-t ${hot ? "bg-amber-500" : major ? "bg-primary" : "bg-slate-300"}`} style={{ height: `${barPx(p.velocity_ips)}px` }} />
                <span className={`font-telemetry-sm text-[10px] ${major ? "text-[#0F172A] font-bold" : "text-[#64748B]"}`}>{fmt(p.order, 1)}×</span>
              </div>
            );
          })}
        </div>
        <div className="pt-space-xs border-t border-[#F1F5F9] flex items-center justify-between text-[#64748B] font-telemetry-sm text-[10px]">
          <span>Sensor: {cfg.vibration.sensor_label}</span>
          <span className={`font-medium ${bearing ? "text-[#B45309]" : "text-primary"}`}>{bearing ? "1× Imbalance / Bearing Signature" : "No Bearing Fault Detected"}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- streams */
interface StreamDef {
  key: string;
  label: string;
  unit: string;
  digits: number;
  conv: (v: number) => number | null;
  rangeKey: string;
  note: (trendPerHr: number, v: number) => string;
}
const STREAMS: StreamDef[] = [
  { key: "oil_pressure_kpa", label: "OIL PRESSURE", unit: "bar", digits: 1, conv: (v) => kpaToBar(v), rangeKey: "oil_pressure_kpa", note: () => "Nominal" },
  { key: "oil_temp_k", label: "OIL TEMP", unit: "°C", digits: 0, conv: (v) => kToC(v), rangeKey: "oil_temp_k", note: () => "Stable" },
  { key: "coolant_temp_k", label: "COOLANT TEMP", unit: "°C", digits: 0, conv: (v) => kToC(v), rangeKey: "coolant_temp_k", note: () => "Stable" },
  { key: "alternator_voltage_v", label: "BUS VOLTAGE", unit: "V", digits: 1, conv: (v) => v, rangeKey: "alternator_voltage_v", note: () => "Bus Regulated" },
  { key: "alternator_current_a", label: "ALTERNATOR OUT", unit: "A", digits: 0, conv: (v) => v, rangeKey: "alternator_current_a", note: () => "Gen-1 Active" },
  { key: "injection_timing_deg", label: "INJECTION TIMING", unit: "BTDC", digits: 1, conv: (v) => v, rangeKey: "injection_timing_deg", note: () => "ECU Dynamic" },
];

function TelemetryStreams({ row, history, cfg }: { row: LiveRow; history: LiveRow[]; cfg: EngineConfigView }) {
  const periodMs = row.context?.link_hz ? 1000 / row.context.link_hz : null;
  return (
    <section className="bg-white border border-[#E3E8EF] rounded-xl p-space-md custom-shadow-card">
      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-space-sm mb-space-sm">
        <div>
          <span className="text-label-caps font-label-caps text-[#94A3B8] uppercase">Continuous Telemetry Streams</span>
          <h2 className="text-headline-sm font-headline-sm text-[#0F172A]">Core Subsystem Sensor Telemetry Feed</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-telemetry-sm text-[11px] text-[#64748B]">Auto-refresh rate:</span>
          <span className="font-telemetry-sm text-[11px] text-primary bg-blue-50 px-2 py-0.5 rounded font-bold">{periodMs ? `${fmt(periodMs)}ms (Real-time)` : "--"}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-gutter-dense pt-2">
        {STREAMS.map((s) => {
          const raw = s.key === "injection_timing_deg" ? row.injection_timing_deg : row.measured?.[s.key];
          const value = raw == null ? null : s.conv(raw);
          const series = history.map((h) => {
            const r = s.key === "injection_timing_deg" ? h.injection_timing_deg : h.measured?.[s.key];
            return r == null ? null : s.conv(r);
          });
          const ts = history.map((h) => h.t_s / 3600);
          const tsv = ts.filter((_, i) => series[i] != null);
          const sv = series.filter((x): x is number => x != null);
          const fitted = slope(tsv, sv);
          // Report a rate only when the change over the window clearly exceeds the scatter.
          const spanH = tsv.length > 1 ? tsv[tsv.length - 1] - tsv[0] : 0;
          const mean = sv.reduce((a, x) => a + x, 0) / Math.max(sv.length, 1);
          const sd = Math.sqrt(sv.reduce((a, x) => a + (x - mean) ** 2, 0) / Math.max(sv.length, 1));
          const trend = spanH > 0 && Math.abs(fitted * spanH) > 3 * sd ? fitted : 0;
          const range = cfg.operating_ranges[s.rangeKey];
          const lo = range ? s.conv(range[0]) : null;
          const hi = range ? s.conv(range[1]) : null;
          const out = value != null && lo != null && hi != null && (value < lo || value > hi);
          const elevating = !out && value != null && hi != null && lo != null && trend > 0 && value > hi - 0.1 * (hi - lo);
          const alert = out || elevating;
          const status = out ? (value! > hi! ? "High" : "Low") : elevating ? "Elevating" : "Normal";
          const note = Math.abs(trend) > 0.5 && s.unit !== "BTDC" ? `${signed(trend, 1)}${s.unit === "°C" ? "°C" : ` ${s.unit}`}/hr` : s.note(trend, value ?? 0);
          return (
            <div key={s.key} className={`p-space-sm rounded-lg flex flex-col justify-between ${alert ? "bg-[#FFFBEB] border border-[#FDE68A]" : "bg-[#F8FAFC] border border-[#E3E8EF]"}`}>
              <span className={`text-label-caps font-label-caps text-[10px] block ${alert ? "text-[#B45309] font-bold" : "text-[#64748B]"}`}>{s.label}</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className={`font-telemetry-lg text-telemetry-lg font-bold ${alert ? "text-[#B45309]" : "text-[#0F172A]"}`}>
                  {fmt(value, s.digits)}{s.unit === "BTDC" ? "°" : ""} <span className={`text-xs font-normal ${alert ? "text-[#B45309]" : "text-[#64748B]"}`}>{s.unit}</span>
                </span>
                <span className={`px-1.5 py-0.2 rounded-full font-telemetry-sm text-[9px] font-bold ${alert ? "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]" : "bg-[#DCFCE7] text-[#15803D]"}`}>{status}</span>
              </div>
              <div className="h-8 my-2">
                <Sparkline values={series} stroke={alert ? "#D97706" : "#1E5EFF"} width={alert ? 2 : 1.5} />
              </div>
              <div className={`flex items-center justify-between font-telemetry-sm text-[9px] ${alert ? "text-[#B45309]" : "text-[#94A3B8]"}`}>
                <span>Range: {lo == null ? "--" : `${fmt(lo, s.digits)} - ${fmt(hi, s.digits)}`}</span>
                <span className={alert ? "font-bold" : "text-[#0F172A]"}>{note}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
