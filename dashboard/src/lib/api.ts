import { getToken, UNAUTHORIZED_EVENT } from "./authToken";

/**
 * Backend origin (scheme + host, no trailing slash). Production builds set
 * VITE_API_BASE to the hosted backend's https:// URL; the live WebSocket URL is
 * derived from it (https -> wss). Unset falls back to the local dev backend.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
  }
}

/** Fetch JSON from the API, sending the signed-in operator's bearer token when there is one. */
export async function request<T>(path: string, options: RequestInit = {}, _auth = false): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? body);
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 401 && token) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export interface MissionSummary {
  n_samples: number;
  duration_hours: number;
  peak_values: Record<string, number>;
  limits: Record<string, number>;
  exceeded: Record<string, boolean>;
  time_above_limit_s: Record<string, number>;
  health_start: Record<string, number>;
  health_end: Record<string, number>;
  health_index_start: number | null;
  health_index_end: number | null;
  health_index_min: number | null;
  health_risk_end: string | null;
  worst_health_risk: string | null;
  subsystem_index_end: Record<string, number>;
  rul_hours_end: number | null;
  faults_observed: string[];
  total_alarms: number;
}

export interface MissionRun {
  mission_run_id: string;
  engine_id: string | null;
  mission_id: string | null;
  start_time: number | null;
  end_time: number | null;
  summary: MissionSummary | null;
}

export interface ShapFeature {
  feature: string;
  value: number;
}

export interface MaintenanceRecord {
  id: number;
  engine_id: string;
  action: string;
  notes: string;
  created_at: number;
}

export interface Diagnosis {
  fault: string;
  confidence: number;
  explanation: string;
  severity: string;
  recommended_action: string;
  overall_health_index: number;
  overall_risk: string;
  subsystem_index: Record<string, number>;
  shap_features: ShapFeature[];
  rul_mean_hours: number | null;
  rul_p05_hours: number | null;
  rul_p95_hours: number | null;
}

export interface TailStatus {
  tail_id: string;
  tail_number: string;
  engine_id: string;
  engine_serial: string;
  total_hours: number;
  n_missions: number;
  last_mission_run_id: string | null;
  last_mission_id: string | null;
  health_index: number | null;
  health_risk: string | null;
  worst_health_risk: string | null;
  rul_hours: number | null;
  subsystem_index: Record<string, number>;
  faults_observed: string[];
  notes: string;
}

export interface TailHeatmap {
  tail_id: string;
  mission_labels: string[];
  subsystems: Record<string, (number | null)[]>;
  health_index: (number | null)[];
  rul_hours: (number | null)[];
}

export const api = {
  listEngines: () => request<string[]>("/api/engines"),
  listMissions: () => request<string[]>("/api/missions"),
  engineConfig: (engineId: string) => request<Record<string, any>>(`/api/engine_config/${engineId}`),
  missionConfig: (missionId: string) => request<Record<string, any>>(`/api/mission_config/${missionId}`),
  faultTypes: () => request<{ engine: string[]; sensor: string[] }>("/api/fault_types"),

  startLive: (engine_id: string, mission_id: string, speed: number, tail_id?: string) =>
    request(
      "/api/live/start",
      { method: "POST", body: JSON.stringify({ engine_id, mission_id, speed, tail_id }) },
      true,
    ),
  stopLive: () => request("/api/live/stop", { method: "POST" }, true),
  startSimulation: (engine_id: string, mission_id: string, speed: number, tail_id?: string) =>
    request(
      "/api/simulate/start",
      { method: "POST", body: JSON.stringify({ engine_id, mission_id, speed, tail_id }) },
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
  healthHistoryCsvUrl: (seconds = 300) => `${API_BASE}/api/health/history.csv?seconds=${seconds}`,
  diagnosisLatest: () => request<Diagnosis>("/api/diagnosis/latest"),
  advisories: (missionRunId?: string) =>
    request<Record<string, any>[]>(`/api/advisories${missionRunId ? `?mission_run_id=${missionRunId}` : ""}`),
  maintenance: (engineId?: string) =>
    request<MaintenanceRecord[]>(`/api/maintenance${engineId ? `?engine_id=${engineId}` : ""}`),
  degradationState: () => request<Record<string, number>>("/api/degradation_state"),
  mlSummary: () => request<Record<string, any>>("/api/ml_summary"),

  missionRiskCheck: (body: Record<string, unknown>) =>
    request<Record<string, any>>("/api/mission_risk/check", { method: "POST", body: JSON.stringify(body) }),

  fleetTable: () => request<TailStatus[]>("/api/fleet"),
  fleetHeatmap: (tailId: string, missions = 12) =>
    request<TailHeatmap>(`/api/fleet/${tailId}/heatmap?missions=${missions}`),

  replayList: () => request<MissionRun[]>("/api/replay/list"),
  replayStart: (mission_run_id: string, speed: number) =>
    request("/api/replay/start", { method: "POST", body: JSON.stringify({ mission_run_id, speed }) }, true),
  replayControl: (action: string, extra: Record<string, unknown> = {}) =>
    request("/api/replay/control", { method: "POST", body: JSON.stringify({ action, ...extra }) }, true),

  reportSummary: (missionRunId: string) =>
    request<MissionSummary & { mission_run_id: string; engine_id: string; mission_id: string | null; start_time: number | null; end_time: number | null }>(
      `/api/reports/${missionRunId}/summary`,
    ),
  reportUrl: (missionRunId: string) => `${API_BASE}/api/reports/${missionRunId}`,
};
