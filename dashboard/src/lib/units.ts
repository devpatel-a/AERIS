/** SI -> display unit conversions and number formatting (backend is SI throughout). */

export const kToC = (k: number | null | undefined) => (k == null ? null : k - 273.15);
export const kpaToInHg = (kpa: number | null | undefined) => (kpa == null ? null : kpa * 0.2953);
export const kpaToBar = (kpa: number | null | undefined) => (kpa == null ? null : kpa / 100);
export const kgsToLph = (kgs: number | null | undefined, density = 0.72) => (kgs == null ? null : (kgs * 3600) / density);
export const mpsToKts = (mps: number | null | undefined) => (mps == null ? null : mps * 1.943844);

/** Fixed-decimals number with thousands separators; "--" for missing values. */
export function fmt(v: number | null | undefined, digits = 0): string {
  if (v == null || !Number.isFinite(v)) return "--";
  if (Math.abs(v) < 0.5 * 10 ** -digits) v = 0; // avoid "-0"
  return v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function signed(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "--";
  const r = Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v; // avoid "-0"
  return `${r >= 0 ? "+" : ""}${fmt(r, digits)}`;
}

/** "2h 10m" / "12m" / "45s" */
export function fmtDuration(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s)) return "--";
  const t = Math.max(0, Math.round(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${t}s`;
}

/** "02:10:44" */
export function fmtHms(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s)) return "--:--:--";
  const t = Math.max(0, Math.floor(s));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}

/** Least-squares slope of y over x (per unit x), or 0 with fewer than 3 points. */
export function slope(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i];
  }
  const d = n * sxx - sx * sx;
  return d === 0 ? 0 : (n * sxy - sx * sy) / d;
}

/** "3 days ago" style relative time from a unix timestamp (seconds). */
export function ago(ts: number | null | undefined): string {
  if (!ts) return "--";
  const s = Date.now() / 1000 - ts;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  const d = Math.round(s / 86400);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  if (d < 14) return "Last week";
  return `${Math.round(d / 7)} weeks ago`;
}
