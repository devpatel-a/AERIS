import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Panel, RiskPill } from "../components/ui";
import { LineChart } from "../components/aeris";

const PHASE_COLOR: Record<string, string> = {
  taxi: "#94A3B8",
  takeoff: "#DC2626",
  climb: "#16A34A",
  cruise: "#1E5EFF",
  loiter_slow: "#F59E0B",
  descent: "#0EA5A4",
  landing: "#94A3B8",
};

export default function MissionPlanner() {
  const [engines, setEngines] = useState<string[]>([]);
  const [missions, setMissions] = useState<string[]>([]);
  const [engineId, setEngineId] = useState("rotax914_like");
  const [missionId, setMissionId] = useState("hot_weather_45c");
  const [missionConfig, setMissionConfig] = useState<Record<string, any> | null>(null);
  const [cruiseAltitude, setCruiseAltitude] = useState<number | null>(null);
  const [isaDeviation, setIsaDeviation] = useState<number | null>(null);
  const [useCurrentHealth, setUseCurrentHealth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listEngines().then(setEngines).catch(() => {});
    api.listMissions().then(setMissions).catch(() => {});
  }, []);

  useEffect(() => {
    api
      .missionConfig(missionId)
      .then((cfg) => {
        setMissionConfig(cfg);
        const cruiseSeg = cfg.segments.find((s: any) => s.name.includes("cruise"));
        setCruiseAltitude(cruiseSeg ? cruiseSeg.target_altitude_m : null);
        setIsaDeviation(cfg.environment.base_isa_deviation_k);
      })
      .catch(() => setMissionConfig(null));
  }, [missionId]);

  const envelope = useMemo(() => {
    if (!missionConfig) return null;
    let t = 0;
    const times: number[] = [0];
    const altitudes: number[] = [missionConfig.segments[0]?.target_altitude_m ?? 0];
    for (const seg of missionConfig.segments) {
      t += seg.duration_s;
      times.push(t);
      altitudes.push(seg.target_altitude_m);
    }
    return { times, altitudes, segments: missionConfig.segments as { name: string; duration_s: number }[] };
  }, [missionConfig]);

  async function runCheck() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.missionRiskCheck({
        engine_id: engineId,
        mission_id: missionId,
        n_monte_carlo: 8,
        max_duration_s: 1200,
        use_current_health: useCurrentHealth,
        cruise_altitude_m: cruiseAltitude,
        isa_deviation_k: isaDeviation,
      });
      setResult(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const verdictTone = result?.verdict === "NO-GO" ? "critical" : result?.verdict === "CAUTION" ? "watch" : "normal";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <Panel title="Mission Parameters" subtitle="Adjust and re-run the go/no-go check">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-ink-muted mb-1 font-mono">Engine</label>
                <select value={engineId} onChange={(e) => setEngineId(e.target.value)} className="w-full bg-canvas border border-border rounded-control px-2.5 py-1.5 text-sm font-mono text-ink">
                  {engines.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-ink-muted mb-1 font-mono">Mission profile</label>
                <select value={missionId} onChange={(e) => setMissionId(e.target.value)} className="w-full bg-canvas border border-border rounded-control px-2.5 py-1.5 text-sm font-mono text-ink">
                  {missions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              {cruiseAltitude != null && (
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-ink-secondary mb-1">
                    <span>Cruise Altitude</span>
                    <span className="font-semibold text-ink">{Math.round(cruiseAltitude)} m</span>
                  </div>
                  <input type="range" min={0} max={6000} step={100} value={cruiseAltitude} onChange={(e) => setCruiseAltitude(Number(e.target.value))} className="w-full" />
                </div>
              )}
              {isaDeviation != null && (
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-ink-secondary mb-1">
                    <span>ISA Deviation</span>
                    <span className="font-semibold text-ink">+{isaDeviation.toFixed(0)} K</span>
                  </div>
                  <input type="range" min={-10} max={35} step={1} value={isaDeviation} onChange={(e) => setIsaDeviation(Number(e.target.value))} className="w-full" />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-ink-secondary">
                <input type="checkbox" checked={useCurrentHealth} onChange={(e) => setUseCurrentHealth(e.target.checked)} />
                Use current engine health (feedback loop)
              </label>
              <button
                onClick={runCheck}
                disabled={loading}
                className="w-full bg-primary text-white rounded-control px-4 py-2 text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {loading ? "Running Monte Carlo…" : "Run Digital Twin Simulation"}
              </button>
              {error && <p className="text-sm text-status-critical">{error}</p>}
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel title="Flight Envelope" subtitle="Altitude profile by mission segment">
            {envelope ? (
              <>
                <LineChart series={[{ name: "altitude", color: "#1E5EFF", data: envelope.altitudes, area: true }]} yFormatter={(v) => `${Math.round(v)}m`} />
                <div className="flex flex-wrap gap-2 mt-3">
                  {envelope.segments.map((s) => (
                    <span key={s.name} className="inline-flex items-center gap-1.5 text-[11px] font-mono text-ink-secondary">
                      <span className="w-2 h-2 rounded-full" style={{ background: PHASE_COLOR[s.name] ?? "#94A3B8" }} />
                      {s.name.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-muted py-6">Loading mission profile…</p>
            )}
          </Panel>
        </div>

        <div className="lg:col-span-3">
          <Panel title="Clearance Verdict" className={result ? (verdictTone === "critical" ? "!bg-status-critical-bg !border-status-critical/40" : "") : ""}>
            {result ? (
              <div className="text-center py-2">
                <div className={`text-3xl font-extrabold font-mono ${verdictTone === "critical" ? "text-status-critical" : verdictTone === "watch" ? "text-status-watch" : "text-status-normal"}`}>
                  {result.verdict}
                </div>
                <div className="mt-3">
                  <RiskPill level={result.verdict === "NO-GO" ? "CRITICAL" : result.verdict === "CAUTION" ? "WATCH" : "NORMAL"} />
                </div>
                <ul className="text-xs text-ink-secondary mt-4 space-y-1 text-left">
                  {result.reasons.map((r: string, i: number) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-ink-muted py-6 text-center">Run the simulation to get a verdict.</p>
            )}
          </Panel>
        </div>
      </div>

      {result && (
        <Panel title="Limit Margins & Exceedance Probability" subtitle={`${result.n_monte_carlo} Monte Carlo samples`}>
          <div className="space-y-3">
            {result.margins.map((m: any) => (
              <div key={m.channel} className="flex items-center gap-4">
                <div className="w-40 text-xs font-mono text-ink-secondary truncate">
                  {m.label} ({m.channel})
                </div>
                <div className="flex-1 h-2 bg-border-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.probability_exceeded > 0.3 ? "bg-status-critical" : m.probability_exceeded > 0.05 ? "bg-status-watch" : "bg-status-normal"}`}
                    style={{ width: `${Math.min(100, m.probability_exceeded * 100)}%` }}
                  />
                </div>
                <div className="w-16 text-right text-xs font-mono font-semibold text-ink">{(m.probability_exceeded * 100).toFixed(0)}%</div>
                <div className="w-32 text-right text-xs font-mono text-ink-secondary">
                  {m.worst_case_value.toFixed(0)} / {m.limit.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
