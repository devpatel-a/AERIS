import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Panel } from "../components/ui";

export default function Reports() {
  const [runs, setRuns] = useState<string[]>([]);

  useEffect(() => {
    api.replayList().then(setRuns).catch(() => {});
  }, []);

  return (
    <Panel title="Post-flight PDF reports">
      {runs.length === 0 ? (
        <p className="text-sm text-slate-500">No stored mission runs yet. Run a LIVE/SIMULATION session first.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-slate-500 uppercase text-xs">
            <tr>
              <th className="text-left py-1">Mission run</th>
              <th className="text-left py-1"></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r} className="border-t border-gcs-border">
                <td className="py-2">{r}</td>
                <td className="py-2 text-right">
                  <a
                    href={api.reportUrl(r)}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-gcs-accent/20 border border-gcs-accent/50 text-gcs-accent px-3 py-1 rounded text-xs"
                  >
                    Download PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
