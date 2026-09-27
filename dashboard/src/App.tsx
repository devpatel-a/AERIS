import { NavLink, Route, Routes } from "react-router-dom";
import LiveOps from "./pages/LiveOps";
import TwinComparison from "./pages/TwinComparison";
import Diagnostics from "./pages/Diagnostics";
import Trends from "./pages/Trends";
import MissionPlanner from "./pages/MissionPlanner";
import Replay from "./pages/Replay";
import DemoControl from "./pages/DemoControl";
import Reports from "./pages/Reports";
import { useLiveSocket } from "./lib/useLiveSocket";

const NAV = [
  { to: "/", label: "Live Ops", icon: "radar" },
  { to: "/twin", label: "Twin Comparison", icon: "compare_arrows" },
  { to: "/diagnostics", label: "Diagnostics", icon: "healing" },
  { to: "/trends", label: "Trends", icon: "trending_up" },
  { to: "/planner", label: "Mission Planner", icon: "flight_takeoff" },
  { to: "/replay", label: "Replay", icon: "history" },
  { to: "/demo", label: "Demo Control", icon: "science" },
  { to: "/reports", label: "Reports", icon: "analytics" },
];

export default function App() {
  const { latest, connected } = useLiveSocket();
  const mode = (latest?.mode || "IDLE").toUpperCase();
  const isLive = connected && mode === "LIVE";

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      {/* Fixed left sidebar */}
      <aside className="fixed top-0 left-0 h-screen w-64 flex flex-col justify-between bg-surface border-r border-border z-30 select-none">
        <div>
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
                  <line x1="12" x2="12" y1="12" y2="3" />
                  <line x1="12" x2="20.5" y1="12" y2="16.5" />
                  <line x1="12" x2="3.5" y1="12" y2="16.5" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-[15px] text-ink tracking-tight leading-none">AERIS</div>
                <div className="text-[10px] text-ink-muted mt-1 font-mono">AeroTwin GCS</div>
              </div>
            </div>
          </div>
          <nav className="flex flex-col py-4 px-3 gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-control text-xs font-mono font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-primary border-l-4 border-primary"
                      : "text-ink-secondary hover:bg-canvas hover:text-primary"
                  }`
                }
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-3 border-t border-border bg-canvas/60">
          <div className="flex items-center justify-between text-[11px] font-mono text-ink-secondary mb-2">
            <div className="flex items-center gap-1.5 text-secondary">
              <span className="material-symbols-outlined text-[16px]">wifi_tethering</span>
              <span>Link: {connected ? "50Hz Nom." : "No link"}</span>
            </div>
            <span className={`inline-block w-2 h-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse-subtle" : "bg-status-critical"}`} />
          </div>
          <div className="flex items-center gap-2.5 pt-2 border-t border-border">
            <div className="w-7 h-7 rounded-full bg-border-muted flex items-center justify-center text-ink-secondary overflow-hidden">
              <span className="material-symbols-outlined text-[20px]">account_circle</span>
            </div>
            <div className="flex flex-col">
              <span className="text-ink font-mono text-xs font-semibold leading-tight">Operator: Lead Eng.</span>
              <span className="text-ink-muted text-[11px] leading-tight">Station FT-02</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Slim top bar */}
      <header className="fixed top-0 left-64 right-0 h-14 bg-surface border-b border-border z-20">
        <div className="flex items-center justify-between px-6 h-full gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-canvas px-3 py-1.5 rounded-control border border-border/60">
              <span className="material-symbols-outlined text-primary text-[18px]">flight</span>
              <span className="font-mono text-[13px] font-semibold text-primary">Rotax 914-class Digital Twin</span>
            </div>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-xs font-semibold tracking-wider ${
                isLive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-ink-muted border-slate-200"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse-subtle" : "bg-status-critical"}`} />
              {connected ? mode : "OFFLINE"}
            </div>
          </div>
          <div className="flex items-center gap-1 pl-2">
            <button className="p-1.5 text-ink-secondary hover:text-ink rounded-control hover:bg-canvas transition-colors">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
            <button className="p-1.5 text-ink-secondary hover:text-ink rounded-control hover:bg-canvas transition-colors">
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-xs font-bold ml-1">
              TE
            </div>
          </div>
        </div>
      </header>

      <main className="ml-64 pt-14 p-6 min-h-screen max-w-[1440px] mx-auto">
        <Routes>
          <Route path="/" element={<LiveOps />} />
          <Route path="/twin" element={<TwinComparison />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/planner" element={<MissionPlanner />} />
          <Route path="/replay" element={<Replay />} />
          <Route path="/demo" element={<DemoControl />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </main>
    </div>
  );
}
