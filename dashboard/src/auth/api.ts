import { request } from "../lib/api";

export interface Operator {
  id: number;
  operator_id: string;
  display_name: string;
  title: string;
  initials: string;
  roles: string[];
}

export interface AuthSession {
  operator: Operator;
  role: string;
  role_label: string;
  tail_id: string | null;
  expires_at: number;
}

export interface RoleOption {
  role: string;
  label: string;
  description: string;
  icon: string;
}

export interface FleetTail {
  tail_id: string;
  tail_number: string;
  engine_id: string;
  engine_serial: string;
  unit: string;
  primary: boolean;
  notes: string;
  engine_class: string;
  engine_display_name: string;
  engine_monitor_label: string;
}

export interface SystemStatus {
  station: {
    station_id: string;
    software_version: string;
    software_tag: string;
    classification: string;
    gateway: string;
    compliance: string;
    crypto_level: number;
    fips_cert: string;
    link_cipher: string;
    avionics_bus: string;
    operator_callsign: string;
    restricted_notice: string;
  };
  server_time: number;
  bus: { ready: boolean; name: string; interface: string | null };
  session: { state: "ACTIVE" | "IDLE"; mode: string | null; tail_id: string | null; run_id: string | null };
  link: { rate_hz: number; margin_db: number };
}

export const authApi = {
  roles: () => request<RoleOption[]>("/api/auth/roles"),
  login: (body: { operator_id: string; pin: string; role: string; tail_id: string | null }) =>
    request<AuthSession & { token: string }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<AuthSession>("/api/auth/me"),
  setTail: (tail_id: string) => request<AuthSession>("/api/auth/tail", { method: "POST", body: JSON.stringify({ tail_id }) }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  systemStatus: () => request<SystemStatus>("/api/system/status"),
  fleetTails: () => request<FleetTail[]>("/api/fleet/tails"),
};
