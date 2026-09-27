/* Stitch screen "AeroTwin — Screen 3: Diagnostics", bound to live analytics + prognostics. */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NoLiveSession } from "../components/stitch/NoLiveSession";
import { useStation } from "../app/StationContext";
import { API_BASE, request } from "../lib/api";
import { getToken } from "../lib/authToken";
import { useLiveSocket, type LiveRow } from "../lib/useLiveSocket";
import { usePoll } from "../lib/usePoll";
import { fmt, fmtHms, kpaToBar, kpaToInHg, kToC, signed } from "../lib/units";

const CARD = "bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)]";
const CHIP = "rounded-full h-[22px] px-2 text-telemetry-sm font-telemetry-sm inline-flex items-center gap-1.5 font-bold";
const SEV: Record<string, { chip: string; dot: string; bar: string; row: string }> = {
  WATCH: { chip: "bg-[#FEF3C7] text-[#B45309]", dot: "bg-[#F59E0B]", bar: "bg-[#F59E0B]", row: "bg-[#EA580C]" },
  WARNING: { chip: "bg-[#FFEDD5] text-[#C2410C]", dot: "bg-[#EA580C]", bar: "bg-[#EA580C]", row: "bg-[#EA580C]" },
  CRITICAL: { chip: "bg-[#FEE2E2] text-[#B91C1C]", dot: "bg-[#DC2626]", bar: "bg-[#DC2626]", row: "bg-[#DC2626]" },
  PREDICTED: { chip: "bg-surface-container-highest text-primary", dot: "bg-primary", bar: "bg-primary", row: "bg-primary" },
  "LOW/MONITOR": { chip: "bg-[#DCFCE7] text-[#15803D]", dot: "bg-[#16A34A]", bar: "bg-secondary", row: "bg-secondary" },
};
const RISK_CHIP: Record<string, { chip: string; dot: string }> = {
  GO: { chip: "bg-[#DCFCE7] text-[#15803D]", dot: "bg-[#16A34A]" },
  CAUTION: { chip: "bg-[#FEF3C7] text-[#B45309]", dot: "bg-[#F59E0B]" },
  "NO-GO": { chip: "bg-[#FEE2E2] text-[#B91C1C]", dot: "bg-[#DC2626]" },
};
const MISSION_RISK: Record<string, string> = { NORMAL: "GO", WATCH: "CAUTION", WARNING: "NO-GO", CRITICAL: "NO-GO" };

export default function Diagnostics() {
  const { latest } = useLiveSocket();
  if (!latest || latest.mode !== "LIVE") return <NoLiveSession screen="Diagnostics" />;
  return <DiagnosticsScreen row={latest} />;
}

function DiagnosticsScreen({ row }: { row: LiveRow }) {
  const matrix: any[] = row.fault_matrix ?? [];
  const active = matrix.filter((f) => f.state === "ACTIVE").length;
  const predicted = matrix.filter((f) => f.state === "PREDICTED").length;
  const risk = MISSION_RISK[row.health_risk ?? "NORMAL"] ?? "GO";
  const rc = RISK_CHIP[risk];
  const half = row.rul_p95_hours != null && row.rul_p05_hours != null ? (row.rul_p95_hours - row.rul_p05_hours) / 2 : null;
  return (
    <main className="icon-base-18 flex-1 flex flex-col overflow-hidden bg-background min-h-0">
      <section className="bg-surface-container-lowest border-b border-outline-variant px-margin py-3 shrink-0 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">troubleshoot</span>
          <h1 className="text-headline-sm font-headline-sm text-on-surface">Propulsion Prognostics &amp; Diagnostics Engine</h1>
          <span className="px-2 py-0.5 rounded text-telemetry-sm font-telemetry-sm bg-surface-container text-on-surface-variant ml-2">{row.context?.tail_id ?? "UAV"} ENGINE BAY #1</span>
        </div>
        <div className="flex items-center gap-3">
          <Kpi label="Active faults:">
            <span className={`${CHIP} ${active ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#DCFCE7] text-[#15803D]"}`}><span className={`w-2 h-2 rounded-full ${active ? "bg-[#F59E0B]" : "bg-[#16A34A]"}`} />{active}</span>
          </Kpi>
          <Kpi label="Predicted faults:">
            <span className={`${CHIP} bg-surface-container-highest text-primary`}><span className="w-2 h-2 rounded-full bg-primary" />{predicted}</span>
          </Kpi>
          <Kpi label="RUL:">
            <span className="text-telemetry-md font-telemetry-md font-bold text-on-surface">
              {fmt(row.rul_mean_hours)}{row.rul_capped ? "+" : ""} hrs{" "}
              <span className="text-on-surface-variant text-telemetry-sm font-normal">{row.rul_capped ? "(TBO cap)" : half != null ? `(±${fmt(half)} hrs)` : ""}</span>
            </span>
          </Kpi>
          <Kpi label="Mission risk:">
            <span className={`${CHIP} ${rc.chip}`}><span className={`w-2 h-2 rounded-full ${rc.dot}`} />{risk}</span>
          </Kpi>
        </div>
      </section>
      <div className="flex-1 overflow-y-auto custom-scroll p-margin">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter h-full">
          <div className="lg:col-span-8 flex flex-col gap-gutter">
            <FaultMatrix row={row} />
            <Explanation />
            <RulCurve />
          </div>
          <div className="lg:col-span-4 flex flex-col gap-gutter">
            <Advisories tailId={row.context?.tail_id} />
            <Correlation />
          </div>
        </div>
      </div>
    </main>
  );
}

