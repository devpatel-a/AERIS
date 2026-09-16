export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
export const API_TOKEN = import.meta.env.VITE_API_TOKEN || "devtoken";

async function request<T>(path: string, options: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers["Authorization"] = `Bearer ${API_TOKEN}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listEngines: () => request<string[]>("/api/engines"),
  listMissions: () => request<string[]>("/api/missions"),
  engineConfig: (engineId: string) => request<Record<string, any>>(`/api/engine_config/${engineId}`),

  startLive: (engine_id: string, mission_id: string, speed: number) =>
    request("/api/live/start", { method: "POST", body: JSON.stringify({ engine_id, mission_id, speed }) }, true),
  stopLive: () => request("/api/live/stop", { method: "POST" }, true),
  startSimulation: (engine_id: string, mission_id: string, speed: number) =>
    request(
      "/api/simulate/start",
      { method: "POST", body: JSON.stringify({ engine_id, mission_id, speed }) },
      true,
    ),

  injectFault: (fault_type: string, severity: number, target?: string | number) =>
    request(
      "/api/faults/inject",
      { method: "POST", body: JSON.stringify({ fault_type, severity, target }) },
      true,
    ),

  healthLatest: () => request<Record<string, any>>("/api/health/latest"),
  healthHistory: (seconds = 300) => request<Record<string, any>[]>(`/api/health/history?seconds=${seconds}`),
  advisories: (missionRunId?: string) =>
    request<Record<string, any>[]>(`/api/advisories${missionRunId ? `?mission_run_id=${missionRunId}` : ""}`),
  degradationState: () => request<Record<string, number>>("/api/degradation_state"),
  mlSummary: () => request<Record<string, any>>("/api/ml_summary"),

  missionRiskCheck: (body: Record<string, unknown>) =>
    request<Record<string, any>>("/api/mission_risk/check", { method: "POST", body: JSON.stringify(body) }),

  replayList: () => request<string[]>("/api/replay/list"),
  replayStart: (mission_run_id: string, speed: number) =>
    request("/api/replay/start", { method: "POST", body: JSON.stringify({ mission_run_id, speed }) }, true),
  replayControl: (action: string, extra: Record<string, unknown> = {}) =>
    request("/api/replay/control", { method: "POST", body: JSON.stringify({ action, ...extra }) }, true),

  reportUrl: (missionRunId: string) => `${API_BASE}/api/reports/${missionRunId}`,
};
