import { useEffect, useState } from "react";
import { api, type TailHeatmap, type TailStatus } from "../lib/api";
import { Panel, RiskPill } from "../components/ui";
import { LineChart } from "../components/aeris";

function indexTone(value: number | null): string {
  if (value == null) return "bg-slate-50 text-slate-300";
  if (value >= 80) return "bg-status-normal-bg text-status-normal";
  if (value >= 60) return "bg-status-watch-bg text-status-watch";
  if (value >= 40) return "bg-status-warning-bg text-status-warning";
  return "bg-status-critical-bg text-status-critical";
}

export default function TrendsFleet() {
  const [fleet, setFleet] = useState<TailStatus[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [heatmap, setHeatmap] = useState<TailHeatmap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .fleetTable()
      .then((rows) => {
        setFleet(rows);
        if (rows.length) setSelected(rows[0].tail_id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.fleetHeatmap(selected, 12).then(setHeatmap).catch(() => setHeatmap(null));
  }, [selected]);

  const selectedTail = fleet.find((t) => t.tail_id === selected);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-muted uppercase tracking-wide font-mono mr-1">Fleet tail</span>
        {fleet.map((t) => (
          <button
            key={t.tail_id}
            onClick={() => setSelected(t.tail_id)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold border transition-colors ${
              t.tail_id === selected ? "bg-primary text-white border-primary" : "bg-surface text-ink-secondary border-border hover:border-primary/40"
            }`}
          >
            {t.tail_id}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title={`Health Index Trend — ${selected ?? "…"}`} subtitle="Overall composite index, last 12 missions">
          {heatmap && heatmap.health_index.some((v) => v != null) ? (
            <LineChart series={[{ name: "health index", color: "#16A34A", data: heatmap.health_index, area: true }]} />
          ) : (
            <p className="text-sm text-ink-muted py-6">No mission history for this tail yet.</p>
          )}
        </Panel>
        <Panel title={`RUL Trend — ${selected ?? "…"}`} subtitle="Estimated remaining useful life, last 12 missions">
          {heatmap && heatmap.rul_hours.some((v) => v != null) ? (
            <LineChart series={[{ name: "RUL hours", color: "#0EA5A4", data: heatmap.rul_hours }]} yFormatter={(v) => `${Math.round(v)}h`} />
          ) : (
            <p className="text-sm text-ink-muted py-6">No mission history for this tail yet.</p>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Panel title="Fleet Health Table" subtitle={`${fleet.length} tails tracked`}>
            {loading ? (
              <p className="text-sm text-ink-muted">Loading fleet…</p>
            ) : (
              <table className="w-full text-xs font-mono">
                <thead className="text-ink-muted uppercase tracking-wide">
                  <tr>
                    <th className="text-left py-1.5 font-medium">Tail</th>
                    <th className="text-left py-1.5 font-medium">Serial</th>
                    <th className="text-left py-1.5 font-medium">Hours</th>
                    <th className="text-left py-1.5 font-medium">Health</th>
                    <th className="text-left py-1.5 font-medium">RUL</th>
                    <th className="text-left py-1.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fleet.map((t) => (
                    <tr
                      key={t.tail_id}
                      className={`border-t border-border cursor-pointer ${t.tail_id === selected ? "bg-blue-50/40" : ""}`}
                      onClick={() => setSelected(t.tail_id)}
                    >
                      <td className="py-2 text-ink font-semibold">{t.tail_id}</td>
                      <td className="py-2 text-ink-secondary">{t.engine_serial}</td>
                      <td className="py-2 text-ink">{t.total_hours.toFixed(1)}</td>
                      <td className="py-2 text-ink">{t.health_index != null ? Math.round(t.health_index) : "--"}</td>
                      <td className="py-2 text-ink">{t.rul_hours != null ? `${Math.round(t.rul_hours)}h` : "--"}</td>
                      <td className="py-2">{t.health_risk ? <RiskPill level={t.health_risk} /> : <span className="text-ink-muted">--</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
        <div>
          <Panel title="Tail Notes">
            {selectedTail ? (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-ink-muted text-xs uppercase tracking-wide">Last mission</div>
                  <div className="text-ink font-mono">{selectedTail.last_mission_id ?? "--"}</div>
                </div>
                <div>
                  <div className="text-ink-muted text-xs uppercase tracking-wide">Faults observed</div>
                  <div className="text-ink">{selectedTail.faults_observed.length ? selectedTail.faults_observed.join(", ") : "None"}</div>
                </div>
                {selectedTail.notes && (
                  <div className="pt-2 border-t border-border text-ink-secondary text-xs">{selectedTail.notes}</div>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Select a tail.</p>
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Subsystem × Mission Heatmap" subtitle={`${selected ?? "…"} — per-subsystem health index across its last missions`}>
        {heatmap && heatmap.mission_labels.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="text-left py-1 px-2 text-ink-muted uppercase tracking-wide">Subsystem</th>
                  {heatmap.mission_labels.map((m) => (
                    <th key={m} className="text-center py-1 px-2 text-ink-muted">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(heatmap.subsystems).map(([name, values]) => (
                  <tr key={name}>
                    <td className="py-1 px-2 text-ink font-semibold whitespace-nowrap">{name.replace(/_/g, " ")}</td>
                    {values.map((v, i) => (
                      <td key={i} className={`text-center py-1 px-2 rounded font-semibold ${indexTone(v)}`}>
                        {v != null ? Math.round(v) : "--"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-ink-muted py-6">No mission history for this tail yet.</p>
        )}
      </Panel>
    </div>
  );
}
