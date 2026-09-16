import { useEffect, useMemo, useState } from "react";
import { useLiveSocket } from "../lib/useLiveSocket";
import { api } from "../lib/api";
import EChart from "../components/EChart";
import { ModeBadge, Panel, RiskPill, StatTile } from "../components/ui";

const CYL = [1, 2, 3, 4];

function gaugeOption(value: number, max: number, name: string, unit: string) {
  return {
    series: [
      {
        type: "gauge",
        min: 0,
        max,
        progress: { show: true, width: 10 },
        axisLine: { lineStyle: { width: 10 } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          formatter: `{value} ${unit}`,
          color: "#e2e8f0",
          fontSize: 18,
          offsetCenter: [0, "20%"],
        },
        title: { color: "#94a3b8", fontSize: 11, offsetCenter: [0, "55%"] },
        data: [{ value: Math.round(value), name }],
      },
    ],
  };
}

function barOption(values: number[], limit: number, unit: string) {
  return {
    grid: { left: 40, right: 10, top: 10, bottom: 25 },
    xAxis: { type: "category", data: CYL.map((c) => `Cyl ${c}`), axisLine: { lineStyle: { color: "#334155" } } },
    yAxis: { type: "value", axisLine: { lineStyle: { color: "#334155" } }, splitLine: { lineStyle: { color: "#1f2937" } } },
    series: [
      {
        type: "bar",
        data: values.map((v) => ({
          value: Math.round(v),
          itemStyle: { color: v >= limit ? "#ef4444" : "#38bdf8" },
        })),
        markLine: { silent: true, data: [{ yAxis: limit }], lineStyle: { color: "#f59e0b" } },
        label: { show: true, position: "top", color: "#cbd5e1", formatter: `{c} ${unit}` },
      },
    ],
  };
}

export default function LiveOps() {
  const { latest, connected } = useLiveSocket();
  const [limits, setLimits] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    api.engineConfig("rotax914_like").then((c) => setLimits(c.limits)).catch(() => {});
  }, []);

  const measured = latest?.measured || latest?.true || {};
  const chtValues = useMemo(() => CYL.map((i) => measured[`cht_${i}_k`] ?? 0), [measured]);
  const egtValues = useMemo(() => CYL.map((i) => measured[`egt_${i}_k`] ?? 0), [measured]);

  const subsystemIndex: Record<string, number> = latest?.subsystem_index || {};
  const subsystemRisk: Record<string, string> = latest?.subsystem_risk || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ModeBadge mode={latest?.mode} connected={connected} />
        {latest?.health_risk && <RiskPill level={latest.health_risk} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Panel title="RPM">
          <EChart option={gaugeOption(measured.rpm ?? 0, limits?.max_rpm ?? 6000, "RPM", "")} height={180} />
        </Panel>
        <Panel title="Manifold Pressure">
          <EChart option={gaugeOption(measured.map_kpa ?? 0, limits?.max_map_kpa ?? 135, "MAP", "kPa")} height={180} />
        </Panel>
        <Panel title="Oil">
          <div className="flex flex-col gap-2">
            <StatTile label="Pressure" value={Math.round(measured.oil_pressure_kpa ?? 0)} unit="kPa" />
            <StatTile label="Temp" value={Math.round(measured.oil_temp_k ?? 0)} unit="K" />
          </div>
        </Panel>
        <Panel title="Electrical">
          <div className="flex flex-col gap-2">
            <StatTile label="Bus Voltage" value={(measured.alternator_voltage_v ?? 0).toFixed(1)} unit="V" />
            <StatTile label="Battery SOC" value={Math.round((measured.battery_soc ?? 0) * 100)} unit="%" />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title={`Cylinder Head Temperature (limit ${limits?.max_cht_k ?? "--"} K)`}>
          <EChart option={barOption(chtValues, limits?.max_cht_k ?? 508, "K")} />
        </Panel>
        <Panel title={`Exhaust Gas Temperature (limit ${limits?.max_egt_k ?? "--"} K)`}>
          <EChart option={barOption(egtValues, limits?.max_egt_k ?? 1173, "K")} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Vibration">
          <StatTile label="RMS" value={(measured.vibration_rms_g ?? 0).toFixed(3)} unit="g" />
        </Panel>
        <Panel title="Coolant">
          <StatTile label="Temp" value={Math.round(measured.coolant_temp_k ?? 0)} unit="K" />
        </Panel>
      </div>

      {Object.keys(subsystemIndex).length > 0 && (
        <Panel title={`Health tiles — overall ${Math.round(latest?.health_index ?? 0)}/100`}>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            {Object.entries(subsystemIndex).map(([name, idx]) => (
              <div key={name} className="bg-gcs-bg border border-gcs-border rounded-md p-2 text-center">
                <div className="text-[10px] text-slate-500 uppercase truncate">{name.replace("_", " ")}</div>
                <div className="text-xl font-mono">{Math.round(idx)}</div>
                <RiskPill level={subsystemRisk[name] || "NORMAL"} />
              </div>
            ))}
          </div>
        </Panel>
      )}

      {latest?.alarms && (
        <Panel title="Alerts">
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(latest.alarms as Record<string, boolean>)
              .filter(([, active]) => active)
              .map(([ch]) => (
                <span key={ch} className="px-2 py-1 rounded bg-gcs-red/20 text-gcs-red border border-gcs-red/40">
                  {ch}
                </span>
              ))}
            {Object.values(latest.alarms as Record<string, boolean>).every((v) => !v) && (
              <span className="text-slate-500">No active alerts</span>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
