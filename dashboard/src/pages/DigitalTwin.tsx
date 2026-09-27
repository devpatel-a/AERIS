/* Stitch screen "AeroTwin — Screen 2: Digital Twin (Hero)", bound to the live twin. */
import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import EngineScene, { type AnchorKey, type Tool, type ViewPreset } from "../components/twin/EngineScene";
import { NoLiveSession } from "../components/stitch/NoLiveSession";
import { API_BASE, request } from "../lib/api";
import { getToken } from "../lib/authToken";
import { useEngineConfig, type EngineConfigView } from "../lib/useEngineConfig";
import { useLiveSocket, type LiveRow } from "../lib/useLiveSocket";
import { usePoll } from "../lib/usePoll";
import { fmt, fmtHms, kgsToLph, kpaToBar, kpaToInHg, kToC, signed } from "../lib/units";

const CHANNEL_TABS = [
  { key: "cht", label: "CHT", unit: "°C" },
  { key: "egt", label: "EGT", unit: "°C" },
  { key: "oil_temp", label: "Oil Temp", unit: "°C" },
  { key: "oil_press", label: "Oil Press", unit: "bar" },
  { key: "rpm", label: "RPM", unit: "rpm" },
  { key: "fuel", label: "Fuel Flow", unit: "L/h" },
] as const;
type TabKey = (typeof CHANNEL_TABS)[number]["key"];

export default function DigitalTwin() {
  const { latest } = useLiveSocket();
  const cfg = useEngineConfig(latest?.context?.engine_id);
  if (!latest || latest.mode !== "LIVE" || !cfg) return <NoLiveSession screen="Digital Twin" />;
  return <TwinScreen row={latest} cfg={cfg} />;
}

function defaultCylinder(row: LiveRow): number {
  const cyls: any[] = row.cylinders ?? [];
  const flagged = cyls.filter((c) => c.status !== "NORMAL");
  const pool = flagged.length ? flagged : cyls;
  return pool.reduce((best, c) => ((c.cht_residual_k ?? -1e9) > (best?.cht_residual_k ?? -1e9) ? c : best), pool[0])?.cylinder ?? 1;
}

function TwinScreen({ row, cfg }: { row: LiveRow; cfg: EngineConfigView }) {
  const [params] = useSearchParams();
  const [picked, setPicked] = useState<number | null>(params.get("cyl") ? Number(params.get("cyl")) : null);
  const selected = picked ?? defaultCylinder(row);
  return (
    <main className="icon-base-18 flex-1 grid grid-cols-12 gap-space-md p-space-md overflow-hidden bg-background min-h-0">
      <section className="col-span-8 flex flex-col gap-space-md h-full overflow-hidden min-h-0">
        <Viewport row={row} cfg={cfg} selected={selected} onSelect={setPicked} />
        <ChannelChart row={row} cfg={cfg} cylinder={selected} />
      </section>
      <aside className="col-span-4 flex flex-col gap-space-md h-full overflow-y-auto pr-1 min-h-0">
        <ObservedVsTwin row={row} cfg={cfg} cylinder={selected} />
        <HealthParameters />
        <Attribution row={row} />
        <AssemblyCard cylinder={selected} row={row} />
      </aside>
    </main>
  );
}

/* ---------------------------------------------------------------- 3D viewport */
const LAYERS = ["heatmap", "airflow", "xray", "vibration"] as const;
type Layer = (typeof LAYERS)[number];
const LAYER_LABEL: Record<Layer, string> = { heatmap: "Heat Map (Thermal)", airflow: "Airflow Particles", xray: "X-Ray Cutaway", vibration: "Vibration Dynamics" };

