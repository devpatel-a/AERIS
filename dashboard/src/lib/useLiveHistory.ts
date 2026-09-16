import { useEffect, useRef, useState } from "react";
import { useLiveSocket, type LiveRow } from "./useLiveSocket";

/** Accumulates a bounded rolling history of live rows, keyed by t_s to drop duplicates. */
export function useLiveHistory(maxPoints = 300): { history: LiveRow[]; latest: LiveRow | null; connected: boolean } {
  const { latest, connected } = useLiveSocket();
  const [history, setHistory] = useState<LiveRow[]>([]);
  const lastT = useRef<number | null>(null);

  useEffect(() => {
    if (!latest) return;
    if (latest.t_s === lastT.current) return;
    lastT.current = latest.t_s;
    setHistory((prev) => {
      const next = [...prev, latest];
      return next.length > maxPoints ? next.slice(next.length - maxPoints) : next;
    });
  }, [latest, maxPoints]);

  return { history, latest, connected };
}
