import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

/** Shared application shell (Stitch Live Ops): fixed sidebar + top bar + scrolling viewport. */
export default function AppShell() {
  return (
    <div className="h-screen bg-background text-on-surface flex overflow-hidden font-body-md text-body-md antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar />
        {/* Each page owns its scroll container, as in the Stitch screens. */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#F5F7FA]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
