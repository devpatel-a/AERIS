import { useMemo, useState } from "react";
import { useLiveHistory } from "../lib/useLiveHistory";
import { api } from "../lib/api";
import { ModeBadge, Panel, RiskPill } from "../components/ui";
import { ChartLegend, LineChart, Sparkline } from "../components/aeris";

const CYL = [1, 2, 3, 4];

const CHANNEL_GROUPS: { label: string; key: (cyl: number) => string; unit: string; perCylinder: boolean }[] = [
  { label: "CHT", key: (c) => `cht_${c}_k`, unit: "K", perCylinder: true },
  { label: "EGT", key: (c) => `egt_${c}_k`, unit: "K", perCylinder: true },
  { label: "Oil Temp", key: () => "oil_temp_k", unit: "K", perCylinder: false },
  { label: "Oil Pressure", key: () => "oil_pressure_kpa", unit: "kPa", perCylinder: false },
  { label: "RPM", key: () => "rpm", unit: "", perCylinder: false },
  { label: "Fuel Flow", key: () => "fuel_flow_kg_s", unit: "kg/s", perCylinder: false },
];

const TIME_RANGES = [
  { label: "1H", seconds: 3600 },
  { label: "3H", seconds: 10800 },
  { label: "6H", seconds: 21600 },
  { label: "All", seconds: Infinity },
];

const SEVERITY_TO_RISK: Record<string, string> = { none: "NORMAL", low: "WATCH", moderate: "WARNING", high: "CRITICAL" };

export default function TwinComparison() {
  const { history, latest, connected } = useLiveHistory(3000);
  const [groupIdx, setGroupIdx] = useState(0);
  const [cylinder, setCylinder] = useState(1);
  const [rangeIdx, setRangeIdx] = useState(3);

  const group = CHANNEL_GROUPS[groupIdx];
  const channel = group.key(cylinder);
  const range = TIME_RANGES[rangeIdx];

  const windowed = useMemo(() => {
    if (history.length === 0) return [];
    const latestT = history[history.length - 1].t_s ?? 0;
    return history.filter((r) => latestT - (r.t_s ?? 0) <= range.seconds);
  }, [history, range.seconds]);

  const measuredSeries = useMemo(() => windowed.map((r) => r.measured?.[channel] ?? null), [windowed, channel]);
  const expectedSeries = useMemo(() => windowed.map((r) => r.expected?.[channel] ?? null), [windowed, channel]);
  const residualSeries = useMemo(() => windowed.map((r) => r.residuals?.[channel] ?? null), [windowed, channel]);
  const anomalySeries = useMemo(() => windowed.map((r) => r.normalized_residuals?.[channel] ?? null), [windowed, channel]);
  const ciUpper = useMemo(() => windowed.map((r) => r.expected_ci?.[channel]?.[1] ?? null), [windowed, channel]);
  const ciLower = useMemo(() => windowed.map((r) => r.expected_ci?.[channel]?.[0] ?? null), [windowed, channel]);

  const healthParams = latest?.degradation_state ? (Object.entries(latest.degradation_state) as [string, number][]) : [];
  const paramSeries = (name: string) => windowed.map((r) => r.degradation_state?.[name]).filter((v): v is number => Number.isFinite(v));

  const diagnosis = latest?.diagnosis;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ModeBadge mode={latest?.mode} connected={connected} />
        <div className="flex items-center gap-1 bg-canvas p-1 rounded-control border border-border">
          {TIME_RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                i === rangeIdx ? "bg-surface text-primary shadow-card" : "text-ink-secondary hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {CHANNEL_GROUPS.map((g, i) => (
          <button
            key={g.label}
            onClick={() => setGroupIdx(i)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold border transition-colors ${
              i === groupIdx ? "bg-primary text-white border-primary" : "bg-surface text-ink-secondary border-border hover:border-primary/40"
            }`}
          >
            {g.label}
          </button>
        ))}
        {group.perCylinder && (
          <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
            {CYL.map((c) => (
              <button
                key={c}
                onClick={() => setCylinder(c)}
                className={`w-7 h-7 rounded-control text-xs font-mono font-semibold border transition-colors ${
                  c === cylinder ? "bg-blue-50 text-primary border-primary/50" : "bg-surface text-ink-secondary border-border"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <a
          href={api.healthHistoryCsvUrl(range.seconds === Infinity ? 999999 : range.seconds)}
          className="ml-auto bg-surface border border-border text-ink rounded-control px-3 py-1.5 text-xs font-semibold hover:bg-canvas transition-colors"
        >
          Export CSV Telemetry
        </a>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <Panel
            title={`Observed vs. Expected Twin — ${group.label}${group.perCylinder ? ` (Cyl ${cylinder})` : ""}`}
            subtitle="Shaded band is the UKF's 95% prediction interval"
            action={<ChartLegend items={[{ label: "Measured", color: "#1E5EFF" }, { label: "Expected (twin)", color: "#0EA5A4" }]} />}
          >
            <LineChart
              series={[
                { name: "measured", color: "#1E5EFF", data: measuredSeries },
                { name: "expected", color: "#0EA5A4", data: expectedSeries },
              ]}
              band={{ color: "#0EA5A4", upper: ciUpper, lower: ciLower }}
              height={280}
            />
          </Panel>

          <Panel title={`Residual (observed − expected) — ${group.label}`} subtitle="Raw deviation in the channel's own units">
            <LineChart series={[{ name: "residual", color: "#EA580C", data: residualSeries, area: true }]} height={180} />
          </Panel>

          <Panel title="Anomaly Score" subtitle="Normalized residual (z-score) — what the EWMA/CUSUM detector actually alarms on">
            <LineChart series={[{ name: "anomaly score", color: "#0EA5A4", data: anomalySeries }]} height={180} />
          </Panel>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <Panel title="Fault-Source Analysis" subtitle="Live AI diagnosis">
            {diagnosis ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-ink capitalize">{diagnosis.fault.replace(/_/g, " ")}</span>
                  <RiskPill level={SEVERITY_TO_RISK[diagnosis.severity] || "NORMAL"} />
                </div>
                <p className="text-xs text-ink-secondary">{diagnosis.explanation}</p>
                <div>
                  <div className="flex justify-between text-[11px] text-ink-secondary mb-1">
                    <span>Classifier Confidence</span>
                    <span className="font-semibold text-primary">{(diagnosis.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-border-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${diagnosis.confidence * 100}%` }} />
                  </div>
                </div>
                <div className="pt-3 border-t border-border text-xs text-ink">
                  <span className="font-semibold">Recommended action: </span>
                  {diagnosis.recommended_action}
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">No diagnosis yet — the classifier needs one full 30s window of live data.</p>
            )}
          </Panel>

          {healthParams.length > 0 && (
            <Panel title="Estimated Health Parameters" subtitle="Unscented Kalman Filter random-walk state">
              <div className="divide-y divide-border">
                {healthParams.map(([name, value]) => {
                  const series = paramSeries(name);
                  const delta = series.length > 1 ? value - series[0] : 0;
                  return (
                    <div key={name} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-ink truncate">{name.replace(/_/g, " ")}</div>
                        <div className="font-mono text-sm font-bold text-ink">{value.toFixed(3)}</div>
                      </div>
                      <Sparkline data={series} color={delta < -0.01 ? "#DC2626" : "#1E5EFF"} width={48} height={18} />
                      <span className={`text-[11px] font-mono font-semibold w-14 text-right ${delta < -0.01 ? "text-status-critical" : "text-ink-secondary"}`}>
                        {delta >= 0 ? "+" : ""}
                        {delta.toFixed(3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
