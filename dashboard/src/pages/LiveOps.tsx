import { useEffect, useMemo, useState } from "react";
import { useLiveHistory } from "../lib/useLiveHistory";
import { api } from "../lib/api";
import { ModeBadge, RiskPill } from "../components/ui";
import { ArcGauge, CircularGauge, DualBarChart, HealthTile, RangeBar, Sparkline, VibrationSpectrum } from "../components/aeris";

const CYL = [1, 2, 3, 4];
const CYL_LABELS = CYL.map((c) => `CYL ${c}`);

const SUBSYSTEM_ICON: Record<string, string> = {
  combustion: "local_fire_department",
  cooling: "ac_unit",
  lubrication: "opacity",
  fuel_injection: "gas_meter",
  electrical: "bolt",
  mechanical_vibration: "waves",
  sensors: "sensors",
};

// avgas density ~0.72 kg/L, for a human-readable Fuel Flow gauge (kg/s telemetry -> L/h display)
const FUEL_KG_S_TO_L_H = 3600 / 0.72;

export default function LiveOps() {
  const { history, latest, connected } = useLiveHistory(60);
  const [limits, setLimits] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    api.engineConfig("rotax914_like").then((c) => setLimits(c.limits)).catch(() => {});
  }, []);

  const measured = latest?.measured || latest?.true || {};
  const expected = latest?.expected || {};
  const chtValues = useMemo(() => CYL.map((i) => measured[`cht_${i}_k`] ?? 0), [measured]);
  const egtValues = useMemo(() => CYL.map((i) => measured[`egt_${i}_k`] ?? 0), [measured]);

  const seriesFor = (key: string) => history.map((r) => (r.measured || r.true || {})[key]).filter((v): v is number => Number.isFinite(v));

  const subsystemIndex: Record<string, number> = latest?.subsystem_index || {};
  const subsystemRisk: Record<string, string> = latest?.subsystem_risk || {};
  const healthIndex = latest?.health_index ?? 0;
  const confidencePct = latest?.confidence_pct ?? 0;
  const spectrum = latest?.vibration_spectrum || [];

  const alarms = (latest?.alarms as Record<string, boolean>) || {};
  const activeAlarms = Object.entries(alarms).filter(([, active]) => active);
  const diagnosis = latest?.diagnosis;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <ModeBadge mode={latest?.mode} connected={connected} />
        {latest?.health_risk && <RiskPill level={latest.health_risk} />}
      </div>

      {/* ROW 1: composite health + subsystem matrix */}
      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 bg-surface border border-border rounded-card p-5 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse-subtle" />
              <h2 className="font-semibold text-[15px] text-ink">Overall Engine Health</h2>
            </div>
            {latest?.health_risk && <RiskPill level={latest.health_risk} />}
          </div>
          <div className="py-4">
            <CircularGauge value={healthIndex} max={100} label="Composite Index" />
          </div>
          <div className="space-y-3 pt-3 border-t border-border/80">
            {latest?.rul_mean_hours != null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-secondary">Estimated RUL:</span>
                <span className="font-mono font-semibold text-ink">
                  {Math.round(latest.rul_mean_hours)} engine hrs
                  {latest?.rul_p05_hours != null && latest?.rul_p95_hours != null && (
                    <span className="text-ink-muted font-normal">
                      {" "}
                      ({Math.round(latest.rul_p05_hours)}
                      {"–"}
                      {Math.round(latest.rul_p95_hours)})
                    </span>
                  )}
                </span>
              </div>
            )}
            <div>
              <div className="flex justify-between text-xs text-ink-secondary mb-1">
                <span>Digital Twin Confidence</span>
                <span className="font-semibold text-primary">{confidencePct.toFixed(1)}% (Kalman Filtered)</span>
              </div>
              <div className="w-full h-1.5 bg-border-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${confidencePct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 bg-surface border border-border rounded-card p-5 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="font-semibold text-[15px] text-ink">Subsystem Health Matrix</h2>
              <p className="text-xs text-ink-secondary">Real-time telemetry model components, continuous check</p>
            </div>
          </div>
          {Object.keys(subsystemIndex).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 my-auto py-3">
              {Object.entries(subsystemIndex).map(([name, idx]) => (
                <HealthTile
                  key={name}
                  icon={SUBSYSTEM_ICON[name] || "settings"}
                  label={name.replace(/_/g, " ")}
                  value={idx}
                  status={subsystemRisk[name] || "NORMAL"}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted py-6">No subsystem data yet — start a LIVE session on Demo Control.</p>
          )}
        </div>
      </section>

      {/* ROW 2: four arc gauges */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ArcGauge label="Engine Speed" value={measured.rpm ?? 0} unit="RPM" max={limits?.max_rpm ?? 6000} color="#1E5EFF" statusLabel="Nominal" tone="normal" />
        <ArcGauge label="Manifold Pressure" value={measured.map_kpa ?? 0} unit="kPa" max={limits?.max_map_kpa ?? 135} color="#0EA5A4" statusLabel="Boost" tone="info" />
        <ArcGauge
          label="Fuel Flow"
          value={(measured.fuel_flow_kg_s ?? 0) * FUEL_KG_S_TO_L_H}
          unit="L/h"
          max={40}
          precision={1}
          color="#1E5EFF"
          statusLabel="Nominal"
          tone="normal"
        />
        <ArcGauge
          label="Engine Power"
          value={(expected.power_w ?? 0) / 1000}
          unit="kW"
          max={90}
          precision={0}
          color="#0EA5A4"
          statusLabel="Optimum"
          tone="normal"
        />
      </section>

      {/* ROW 3: cylinder temps + vital metrics */}
      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 bg-surface border border-border rounded-card p-5 shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="font-semibold text-[15px] text-ink">Cylinder Head &amp; Exhaust Temperatures</h2>
              <p className="text-xs text-ink-secondary">Real-time CHT / EGT telemetry vs hard limits</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-primary" />
                <span className="text-ink">CHT</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-secondary" />
                <span className="text-ink">EGT</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-status-critical" />
                <span className="text-status-critical font-medium">Limit</span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <DualBarChart
              categories={CYL_LABELS}
              seriesA={{ label: "CHT", color: "#1E5EFF", values: chtValues, limit: limits?.max_cht_k }}
              seriesB={{ label: "EGT", color: "#0EA5A4", values: egtValues, limit: limits?.max_egt_k }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 pt-3 mt-2 border-t border-border text-[11px] font-mono text-center">
            {CYL.map((c, i) => (
              <div key={c} className="p-1.5 rounded bg-canvas">
                <span className="text-ink-secondary">CYL {c}: </span>
                <span className="font-semibold text-primary">{Math.round(chtValues[i])}K</span> /{" "}
                <span className="font-semibold text-secondary">{Math.round(egtValues[i])}K</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 bg-surface border border-border rounded-card p-5 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="font-semibold text-[15px] text-ink">Vital Powertrain Metrics</h2>
              <p className="text-xs text-ink-secondary">Continuous operational limits monitoring</p>
            </div>
          </div>
          <div className="divide-y divide-border py-1">
            <VitalRow label="Oil Pressure" normRange="300 – 500" value={measured.oil_pressure_kpa} unit="kPa" pct={pctInRange(measured.oil_pressure_kpa, 0, 600)} history={seriesFor("oil_pressure_kpa")} />
            <VitalRow label="Oil Temp" normRange="340 – 380" value={measured.oil_temp_k} unit="K" pct={pctInRange(measured.oil_temp_k, 280, 420)} history={seriesFor("oil_temp_k")} />
            <VitalRow label="Coolant Temp" normRange="340 – 370" value={measured.coolant_temp_k} unit="K" pct={pctInRange(measured.coolant_temp_k, 280, 400)} history={seriesFor("coolant_temp_k")} />
            <VitalRow label="Vibration RMS" normRange="0 – 2.5" value={measured.vibration_rms_g} unit="g" precision={2} pct={pctInRange(measured.vibration_rms_g, 0, 5)} history={seriesFor("vibration_rms_g")} />
            <VitalRow label="Battery SOC" normRange="60 – 100" value={measured.battery_soc != null ? measured.battery_soc * 100 : undefined} unit="%" pct={pctInRange(measured.battery_soc, 0, 1)} history={seriesFor("battery_soc").map((v) => v * 100)} />
          </div>
        </div>
      </section>

      {/* ROW 4: vibration spectrum + alerts */}
      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 bg-surface border border-border rounded-card p-5 shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="font-semibold text-[15px] text-ink">Vibration Spectrum</h2>
              <p className="text-xs text-ink-secondary">Crank-order harmonics (0.5x misfire / 1x imbalance / 2x firing)</p>
            </div>
          </div>
          {spectrum.length > 0 ? (
            <div className="mt-4">
              <VibrationSpectrum points={spectrum} />
            </div>
          ) : (
            <p className="text-sm text-ink-muted py-6">No vibration data yet.</p>
          )}
        </div>

        <div className="col-span-12 lg:col-span-5 bg-surface border border-border rounded-card p-5 shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="font-semibold text-[15px] text-ink">Alerts</h2>
            {diagnosis && <RiskPill level={diagnosis.severity === "high" ? "CRITICAL" : diagnosis.severity === "moderate" ? "WARNING" : diagnosis.severity === "low" ? "WATCH" : "NORMAL"} />}
          </div>
          {diagnosis && diagnosis.fault !== "healthy" && (
            <div className="mt-3 p-3 rounded-control bg-status-watch-bg border border-status-watch/30">
              <div className="text-[13px] font-semibold text-ink capitalize">{diagnosis.fault.replace(/_/g, " ")}</div>
              <div className="text-xs text-ink-secondary mt-1">{diagnosis.explanation}</div>
              <div className="text-xs text-ink mt-2 font-medium">{diagnosis.recommended_action}</div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {activeAlarms.map(([ch]) => (
              <span key={ch} className="px-2 py-1 rounded-chip bg-status-critical-bg text-status-critical border border-status-critical/30 text-xs font-mono font-semibold">
                {ch}
              </span>
            ))}
            {activeAlarms.length === 0 && (!diagnosis || diagnosis.fault === "healthy") && (
              <span className="text-ink-muted text-sm">No active alerts</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function pctInRange(value: number | undefined, min: number, max: number) {
  if (value == null || !Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

function VitalRow({
  label,
  normRange,
  value,
  unit,
  pct,
  history,
  precision = 0,
}: {
  label: string;
  normRange: string;
  value: number | undefined;
  unit: string;
  pct: number;
  history: number[];
  precision?: number;
}) {
  const display = value == null || !Number.isFinite(value) ? "--" : precision > 0 ? value.toFixed(precision) : Math.round(value).toString();
  return (
    <div className="py-2.5 flex items-center justify-between gap-4">
      <div className="w-28">
        <div className="text-[13px] font-semibold text-ink leading-tight">{label}</div>
        <div className="text-[10px] text-ink-muted">Norm: {normRange}</div>
      </div>
      <div className="w-20 font-mono text-sm font-bold text-ink text-right">
        {display} <span className="text-xs font-normal text-ink-secondary">{unit}</span>
      </div>
      <Sparkline data={history} />
      <RangeBar pct={pct} />
    </div>
  );
}
