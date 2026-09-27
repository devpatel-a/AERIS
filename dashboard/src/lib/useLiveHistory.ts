import { useLiveSocket, type LiveRow } from "./useLiveSocket";

/** The shared rolling live history (last `maxPoints` frames). */
export function useLiveHistory(maxPoints = 300): { history: LiveRow[]; latest: LiveRow | null; connected: boolean } {
  const { latest, connected, history } = useLiveSocket();
  return { history: history.slice(-maxPoints), latest, connected };
}
