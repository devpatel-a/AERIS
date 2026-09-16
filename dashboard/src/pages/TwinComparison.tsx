import { useMemo, useState } from "react";
import { useLiveHistory } from "../lib/useLiveHistory";
import EChart from "../components/EChart";
import { ModeBadge, Panel } from "../components/ui";

const CHANNELS = ["rpm", "map_kpa", "cht_1_k", "egt_1_k", "oil_pressure_kpa", "coolant_temp_k", "vibration_rms_g"];

export default function TwinComparison() {
  const { history, latest, connected } = useLiveHistory(400);
  const [channel, setChannel] = useState("cht_1_k");

  const times = useMemo(() => history.map((r) => r.t_s?.toFixed(0)), [history]);
  const expectedSeries = useMemo(() => history.map((r) => r.expected?.[channel] ?? null), [history, channel]);
  const measuredSeries = useMemo(() => history.map((r) => r.measured?.[channel] ?? null), [history, channel]);
  const residualSeries = useMemo(() => history.map((r) => r.residuals?.[channel] ?? null), [history, channel]);

  const healthParams = latest?.degradation_state
    ? (Object.entries(latest.degradation_state) as [string, number][])
    : [];

  const compareOption = {
    grid: { left: 55, right: 15, top: 30, bottom: 30 },
    legend: { data: ["expected", "measured"], textStyle: { color: "#94a3b8" } },
    xAxis: { type: "category", data: times, axisLine: { lineStyle: { color: "#334155" } } },
    yAxis: { type: "value", axisLine: { lineStyle: { color: "#334155" } }, splitLine: { lineStyle: { color: "#1f2937" } } },
    series: [
      { name: "expected", type: "line", data: expectedSeries, showSymbol: false, lineStyle: { color: "#38bdf8" } },
      { name: "measured", type: "line", data: measuredSeries, showSymbol: false, lineStyle: { color: "#f59e0b" } },
    ],
  };

  const residualOption = {
    grid: { left: 55, right: 15, top: 20, bottom: 30 },
    xAxis: { type: "category", data: times, axisLine: { lineStyle: { color: "#334155" } } },
    yAxis: { type: "value", axisLine: { lineStyle: { color: "#334155" } }, splitLine: { lineStyle: { color: "#1f2937" } } },
    series: [
      { name: "residual", type: "line", data: residualSeries, showSymbol: false, lineStyle: { color: "#ef4444" }, areaStyle: { opacity: 0.15 } },
    ],
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ModeBadge mode={latest?.mode} connected={connected} />
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="bg-gcs-panel border border-gcs-border rounded px-2 py-1 text-sm"
        >
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <Panel title={`Observed vs Expected — ${channel}`}>
        <EChart option={compareOption} height={280} />
      </Panel>
      <Panel title={`Residual (observed − expected) — ${channel}`}>
        <EChart option={residualOption} height={200} />
      </Panel>

      {healthParams.length > 0 && (
        <Panel title="Estimated health parameters (current)">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {healthParams.map(([name, value]) => (
              <div key={name} className="bg-gcs-bg border border-gcs-border rounded-md p-2">
                <div className="text-[10px] text-slate-500 uppercase truncate">{name}</div>
                <div className="text-lg font-mono">{value.toFixed(3)}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
