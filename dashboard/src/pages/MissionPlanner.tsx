/* Stitch screen "AeroTwin — Screen 5: Mission Planner (Go / No-Go)", bound to the twin planner. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useStationState } from "../app/StationContext";
import { request } from "../lib/api";
import { useLiveSocket } from "../lib/useLiveSocket";
import { usePoll } from "../lib/usePoll";
import { fmt, kToC } from "../lib/units";

const CARD = "bg-surface-container-lowest border border-outline-variant rounded-xl p-margin-compact shadow-sm";
const SEG_LABEL: Record<string, string> = {
  taxi: "TAXI", takeoff: "TAKEOFF", climb: "CLIMB", cruise: "CRUISE", loiter: "LOITER", descent: "DESCENT", landing: "LANDING",
  ingress: "INGRESS", egress: "EGRESS", cap_station: "CAP STATION", transit: "TRANSIT", search_pattern: "SEARCH PATTERN",
  transit_home: "TRANSIT HOME", relay_orbit: "RELAY ORBIT", ew_orbit: "EW ORBIT", cruise_high: "CRUISE HIGH",
  loiter_slow: "LOITER SLOW", pattern_work: "PATTERN WORK", touch_and_go: "TOUCH & GO",
};

interface Params {
  mission_id: string;
  cruise_altitude_m: number;
  duration_h: number;
  surface_temp_c: number;
  airspeed_ktas: number;
  power_pct_mcp: number;
  use_current_health: boolean;
}

function hm(s: number): string {
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}
function dur(s: number): string {
  return s < 3600 ? `${Math.round(s / 60)}m` : `${fmt(s / 3600, s % 3600 ? 1 : 0)}h`.replace(".0h", "h");
}

export default function MissionPlanner() {
  const { session } = useAuth();
  const { latest } = useLiveSocket();
  const { tails } = useStationState();
  const tailId = latest?.context?.tail_id ?? session?.tail_id ?? null;
  const tail = tails.find((t) => t.tail_id === tailId);
  const presets = usePoll(() => request<any[]>("/api/planner/presets"), 0).data ?? [];
  const [params, setParams] = useState<Params | null>(null);
  const [custom, setCustom] = useState(false);
  const [env, setEnv] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<"condition" | "maintenance" | null>(null);
  const autoRan = useRef(false);

  const applyPreset = (id: string) => {
    const p = presets.find((x) => x.mission_id === id);
    if (!p) return;
    setParams((cur) => ({
      mission_id: id,
      cruise_altitude_m: Math.round(p.cruise_altitude_m / 50) * 50,
      duration_h: Math.round(p.duration_h * 2) / 2,
      surface_temp_c: Math.round(p.surface_temp_c),
      airspeed_ktas: Math.round(p.airspeed_ktas),
      power_pct_mcp: Math.round(p.power_pct_mcp),
      use_current_health: cur?.use_current_health ?? true,
    }));
    setCustom(false);
  };
  useEffect(() => {
    if (!params && presets.length) applyPreset(presets.find((p) => p.mission_id === "isr_18h_endurance")?.mission_id ?? presets[0].mission_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presets]);

  const body = params ? JSON.stringify({ ...params, tail_id: tailId }) : null;
  useEffect(() => {
    if (!body) return;
    const id = setTimeout(() => request<any>("/api/planner/environment", { method: "POST", body }).then(setEnv).catch(() => undefined), 250);
    return () => clearTimeout(id);
  }, [body]);

  const run = async () => {
    if (!body) return;
    setRunning(true);
    setError(null);
    try {
      setResult(await request<any>("/api/planner/evaluate", { method: "POST", body }));
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };
  useEffect(() => {
    if (params && !autoRan.current) {
      autoRan.current = true;
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const set = (patch: Partial<Params>) => {
    setParams((p) => (p ? { ...p, ...patch } : p));
    setCustom(true);
  };
  const cooling = env?.cooling_effectiveness;
  const healthText = !params?.use_current_health
    ? "Pristine factory tolerances (health sync off)"
    : env?.health_source === "factory"
      ? "No twin health estimate available — factory tolerances"
      : cooling != null && cooling < 0.97
        ? `Cooling degraded ${fmt((1 - cooling) * 100)}%`
        : "No significant degradation estimated";

  return (
    <main className="flex-1 overflow-y-auto p-margin bg-background planner-range">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-gutter">
        <div className="flex flex-wrap items-center justify-between gap-space-md border-b border-outline-variant pb-space-md">
          <div className="flex items-center gap-space-md">
            <h1 className="text-headline-lg font-headline-lg text-on-surface tracking-tight">Mission Planner (GO / NO-GO)</h1>
            <span className="px-space-sm py-0.5 rounded-full text-telemetry-sm font-telemetry-sm bg-surface-container-high text-primary border border-primary/20">PRE-FLIGHT SIMULATION RUNNER</span>
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Twin Model Version:</span>
            <span className="font-telemetry-sm text-telemetry-sm bg-surface-container px-space-sm py-1 rounded text-on-surface border border-outline-variant">{result?.twin_model_version ?? "--"}</span>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-gutter items-start">
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-gutter">
            {params && (
              <Inputs
                params={params} set={set} presets={presets} custom={custom} applyPreset={applyPreset}
                env={env} healthText={healthText} tailLabel={tail ? `${tail.tail_id} SN ${tail.engine_serial}` : "Unassigned airframe"}
                degraded={cooling != null && cooling < 0.97 && params.use_current_health} running={running} run={run}
              />
            )}
          </div>
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-gutter">
            <Verdict result={result} running={running} error={error} preview={preview} setPreview={setPreview} />
            {result && <ProfileChart result={result} />}
            {result && <Curves result={result} />}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------- inputs */
