/* Stitch screen "AeroTwin — Screen 4: Trends & Fleet", bound to the fleet service. */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useStationState } from "../app/StationContext";
import { API_BASE, request } from "../lib/api";
import { getToken } from "../lib/authToken";
import { useLiveSocket } from "../lib/useLiveSocket";
import { usePoll } from "../lib/usePoll";
import { ago, fmt, signed } from "../lib/units";

const CARD = "bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)] flex flex-col justify-between";
const SEG_ON = "font-semibold bg-surface-container-lowest text-primary rounded shadow-xs border border-outline-variant/40";
const SEG_OFF = "font-medium text-on-surface-variant hover:text-on-surface transition-colors";
const PROFILES: [string, string][] = [["all", "All Profiles"], ["isr", "ISR Endurance"], ["high_altitude", "High Altitude"], ["cap", "Combat Air Patrol"]];
const BADGE = {
  amber: "bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]/30", amberDot: "bg-[#F59E0B]",
  orange: "bg-[#FFEDD5] text-[#C2410C] border border-[#EA580C]/30", orangeDot: "bg-[#EA580C]",
  green: "bg-[#DCFCE7] text-[#15803D] border border-[#16A34A]/30", greenDot: "bg-[#16A34A]",
};
const STATUS_CHIP: Record<string, [string, string]> = {
  "MISSION READY": [BADGE.green, BADGE.greenDot],
  WATCH: [BADGE.amber, BADGE.amberDot],
  "MAINTENANCE REQ": [BADGE.orange, BADGE.orangeDot],
};

