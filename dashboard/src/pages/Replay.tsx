import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useLiveHistory } from "../lib/useLiveHistory";
import { Panel } from "../components/ui";

export default function Replay() {
  const [runs, setRuns] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [speed, setSpeed] = useState(10);
  const [playing, setPlaying] = useState(true);
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const { latest } = useLiveHistory(1);

  useEffect(() => {
    api.replayList().then((r) => {
      setRuns(r);
      if (r.length) setSelected(r[0]);
    });
  }, []);

  async function start() {
    if (!selected) return;
    const res = await api.replayStart(selected, speed);
    setTotalRows((res as any).total_rows);
    setPlaying(true);
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

  return (
    <div className="space-y-4">
      <Panel title="Replay a stored mission">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Mission run</label>
            <select value={selected} onChange={(e) => setSelected(e.target.value)} className="bg-gcs-bg border border-gcs-border rounded px-2 py-1">
              {runs.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button onClick={start} className="bg-gcs-accent/20 border border-gcs-accent/50 text-gcs-accent px-4 py-1.5 rounded text-sm">
            Load
          </button>
          <button onClick={togglePlay} className="bg-gcs-panel border border-gcs-border px-4 py-1.5 rounded text-sm">
            {playing ? "Pause" : "Play"}
          </button>
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Speed ({speed}x)</label>
            <input
              type="range"
              min={1}
              max={200}
              value={speed}
              onChange={(e) => changeSpeed(Number(e.target.value))}
            />
          </div>
        </div>
        {totalRows !== null && (
          <div className="mt-4">
            <label className="block text-xs text-slate-500 uppercase mb-1">Seek</label>
            <input
              type="range"
              min={0}
              max={totalRows}
              defaultValue={0}
              className="w-full"
              onMouseUp={(e) => seek(Number((e.target as HTMLInputElement).value))}
            />
          </div>
        )}
      </Panel>

      <Panel title="Current replay frame">
        <pre className="text-xs text-slate-400 overflow-auto max-h-96">{JSON.stringify(latest, null, 2)}</pre>
      </Panel>
    </div>
  );
}
