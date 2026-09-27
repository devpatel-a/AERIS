import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../lib/api";
import { usePoll } from "../lib/usePoll";
import { useAuth } from "../auth/AuthContext";
import { useLiveSocket } from "../lib/useLiveSocket";
import { useStationState } from "./StationContext";

export function formatFlightTime(tS: number): string {
  const s = Math.max(0, Math.floor(tS));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

const MODE_PILL: Record<string, { box: string; dot: string }> = {
  LIVE: { box: "bg-emerald-100 border-emerald-300 text-emerald-800", dot: "bg-emerald-600 animate-ping" },
  SIMULATION: { box: "bg-[#EEF4FF] border-[#B6C4FF] text-primary", dot: "bg-primary-container animate-ping" },
  REPLAY: { box: "bg-amber-50 border-amber-300 text-amber-800", dot: "bg-amber-500" },
  IDLE: { box: "bg-slate-100 border-slate-300 text-slate-600", dot: "bg-slate-400" },
  OFFLINE: { box: "bg-red-50 border-red-300 text-red-700", dot: "bg-red-500" },
};

/** TopNavBar from the Stitch Live Ops screen. */
export default function TopBar() {
  const { session } = useAuth();
  const { tails } = useStationState();
  const { latest, connected } = useLiveSocket();
  const ctx = latest?.context as Record<string, any> | undefined;

  const tailId: string | null = ctx?.tail_id ?? session?.tail_id ?? null;
  const tail = tails.find((t) => t.tail_id === tailId);
  const engineClass = ctx?.engine_class ?? tail?.engine_class;
  const serial = ctx?.engine_serial ?? tail?.engine_serial;
  const title = [tailId, engineClass, serial ? `SN ${serial}` : null].filter(Boolean).join(" · ");

  const mode: string = !connected ? "OFFLINE" : latest ? (ctx ? String(latest.mode) : "REPLAY") : "IDLE";
  const pill = MODE_PILL[mode] ?? MODE_PILL.IDLE;

  return (
    <header className="bg-surface border-b border-outline-variant h-14 flex items-center justify-between px-margin shrink-0 select-none">
      <div className="flex items-center gap-space-md">
        <h1 className="text-headline-sm font-bold text-on-surface font-telemetry-md tracking-tight">{title || "No airframe assigned"}</h1>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-telemetry-sm text-telemetry-sm ${pill.box}`}>
          <span className={`w-2 h-2 rounded-full ${pill.dot}`} />
          <span>{mode}</span>
        </span>
      </div>
      <div className="flex items-center gap-space-lg">
        <div className="hidden xl:flex items-center gap-space-md font-telemetry-sm text-telemetry-sm text-on-surface-variant">
          <div className="flex items-center gap-1 border-r border-outline-variant pr-space-md">
            <span className="material-symbols-outlined text-[16px] text-primary">flight</span>
            <span className="font-medium text-on-surface">{ctx?.mission_name ?? "No active mission"}</span>
          </div>
          <Stat label="FT:" value={latest ? formatFlightTime(latest.t_s) : "--:--:--"} />
          <Stat label="ALT:" value={ctx ? `${Math.round(ctx.altitude_m).toLocaleString()}m` : "--"} />
          <Stat label="OAT:" value={ctx ? `${Math.round(ctx.oat_c)}°C` : "--"} />
          <div className="flex items-center gap-1">
            <span className="text-outline">Link:</span>
            <span className="text-primary font-bold">{ctx ? `${Math.round(ctx.link_hz)} Hz` : "--"}</span>
          </div>
        </div>
        <div className="flex items-center gap-space-sm pl-space-md border-l border-outline-variant">
          <NotificationsMenu />
          <AccountMenu />
          <div className="flex items-center gap-2 pl-space-xs">
            <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs" title={session?.operator.display_name}>
              {session?.operator.initials ?? ""}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 border-r border-outline-variant pr-space-md">
      <span className="text-outline">{label}</span>
      <span className="text-on-surface font-semibold">{value}</span>
    </div>
  );
}

/** "Account Settings" button: operator identity, airframe assignment and sign-out. */
function AccountMenu() {
  const { session, logout, setTail } = useAuth();
  const { tails } = useStationState();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Account Settings" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors duration-150"
      >
        <span className="material-symbols-outlined text-[19px]">manage_accounts</span>
      </button>
      {open && session && (
        <div className="absolute right-0 top-10 z-40 w-72 bg-white border border-[#CBD5E1] rounded-xl shadow-float p-space-md space-y-space-sm">
          <div className="border-b border-[#F1F5F9] pb-space-sm">
            <div className="text-headline-sm font-headline-sm text-[#0F172A]">{session.operator.display_name}</div>
            <div className="font-body-sm text-body-sm text-[#475569]">{session.operator.title}</div>
            <div className="font-telemetry-sm text-telemetry-sm text-[#94A3B8] mt-0.5">
              {session.operator.operator_id} · {session.role_label}
            </div>
          </div>
          <label className="block">
            <span className="text-label-caps font-label-caps text-[#94A3B8] uppercase">Assigned Airframe</span>
            <select
              className="mt-1 block w-full rounded-md border-[#E3E8EF] py-1.5 text-on-surface font-telemetry-md text-telemetry-md focus:border-primary focus:ring-primary bg-white"
              value={session.tail_id ?? ""} onChange={(e) => setTail(e.target.value)}
            >
              {tails.map((t) => (
                <option key={t.tail_id} value={t.tail_id}>
                  {t.tail_id} · SN {t.engine_serial}
                </option>
              ))}
            </select>
          </label>
          <button
            className="w-full h-9 rounded border border-[#DC2626] bg-white hover:bg-[#FEE2E2] text-[#DC2626] text-xs font-semibold flex items-center justify-center gap-1.5"
            onClick={async () => {
              await logout();
              navigate("/login", { replace: true });
            }}
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

const SEV_CHIP: Record<string, string> = {
  CRITICAL: "bg-[#FEE2E2] text-[#B91C1C]",
  WARNING: "bg-[#FFEDD5] text-[#C2410C]",
  WATCH: "bg-[#FEF3C7] text-[#B45309]",
  NORMAL: "bg-[#DCFCE7] text-[#15803D]",
};

/** Notifications bell: the live session's subsystem alerts, with acknowledge. */
function NotificationsMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const alerts = usePoll(() => request<any>("/api/alerts"), open ? 3000 : 10000, [open]);
  const data = alerts.data;
  const unread: number = data?.unread ?? 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const ack = async (ids?: number[]) => {
    setBusy(true);
    try {
      alerts.setData(await request<any>("/api/alerts/ack", { method: "POST", body: JSON.stringify({ ids: ids ?? null }) }));
    } finally {
      setBusy(false);
    }
  };

  const items: any[] = data?.alerts ?? [];
  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Notifications" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded hover:bg-surface-container flex items-center justify-center text-on-surface-variant relative transition-colors duration-150"
      >
        <span className="material-symbols-outlined text-[19px]">notifications</span>
        {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-tertiary-container ring-2 ring-surface" />}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-40 w-96 bg-white border border-[#CBD5E1] rounded-xl shadow-float flex flex-col max-h-[420px]">
          <div className="flex items-center justify-between px-space-md py-space-sm border-b border-[#F1F5F9]">
            <div>
              <div className="text-headline-sm font-headline-sm text-[#0F172A]">Subsystem Alerts</div>
              <div className="font-telemetry-sm text-telemetry-sm text-[#94A3B8]">{data?.run_id ? `${unread} unacknowledged · this sortie` : "No live session"}</div>
            </div>
            <button disabled={busy || unread === 0} onClick={() => ack()} className="text-telemetry-sm font-telemetry-sm font-bold text-primary hover:underline disabled:opacity-40 disabled:no-underline">
              Acknowledge all
            </button>
          </div>
          <div className="overflow-y-auto divide-y divide-[#F1F5F9]">
            {items.length === 0 && <p className="px-space-md py-space-md font-body-sm text-body-sm text-[#475569]">{data?.run_id ? "No subsystem alerts raised this sortie." : "Start a session in Simulation Control to receive alerts."}</p>}
            {items.map((a) => {
              const unreadItem = !a.acknowledged && !a.cleared && a.severity !== "NORMAL";
              return (
                <div key={a.id} className={`px-space-md py-space-sm flex items-start gap-space-sm ${unreadItem ? "bg-[#F8FAFF]" : ""}`}>
                  <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm font-bold shrink-0 ${SEV_CHIP[a.severity] ?? SEV_CHIP.WATCH}`}>{a.severity}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-body-sm text-body-sm font-semibold text-[#0F172A] capitalize">{String(a.subsystem).replace(/_/g, " ")}</span>
                      <span className="font-telemetry-sm text-telemetry-sm text-[#94A3B8]">T+{formatFlightTime(a.t_s)}</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-[#475569]">{String(a.message).replace(/_/g, " ").replace(/^./, (c: string) => c.toUpperCase())}</p>
                  </div>
                  {unreadItem && (
                    <button aria-label="Acknowledge alert" title="Acknowledge" disabled={busy} onClick={() => ack([a.id])} className="w-6 h-6 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-primary shrink-0">
                      <span className="material-symbols-outlined text-[16px]">done</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-space-md py-space-sm border-t border-[#F1F5F9]">
            <button onClick={() => { setOpen(false); navigate("/diagnostics"); }} className="w-full h-8 rounded bg-primary/10 hover:bg-primary hover:text-white text-primary text-xs font-semibold transition-colors">
              Open Diagnostics →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