export default function TrendsFleet() {
  const { session } = useAuth();
  const { latest } = useLiveSocket();
  const { tails } = useStationState();
  const defaultTail = latest?.context?.tail_id ?? session?.tail_id ?? tails.find((t) => t.primary)?.tail_id ?? "fleet";
  const [tail, setTail] = useState<string | null>(null);
  const [range, setRange] = useState("last20");
  const [profile, setProfile] = useState("all");
  const [showParams, setShowParams] = useState(false);
  const selected = tail ?? defaultTail;
  const trends = usePoll(() => request<any>(`/api/fleet/${selected}/trends?range=${range}&profile=${profile}`), 15000, [selected, range, profile]).data;
  const fleet = usePoll(() => request<any>("/api/fleet"), 10000).data;
  const engineShort = (tails[0]?.engine_class ?? "Rotax 914-class").replace("-class", "");
  const benchmark = selected === "fleet" ? "FLEET MEAN" : selected;
  const missions: any[] = trends?.missions ?? [];

  const exportCsv = async () => {
    const res = await fetch(`${API_BASE}/api/fleet/${selected}/trends.csv?range=${range}&profile=${profile}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await res.blob());
    a.download = `${selected}_trends.csv`;
    a.click();
  };

  return (
    <main className="icon-base-20 flex-1 overflow-y-auto px-margin py-margin space-y-space-lg">
      <section aria-label="Fleet and Trend Filters" className="bg-surface-container-lowest border border-outline-variant rounded-lg p-space-sm shadow-[0_1px_3px_rgba(15,23,42,0.05)] flex flex-wrap items-center justify-between gap-space-md relative">
        <div className="flex flex-wrap items-center gap-space-md">
          <Segmented label="ENGINE:">
            <button onClick={() => setTail("fleet")} className={`px-3 py-1 ${selected === "fleet" ? SEG_ON : SEG_OFF}`} type="button">{engineShort} Fleet ({tails.length})</button>
            <button onClick={() => setTail(defaultTail === "fleet" ? tails[0]?.tail_id ?? null : defaultTail)} className={`px-3 py-1 flex items-center gap-1.5 ${selected !== "fleet" ? SEG_ON : SEG_OFF}`} type="button">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> {selected !== "fleet" ? selected : defaultTail} ({engineShort})
            </button>
          </Segmented>
          <Segmented label="RANGE:">
            <button onClick={() => setRange("last20")} className={`px-3 py-1 ${range === "last20" ? SEG_ON : SEG_OFF}`} type="button">Last 20 Missions</button>
            <button onClick={() => setRange("30d")} className={`px-3 py-1 ${range === "30d" ? SEG_ON : SEG_OFF}`} type="button">30 Days</button>
          </Segmented>
          <Segmented label="PROFILE:">
            {PROFILES.map(([k, l]) => (
              <button key={k} onClick={() => setProfile(k)} className={`px-2.5 py-1 ${profile === k ? SEG_ON : SEG_OFF}`} type="button">{l}</button>
            ))}
          </Segmented>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowParams((v) => !v)} className="h-9 px-3 border border-outline-variant bg-surface-container-lowest text-on-surface rounded font-body-md text-body-md hover:bg-surface-container hover:border-outline transition-colors flex items-center gap-1.5" type="button">
            <span className="material-symbols-outlined text-base">tune</span>
            <span>Params</span>
          </button>
          <button onClick={exportCsv} className="h-9 px-3 bg-primary text-on-primary rounded font-body-md text-body-md hover:bg-on-primary-fixed-variant transition-colors flex items-center gap-1.5 shadow-sm" type="button">
            <span className="material-symbols-outlined text-base">file_download</span>
            <span>Export CSV</span>
          </button>
        </div>
        {showParams && trends && (
          <div className="absolute right-space-sm top-full mt-1 z-20 bg-white border border-[#CBD5E1] rounded-xl shadow-float p-space-md w-72 space-y-1 font-telemetry-sm text-telemetry-sm text-on-surface-variant">
            <div className="text-label-caps font-label-caps text-[#94A3B8] uppercase mb-1">Trend Model Parameters</div>
            <div>RUL model: <strong className="text-on-surface">{trends.rul_model}</strong></div>
            <div>CHT margin: stabilized cruise only</div>
            <div>Nominal margin: <strong className="text-on-surface">+{fmt(trends.limits.cht_nominal_margin_k)} °C</strong> · Critical: <strong className="text-on-surface">+{fmt(trends.limits.cht_critical_margin_k)} °C</strong></div>
            <div>Oil wear limit: <strong className="text-on-surface">{fmt(trends.limits.oil_limit_l_per_10h, 2)} L / 10h</strong></div>
          </div>
        )}
      </section>

      <section aria-labelledby="trend-cards-heading">
        <div className="flex items-center justify-between mb-space-sm">
          <div className="flex items-center gap-2">
            <h2 className="text-headline-md font-headline-md text-on-surface tracking-tight" id="trend-cards-heading">Propulsion Degradation Trends</h2>
            <span className="text-label-caps font-label-caps text-on-surface-variant">
              (SORTIES {missions.length ? `M-01 TO ${missions[missions.length - 1].label}` : "—"} · BENCHMARK: {benchmark})
            </span>
          </div>
          <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">Algorithm: {trends?.rul_model ?? "--"}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gutter">{trends && <TrendCards t={trends} />}</div>
      </section>

      <FleetTable fleet={fleet} />
      {trends && <Heatmap t={trends} benchmark={benchmark} engine={engineShort} />}
    </main>
  );
}

function Segmented({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-label-caps font-label-caps text-on-surface-variant">{label}</span>
      <div className="inline-flex rounded-md p-0.5 bg-surface-container border border-outline-variant/60 text-telemetry-sm">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- KPI cards */
/** Sparkline path in a 200x40 box; `domain` fixes the y scale (e.g. 0..limit), else auto-fit. */
function spark(series: (number | null)[], invert = false, domain?: [number, number]) {
  const v = series.map((x, i) => [i, x] as const).filter((p): p is readonly [number, number] => p[1] != null);
  if (v.length < 2) return { d: "", pts: [] as [number, number][] };
  const ys = v.map((p) => p[1]);
  const [lo, hi] = domain ?? [Math.min(...ys), Math.max(...ys)];
  const span = hi - lo || 1;
  const n = series.length - 1 || 1;
  const pts = v.map(([i, y]) => [(i / n) * 200, invert ? 6 + ((y - lo) / span) * 28 : 34 - ((y - lo) / span) * 28] as [number, number]);
  return { d: pts.map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" "), pts, lo, hi };
}

function TrendCards({ t }: { t: any }) {
  const k = t.kpis;
  const hi = k.health_index, bs = k.bsfc_g_per_kwh, cm = k.cht_margin_k, oil = k.oil_l_per_10h;
  const lim = t.limits;
  const labels = t.missions.map((m: any) => m.label);
  const first = labels[0] ?? "M-01", last = labels[labels.length - 1] ?? "--";

  // Health index
  const hiDeclining = (hi.slope_per_mission ?? 0) < -0.05;
  const hiAccel = (hi.recent_slope_per_mission ?? 0) < 1.5 * (hi.slope_per_mission ?? 0) && hiDeclining;
  const hs = spark(hi.series);
  const accent = hs.pts.slice(-6);
  // BSFC
  const bsPct = bs.first ? ((bs.current - bs.first) / bs.first) * 100 : 0;
  const bsCreep = bsPct > 0.5;
  const bss = spark(bs.series);
  // CHT margin
  const margin = cm.current, prev = cm.previous;
  const crit = lim.cht_critical_margin_k;
  const cmWarn = margin != null && margin < crit * 1.5;
  const cms = spark(cm.series);
  // Oil
  const oilDelta = oil.current != null && oil.first != null ? oil.current - oil.first : null;
  const oilOk = oil.current != null && oil.current < lim.oil_limit_l_per_10h;
  // Oil on a fixed 0..limit scale so the dashed wear-limit line (y=6) is meaningful.
  const os = spark(oil.series, false, [0, (lim.oil_limit_l_per_10h * 34) / 28]);

  return (
    <>
      <div className={CARD}>
        <div>
          <div className="flex items-start justify-between">
            <span className="text-label-caps font-label-caps text-on-surface-variant">OVERALL HEALTH INDEX</span>
            <Badge tone={hiDeclining ? "amber" : "green"}>{signed(hi.slope_per_mission, 2)}/mission</Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-telemetry-xl font-telemetry-xl text-on-surface font-bold">{fmt(hi.current)}</span>
            <span className="text-telemetry-sm font-telemetry-sm text-outline">/ 100</span>
            <span className={`ml-2 text-body-sm font-medium flex items-center ${hiDeclining ? "text-[#B45309]" : "text-[#15803D]"}`}>
              <span className="material-symbols-outlined text-sm">{hiDeclining ? "trending_down" : "trending_flat"}</span> {hiDeclining ? "Declining" : "Stable"}
            </span>
          </div>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
            {hiAccel ? "Accelerated downward delta over past 6 sorties." : hiDeclining ? "Steady downward drift across the selected sorties." : "Holding at baseline across the selected sorties."}
          </p>
        </div>
        <div className="mt-4 pt-2 border-t border-outline-variant/40">
          <div className="flex justify-between items-center text-telemetry-sm font-telemetry-sm text-outline mb-1">
            <span>{first}: {fmt(hi.first)}</span>
            <span className={hiDeclining ? "text-[#B45309] font-semibold" : "text-on-surface font-semibold"}>{last}: {fmt(hi.current)}</span>
          </div>
          <svg className="w-full h-11 overflow-visible" fill="none" viewBox="0 0 200 40">
            <line stroke="#E2E8F0" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="200" y1="6" y2="6" />
            <path d={hs.d} fill="none" stroke={hiDeclining ? "#F59E0B" : "#16A34A"} strokeLinecap="round" strokeWidth="2.5" />
            {hiAccel && accent.length > 1 && <polygon fill="#FEF3C7" opacity="0.6" points={`${accent.map(([x, y]) => `${x},${y}`).join(" ")} ${accent[accent.length - 1][0]},40 ${accent[0][0]},40`} />}
            {hs.pts.length > 0 && <circle cx={hs.pts[hs.pts.length - 1][0]} cy={hs.pts[hs.pts.length - 1][1]} fill={hiDeclining ? "#B45309" : "#16A34A"} r="3.5" stroke="#FFFFFF" strokeWidth="1.5" />}
          </svg>
        </div>
      </div>

      <div className={CARD}>
        <div>
          <div className="flex items-start justify-between">
            <span className="text-label-caps font-label-caps text-on-surface-variant">BSFC EFFICIENCY</span>
            <Badge tone={bsCreep ? "amber" : "green"}>{signed(bsPct, 1)}%</Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-telemetry-xl font-telemetry-xl text-on-surface font-bold">{fmt(bs.current)}</span>
            <span className="text-telemetry-sm font-telemetry-sm text-outline">g/kWh</span>
            <span className={`ml-2 text-body-sm font-medium flex items-center ${bsCreep ? "text-[#B45309]" : "text-[#15803D]"}`}>
              <span className="material-symbols-outlined text-sm">{bsCreep ? "trending_up" : "trending_flat"}</span> {bsCreep ? "Creep" : "Stable"}
            </span>
          </div>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">{bsCreep ? "Stable benchmark baseline with subtle upward creep." : "Fuel efficiency holding at the benchmark baseline."}</p>
        </div>
        <div className="mt-4 pt-2 border-t border-outline-variant/40">
          <div className="flex justify-between items-center text-telemetry-sm font-telemetry-sm text-outline mb-1">
            <span>{first}: {fmt(bs.first)} g</span>
            <span className={bsCreep ? "text-[#B45309] font-semibold" : "text-on-surface font-semibold"}>{last}: {fmt(bs.current)} g</span>
          </div>
          <svg className="w-full h-11 overflow-visible" fill="none" viewBox="0 0 200 40">
            <line stroke="#E2E8F0" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="200" y1="30" y2="30" />
            <path d={bss.d} fill="none" stroke={bsCreep ? "#F59E0B" : "#16A34A"} strokeLinecap="round" strokeWidth="2" />
            {bss.pts.length > 0 && <circle cx={bss.pts[bss.pts.length - 1][0]} cy={bss.pts[bss.pts.length - 1][1]} fill={bsCreep ? "#B45309" : "#16A34A"} r="3.5" stroke="#FFFFFF" strokeWidth="1.5" />}
          </svg>
        </div>
      </div>

      <div className={CARD}>
        <div>
          <div className="flex items-start justify-between">
            <span className="text-label-caps font-label-caps text-on-surface-variant">CHT MARGIN TO REDLINE</span>
            <Badge tone={(cm.slope_per_mission ?? 0) < -0.1 ? "orange" : "green"}>{signed(cm.slope_per_mission, 2)} °C/sortie</Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-telemetry-xl font-telemetry-xl font-bold ${cmWarn ? "text-[#C2410C]" : "text-on-surface"}`}>{signed(margin, 0)}</span>
            <span className="text-telemetry-sm font-telemetry-sm text-outline">°C margin</span>
            {prev != null && <span className="ml-2 text-telemetry-sm text-outline line-through">(prev {signed(prev, 0)} °C)</span>}
          </div>
          <p className={`text-body-sm font-body-sm mt-1 ${cmWarn ? "text-[#C2410C] font-medium" : "text-on-surface-variant"}`}>
            {margin != null && margin < crit ? "Critical: thermal reserve below the caution band." : cmWarn ? "Warning: Thermal reserve degrading rapidly." : "Thermal reserve within normal cruise margin."}
          </p>
        </div>
        <div className="mt-4 pt-2 border-t border-outline-variant/40">
          <div className="flex justify-between items-center text-telemetry-sm font-telemetry-sm text-outline mb-1">
            <span>Nominal: +{fmt(lim.cht_nominal_margin_k)}°C</span>
            <span className="text-[#EA580C] font-semibold">Critical: +{fmt(crit)}°C</span>
          </div>
          <svg className="w-full h-11 overflow-visible" fill="none" viewBox="0 0 200 40">
            <rect fill="#FEE2E2" height="10" opacity="0.6" width="200" x="0" y="30" />
            <line stroke="#DC2626" strokeDasharray="3 2" strokeWidth="1" x1="0" x2="200" y1="30" y2="30" />
            <path d={cms.d} fill="none" stroke={cmWarn ? "#EA580C" : "#16A34A"} strokeLinecap="round" strokeWidth="2.5" />
            {cms.pts.length > 0 && <circle cx={cms.pts[cms.pts.length - 1][0]} cy={cms.pts[cms.pts.length - 1][1]} fill={cmWarn ? "#EA580C" : "#16A34A"} r="3.5" stroke="#FFFFFF" strokeWidth="1.5" />}
          </svg>
        </div>
      </div>

      <div className={CARD}>
        <div>
          <div className="flex items-start justify-between">
            <span className="text-label-caps font-label-caps text-on-surface-variant">OIL CONSUMPTION PROXY</span>
            <Badge tone={oilOk ? "green" : "orange"}>{signed(oilDelta, 2)} L ({oilOk ? "Normal" : "High"})</Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-telemetry-xl font-telemetry-xl text-on-surface font-bold">{fmt(oil.current, 2)}</span>
            <span className="text-telemetry-sm font-telemetry-sm text-outline">L / 10h</span>
            <span className={`ml-2 text-body-sm font-medium flex items-center ${oilOk ? "text-[#15803D]" : "text-[#C2410C]"}`}>
              <span className="material-symbols-outlined text-sm">{oilOk ? "check_circle" : "error"}</span> {oilOk ? "Compliant" : "Exceeds limit"}
            </span>
          </div>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">{oilOk ? "Well within the ring/guide wear consumption limit." : "Oil burn above the wear limit — inspect rings and valve guides."}</p>
        </div>
        <div className="mt-4 pt-2 border-t border-outline-variant/40">
          <div className="flex justify-between items-center text-telemetry-sm font-telemetry-sm text-outline mb-1">
            <span>Wear Limit: {fmt(lim.oil_limit_l_per_10h, 2)} L</span>
            <span className={`${oilOk ? "text-[#15803D]" : "text-[#C2410C]"} font-semibold`}>Current: {fmt(oil.current, 2)} L</span>
          </div>
          <svg className="w-full h-11 overflow-visible" fill="none" viewBox="0 0 200 40">
            <line stroke="#DC2626" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="200" y1="6" y2="6" />
            <path d={os.d} fill="none" stroke={oilOk ? "#16A34A" : "#EA580C"} strokeLinecap="round" strokeWidth="2" />
            {os.pts.length > 0 && <circle cx={os.pts[os.pts.length - 1][0]} cy={os.pts[os.pts.length - 1][1]} fill={oilOk ? "#16A34A" : "#EA580C"} r="3.5" stroke="#FFFFFF" strokeWidth="1.5" />}
          </svg>
        </div>
      </div>
    </>
  );
}

