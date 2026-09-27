/** Stitch-style inline sparkline: polyline in a 100x25 box, auto-scaled to the data. */
export function Sparkline({ values, stroke = "#1E5EFF", width = 1.5, className = "w-full h-full" }: { values: (number | null)[]; stroke?: string; width?: number; className?: string }) {
  const raw = values.filter((x): x is number => x != null && Number.isFinite(x));
  // Bucket-average to ~24 points so sensor noise doesn't dominate the shape.
  const buckets = Math.min(24, raw.length);
  const v = buckets < 2 ? raw : Array.from({ length: buckets }, (_, b) => {
    const seg = raw.slice(Math.floor((b * raw.length) / buckets), Math.floor(((b + 1) * raw.length) / buckets));
    return seg.reduce((a, x) => a + x, 0) / seg.length;
  });
  let points = "";
  if (v.length >= 2) {
    const lo = Math.min(...v), hi = Math.max(...v);
    const span = hi - lo || 1;
    points = v.map((y, i) => `${((i / (v.length - 1)) * 100).toFixed(1)},${(22 - ((y - lo) / span) * 19).toFixed(1)}`).join(" ");
  }
  return (
    <svg className={className} preserveAspectRatio="none" viewBox="0 0 100 25">
      {points && <polyline fill="none" points={points} stroke={stroke} strokeLinecap="round" strokeWidth={width} />}
    </svg>
  );
}