function SliderBox({ label, value, unit, extra, valueClass = "text-primary", min, max, step, v, onChange, left, right }: {
  label: string; value: string; unit: string; extra?: string; valueClass?: string; min: number; max: number; step: number; v: number; onChange: (n: number) => void; left: string; right: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 p-space-sm bg-surface-container-low/50 rounded border border-outline-variant/60">
      <div className="flex justify-between items-center">
        <span className="text-label-caps font-label-caps text-on-surface-variant">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className={`text-telemetry-lg font-telemetry-lg font-bold ${valueClass}`}>{value}</span>
          <span className={`text-telemetry-sm font-telemetry-sm text-on-surface-variant ${extra ? "font-medium" : ""}`}>{extra ?? unit}</span>
        </div>
      </div>
      <input className="w-full" max={max} min={min} step={step} type="range" value={v} onChange={(e) => onChange(Number(e.target.value))} />
      <div className="flex justify-between text-telemetry-sm font-telemetry-sm text-on-surface-variant/70 text-[10px]">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function BarInput({ label, value, unit, pct, bar, min, max, v, onChange }: { label: string; value: string; unit: string; pct: number; bar: string; min: number; max: number; v: number; onChange: (n: number) => void }) {
  return (
    <div className="p-space-sm bg-surface-container-low/50 rounded border border-outline-variant/60 flex flex-col justify-between relative">
      <span className="text-label-caps font-label-caps text-on-surface-variant text-[10px]">{label}</span>
      <div className="flex items-baseline justify-between mt-1">
        <span className="text-telemetry-lg font-telemetry-lg text-on-surface font-bold">{value}</span>
        <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">{unit}</span>
      </div>
      <div className="w-full bg-outline-variant/30 h-1.5 rounded-full mt-2 overflow-hidden">
        <div className={`${bar} h-full`} style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
      </div>
      {/* Invisible range over the bar keeps the Stitch card look while making it adjustable. */}
      <input aria-label={label} className="absolute left-space-sm right-space-sm bottom-1 h-4 opacity-0 cursor-ew-resize" style={{ width: "calc(100% - 1rem)" }} type="range" min={min} max={max} value={v} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Inputs({ params, set, presets, custom, applyPreset, env, healthText, tailLabel, degraded, running, run }: {
  params: Params; set: (p: Partial<Params>) => void; presets: any[]; custom: boolean; applyPreset: (id: string) => void; env: any;
  healthText: string; tailLabel: string; degraded: boolean; running: boolean; run: () => void;
}) {
  const isa = params.surface_temp_c - 15;
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-margin-compact shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)] flex flex-col gap-gutter">
      <div className="flex items-center justify-between border-b border-outline-variant pb-space-sm">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-primary">tune</span>
          <span className="text-headline-sm font-headline-sm text-on-surface">Flight Parameter Inputs</span>
        </div>
        <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">SIM CONFIG</span>
      </div>
      <div className="flex flex-col gap-space-xs">
        <label className="text-label-caps font-label-caps text-on-surface-variant uppercase" htmlFor="missionProfileSelect">Mission Profile</label>
        <div className="relative">
          <select
            className="w-full h-9 pl-space-md pr-space-xl bg-surface-container-lowest border border-outline-variant rounded text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
            id="missionProfileSelect" value={custom ? "custom" : params.mission_id}
            onChange={(e) => (e.target.value === "custom" ? undefined : applyPreset(e.target.value))}
          >
            {presets.map((p) => (
              <option key={p.mission_id} value={p.mission_id}>{p.display_name}</option>
            ))}
            <option value="custom">Custom Envelope</option>
          </select>
          <span className="material-symbols-outlined absolute right-2.5 top-2 pointer-events-none text-on-surface-variant text-lg">expand_more</span>
        </div>
      </div>
      <div className="flex flex-col gap-space-md">
        <SliderBox label="FLIGHT ALTITUDE" value={fmt(params.cruise_altitude_m)} unit="m" min={1000} max={8000} step={50} v={params.cruise_altitude_m} onChange={(n) => set({ cruise_altitude_m: n })} left="1,000 m" right="8,000 m (Ceiling)" />
        <SliderBox label="MISSION DURATION" value={fmt(params.duration_h, 1)} unit="hrs" min={2} max={24} step={0.5} v={params.duration_h} onChange={(n) => set({ duration_h: n })} left="2.0 h" right="24.0 h (MALE Class)" />
        <SliderBox label="AMBIENT TEMP / ISA DEV" value={`${params.surface_temp_c >= 0 ? "+" : ""}${params.surface_temp_c} °C`} unit="" extra={`(ISA ${isa >= 0 ? "+" : ""}${isa})`} valueClass="text-tertiary" min={-20} max={45} step={1} v={params.surface_temp_c} onChange={(n) => set({ surface_temp_c: n })} left="-20 °C" right="+45 °C Hot Extremes" />
        <div className="grid grid-cols-2 gap-space-sm">
          <BarInput label="CRUISING AIRSPEED" value={fmt(params.airspeed_ktas)} unit="KTAS" pct={((params.airspeed_ktas - 40) / 160) * 100} bar="bg-primary" min={40} max={200} v={params.airspeed_ktas} onChange={(n) => set({ airspeed_ktas: n })} />
          <BarInput label="ENGINE POWER SETTING" value={`${params.power_pct_mcp}%`} unit="MCP" pct={params.power_pct_mcp} bar="bg-tertiary" min={30} max={100} v={params.power_pct_mcp} onChange={(n) => set({ power_pct_mcp: n })} />
        </div>
      </div>
      <div className="p-space-sm bg-surface-container rounded-lg border border-outline-variant flex items-start gap-space-sm">
        <input checked={params.use_current_health} onChange={(e) => set({ use_current_health: e.target.checked })} className="mt-1 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer" id="twinSync" type="checkbox" />
        <label className="flex flex-col cursor-pointer" htmlFor="twinSync">
          <span className="font-headline-sm text-headline-sm text-on-surface">Use current engine health from digital twin</span>
          <span className={`font-telemetry-sm text-telemetry-sm font-medium mt-0.5 ${degraded ? "text-error" : "text-secondary"}`}>{tailLabel} — {healthText}</span>
          <span className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">Simulates actual physical wear telemetry instead of pristine factory tolerances.</span>
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-label-caps font-label-caps text-on-surface-variant uppercase text-[10px]">Environmental Factors Calculated</span>
        <div className="grid grid-cols-3 gap-space-xs text-center">
          <EnvBox label="Headwind" value={env ? `${fmt(env.headwind_kts)} kts` : "--"} />
          <EnvBox label="OAT cruise" value={env ? `${fmt(env.oat_cruise_c)} °C` : "--"} />
          <EnvBox label="Density Alt" value={env ? `${fmt(env.density_altitude_m)} m` : "--"} />
        </div>
      </div>
      <button onClick={run} disabled={running} className="w-full h-11 bg-primary text-on-primary rounded font-headline-sm text-headline-sm flex items-center justify-center gap-space-sm hover:bg-primary-container active:scale-[0.99] transition-all duration-150 shadow-md disabled:opacity-75">
        <span className={`material-symbols-outlined ${running ? "animate-spin" : ""}`}>{running ? "progress_activity" : "model_training"}</span>
        <span className="tracking-wide font-bold">{running ? "SIMULATING FULL MISSION…" : "RUN TWIN SIMULATION"}</span>
      </button>
    </div>
  );
}

function EnvBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-space-xs bg-surface-container-high rounded border border-outline-variant/40">
      <div className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">{label}</div>
      <div className="font-telemetry-md text-telemetry-md font-bold text-on-surface">{value}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- verdict */
const VERDICT = {
  "NO-GO": { border: "border-error", bar: "bg-error", badge: "bg-error text-on-error", icon: "dangerous", title: "Mission Abort Advised", titleCls: "text-error", conf: "bg-error-container text-on-error-container", text: "Mission profile exceeds safe thermal operating envelope before completion." },
  CAUTION: { border: "border-[#F59E0B]", bar: "bg-[#F59E0B]", badge: "bg-[#F59E0B] text-white", icon: "warning", title: "Proceed With Caution", titleCls: "text-[#B45309]", conf: "bg-[#FEF3C7] text-[#B45309]", text: "Limit margins are thin under the twin's health-estimate uncertainty." },
  GO: { border: "border-secondary", bar: "bg-secondary", badge: "bg-secondary text-on-secondary", icon: "verified", title: "Mission Cleared", titleCls: "text-secondary", conf: "bg-[#DCFCE7] text-[#15803D]", text: "All monitored limits hold across the full mission timeline." },
} as const;

function Verdict({ result, running, error, preview, setPreview }: { result: any; running: boolean; error: string | null; preview: string | null; setPreview: (p: any) => void }) {
  if (!result) {
    return (
      <div className={`${CARD} border-2 relative overflow-hidden`}>
        <div className="flex items-center gap-space-md">
          <span className={`material-symbols-outlined text-primary ${running ? "animate-spin" : ""}`}>{running ? "progress_activity" : "model_training"}</span>
          <div className="flex flex-col">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">{running ? "Simulating" : "Awaiting simulation"}</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">{error ?? (running ? "Running the full mission on the digital twin with Monte Carlo health uncertainty…" : "Configure the mission and run the twin simulation.")}</span>
          </div>
        </div>
      </div>
    );
  }
  const v = VERDICT[result.verdict as keyof typeof VERDICT] ?? VERDICT.GO;
  const [cond, maint] = result.mitigations;
  return (
    <div className={`bg-surface-container-lowest border-2 ${v.border} rounded-xl p-margin-compact shadow-sm relative overflow-hidden ${running ? "opacity-60" : ""}`}>
      <div className={`absolute top-0 right-0 left-0 h-1 ${v.bar}`} />
      <div className="flex flex-wrap items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className={`px-space-md py-1 ${v.badge} rounded font-telemetry-xl text-telemetry-xl font-bold tracking-wider flex items-center gap-space-xs shadow-sm`}>
            <span className="material-symbols-outlined text-2xl">{v.icon}</span>
            <span>{result.verdict}</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs">
              <span className={`text-label-caps font-label-caps font-bold uppercase tracking-wider ${v.titleCls}`}>{v.title}</span>
              <span className={`px-space-xs py-0.5 rounded text-telemetry-sm font-telemetry-sm font-semibold ${v.conf}`}>{fmt(result.confidence * 100)}% {result.verdict === "GO" ? "Confidence" : "Breach Probability"}</span>
            </div>
            <span className="font-headline-sm text-headline-sm text-on-surface">{v.text}</span>
          </div>
        </div>
      </div>
      <div className="mt-space-md pt-space-sm border-t border-outline-variant/60 flex flex-col gap-space-xs">
        <span className="text-label-caps font-label-caps text-on-surface-variant uppercase text-[10px]">Predicted Root Causes &amp; Thermal Breach Points:</span>
        {result.root_causes.length === 0 && <span className="font-body-md text-body-md text-on-surface-variant">No limit breach or margin shortfall predicted.</span>}
        {result.root_causes.map((c: any, i: number) => {
          const warn = c.severity === "warning";
          return (
            <div key={i} className={`flex items-start gap-space-xs font-body-md text-body-md ${warn ? "text-error" : "text-on-surface-variant"}`}>
              <span className={`material-symbols-outlined text-base mt-0.5 shrink-0 ${warn ? "" : "text-tertiary"}`}>{warn ? "warning" : "report_problem"}</span>
              <span>
                <strong>{i + 1}. {c.text.split(" (")[0].replace(/\.$/, "")}</strong>
                {c.t_s != null ? (
                  <> at <span className="font-telemetry-sm font-telemetry-sm underline font-bold">T+{hm(c.t_s)}</span> of {(SEG_LABEL[c.segment] ?? c.segment).toLowerCase()} phase.</>
                ) : c.text.includes(" (") ? (
                  <> ({c.text.split(" (").slice(1).join(" (")}</>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-space-md p-space-sm bg-surface-container rounded-lg border border-outline-variant flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <span className="text-label-caps font-label-caps text-on-surface font-semibold uppercase">Operational Counter-Measures &amp; Mitigation Pathways</span>
          <div className="flex items-center gap-space-xs">
            <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">Conditional Preview:</span>
            <button onClick={() => setPreview(preview === "condition" ? null : "condition")} className={`px-space-xs py-0.5 rounded text-telemetry-sm font-telemetry-sm bg-surface-container-high hover:bg-surface-variant border ${preview === "condition" ? "border-[#F59E0B] text-[#B45309]" : "border-outline-variant text-on-surface"}`}>Amber {cond.verdict}</button>
            <button onClick={() => setPreview(preview === "maintenance" ? null : "maintenance")} className={`px-space-xs py-0.5 rounded text-telemetry-sm font-telemetry-sm bg-surface-container-high hover:bg-surface-variant text-secondary border font-semibold ${preview === "maintenance" ? "border-secondary" : "border-outline-variant"}`}>Green {maint.verdict}</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm mt-1">
          {[cond, maint].map((m: any) => (
            <div key={m.kind} onClick={() => setPreview(preview === m.kind ? null : m.kind)} className={`p-space-sm bg-surface-container-lowest rounded border hover:border-primary cursor-pointer transition-colors ${preview === m.kind ? "border-primary" : "border-outline-variant"}`}>
              <div className={`flex items-center gap-space-xs font-headline-sm text-headline-sm ${m.kind === "condition" ? "text-tertiary" : "text-secondary"}`}>
                <span className="material-symbols-outlined text-sm">{m.kind === "condition" ? "thermostat" : "build"}</span>
                <span>{m.title}</span>
                <span className="ml-auto text-telemetry-sm font-telemetry-sm text-on-surface-variant">→ {m.verdict}</span>
              </div>
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                {m.condition}{" "}
                {m.breach_t_s != null ? <>Delays cylinder thermal runaway to <strong className="text-on-surface">{fmt(m.breach_t_s / 3600, 1)}h</strong>.</> : <strong className="text-on-surface">No CHT limit breach over the full mission.</strong>}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- charts */
function ProfileChart({ result }: { result: any }) {
  const p = result.profile;
  const T = result.mission_duration_s || p.t_s[p.t_s.length - 1] || 1;
  const maxAlt = Math.max(...p.altitude_m, 1);
  const X = (t: number) => 20 + (t / T) * 660;
  const Y = (a: number) => 110 - (a / maxAlt) * 80;
  const path = p.t_s.map((t: number, i: number) => `${i ? "L" : "M"} ${X(t).toFixed(1)} ${Y(p.altitude_m[i]).toFixed(1)}`).join(" ");
  const b = result.breach;
  // Departure (taxi/takeoff/climb) and arrival (descent/landing) are shown as single
  // CLIMB / DESCENT phases, as in the Stitch profile; every phase is labelled.
  const phaseOf = (n: string) => (["taxi", "takeoff", "climb"].includes(n) ? "climb" : ["descent", "landing"].includes(n) ? "descent" : n);
  const segs: any[] = [];
  for (const s0 of p.segments) {
    const name = phaseOf(s0.name);
    const last = segs[segs.length - 1];
    if (last && last.name === name) last.end_s = s0.end_s;
    else segs.push({ name, start_s: s0.start_s, end_s: s0.end_s });
  }
  // Phase labels left to right, skipping any that would overlap the previous one
  // (the phase containing the breach is always labelled as the risk window).
  const labels: { key: string; x: number; text: string; risk: boolean }[] = [];
  let nextFree = 0;
  for (const s1 of segs) {
    const risk = !!b && s1.start_s <= b.t_s && b.t_s <= s1.end_s;
    const text = `${SEG_LABEL[s1.name] ?? s1.name.toUpperCase()} (${dur(s1.start_s)}-${dur(s1.end_s)})${risk ? " - RISK WINDOW" : ""}`;
    const x = Math.max(X(s1.start_s) + 4, nextFree);
    const w = text.length * 6.8; // viewBox units per 9px glyph (the SVG is stretched horizontally)
    if (x + w > 690 && !risk) continue;
    if (x > X(s1.end_s) && !risk) continue;
    labels.push({ key: s1.name + s1.start_s, x: Math.min(x, 690 - w), text, risk });
    nextFree = x + w + 8;
  }
  const bandFill = (s: any) => (b && s.start_s <= b.t_s && b.t_s <= s.end_s ? "#fee2e2" : "#eaedff");
  const breachAlt = b ? p.altitude_m[p.t_s.findIndex((t: number) => t >= b.t_s)] ?? maxAlt : 0;
  return (
    <div className={`${CARD} flex flex-col gap-space-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-primary">altitude</span>
          <span className="font-headline-sm text-headline-sm text-on-surface">Mission Flight Profile &amp; Thermal Risk Envelope</span>
        </div>
        <div className="flex items-center gap-space-sm font-telemetry-sm text-telemetry-sm">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-primary" /> Flight Path</span>
          {b && <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-error" /> Breach Point ({hm(b.t_s).replace(/^0/, "")})</span>}
        </div>
      </div>
      <div className="w-full h-44 bg-surface-container-low/40 rounded border border-outline-variant/60 relative p-2">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 700 130">
          {segs.map((s: any) => (
            <rect key={s.name + s.start_s} fill={bandFill(s)} height="100" opacity="0.35" width={Math.max(X(s.end_s) - X(s.start_s), 1)} x={X(s.start_s)} y="10" />
          ))}
          <line stroke="#c3c5d9" strokeDasharray="3,3" strokeWidth="0.5" x1="20" x2="680" y1="30" y2="30" />
          <line stroke="#c3c5d9" strokeDasharray="3,3" strokeWidth="0.5" x1="20" x2="680" y1="70" y2="70" />
          <line stroke="#737688" strokeWidth="1" x1="20" x2="680" y1="110" y2="110" />
          <path d={path} fill="none" stroke="#0047d3" strokeWidth="2.5" />
          {b && (
            <>
              <line stroke="#ba1a1a" strokeDasharray="4,3" strokeWidth="1.5" x1={X(b.t_s)} x2={X(b.t_s)} y1="10" y2="110" />
              <circle cx={X(b.t_s)} cy={Y(breachAlt)} fill="#ba1a1a" r="5" stroke="#ffffff" strokeWidth="2" />
              <rect fill="#ba1a1a" height="22" rx="3" width="150" x={Math.min(X(b.t_s) + 10, 530)} y="16" />
              <text fill="#ffffff" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" x={Math.min(X(b.t_s) + 15, 535)} y="31">CRITICAL: T+{hm(b.t_s)} CHT</text>
            </>
          )}
          {labels.map((l) => (
            <text key={l.key} fill={l.risk ? "#ba1a1a" : "#737688"} fontFamily="Inter" fontSize="9" fontWeight={l.risk ? 700 : 600} x={l.x} y="122">{l.text}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function Curves({ result }: { result: any }) {
  const c = result.curves;
  const lim = result.limits;
  const T = result.mission_duration_s || c.t_s[c.t_s.length - 1] || 1;
  const cht = c.cht_hot_k.map(kToC), base = c.cht_baseline_k.map(kToC), oil = c.oil_temp_k.map(kToC);
  const limitC = kToC(lim.max_cht_k)!;
  const all = [...cht, ...base, ...oil, limitC].filter((x: number | null): x is number => x != null);
  const lo = Math.min(...all) - 5, hi = Math.max(...all) + 5;
  const X = (t: number) => 25 + (t / T) * 660;
  const Y = (v: number) => 105 - ((v - lo) / (hi - lo)) * 95;
  const line = (arr: (number | null)[]) => arr.map((v, i) => (v == null ? null : `${X(c.t_s[i]).toFixed(1)},${Y(v).toFixed(1)}`)).filter(Boolean).join(" ");
  const baseMean = base.reduce((a: number, v: number | null) => a + (v ?? 0), 0) / Math.max(base.length, 1);
  const b = result.breach;
  const ticks = useMemo(() => [0, 0.25, 0.5, 0.75, 1].map((f) => f * T), [T]);
  return (
    <div className={`${CARD} flex flex-col gap-space-sm`}>
      <div className="flex items-center justify-between">
        <span className="font-headline-sm text-headline-sm text-on-surface">Predicted Parametric Curves (0h — {fmt(T / 3600)}h Mission Timeline)</span>
        <div className="flex items-center gap-space-md font-telemetry-sm text-telemetry-sm">
          <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-tertiary" /> Pred. CHT Cyl {c.hot_cylinder}</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-outline" /> Twin Baseline ({fmt(baseMean)}°C)</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-secondary" /> Pred. Oil Temp</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-error" /> {fmt(limitC)}°C Threshold</span>
        </div>
      </div>
      <div className="w-full h-36 bg-surface-container-low/30 rounded border border-outline-variant/60 relative p-1">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 700 110">
          <line stroke="#ba1a1a" strokeDasharray="4,2" strokeWidth="1.5" x1="25" x2="685" y1={Y(limitC)} y2={Y(limitC)} />
          <text fill="#ba1a1a" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" x="30" y={Y(limitC) - 5}>MAX CHT CEILING {fmt(limitC)} °C</text>
          <polyline fill="none" points={line(base)} stroke="#737688" strokeDasharray="5,4" strokeWidth="1" />
          <polyline fill="none" points={line(cht)} stroke="#9c3000" strokeWidth="2.5" />
          <polyline fill="none" points={line(oil)} stroke="#006a69" strokeWidth="2" />
          {b && (
            <>
              <line stroke="#ba1a1a" strokeDasharray="2,2" strokeWidth="1" x1={X(b.t_s)} x2={X(b.t_s)} y1="10" y2="105" />
              <circle cx={X(b.t_s)} cy={Y(limitC)} fill="#ba1a1a" r="4" />
            </>
          )}
          <line stroke="#c3c5d9" strokeWidth="1" x1="25" x2="685" y1="105" y2="105" />
          {ticks.map((t, i) => (
            <text key={i} fill="#737688" fontFamily="JetBrains Mono" fontSize="8" x={i === 4 ? X(t) - 25 : X(t)} y="112">T+{fmt(t / 3600)}h</text>
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-space-sm pt-space-xs">
        {result.risks.map((r: any, i: number) => {
          const [txt, bg] = [["text-error", "bg-error"], ["text-tertiary", "bg-tertiary"], ["text-secondary", "bg-secondary"]][i];
          return (
            <div key={r.key} className="p-space-xs bg-surface-container rounded border border-outline-variant flex flex-col gap-1">
              <div className="flex justify-between items-center text-telemetry-sm font-telemetry-sm">
                <span className="text-on-surface font-medium">{r.label}</span>
                <span className={`font-bold ${txt}`}>{fmt(r.probability * 100, 1)}% Risk</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div className={`${bg} h-full rounded-full`} style={{ width: `${r.probability * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
