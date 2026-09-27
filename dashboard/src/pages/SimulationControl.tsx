/* Simulation Control — rebuilt from the Stitch "Simulation Control" screen (8_simcontrol.html); bound to /api/sim/*. */
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError, request } from "../lib/api";
import { useEngineConfig } from "../lib/useEngineConfig";
import { useLiveSocket } from "../lib/useLiveSocket";
import { usePoll } from "../lib/usePoll";
import { fmt, fmtDuration, fmtHms, kpaToBar, kToC, signed } from "../lib/units";

const PARAM_LABELS: Record<string, string> = {
  cooling_effectiveness: "Radiator Heat Transfer Coeff (U·A)",
  volumetric_efficiency_factor: "Volumetric Air Efficiency (η_v)",
};

const CHANNEL_LABELS: Record<string, string> = {
  oil_temp_k: "Oil Temp", oil_pressure_kpa: "Oil Press",
};
function channelLabel(c: string): string {
  const m = /^(cht|egt)_(\d)_k$/.exec(c);
  if (m) return m[1] === "cht" ? `CHT-0${m[2]}` : `EGT-0${m[2]}`;
  return CHANNEL_LABELS[c] ?? c;
}

const pct = (v: number | null | undefined, d = 0) => (v == null ? "--" : `${fmt(v * 100, d)}%`);

