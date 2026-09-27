import { useEffect, useMemo, useState } from "react";
import { api, type MaintenanceRecord } from "../lib/api";
import { useLiveHistory } from "../lib/useLiveHistory";
import { ModeBadge, Panel, RiskPill } from "../components/ui";
import { BipolarBarChart, LineChart } from "../components/aeris";

const SEVERITY_TO_RISK: Record<string, string> = { none: "NORMAL", low: "WATCH", moderate: "WARNING", high: "CRITICAL" };
const FILTERS = ["All", "Critical", "Warning"] as const;

export default function Diagnostics() {
  const { history, latest, connected } = useLiveHistory(600);
  const [advisories, setAdvisories] = useState<Record<string, any>[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  useEffect(() => {
    api.advisories().then(setAdvisories).catch(() => {});
    api.maintenance("rotax914_like").then(setMaintenance).catch(() => {});
  }, []);

  const diagnosis = latest?.diagnosis;
  const subsystemRisk: Record<string, string> = latest?.subsystem_risk || {};
  const predictedFaults = Object.values(subsystemRisk).filter((r) => r === "WATCH" || r === "WARNING").length;
  const activeFaults = diagnosis && diagnosis.fault !== "healthy" ? 1 : 0;

  const rulSeries = useMemo(() => history.map((r) => r.rul_mean_hours ?? null), [history]);
  const rulUpper = useMemo(() => history.map((r) => r.rul_p95_hours ?? null), [history]);
  const rulLower = useMemo(() => history.map((r) => r.rul_p05_hours ?? null), [history]);

  const filteredAdvisories = advisories.filter((a) => {
    if (filter === "All") return true;
    if (filter === "Critical") return a.severity === "CRITICAL";
    if (filter === "Warning") return a.severity === "WARNING" || a.severity === "WATCH";
    return true;
  });

  return (
    <div className="space-y-6">
      <ModeBadge mode={latest?.mode} connected={connected} />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard label="Active Faults" value={activeFaults} tone={activeFaults > 0 ? "critical" : "normal"} />
        <KpiCard label="Predicted Faults" value={predictedFaults} tone={predictedFaults > 0 ? "watch" : "normal"} />
        <KpiCard
          label="Est. RUL (hrs)"
          value={diagnosis?.rul_mean_hours != null ? Math.round(diagnosis.rul_mean_hours) : "--"}
          tone="info"
        />
        <KpiCard label="Overall Risk" value={diagnosis?.overall_risk ?? "--"} tone={diagnosis?.overall_risk === "CRITICAL" ? "critical" : diagnosis?.overall_risk === "WARNING" ? "watch" : "normal"} isText />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <Panel
            title="Detected & Predicted Faults"
            subtitle="Recent alerts / advisories"
            action={
              <div className="flex items-center gap-1 bg-canvas p-1 rounded-control border border-border">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                      f === filter ? "bg-surface text-primary shadow-card" : "text-ink-secondary hover:text-ink"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            }
          >
            {filteredAdvisories.length === 0 ? (
              <p className="text-sm text-ink-muted">No alerts recorded yet — start a LIVE session and inject a fault.</p>
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
                  {filteredAdvisories.map((a, i) => (
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

          <Panel title="Why the AI Thinks So" subtitle="SHAP feature attribution for the current prediction">
            {diagnosis && diagnosis.shap_features.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-ink-secondary italic">"{diagnosis.explanation}"</p>
                <BipolarBarChart items={diagnosis.shap_features} />
                <div className="flex items-center gap-4 text-[11px] font-mono pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-status-normal" />
                    <span className="text-ink-secondary">Raised confidence</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-status-critical" />
                    <span className="text-ink-secondary">Lowered confidence</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">No diagnosis yet — the classifier needs one full 30s window of live data.</p>
            )}
          </Panel>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <Panel title="RUL Prognostics" subtitle="Particle-filter estimate over time (shaded = 90% interval)">
            {rulSeries.some((v) => v != null) ? (
              <LineChart
                series={[{ name: "RUL mean", color: "#006A69", data: rulSeries }]}
                band={{ color: "#0EA5A4", upper: rulUpper, lower: rulLower }}
                height={220}
                yFormatter={(v) => `${Math.round(v)}h`}
              />
            ) : (
              <p className="text-sm text-ink-muted py-6">No RUL history yet.</p>
            )}
          </Panel>

          <Panel title="Maintenance Advisories" subtitle="Rule-based recommendations from past diagnoses">
            {maintenance.length === 0 ? (
              <p className="text-sm text-ink-muted">No maintenance advisories recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {maintenance.slice(0, 8).map((m) => (
                  <li key={m.id} className="flex items-start gap-2.5 text-sm">
                    <span className="material-symbols-outlined text-[18px] text-status-watch mt-0.5">build_circle</span>
                    <div>
                      <div className="text-ink font-medium">{m.action}</div>
                      {m.notes && <div className="text-xs text-ink-secondary mt-0.5">{m.notes}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, tone, isText = false }: { label: string; value: number | string; tone: "normal" | "watch" | "critical" | "info"; isText?: boolean }) {
  const toneCls: Record<string, string> = {
    normal: "text-status-normal",
    watch: "text-status-watch",
    critical: "text-status-critical",
    info: "text-primary",
  };
  return (
    <div className="bg-surface border border-border rounded-card p-4 shadow-card">
      <div className="text-[11px] uppercase tracking-wide text-ink-muted font-mono font-semibold">{label}</div>
      <div className={`font-mono font-bold mt-1 ${toneCls[tone]} ${isText ? "text-xl" : "text-[32px]"}`}>{value}</div>
    </div>
  );
}
