import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, type FleetTail, type SystemStatus } from "../auth/api";

interface StationState {
  status: SystemStatus | null;
  tails: FleetTail[];
}

const StationContext = createContext<StationState>({ status: null, tails: [] });

/** Station identity/status (polled) and the fleet roster, shared by the shell and pages. */
export function StationProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [tails, setTails] = useState<FleetTail[]>([]);

  useEffect(() => {
    authApi.fleetTails().then(setTails).catch(() => undefined);
    let alive = true;
    const poll = () =>
      authApi
        .systemStatus()
        .then((s) => alive && setStatus(s))
        .catch(() => undefined);
    poll();
    const id = setInterval(poll, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return <StationContext.Provider value={{ status, tails }}>{children}</StationContext.Provider>;
}

export function useStation() {
  return useContext(StationContext).status?.station ?? null;
}

export function useStationState(): StationState {
  return useContext(StationContext);
}