export default function SimulationControl() {
  const { session: auth } = useAuth();
  const live = useLiveSocket();
  const row = live.latest && live.latest.mode === "LIVE" ? live.latest : null;
  const sim = usePoll(() => request<any>("/api/sim/state"), 1000);
  const s = sim.data;
  const running = !!s?.running;
  const log = usePoll(() => (running ? request<any>("/api/sim/response-log") : Promise.resolve(null)), 2000, [running, s?.run_id]).data;
  const cont = usePoll(() => (running ? request<any>("/api/sim/contingency") : Promise.resolve(null)), 10000, [running, s?.run_id, s?.active_faults]);
  const engine = useEngineConfig(row?.context?.engine_id);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coolingSev, setCoolingSev] = useState<number | null>(null);

  async function call(key: string, path: string, method = "POST", body?: unknown) {
    setBusy(key);
    setError(null);
    try {
      const r = await request<any>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
      if (r && "cards" in r) sim.setData(r);
      else sim.refresh();
      cont.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : String(e));
    } finally {
      setBusy(null);
    }
  }

  function restart() {
    if (running) return call("restart", "/api/sim/control", "POST", { action: "restart" });
    return call("restart", "/api/live/start", "POST", {
      mission_id: s?.mission_id ?? "isr_18h_endurance", speed: 1, tail_id: auth?.tail_id ?? "UAV-07", atmosphere: s?.atmosphere ?? "isa",
    });
  }

  const hil = s?.hil_bus;
  // SocketCAN interface name (e.g. vcan0), or "virtual" for the in-process bus fallback off Linux.
  const busName = hil?.interface === "socketcan" ? hil.channel : hil?.interface ?? "vcan0";
  const warps: number[] = s?.time_warp_options ?? [1, 2, 5, 10, 20];
  const cards: any[] = s?.cards ?? s?.catalog?.cards ?? [];
  const stateChip = !running
    ? { text: "STOPPED", cls: "text-on-surface-variant", dot: "bg-outline" }
    : s.paused
      ? { text: `PAUSED (${busName} bus held)`, cls: "text-on-surface-variant", dot: "bg-outline" }
      : { text: `RUNNING (${busName} bus active)`, cls: "text-primary", dot: "bg-primary animate-pulse" };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-y-auto bg-background p-space-md gap-space-md">
          {/* TOP CONTROL BAR & HARDWARE-IN-THE-LOOP (HiL) STATUS */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-sm shrink-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-center">
              <div className="lg:col-span-5 flex flex-col gap-space-xs border-r border-outline-variant pr-space-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">SIMULATION STATE</span>{" "}
                    <span className={`px-2 py-0.5 rounded text-telemetry-sm font-telemetry-sm bg-surface-container-highest font-bold flex items-center gap-1 ${stateChip.cls}`}>
                      <span className={`w-2 h-2 rounded-full ${stateChip.dot}`} /> {stateChip.text}
                    </span>
                  </div>{" "}
                  <span className="font-telemetry-sm text-telemetry-sm text-outline">Loop: {running ? `${fmt(s.loop_ms, 1)}ms` : "--"}</span>
                </div>{" "}
                <div className="flex items-center gap-space-xs mt-1">
                  <button
                    className="px-space-md h-9 bg-primary text-on-primary rounded font-body-md text-body-md font-semibold flex items-center gap-space-xs hover:bg-surface-tint active:scale-[0.98] transition-all shadow-xs disabled:opacity-50"
                    disabled={!running || !!busy}
                    onClick={() => call("pause", "/api/sim/control", "POST", { action: s.paused ? "resume" : "pause" })}
                  >
                    <span className="material-symbols-outlined text-[16px]">{s?.paused ? "play_arrow" : "pause"}</span> {s?.paused ? "Resume" : "Pause"}
                  </button>{" "}
                  <button
                    className="px-space-md h-9 border border-error text-error bg-surface rounded font-body-md text-body-md font-semibold flex items-center gap-space-xs hover:bg-error-container active:scale-[0.98] transition-all disabled:opacity-50"
                    disabled={!running || !!busy}
                    onClick={() => call("stop", "/api/sim/control", "POST", { action: "stop" })}
                  >
                    <span className="material-symbols-outlined text-[16px]">stop</span> Stop
                  </button>{" "}
                  <button
                    className="px-space-md h-9 border border-outline-variant bg-surface text-on-surface rounded font-body-md text-body-md font-semibold flex items-center gap-space-xs hover:bg-surface-container active:scale-[0.98] transition-all disabled:opacity-50"
                    disabled={!!busy}
                    onClick={restart}
                    title={running ? "Restart the mission from T+0" : "Start the mission"}
                  >
                    <span className="material-symbols-outlined text-[16px]">restart_alt</span> Restart
                  </button>{" "}
                  <button
                    className="px-space-md h-9 border border-outline-variant bg-surface text-on-surface rounded font-body-md text-body-md font-semibold flex items-center gap-space-xs hover:bg-surface-container active:scale-[0.98] transition-all disabled:opacity-50"
                    title="Execute single cycle"
                    disabled={!running || !!busy}
                    onClick={() => call("step", "/api/sim/control", "POST", { action: "step", step_s: s.loop_ms / 1000 })}
                  >
                    <span className="material-symbols-outlined text-[16px]">redo</span> Step Forward
                  </button>
                </div>
              </div>{" "}
              <div className="lg:col-span-4 flex flex-col gap-space-xs pr-space-md border-r border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">TIME ACCELERATION</span>{" "}
                  <span className="font-telemetry-sm text-telemetry-sm text-primary font-bold">
                    WARP: {running ? `${fmt(s.speed, 1)}× ${s.speed === 1 ? "REAL-TIME" : "ACCELERATED"}` : "--"}
                  </span>
                </div>{" "}
                <div className="inline-flex rounded border border-outline-variant bg-surface-container p-0.5" role="group">
                  {warps.map((w, i) => {
                    const on = running && s.speed === w;
                    return (
                      <span key={w} className="contents">
                        <button
                          className={`flex-1 py-1 text-center font-telemetry-sm text-telemetry-sm ${on ? "bg-surface text-primary font-bold rounded shadow-xs" : "text-on-surface-variant hover:text-on-surface"}`}
                          disabled={!running || !!busy}
                          onClick={() => call("warp", "/api/sim/time-warp", "POST", { speed: w })}
                        >
                          {w}×
                        </button>
                        {i < warps.length - 1 ? " " : ""}
                      </span>
                    );
                  })}
                </div>{" "}
                <div className="flex items-center gap-1 overflow-x-auto pt-1 no-scrollbar">
                  {Object.entries<any>(s?.atmospheres ?? {}).map(([k, a]) => (
                    <span key={k} className="contents">
                      <button
                        className={`px-2 py-0.5 rounded-full text-telemetry-sm font-telemetry-sm shrink-0 ${(s?.atmosphere ?? "isa") === k ? "bg-primary-fixed text-on-primary-fixed border border-primary font-medium" : "bg-surface-container text-on-surface-variant hover:bg-surface-variant"}`}
                        disabled={!running || !!busy}
                        onClick={() => call("atmo", "/api/sim/atmosphere", "POST", { preset: k })}
                      >
                        {k === "isa" && s?.mission_origin === "plan"
                          ? `Planned Env (ISA ${s.mission_isa_deviation_k >= 0 ? "+" : ""}${fmt(s.mission_isa_deviation_k)})`
                          : a.label}
                      </button>{" "}
                    </span>
                  ))}
                </div>
              </div>{" "}
              <div className="lg:col-span-3 flex flex-col justify-between bg-surface-container-low p-space-sm rounded border border-outline-variant">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-secondary">cable</span> HIL CAN-BUS 0
                  </span>{" "}
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-surface-container-highest text-secondary font-bold">MIL-SPEC</span>
                </div>{" "}
                <div className="font-telemetry-sm text-telemetry-sm text-on-surface space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Interface:</span>{" "}
                    <span className="font-bold">{hil ? `${busName} · ${fmt(hil.bitrate_bps / 1e6)} Mbps` : "--"}</span>
                  </div>{" "}
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Throughput:</span>{" "}
                    <span className={`font-bold ${hil?.dropped_frames ? "text-error" : "text-secondary"}`}>
                      {hil?.frames_per_s != null ? `${fmt(hil.frames_per_s)} frames/sec (${fmt(hil.dropped_frames)} drops)` : "--"}
                    </span>
                  </div>{" "}
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">HMAC-SHA256:</span>{" "}
                    <span className={`font-bold ${hil && !hil.hmac_verified && hil.hmac_failed ? "text-error" : "text-primary"}`}>
                      {!hil ? "--" : hil.hmac_verified ? "OK / Verified" : hil.hmac_failed ? `FAIL (${hil.hmac_failed})` : "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {error && <p className="mt-space-xs font-telemetry-sm text-telemetry-sm text-error">{error}</p>}
          </section>{" "}
          {/* MAIN SPLIT WORKSPACE */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-space-md min-h-0 overflow-hidden">
            <section className="lg:col-span-8 flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="p-space-md border-b border-outline-variant flex items-center justify-between bg-surface-container-low shrink-0">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">electric_bolt</span>
                  </div>{" "}
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">Fault Injection Matrix</h2>{" "}
                    <p className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">Dynamic Hardware-in-the-Loop perturbation framework · {cards.length} subsystem inject vectors</p>
                  </div>
                </div>{" "}
                <div className="flex items-center gap-space-xs">
                  {s?.active_faults > 0 ? (
                    <span className="px-2 py-1 rounded text-telemetry-sm font-telemetry-sm bg-tertiary-container text-on-tertiary-container font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed animate-ping" /> {s.active_faults} FAULT{s.active_faults > 1 ? "S" : ""} ACTIVE
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded text-telemetry-sm font-telemetry-sm bg-surface-container text-on-surface-variant font-bold">NO FAULTS ACTIVE</span>
                  )}{" "}
                  <button
                    className="px-space-sm h-8 border border-outline-variant bg-surface rounded text-on-surface font-body-sm text-body-sm hover:bg-surface-container transition-colors disabled:opacity-50"
                    disabled={!running || !s?.active_faults || !!busy}
                    onClick={() => call("reset", "/api/sim/faults/reset")}
                  >
                    Reset All Injections
                  </button>
                </div>
              </div>{" "}
              <div className="flex-1 overflow-y-auto p-space-md grid grid-cols-1 md:grid-cols-2 gap-space-dense">
                {cards.map((c) => (
                  <FaultCard
                    key={c.id}
                    c={c}
                    row={row}
                    engine={engine}
                    running={running}
                    busy={busy === `card-${c.id}`}
                    coolingSev={coolingSev}
                    setCoolingSev={setCoolingSev}
                    onInject={() => call(`card-${c.id}`, "/api/sim/faults", "POST", { card_id: c.id, ...(c.severity_range && coolingSev != null ? { severity: coolingSev } : {}) })}
                    onClear={() => call(`card-${c.id}`, `/api/sim/faults/${c.fault_id}`, "DELETE")}
                  />
                ))}
              </div>
            </section>{" "}
            <ResponseLog log={log} running={running} cont={cont.data} engine={engine} busy={busy} onApply={(cap) => call("cont", "/api/sim/contingency", "POST", { throttle_cap: cap })} />
          </div>
        </div>
      </div>
    </div>
  );
}

function cardLines(c: any, row: any, engine: any): { detail: string; foot: string } {
  const m = row?.measured ?? {};
  const deg = row?.degradation_state ?? {};
  const res = row?.residuals ?? {};
  const nres = row?.normalized_residuals ?? {};
  const target = c.live_target ?? c.target;
  const sev = c.live_severity ?? c.severity ?? 0;
  const ramp = c.live_ramp_s ?? c.ramp_duration_s ?? 0;
  const profile = String(c.live_profile ?? c.profile ?? "ramp");
  const prof = profile[0].toUpperCase() + profile.slice(1);
  const cyl = typeof target === "number" ? target + 1 : null;
  switch (c.fault_type) {
    case "cooling_degradation":
      return { detail: "", foot: `Cooling eff: ${fmt(deg.cooling_effectiveness, 2)}` };
    case "injector_abnormality":
      return {
        detail: `Target: Injector-0${cyl} · Profile: ${prof} ${signed((c.extra?.direction ?? -1) * sev * 100, 0)}% Mass`,
        foot: `Flow coeff: ${fmt(deg[`injector_flow_coeff_${target}`], 2)}`,
      };
    case "misfire":
      return {
        detail: `Target: Cyl ${cyl} · Dual-plug failover active · Duty: ${fmt(sev * 100)}% cycle`,
        foot: `EGT-0${cyl}: ${fmt(kToC(m[`egt_${cyl}_k`]))} °C`,
      };
    case "lubrication_issue":
      return {
        detail: `Pressure delta: ${signed(kpaToBar(res.oil_pressure_kpa), 2)} bar · Temp delta: ${signed(res.oil_temp_k, 1)}°C`,
        foot: `Oil P: ${fmt(kpaToBar(m.oil_pressure_kpa), 2)} bar`,
      };
    case "sensor_drift": {
      const max = c.extra?.max_drift ?? 0;
      return {
        detail: `Bias: +${fmt(ramp > 0 ? (max * sev) / (ramp / 60) : 0, 2)}°C / min · Target: ${channelLabel(String(target))}`,
        foot: `Kalman residual: ${signed(nres[String(target)], 1)}σ`,
      };
    }
    case "sensor_dropout": {
      const synth = (row?.synthesized_channels ?? []).includes(target);
      return {
        detail: `Target: ${channelLabel(String(target))} · Output: ${c.active ? "NaN (open circuit)" : `${fmt(kToC(m[String(target)]))} °C`}`,
        foot: `Failsafe: Twin Synth${synth ? " (active)" : ""}`,
      };
    }
    case "combustion_instability":
      return {
        detail: `Severity: ${fmt(sev * 100)}% · Profile: ${prof} · Combustion idx: ${fmt(row?.subsystem_index?.combustion)}`,
        foot: `Throttle: ${pct(row?.context?.throttle)}`,
      };
    case "overheating_trend": {
      const chts = [1, 2, 3, 4].map((i) => m[`cht_${i}_k`]).filter((v) => v != null);
      const max = chts.length ? Math.max(...chts) : null;
      const lim = engine?.limits?.max_cht_k;
      return {
        detail: `Max CHT: ${fmt(kToC(max))} °C · Limit: ${fmt(kToC(lim))} °C · Ramp: ${fmtDuration(ramp)}`,
        foot: `Margin: ${max != null && lim ? fmt(lim - max, 1) : "--"} °C`,
      };
    }
    case "abnormal_vibration": {
      const one = (row?.vibration_spectrum ?? []).find((o: any) => o.order === 1.0);
      return {
        detail: `1.0× order: ${fmt(one?.frequency_hz, 1)} Hz · Amplitude: ${fmt(one?.velocity_ips, 2)} IPS`,
        foot: `Sensor: ${engine?.vibration?.sensor_label?.split(" (")[0] ?? "--"}`,
      };
    }
    case "alternator_degradation":
      return {
        detail: `Bus: ${fmt(m.alternator_voltage_v, 1)}V (Nom: ${fmt(engine?.electrical?.nominal_bus_voltage_v ?? 28, 0)}V) · SoC: ${pct(m.battery_soc)}`,
        foot: `Alternator: ${fmt(m.alternator_current_a, 1)} A`,
      };
    default:
      return { detail: `Severity: ${fmt(sev * 100)}% · Profile: ${prof}`, foot: "" };
  }
}

function FaultCard({ c, row, engine, running, busy, coolingSev, setCoolingSev, onInject, onClear }: {
  c: any; row: any; engine: any; running: boolean; busy: boolean; coolingSev: number | null; setCoolingSev: (v: number) => void; onInject: () => void; onClear: () => void;
}) {
  const n = String(c.id).padStart(2, "0");
  const { detail, foot } = cardLines(c, row, engine);
  const range: [number, number] | null = c.severity_range ?? null;

  const slider = range && (() => {
    const cur = c.active ? c.current_severity ?? 0 : coolingSev ?? c.severity;
    const target = c.active ? c.live_severity : cur;
    const [lo, hi] = range;
    const setFrom = (e: React.MouseEvent<HTMLDivElement>) => {
      if (c.active) return;
      const r = e.currentTarget.getBoundingClientRect();
      const v = Math.min(hi, Math.max(lo, ((e.clientX - r.left) / r.width) * hi));
      setCoolingSev(Math.round(v * 100) / 100);
    };
    return (
      <div className="mt-space-sm space-y-1 bg-surface-container-lowest p-space-xs rounded border border-outline-variant">
        <div className="flex justify-between font-telemetry-sm text-telemetry-sm">
          <span className="text-on-surface-variant">Blockage Ratio:</span>{" "}
          <span className={`font-bold ${c.active ? "text-tertiary" : "text-on-surface"}`}>
            {fmt(cur * 100)}%{c.active && target > cur + 0.005 ? ` → ${fmt(target * 100)}%` : ""} (Ramp: {fmt(c.live_ramp_s ?? c.ramp_duration_s)}s)
          </span>
        </div>{" "}
        <div className={`w-full bg-surface-container h-2 rounded-full overflow-hidden ${c.active ? "" : "cursor-pointer"}`} onClick={setFrom} title={c.active ? undefined : "Click to set the injected blockage ratio"}>
          <div className={`${c.active ? "bg-tertiary" : "bg-primary"} h-full rounded-full`} style={{ width: `${(cur / hi) * 100}%` }} />
        </div>{" "}
        <div className="flex justify-between text-[10px] font-telemetry-sm text-outline">
          <span>{fmt(lo * 100)}%</span> <span>{fmt(((lo + hi) / 2) * 100)}%</span> <span>{fmt(hi * 100)}%</span>
        </div>
      </div>
    );
  })();

  if (c.active) {
    return (
      <div className="bg-surface border-2 border-tertiary rounded-lg p-space-sm flex flex-col justify-between shadow-xs bg-gradient-to-br from-surface to-surface-container-low">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-telemetry-sm text-telemetry-sm font-bold text-tertiary flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">{c.icon}</span> {n} · {c.title.toUpperCase()}
            </span>{" "}
            <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-tertiary text-on-tertiary font-bold tracking-wide animate-pulse">ACTIVE · {pct(c.current_severity)}</span>
          </div>{" "}
          <p className="font-body-sm text-body-sm text-on-surface-variant">{c.description}</p>{" "}
          {slider ?? <div className="mt-space-sm font-telemetry-sm text-telemetry-sm text-on-surface-variant bg-surface-container-low p-1.5 rounded">{detail}</div>}
        </div>{" "}
        <div className="mt-space-sm flex items-center justify-between pt-space-xs border-t border-outline-variant">
          <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">Injected: T+{fmtHms(c.injected_t)}</span>{" "}
          <button className="px-space-md h-7 rounded border border-error text-error bg-surface hover:bg-error-container font-telemetry-sm text-telemetry-sm font-bold transition-all disabled:opacity-50" disabled={busy} onClick={onClear}>
            Clear Fault
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-surface border border-outline-variant rounded-lg p-space-sm flex flex-col justify-between hover:border-primary transition-colors">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-telemetry-sm text-telemetry-sm font-bold text-on-surface flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-primary">{c.icon}</span> {n} · {c.title.toUpperCase()}
          </span>{" "}
          <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-surface-container text-on-surface-variant">STANDBY</span>
        </div>{" "}
        <p className="font-body-sm text-body-sm text-on-surface-variant">{c.description}</p>{" "}
        {slider ?? <div className="mt-space-sm font-telemetry-sm text-telemetry-sm text-on-surface-variant bg-surface-container-low p-1.5 rounded">{detail}</div>}
      </div>{" "}
      <div className="mt-space-sm flex items-center justify-between pt-space-xs border-t border-outline-variant">
        <span className="font-telemetry-sm text-telemetry-sm text-outline">{foot}</span>{" "}
        <button
          className="px-space-md h-7 rounded bg-primary text-on-primary hover:bg-surface-tint font-telemetry-sm text-telemetry-sm font-bold shadow-xs active:scale-[0.98] transition-all disabled:opacity-50"
          disabled={!running || busy}
          onClick={onInject}
        >
          Inject
        </button>
      </div>
    </div>
  );
}

const EVENT_STYLE: Record<string, { dot: string; text: string; tag: string }> = {
  INJECTED: { dot: "bg-tertiary", text: "text-tertiary", tag: "INJECTED" },
  DETECTED: { dot: "bg-error", text: "text-error", tag: "DETECTED" },
  AI_DIAGNOSIS: { dot: "bg-primary", text: "text-primary", tag: "AI DIAGNOSIS" },
  RUL_UPDATE: { dot: "bg-on-surface-variant", text: "text-on-surface", tag: "RUL UPDATE" },
  CLEARED: { dot: "bg-secondary", text: "text-secondary", tag: "CLEARED" },
  THRESHOLD: { dot: "bg-error", text: "text-error", tag: "THRESHOLD" },
  LIMIT_WARNING: { dot: "bg-tertiary", text: "text-tertiary", tag: "LIMIT WARNING" },
};

/** "3m 12s" */
function minSec(s: number): string {
  const t = Math.max(0, Math.round(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  return h ? `${h}h ${m}m` : m ? `${m}m ${t % 60}s` : `${t}s`;
}

function utc(ts: number): string {
  return `${new Date(ts * 1000).toISOString().slice(11, 19)} UTC`;
}

function ResponseLog({ log, running, cont, engine, busy, onApply }: { log: any; running: boolean; cont: any; engine: any; busy: string | null; onApply: (cap: number | null) => void }) {
  const inn = log?.innovation;
  const exceeded = inn && inn.value >= inn.threshold;
  const params = (log?.parameters ?? []).filter((p: any) => PARAM_LABELS[p.name]);
  // Oldest-first for the timeline, so detection latency can reference the preceding injection.
  const incidents: any[] = [...(log?.incidents ?? [])].reverse();
  const withLatency = incidents.map((e, i) => {
    if (e.kind !== "DETECTED") return e;
    const inj = [...incidents.slice(0, i)].reverse().find((x) => x.kind === "INJECTED");
    return { ...e, latency_s: inj ? e.t_s - inj.t_s : null };
  });
  const shown = withLatency.slice(-8); // chronological, as in the Stitch timeline
  const bsfcRef = 400; // bar full-scale, g/kWh
  const limitC = kToC(engine?.limits?.max_cht_k);

  return (
    <section className="lg:col-span-4 flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="p-space-md border-b border-outline-variant bg-surface-container-low shrink-0 flex items-center justify-between">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Digital Twin Response Log</h2>{" "}
          <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">Live telemetry observer & isolation telemetry</span>
        </div>{" "}
        <span className="material-symbols-outlined text-primary text-[20px]">deployed_code_history</span>
      </div>{" "}
      <div className="flex-1 overflow-y-auto p-space-md space-y-space-md">
        <div className="bg-surface border border-outline-variant rounded-lg p-space-sm space-y-space-xs">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant">RESIDUAL KALMAN INNOVATION</span>{" "}
            {!inn ? null : !log.detection_armed ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-surface-container text-on-surface-variant font-bold">ARMING · ESTIMATOR CONVERGING</span>
            ) : exceeded ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-tertiary-container text-on-tertiary-container font-bold">THRESHOLD EXCEEDED</span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-surface-container-high text-secondary font-bold">WITHIN THRESHOLD</span>
            )}
          </div>{" "}
          <div className="flex items-baseline justify-between">
            <div>
              <span className={`font-telemetry-xl text-telemetry-xl font-bold ${exceeded ? "text-tertiary" : "text-on-surface"}`}>{fmt(inn?.value, 2)}</span>{" "}
              <span className="font-telemetry-sm text-telemetry-sm text-outline">/ 1.00</span>
            </div>{" "}
            <div className="text-right font-telemetry-sm text-telemetry-sm">
              <span className="text-outline">Baseline:</span> <span className="text-on-surface font-semibold">{fmt(inn?.baseline, 2)}</span>{" "}
              <span className="text-tertiary font-bold ml-1">(Lim {fmt(inn?.threshold, 2)})</span>
            </div>
          </div>{" "}
          <div className="relative w-full bg-surface-container h-3 rounded-full overflow-hidden">
            <div className="absolute top-0 bottom-0 w-[2px] bg-on-surface z-10" style={{ left: `${(inn?.threshold ?? 0) * 100}%` }} title={`Alarm Threshold: ${fmt(inn?.threshold, 2)}`} />{" "}
            <div className={`${exceeded ? "bg-tertiary" : "bg-primary"} h-full rounded-full transition-all duration-500`} style={{ width: `${(inn?.value ?? 0) * 100}%` }} />
          </div>{" "}
          <div className="flex justify-between text-[9px] font-telemetry-sm text-outline">
            <span>0.00 (Nominal)</span> <span className="text-on-surface font-semibold">Alarm: {fmt(inn?.threshold, 2)}</span> <span>1.00 (Divergence)</span>
          </div>
        </div>{" "}
        <div className="bg-surface border border-outline-variant rounded-lg p-space-sm space-y-space-xs">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant">MODEL PARAMETERS CONVERGENCE</span>{" "}
            <span className="font-telemetry-sm text-telemetry-sm text-secondary font-bold">{log ? `${log.estimator.name}: ${fmt(log.estimator.updates)} updates` : "--"}</span>
          </div>{" "}
          <div className="space-y-1.5 text-telemetry-sm font-telemetry-sm">
            {params.map((p: any) => {
              const off = Math.abs(p.delta) >= 0.03;
              return (
                <div key={p.name}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-on-surface">{PARAM_LABELS[p.name]}</span>{" "}
                    <span className={`font-bold ${off ? "text-tertiary" : "text-secondary"}`}>
                      {fmt(p.value, 2)} ({off ? `${signed(p.delta * 100, 1)}%` : "Nominal"})
                    </span>
                  </div>{" "}
                  <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                    <div className={`${off ? "bg-tertiary" : "bg-secondary"} h-full rounded-full`} style={{ width: `${Math.min(100, p.value * 100)}%` }} />
                  </div>
                </div>
              );
            })}{" "}
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-on-surface">Brake Specific Fuel Consumption</span>{" "}
                <span className="text-on-surface font-bold">{log?.bsfc_g_per_kwh != null ? `${fmt(log.bsfc_g_per_kwh)} g/kWh` : "--"}</span>
              </div>{" "}
              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, ((log?.bsfc_g_per_kwh ?? 0) / bsfcRef) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>{" "}
        <div className="space-y-space-sm">
          <span className="font-label-caps text-label-caps text-on-surface-variant">INCIDENT & ISOLATION TIMELINE</span>{" "}
          <div className="border-l-2 border-outline-variant pl-space-md space-y-space-md ml-1.5">
            {shown.map((e, i) => {
              const st = EVENT_STYLE[e.kind] ?? EVENT_STYLE.RUL_UPDATE;
              return (
                <div key={`${e.t_s}-${i}`} className="relative">
                  <div className={`absolute -left-[21px] top-0.5 w-3 h-3 rounded-full ${st.dot} border-2 border-surface`} />{" "}
                  <div className="flex items-center justify-between">
                    <span className={`font-telemetry-sm text-telemetry-sm font-bold ${st.text}`}>[{st.tag}]</span>{" "}
                    <span className="font-telemetry-sm text-telemetry-sm text-outline">{utc(e.wall_ts)}</span>
                  </div>{" "}
                  <p className="font-body-sm text-body-sm text-on-surface font-medium mt-0.5">{e.title}</p>{" "}
                  <EventFoot e={e} />
                </div>
              );
            })}
            {log && shown.length === 0 && <p className="font-body-sm text-body-sm text-on-surface-variant">No incidents this sortie. Inject a fault to observe the twin's response.</p>}
            {!running && <p className="font-body-sm text-body-sm text-on-surface-variant">No session running.</p>}
          </div>
        </div>{" "}
        <div className="pt-space-xs border-t border-outline-variant">
          <span className="font-label-caps text-label-caps text-on-surface-variant mb-space-xs block">RECOMMENDED CONTINGENCY</span>{" "}
          <div className="bg-surface-container-low p-space-sm rounded border border-outline-variant flex items-center justify-between">
            <div>
              <div className="font-body-md text-body-md font-semibold text-on-surface">
                {!cont ? "Evaluating…" : cont.applied_cap != null ? `Throttle Limit ${pct(cont.applied_cap)} (Applied)` : cont.needed ? `Throttle Limit ${pct(cont.throttle_cap)} (Cruise)` : "No Throttle Limit Required"}
              </div>{" "}
              <div className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">
                {!cont
                  ? "Forward-simulating the twin over the next 15 min"
                  : cont.needed || cont.applied_cap != null
                    ? `Prevents CHT escalation beyond ${fmt(limitC)}°C limit`
                    : `Predicted max CHT ${fmt(kToC(cont.predicted_max_cht_k))}°C within ${fmt(limitC)}°C limit`}
              </div>
            </div>{" "}
            {cont?.applied_cap != null ? (
              <button className="px-space-sm h-8 border border-outline-variant bg-surface text-on-surface rounded font-body-sm text-body-sm font-bold hover:bg-surface-container transition-all disabled:opacity-50" disabled={!!busy} onClick={() => onApply(null)}>
                Remove
              </button>
            ) : (
              <button
                className="px-space-sm h-8 bg-primary text-on-primary rounded font-body-sm text-body-sm font-bold hover:bg-surface-tint transition-all disabled:opacity-50"
                disabled={!cont?.needed || !!busy}
                onClick={() => onApply(cont.throttle_cap)}
              >
                Apply
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function EventFoot({ e }: { e: any }) {
  if (e.kind === "DETECTED") {
    return e.latency_s != null ? (
      <div className="inline-block mt-1 px-1.5 py-0.5 bg-surface-container-high rounded text-[10px] font-telemetry-sm text-primary font-bold">Detection Latency: {minSec(e.latency_s)}</div>
    ) : null;
  }
  if (e.kind === "AI_DIAGNOSIS") {
    return (
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] font-telemetry-sm text-secondary font-bold">{e.detail}</span>{" "}
        {e.model && <span className="text-[10px] font-telemetry-sm text-outline">Model: {e.model}</span>}
      </div>
    );
  }
  if (e.kind === "RUL_UPDATE") {
    return <div className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm font-bold ${e.delta_hours < 0 ? "bg-error-container text-on-error-container" : "bg-surface-container-high text-secondary"}`}>{e.detail}</div>;
  }
  return e.detail ? <span className="text-[10px] font-telemetry-sm text-outline">{e.detail}</span> : null;
}
