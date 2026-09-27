import { RiskPill } from "./ui";

/** AERIS design-system data-viz primitives: hand-drawn inline SVG gauges & charts
 * (no charting library), matching the Stitch "AERIS" mockups, wired to live telemetry. */

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

const TONE_CHIP: Record<string, string> = {
  normal: "bg-status-normal-bg text-status-normal",
  watch: "bg-status-watch-bg text-status-watch",
  warning: "bg-status-warning-bg text-status-warning",
  critical: "bg-status-critical-bg text-status-critical",
  info: "bg-blue-50 text-primary",
};

/** Semicircular arc gauge with a needle — engine speed / MAP / fuel flow / power tiles. */
export function ArcGauge({
  label,
  value,
  unit,
  min = 0,
  max = 100,
  color = "#1E5EFF",
  statusLabel,
  tone = "normal",
  precision = 0,
  sublabel,
}: {
  label: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  color?: string;
  statusLabel?: string;
  tone?: "normal" | "watch" | "warning" | "critical" | "info";
  precision?: number;
  sublabel?: string;
}) {
  const safeValue = Number.isFinite(value) ? value : min;
  const clamped = Math.min(max, Math.max(min, safeValue));
  const f = max > min ? (clamped - min) / (max - min) : 0;
  const r = 80;
  const arcLen = Math.PI * r;
  const dashOffset = arcLen * (1 - f);
  const tip = polar(100, 100, 66, 180 - f * 180);
  const display = precision > 0 ? safeValue.toFixed(precision) : Math.round(safeValue).toLocaleString();

  return (
    <div className="bg-surface border border-border rounded-card shadow-card p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider">{label}</span>
        {statusLabel && (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${TONE_CHIP[tone]}`}>{statusLabel}</span>
        )}
      </div>
      <div className="flex flex-col items-center justify-center my-2">
        <svg viewBox="0 0 200 115" className="w-44 h-24">
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#EEF2F6" strokeWidth={12} strokeLinecap="round" />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={color}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={arcLen}
            strokeDashoffset={dashOffset}
          />
          <line x1={100} y1={100} x2={tip.x} y2={tip.y} stroke="#0F172A" strokeWidth={3} strokeLinecap="round" />
          <circle cx={100} cy={100} r={6} fill="#0F172A" />
        </svg>
        <div className="text-center -mt-2">
          <div className="font-mono text-2xl font-bold text-ink">
            {display} <span className="text-sm font-normal text-ink-secondary">{unit}</span>
          </div>
          {sublabel && <div className="text-[11px] text-ink-secondary mt-0.5">{sublabel}</div>}
        </div>
      </div>
    </div>
  );
}

/** Full circular progress gauge — composite health index. */
export function CircularGauge({
  value,
  max = 100,
  label,
  color = "#1E5EFF",
}: {
  value: number;
  max?: number;
  label?: string;
  color?: string;
}) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const f = Math.min(1, Math.max(0, (Number.isFinite(value) ? value : 0) / max));
  const dashOffset = circumference * (1 - f);
  return (
    <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx={50} cy={50} r={r} fill="none" stroke="#EEF2F6" strokeWidth={8} />
        <circle
          cx={50}
          cy={50}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-3xl font-bold text-ink">
          {Math.round(value)}
          <span className="text-base font-normal text-ink-secondary">/{max}</span>
        </span>
        {label && <span className="text-[10px] uppercase tracking-wider text-ink-secondary mt-0.5">{label}</span>}
      </div>
    </div>
  );
}

/** Tiny inline trend line for a sensor row. */
export function Sparkline({ data, color = "#1E5EFF", width = 64, height = 20 }: { data: number[]; color?: string; width?: number; height?: number }) {
  const clean = data.filter((v) => Number.isFinite(v));
  if (clean.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const step = width / (clean.length - 1);
  const points = clean.map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / span) * height).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
      <polyline fill="none" points={points} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Norm/watch/critical range strip with a position marker — vital metrics rows. */
export function RangeBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(pct) ? pct : 0));
  return (
    <div className="w-28 relative">
      <div className="h-2 bg-border-muted rounded-full overflow-hidden flex">
        <div className="w-1/4 bg-amber-100" />
        <div className="w-1/2 bg-emerald-100" />
        <div className="w-1/4 bg-red-100" />
      </div>
      <div className="absolute -top-0.5 w-1.5 h-3 bg-primary rounded-sm shadow-sm" style={{ left: `${clamped}%` }} />
    </div>
  );
}

const TONE_TILE_BORDER: Record<string, string> = {
  watch: "border-2 border-amber-400 bg-amber-50/40",
  warning: "border-2 border-orange-400 bg-orange-50/40",
  critical: "border-2 border-red-400 bg-red-50/40",
};

/** One tile in the 7-subsystem health matrix grid. */
export function HealthTile({
  icon,
  label,
  value,
  status,
  note,
  wide = false,
}: {
  icon: string;
  label: string;
  value: number;
  status: string;
  note?: string;
  wide?: boolean;
}) {
  const tone = status === "WATCH" ? "watch" : status === "WARNING" ? "warning" : status === "CRITICAL" ? "critical" : "normal";
  const highlighted = tone !== "normal";
  return (
    <div
      className={`p-3 rounded-control transition-all relative ${wide ? "col-span-2" : ""} ${
        highlighted ? TONE_TILE_BORDER[tone] : "border border-border bg-canvas hover:border-primary/40"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="material-symbols-outlined text-[20px] text-primary">{icon}</span>
        <RiskPill level={status} />
      </div>
      <div className="text-[13px] font-semibold text-ink">{label}</div>
      <div className="font-mono text-xl font-bold text-ink mt-1">
        {Math.round(value)}
        <span className="text-xs text-ink-secondary font-normal"> /100</span>
      </div>
      {note && <div className="text-[10px] text-ink-secondary mt-1">{note}</div>}
    </div>
  );
}

type BarSeries = { label: string; color: string; values: number[]; limit?: number };

/** Grouped bar chart (two series sharing one scale, e.g. CHT vs EGT) with red limit lines. */
export function DualBarChart({ categories, seriesA, seriesB, height = 240 }: { categories: string[]; seriesA: BarSeries; seriesB: BarSeries; height?: number }) {
  const width = 600;
  const top = 20;
  const bottom = height - 20;
  const plotH = bottom - top;
  const leftPad = 44;
  const rightPad = 16;
  const plotW = width - leftPad - rightPad;
  const n = Math.max(categories.length, 1);
  const groupW = plotW / n;
  const barW = 14;
  const gap = 6;

  const allVals = [...seriesA.values, ...seriesB.values, seriesA.limit ?? 0, seriesB.limit ?? 0].filter((v) => Number.isFinite(v));
  const maxVal = Math.max(...allVals, 1) * 1.08;
  const yFor = (v: number) => bottom - (v / maxVal) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {ticks.map((f) => {
        const y = bottom - f * plotH;
        return (
          <g key={f}>
            <line x1={leftPad} x2={width - rightPad} y1={y} y2={y} stroke="#F1F5F9" strokeWidth={1} />
            <text x={leftPad - 5} y={y + 3} textAnchor="end" fontSize={10} fill="#94A3B8">
              {Math.round(maxVal * f)}
            </text>
          </g>
        );
      })}
      <line x1={leftPad} x2={width - rightPad} y1={bottom} y2={bottom} stroke="#CBD5E1" strokeWidth={1.5} />
      {seriesA.limit != null && (
        <line x1={leftPad} x2={width - rightPad} y1={yFor(seriesA.limit)} y2={yFor(seriesA.limit)} stroke="#DC2626" strokeDasharray="4 4" strokeWidth={1.5} />
      )}
      {seriesB.limit != null && (
        <line x1={leftPad} x2={width - rightPad} y1={yFor(seriesB.limit)} y2={yFor(seriesB.limit)} stroke="#DC2626" strokeDasharray="4 4" strokeWidth={1.5} />
      )}
      {categories.map((cat, i) => {
        const groupCenter = leftPad + groupW * i + groupW / 2;
        const aX = groupCenter - barW - gap / 2;
        const bX = groupCenter + gap / 2;
        const aVal = seriesA.values[i] ?? 0;
        const bVal = seriesB.values[i] ?? 0;
        const aOver = seriesA.limit != null && aVal >= seriesA.limit;
        const bOver = seriesB.limit != null && bVal >= seriesB.limit;
        return (
          <g key={cat}>
            <rect x={aX} y={yFor(aVal)} width={barW} height={Math.max(0, bottom - yFor(aVal))} rx={2} fill={aOver ? "#F59E0B" : seriesA.color} />
            <rect x={bX} y={yFor(bVal)} width={barW} height={Math.max(0, bottom - yFor(bVal))} rx={2} fill={bOver ? "#F59E0B" : seriesB.color} />
            <text x={groupCenter} y={bottom + 16} textAnchor="middle" fontSize={11} fontWeight={600} fill="#334155">
              {cat}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

type LineSeries = { name: string; color: string; data: (number | null)[]; area?: boolean };
type ConfidenceBand = { color: string; upper: (number | null)[]; lower: (number | null)[] };

/** Multi-series line chart with grid + optional area fill — replaces ECharts line/area views. */
export function LineChart({
  series,
  band,
  height = 220,
  yFormatter,
}: {
  series: LineSeries[];
  band?: ConfidenceBand;
  height?: number;
  yFormatter?: (v: number) => string;
}) {
  const width = 600;
  const top = 10;
  const bottom = height - 26;
  const leftPad = 52;
  const rightPad = 15;
  const plotW = width - leftPad - rightPad;
  const plotH = bottom - top;

  const allVals = [
    ...series.flatMap((s) => s.data.filter((v): v is number => v != null && Number.isFinite(v))),
    ...(band ? [...band.upper, ...band.lower].filter((v): v is number => v != null && Number.isFinite(v)) : []),
  ];
  const minV = allVals.length ? Math.min(...allVals) : 0;
  const maxV = allVals.length ? Math.max(...allVals) : 1;
  const span = maxV - minV || 1;
  const pad = span * 0.12;
  const domainMin = minV - pad;
  const domainMax = maxV + pad;
  const domainSpan = domainMax - domainMin || 1;

  const n = Math.max(...series.map((s) => s.data.length), 1);
  const xFor = (i: number) => leftPad + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
  const yFor = (v: number) => bottom - ((v - domainMin) / domainSpan) * plotH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = bottom - f * plotH;
        const val = domainMin + f * domainSpan;
        return (
          <g key={f}>
            <line x1={leftPad} x2={width - rightPad} y1={y} y2={y} stroke="#F1F5F9" strokeWidth={1} />
            <text x={leftPad - 6} y={y + 3} textAnchor="end" fontSize={10} fill="#94A3B8">
              {yFormatter ? yFormatter(val) : Math.round(val)}
            </text>
          </g>
        );
      })}
      <line x1={leftPad} x2={width - rightPad} y1={bottom} y2={bottom} stroke="#CBD5E1" strokeWidth={1.5} />
      {band &&
        (() => {
          const upperPts: { x: number; y: number }[] = [];
          const lowerPts: { x: number; y: number }[] = [];
          band.upper.forEach((v, i) => {
            const lo = band.lower[i];
            if (v != null && Number.isFinite(v) && lo != null && Number.isFinite(lo)) {
              upperPts.push({ x: xFor(i), y: yFor(v) });
              lowerPts.push({ x: xFor(i), y: yFor(lo) });
            }
          });
          if (upperPts.length === 0) return null;
          const path = [...upperPts, ...lowerPts.reverse()].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
          return <polygon points={path} fill={band.color} opacity={0.14} />;
        })()}
      {series.map((s) => {
        const pts: { x: number; y: number }[] = [];
        s.data.forEach((v, i) => {
          if (v != null && Number.isFinite(v)) pts.push({ x: xFor(i), y: yFor(v) });
        });
        if (pts.length === 0) return null;
        const pointsStr = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
        return (
          <g key={s.name}>
            {s.area && (
              <polygon
                points={`${pts[0].x.toFixed(1)},${bottom} ${pointsStr} ${pts[pts.length - 1].x.toFixed(1)},${bottom}`}
                fill={s.color}
                opacity={0.12}
              />
            )}
            <polyline fill="none" points={pointsStr} stroke={s.color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
    </svg>
  );
}

export interface VibrationPoint {
  order: number;
  frequency_hz: number;
  amplitude_g: number;
}

/** Discrete crank-order vibration harmonics (0.5x/1x/2x, etc.) as a bar spectrum.
 * These are real physically-computed harmonic peaks, not an interpolated broadband
 * FFT — the physics model only simulates specific crank orders, so plotting the
 * sparse real peaks is more honest than faking a continuous noise floor between them.
 */
export function VibrationSpectrum({ points }: { points: VibrationPoint[] }) {
  const width = 600;
  const height = 190;
  const leftPad = 44;
  const rightPad = 16;
  const top = 16;
  const bottom = height - 40;
  const plotH = bottom - top;
  const plotW = width - leftPad - rightPad;
  const maxAmp = Math.max(...points.map((p) => p.amplitude_g), 0.02) * 1.25;
  const barW = 56;
  const ORDER_COLOR: Record<number, string> = { 0.5: "#0EA5A4", 1: "#F59E0B", 2: "#1E5EFF" };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = bottom - f * plotH;
        return (
          <g key={f}>
            <line x1={leftPad} x2={width - rightPad} y1={y} y2={y} stroke="#F1F5F9" strokeWidth={1} />
            <text x={leftPad - 6} y={y + 3} textAnchor="end" fontSize={10} fill="#94A3B8">
              {(maxAmp * f).toFixed(2)}g
            </text>
          </g>
        );
      })}
      <line x1={leftPad} x2={width - rightPad} y1={bottom} y2={bottom} stroke="#CBD5E1" strokeWidth={1.5} />
      {points.map((p, i) => {
        const slot = plotW / points.length;
        const x = leftPad + slot * (i + 0.5) - barW / 2;
        const h = (p.amplitude_g / maxAmp) * plotH;
        const color = ORDER_COLOR[p.order] ?? "#1E5EFF";
        return (
          <g key={p.order}>
            <rect x={x} y={bottom - h} width={barW} height={Math.max(0, h)} rx={3} fill={color} />
            <text x={x + barW / 2} y={bottom + 16} textAnchor="middle" fontSize={11} fontWeight={600} fill="#334155">
              {p.order}x
            </text>
            <text x={x + barW / 2} y={bottom + 29} textAnchor="middle" fontSize={9} fill="#94A3B8">
              {p.frequency_hz.toFixed(0)} Hz
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Bipolar horizontal bar chart for signed SHAP feature contributions — bars grow left
 * (lowered confidence in the predicted class) or right (raised it) from a center line. */
export function BipolarBarChart({ items }: { items: { feature: string; value: number }[] }) {
  const rowH = 28;
  const width = 480;
  const height = items.length * rowH + 10;
  const labelW = 170;
  const rightPad = 50;
  const plotW = width - labelW - rightPad;
  const centerX = labelW + plotW / 2;
  const maxAbs = Math.max(...items.map((i) => Math.abs(i.value)), 1e-6);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <line x1={centerX} x2={centerX} y1={0} y2={height} stroke="#CBD5E1" strokeWidth={1} />
      {items.map((item, i) => {
        const y = i * rowH + rowH / 2;
        const barLen = (Math.abs(item.value) / maxAbs) * (plotW / 2 - 8);
        const positive = item.value >= 0;
        const color = positive ? "#16A34A" : "#DC2626";
        const x = positive ? centerX : centerX - barLen;
        return (
          <g key={item.feature}>
            <text x={labelW - 10} y={y + 4} textAnchor="end" fontSize={10} fill="#475569" className="font-mono">
              {item.feature.replace(/_/g, " ")}
            </text>
            <rect x={x} y={y - 7} width={Math.max(1, barLen)} height={14} rx={2} fill={color} opacity={0.85} />
          </g>
        );
      })}
    </svg>
  );
}

/** HTML legend to pair with LineChart/DualBarChart (kept out of SVG for crisp text). */
export function ChartLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex items-center gap-4 text-[11px] font-mono flex-wrap">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={it.dashed ? { border: `1px dashed ${it.color}` } : { background: it.color }}
          />
          <span className="text-ink-secondary">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
