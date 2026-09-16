import { useState } from "react";
import { api } from "../lib/api";
import { Panel } from "../components/ui";

const ENGINE_FAULTS = [
  "misfire",
  "injector_abnormality",
  "cooling_degradation",
  "lubrication_issue",
  "combustion_instability",
  "overheating_trend",
  "abnormal_vibration",
  "alternator_degradation",
  "turbo_degradation",
];
const MISSIONS = ["isr_18h_endurance", "high_altitude_6km", "hot_weather_45c", "rapid_throttle_transitions"];

export default function DemoControl() {
  const [engineId] = useState("rotax914_like");
  const [missionId, setMissionId] = useState("isr_18h_endurance");
  const [speed, setSpeed] = useState(200);
  const [status, setStatus] = useState<string | null>(null);

  const [faultType, setFaultType] = useState("cooling_degradation");
  const [severity, setSeverity] = useState(0.6);

  async function startLive() {
    setStatus("starting…");
    try {
      const res = await api.startLive(engineId, missionId, speed);
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

  async function inject() {
    setStatus("injecting fault…");
    try {
      const res = await api.injectFault(faultType, severity);
      setStatus(`Injected ${(res as any).injected} at t=${(res as any).onset_s?.toFixed?.(0)}s`);
    } catch (e) {
      setStatus(String(e));
    }
  }

  return (
    <div className="space-y-4">
      <Panel title="Demo session">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Mission</label>
            <select value={missionId} onChange={(e) => setMissionId(e.target.value)} className="bg-gcs-bg border border-gcs-border rounded px-2 py-1">
              {MISSIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Playback speed ({speed}x)</label>
            <input type="range" min={1} max={1000} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          </div>
          <button onClick={startLive} className="bg-gcs-green/20 border border-gcs-green/50 text-gcs-green px-4 py-1.5 rounded text-sm">
            Start LIVE
          </button>
          <button onClick={stopLive} className="bg-gcs-red/20 border border-gcs-red/50 text-gcs-red px-4 py-1.5 rounded text-sm">
            Stop
          </button>
        </div>
      </Panel>

      <Panel title="Inject a fault into the running session">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Fault type</label>
            <select value={faultType} onChange={(e) => setFaultType(e.target.value)} className="bg-gcs-bg border border-gcs-border rounded px-2 py-1">
              {ENGINE_FAULTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Severity ({severity.toFixed(2)})</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
            />
          </div>
          <button onClick={inject} className="bg-gcs-amber/20 border border-gcs-amber/50 text-gcs-amber px-4 py-1.5 rounded text-sm">
            Inject fault
          </button>
        </div>
      </Panel>

      {status && (
        <Panel title="Status">
          <p className="text-sm text-slate-300">{status}</p>
        </Panel>
      )}
    </div>
  );
}
