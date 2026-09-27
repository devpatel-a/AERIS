import { useEffect, useState } from "react";
import { api, type TailStatus } from "../lib/api";
import { useLiveHistory } from "../lib/useLiveHistory";
import { ModeBadge, Panel, RiskPill } from "../components/ui";

const MISSIONS = ["isr_18h_endurance", "high_altitude_6km", "hot_weather_45c", "rapid_throttle_transitions"];
const SPEEDS = [1, 10, 50, 200, 1000];
const CYLINDERS = [1, 2, 3, 4];
const MEASUREMENT_CHANNELS = [
  "rpm", "map_kpa", "cht_1_k", "cht_2_k", "cht_3_k", "cht_4_k", "egt_1_k", "egt_2_k", "egt_3_k", "egt_4_k",
  "oil_pressure_kpa", "oil_temp_k", "coolant_temp_k", "fuel_flow_kg_s", "alternator_voltage_v",
  "alternator_current_a", "battery_soc", "vibration_rms_g",
];

const FAULT_META: Record<string, { icon: string; bg: string; fg: string; perCylinder: boolean }> = {
  misfire: { icon: "local_fire_department", bg: "bg-red-50", fg: "text-red-600", perCylinder: true },
  injector_abnormality: { icon: "local_gas_station", bg: "bg-blue-50", fg: "text-blue-600", perCylinder: true },
  cooling_degradation: { icon: "device_thermostat", bg: "bg-cyan-50", fg: "text-cyan-600", perCylinder: false },
  lubrication_issue: { icon: "opacity", bg: "bg-amber-50", fg: "text-amber-600", perCylinder: false },
  combustion_instability: { icon: "graphic_eq", bg: "bg-orange-50", fg: "text-orange-600", perCylinder: true },
  overheating_trend: { icon: "whatshot", bg: "bg-red-50", fg: "text-red-600", perCylinder: false },
  abnormal_vibration: { icon: "vibration", bg: "bg-purple-50", fg: "text-purple-600", perCylinder: false },
  alternator_degradation: { icon: "battery_alert", bg: "bg-slate-100", fg: "text-slate-600", perCylinder: false },
  turbo_degradation: { icon: "flash_on", bg: "bg-blue-50", fg: "text-blue-600", perCylinder: false },
};

