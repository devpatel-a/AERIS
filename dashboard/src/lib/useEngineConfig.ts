import { request } from "./api";
import { usePoll } from "./usePoll";

export interface EngineConfigView {
  engine_id: string;
  display_name: string;
  short_name: string;
  limits: Record<string, number | null>;
  rating: { rated_power_w: number; rated_rpm: number; max_rpm: number; idle_rpm: number; max_continuous_power_w: number | null };
  turbo: { present: boolean; wastegate_max_map_kpa: number };
  fuel: { density_kg_per_l: number; max_flow_l_per_h: number };
  operating_ranges: Record<string, [number, number]>;
  vibration: { sensor_label: string; envelope_factor: number };
  cylinders: number;
}

const cache: Record<string, Promise<EngineConfigView>> = {};

/** Engine limits/ratings/ranges for gauge scaling and labels (cached per engine). */
export function useEngineConfig(engineId: string | null | undefined) {
  const id = engineId || "rotax914_like";
  return usePoll(() => (cache[id] ??= request<EngineConfigView>(`/api/engine_config/${id}`)), 0, [id]).data;
}