function Viewport({ row, cfg, selected, onSelect }: { row: LiveRow; cfg: EngineConfigView; selected: number; onSelect: (c: number) => void }) {
  const navigate = useNavigate();
  const { syncLatencyMs } = useLiveSocket();
  const [view, setView] = useState<ViewPreset>("iso");
  const [tool, setTool] = useState<Tool>("rotate");
  const [zoomTick, setZoomTick] = useState(0);
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ heatmap: true, airflow: false, xray: false, vibration: false });
  const [exploded, setExploded] = useState(0);
  const anchorEls = useRef<Partial<Record<AnchorKey, HTMLElement | null>>>({});
  const cyls: any[] = row.cylinders ?? [];
  const chtC = cyls.map((c) => kToC(c.cht_k));
  const sel = cyls.find((c) => c.cylinder === selected);
  const m = row.measured ?? {};
  const ds = row.degradation_state ?? {};
  const cooling: number = ds.cooling_effectiveness ?? 1;
  const turboEff = (cfg.turbo as any).turbo_efficiency_nominal * (ds.turbo_efficiency ?? 1);
  const caution = kToC(cfg.limits.cht_caution_k ?? null);
  const g = (cfg as any).geometry ?? {};
  const history = usePoll(() => request<any>(`/api/twin/assembly/${selected}`), 3000, [selected]).data;
  const spark = history?.divergence;

  const callout = (k: AnchorKey) => (el: HTMLDivElement | null) => {
    anchorEls.current[k] = el;
  };
  const statusColors = (st: string) =>
    st === "NORMAL"
      ? { dot: "bg-emerald-500 ring-emerald-500/20", border: "border-emerald-300", text: "text-emerald-700" }
      : { dot: "bg-amber-500 ring-amber-500/20", border: "border-amber-300", text: "text-amber-700" };

  return (
    <div className="relative flex-1 min-h-0 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-10 px-space-md flex items-center justify-between z-10 bg-surface-container-lowest/85 backdrop-blur-sm border-b border-outline-variant/40">
        <div className="flex items-center gap-3">
          <span className="text-label-caps font-label-caps text-on-surface font-bold text-[11px] tracking-wider uppercase">
            {(cfg as any).monitor_label || cfg.short_name} {g.layout === "boxer" ? "Boxer " : ""}Engine · 3D Physical Twin Representation
          </span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-telemetry-sm text-[10px] font-semibold border border-primary/20">
            PARAMETRIC MODEL {g.bore_m ? `${fmt(g.bore_m * 1000, 0)}×${fmt(g.stroke_m * 1000, 1)} MM` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-telemetry-sm font-telemetry-sm text-outline text-[11px]">FOV: 45° · Perspective Grid</span>
        </div>
      </div>

      <div className="absolute top-12 right-space-md z-40 flex flex-col gap-2">
        <div className="bg-white/90 backdrop-blur-md p-1 rounded-lg border border-outline-variant shadow-md flex items-center gap-1">
          <ToolButton icon="3d_rotation" title="Rotate View" active={tool === "rotate"} onClick={() => setTool("rotate")} />
          <ToolButton icon="pan_tool" title="Pan Scene" active={tool === "pan"} onClick={() => setTool("pan")} />
          <ToolButton icon="zoom_in" title="Zoom Engine" active={false} onClick={() => setZoomTick((z) => z + 1)} />
          <div className="w-px h-4 bg-outline-variant" />
          {(["iso", "top", "front", "side"] as ViewPreset[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-2 py-1 text-[11px] font-telemetry-sm rounded hover:bg-surface-container ${view === v ? "font-semibold text-on-surface" : "text-outline"}`}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-lg border border-outline-variant shadow-md flex flex-col gap-1 w-44">
          <span className="text-[9px] font-label-caps text-outline uppercase px-1">Twin Diagnostic Layers</span>
          {LAYERS.map((l) =>
            layers[l] ? (
              <button key={l} onClick={() => setLayers((s) => ({ ...s, [l]: false }))} className="flex items-center justify-between px-2 py-1 rounded text-[11px] font-medium bg-primary text-white shadow-xs">
                <span>{LAYER_LABEL[l]}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </button>
            ) : (
              <button key={l} onClick={() => setLayers((s) => ({ ...s, [l]: true }))} className="flex items-center justify-between px-2 py-1 rounded text-[11px] font-medium text-on-surface hover:bg-surface-container">
                <span>{LAYER_LABEL[l]}</span>
                <span className="text-outline text-[10px]">Off</span>
              </button>
            ),
          )}
          <button onClick={() => setExploded((e) => (e >= 1 ? 0 : e + 0.5))} className={`flex items-center justify-between px-2 py-1 rounded text-[11px] font-medium ${exploded > 0 ? "bg-primary text-white shadow-xs" : "text-on-surface hover:bg-surface-container"}`}>
            <span>Exploded View</span>
            <span className={`text-[10px] ${exploded > 0 ? "text-white" : "text-outline"}`}>{fmt(exploded * 100)}%</span>
          </button>
        </div>
      </div>

      <div className="relative flex-1 w-full h-full blueprint-grid select-none overflow-hidden">
        <EngineScene
          chtC={chtC} rpm={m.rpm ?? 0} airspeedMps={row.context?.airspeed_mps ?? 0} vibIps={row.vibration_ips_rms ?? 0}
          heatmap={layers.heatmap} airflow={layers.airflow} xray={layers.xray} vibration={layers.vibration} exploded={exploded}
          view={view} tool={tool} zoomTick={zoomTick} gearRatio={(g.gear_ratio as number) ?? 2.43} anchorEls={anchorEls} onSelectCylinder={onSelect}
        />
        {cyls.filter((c) => c.cylinder !== selected).map((c) => {
          const s = statusColors(c.status);
          return (
            <div key={c.cylinder} ref={callout(`cyl${c.cylinder}` as AnchorKey)} onClick={() => onSelect(c.cylinder)} className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 cursor-pointer group z-10">
              <span className={`w-3 h-3 rounded-full ${s.dot} border-2 border-white shadow ring-2 group-hover:scale-125 transition-transform`} />
              <div className={`px-2 py-0.5 rounded bg-white/95 border ${s.border} shadow-xs flex items-center gap-1`}>
                <span className="text-[10px] font-bold font-body-md text-slate-700">CYL {c.cylinder}</span>
                <span className={`text-telemetry-sm font-telemetry-sm font-semibold ${s.text}`}>{fmt(kToC(c.cht_k))}°C</span>
              </div>
            </div>
          );
        })}
        {sel && (
          <div ref={callout(`cyl${selected}` as AnchorKey)} className="absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <span className={`block w-3 h-3 rounded-full border-2 border-white shadow ring-4 ${sel.status !== "NORMAL" ? "bg-amber-500 ring-amber-500/30" : "bg-emerald-500 ring-emerald-500/20"}`} />
          </div>
        )}
        {sel && (
          <div className="absolute top-[12%] left-[49%] -translate-x-1/2 z-30">
            <div className="flex items-center gap-2 mb-1">
              <div className="relative">
                {sel.status !== "NORMAL" && <span className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow ring-4 ring-amber-500/30 animate-ping absolute inset-0" />}
                <span className={`relative w-4 h-4 rounded-full ${sel.status !== "NORMAL" ? "bg-amber-500" : "bg-emerald-500"} border-2 border-white shadow flex items-center justify-center text-white text-[9px] font-bold`}>{selected}</span>
              </div>
              <div className={`px-2 py-0.5 rounded border text-telemetry-sm font-telemetry-sm font-bold flex items-center gap-1 ${sel.status !== "NORMAL" ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-emerald-50 border-emerald-300 text-emerald-900"}`}>
                <span>CYL {selected} CHT: {fmt(kToC(sel.cht_k))}°C</span>
                <span className={`text-[10px] ${sel.status !== "NORMAL" ? "text-amber-700" : "text-emerald-700"}`}>({sel.status})</span>
              </div>
            </div>
            <div className={`w-64 bg-white/95 backdrop-blur-md rounded-lg border shadow-xl p-3 text-on-surface ${sel.status !== "NORMAL" ? "border-amber-200" : "border-outline-variant"}`}>
              <div className="flex items-center justify-between border-b border-outline-variant/40 pb-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${sel.status !== "NORMAL" ? "bg-amber-500" : "bg-emerald-500"}`} />
                  <span className="text-[11px] font-headline-sm font-bold text-slate-900">Cylinder {selected} Head Thermals</span>
                </div>
                <span className={`text-telemetry-sm font-telemetry-sm font-bold px-1.5 py-0.2 rounded ${sel.status !== "NORMAL" ? "text-amber-700 bg-amber-100" : "text-slate-600 bg-slate-100"}`}>Δ {signed(sel.cht_residual_k, 1)}°C</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] mb-2 font-telemetry-sm">
                <Field label="Observed CHT" value={`${fmt(kToC(sel.cht_k))}°C`} className="text-slate-900 font-bold text-[13px]" />
                <Field label="Twin Expected" value={`${fmt(kToC(sel.expected_cht_k))}°C`} className="text-slate-600 font-semibold text-[13px]" />
                <Field label="EGT Exhaust" value={`${fmt(kToC(sel.egt_k))}°C`} className="text-slate-900 font-semibold" />
                <Field label="Assembly Health" value={`${fmt(sel.assembly_health)} / 100`} className={`font-bold ${sel.assembly_health < 85 ? "text-amber-700" : "text-emerald-700"}`} />
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-[9px] text-outline mb-0.5">
                  <span>T-5m</span>
                  <span className={`font-semibold ${sel.status !== "NORMAL" ? "text-amber-700" : "text-slate-500"}`}>{sel.status !== "NORMAL" ? "Thermal divergence" : "Tracking twin"}</span>
                  <span>Now</span>
                </div>
                <MiniDivergence measured={spark?.measured ?? []} expected={spark?.expected ?? []} alert={sel.status !== "NORMAL"} />
              </div>
              <button onClick={() => navigate("/diagnostics")} className="w-full py-1 text-center bg-primary/10 hover:bg-primary text-primary hover:text-white rounded text-[11px] font-semibold transition-colors flex items-center justify-center gap-1">
                <span>Open Diagnostics</span>
                <span className="text-sm leading-none">→</span>
              </button>
            </div>
          </div>
        )}
        <Component anchorRef={callout("turbo")} label="Turbo:" value={`${fmt(turboEff * 100)}% eff`} warn={(ds.turbo_efficiency ?? 1) < 0.95} />
        <Component anchorRef={callout("sump")} label="Sump:" value={`${fmt(kToC(m.oil_temp_k))}°C · ${fmt(kpaToBar(m.oil_pressure_kpa), 1)} bar`} warn={false} />
        <Component anchorRef={callout("radiator")} label="Radiator:" value={`${fmt(cooling, 2)} eff`} warn={cooling < 0.95} />
        <Component anchorRef={callout("alternator")} label="Alt:" value={`${fmt(m.alternator_voltage_v, 1)} V`} warn={false} />
        <Component anchorRef={callout("vib")} label="Vib:" value={`${fmt(row.vibration_ips_rms, 2)} ips RMS`} warn={false} />
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-outline-variant shadow-md flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary animate-spin-slow">rotate_right</span>
          <div className="flex flex-col">
            <span className="text-[9px] font-label-caps text-outline uppercase leading-none">Crankshaft Speed</span>
            <span className="text-telemetry-md font-telemetry-md font-bold text-slate-900">
              {fmt(m.rpm)} <span className="text-xs font-normal text-slate-500">RPM</span>
            </span>
          </div>
        </div>
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-outline-variant shadow-md flex items-center gap-2">
          <span className="text-[10px] font-label-caps text-outline uppercase font-semibold">CHT Heatmap</span>
          <div className="w-36 h-2 rounded bg-gradient-to-r from-sky-400 via-emerald-500 via-amber-400 to-rose-600" />
          <div className="flex items-center gap-2 text-[10px] font-telemetry-sm text-slate-600">
            <span>80°C</span>
            <span>110°C</span>
            <span className="text-amber-700 font-bold">{fmt(caution ?? 125)}°C</span>
            <span>145°C</span>
          </div>
        </div>
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-outline-variant shadow-md flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-telemetry-sm font-telemetry-sm text-slate-700">
            Synced with live telemetry · <span className="font-bold text-slate-900">latency {syncLatencyMs == null ? "--" : fmt(syncLatencyMs)} ms</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function ToolButton({ icon, title, active, onClick }: { icon: string; title: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} className={`p-1.5 rounded hover:bg-surface-container hover:text-primary transition-colors ${active ? "text-primary bg-surface-container" : "text-on-surface-variant"}`}>
      <span className="material-symbols-outlined">{icon}</span>
    </button>
  );
}

function Field({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div>
      <span className="text-outline text-[10px] block font-body-md">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}

function Component({ anchorRef, label, value, warn }: { anchorRef: (el: HTMLDivElement | null) => void; label: string; value: string; warn: boolean }) {
  return (
    <div ref={anchorRef} className="absolute flex items-center gap-1.5 cursor-default group -translate-y-1/2 z-10">
      <span className={`w-2.5 h-2.5 rounded-full ${warn ? "bg-amber-500" : "bg-emerald-500"} border-2 border-white shadow group-hover:scale-125 transition-transform`} />
      <div className={`px-2 py-0.5 rounded bg-white/95 border ${warn ? "border-amber-300" : "border-outline-variant"} shadow-xs`}>
        <span className="text-[10px] font-body-md text-slate-700">{label}</span>{" "}
        <span className={`text-telemetry-sm font-telemetry-sm font-semibold ${warn ? "text-amber-700" : "text-slate-900"}`}>{value}</span>
      </div>
    </div>
  );
}

function MiniDivergence({ measured, expected, alert }: { measured: (number | null)[]; expected: (number | null)[]; alert: boolean }) {
  const all = [...measured, ...expected].filter((x): x is number => x != null);
  const lo = all.length ? Math.min(...all) : 0;
  const hi = all.length ? Math.max(...all) : 1;
  const span = hi - lo || 1;
  const pts = (arr: (number | null)[]) =>
    arr.map((y, i) => (y == null ? null : `${((i / Math.max(arr.length - 1, 1)) * 100).toFixed(1)},${(21 - ((y - lo) / span) * 18).toFixed(1)}`)).filter(Boolean).join(" ");
  return (
    <svg className="w-full h-7 bg-surface-container-low rounded border border-outline-variant/40" preserveAspectRatio="none" viewBox="0 0 100 24">
      <polyline fill="none" points={pts(expected)} stroke="#94A3B8" strokeDasharray="2 2" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <polyline fill="none" points={pts(measured)} stroke={alert ? "#EA580C" : "#1E5EFF"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ---------------------------------------------------------------- channel chart */
function channelFor(tab: TabKey, cyl: number): string {
  return { cht: `cht_${cyl}_k`, egt: `egt_${cyl}_k`, oil_temp: "oil_temp_k", oil_press: "oil_pressure_kpa", rpm: "rpm", fuel: "fuel_flow_kg_s" }[tab];
}

function ChannelChart({ row, cfg, cylinder }: { row: LiveRow; cfg: EngineConfigView; cylinder: number }) {
  const [tab, setTab] = useState<TabKey>("cht");
  const channel = channelFor(tab, cylinder);
  const { data } = usePoll(() => request<any>(`/api/twin/history?channel=${channel}&window_s=600&max_points=160`), 2000, [channel]);
  const conv = (v: number | null) => {
    if (v == null) return null;
    if (tab === "cht" || tab === "egt" || tab === "oil_temp") return kToC(v);
    if (tab === "oil_press") return kpaToBar(v);
    if (tab === "fuel") return kgsToLph(v, cfg.fuel.density_kg_per_l);
    return v;
  };
  const unit = CHANNEL_TABS.find((t) => t.key === tab)!.unit;
  const label = tab === "cht" ? `Observed CHT Cyl ${cylinder} (Sensor)` : `Observed ${CHANNEL_TABS.find((t) => t.key === tab)!.label} (Sensor)`;

  const series = useMemo(() => {
    if (!data) return null;
    const t: number[] = data.t_s;
    const meas = (data.measured as (number | null)[]).map(conv);
    const exp = (data.expected as (number | null)[]).map(conv);
    const lo = (data.ci_low as (number | null)[]).map(conv);
    const hi = (data.ci_high as (number | null)[]).map(conv);
    const vals = [...meas, ...exp, ...lo, ...hi].filter((x): x is number => x != null);
    if (!vals.length || t.length < 2) return null;
    let min = Math.min(...vals), max = Math.max(...vals);
    const pad = (max - min) * 0.15 || 1;
    min -= pad;
    max += pad;
    const x = (i: number) => 40 + ((t[i] - t[0]) / (t[t.length - 1] - t[0] || 1)) * 640;
    const y = (v: number) => 78 - ((v - min) / (max - min)) * 74;
    const line = (arr: (number | null)[]) => arr.map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean).join(" ");
    const band = [...hi.map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)), ...lo.map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).reverse()].filter(Boolean).join(" ");
    const ticks = [max - (max - min) * 0.05, (max + min) / 2, min + (max - min) * 0.05];
    const last = meas.length - 1;
    return { t, x, y, line, band, meas, exp, ticks, last, min, max };
  }, [data, tab]);

  // Drift window: from the active fault's first detection (sim time) to now.
  const matrix: any[] = row.fault_matrix ?? [];
  const active = matrix.find((f) => f.state === "ACTIVE");
  const onset: number | null = active?.first_detected_t ?? null;
  const score = row.anomaly_score;
  const scores = usePoll(() => request<any>(`/api/twin/history?channel=${channel}&window_s=600&max_points=24`), 2000, [channel]).data?.anomaly_score ?? [];
  const onsetIdx = series && onset != null ? series.t.findIndex((tt) => tt >= onset) : -1;
  const alert = series != null && onset != null && onset >= series.t[0] && onsetIdx >= 0;
  const onsetX = alert ? series!.x(onsetIdx) : null;

  return (
    <div className="h-56 bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-sm flex flex-col shrink-0">
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2 mb-2">
        <div className="flex items-center gap-1">
          {CHANNEL_TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-2.5 py-1 rounded text-[11px] font-telemetry-sm ${tab === t.key ? "font-semibold bg-primary text-white shadow-xs" : "text-on-surface-variant hover:bg-surface-container"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-1 bg-primary-container rounded" /><span className="font-body-md text-slate-700 text-[11px]">{label}</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-1 border-t-2 border-dashed border-slate-400" /><span className="font-body-md text-slate-700 text-[11px]">Digital Twin Expected</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-2 bg-primary/15 rounded" /><span className="font-body-md text-slate-500 text-[11px]">95% CI Band</span></div>
          <span className="text-telemetry-sm font-telemetry-sm text-outline">Window: T-10m to Now</span>
        </div>
      </div>
      <div className="flex-1 w-full grid grid-rows-4 gap-1 relative min-h-0">
        <div className="row-span-3 relative w-full h-full">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9px] font-telemetry-sm text-slate-400">
            {(series?.ticks ?? [null, null, null]).map((v, i) => (
              <div key={i} className="border-b border-dashed border-outline-variant/40 flex justify-between pr-2">
                <span>{v == null ? "" : `${fmt(v, unit === "bar" || unit === "L/h" ? 1 : 0)}${unit === "°C" ? "°C" : ` ${unit}`}`}</span>
                <span />
              </div>
            ))}
          </div>
          {series && (
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 700 80">
              <polygon fill="#1E5EFF" fillOpacity="0.12" points={series.band} />
              <polyline fill="none" points={series.line(series.exp)} stroke="#64748B" strokeDasharray="4 3" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
              {onsetX != null && (
                <>
                  <rect fill="#FEF3C7" fillOpacity="0.4" height="80" width={680 - onsetX} x={onsetX} y="0" />
                  <line stroke="#F59E0B" strokeDasharray="2 2" strokeWidth="1.5" x1={onsetX} x2={onsetX} y1="0" y2="80" vectorEffect="non-scaling-stroke" />
                </>
              )}
              <polyline fill="none" points={series.line(series.meas)} stroke="#1E5EFF" strokeLinecap="round" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
              {series.meas[series.last] != null && (
                <circle cx={series.x(series.last)} cy={series.y(series.meas[series.last]!)} fill={alert ? "#EA580C" : "#1E5EFF"} r="4" stroke="#FFFFFF" strokeWidth="2" />
              )}
            </svg>
          )}
          {alert && active && (
            <div className="absolute top-1 right-28 bg-amber-100 text-amber-800 text-[10px] font-telemetry-sm font-semibold px-2 py-0.5 rounded border border-amber-200">
              {active.fault_type === "cooling_degradation" || active.fault_type === "overheating_trend" ? "Thermal Drift" : active.label} Initiation (T-{fmtHms(row.t_s - onset!).slice(0, 5)})
            </div>
          )}
        </div>
        <div className="row-span-1 border-t border-outline-variant/60 flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-label-caps text-outline uppercase font-bold">Residual Anomaly Track</span>
            <span className="text-telemetry-sm font-telemetry-sm text-slate-700">
              Score: <strong className={score?.value >= score?.threshold ? "text-amber-700" : "text-emerald-700"}>{fmt(score?.value, 2)}</strong> (Threshold {fmt(score?.threshold, 2)})
            </span>
          </div>
          <div className="w-80 h-3 flex items-end gap-1">
            {(scores as (number | null)[]).slice(-20).map((s, i) => {
              const v = s ?? 0;
              const hot = score && v >= score.threshold;
              const h = Math.max(1, Math.round(v * 3.5 * 4)) / 4;
              return <div key={i} className={`w-3 rounded-xs ${hot ? (v > 0.8 ? "bg-amber-600" : "bg-amber-500") : "bg-emerald-400"}`} style={{ height: `${Math.min(h * 4, 14)}px` }} />;
            })}
          </div>
          <span className="text-[10px] font-telemetry-sm text-outline">Confidence: {fmt(row.confidence_pct, 1)}%</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- right column */
function Pill({ watch, children }: { watch: boolean; children: React.ReactNode }) {
  return watch ? (
    <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">{children}</span>
  ) : (
    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">{children}</span>
  );
}

const TOLERANCE = 0.025;

function ObservedVsTwin({ row, cfg, cylinder }: { row: LiveRow; cfg: EngineConfigView; cylinder: number }) {
  const m = row.measured ?? {};
  const e = row.expected ?? {};
  const egtAvg = (o: Record<string, number>) => [1, 2, 3, 4].reduce((a, i) => a + (kToC(o[`egt_${i}_k`]) ?? 0), 0) / 4;
  const rows = [
    { label: `CHT Cyl ${cylinder}`, obs: kToC(m[`cht_${cylinder}_k`]), twin: kToC(e[`cht_${cylinder}_k`]), unit: "°C", d: 0 },
    { label: "EGT Avg", obs: egtAvg(m), twin: egtAvg(e), unit: "°C", d: 0 },
    { label: "Oil Temp", obs: kToC(m.oil_temp_k), twin: kToC(e.oil_temp_k), unit: "°C", d: 0 },
    { label: "Fuel Flow", obs: kgsToLph(m.fuel_flow_kg_s, cfg.fuel.density_kg_per_l), twin: kgsToLph(e.fuel_flow_kg_s, cfg.fuel.density_kg_per_l), unit: " L/h", d: 1 },
    { label: cfg.turbo.present ? "MAP (Turbo)" : "MAP", obs: kpaToInHg(m.map_kpa), twin: kpaToInHg(e.map_kpa), unit: " inHg", d: 1 },
  ];
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-sm">
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">compare_arrows</span>
          <h2 className="text-headline-sm font-headline-sm font-bold text-slate-900 text-[14px]">Observed vs Twin Expected</h2>
        </div>
        <span className="text-telemetry-sm font-telemetry-sm text-outline text-[10px]">Δ Tolerance: ±{fmt(TOLERANCE * 100, 1)}%</span>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-outline-variant text-[10px] font-label-caps text-slate-500 uppercase tracking-wider">
            <th className="py-1">Parameter</th>
            <th className="py-1 text-right">Obs</th>
            <th className="py-1 text-right">Twin</th>
            <th className="py-1 text-right">Residual</th>
            <th className="py-1 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-telemetry-sm text-telemetry-sm">
          {rows.map((r) => {
            const res = r.obs != null && r.twin != null ? r.obs - r.twin : null;
            const watch = res != null && r.twin ? Math.abs(res) / Math.abs(r.twin) > TOLERANCE : false;
            return watch ? (
              <tr key={r.label} className="bg-amber-50/60 font-semibold text-slate-900">
                <td className="py-1.5 flex items-center gap-1 font-headline-sm text-slate-900 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {r.label}</td>
                <td className="py-1.5 text-right font-bold text-amber-900">{fmt(r.obs, r.d)}{r.unit}</td>
                <td className="py-1.5 text-right text-slate-600">{fmt(r.twin, r.d)}{r.unit}</td>
                <td className="py-1.5 text-right text-amber-700 font-bold">{signed(res, 1)}{r.unit}</td>
                <td className="py-1.5 text-center"><Pill watch>WATCH</Pill></td>
              </tr>
            ) : (
              <tr key={r.label} className="hover:bg-slate-50">
                <td className="py-1.5 text-slate-700 font-body-md">{r.label}</td>
                <td className="py-1.5 text-right">{fmt(r.obs, r.d)}{r.unit}</td>
                <td className="py-1.5 text-right text-slate-500">{fmt(r.twin, r.d)}{r.unit}</td>
                <td className="py-1.5 text-right text-slate-600">{signed(res, 1)}{r.unit}</td>
                <td className="py-1.5 text-center"><Pill watch={false}>Normal</Pill></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const PARAM_ROWS: [string, string][] = [
  ["cooling_effectiveness", "Cooling Effectiveness"],
  ["volumetric_efficiency_factor", "Volumetric Efficiency"],
  ["injector_flow_coeff", "Injector Flow Coeff"],
  ["friction_factor", "Friction Factor"],
  ["oil_pump_efficiency", "Oil Pump Efficiency"],
  ["turbo_efficiency", "Turbocharger Efficiency"],
];

function HealthParameters() {
  const { data } = usePoll(() => request<any>("/api/twin/health-parameters?window_s=1800&max_points=30"), 4000);
  const params: any[] = data?.parameters ?? [];
  const byName = Object.fromEntries(params.map((p) => [p.name, p]));
  const injectors = params.filter((p) => p.name.startsWith("injector_flow_coeff_"));
  const worstInjector = injectors.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-sm">
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">monitor_heart</span>
          <h2 className="text-headline-sm font-headline-sm font-bold text-slate-900 text-[14px]">Estimated Health Parameters</h2>
        </div>
        <span className="text-telemetry-sm font-telemetry-sm text-outline text-[10px]">Kalman Filter Model</span>
      </div>
      <div className="divide-y divide-slate-100">
        {PARAM_ROWS.map(([key, label]) => {
          const p = key === "injector_flow_coeff" ? worstInjector : byName[key];
          if (!p) return null;
          const watch = p.status === "WATCH";
          const deltaPct = p.delta * 100;
          const sub = watch
            ? `${fmt(p.value, 2)} (${signed(deltaPct, 0)}% ${key === "friction_factor" ? "increase" : "degradation"})`
            : Math.abs(deltaPct) < 0.5
              ? `${fmt(p.value, 2)} (Nominal)`
              : `${fmt(p.value, 2)} (${signed(deltaPct, 0)}% delta)`;
          const hist: number[] = (p.history ?? []).filter((x: number | null) => x != null);
          const lo = Math.min(...hist, p.value), hi = Math.max(...hist, p.value);
          const path = hist.length > 1 ? hist.map((v, i) => `${i === 0 ? "M" : "L"} ${((i / (hist.length - 1)) * 50).toFixed(1)} ${(12 - ((v - lo) / (hi - lo || 1)) * 10).toFixed(1)}`).join(" ") : "M 0 7 L 50 7";
          return (
            <div key={key} className="py-1.5 flex items-center justify-between">
              <div>
                <span className={`text-[12px] font-body-md text-slate-800 block ${watch ? "font-semibold" : ""}`}>{label}{key === "injector_flow_coeff" && injectors.length ? ` (Cyl ${Number(p.name.slice(-1)) + 1})` : ""}</span>
                <span className={`text-[10px] font-telemetry-sm ${watch ? "text-amber-700 font-bold" : "text-slate-500"}`}>{sub}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-14 h-4" viewBox="0 0 50 14"><path d={path} fill="none" stroke={watch ? "#D97706" : "#16A34A"} strokeWidth={watch ? 1.8 : 1.5} /></svg>
                <span className={`px-1.5 py-0.2 text-[10px] font-telemetry-sm rounded ${watch ? "bg-amber-100 text-amber-800 font-bold" : "bg-emerald-100 text-emerald-800"}`}>{watch ? "WATCH" : "Nominal"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Attribution({ row }: { row: LiveRow }) {
  const a = row.attribution;
  if (!a) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-600">psychology</span>
            <h3 className="text-headline-sm font-headline-sm font-bold text-slate-900 text-[13px]">Fault Source AI Attribution</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-telemetry-sm font-bold">No Fault Attributed</span>
        </div>
        <p className="text-[11px] text-slate-700 font-body-md leading-relaxed">All monitored channels track the digital twin within tolerance.</p>
      </div>
    );
  }
  const st = a.selftest;
  const sensorOk = st?.status === "OK";
  const sensorId = a.channel_label ? a.channel_label.replace(/^CHT Cyl (\d)$/, "CHT-0$1").replace(/^EGT-(\d)$/, "EGT-0$1") : "channel";
  return (
    <div className="bg-surface-container-lowest border-2 border-amber-300 rounded-xl p-space-md shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 bg-amber-400/10 rounded-bl-full pointer-events-none" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-amber-600">psychology</span>
          <h3 className="text-headline-sm font-headline-sm font-bold text-slate-900 text-[13px]">Fault Source AI Attribution</h3>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-telemetry-sm font-bold">{a.kind === "engine" ? "Engine Fault (Not Sensor)" : "Sensor Fault"}</span>
      </div>
      {st && (
        <div className="flex items-start gap-2 bg-amber-50/70 p-2 rounded-lg border border-amber-200/80 mb-2">
          <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${sensorOk ? "text-emerald-600" : "text-[#DC2626]"}`}>{sensorOk ? "check_circle" : "error"}</span>
          <p className="text-[11px] text-slate-700 leading-snug">
            {sensorOk
              ? `Sensor integrity validated: ${sensorId} loop resistance ${fmt(st.loop_ohm, 1)} Ω nominal`
              : `Sensor integrity check failed: ${sensorId} loop ${st.status.toLowerCase()} (${Number.isFinite(st.loop_ohm) ? `${fmt(st.loop_ohm, 1)} Ω` : "open circuit"} vs ${fmt(st.nominal_ohm, 1)} Ω)`}
            {a.tracking_correlation != null ? ` (${fmt(a.tracking_correlation, 3)} correlation with sibling sensors).` : "."}
          </p>
        </div>
      )}
      <p className="text-[11px] text-slate-700 font-body-md leading-relaxed">
        <strong className="text-amber-900">Diagnosis:</strong> {a.diagnosis}
      </p>
    </div>
  );
}

function AssemblyCard({ cylinder, row }: { cylinder: number; row: LiveRow }) {
  const { data } = usePoll(() => request<any>(`/api/twin/assembly/${cylinder}`), 3000, [cylinder]);
  const [stress, setStress] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const health = data?.assembly_health;
  const warn = health != null && health < 85;
  const onset = data?.anomaly_onset_t;
  const rec = data?.maintenance_record;
  const download = async () => {
    const res = await fetch(`${API_BASE}/api/health/history.csv?seconds=600`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `twin_cyl${cylinder}_diagnostic_dump.csv`;
    a.click();
  };
  const runStress = async () => {
    setRunning(true);
    try {
      setStress(await request<any>("/api/twin/stress-test", { method: "POST", body: JSON.stringify({ power_pct_mcp: 100, minutes: 15 }) }));
    } finally {
      setRunning(false);
    }
  };
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-sm flex-1 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">hub</span>
            <h3 className="text-headline-sm font-headline-sm font-bold text-slate-900 text-[13px]">Selected: Cylinder {cylinder} Assembly</h3>
          </div>
          <span className={`text-telemetry-sm font-telemetry-sm font-bold px-2 py-0.5 rounded ${warn ? "text-amber-700 bg-amber-100" : "text-emerald-700 bg-emerald-100"}`}>Health: {fmt(health)}/100</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 font-telemetry-sm">
          <div className="bg-surface-container-low p-2 rounded">
            <span className="text-[10px] text-outline font-body-md block">Active Sensor Binds</span>
            <span className="font-semibold text-slate-900 block mt-0.5">{(data?.sensor_binds ?? []).slice(0, 2).join(", ")}</span>
            <span className="text-[10px] text-slate-500">{(data?.sensor_binds ?? [])[2] ?? ""}</span>
          </div>
          <div className="bg-surface-container-low p-2 rounded">
            <span className="text-[10px] text-outline font-body-md block">Anomaly Onset</span>
            <span className={`font-semibold block mt-0.5 ${onset != null ? "text-amber-800" : "text-slate-900"}`}>{onset != null ? `T-${fmtHms(row.t_s - onset)}` : "None"}</span>
            <span className="text-[10px] text-slate-500">{data?.cht_residual_k != null ? `${Math.abs(data.cht_residual_k) > 3 ? "Persistent" : "Current"} ${signed(data.cht_residual_k, 0)}°C delta` : ""}</span>
          </div>
        </div>
        <div className="bg-surface-container-low/60 p-2 rounded border border-outline-variant/40 text-[11px] mb-2">
          <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-1">
            <span className="material-symbols-outlined text-[14px]">history_edu</span>
            <span className="font-label-caps uppercase font-bold">Maintenance Record</span>
          </div>
          <span className="text-slate-800 font-body-md">
            {rec
              ? `${rec.title} ${rec.hours_since_service != null ? `serviced ${fmt(rec.hours_since_service)} flight hrs ago` : "has no recorded service"}. Next overhaul scheduled in ${fmt(Math.max(rec.next_due_in_hours, 0))} hrs.`
              : "No service record for this airframe."}
          </span>
        </div>
        {stress && (
          <div className="text-[11px] font-telemetry-sm text-slate-700 mb-2">
            Stress test ({fmt(stress.minutes)} min @ {fmt(stress.power_pct_mcp)}% MCP): peak Cyl {cylinder} CHT{" "}
            <strong className={stress.breach_after_s != null ? "text-[#B91C1C]" : "text-emerald-700"}>{fmt(kToC(stress.peak_cht_k[cylinder - 1]))}°C</strong>
            {stress.breach_after_s != null ? ` — limit reached after ${fmt(stress.breach_after_s / 60, 1)} min` : " — within limit"}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/60">
        <button onClick={runStress} disabled={running} className="flex-1 h-9 rounded bg-primary text-white text-[12px] font-headline-sm font-semibold hover:bg-primary/90 transition-colors shadow-xs flex items-center justify-center gap-1 disabled:opacity-70">
          <span className="material-symbols-outlined text-[16px]">troubleshoot</span>
          <span>{running ? "Running Twin Stress Test…" : "Execute Twin Stress Test"}</span>
        </button>
        <button onClick={download} className="h-9 px-3 rounded border border-outline-variant hover:bg-surface-container text-slate-700 text-[12px] font-headline-sm font-medium transition-colors" title="Export Diagnostic Dump">
          <span className="material-symbols-outlined">file_download</span>
        </button>
      </div>
    </div>
  );
}
