import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./app/AppShell";
import { StationProvider } from "./app/StationContext";
import { RequireAuth } from "./auth/RequireAuth";
import { LiveProvider } from "./lib/useLiveSocket";
import Diagnostics from "./pages/Diagnostics";
import DigitalTwin from "./pages/DigitalTwin";
import LiveOps from "./pages/LiveOps";
import Login from "./pages/Login";
import MissionPlanner from "./pages/MissionPlanner";
import MissionReplay from "./pages/MissionReplay";
import Reports from "./pages/Reports";
import SimulationControl from "./pages/SimulationControl";
import TrendsFleet from "./pages/TrendsFleet";
import RawPreview from "./stitch-raw/RawPreview";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <StationProvider>
              <LiveProvider>
                <AppShell />
              </LiveProvider>
            </StationProvider>
          </RequireAuth>
        }
      >
        <Route path="/live-ops" element={<LiveOps />} />
        <Route path="/digital-twin" element={<DigitalTwin />} />
        <Route path="/diagnostics" element={<Diagnostics />} />
        <Route path="/trends-fleet" element={<TrendsFleet />} />
        <Route path="/mission-planner" element={<MissionPlanner />} />
        <Route path="/mission-replay" element={<MissionReplay />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/simulation-control" element={<SimulationControl />} />
        {import.meta.env.DEV && <Route path="/stitch-raw/:screen" element={<RawPreview />} />}
      </Route>
      <Route path="*" element={<Navigate to="/live-ops" replace />} />
    </Routes>
  );
}