function Kpi({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-lg">
      <span className="text-label-caps font-label-caps text-on-surface-variant">{label}</span>
      {children}
    </div>
  );
}

function CardHeader({ icon, title, right }: { icon: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
        <h2 className="text-headline-sm font-headline-sm text-on-surface">{title}</h2>
      </div>
      {right}
    </div>
  );
}

/* ---------------------------------------------------------------- fault matrix */
function FaultMatrix({ row }: { row: LiveRow }) {
  const navigate = useNavigate();
  const matrix: any[] = row.fault_matrix ?? [];
  return (
    <div className={CARD}>
      <CardHeader
        icon="report_problem" title="Subsystem Anomaly & Inferred Fault Matrix"
        right={
          <div className="flex items-center gap-2">
            <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">Auto-Refresh {fmt(1000 / 7)}ms</span>
            <span className="w-2 h-2 rounded-full bg-secondary" />
          </div>
        }
      />
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="h-8 bg-[#F8FAFC] border-b border-[#CBD5E1] text-label-caps font-label-caps text-[#475569]">
              <th className="px-3">Fault</th>
              <th className="px-3">Subsystem</th>
              <th className="px-3 w-40">Confidence</th>
              <th className="px-3">Severity</th>
              <th className="px-3">First Detected</th>
              <th className="px-3">Trend</th>
              <th className="px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] font-body-md text-body-md">
            {matrix.length === 0 && (
              <tr className="h-10 bg-[#FFFFFF]">
                <td colSpan={7} className="px-3 text-on-surface-variant">No anomalies inferred — all subsystems track the digital twin.</td>
              </tr>
            )}
            {matrix.map((f, i) => {
              const s = SEV[f.severity] ?? SEV.WATCH;
              const trendText = f.trend === "Increasing" || f.trend === "Decreasing" ? `${f.trend} (${signed(f.trend_rate_pct_per_h / 100, 2)}/hr)` : f.trend;
              const action =
                f.state === "ACTIVE"
                  ? { icon: "search", label: "Isolate", cls: "text-primary", go: () => navigate(`/digital-twin${f.cylinder ? `?cyl=${f.cylinder}` : ""}`) }
                  : f.state === "PREDICTED"
                    ? { icon: "tune", label: "Trim", cls: "text-primary", go: () => navigate("/simulation-control") }
                    : { icon: "visibility", label: "Log", cls: "text-on-surface-variant", go: () => document.getElementById("diag-event-log")?.scrollIntoView({ behavior: "smooth" }) };
              return (
                <tr key={f.fault_type} className={`h-10 hover:bg-[#EEF4FF] transition-colors duration-100 ${i % 2 ? "bg-[#F8FAFC]" : "bg-[#FFFFFF]"}`}>
                  <td className="px-3 font-semibold text-on-surface flex items-center gap-2 pt-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.row}`} /> {f.label}
                  </td>
                  <td className="px-3 text-on-surface-variant">{f.subsystem}</td>
                  <td className="px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-surface-container h-2 rounded-full overflow-hidden">
                        <div className={`${s.bar} h-full rounded-full`} style={{ width: `${f.confidence * 100}%` }} />
                      </div>
                      <span className="text-telemetry-sm font-telemetry-sm font-bold text-on-surface">{fmt(f.confidence * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-3">
                    <span className={`${CHIP} ${s.chip}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{f.severity}</span>
                  </td>
                  <td className="px-3 text-telemetry-sm font-telemetry-sm text-on-surface-variant">{f.first_detected_t != null ? `T-${fmtHms(row.t_s - f.first_detected_t)}` : "--"}</td>
                  <td className={`px-3 text-telemetry-sm font-telemetry-sm ${f.trend === "Increasing" ? "text-[#C2410C] font-semibold" : "text-on-surface-variant"}`}>{trendText}</td>
                  <td className="px-3 text-right">
                    <button onClick={action.go} className={`px-2 py-1 rounded ${action.cls} hover:bg-surface-container font-headline-sm text-xs inline-flex items-center gap-1`}>
                      <span className="material-symbols-outlined text-[16px]">{action.icon}</span>
                      {action.label}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- explainable AI */
function Explanation() {
  const { data, error } = usePoll(() => request<any>("/api/diagnostics/explanation"), 5000);
  const shap: any[] = (data?.shap ?? []).slice(0, 4);
  const maxAbs = Math.max(0.5, ...shap.map((s) => Math.abs(s.value)));
  const axis = Math.ceil(maxAbs * 2) / 2;
  const colors = ["bg-[#F59E0B]", "bg-primary", "bg-surface-dim", "bg-surface-dim"];
  const textColors = ["text-[#B45309] font-bold", "text-primary font-bold", "text-on-surface-variant", "text-on-surface-variant"];
  return (
    <div className={CARD}>
      <CardHeader
        icon="psychology" title="Why the AI thinks so (Explainable AI Attribution)"
        right={<span className="px-2 py-0.5 rounded text-telemetry-sm font-telemetry-sm bg-surface-container-high text-primary font-bold">SHAPLEY RESIDUAL MATRIX</span>}
      />
      <div className="mt-3 p-3 bg-surface-container-low border-l-4 border-[#F59E0B] rounded-r-lg">
        <div className="flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[#B45309] shrink-0 mt-0.5">info</span>
          <p className="font-body-md text-body-md text-on-surface leading-relaxed">
            {data ? (data.fault_type === "healthy" ? "The classifier sees no fault signature in the current residual window; the attribution below shows what keeps it at 'healthy'." : `${data.label} (${fmt(data.confidence * 100, 1)}% confidence). ${data.narrative}`) : error ? "The fault classifier needs one full residual window before it can explain a diagnosis." : "Loading attribution…"}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="text-label-caps font-label-caps text-on-surface-variant">PARAMETER SHAPLEY IMPORTANCE VECTOR</div>
        {shap.map((f, i) => {
          const neg = f.value < 0;
          const rel = Math.abs(f.value) / maxAbs;
          const impact = neg ? "Negative/dampening impact" : rel > 0.6 ? "High impact" : rel > 0.25 ? "Moderate impact" : "Low impact";
          const width = `${Math.min((Math.abs(f.value) / axis) * 100, 100)}%`;
          return (
            <div key={f.feature} className="space-y-1">
              <div className="flex justify-between items-center text-body-sm font-body-sm">
                <span className="font-medium text-on-surface">{f.label}</span>
                <span className={`text-telemetry-sm font-telemetry-sm ${neg ? "text-secondary font-medium" : textColors[i]}`}>{signed(f.value, 2)} ({impact})</span>
              </div>
              <div className="h-3 w-full bg-surface-container rounded-sm overflow-hidden flex">
                <div className="w-1/2 flex justify-end items-center">{neg && <div className="h-full bg-secondary rounded-l-sm transition-all duration-300" style={{ width }} />}</div>
                <div className="w-1/2 bg-surface-container flex items-center">{!neg && <div className={`h-full ${colors[i]} rounded-r-sm transition-all duration-300`} style={{ width }} />}</div>
              </div>
            </div>
          );
        })}
        <div className="flex justify-between text-telemetry-sm font-telemetry-sm text-on-surface-variant pt-1 border-t border-surface-container">
          <span>{signed(-axis, 2)} (Dampening)</span>
          <span>0.00 (Neutral)</span>
          <span>{signed(axis, 2)} (Driving Anomaly)</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- RUL curve */
function RulCurve() {
  const { data } = usePoll(() => request<any>("/api/diagnostics/rul-curve"), 10000);
  const thr: number = data?.threshold_index ?? 70;
  const hist: any[] = data?.history ?? [];
  const proj: any[] = data?.projection ?? [];
  const now: number = data?.engine_hours_now ?? 0;
  const capped = data && data.rul_mean_hours >= 2000 - 1e-6;
  const hMin = hist.length ? Math.min(hist[Math.max(0, hist.length - 14)].engine_hours, now - 20) : now - 100;
  // Show the projection to the threshold crossing, but keep history legible: at most 3x the history span ahead.
  const projEnd = proj.length ? proj[proj.length - 1].engine_hours : now + 100;
  const hMax = Math.min(projEnd, now + 3 * (now - hMin));
  const yMin = thr - 15, yMax = 100;
  const X = (h: number) => 50 + ((h - hMin) / (hMax - hMin || 1)) * 580;
  const Y = (v: number) => 20 + ((yMax - Math.max(Math.min(v, yMax), yMin)) / (yMax - yMin)) * 135;
  const histPts = hist.filter((p) => p.engine_hours >= hMin).map((p) => `${X(p.engine_hours).toFixed(1)},${Y(p.health_index).toFixed(1)}`).join(" ");
  const inView = (p: any) => p.engine_hours <= hMax + 1e-6;
  const meanPts = proj.filter(inView).map((p) => `${X(p.engine_hours).toFixed(1)},${Y(p.mean).toFixed(1)}`).join(" ");
  const pv = proj.filter(inView);
  const band = [...pv.map((p) => `${X(p.engine_hours).toFixed(1)},${Y(p.p95).toFixed(1)}`), ...pv.map((p) => `${X(p.engine_hours).toFixed(1)},${Y(p.p05).toFixed(1)}`).reverse()].join(" ");
  const nowHi = hist.length ? hist[hist.length - 1].health_index : 100;
  const crossH = !capped && data?.rul_mean_hours != null ? now + data.rul_mean_hours : null;
  const ticks = [hMin, hMin + (now - hMin) / 2, now, now + (hMax - now) / 2, hMax];
  const yTicks = [100, (100 + thr) / 2, thr, yMin];
  return (
    <div className={`${CARD} flex flex-col`}>
      <CardHeader
        icon="timeline" title="Remaining Useful Life (RUL) Prognostics Curve"
        right={
          <div className="flex items-center gap-3 text-telemetry-sm font-telemetry-sm">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-primary" />Mean Prediction</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-primary/20 border border-primary/40" />90% Confidence Interval</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-error" />Threshold</span>
          </div>
        }
      />
      <div className="relative w-full h-56 mt-3">
        {data && (
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 650 200">
            <defs>
              <linearGradient id="rulEnvelope" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#1E5EFF" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#1E5EFF" stopOpacity="0.04" />
              </linearGradient>
            </defs>
            {yTicks.map((v) => (
              <g key={v}>
                <line stroke="#E3E8EF" strokeDasharray="3 3" x1="50" x2="630" y1={Y(v)} y2={Y(v)} />
                <text className="fill-[#737688] font-telemetry-sm text-[10px]" textAnchor="end" x="42" y={Y(v) + 4}>{fmt(v)}</text>
              </g>
            ))}
            <line stroke="#DC2626" strokeDasharray="4 2" strokeWidth="1.5" x1="50" x2="630" y1={Y(thr)} y2={Y(thr)} />
            <text className="fill-error font-telemetry-sm text-[10px] font-bold" x="635" y={Y(thr) + 3}>Limit: {fmt(thr)}</text>
            <polyline fill="none" points={histPts} stroke="#0047d3" strokeWidth="2.5" />
            <line stroke="#434656" strokeDasharray="2 2" strokeWidth="1" x1={X(now)} x2={X(now)} y1="15" y2="175" />
            <polygon fill="url(#rulEnvelope)" points={band} />
            <polyline fill="none" points={meanPts} stroke="#0047d3" strokeDasharray="4 3" strokeWidth="2" />
            <circle className="fill-primary stroke-surface stroke-2" cx={X(now)} cy={Y(nowHi)} r="4.5" />
            {crossH != null && crossH <= hMax && <circle className="fill-[#DC2626]" cx={X(crossH)} cy={Y(thr)} r="4" />}
            <line stroke="#CBD5E1" strokeWidth="1" x1="50" x2="630" y1="175" y2="175" />
            {ticks.map((h, i) => (
              <text key={i} className={i === 2 ? "fill-primary font-telemetry-sm text-[10px] font-bold" : "fill-[#737688] font-telemetry-sm text-[10px]"} textAnchor="middle" x={X(h)} y="190">
                {fmt(h)}h{i === 2 ? " (NOW)" : ""}
              </text>
            ))}
          </svg>
        )}
      </div>
      <div className="mt-2 p-2.5 bg-surface-container-low border border-outline-variant rounded flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">hourglass_bottom</span>
          <span className="text-body-md font-body-md font-semibold text-on-surface">Prognostic Horizon:</span>
          <span className="text-on-surface-variant text-body-md font-body-md">
            {!data ? "--" : capped
              ? `${fmt(data.rul_mean_hours)}+ hrs — no significant degradation trend; capped at the TBO horizon`
              : `${fmt(data.rul_mean_hours)} hrs (${fmt(data.rul_p05_hours)}–${fmt(data.rul_p95_hours)} hrs) to maintenance threshold at current degradation rate`}
          </span>
        </div>
        <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant font-bold">Confidence: 90%</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- advisories */
const PRIORITY: Record<string, { chip: string; dot: string; label: string }> = {
  HIGH: { chip: "bg-[#FEF3C7] text-[#B45309]", dot: "bg-[#F59E0B]", label: "High Priority" },
  MEDIUM: { chip: "bg-surface-container-highest text-primary", dot: "bg-primary", label: "Medium Priority" },
  LOW: { chip: "bg-surface-container text-on-surface-variant", dot: "bg-outline", label: "Low Priority" },
};

function Advisories({ tailId }: { tailId: string | null | undefined }) {
  const { data, refresh } = usePoll(() => request<any[]>(`/api/maintenance/advisories?tail_id=${tailId}`), 5000, [tailId]);
  const [busy, setBusy] = useState(false);
  const items: any[] = data ?? [];
  const pending = items.filter((a) => !a.reviewed && !a.work_order);
  const act = async (path: string, keys: string[]) => {
    if (!keys.length) return;
    setBusy(true);
    try {
      await request(path, { method: "POST", body: JSON.stringify({ tail_id: tailId, advisory_keys: keys }) });
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`${CARD} flex flex-col`}>
      <CardHeader icon="checklist" title="Maintenance Advisory" right={<span className={`text-telemetry-sm font-telemetry-sm font-bold ${pending.length ? "text-[#B45309]" : "text-[#15803D]"}`}>{pending.length} Action{pending.length === 1 ? "" : "s"} Pending</span>} />
      <div className="mt-3 space-y-3 flex-1">
        {items.length === 0 && <p className="text-body-sm font-body-sm text-on-surface-variant">No maintenance actions raised by current detections.</p>}
        {items.map((a) => {
          const p = PRIORITY[a.priority] ?? PRIORITY.LOW;
          return (
            <div key={a.advisory_key} className={`p-3 bg-surface border border-outline-variant rounded-lg space-y-1.5 hover:border-primary/40 transition-colors ${a.reviewed || a.work_order ? "opacity-70" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-headline-sm font-headline-sm text-on-surface text-sm">{a.title}</span>
                <span className={`rounded-full h-[20px] px-2 text-telemetry-sm font-telemetry-sm inline-flex items-center gap-1 font-bold ${p.chip}`}><span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />{p.label}</span>
              </div>
              <p className="text-body-sm font-body-sm text-on-surface-variant">{a.detail}</p>
              <div className="text-telemetry-sm font-telemetry-sm text-primary flex items-center gap-1 pt-1">
                <span className="material-symbols-outlined text-[14px]">pin_drop</span> ATA {a.ata} / {a.location}
                {a.work_order && <span className="text-on-surface-variant ml-auto">{a.work_order}</span>}
                {!a.work_order && a.reviewed && <span className="text-on-surface-variant ml-auto">Reviewed</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-outline-variant flex items-center gap-2">
        <button disabled={busy || !pending.length} onClick={() => act("/api/maintenance/work-orders", pending.map((a) => a.advisory_key))} className="flex-1 h-[36px] bg-primary text-on-primary rounded text-headline-sm font-headline-sm flex items-center justify-center gap-1.5 hover:bg-[#1748D1] active:bg-[#143DAF] transition-colors shadow-sm disabled:opacity-60">
          <span className="material-symbols-outlined text-[18px]">assignment_add</span> Create Work Order
        </button>
        <button disabled={busy || !pending.length} onClick={() => act("/api/maintenance/advisories/review", pending.map((a) => a.advisory_key))} className="h-[36px] px-3 bg-surface-container-lowest border border-outline-variant text-on-surface rounded text-headline-sm font-headline-sm hover:bg-surface-container hover:border-outline transition-colors disabled:opacity-60">
          Mark Reviewed
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- correlation + event log */
const EVENT_BORDER: Record<string, string> = {
  THRESHOLD: "border-[#F59E0B]", LIMIT_WARNING: "border-[#F59E0B]", DETECTED: "border-[#F59E0B]", INJECTED: "border-[#DC2626]",
  AI_DIAGNOSIS: "border-primary", KALMAN: "border-primary", RUL_UPDATE: "border-primary",
};

function Correlation() {
  const station = useStation();
  const { data } = usePoll(() => request<any>("/api/diagnostics/correlation"), 2000);
  const events = usePoll(() => request<any[]>("/api/live/events?limit=3"), 3000).data ?? [];
  const { latest } = useLiveSocket();
  const bus = latest?.hil_bus;
  const cd = data?.cht_delta;
  const cp = data?.coolant_pressure;
  const cpDelta = cp?.value_kpa != null && cp?.expected_kpa != null ? kpaToBar(cp.value_kpa - cp.expected_kpa) : null;
  const trace = async () => {
    const res = await fetch(`${API_BASE}/api/health/history.csv?seconds=600`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await res.blob());
    a.download = "raw_trace.csv";
    a.click();
  };
  return (
    <div className={`${CARD} flex-1 flex flex-col justify-between`}>
      <div>
        <CardHeader icon="hub" title="Sensor Correlation & Context" right={<span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">{station?.avionics_bus?.replace("MIL-STD-1553B", "MIL-STD-1553") ?? ""} Bus</span>} />
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Tile label={`CHT ${cd?.cylinder ?? ""} DELTA`} value={`${signed(cd?.value_k, 1)} °C`} valueClass={cd?.value_k > 3 ? "text-[#C2410C]" : "text-on-surface"} note="div" />
          <Tile label="COOLANT PRESS" value={`${fmt(kpaToBar(cp?.value_kpa), 2)} bar`} note={cpDelta == null ? "" : `(${signed(cpDelta, 2)})`} />
          <Tile label="OIL TEMP (RT)" value={`${fmt(kToC(data?.oil_temp?.value_k), 1)} °C`} note={data?.oil_temp?.status ?? ""} noteClass="text-secondary font-bold" />
          <Tile label="MAP BOOST" value={`${fmt(kpaToInHg(data?.map?.value_kpa), 1)} inHg`} note={data?.map?.pct_of_expected != null ? `${fmt(data.map.pct_of_expected)}%` : ""} noteClass="text-secondary font-bold" />
        </div>
        <div className="mt-3" id="diag-event-log">
          <div className="text-label-caps font-label-caps text-on-surface-variant mb-1.5">RECENT DIAGNOSTIC EVENT LOG</div>
          <div className="space-y-1.5 text-telemetry-sm font-telemetry-sm">
            {events.length === 0 && <div className="p-1.5 bg-surface rounded text-on-surface-variant">No diagnostic events yet.</div>}
            {events.map((e, i) => (
              <div key={i} className={`flex items-center justify-between p-1.5 bg-surface rounded text-on-surface-variant border-l-2 ${EVENT_BORDER[e.kind] ?? "border-outline-variant"}`}>
                <span>{new Date(e.wall_ts * 1000).toISOString().slice(11, 19)} UTC</span>
                <span className="text-on-surface font-medium truncate ml-2">{e.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 pt-2.5 border-t border-outline-variant flex items-center justify-between text-telemetry-sm font-telemetry-sm text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${bus?.hmac_verified ? "bg-secondary" : "bg-outline"}`} />
          HIL bus {bus?.channel?.slice(-4) ?? "--"} · {bus?.hmac_verified ? "HMAC verified" : "unverified"}
        </span>
        <span onClick={trace} className="font-bold text-primary cursor-pointer hover:underline">View Raw Trace</span>
      </div>
    </div>
  );
}

function Tile({ label, value, note, valueClass = "text-on-surface", noteClass = "text-on-surface-variant" }: { label: string; value: string; note: string; valueClass?: string; noteClass?: string }) {
  return (
    <div className="p-2 bg-surface-container-low rounded border border-outline-variant">
      <div className="text-label-caps font-label-caps text-on-surface-variant">{label}</div>
      <div className={`text-telemetry-md font-telemetry-md font-bold mt-0.5 ${valueClass}`}>
        {value} <span className={`text-body-sm font-normal ${noteClass}`}>{note}</span>
      </div>
    </div>
  );
}
