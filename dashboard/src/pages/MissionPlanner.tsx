import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Panel, RiskPill } from "../components/ui";

export default function MissionPlanner() {
  const [engines, setEngines] = useState<string[]>([]);
  const [missions, setMissions] = useState<string[]>([]);
  const [engineId, setEngineId] = useState("rotax914_like");
  const [missionId, setMissionId] = useState("hot_weather_45c");
  const [useCurrentHealth, setUseCurrentHealth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listEngines().then(setEngines).catch(() => {});
    api.listMissions().then(setMissions).catch(() => {});
  }, []);

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
      });
      setResult(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Panel title="Plan a mission">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Engine</label>
            <select value={engineId} onChange={(e) => setEngineId(e.target.value)} className="bg-gcs-bg border border-gcs-border rounded px-2 py-1">
              {engines.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Mission</label>
            <select value={missionId} onChange={(e) => setMissionId(e.target.value)} className="bg-gcs-bg border border-gcs-border rounded px-2 py-1">
              {missions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useCurrentHealth} onChange={(e) => setUseCurrentHealth(e.target.checked)} />
            Use current engine health (feedback loop)
          </label>
          <button
            onClick={runCheck}
            disabled={loading}
            className="bg-gcs-accent/20 border border-gcs-accent/50 text-gcs-accent px-4 py-1.5 rounded text-sm font-medium hover:bg-gcs-accent/30 disabled:opacity-50"
          >
            {loading ? "Running Monte Carlo…" : "Run go/no-go check"}
          </button>
        </div>
        {error && <p className="text-sm text-gcs-red mt-2">{error}</p>}
      </Panel>

      {result && (
        <Panel title="Result">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-slate-400">Verdict:</span>
            <RiskPill level={result.verdict} />
            <span className="text-xs text-slate-500">({result.n_monte_carlo} Monte Carlo samples)</span>
          </div>
          <ul className="text-sm space-y-1 mb-4">
            {result.reasons.map((r: string, i: number) => (
              <li key={i} className="text-slate-300">
                • {r}
              </li>
            ))}
          </ul>
          <table className="w-full text-xs">
            <thead className="text-slate-500 uppercase">
              <tr>
                <th className="text-left py-1">Channel</th>
                <th className="text-left py-1">Limit</th>
                <th className="text-left py-1">Worst case</th>
                <th className="text-left py-1">Mean</th>
                <th className="text-left py-1">P(exceed)</th>
              </tr>
            </thead>
            <tbody>
              {result.margins.map((m: any) => (
                <tr key={m.channel} className="border-t border-gcs-border">
                  <td className="py-1">{m.label} ({m.channel})</td>
                  <td className="py-1">{m.limit.toFixed(0)}</td>
                  <td className="py-1">{m.worst_case_value.toFixed(1)}</td>
                  <td className="py-1">{m.mean_value.toFixed(1)}</td>
                  <td className={`py-1 ${m.probability_exceeded > 0.05 ? "text-gcs-amber" : "text-slate-400"}`}>
                    {(m.probability_exceeded * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
