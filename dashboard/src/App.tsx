import { NavLink, Route, Routes } from "react-router-dom";
import LiveOps from "./pages/LiveOps";
import TwinComparison from "./pages/TwinComparison";
import Diagnostics from "./pages/Diagnostics";
import Trends from "./pages/Trends";
import MissionPlanner from "./pages/MissionPlanner";
import Replay from "./pages/Replay";
import DemoControl from "./pages/DemoControl";
import Reports from "./pages/Reports";

const NAV = [
  { to: "/", label: "Live Ops" },
  { to: "/twin", label: "Twin Comparison" },
  { to: "/diagnostics", label: "Diagnostics" },
  { to: "/trends", label: "Trends" },
  { to: "/planner", label: "Mission Planner" },
  { to: "/replay", label: "Replay" },
  { to: "/demo", label: "Demo Control" },
  { to: "/reports", label: "Reports" },
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gcs-bg">
      <header className="border-b border-gcs-border bg-gcs-panel px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-gcs-accent" />
          <span className="font-semibold tracking-wide text-slate-100">AeroTwin</span>
          <span className="text-xs text-slate-500">Digital Twin GCS</span>
        </div>
        <nav className="flex gap-1 flex-wrap justify-end">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-gcs-accent/20 text-gcs-accent border border-gcs-accent/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 p-4 max-w-[1600px] w-full mx-auto">
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
