import type { ReactNode } from "react";

/** AERIS "Precision Aerospace Telemetry" design system — shared primitives. */

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface border border-border rounded-card shadow-card p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
          <div>
            {title && <h2 className="font-semibold text-[15px] text-ink leading-tight">{title}</h2>}
            {subtitle && <p className="text-xs text-ink-secondary mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  NORMAL: "bg-status-normal-bg text-status-normal border-status-normal/30",
  GO: "bg-status-normal-bg text-status-normal border-status-normal/30",
  WATCH: "bg-status-watch-bg text-status-watch border-status-watch/30",
  CAUTION: "bg-status-watch-bg text-status-watch border-status-watch/30",
  WARNING: "bg-status-warning-bg text-status-warning border-status-warning/30",
  CRITICAL: "bg-status-critical-bg text-status-critical border-status-critical/30",
  "NO-GO": "bg-status-critical-bg text-status-critical border-status-critical/30",
};

/** Semantic status pill (NORMAL / WATCH / WARNING / CRITICAL / GO / CAUTION / NO-GO). */
export function RiskPill({ level }: { level: string }) {
  const cls = STATUS_STYLES[level] || "bg-slate-100 text-ink-secondary border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-chip border text-[10px] font-mono font-semibold uppercase tracking-wide ${cls}`}>
      {level}
    </span>
  );
}

/** Top-bar style live/sim/idle mode indicator with a connection dot. */
export function ModeBadge({ mode, connected }: { mode?: string; connected: boolean }) {
  const m = (mode || "idle").toUpperCase();
  const isLive = connected && m === "LIVE";
  const cls = isLive
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : connected
    ? "bg-blue-50 text-primary border-blue-200"
    : "bg-slate-100 text-ink-muted border-slate-200";
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-xs font-semibold tracking-wider ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500 animate-pulse-subtle" : "bg-status-critical"}`} />
      {connected ? m : "OFFLINE"}
    </div>
  );
}

/** Compact telemetry readout tile (label + monospace value). */
export function StatTile({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="bg-canvas border border-border rounded-control px-3 py-2 min-w-[110px]">
      <div className="text-[10px] uppercase tracking-wide text-ink-muted font-medium">{label}</div>
      <div className="font-mono text-lg font-semibold text-ink">
        {value}
        {unit && <span className="text-xs font-normal text-ink-secondary ml-1">{unit}</span>}
      </div>
    </div>
  );
}
