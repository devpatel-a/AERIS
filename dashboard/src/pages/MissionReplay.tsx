import { useEffect, useMemo, useState } from "react";
import { api, type MissionRun } from "../lib/api";
import { useLiveHistory } from "../lib/useLiveHistory";
import { Panel, RiskPill } from "../components/ui";
import { LineChart } from "../components/aeris";

const SPEEDS = [1, 10, 50, 200];

export default function MissionReplay() {
  const [runs, setRuns] = useState<MissionRun[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MissionRun | null>(null);
  const [speed, setSpeed] = useState(10);
  const [playing, setPlaying] = useState(true);
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const [events, setEvents] = useState<Record<string, any>[]>([]);
  const { history, latest } = useLiveHistory(2000);

  useEffect(() => {
    api.replayList().then((r) => setRuns(r));
  }, []);

  const filtered = runs.filter((r) => r.mission_run_id.toLowerCase().includes(search.toLowerCase()));

  async function select(run: MissionRun) {
    setSelected(run);
    const res = await api.replayStart(run.mission_run_id, speed);
    setTotalRows((res as any).total_rows);
    setPlaying(true);
    api.advisories(run.mission_run_id).then(setEvents).catch(() => setEvents([]));
  }

  async function togglePlay() {
    const next = !playing;
    await api.replayControl(next ? "play" : "pause");
    setPlaying(next);
  }

  async function seek(t: number) {
    await api.replayControl("seek", { seek_t_s: t });
  }

  async function changeSpeed(v: number) {
    setSpeed(v);
    await api.replayControl("speed", { speed: v });
  }

  const chtSeries = useMemo(
    () => [1, 2, 3, 4].map((c) => ({ name: `CYL ${c}`, color: ["#1E5EFF", "#0EA5A4", "#F59E0B", "#DC2626"][c - 1], data: history.map((r) => (r.measured || r.true || {})[`cht_${c}_k`] ?? null) })),
    [history],
  );
  const egtSeries = useMemo(
    () => [1, 2, 3, 4].map((c) => ({ name: `CYL ${c}`, color: ["#1E5EFF", "#0EA5A4", "#F59E0B", "#DC2626"][c - 1], data: history.map((r) => (r.measured || r.true || {})[`egt_${c}_k`] ?? null) })),
    [history],
  );
  const rpmSeries = useMemo(() => history.map((r) => (r.measured || r.true || {}).rpm ?? null), [history]);
  const oilPSeries = useMemo(() => history.map((r) => (r.measured || r.true || {}).oil_pressure_kpa ?? null), [history]);
  const oilTSeries = useMemo(() => history.map((r) => (r.measured || r.true || {}).oil_temp_k ?? null), [history]);
  const healthSeries = useMemo(() => history.map((r) => r.health_index ?? null), [history]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-3">
          <Panel title="Stored Missions" subtitle={`${runs.length} logged`}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search mission run…"
              className="w-full bg-canvas border border-border rounded-control px-2.5 py-1.5 text-xs font-mono text-ink mb-3"
            />
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {filtered.map((r) => (
                <button
                  key={r.mission_run_id}
                  onClick={() => select(r)}
                  className={`w-full text-left p-2.5 rounded-control border transition-colors ${
                    selected?.mission_run_id === r.mission_run_id ? "border-2 border-primary bg-blue-50/30" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold text-ink truncate">{r.mission_run_id}</span>
                    {r.summary?.health_risk_end && <RiskPill level={r.summary.health_risk_end} />}
                  </div>
                  <div className="text-[10px] text-ink-muted font-mono mt-1">
                    {r.mission_id ?? "--"} · {r.summary ? `${r.summary.duration_hours.toFixed(2)}h` : "--"}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-sm text-ink-muted">No stored runs match.</p>}
            </div>
          </Panel>
        </div>

        <div className="xl:col-span-6 space-y-4">
          <Panel title="RPM">
            <LineChart series={[{ name: "rpm", color: "#1E5EFF", data: rpmSeries }]} height={130} />
          </Panel>
          <Panel title="Cylinder Head Temperature">
            <LineChart series={chtSeries} height={150} />
          </Panel>
          <Panel title="Exhaust Gas Temperature">
            <LineChart series={egtSeries} height={150} />
          </Panel>
          <Panel title="Oil Pressure / Temperature">
            <LineChart series={[{ name: "pressure", color: "#1E5EFF", data: oilPSeries }, { name: "temp", color: "#F59E0B", data: oilTSeries }]} height={130} />
          </Panel>
          <Panel title="Health Index">
            <LineChart series={[{ name: "health index", color: "#16A34A", data: healthSeries, area: true }]} height={130} />
          </Panel>
        </div>

        <div className="xl:col-span-3">
          <Panel title="Mission Summary">
            {selected?.summary ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-canvas border border-border rounded-control p-2">
                    <div className="text-[10px] text-ink-muted uppercase font-mono">Health Δ</div>
                    <div className="font-mono font-bold text-ink">
                      {selected.summary.health_index_start != null && selected.summary.health_index_end != null
                        ? `${Math.round(selected.summary.health_index_start)} → ${Math.round(selected.summary.health_index_end)}`
                        : "--"}
                    </div>
                  </div>
                  <div className="bg-canvas border border-border rounded-control p-2">
                    <div className="text-[10px] text-ink-muted uppercase font-mono">Duration</div>
                    <div className="font-mono font-bold text-ink">{selected.summary.duration_hours.toFixed(2)}h</div>
                  </div>
                  <div className="bg-canvas border border-border rounded-control p-2">
                    <div className="text-[10px] text-ink-muted uppercase font-mono">Alarms</div>
                    <div className="font-mono font-bold text-ink">{selected.summary.total_alarms}</div>
                  </div>
                  <div className="bg-canvas border border-border rounded-control p-2">
                    <div className="text-[10px] text-ink-muted uppercase font-mono">Samples</div>
                    <div className="font-mono font-bold text-ink">{selected.summary.n_samples}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-ink-muted uppercase font-mono mb-1">Faults observed</div>
                  <div className="text-ink text-xs">{selected.summary.faults_observed.length ? selected.summary.faults_observed.join(", ") : "None"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-ink-muted uppercase font-mono mb-1.5">Event timeline</div>
                  <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                    {events.slice(0, 12).map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                            e.severity === "CRITICAL" ? "bg-status-critical" : e.severity === "WARNING" ? "bg-status-warning" : "bg-status-watch"
                          }`}
                        />
                        <div>
                          <div className="text-ink-secondary font-mono">
                            t={e.t_s?.toFixed?.(0)}s · {e.subsystem}
                          </div>
                          <div className="text-ink">{e.message}</div>
                        </div>
                      </li>
                    ))}
                    {events.length === 0 && <li className="text-ink-muted text-xs">No events recorded.</li>}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Select a mission run to see its summary.</p>
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Playback">
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={togglePlay} disabled={!selected} className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40">
            <span className="material-symbols-outlined text-[20px]">{playing ? "pause" : "play_arrow"}</span>
          </button>
          <div className="flex items-center gap-1 bg-canvas p-1 rounded-control border border-border">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => changeSpeed(s)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                  s === speed ? "bg-surface text-primary shadow-card" : "text-ink-secondary hover:text-ink"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
          {totalRows !== null && (
            <input
              type="range"
              min={0}
              max={totalRows}
              defaultValue={0}
              className="flex-1 min-w-[200px]"
              onMouseUp={(e) => seek(Number((e.target as HTMLInputElement).value))}
            />
          )}
          {latest?.t_s != null && <span className="font-mono text-xs text-ink-secondary whitespace-nowrap">t = {latest.t_s.toFixed(0)}s</span>}
        </div>
      </Panel>
    </div>
  );
}
