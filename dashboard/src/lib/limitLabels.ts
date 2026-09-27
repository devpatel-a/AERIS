/** Human-readable labels for MissionSummary's peak_values/limits keys —
 * mirrors aerotwin/reports/summary.py's LIMIT_LABELS exactly. */
export const LIMIT_LABELS: Record<string, string> = {
  max_cht_k: "Max CHT (K)",
  max_egt_k: "Max EGT (K)",
  max_oil_temp_k: "Max oil temp (K)",
  min_oil_pressure_kpa: "Min oil pressure (kPa)",
  max_coolant_temp_k: "Max coolant temp (K)",
};
