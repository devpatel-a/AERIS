import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useStation } from "./StationContext";
import { useLiveSocket } from "../lib/useLiveSocket";
import { NAV } from "./nav";

/** SideNavBar from the Stitch Live Ops screen. */
export default function Sidebar() {
  const { session } = useAuth();
  const station = useStation();
  const { latest, connected, syncLatencyMs } = useLiveSocket();
  const streaming = connected && latest !== null && latest.context !== undefined;

  return (
    <aside className="bg-surface-container-low text-primary border-r border-outline-variant h-screen w-64 flex flex-col shrink-0">
      <div className="flex flex-col h-full justify-between p-margin-compact">
        <div>
          <div className="flex items-center gap-space-sm px-space-sm py-space-sm mb-space-md border-b border-outline-variant/40 pb-space-md">
            <div className="w-9 h-9 rounded bg-primary text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[20px]">mode_fan</span>
            </div>
            <div className="flex flex-col">
              <span className="text-headline-md font-headline-md font-bold text-on-surface tracking-tight">AeroTwin</span>
              <span className="text-label-caps font-label-caps text-on-surface-variant text-[10px]">Propulsion Digital Twin</span>
            </div>
          </div>
          <nav className="space-y-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive
                    ? "flex items-center gap-space-sm px-space-md py-space-sm bg-surface-container-highest text-primary font-headline-sm text-headline-sm rounded border-l-4 border-primary"
                    : "flex items-center gap-space-sm px-space-md py-space-sm text-on-surface-variant font-body-md text-body-md rounded hover:bg-surface-container transition-colors duration-150"
                }
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="space-y-space-sm pt-space-md border-t border-outline-variant/40">
          <div className="flex items-center justify-between px-space-sm py-space-xs rounded bg-surface-container-highest/60 border border-outline-variant/30">
            <div className="flex items-center gap-space-xs">
              <span className={`w-2 h-2 rounded-full ${streaming ? "bg-emerald-500 animate-pulse" : connected ? "bg-slate-400" : "bg-red-500"}`} />
              <span className="font-telemetry-sm text-telemetry-sm text-on-surface">
                {streaming ? "Telemetry Sync Active" : connected ? "Telemetry Standby" : "Telemetry Link Down"}
              </span>
            </div>
            <span className="font-telemetry-sm text-[10px] text-primary font-bold">
              {streaming && syncLatencyMs !== null ? `${Math.round(syncLatencyMs)}ms` : "--"}
            </span>
          </div>
          <div className="space-y-1 text-on-surface-variant px-space-xs">
            <div className="flex items-center gap-1.5 font-telemetry-sm text-[10px]">
              <span className="material-symbols-outlined text-[14px]">settings_ethernet</span>
              <span>Connection: {station?.avionics_bus ?? "--"}</span>
            </div>
            <div className="flex items-center gap-1.5 font-telemetry-sm text-[10px]">
              <span className="material-symbols-outlined text-[14px]">shield_person</span>
              <span>Operator: {session?.operator.display_name ?? "--"}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
