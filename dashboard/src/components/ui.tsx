import type { ReactNode } from "react";

export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`bg-gcs-panel border border-gcs-border rounded-lg p-4 ${className}`}>
      {title && <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-3">{title}</h3>}
      {children}
    </div>
  );
}

const RISK_COLORS: Record<string, string> = {
  NORMAL: "bg-gcs-green/20 text-gcs-green border-gcs-green/40",
  WATCH: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  WARNING: "bg-gcs-amber/20 text-gcs-amber border-gcs-amber/40",
  CRITICAL: "bg-gcs-red/20 text-gcs-red border-gcs-red/40",
  GO: "bg-gcs-green/20 text-gcs-green border-gcs-green/40",
  CAUTION: "bg-gcs-amber/20 text-gcs-amber border-gcs-amber/40",
  "NO-GO": "bg-gcs-red/20 text-gcs-red border-gcs-red/40",
};

export function RiskPill({ level }: { level: string }) {
  const cls = RISK_COLORS[level] || "bg-slate-500/20 text-slate-300 border-slate-500/40";
  return <span className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold ${cls}`}>{level}</span>;
}

export function ModeBadge({ mode, connected }: { mode?: string; connected: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`w-2 h-2 rounded-full ${connected ? "bg-gcs-green animate-pulse" : "bg-gcs-red"}`}
        title={connected ? "connected" : "disconnected"}
      />
      <span className="uppercase tracking-wider text-slate-400">{mode || "idle"}</span>
    </div>
  );
}

export function StatTile({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="bg-gcs-bg border border-gcs-border rounded-md px-3 py-2 min-w-[110px]">
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
      <div className="text-lg font-mono text-slate-100">
        {value}
        {unit && <span className="text-xs text-slate-400 ml-1">{unit}</span>}
      </div>
    </div>
  );
}
