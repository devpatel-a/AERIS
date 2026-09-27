/* Stitch screen "AeroTwin — Screen 6: Mission Replay", replaying stored sortie telemetry. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { API_BASE, request } from "../lib/api";
import { getToken } from "../lib/authToken";
import { useLiveSocket } from "../lib/useLiveSocket";
import { usePoll } from "../lib/usePoll";
import { fmt, fmtHms, kpaToBar, kpaToInHg, kToC, signed } from "../lib/units";

const SPEEDS = [1, 10, 50, 200];
const STEP_S = 600; // transport skip: 10 mission-minutes

function whenLabel(ts: number | null): string {
  if (!ts) return "--";
  const days = Math.floor((Date.now() / 1000 - ts) / 86400);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  return `${Math.floor(days / 7)} weeks ago`;
}
function hmDur(h: number): string {
  const t = Math.round(h * 60);
  return `${Math.floor(t / 60)}h ${String(t % 60).padStart(2, "0")}m`;
}

export default function MissionReplay() {
  const { session } = useAuth();
  const { latest } = useLiveSocket();
  const tailId = latest?.context?.tail_id ?? session?.tail_id ?? null;
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const list = usePoll(() => request<any>(`/api/replay/sorties?tail_id=${tailId}&q=${encodeURIComponent(q)}&category=${category}`), 10000, [tailId, q, category]).data;
  const sorties: any[] = list?.sorties ?? [];
  const [runId, setRunId] = useState<string | null>(null);
  const selected = sorties.find((s) => s.run_id === runId) ?? sorties[0];

  return (
    <main className="flex-1 flex overflow-hidden p-space-sm gap-gutter-dense bg-[#F5F7FA] min-h-0">
      <Archive sorties={sorties} selected={selected} onSelect={setRunId} q={q} setQ={setQ} category={category} setCategory={setCategory} tailId={tailId} />
      {selected ? <Player key={selected.run_id} sortie={selected} /> : <section className="flex-1 flex items-center justify-center text-body-md text-on-surface-variant">No stored sorties for this airframe.</section>}
    </main>
  );
}

/* ---------------------------------------------------------------- archive */
function Archive({ sorties, selected, onSelect, q, setQ, category, setCategory, tailId }: any) {
  const [crc, setCrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const exportAll = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/replay/export.h5?tail_id=${tailId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      setCrc(res.headers.get("X-CRC32"));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(await res.blob());
      a.download = `${tailId}_sorties.h5`;
      a.click();
    } finally {
      setBusy(false);
    }
  };
  const chip = (c: string) =>
    c === "ALERT" ? ["bg-red-100 text-red-800 border-red-300", "bg-red-600"] : c === "WATCH" ? ["bg-amber-100 text-amber-800 border-amber-300", "bg-amber-500"] : ["bg-emerald-100 text-emerald-800 border-emerald-300", "bg-emerald-600"];
  const delta = (c: string) => (c === "ALERT" ? "text-red-700 bg-red-50 border-red-200" : c === "WATCH" ? "text-amber-700 bg-amber-50 border-amber-200 font-bold" : "text-emerald-700 bg-emerald-50 border-emerald-200");
  return (
    <section className="w-[24%] flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm shrink-0">
      <div className="p-space-sm border-b border-outline-variant bg-surface-bright flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-primary">history</span>
          <span className="font-headline-sm text-headline-sm text-on-surface">Sortie Archives</span>
        </div>
        <span className="text-label-caps font-label-caps text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded text-[10px]">{sorties.length} SORTIES</span>
      </div>
      <div className="p-space-sm border-b border-outline-variant bg-[#F8FAFC] space-y-2">
        <div className="relative">
          <span className="material-symbols-outlined text-[16px] text-outline absolute left-2.5 top-2.5">search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="w-full pl-8 pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-[32px]" placeholder="Filter by mission ID, callsign..." type="text" />
        </div>
        <div className="flex items-center justify-between gap-1 text-[11px]">
          <div className="flex items-center gap-1 text-on-surface-variant font-label-caps">
            <span className="material-symbols-outlined text-[14px]">calendar_month</span>
            <span>Sort: Recent</span>
          </div>
          <div className="flex gap-1">
            {[["all", "All"], ["isr", "ISR"], ["cap", "CAP"]].map(([k, l]) => (
              <button key={k} onClick={() => setCategory(k)} className={`px-2 py-0.5 font-medium rounded text-[10px] ${category === k ? "bg-surface-container text-primary border border-outline-variant/80" : "bg-transparent text-on-surface-variant hover:bg-surface-container"}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/60 custom-scrollbar">
        {sorties.map((s: any) => {
          const sel = s.run_id === selected?.run_id;
          const [cBox, cDot] = chip(s.chip);
          const sub = s.active ? `Today · Elapsed: ${fmtHms(s.flight_hours * 3600)}` : `${whenLabel(s.end_time)} · ${hmDur(s.flight_hours)}`;
          return (
            <div key={s.run_id} onClick={() => onSelect(s.run_id)} className={`p-space-sm cursor-pointer transition-colors relative ${sel ? `bg-surface-container-high/60 border-l-4 ${s.chip === "ALERT" ? "border-red-500" : s.chip === "WATCH" ? "border-amber-500" : "border-emerald-500"}` : `hover:bg-[#F8FAFC] ${s.chip === "ALERT" ? "bg-red-50/20" : ""}`}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-headline-sm text-headline-sm text-on-surface ${sel ? "font-bold" : ""}`}>{s.sortie_label}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-telemetry-sm border ${cBox}`}><span className={`w-1.5 h-1.5 rounded-full mr-1 ${cDot}`} />{s.chip}</span>
                  </div>
                  <div className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">{sub}</div>
                </div>
                <div className="text-right">
                  <span className={`text-telemetry-sm font-telemetry-sm px-1.5 py-0.5 rounded border block ${delta(s.chip)}`}>{s.health_delta_pct == null ? "--" : `${signed(s.health_delta_pct, Math.abs(s.health_delta_pct) < 1 ? 1 : 0)}% Δ`}</span>
                  <span className={`text-[10px] font-telemetry-sm mt-0.5 block ${s.chip === "ALERT" ? "text-red-600" : "text-outline"}`}>{s.active ? (s.paused ? "PAUSED" : "LIVE") : s.status_label}</span>
                </div>
              </div>
              {sel ? (
                <div className="mt-2 text-[11px] text-on-surface-variant flex items-center justify-between border-t border-outline-variant/40 pt-1.5">
                  <span>{s.engine_class}</span>
                  <span className={`font-medium font-telemetry-sm ${s.chip === "OK" ? "text-emerald-800" : s.chip === "ALERT" ? "text-red-800" : "text-amber-800"}`}>{s.note_right}</span>
                </div>
              ) : (
                <div className={`mt-1.5 text-[11px] flex items-center justify-between ${s.chip === "ALERT" ? "text-red-800" : "text-outline"}`}>
                  <span>{s.note}</span>
                  <span className="font-telemetry-sm">{s.note_right}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="p-space-sm border-t border-outline-variant bg-[#F8FAFC] flex justify-between items-center text-body-sm">
        <button onClick={exportAll} disabled={busy || !sorties.length} className="text-on-surface font-medium hover:text-primary flex items-center gap-1 text-[11px] disabled:opacity-60">
          <span className="material-symbols-outlined text-[15px]">file_download</span>
          <span>{busy ? "Exporting…" : "Batch Export HDF5"}</span>
        </button>
        <span className="text-[10px] text-outline font-telemetry-sm">{crc ? `CRC-32 ${crc}` : "CRC-32 on export"}</span>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- player */
function Player({ sortie }: { sortie: any }) {
  const runId = sortie.run_id;
  const traces = usePoll(() => request<any>(`/api/replay/${runId}/traces?max_points=600`), sortie.active ? 15000 : 0, [runId]).data;
  const extremes = usePoll(() => request<any>(`/api/replay/${runId}/extremes`), sortie.active ? 15000 : 0, [runId]).data;
  const events: any[] = usePoll(() => request<any[]>(`/api/replay/${runId}/events`), sortie.active ? 10000 : 0, [runId]).data ?? [];
  const duration: number = traces?.duration_s ?? sortie.flight_hours * 3600;
  const markers = useMemo(() => events.filter((e) => ["PHASE", "DETECTED", "AI_DIAGNOSIS", "LIMIT_WARNING", "THRESHOLD", "INJECTED"].includes(e.kind)).slice(0, 12), [events]);
  const firstAnomaly = events.find((e) => e.kind === "DETECTED" || e.kind === "AI_DIAGNOSIS");
  const [t, setT] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(50);
  const pos = t ?? firstAnomaly?.t_s ?? duration * 0.33;

  // Advance the playhead in mission time at `speed` x real time.
  const last = useRef(performance.now());
  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const dt = (now - last.current) / 1000;
      last.current = now;
      setT((cur) => Math.min((cur ?? pos) + dt * speed, duration));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, duration]);
  useEffect(() => {
    if (pos >= duration) setPlaying(false);
  }, [pos, duration]);

  // Twin state at the playhead (throttled to ~2 Hz).
  const [twin, setTwin] = useState<any>(null);
  const lastFetch = useRef(0);
  useEffect(() => {
    const now = performance.now();
    if (now - lastFetch.current < 500 && playing) return;
    lastFetch.current = now;
    request<any>(`/api/replay/${runId}/twin-state?t=${pos.toFixed(0)}`).then(setTwin).catch(() => undefined);
  }, [runId, Math.floor(pos / 5), playing]);

  const seek = (s: number) => setT(Math.max(0, Math.min(s, duration)));
  return (
    <>
      <section className="flex-1 flex flex-col gap-gutter-dense min-w-0">
        <TwinLayout twin={twin} pos={pos} engineClass={sortie.engine_class} />
        <Traces traces={traces} pos={pos} duration={duration} events={markers} />
        <Transport
          pos={pos} duration={duration} playing={playing} setPlaying={setPlaying} speed={speed} setSpeed={setSpeed} seek={seek}
          markers={markers} phase={twin?.segment} altitude={twin?.altitude_m}
        />
      </section>
      <section className="w-[24%] flex flex-col gap-gutter-dense shrink-0 overflow-y-auto custom-scrollbar">
        <Summary extremes={extremes} duration={duration} active={sortie.active} />
        <Chronology events={markers} pos={pos} seek={seek} runId={runId} />
      </section>
    </>
  );
}

function TwinLayout({ twin, pos, engineClass }: { twin: any; pos: number; engineClass: string }) {
  const cyl = (n: number) => twin?.cylinders?.find((c: any) => c.cylinder === n);
  const hot = twin?.hot_spot_cylinder;
  const Box = ({ n }: { n: number }) => {
    const c = cyl(n);
    if (hot === n) {
      return (
        <div className="bg-amber-50 border-2 border-amber-500 p-2.5 rounded shadow-md relative ring-4 ring-amber-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500 animate-ping" />
              <span className="text-label-caps font-label-caps text-amber-900 font-bold">CYLINDER {n} (HOT SPOT)</span>
            </div>
            <span className="text-telemetry-sm font-telemetry-sm font-bold text-amber-900 bg-amber-200/70 px-1 rounded">{fmt(kToC(c?.cht_k), 1)} °C</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-telemetry-sm font-telemetry-sm border-t border-amber-200 pt-1">
            <span className="text-amber-800 text-[10px]">Variance vs Model:</span>
            <span className="font-bold text-amber-900">{signed(c?.variance_k, 1)} °C delta</span>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-surface-container-lowest border border-outline-variant p-2 rounded flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-emerald-500" />
          <span className="text-label-caps font-label-caps text-on-surface">CYLINDER {n}</span>
        </div>
        <div className="text-right">
          <span className="text-telemetry-sm font-telemetry-sm font-bold text-on-surface">{fmt(kToC(c?.cht_k), 1)} °C</span>
          <span className="text-[10px] text-emerald-700 ml-1">Nominal</span>
        </div>
      </div>
    );
  };
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-sm shadow-sm flex flex-col shrink-0">
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">view_in_ar</span>
          <span className="font-headline-sm text-headline-sm text-on-surface">Synchronized Propulsion Twin (4-Cylinder Boxer Layout)</span>
          <span className="text-label-caps font-label-caps text-outline text-[10px]">T+{fmtHms(pos)} STATE MATRIX</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">
            Coolant Mass Flow: <strong className="text-on-surface">{fmt(twin?.coolant_mass_flow_kg_s, 2)} kg/s</strong>
          </span>
          {hot && (
            <>
              <span className="h-3 w-px bg-outline-variant" />
              <span className="text-telemetry-sm font-telemetry-sm text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> THERMAL GRADIENT ANOMALY
              </span>
            </>
          )}
        </div>
      </div>
      <div className="relative bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9] border border-outline-variant/70 rounded-lg p-3 flex items-center justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: "radial-gradient(#737688 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
        <div className="w-1/3 space-y-2 z-10"><Box n={1} /><Box n={3} /></div>
        <div className="w-1/4 flex flex-col items-center justify-center z-10 px-2 text-center">
          <div className="w-20 h-28 rounded-md border-2 border-outline-variant bg-surface-container-lowest flex flex-col items-center justify-between p-1.5 shadow-sm relative">
            <div className="text-[9px] font-label-caps text-outline tracking-tight">TURBO INTERCOOLER</div>
            <div className="w-12 h-12 rounded-full border border-dashed border-primary flex items-center justify-center bg-primary/5">
              <span className="material-symbols-outlined text-primary text-[24px]">sync</span>
            </div>
            <div className="text-telemetry-sm font-telemetry-sm text-[10px] text-on-surface-variant font-bold">{fmt(twin?.rpm)} RPM</div>
            {hot && <div className={`absolute top-16 w-4 h-0.5 bg-amber-500 ${hot % 2 ? "-left-4" : "-right-4"}`} />}
          </div>
          <span className="text-[10px] text-outline font-label-caps mt-1">{engineClass.replace("-class", "").toUpperCase()} REDUCTION BOX</span>
        </div>
        <div className="w-1/3 space-y-2 z-10"><Box n={2} /><Box n={4} /></div>
      </div>
    </div>
  );
}

function Traces({ traces, pos, duration, events }: { traces: any; pos: number; duration: number; events: any[] }) {
  if (!traces) return <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-space-sm shadow-sm min-h-0" />;
  const ts: number[] = traces.t_s;
  const idx = Math.max(0, ts.findIndex((x) => x >= pos));
  const at = (k: string) => traces[k]?.[idx];
  const hotCyl = (() => {
    const last = ts.length - 1;
    const peaks = [1, 2, 3, 4].map((n) => traces[`cht_${n}_k`]?.[last] ?? 0);
    return peaks.indexOf(Math.max(...peaks)) + 1;
  })();
  const others = [1, 2, 3, 4].filter((n) => n !== hotCyl);
  const meanOthers = ts.map((_, i) => others.reduce((a, n) => a + (traces[`cht_${n}_k`]?.[i] ?? 0), 0) / others.length);
  const path = (arr: (number | null)[], h: number, pad = 4) => {
    const v = arr.filter((x): x is number => x != null);
    const lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1;
    return arr.map((y, i) => (y == null ? null : `${i ? "L" : "M"}${((ts[i] / duration) * 1000).toFixed(1)},${(h - pad - ((y - lo) / span) * (h - 2 * pad)).toFixed(1)}`)).filter(Boolean).join(" ");
  };
  const chtPath = (arr: (number | null)[]) => {
    const v = [...arr, ...meanOthers].filter((x): x is number => x != null);
    const lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1;
    return arr.map((y, i) => (y == null ? null : `${i ? "L" : "M"}${((ts[i] / duration) * 1000).toFixed(1)},${(46 - ((y - lo) / span) * 42).toFixed(1)}`)).filter(Boolean).join(" ");
  };
  const divergence = (at(`cht_${hotCyl}_k`) ?? 0) - (meanOthers[idx] ?? 0);
  const hiStart = traces.health_index?.find((x: number | null) => x != null);
  const guide = (pos / duration) * 100;
  const near = events.find((e) => Math.abs(e.t_s - pos) < duration * 0.01);
  const Row = ({ h, label, sub, subCls, value, valueCls, children, tint }: any) => (
    <div className={`flex items-center border-b border-outline-variant/30 py-0.5 ${tint ?? ""}`} style={{ height: `${h}%` }}>
      <div className="w-28 text-telemetry-sm font-telemetry-sm text-outline shrink-0 leading-tight">
        <span className="text-on-surface font-semibold">{label}</span>
        <span className={`text-[10px] block ${subCls}`}>{sub}</span>
      </div>
      <div className="flex-1 h-full flex items-center relative">
        {children}
        <div className={`absolute right-2 text-telemetry-sm font-telemetry-sm font-bold text-[11px] ${valueCls}`}>{value}</div>
      </div>
    </div>
  );
  return (
    <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-space-sm shadow-sm flex flex-col min-h-0">
      <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/60">
        <span className="text-label-caps font-label-caps text-on-surface-variant flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-primary">stacked_line_chart</span> SYNCHRONIZED TELEMETRY BUS TRACES (00:00:00 — {fmtHms(duration)})
        </span>
        <div className="flex items-center gap-3 text-telemetry-sm font-telemetry-sm text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-blue-600" /> RPM</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-amber-500" /> Cyl {hotCyl} CHT</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-slate-400" /> Cyl {others.join(",")}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-rose-500" /> EGT</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-emerald-600" /> Oil Press</span>
        </div>
      </div>
      <div className="flex-1 relative flex flex-col justify-between py-1 overflow-hidden">
        <div className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-20 pointer-events-none flex flex-col items-center" style={{ left: `calc(7rem + (100% - 7rem) * ${guide / 100})` }}>
          <div className="bg-amber-600 text-white font-telemetry-sm text-[9px] px-1 py-0.5 rounded shadow whitespace-nowrap -mt-1 font-semibold">{fmtHms(pos)}{near ? ` (${near.kind === "PHASE" ? near.title.toUpperCase() : "ANOMALY DETECTED"})` : ""}</div>
          <div className="w-2 h-2 rounded-full bg-amber-500 border border-white mt-1" />
        </div>
        <Row h={18} label="RPM" sub={`${fmt(at("rpm"))} ${(at("rpm") ?? 0) > 1500 ? "cruise" : "idle"}`} subCls="text-primary" value={`${fmt(at("rpm"))} rpm`} valueCls="text-primary">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 40"><path d={path(traces.rpm, 40)} fill="none" stroke="#1E5EFF" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>
        </Row>
        <Row h={22} label={<span className="text-amber-900">CHT (CYL 1-4)</span>} sub={`Cyl ${hotCyl}: ${fmt(kToC(at(`cht_${hotCyl}_k`)), 1)} °C`} subCls="text-amber-700" tint="bg-amber-50/20" value={divergence > 3 ? `▲ ${signed(divergence, 1)}°C divergence` : `${signed(divergence, 1)}°C vs siblings`} valueCls="text-amber-800 bg-amber-100 px-1 rounded">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 50">
            <path d={chtPath(meanOthers)} fill="none" stroke="#94A3B8" strokeDasharray="3,3" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <path d={chtPath(traces[`cht_${hotCyl}_k`])} fill="none" stroke="#F59E0B" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          </svg>
        </Row>
        <Row h={18} label="EGT AVG" sub={`${fmt(kToC(at("egt_avg_k")))} °C steady`} subCls="text-rose-700" value={`${fmt(kToC(at("egt_avg_k")), 1)} °C`} valueCls="text-rose-700">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 40"><path d={path(traces.egt_avg_k, 40)} fill="none" stroke="#E11D48" strokeWidth="1.8" vectorEffect="non-scaling-stroke" /></svg>
        </Row>
        <Row h={18} label="OIL PRESS/TEMP" sub={`${fmt(kpaToBar(at("oil_pressure_kpa")), 1)} bar / ${fmt(kToC(at("oil_temp_k")))} °C`} subCls="text-emerald-700" value={`${fmt(kpaToBar(at("oil_pressure_kpa")), 2)} bar · ${fmt(kToC(at("oil_temp_k")), 1)} °C`} valueCls="text-emerald-800">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 40">
            <path d={path(traces.oil_pressure_kpa, 40)} fill="none" stroke="#059669" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
            <path d={path(traces.oil_temp_k, 40)} fill="none" stroke="#0D9488" strokeDasharray="2,2" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </svg>
        </Row>
        <Row h={20} label="HEALTH INDEX" sub={`${fmt(hiStart)} → ${fmt(at("health_index"))}`} subCls="text-primary font-bold" value={`Score: ${fmt(at("health_index"), 1)}`} valueCls={(at("health_index") ?? 100) < (hiStart ?? 100) - 2 ? "text-amber-700" : "text-emerald-700"}>
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 40">
            <defs>
              <linearGradient id="healthGrad" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#16A34A" />
                <stop offset="50%" stopColor="#EAB308" />
                <stop offset="100%" stopColor="#F97316" />
              </linearGradient>
            </defs>
            <path d={path(traces.health_index, 40)} fill="none" stroke="url(#healthGrad)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          </svg>
        </Row>
      </div>
    </div>
  );
}

const MARKER: Record<string, [string, string]> = {
  PHASE: ["w-3 h-3 bg-slate-500 shadow", "bg-slate-800"],
  DETECTED: ["w-3.5 h-3.5 bg-amber-500 ring-2 ring-amber-300 animate-pulse", "bg-amber-700"],
  AI_DIAGNOSIS: ["w-3.5 h-3.5 bg-amber-500 ring-2 ring-amber-300", "bg-amber-700"],
  INJECTED: ["w-3 h-3 bg-blue-600 shadow", "bg-blue-900"],
  LIMIT_WARNING: ["w-3.5 h-3.5 bg-red-600 shadow ring-2 ring-red-300", "bg-red-800"],
  THRESHOLD: ["w-3.5 h-3.5 bg-red-600 shadow ring-2 ring-red-300", "bg-red-800"],
};

function Transport({ pos, duration, playing, setPlaying, speed, setSpeed, seek, markers, phase, altitude }: any) {
  const pct = (s: number) => `${(s / duration) * 100}%`;
  const track = useRef<HTMLDivElement>(null);
  const hours = Math.floor(duration / 3600);
  const ticks = Array.from({ length: Math.min(hours, 6) + 1 }, (_, i) => (i * duration) / (Math.min(hours, 6) + 1));
  const firstAnomaly = markers.find((m: any) => m.kind === "DETECTED" || m.kind === "AI_DIAGNOSIS");
  const clusters = useMemo(() => {
    const out: any[][] = [];
    for (const m of markers) {
      const last = out[out.length - 1];
      if (last && duration > 0 && (m.t_s - last[0].t_s) / duration < 0.01) last.push(m);
      else out.push([m]);
    }
    return out;
  }, [markers, duration]);
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-sm shadow-sm flex flex-col gap-2 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button onClick={() => seek(pos - STEP_S)} className="h-8 w-8 rounded border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container flex items-center justify-center transition-colors" title="Back 10 min">
            <span className="material-symbols-outlined text-[18px]">replay_10</span>
          </button>
          <button onClick={() => setPlaying(!playing)} className="h-9 px-3 rounded bg-primary text-on-primary font-body-md font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm transition-colors">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{playing ? "pause" : "play_arrow"}</span>
            <span className="text-[12px]">{playing ? "PAUSE" : "PLAY"}</span>
          </button>
          <button onClick={() => seek(pos + STEP_S)} className="h-8 w-8 rounded border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container flex items-center justify-center transition-colors" title="Forward 10 min">
            <span className="material-symbols-outlined text-[18px]">forward_10</span>
          </button>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-telemetry-lg font-telemetry-lg font-bold text-on-surface tracking-wider">
            {fmtHms(pos)} <span className="text-outline text-telemetry-md font-normal">/ {fmtHms(duration)}</span>
          </div>
          <div className="text-label-caps font-label-caps text-on-surface-variant text-[10px]">
            MISSION PHASE: <span className="text-primary font-semibold">{(phase ?? "--").replace(/_/g, " ").toUpperCase()}</span>{altitude != null ? ` (${fmt(altitude)}m)` : ""}
          </div>
        </div>
        <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-md border border-outline-variant">
          <span className="text-[10px] font-label-caps text-outline px-1">SPEED</span>
          {SPEEDS.map((s) => (
            <button key={s} onClick={() => setSpeed(s)} className={`px-2 py-0.5 rounded text-telemetry-sm font-telemetry-sm ${speed === s ? "bg-primary text-on-primary font-bold shadow-xs" : "text-on-surface-variant hover:bg-surface-container-lowest"}`}>{s}×</button>
          ))}
        </div>
      </div>
      <div className="relative pt-3 pb-1 select-none">
        <div
          ref={track}
          onClick={(e) => {
            const r = track.current!.getBoundingClientRect();
            seek(((e.clientX - r.left) / r.width) * duration);
          }}
          className="h-3 w-full bg-[#E2E8F0] rounded-full relative cursor-pointer overflow-hidden border border-outline-variant/60"
        >
          <div className="h-full bg-primary/20 w-[100%]" />
          <div className="absolute top-0 left-0 h-full bg-primary" style={{ width: pct(pos) }} />
        </div>
        <div className="absolute top-1.5 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30" style={{ left: pct(pos) }}>
          <div className="w-3.5 h-6 bg-amber-500 rounded-sm shadow-md border-2 border-white cursor-grab" />
        </div>
        {clusters.map((group: any[], i: number) => {
          // Markers closer than 1% of the timeline share one dot (they would overlap and hide each other);
          // the dot takes the most important event's style and the tooltip lists every event.
          const m = group.find((x) => x === firstAnomaly) ?? group[0];
          const [dot, tip] = MARKER[m.kind] ?? MARKER.PHASE;
          const pinned = group.includes(firstAnomaly);
          return (
            <div key={i} onClick={() => seek(group[0].t_s)} className={`absolute top-1 -translate-x-1/2 group cursor-pointer ${pinned ? "z-20" : ""}`} style={{ left: pct(group[0].t_s) }} title={group.map((x) => `${fmtHms(x.t_s)} - ${x.title}`).join("\n")}>
              <div className={`rounded-full border-2 border-white group-hover:scale-125 transition-transform ${dot}`} />
              <div className={`${pinned ? "" : "hidden group-hover:block"} absolute bottom-5 left-1/2 -translate-x-1/2 ${tip} text-white text-[9px] font-telemetry-sm px-1.5 py-0.5 rounded whitespace-nowrap z-40 shadow-md`}>
                {pinned ? "▲ " : ""}{fmtHms(m.t_s)} {m.title}
              </div>
            </div>
          );
        })}
        <div className="flex justify-between text-telemetry-sm font-telemetry-sm text-[10px] text-outline mt-1.5 px-0.5">
          {ticks.map((s, i) => <span key={i}>{fmtHms(s).slice(0, 5)}</span>)}
          <span>{fmtHms(duration).slice(0, 5)} (End)</span>
        </div>
      </div>
    </div>
  );
}

function Summary({ extremes: x, duration, active }: { extremes: any; duration: number; active: boolean }) {
  const delta = x ? (x.health_end ?? 0) - (x.health_start ?? 0) : null;
  const cyl = x?.peak_cht?.cylinder;
  const caution = kToC(x?.caution_k);
  const vibOk = x?.max_vibration_ips == null || x?.vibration_envelope_ips == null || x.max_vibration_ips <= x.vibration_envelope_ips;
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-sm shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5">
        <span className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-primary">assessment</span> Sortie Telemetry Summary
        </span>
        <span className="text-label-caps font-label-caps text-outline text-[10px]">{active ? "IN FLIGHT" : x?.audit_complete ? "AUDIT COMPLETE" : "--"}</span>
      </div>
      <div className="bg-[#F8FAFC] border border-outline-variant/70 p-2.5 rounded-lg flex items-center justify-between">
        <div>
          <span className="text-label-caps font-label-caps text-outline block text-[10px]">PROPULSION HEALTH DELTA</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-telemetry-lg font-telemetry-lg font-bold text-on-surface">{fmt(x?.health_start)}</span>
            <span className="material-symbols-outlined text-[14px] text-outline">arrow_forward</span>
            <span className={`text-telemetry-xl font-telemetry-xl font-bold ${delta != null && delta < -2 ? "text-amber-600" : "text-emerald-700"}`}>{fmt(x?.health_end)}</span>
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-telemetry-sm font-telemetry-sm font-bold border ${delta != null && delta < -2 ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-emerald-100 text-emerald-900 border-emerald-300"}`}>{signed(delta, 0)} pts</span>
          <span className="text-[10px] text-outline block mt-0.5">{delta != null && delta < -2 ? "Degradation noted" : "No degradation"}</span>
        </div>
      </div>
      <div className="border border-outline-variant/60 rounded-lg p-2.5 bg-amber-50/40">
        <div className="flex items-center justify-between">
          <span className="text-label-caps font-label-caps text-amber-900 text-[10px]">TIME EXCEEDING LIMITS</span>
          <span className="material-symbols-outlined text-amber-600 text-[16px]">timer</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-telemetry-xl font-telemetry-xl font-bold text-amber-900">{fmtHms(x?.time_above_caution_s ?? 0)}</span>
          <span className="text-telemetry-sm font-telemetry-sm text-amber-800 text-[11px]">{cyl ? `Cyl ${cyl}` : "CHT"} &gt; {fmt(caution)} °C</span>
        </div>
        <div className="w-full bg-amber-200 h-1.5 rounded-full mt-2 overflow-hidden">
          <div className="bg-amber-600 h-full" style={{ width: `${Math.min(((x?.time_above_caution_s ?? 0) / Math.max(duration, 1)) * 100, 100)}%` }} />
        </div>
      </div>
      <div>
        <span className="text-label-caps font-label-caps text-outline block text-[10px] mb-1.5 uppercase">Peak Observed Extremes</span>
        <div className="grid grid-cols-2 gap-2 text-body-sm">
          <Peak label="PEAK CHT" value={`${fmt(kToC(x?.peak_cht?.value_k), 1)} °C`} cls="text-amber-700" note={x?.peak_cht?.cylinder ? `Cyl ${x.peak_cht.cylinder} @ ${fmtHms(x.peak_cht.t_s)}` : "--"} />
          <Peak label="PEAK EGT" value={`${fmt(kToC(x?.peak_egt?.value_k))} °C`} cls="text-rose-700" note={x?.peak_egt?.cylinder ? `Exhaust Stk ${x.peak_egt.cylinder}` : "--"} />
          <Peak label="PEAK MAP" value={`${fmt(kpaToInHg(x?.peak_map?.value_kpa), 1)} inHg`} cls="text-on-surface" note={x?.peak_map?.segment ? `${x.peak_map.segment.replace(/_/g, " ").replace(/^\w/, (c: string) => c.toUpperCase())} Boost` : "--"} />
          <Peak label="MAX VIBRATION" value={`${fmt(x?.max_vibration_ips, 2)} ips`} cls="text-on-surface" note={vibOk ? "RMS Nominal" : "Above Envelope"} noteCls={vibOk ? "text-emerald-700" : "text-[#C2410C]"} />
        </div>
      </div>
    </div>
  );
}

function Peak({ label, value, cls, note, noteCls = "text-outline" }: { label: string; value: string; cls: string; note: string; noteCls?: string }) {
  return (
    <div className="p-2 bg-surface-container-low rounded border border-outline-variant/60">
      <span className="text-[10px] text-outline font-label-caps block">{label}</span>
      <span className={`text-telemetry-md font-telemetry-md font-bold ${cls}`}>{value}</span>
      <span className={`text-[10px] block ${noteCls}`}>{note}</span>
    </div>
  );
}

function Chronology({ events, pos, seek, runId }: { events: any[]; pos: number; seek: (s: number) => void; runId: string }) {
  const current = [...events].reverse().find((e) => e.t_s <= pos);
  const [rc, setRc] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const runRc = async () => {
    setBusy(true);
    setErr(null);
    try {
      setRc(await request<any>(`/api/replay/${runId}/root-cause`, { method: "POST", body: JSON.stringify({ t_s: pos }) }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const red = (k: string) => k === "LIMIT_WARNING" || k === "THRESHOLD";
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-sm shadow-sm flex flex-col flex-1">
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5 mb-2">
        <span className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-primary">timeline</span> Key Events Chronology
        </span>
        <span className="text-[10px] text-outline font-telemetry-sm">{events.length} MARKERS</span>
      </div>
      <div className="space-y-2 overflow-y-auto flex-1 text-body-sm">
        {events.map((e, i) =>
          e === current && e.kind !== "PHASE" ? (
            <button key={i} onClick={() => seek(e.t_s)} className="w-full text-left p-2 rounded border-2 border-amber-500 bg-amber-50/70 transition-colors group flex items-start gap-2 ring-2 ring-amber-500/10">
              <span className="text-telemetry-sm font-telemetry-sm text-amber-900 font-bold bg-amber-200 px-1.5 py-0.5 rounded">{fmtHms(e.t_s)}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 text-[12px]">{e.title}</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                </div>
                <span className="text-amber-800 text-[11px] block font-telemetry-sm mt-0.5">{e.detail}</span>
              </div>
            </button>
          ) : (
            <button key={i} onClick={() => seek(e.t_s)} className={`w-full text-left p-2 rounded border hover:bg-[#F8FAFC] transition-colors group flex items-start gap-2 ${e === current ? "border-primary" : "border-outline-variant/60"}`}>
              <span className={`text-telemetry-sm font-telemetry-sm font-bold px-1.5 py-0.5 rounded transition-colors ${red(e.kind) ? "text-red-700 bg-red-100 group-hover:bg-red-600 group-hover:text-white" : "text-primary bg-primary/10 group-hover:bg-primary group-hover:text-white"}`}>{fmtHms(e.t_s)}</span>
              <div className="flex-1">
                <span className={`font-medium text-on-surface block text-[12px] ${red(e.kind) ? "group-hover:text-red-700" : "group-hover:text-primary"}`}>{e.title}</span>
                <span className="text-outline text-[11px] block">{e.detail}</span>
              </div>
            </button>
          ),
        )}
        {rc && (
          <div className="p-2 rounded border border-primary/40 bg-primary/5 text-[11px] font-body-sm text-on-surface">
            <strong>{rc.label}</strong> ({fmt(rc.confidence * 100, 1)}% @ T+{fmtHms(rc.t_s)}) — {rc.diagnosis}
          </div>
        )}
        {err && <div className="p-2 rounded border border-[#FECACA] bg-[#FEE2E2] text-[#B91C1C] text-[11px]">{err}</div>}
      </div>
      <div className="pt-2 border-t border-outline-variant/60 mt-2">
        <button onClick={runRc} disabled={busy} className="w-full h-8 rounded border border-primary text-primary hover:bg-primary hover:text-white transition-colors text-[11px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
          <span className="material-symbols-outlined text-[15px]">psychology</span>
          <span>{busy ? "Analysing…" : "Run AI Twin Root Cause Analysis"}</span>
        </button>
      </div>
    </div>
  );
}
