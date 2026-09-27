import { useNavigate } from "react-router-dom";
import { useLiveSocket } from "../../lib/useLiveSocket";

/** Shown by live screens when no LIVE session is streaming (no Stitch design exists for this state). */
export function NoLiveSession({ screen }: { screen: string }) {
  const navigate = useNavigate();
  const { connected, latest } = useLiveSocket();
  const reason = !connected ? "Telemetry link to the ground station is down." : latest ? "The active stream is a replay or simulation, not a live flight." : "No live flight session is streaming.";
  return (
    <main className="flex-1 overflow-y-auto px-margin py-space-md bg-[#F5F7FA] flex items-center justify-center">
      <div className="bg-white border border-[#E3E8EF] rounded-xl p-space-xl custom-shadow-card max-w-md text-center">
        <span className="material-symbols-outlined text-[32px] text-[#94A3B8]">sensors_off</span>
        <h2 className="text-headline-sm font-headline-sm text-[#0F172A] mt-space-sm">{screen} is waiting for live telemetry</h2>
        <p className="text-body-md font-body-md text-[#475569] mt-space-xs">{reason}</p>
        <button onClick={() => navigate("/simulation-control")} className="mt-space-md h-9 px-3.5 rounded bg-[#1E5EFF] hover:bg-[#1748D1] text-white text-xs font-semibold inline-flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">model_training</span>
          Open Simulation Control
        </button>
      </div>
    </main>
  );
}