function Badge({ tone, children }: { tone: "amber" | "orange" | "green"; children: React.ReactNode }) {
  const [box, dot] = tone === "amber" ? [BADGE.amber, BADGE.amberDot] : tone === "orange" ? [BADGE.orange, BADGE.orangeDot] : [BADGE.green, BADGE.greenDot];
  return (
    <span className={`rounded-full px-2 py-0.5 text-telemetry-sm font-telemetry-sm font-semibold flex items-center gap-1 ${box}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} /> {children}
    </span>
  );
}

/* ---------------------------------------------------------------- fleet table */
function FleetTable({ fleet }: { fleet: any }) {
  const rows: any[] = [...(fleet?.rows ?? [])].sort((a, b) => (a.is_current === b.is_current ? a.tail_id.localeCompare(b.tail_id) : a.is_current ? -1 : 1));
  return (
    <section aria-labelledby="fleet-table-heading" className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)] overflow-hidden">
      <div className="px-space-md py-3 border-b border-outline-variant flex flex-wrap items-center justify-between gap-space-sm bg-surface-container/30">
        <div className="flex items-center gap-space-sm">
          <h2 className="text-headline-md font-headline-md text-on-surface" id="fleet-table-heading">MALE Squadron Fleet Status</h2>
          <span className="text-telemetry-sm font-telemetry-sm bg-surface-container-highest px-2 py-0.5 rounded text-on-surface font-semibold">{fleet?.units_online ?? "--"} Units Online</span>
        </div>
        <div className="flex items-center gap-space-md text-telemetry-sm font-telemetry-sm text-on-surface-variant">
          <span>Sort by: <strong className="text-on-surface">UAV Identifier</strong></span>
          <span className="h-3 w-px bg-outline-variant" />
          <span>RUL Model: <strong className="text-on-surface">{fleet?.rul_model ?? "--"}</strong></span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="h-8 bg-surface-container-low border-b border-outline-variant/80 text-label-caps font-label-caps text-on-surface-variant select-none">
              {["UAV ID", "ENGINE SERIAL", "TOTAL HOURS", "HEALTH INDEX", "RUL", "LAST MISSION", "STATUS", "NEXT MAINTENANCE"].map((h) => (
                <th key={h} className={`px-space-md py-1.5 font-semibold ${h === "TOTAL HOURS" || h === "RUL" ? "text-right" : ""}`} scope="col">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30 text-body-md font-body-md">
            {rows.map((r, i) => {
              const hi = r.health_index ?? 0;
              const bar = hi >= 90 ? "bg-[#16A34A]" : hi >= 80 ? "bg-[#F59E0B]" : "bg-[#EA580C]";
              const [chip, dot] = STATUS_CHIP[r.status] ?? STATUS_CHIP.WATCH;
              const nm = r.next_maintenance;
              const due = nm ? (nm.due_in_hours < 0 ? `Overdue ${fmt(-nm.due_in_hours)} hrs` : `In ${fmt(nm.due_in_hours)} hrs`) : "--";
              const attention = r.status !== "MISSION READY";
              const serial = `${r.engine_class.replace("-class", "")} · SN ${r.engine_serial}`;
              const rul = r.rul_hours == null ? "--" : r.rul_hours >= 2000 - 1e-6 ? "2,000+ hrs" : `${fmt(r.rul_hours)} hrs`;
              return r.is_current ? (
                <tr key={r.tail_id} className="h-9 hover:bg-[#EEF4FF] transition-colors bg-primary-fixed/20 border-l-4 border-l-primary font-medium">
                  <td className="px-space-md py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-secondary" />
                      <span className="font-telemetry-md font-bold text-primary">{r.tail_id}</span>
                      <span className="text-[10px] bg-primary text-on-primary font-telemetry-sm px-1.5 rounded">CURRENT</span>
                    </div>
                  </td>
                  <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">{serial}</td>
                  <td className="px-space-md py-2 whitespace-nowrap text-right font-telemetry-sm text-on-surface">{fmt(r.total_hours)} hrs</td>
                  <td className="px-space-md py-2 whitespace-nowrap"><HealthBar hi={hi} bar={bar} /></td>
                  <td className="px-space-md py-2 whitespace-nowrap text-right font-telemetry-sm font-semibold text-on-surface">{rul}</td>
                  <td className="px-space-md py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-telemetry-sm">
                      <span className="font-semibold text-primary">{r.last_mission?.sortie_label ?? "--"}</span>
                      {r.last_mission?.active ? <span className="text-secondary font-bold">(Active Now)</span> : <span className="text-on-surface-variant">({ago(r.last_mission?.ended_at)})</span>}
                    </div>
                  </td>
                  <td className="px-space-md py-2 whitespace-nowrap"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-telemetry-sm font-telemetry-sm font-semibold ${chip}`}><span className={`w-1.5 h-1.5 rounded-full ${dot}`} /> {r.status}</span></td>
                  <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm">
                    <span className={attention ? "text-[#B45309] font-semibold" : "text-on-surface-variant"}>{due}</span>
                    {attention && nm && <span className="text-outline text-body-sm"> ({nm.title})</span>}
                  </td>
                </tr>
              ) : (
                <tr key={r.tail_id} className={`h-9 hover:bg-[#EEF4FF] transition-colors ${i % 2 ? "bg-[#F8FAFC]" : "bg-surface-container-lowest"}`}>
                  <td className="px-space-md py-2 whitespace-nowrap font-telemetry-md font-semibold text-on-surface">{r.tail_id}</td>
                  <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">{serial}</td>
                  <td className="px-space-md py-2 whitespace-nowrap text-right font-telemetry-sm text-on-surface">{fmt(r.total_hours)} hrs</td>
                  <td className="px-space-md py-2 whitespace-nowrap"><HealthBar hi={hi} bar={bar} warn={hi < 80} /></td>
                  <td className={`px-space-md py-2 whitespace-nowrap text-right font-telemetry-sm font-semibold ${r.rul_hours != null && r.rul_hours < 150 ? "text-[#C2410C]" : "text-on-surface"}`}>{rul}</td>
                  <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">{r.last_mission ? `${r.last_mission.name} (${r.last_mission.active ? "Active Now" : ago(r.last_mission.ended_at)})` : "--"}</td>
                  <td className="px-space-md py-2 whitespace-nowrap"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-telemetry-sm font-telemetry-sm font-semibold ${chip}`}><span className={`w-1.5 h-1.5 rounded-full ${dot}`} /> {r.status}</span></td>
                  <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm">
                    <span className={attention ? (r.status === "MAINTENANCE REQ" ? "text-[#C2410C] font-semibold" : "text-[#B45309] font-semibold") : "text-on-surface-variant"}>{due}</span>
                    {attention && nm && <span className="text-outline text-body-sm"> ({nm.title})</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HealthBar({ hi, bar, warn = false }: { hi: number; bar: string; warn?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 bg-surface-container rounded-full h-2 overflow-hidden border border-outline-variant/50">
        <div className={`${bar} h-full rounded-full`} style={{ width: `${hi}%` }} />
      </div>
      <span className={`font-telemetry-sm font-semibold ${warn ? "text-[#C2410C]" : "text-on-surface"}`}>{fmt(hi)}/100</span>
    </div>
  );
}

/* ---------------------------------------------------------------- heatmap */
function cell(v: number | null) {
  if (v == null) return "bg-surface-container text-on-surface-variant";
  if (v >= 95) return "bg-[#15803D] text-white";
  if (v >= 80) return "bg-[#86EFAC] text-[#131b2e] font-semibold";
  if (v >= 70) return "bg-[#F59E0B] text-white font-bold shadow-xs ring-1 ring-[#EA580C]";
  return "bg-[#DC2626] text-white font-bold shadow-xs ring-2 ring-[#DC2626]";
}

function Heatmap({ t, benchmark, engine }: { t: any; benchmark: string; engine: string }) {
  const navigate = useNavigate();
  const labels: string[] = t.missions.map((m: any) => m.label);
  const n = labels.length;
  const corr = t.correlation;
  const degraded = new Set((corr?.degraded ?? []).map((d: any) => d.key));
  const hotFrom = corr ? labels.indexOf(corr.from_label) : -1;
  const cols = `grid-cols-[140px_repeat(${Math.max(n, 1)},_minmax(0,_1fr))]`;
  const gridStyle = { gridTemplateColumns: `140px repeat(${Math.max(n, 1)}, minmax(0, 1fr))` };
  const top = corr?.degraded?.[0];
  return (
    <section aria-labelledby="heatmap-heading" className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)]">
      <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-md pb-space-sm border-b border-outline-variant/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-headline-md font-headline-md text-on-surface" id="heatmap-heading">Subsystem Health Matrix Across Sorties</h2>
            <span className="text-telemetry-sm font-telemetry-sm px-2 py-0.5 rounded bg-surface-container font-semibold text-on-surface">{benchmark === "FLEET MEAN" ? `${engine} Fleet Mean` : `${benchmark} ${engine}`}</span>
          </div>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">Chronological component telemetry score mapped across the last {n} flight mission profiles.</p>
        </div>
        <div className="flex items-center gap-space-md text-telemetry-sm font-telemetry-sm">
          <span className="text-label-caps font-label-caps text-on-surface-variant">LEGEND:</span>
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-xs bg-[#15803D]" /><span className="text-on-surface">95–100 (Nominal)</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-xs bg-[#86EFAC] border border-[#16A34A]/40" /><span className="text-on-surface">80–94 (Stable)</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-xs bg-[#F59E0B]" /><span className="text-on-surface">70–79 (Degraded)</span></div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[840px]">
          <div className={`grid ${cols} gap-1 items-center pb-2 text-center text-telemetry-sm font-telemetry-sm text-on-surface-variant font-semibold border-b border-outline-variant/40`} style={gridStyle}>
            <div className="text-left pl-2 text-label-caps font-label-caps">SUBSYSTEM</div>
            {labels.map((l, i) => (
              <div key={l} className={hotFrom >= 0 && i >= hotFrom ? (i === n - 1 ? "text-[#DC2626] font-bold bg-error-container rounded" : "text-tertiary font-bold bg-tertiary-fixed/40 rounded") : ""}>{l}</div>
            ))}
          </div>
          <div className="divide-y divide-outline-variant/20 pt-1">
            {t.heatmap.map((row: any) => {
              const alert = degraded.has(row.key);
              return (
                <div key={row.key} className={`grid ${cols} gap-1 py-1.5 items-center rounded ${alert ? "bg-[#FEF3C7]/20 hover:bg-[#FEF3C7]/40 border-l-2 border-[#EA580C]" : "hover:bg-surface-container/40"}`} style={gridStyle}>
                  <div className={`font-telemetry-sm text-telemetry-sm pl-2 flex items-center justify-between pr-2 ${alert ? "font-bold text-[#B45309]" : "font-semibold text-on-surface"}`}>
                    <span className="flex items-center gap-1">{alert && <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] animate-pulse" />} {row.label}</span>
                    <span className={`text-[10px] ${alert ? "text-tertiary font-bold" : "text-outline"}`}>{alert ? `${fmt(row.latest)} alert` : `${fmt(row.average)} avg`}</span>
                  </div>
                  {row.values.map((v: number | null, i: number) => (
                    <div key={i} className={`h-7 rounded text-[10px] flex items-center justify-center font-telemetry-sm ${cell(v)}`} title={`${labels[i]} (${t.missions[i]?.sortie_label ?? ""}): ${fmt(v)}`}>{fmt(v)}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-space-md p-space-sm bg-surface-container/40 border border-outline-variant/60 rounded flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined ${corr ? "text-[#EA580C]" : "text-[#16A34A]"}`}>{corr ? "warning" : "check_circle"}</span>
          <span className="text-body-sm font-body-sm text-on-surface">
            <strong className="font-semibold text-on-surface">Automated Anomaly Correlation:</strong>{" "}
            {corr ? (
              <>
                {benchmark === "FLEET MEAN" ? "The fleet" : benchmark} shows steady degradation localized {corr.degraded.length === 1 ? "solely " : ""}to the{" "}
                <strong>{corr.degraded.map((d: any) => d.label).join(" & ")} Subsystem{corr.degraded.length > 1 ? "s" : ""}</strong> across {corr.from_label} through {corr.to_label}.
                {corr.stable.length ? ` ${corr.stable.slice(0, 2).map((s: any) => s.label).join(" and ")} subsystems remain at >95% operational baseline.` : ""}
              </>
            ) : (
              "No subsystem shows a sustained degradation trend across the selected sorties."
            )}
          </span>
        </div>
        {top && (
          <button onClick={() => navigate("/diagnostics")} className="px-2.5 py-1 bg-surface-container-lowest text-primary border border-outline-variant rounded text-telemetry-sm font-semibold hover:bg-surface-container transition-colors shrink-0" type="button">
            Open {top.label} Diagnostics
          </button>
        )}
      </div>
    </section>
  );
}