export default function SimulationControl() {
  const { latest, connected } = useLiveHistory(1);
  const [fleet, setFleet] = useState<TailStatus[]>([]);
  const [tailId, setTailId] = useState<string>("");
  const [missionId, setMissionId] = useState("isr_18h_endurance");
  const [speed, setSpeed] = useState(200);
  const [status, setStatus] = useState<string | null>(null);

  const [faultTypes, setFaultTypes] = useState<{ engine: string[]; sensor: string[] }>({ engine: [], sensor: [] });
  const [advisories, setAdvisories] = useState<Record<string, any>[]>([]);
  const [severities, setSeverities] = useState<Record<string, number>>({});
  const [cylinderTargets, setCylinderTargets] = useState<Record<string, number | "all">>({});
  const [sensorType, setSensorType] = useState("sensor_drift");
  const [sensorChannel, setSensorChannel] = useState("cht_1_k");
  const [sensorSeverity, setSensorSeverity] = useState(0.6);

  useEffect(() => {
    api.fleetTable().then(setFleet).catch(() => {});
    api.faultTypes().then(setFaultTypes).catch(() => {});
    const load = () => api.advisories().then(setAdvisories).catch(() => {});
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);

  async function startLive() {
    setStatus("starting…");
    try {
      const res = await api.startLive("rotax914_like", missionId, speed, tailId || undefined);
      setStatus(`LIVE session started: ${(res as any).run_id}`);
    } catch (e) {
      setStatus(String(e));
    }
  }

  async function stopLive() {
    setStatus("stopping…");
    try {
      const res = await api.stopLive();
      setStatus(`Stopped. Saved to: ${(res as any).saved_path ?? "(no rows)"}`);
    } catch (e) {
      setStatus(String(e));
    }
  }

  async function injectEngineFault(faultType: string) {
    const severity = severities[faultType] ?? 0.6;
    const cyl = cylinderTargets[faultType];
    setStatus(`injecting ${faultType}…`);
    try {
      const res = await api.injectFault(faultType, severity, cyl && cyl !== "all" ? cyl : undefined);
      setStatus(`Injected ${(res as any).injected} at t=${(res as any).onset_s?.toFixed?.(0)}s`);
    } catch (e) {
      setStatus(String(e));
    }
  }

  async function injectSensorFault() {
    setStatus(`injecting ${sensorType} on ${sensorChannel}…`);
    try {
      const res = await api.injectFault(sensorType, sensorSeverity, sensorChannel);
      setStatus(`Injected ${(res as any).injected} at t=${(res as any).onset_s?.toFixed?.(0)}s`);
    } catch (e) {
      setStatus(String(e));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <ModeBadge mode={latest?.mode} connected={connected} />
        {latest?.t_s != null && <span className="font-mono text-xs text-ink-secondary">Sim clock: {latest.t_s.toFixed(0)}s</span>}
      </div>

      <Panel title="Simulation Control" subtitle="Master transport: mission profile, fleet tail, time acceleration">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-ink-muted mb-1 font-mono">Mission profile</label>
            <select value={missionId} onChange={(e) => setMissionId(e.target.value)} className="bg-canvas border border-border rounded-control px-2.5 py-1.5 text-sm font-mono text-ink">
              {MISSIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-ink-muted mb-1 font-mono">Fleet tail</label>
            <select value={tailId} onChange={(e) => setTailId(e.target.value)} className="bg-canvas border border-border rounded-control px-2.5 py-1.5 text-sm font-mono text-ink">
              <option value="">(unattributed)</option>
              {fleet.map((t) => (
                <option key={t.tail_id} value={t.tail_id}>
                  {t.tail_id} — {t.tail_number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-ink-muted mb-1 font-mono">Time acceleration</label>
            <div className="flex items-center gap-1 bg-canvas p-1 rounded-control border border-border">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                    s === speed ? "bg-surface text-primary shadow-card" : "text-ink-secondary hover:text-ink"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
          <button onClick={startLive} className="bg-status-normal-bg border border-status-normal/30 text-status-normal rounded-control px-4 py-1.5 text-sm font-semibold hover:bg-status-normal/10 transition-colors">
            Start LIVE
          </button>
          <button onClick={stopLive} className="bg-status-critical-bg border border-status-critical/30 text-status-critical rounded-control px-4 py-1.5 text-sm font-semibold hover:bg-status-critical/10 transition-colors">
            Stop
          </button>
        </div>
      </Panel>

      <Panel title="Telemetry Link" subtitle="Real link status (no physical CAN bus in this simulated rig)">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-canvas border border-border rounded-control px-3 py-2">
            <div className="text-[10px] uppercase text-ink-muted font-mono">Connection</div>
            <div className={`font-mono text-lg font-semibold ${connected ? "text-status-normal" : "text-status-critical"}`}>{connected ? "LINKED" : "OFFLINE"}</div>
          </div>
          <div className="bg-canvas border border-border rounded-control px-3 py-2">
            <div className="text-[10px] uppercase text-ink-muted font-mono">Stream Rate</div>
            <div className="font-mono text-lg font-semibold text-ink">7 Hz</div>
          </div>
          <div className="bg-canvas border border-border rounded-control px-3 py-2">
            <div className="text-[10px] uppercase text-ink-muted font-mono">Sim Speed</div>
            <div className="font-mono text-lg font-semibold text-ink">{speed}x</div>
          </div>
        </div>
      </Panel>

      <Panel title="Fault Injection Matrix" subtitle="9 engine faults + 1 sensor-fault card (4 sensor sub-types)">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {faultTypes.engine.map((f) => {
            const meta = FAULT_META[f] || { icon: "warning", bg: "bg-slate-100", fg: "text-slate-600", perCylinder: false };
            return (
              <div key={f} className="p-4 rounded-card border border-border hover:border-primary/50 transition-colors bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className={`w-9 h-9 rounded-control flex items-center justify-center ${meta.bg}`}>
                    <span className={`material-symbols-outlined text-[20px] ${meta.fg}`}>{meta.icon}</span>
                  </span>
                  {meta.perCylinder && (
                    <select
                      value={cylinderTargets[f] ?? "all"}
                      onChange={(e) => setCylinderTargets((prev) => ({ ...prev, [f]: e.target.value === "all" ? "all" : Number(e.target.value) }))}
                      className="bg-canvas border border-border rounded text-[11px] font-mono px-1.5 py-0.5"
                    >
                      <option value="all">All cyl</option>
                      {CYLINDERS.map((c) => (
                        <option key={c} value={c}>
                          Cyl {c}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="text-[13px] font-semibold text-ink capitalize">{f.replace(/_/g, " ")}</div>
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-ink-muted font-mono mb-1">
                    <span>Severity</span>
                    <span>{(severities[f] ?? 0.6).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={severities[f] ?? 0.6}
                    onChange={(e) => setSeverities((prev) => ({ ...prev, [f]: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <button
                  onClick={() => injectEngineFault(f)}
                  className="mt-3 w-full bg-canvas border border-border text-ink rounded-control px-3 py-1.5 text-xs font-semibold hover:border-primary/50 hover:text-primary transition-colors"
                >
                  Inject Fault
                </button>
              </div>
            );
          })}

          <div className="p-4 rounded-card border-2 border-primary/30 bg-blue-50/20 xl:col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-9 h-9 rounded-control flex items-center justify-center bg-purple-50">
                <span className="material-symbols-outlined text-[20px] text-purple-600">sensors_off</span>
              </span>
              <div className="text-[13px] font-semibold text-ink">Sensor Fault</div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select value={sensorType} onChange={(e) => setSensorType(e.target.value)} className="bg-canvas border border-border rounded text-[11px] font-mono px-1.5 py-1">
                {faultTypes.sensor.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("sensor_", "")}
                  </option>
                ))}
              </select>
              <select value={sensorChannel} onChange={(e) => setSensorChannel(e.target.value)} className="bg-canvas border border-border rounded text-[11px] font-mono px-1.5 py-1">
                {MEASUREMENT_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-between text-[10px] text-ink-muted font-mono mb-1">
              <span>Severity</span>
              <span>{sensorSeverity.toFixed(2)}</span>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={sensorSeverity} onChange={(e) => setSensorSeverity(Number(e.target.value))} className="w-full" />
            <button onClick={injectSensorFault} className="mt-3 w-full bg-primary text-white rounded-control px-3 py-1.5 text-xs font-semibold hover:bg-primary-hover transition-colors">
              Inject Sensor Fault
            </button>
          </div>
        </div>
      </Panel>

      <Panel title="Fault Detection Log" subtitle="Twin-raised advisories (subsystem, severity, message)">
        {advisories.length === 0 ? (
          <p className="text-sm text-ink-muted">No advisories recorded yet.</p>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead className="text-ink-muted uppercase tracking-wide">
              <tr>
                <th className="text-left py-1.5 font-medium">Time (s)</th>
                <th className="text-left py-1.5 font-medium">Subsystem</th>
                <th className="text-left py-1.5 font-medium">Severity</th>
                <th className="text-left py-1.5 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {advisories.slice(0, 15).map((a, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-1.5 text-ink">{a.t_s?.toFixed?.(0) ?? a.t_s}</td>
                  <td className="py-1.5 text-ink">{a.subsystem}</td>
                  <td className="py-1.5">
                    <RiskPill level={a.severity} />
                  </td>
                  <td className="py-1.5 text-ink-secondary font-sans">{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {status && (
        <Panel title="Status">
          <p className="text-sm text-ink-secondary font-mono">{status}</p>
        </Panel>
      )}
    </div>
  );
}
