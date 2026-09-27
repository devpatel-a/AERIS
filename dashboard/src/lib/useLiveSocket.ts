import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { API_BASE } from "./api";

export type LiveRow = Record<string, any>;

export interface LiveState {
  latest: LiveRow | null;
  connected: boolean;
  /** Age of the latest frame when it arrived (ms): server stamp -> browser receipt. */
  syncLatencyMs: number | null;
}

const LiveContext = createContext<LiveState | null>(null);

/** Auto-reconnecting WebSocket connection to /ws/live. Backs off up to 5s between attempts. */
function useLiveSocketConnection(): LiveState {
  const [state, setState] = useState<LiveState>({ latest: null, connected: false, syncLatencyMs: null });
  const retryDelay = useRef(500);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closedByEffect = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      ws = new WebSocket(API_BASE.replace(/^http/, "ws") + "/ws/live");
      ws.onopen = () => {
        setState((s) => ({ ...s, connected: true }));
        retryDelay.current = 500;
      };
      ws.onmessage = (event) => {
        try {
          const row = JSON.parse(event.data) as LiveRow;
          const wallTs = row?.context?.wall_ts;
          const syncLatencyMs = typeof wallTs === "number" ? Math.max(0, Date.now() - wallTs * 1000) : null;
          setState({ latest: row, connected: true, syncLatencyMs });
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }));
        if (!closedByEffect) {
          retryTimer = setTimeout(connect, retryDelay.current);
          retryDelay.current = Math.min(retryDelay.current * 1.7, 5000);
        }
      };
      ws.onerror = () => ws?.close();
    };

    connect();
    return () => {
      closedByEffect = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, []);

  return state;
}

/** One shared live-telemetry socket for the whole signed-in app. */
export function LiveProvider({ children }: { children: ReactNode }) {
  return createElement(LiveContext.Provider, { value: useLiveSocketConnection() }, children);
}

export function useLiveSocket(): LiveState {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLiveSocket must be used inside <LiveProvider>");
  return ctx;
}
