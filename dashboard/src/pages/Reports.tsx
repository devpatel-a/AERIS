import { useEffect, useState } from "react";
import { api, type MissionRun, type MissionSummary } from "../lib/api";
import { Panel, RiskPill } from "../components/ui";
import { LIMIT_LABELS } from "../lib/limitLabels";

const FILTERS = ["All", "Critical/Watch", "Cleared"] as const;

export default function Reports() {
  const [runs, setRuns] = useState<MissionRun[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [preview, setPreview] = useState<(MissionSummary & { mission_run_id: string; engine_id: string; mission_id: string | null }) | null>(null);

  useEffect(() => {
    api.replayList().then(setRuns).catch(() => {});
  }, []);

  const filtered = runs.filter((r) => {
    if (!r.mission_run_id.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "Critical/Watch") return r.summary?.health_risk_end === "CRITICAL" || r.summary?.health_risk_end === "WATCH" || r.summary?.health_risk_end === "WARNING";
    if (filter === "Cleared") return !r.summary || r.summary.health_risk_end === "NORMAL";
    return true;
  });

  async function openPreview(runId: string) {
    setPreviewId(runId);
    try {
      const res = await api.reportSummary(runId);
      setPreview(res);
    } catch {
      setPreview(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search mission run…"
          className="bg-surface border border-border rounded-control px-3 py-1.5 text-sm font-mono text-ink w-64"
        />
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <Panel title="Health & Mission Reports" subtitle={`${filtered.length} stored runs`}>
            {filtered.length === 0 ? (
              <p className="text-sm text-ink-muted">No stored mission runs yet. Run a LIVE/SIMULATION session first.</p>
            ) : (
              <table className="w-full text-xs font-mono">
                <thead className="text-ink-muted uppercase tracking-wide">
                  <tr>
                    <th className="text-left py-1.5 font-medium">Mission Run</th>
                    <th className="text-left py-1.5 font-medium">Health</th>
                    <th className="text-left py-1.5 font-medium">Status</th>
                    <th className="text-right py-1.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.mission_run_id} className={`border-t border-border ${previewId === r.mission_run_id ? "bg-blue-50/30" : ""}`}>
                      <td className="py-2 text-ink">
                        <div className="font-semibold">{r.mission_run_id}</div>
                        <div className="text-ink-muted text-[10px]">{r.mission_id ?? "--"}</div>
                      </td>
                      <td className="py-2 text-ink">{r.summary?.health_index_end != null ? Math.round(r.summary.health_index_end) : "--"}</td>
                      <td className="py-2">{r.summary?.health_risk_end ? <RiskPill level={r.summary.health_risk_end} /> : <span className="text-ink-muted">--</span>}</td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openPreview(r.mission_run_id)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                              previewId === r.mission_run_id ? "bg-primary text-white" : "bg-canvas border border-border text-ink hover:border-primary/40"
                            }`}
                          >
                            {previewId === r.mission_run_id ? "Previewing" : "Preview"}
                          </button>
                          <a href={api.reportUrl(r.mission_run_id)} target="_blank" rel="noreferrer" className="p-1.5 text-ink-secondary hover:text-primary">
                            <span className="material-symbols-outlined text-[18px]">download</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel title="Report Preview" subtitle="A4 post-flight summary">
            {preview ? (
              <div className="bg-white border border-border rounded-control shadow-inner p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div>
                    <div className="text-[13px] font-bold text-ink">AeroTwin Post-Flight Report</div>
                    <div className="text-[10px] text-ink-muted font-mono">{preview.mission_run_id}</div>
                  </div>
                  <span className="material-symbols-outlined text-primary text-[22px]">verified</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-ink-muted">Engine: </span>
                    <span className="text-ink">{preview.engine_id}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted">Mission: </span>
                    <span className="text-ink">{preview.mission_id ?? "--"}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted">Duration: </span>
                    <span className="text-ink">{preview.duration_hours.toFixed(2)}h</span>
                  </div>
                  <div>
                    <span className="text-ink-muted">Samples: </span>
                    <span className="text-ink">{preview.n_samples}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <MiniKpi label="Health End" value={preview.health_index_end != null ? Math.round(preview.health_index_end).toString() : "--"} />
                  <MiniKpi label="RUL (h)" value={preview.rul_hours_end != null ? Math.round(preview.rul_hours_end).toString() : "--"} />
                  <MiniKpi label="Alarms" value={preview.total_alarms.toString()} />
                  <MiniKpi label="Faults" value={preview.faults_observed.length.toString()} />
                </div>
                <div>
                  <div className="text-[10px] uppercase text-ink-muted font-mono mb-1.5">Peak values vs. limits</div>
                  <div className="space-y-1">
                    {Object.entries(preview.peak_values).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-ink-secondary">{LIMIT_LABELS[key] ?? key}</span>
                        <span className={preview.exceeded[key] ? "text-status-critical font-semibold" : "text-ink"}>
                          {value.toFixed(1)} / {preview.limits[key]?.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {preview.faults_observed.length > 0 && (
                  <div className="bg-status-watch-bg border border-status-watch/30 rounded-control p-2.5">
                    <div className="text-[11px] font-semibold text-ink mb-1">Diagnosed anomalies</div>
                    <div className="text-[11px] text-ink-secondary">{preview.faults_observed.join(", ")}</div>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex items-center justify-between">
                  <span className="text-[10px] text-ink-muted font-mono">Generated from stored telemetry — AeroTwin Digital Twin</span>
                  <a href={api.reportUrl(preview.mission_run_id)} target="_blank" rel="noreferrer" className="bg-primary text-white rounded-control px-3 py-1.5 text-xs font-semibold hover:bg-primary-hover transition-colors">
                    Download Signed PDF
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-muted py-6 text-center">Select a mission run to preview its report.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-canvas border border-border rounded-control p-2 text-center">
      <div className="text-[9px] uppercase text-ink-muted font-mono">{label}</div>
      <div className="font-mono font-bold text-ink text-sm">{value}</div>
    </div>
  );
}
