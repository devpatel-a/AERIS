import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Panel, RiskPill } from "../components/ui";

export default function Diagnostics() {
  const [advisories, setAdvisories] = useState<Record<string, any>[]>([]);
  const [ml, setMl] = useState<Record<string, any> | null>(null);
  const [mlError, setMlError] = useState<string | null>(null);

  useEffect(() => {
    api.advisories().then(setAdvisories).catch(() => {});
    api.mlSummary().then(setMl).catch((e) => setMlError(String(e)));
  }, []);

  return (
    <div className="space-y-4">
      <Panel title="Recent alerts / advisories">
        {advisories.length === 0 ? (
          <p className="text-sm text-slate-500">No alerts recorded yet — start a LIVE session and inject a fault.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-slate-500 uppercase">
              <tr>
                <th className="text-left py-1">Time (s)</th>
                <th className="text-left py-1">Subsystem</th>
                <th className="text-left py-1">Severity</th>
                <th className="text-left py-1">Message</th>
              </tr>
            </thead>
            <tbody>
              {advisories.map((a, i) => (
                <tr key={i} className="border-t border-gcs-border">
                  <td className="py-1">{a.t_s?.toFixed?.(0) ?? a.t_s}</td>
                  <td className="py-1">{a.subsystem}</td>
                  <td className="py-1">
                    <RiskPill level={a.severity} />
                  </td>
                  <td className="py-1 text-slate-400">{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title="Fault classifier — SHAP explanations (offline eval, sample predictions)">
        {mlError && <p className="text-sm text-slate-500">No trained model found. Run `make train` first.</p>}
        {ml?.sample_shap_explanations && (
          <ul className="text-sm space-y-2">
            {ml.sample_shap_explanations.map((e: string, i: number) => (
              <li key={i} className="border-l-2 border-gcs-accent pl-2 text-slate-300">
                {e}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {ml && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Panel title="Detection lead time vs threshold alarm">
            <p className="text-2xl font-mono">{ml.detection_lead_time?.mean_lead_time_s?.toFixed?.(0) ?? "--"}s</p>
            <p className="text-xs text-slate-500">
              earlier than hard-limit alarm, averaged over {ml.detection_lead_time?.n_samples ?? 0} samples
            </p>
          </Panel>
          <Panel title="RUL particle filter RMSE">
            <p className="text-2xl font-mono">{ml.rul_rmse_hours?.toFixed?.(1) ?? "--"} h</p>
            <p className="text-xs text-slate-500">vs known time-to-failure on run-to-failure samples</p>
          </Panel>
          <Panel title="Edge (ONNX) model">
            <p className="text-2xl font-mono">{ml.edge_benchmark?.latency_ms_mean?.toFixed?.(3) ?? "--"} ms</p>
            <p className="text-xs text-slate-500">mean inference latency, {ml.edge_benchmark?.model_size_kb?.toFixed?.(1)} KB</p>
          </Panel>
        </div>
      )}
    </div>
  );
}
