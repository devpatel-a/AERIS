import { useEffect, useMemo, useState } from "react";
import { useLiveHistory } from "../lib/useLiveHistory";
import { api } from "../lib/api";
import EChart from "../components/EChart";
import { Panel } from "../components/ui";

export default function Trends() {
  const { history } = useLiveHistory(600);
  const [engines, setEngines] = useState<string[]>([]);
  const [engine, setEngine] = useState("rotax914_like");

  useEffect(() => {
    api.listEngines().then(setEngines).catch(() => {});
  }, []);

  const times = useMemo(() => history.map((r) => r.t_s?.toFixed(0)), [history]);
  const healthIndex = useMemo(() => history.map((r) => r.health_index ?? null), [history]);
  const coolingEff = useMemo(
    () => history.map((r) => r.degradation_state?.cooling_effectiveness ?? null),
    [history],
  );
  const vibration = useMemo(() => history.map((r) => r.measured?.vibration_rms_g ?? r.true?.vibration_rms_g ?? null), [history]);

  const lineOption = (data: (number | null)[], color: string, name: string) => ({
    grid: { left: 45, right: 15, top: 20, bottom: 30 },
    xAxis: { type: "category", data: times, axisLine: { lineStyle: { color: "#334155" } } },
    yAxis: { type: "value", axisLine: { lineStyle: { color: "#334155" } }, splitLine: { lineStyle: { color: "#1f2937" } } },
    series: [{ name, type: "line", data, showSymbol: false, lineStyle: { color } }],
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 uppercase">Engine (fleet selector)</span>
        <select
          value={engine}
          onChange={(e) => setEngine(e.target.value)}
          className="bg-gcs-panel border border-gcs-border rounded px-2 py-1 text-sm"
        >
          {engines.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      <Panel title={`Overall health index over time — ${engine}`}>
        <EChart option={lineOption(healthIndex, "#22c55e", "health index")} />
      </Panel>
      <Panel title="Cooling effectiveness (degradation trend)">
        <EChart option={lineOption(coolingEff, "#38bdf8", "cooling_effectiveness")} />
      </Panel>
      <Panel title="Vibration RMS trend">
        <EChart option={lineOption(vibration, "#f59e0b", "vibration_rms_g")} />
      </Panel>
      {history.length === 0 && (
        <p className="text-sm text-slate-500">No live history yet — start a session on Demo Control.</p>
      )}
    </div>
  );
}
