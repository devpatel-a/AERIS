import { useEffect, useRef, useState } from "react";
import { API_BASE } from "./api";

export type LiveRow = Record<string, any>;

/** Auto-reconnecting WebSocket hook for /ws/live. Backs off up to 5s between attempts. */
export function useLiveSocket(): { latest: LiveRow | null; connected: boolean } {
  const [latest, setLatest] = useState<LiveRow | null>(null);
  const [connected, setConnected] = useState(false);
  const retryDelay = useRef(500);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closedByEffect = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const wsUrl = API_BASE.replace(/^http/, "ws") + "/ws/live";
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        retryDelay.current = 500;
      };
      ws.onmessage = (event) => {
        try {
          setLatest(JSON.parse(event.data));
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closedByEffect) {
          retryTimer = setTimeout(connect, retryDelay.current);
          retryDelay.current = Math.min(retryDelay.current * 1.7, 5000);
        }
      };
      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();
    return () => {
      closedByEffect = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, []);

  return { latest, connected };
}
