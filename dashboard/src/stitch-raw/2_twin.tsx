/* Auto-converted from Stitch export 2_twin.html — reference skeleton. */
export default function DigitalTwinRaw() {
  return (
    <main className="flex-1 grid grid-cols-12 gap-space-md p-space-md overflow-hidden bg-background">
      {/* ======================================================= */}
      {" "}
      {/* COLUMN 1: CENTER/LEFT 3D ENGINE VIEWPORT (~65% width) */}
      {" "}
      {/* ======================================================= */}
      {" "}
      <section className="col-span-8 flex flex-col gap-space-md h-full overflow-hidden">
        {/* 3D VIEWPORT CONTAINER */}
        {" "}
        <div className="relative flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col">
          {/* Viewport Header Strip */}
          {" "}
          <div className="absolute top-0 left-0 right-0 h-10 px-space-md flex items-center justify-between z-10 bg-surface-container-lowest/85 backdrop-blur-sm border-b border-outline-variant/40">
            <div className="flex items-center gap-3">
              <span className="text-label-caps font-label-caps text-on-surface font-bold text-[11px] tracking-wider uppercase">Rotax 914 Turbocharged Boxer Engine · 3D Physical Twin Representation</span>
              {" "}
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-telemetry-sm text-[10px] font-semibold border border-primary/20">CAD MODEL v4.28-REV</span>
            </div>
            {" "}
            <div className="flex items-center gap-2">
              <span className="text-telemetry-sm font-telemetry-sm text-outline text-[11px]">FOV: 45° · Orthographic Grid</span>
            </div>
          </div>
          {" "}
          {/* FLOATING GLASS-MORPHISM TOOLBAR (Top-Right) */}
          {" "}
          <div className="absolute top-12 right-space-md z-20 flex flex-col gap-2">
            {/* View Controls */}
            {" "}
            <div className="bg-white/90 backdrop-blur-md p-1 rounded-lg border border-outline-variant shadow-md flex items-center gap-1">
              <button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors" title="Rotate View">
                <span className="material-symbols-outlined" data-icon="3d_rotation">3d_rotation</span>
              </button>
              {" "}
              <button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors" title="Pan Scene">
                <span className="material-symbols-outlined" data-icon="pan_tool">pan_tool</span>
              </button>
              {" "}
              <button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors" title="Zoom Engine">
                <span className="material-symbols-outlined" data-icon="zoom_in">zoom_in</span>
              </button>
              {" "}
              <div className="w-px h-4 bg-outline-variant" />
              {" "}
              <button className="px-2 py-1 text-[11px] font-telemetry-sm font-semibold rounded text-on-surface hover:bg-surface-container">Iso</button>
              {" "}
              <button className="px-2 py-1 text-[11px] font-telemetry-sm rounded text-outline hover:bg-surface-container">Top</button>
              {" "}
              <button className="px-2 py-1 text-[11px] font-telemetry-sm rounded text-outline hover:bg-surface-container">Front</button>
              {" "}
              <button className="px-2 py-1 text-[11px] font-telemetry-sm rounded text-outline hover:bg-surface-container">Side</button>
            </div>
            {" "}
            {/* Diagnostic Layer Toggles */}
            {" "}
            <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-lg border border-outline-variant shadow-md flex flex-col gap-1 w-44">
              <span className="text-[9px] font-label-caps text-outline uppercase px-1">Twin Diagnostic Layers</span>
              {" "}
              <button className="flex items-center justify-between px-2 py-1 rounded text-[11px] font-medium bg-primary text-white shadow-xs">
                <span>Heat Map (Thermal)</span>
                {" "}
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </button>
              {" "}
              <button className="flex items-center justify-between px-2 py-1 rounded text-[11px] font-medium text-on-surface hover:bg-surface-container">
                <span>Airflow Particles</span>
                {" "}
                <span className="text-outline text-[10px]">Off</span>
              </button>
              {" "}
              <button className="flex items-center justify-between px-2 py-1 rounded text-[11px] font-medium text-on-surface hover:bg-surface-container">
                <span>X-Ray Cutaway</span>
                {" "}
                <span className="text-outline text-[10px]">Off</span>
              </button>
              {" "}
              <button className="flex items-center justify-between px-2 py-1 rounded text-[11px] font-medium text-on-surface hover:bg-surface-container">
                <span>Vibration Dynamics</span>
                {" "}
                <span className="text-outline text-[10px]">Off</span>
              </button>
              {" "}
              <button className="flex items-center justify-between px-2 py-1 rounded text-[11px] font-medium text-on-surface hover:bg-surface-container">
                <span>Exploded View</span>
                {" "}
                <span className="text-outline text-[10px]">0%</span>
              </button>
            </div>
          </div>
          {" "}
          {/* 3D ENGINE VISUAL CANVAS (Detailed SVG Technical Schematics & Interactive Hotspots) */}
          {" "}
          <div className="relative flex-1 w-full h-full blueprint-grid flex items-center justify-center p-6 select-none overflow-hidden">
            {/* Isometric Technical Aero Piston Assembly */}
            {" "}
            <svg className="w-[90%] h-[90%] max-h-[460px] drop-shadow-xl" fill="none" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient cx="50%" cy="50%" id="heat-cyl3" r="50%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.85" />
                  {" "}
                  <stop offset="60%" stopColor="#EA580C" stopOpacity="0.45" />
                  {" "}
                  <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
                </radialGradient>
                {" "}
                <linearGradient id="cool-grad" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.3" />
                  {" "}
                  <stop offset="100%" stopColor="#22C55E" stopOpacity="0.4" />
                </linearGradient>
                {" "}
                <linearGradient id="metal-casing" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#CBD5E1" />
                  {" "}
                  <stop offset="50%" stopColor="#94A3B8" />
                  {" "}
                  <stop offset="100%" stopColor="#64748B" />
                </linearGradient>
                {" "}
                <linearGradient id="engine-block" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#E2E8F0" />
                  {" "}
                  <stop offset="100%" stopColor="#CBD5E1" />
                </linearGradient>
              </defs>
              {" "}
              {/* Blueprint Coordinate Lines */}
              {" "}
              <line stroke="#0047D3" strokeDasharray="4 4" strokeOpacity="0.2" x1="80" x2="720" y1="240" y2="240" />
              {" "}
              <line stroke="#0047D3" strokeDasharray="4 4" strokeOpacity="0.2" x1="400" x2="400" y1="60" y2="420" />
              {" "}
              <circle cx="400" cy="240" fill="none" r="180" stroke="#0047D3" strokeDasharray="2 6" strokeOpacity="0.15" />
              {" "}
              {/* Shadow Footprint */}
              {" "}
              <ellipse cx="400" cy="390" fill="#0F172A" fillOpacity="0.06" rx="260" ry="38" />
              {" "}
              {/* Central Crankcase / Engine Block */}
              {" "}
              <rect fill="url(#engine-block)" height="160" rx="16" stroke="#64748B" strokeWidth="2" width="140" x="330" y="160" />
              {" "}
              {/* Crankcase Bolt Lines & Ridges */}
              {" "}
              <line stroke="#94A3B8" strokeWidth="1.5" x1="330" x2="470" y1="200" y2="200" />
              {" "}
              <line stroke="#94A3B8" strokeWidth="1.5" x1="330" x2="470" y1="240" y2="240" />
              {" "}
              <line stroke="#94A3B8" strokeWidth="1.5" x1="330" x2="470" y1="280" y2="280" />
              {" "}
              {/* Propeller Reduction Gearbox & Front Flange (Facing Left) */}
              {" "}
              <path d="M330 190 L240 215 L240 265 L330 290 Z" fill="url(#metal-casing)" stroke="#475569" strokeWidth="2" />
              {" "}
              <rect fill="#475569" height="36" rx="3" stroke="#334155" strokeWidth="1.5" width="20" x="220" y="222" />
              {" "}
              <circle cx="215" cy="240" fill="#0284C7" fillOpacity="0.2" r="14" stroke="#0284C7" strokeDasharray="3 3" strokeWidth="2" />
              {" "}
              {/* Spinning Propeller Vector Hub Symbol */}
              {" "}
              <g transform="translate(205, 230)">
                <path d="M10 10 L-10 -15 M10 10 L30 35" stroke="#1E5EFF" strokeLinecap="round" strokeWidth="3" />
              </g>
              {" "}
              {/* LEFT BANK CYLINDERS (Cyl 1 Front, Cyl 3 Rear - Top in Iso View) */}
              {" "}
              {/* Cylinder 1 (Left-Forward, Green/Nominal) */}
              {" "}
              <g id="cyl1-assembly">
                <rect fill="#E2E8F0" height="90" rx="4" stroke="#64748B" strokeWidth="2" width="48" x="345" y="70" />
                {" "}
                {/* Cooling Fins */}
                {" "}
                <line stroke="#475569" strokeWidth="2" x1="335" x2="403" y1="85" y2="85" />
                {" "}
                <line stroke="#475569" strokeWidth="2" x1="335" x2="403" y1="95" y2="95" />
                {" "}
                <line stroke="#475569" strokeWidth="2" x1="335" x2="403" y1="105" y2="105" />
                {" "}
                <line stroke="#475569" strokeWidth="2" x1="335" x2="403" y1="115" y2="115" />
                {" "}
                <line stroke="#475569" strokeWidth="2" x1="335" x2="403" y1="125" y2="125" />
                {" "}
                {/* Cyl 1 Head Overlay (Cool green-blue thermal fill) */}
                {" "}
                <rect fill="#22C55E" fillOpacity="0.35" height="24" rx="4" stroke="#16A34A" strokeWidth="1.5" width="56" x="341" y="62" />
              </g>
              {" "}
              {/* Cylinder 3 (Left-Aft, AMBER / ELEVATED THERMAL RESIDUAL) */}
              {" "}
              <g className="pulse-amber" id="cyl3-assembly">
                <rect fill="#FED7AA" height="90" rx="4" stroke="#EA580C" strokeWidth="2" width="48" x="415" y="70" />
                {" "}
                {/* Cooling Fins */}
                {" "}
                <line stroke="#EA580C" strokeWidth="2" x1="405" x2="473" y1="85" y2="85" />
                {" "}
                <line stroke="#EA580C" strokeWidth="2" x1="405" x2="473" y1="95" y2="95" />
                {" "}
                <line stroke="#EA580C" strokeWidth="2" x1="405" x2="473" y1="105" y2="105" />
                {" "}
                <line stroke="#EA580C" strokeWidth="2" x1="405" x2="473" y1="115" y2="115" />
                {" "}
                <line stroke="#EA580C" strokeWidth="2" x1="405" x2="473" y1="125" y2="125" />
                {" "}
                {/* Dynamic Glow Radius */}
                {" "}
                <circle cx="439" cy="74" fill="url(#heat-cyl3)" r="50" />
                {" "}
                {/* Cyl 3 Head Overlay (Amber Alert) */}
                {" "}
                <rect fill="#F59E0B" fillOpacity="0.75" height="24" rx="4" stroke="#D97706" strokeWidth="2" width="56" x="411" y="62" />
              </g>
              {" "}
              {/* RIGHT BANK CYLINDERS (Cyl 2 Front, Cyl 4 Rear - Bottom in Iso View) */}
              {" "}
              {/* Cylinder 2 (Right-Forward, Green/Nominal) */}
              {" "}
              <g id="cyl2-assembly">
                <rect fill="#E2E8F0" height="90" rx="4" stroke="#64748B" strokeWidth="2" width="48" x="345" y="320" />
                {" "}
                <line stroke="#475569" strokeWidth="2" x1="335" x2="403" y1="335" y2="335" />
                {" "}
                <line stroke="#475569" strokeWidth="2" x1="335" x2="403" y1="345" y2="345" />
                {" "}
                <line stroke="#475569" strokeWidth="2" x1="335" x2="403" y1="355" y2="355" />
                {" "}
                <line stroke="#475569" strokeWidth="2" x1="335" x2="403" y1="365" y2="365" />
                {" "}
                <rect fill="#22C55E" fillOpacity="0.35" height="24" rx="4" stroke="#16A34A" strokeWidth="1.5" width="56" x="341" y="394" />
              </g>
              {" "}
              {/* Cylinder 4 (Right-Aft, Green/Nominal) */}
              {" "}
              <g id="cyl4-assembly">
                <rect fill="#E2E8F0" height="90" rx="4" stroke="#64748B" strokeWidth="2" width="48" x="415" y="320" />
                {" "}
                <line stroke="#475569" strokeWidth="2" x1="405" x2="473" y1="335" y2="335" />
                {" "}
                <line stroke="#475569" strokeWidth="2" x1="405" x2="473" y1="345" y2="345" />
                {" "}
                <line stroke="#475569" strokeWidth="2" x1="405" x2="473" y1="355" y2="355" />
                {" "}
                <line stroke="#475569" strokeWidth="2" x1="405" x2="473" y1="365" y2="365" />
                {" "}
                <rect fill="#22C55E" fillOpacity="0.35" height="24" rx="4" stroke="#16A34A" strokeWidth="1.5" width="56" x="411" y="394" />
              </g>
              {" "}
              {/* Turbocharger Unit (Rear Mounted, Right-Aft Area) */}
              {" "}
              <g id="turbocharger-assembly" transform="translate(480, 205)">
                {/* Turbo Casing Snail Housing */}
                {" "}
                <path d="M20 35 C20 15, 45 5, 70 20 C90 35, 85 70, 60 75 C40 80, 20 65, 20 35 Z" fill="#64748B" stroke="#334155" strokeWidth="2" />
                {" "}
                <circle cx="55" cy="45" fill="#94A3B8" r="16" stroke="#1E293B" strokeWidth="1.5" />
                {" "}
                <path d="M70 20 L95 10 L105 28 L80 35 Z" fill="#475569" stroke="#334155" strokeWidth="1.5" />
                {" "}
                {/* Wastegate & Linkage */}
                {" "}
                <line stroke="#DC2626" strokeWidth="2.5" x1="55" x2="85" y1="65" y2="80" />
                {" "}
                <circle cx="85" cy="80" fill="#DC2626" r="4" />
              </g>
              {" "}
              {/* Exhaust Manifolds Piping (Connecting Heads to Turbo) */}
              {" "}
              <path d="M440 160 Q485 170 510 215" fill="none" stroke="#94A3B8" strokeLinecap="round" strokeWidth="7" />
              {" "}
              <path d="M370 160 Q430 180 505 225" fill="none" stroke="#CBD5E1" strokeLinecap="round" strokeWidth="6" />
              {" "}
              <path d="M440 320 Q485 310 515 260" fill="none" stroke="#94A3B8" strokeLinecap="round" strokeWidth="7" />
              {" "}
              {/* Oil Sump & Radiator Heat Exchanger Below */}
              {" "}
              <rect fill="#475569" height="22" rx="4" stroke="#1E293B" strokeWidth="1.5" width="80" x="360" y="295" />
              {" "}
              {/* Radiator Coolant Hoses */}
              {" "}
              <path d="M360 305 Q300 320 285 350" fill="none" stroke="#0284C7" strokeDasharray="3 3" strokeWidth="4" />
              {" "}
              {/* Alternator Mount (Top Front) */}
              {" "}
              <rect fill="#64748B" height="28" rx="14" stroke="#334155" strokeWidth="2" width="28" x="300" y="170" />
            </svg>
            {" "}
            {/* =================================================== */}
            {" "}
            {/* REAL-TIME INTERACTIVE HOTSPOT MARKERS & DATA CALLOUTS */}
            {" "}
            {/* =================================================== */}
            {" "}
            {/* Hotspot 1: Cyl 1 (CHT 112°C Green) */}
            {" "}
            <div className="absolute top-[24%] left-[39%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 cursor-pointer group">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow ring-2 ring-emerald-500/20 group-hover:scale-125 transition-transform" />
              {" "}
              <div className="px-2 py-0.5 rounded bg-white/95 border border-emerald-300 shadow-xs flex items-center gap-1">
                <span className="text-[10px] font-bold font-body-md text-slate-700">CYL 1</span>
                {" "}
                <span className="text-telemetry-sm font-telemetry-sm font-semibold text-emerald-700">112°C</span>
              </div>
            </div>
            {" "}
            {/* Hotspot 2: Cyl 2 (CHT 116°C Green) */}
            {" "}
            <div className="absolute bottom-[24%] left-[39%] -translate-x-1/2 translate-y-1/2 flex items-center gap-1.5 cursor-pointer group">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow ring-2 ring-emerald-500/20 group-hover:scale-125 transition-transform" />
              {" "}
              <div className="px-2 py-0.5 rounded bg-white/95 border border-emerald-300 shadow-xs flex items-center gap-1">
                <span className="text-[10px] font-bold font-body-md text-slate-700">CYL 2</span>
                {" "}
                <span className="text-telemetry-sm font-telemetry-sm font-semibold text-emerald-700">116°C</span>
              </div>
            </div>
            {" "}
            {/* Hotspot 4: Cyl 4 (CHT 114°C Green) */}
            {" "}
            <div className="absolute bottom-[24%] left-[53%] -translate-x-1/2 translate-y-1/2 flex items-center gap-1.5 cursor-pointer group">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow ring-2 ring-emerald-500/20 group-hover:scale-125 transition-transform" />
              {" "}
              <div className="px-2 py-0.5 rounded bg-white/95 border border-emerald-300 shadow-xs flex items-center gap-1">
                <span className="text-[10px] font-bold font-body-md text-slate-700">CYL 4</span>
                {" "}
                <span className="text-telemetry-sm font-telemetry-sm font-semibold text-emerald-700">114°C</span>
              </div>
            </div>
            {" "}
            {/* Hotspot 3: CYLINDER 3 (AMBER ANOMALY - ACTIVE EXPANDED CALLOUT CARD) */}
            {" "}
            <div className="absolute top-[12%] left-[49%] -translate-x-1/2 z-30">
              {/* Connecting Line and Marker */}
              {" "}
              <div className="flex items-center gap-2 mb-1">
                <div className="relative">
                  <span className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow flex items-center justify-center text-white text-[9px] font-bold ring-4 ring-amber-500/30 animate-ping absolute inset-0" />
                  {" "}
                  <span className="relative w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow flex items-center justify-center text-white text-[9px] font-bold">3</span>
                </div>
                {" "}
                <div className="px-2 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-900 text-telemetry-sm font-telemetry-sm font-bold flex items-center gap-1">
                  <span>CYL 3 CHT: 128°C</span>
                  {" "}
                  <span className="text-[10px] text-amber-700">(WATCH)</span>
                </div>
              </div>
              {" "}
              {/* Expanded Telemetry Inspection Popover */}
              {" "}
              <div className="w-64 bg-white/95 backdrop-blur-md rounded-lg border border-amber-200 shadow-xl p-3 text-on-surface">
                <div className="flex items-center justify-between border-b border-outline-variant/40 pb-1.5 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {" "}
                    <span className="text-[11px] font-headline-sm font-bold text-slate-900">Cylinder 3 Head Thermals</span>
                  </div>
                  {" "}
                  <span className="text-telemetry-sm font-telemetry-sm text-amber-700 font-bold bg-amber-100 px-1.5 py-0.2 rounded">Δ +7.0°C</span>
                </div>
                {" "}
                <div className="grid grid-cols-2 gap-2 text-[11px] mb-2 font-telemetry-sm">
                  <div>
                    <span className="text-outline text-[10px] block font-body-md">Observed CHT</span>
                    {" "}
                    <span className="text-slate-900 font-bold text-[13px]">128°C</span>
                  </div>
                  {" "}
                  <div>
                    <span className="text-outline text-[10px] block font-body-md">Twin Expected</span>
                    {" "}
                    <span className="text-slate-600 font-semibold text-[13px]">121°C</span>
                  </div>
                  {" "}
                  <div>
                    <span className="text-outline text-[10px] block font-body-md">EGT Exhaust</span>
                    {" "}
                    <span className="text-slate-900 font-semibold">842°C</span>
                  </div>
                  {" "}
                  <div>
                    <span className="text-outline text-[10px] block font-body-md">Assembly Health</span>
                    {" "}
                    <span className="text-amber-700 font-bold">71 / 100</span>
                  </div>
                </div>
                {" "}
                {/* Mini Micro Sparkline */}
                {" "}
                <div className="mb-2">
                  <div className="flex justify-between text-[9px] text-outline mb-0.5">
                    <span>T-5m</span>
                    {" "}
                    <span className="text-amber-700 font-semibold">Thermal divergence</span>
                    {" "}
                    <span>Now</span>
                  </div>
                  {" "}
                  <svg className="w-full h-7 bg-surface-container-low rounded border border-outline-variant/40" viewBox="0 0 100 24">
                    {/* Expected Baseline */}
                    {" "}
                    <path d="M 0 14 Q 25 14, 50 14 T 100 13" fill="none" stroke="#94A3B8" strokeDasharray="2 2" strokeWidth="1.5" />
                    {" "}
                    {/* Observed Drift Curve */}
                    {" "}
                    <path d="M 0 14 Q 30 14, 45 13 T 70 8 T 100 4" fill="none" stroke="#EA580C" strokeWidth="2" />
                  </svg>
                </div>
                {" "}
                <button className="w-full py-1 text-center bg-primary/10 hover:bg-primary text-primary hover:text-white rounded text-[11px] font-semibold transition-colors flex items-center justify-center gap-1">
                  <span>Open Diagnostics</span>
                  {" "}
                  <span className="text-sm leading-none">→</span>
                </button>
              </div>
            </div>
            {" "}
            {/* Hotspot: Turbocharger */}
            {" "}
            <div className="absolute top-[48%] right-[28%] flex items-center gap-1.5 cursor-pointer group">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow group-hover:scale-125 transition-transform" />
              {" "}
              <div className="px-2 py-0.5 rounded bg-white/95 border border-outline-variant shadow-xs">
                <span className="text-[10px] font-body-md text-slate-700">Turbo:</span>
                {" "}
                <span className="text-telemetry-sm font-telemetry-sm font-semibold text-slate-900">82% eff</span>
              </div>
            </div>
            {" "}
            {/* Hotspot: Oil Sump */}
            {" "}
            <div className="absolute bottom-[28%] left-[45%] flex items-center gap-1.5 cursor-pointer group">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow group-hover:scale-125 transition-transform" />
              {" "}
              <div className="px-2 py-0.5 rounded bg-white/95 border border-outline-variant shadow-xs">
                <span className="text-[10px] font-body-md text-slate-700">Sump:</span>
                {" "}
                <span className="text-telemetry-sm font-telemetry-sm font-semibold text-slate-900">98°C · 4.2 bar</span>
              </div>
            </div>
            {" "}
            {/* Hotspot: Radiator (Amber Watch) */}
            {" "}
            <div className="absolute bottom-[16%] left-[30%] flex items-center gap-1.5 cursor-pointer group">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white shadow group-hover:scale-125 transition-transform" />
              {" "}
              <div className="px-2 py-0.5 rounded bg-white/95 border border-amber-300 shadow-xs">
                <span className="text-[10px] font-body-md text-slate-700">Radiator:</span>
                {" "}
                <span className="text-telemetry-sm font-telemetry-sm font-semibold text-amber-700">0.82 eff</span>
              </div>
            </div>
            {" "}
            {/* Hotspot: Alternator */}
            {" "}
            <div className="absolute top-[34%] left-[32%] flex items-center gap-1.5 cursor-pointer group">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow group-hover:scale-125 transition-transform" />
              {" "}
              <div className="px-2 py-0.5 rounded bg-white/95 border border-outline-variant shadow-xs">
                <span className="text-[10px] font-body-md text-slate-700">Alt:</span>
                {" "}
                <span className="text-telemetry-sm font-telemetry-sm font-semibold text-slate-900">13.9 V</span>
              </div>
            </div>
            {" "}
            {/* Hotspot: Vibration Sensor */}
            {" "}
            <div className="absolute bottom-[36%] right-[32%] flex items-center gap-1.5 cursor-pointer group">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow group-hover:scale-125 transition-transform" />
              {" "}
              <div className="px-2 py-0.5 rounded bg-white/95 border border-outline-variant shadow-xs">
                <span className="text-[10px] font-body-md text-slate-700">Vib:</span>
                {" "}
                <span className="text-telemetry-sm font-telemetry-sm font-semibold text-slate-900">0.18 ips RMS</span>
              </div>
            </div>
          </div>
          {" "}
          {/* BOTTOM VIEWPORT OVERLAYS */}
          {" "}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
            {/* Bottom-Left: Tachometer Badge */}
            {" "}
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-outline-variant shadow-md flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary animate-spin-slow" data-icon="rotate_right">rotate_right</span>
              {" "}
              <div className="flex flex-col">
                <span className="text-[9px] font-label-caps text-outline uppercase leading-none">Crankshaft Speed</span>
                {" "}
                <span className="text-telemetry-md font-telemetry-md font-bold text-slate-900">
                  5,450{" "}
                  <span className="text-xs font-normal text-slate-500">RPM</span>
                </span>
              </div>
            </div>
            {" "}
            {/* Temperature Gradient Legend Bar (Centered) */}
            {" "}
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-outline-variant shadow-md flex items-center gap-2">
              <span className="text-[10px] font-label-caps text-outline uppercase font-semibold">CHT Heatmap</span>
              {" "}
              <div className="w-36 h-2 rounded bg-gradient-to-r from-sky-400 via-emerald-500 via-amber-400 to-rose-600" />
              {" "}
              <div className="flex items-center gap-2 text-[10px] font-telemetry-sm text-slate-600">
                <span>80°C</span>
                {" "}
                <span>110°C</span>
                {" "}
                <span className="text-amber-700 font-bold">125°C</span>
                {" "}
                <span>145°C</span>
              </div>
            </div>
            {" "}
            {/* Bottom-Right: Sync Latency Chip */}
            {" "}
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-outline-variant shadow-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {" "}
              <span className="text-telemetry-sm font-telemetry-sm text-slate-700">
                Synced with live telemetry ·{" "}
                <span className="font-bold text-slate-900">latency 48 ms</span>
              </span>
            </div>
          </div>
        </div>
        {" "}
        {/* ======================================================= */}
        {" "}
        {/* BELOW 3D VIEW: TIME-SERIES TELEMETRY & RESIDUAL TRACK */}
        {" "}
        {/* ======================================================= */}
        {" "}
        <div className="h-56 bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-sm flex flex-col shrink-0">
          {/* Channels Tabs & Chart Controls */}
          {" "}
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2 mb-2">
            <div className="flex items-center gap-1">
              <button className="px-2.5 py-1 rounded text-[11px] font-telemetry-sm font-semibold bg-primary text-white shadow-xs">CHT</button>
              {" "}
              <button className="px-2.5 py-1 rounded text-[11px] font-telemetry-sm text-on-surface-variant hover:bg-surface-container">EGT</button>
              {" "}
              <button className="px-2.5 py-1 rounded text-[11px] font-telemetry-sm text-on-surface-variant hover:bg-surface-container">Oil Temp</button>
              {" "}
              <button className="px-2.5 py-1 rounded text-[11px] font-telemetry-sm text-on-surface-variant hover:bg-surface-container">Oil Press</button>
              {" "}
              <button className="px-2.5 py-1 rounded text-[11px] font-telemetry-sm text-on-surface-variant hover:bg-surface-container">RPM</button>
              {" "}
              <button className="px-2.5 py-1 rounded text-[11px] font-telemetry-sm text-on-surface-variant hover:bg-surface-container">Fuel Flow</button>
            </div>
            {" "}
            {/* Chart Legends */}
            {" "}
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1 bg-primary-container rounded" />
                {" "}
                <span className="font-body-md text-slate-700 text-[11px]">Observed CHT (Sensor)</span>
              </div>
              {" "}
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1 border-t-2 border-dashed border-slate-400" />
                {" "}
                <span className="font-body-md text-slate-700 text-[11px]">Digital Twin Expected</span>
              </div>
              {" "}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 bg-primary/15 rounded" />
                {" "}
                <span className="font-body-md text-slate-500 text-[11px]">95% CI Band</span>
              </div>
              {" "}
              <span className="text-telemetry-sm font-telemetry-sm text-outline">Window: T-10m to Now</span>
            </div>
          </div>
          {" "}
          {/* Dual Track Multi-Series Graph (SVG) */}
          {" "}
          <div className="flex-1 w-full grid grid-rows-4 gap-1 relative">
            {/* TOP 3 ROWS: CHT Temp Curves */}
            {" "}
            <div className="row-span-3 relative w-full h-full">
              {/* Grid Lines */}
              {" "}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9px] font-telemetry-sm text-slate-400">
                <div className="border-b border-dashed border-outline-variant/40 flex justify-between pr-2">
                  <span>130°C</span>
                  <span />
                </div>
                {" "}
                <div className="border-b border-dashed border-outline-variant/40 flex justify-between pr-2">
                  <span>120°C</span>
                  <span />
                </div>
                {" "}
                <div className="border-b border-dashed border-outline-variant/40 flex justify-between pr-2">
                  <span>110°C</span>
                  <span />
                </div>
              </div>
              {" "}
              {/* Vector Line Graph */}
              {" "}
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 700 80">
                {/* Confidence Interval Envelope (Twin Band) */}
                {" "}
                <polygon fill="#1E5EFF" fillOpacity="0.12" points="
                  40,44 100,43 180,44 260,42 340,43 420,44 500,43 580,44 680,43
                  680,52 580,51 500,52 420,53 340,52 260,51 180,52 100,51 40,52" />
                {" "}
                {/* Expected Twin Baseline (Dashed) */}
                {" "}
                <polyline fill="none" points="40,48 100,47 180,48 260,46 340,47 420,48 500,47 580,48 680,47" stroke="#64748B" strokeDasharray="4 3" strokeWidth="1.8" />
                {" "}
                {/* Amber Thermal Drift Alert Area (Highlighting T-02:10 to present) */}
                {" "}
                <rect fill="#FEF3C7" fillOpacity="0.4" height="80" width="160" x="520" y="0" />
                {" "}
                <line stroke="#F59E0B" strokeDasharray="2 2" strokeWidth="1.5" x1="520" x2="520" y1="0" y2="80" />
                {" "}
                {/* Observed Sensor Value Line (Aviation Blue climbing to Amber) */}
                {" "}
                <path d="M 40 48 L 120 47 L 200 48 L 280 47 L 360 49 L 440 47 L 520 44 L 580 28 L 640 18 L 680 14" fill="none" stroke="#1E5EFF" strokeLinecap="round" strokeWidth="2.2" />
                {" "}
                {/* Active Head Marker */}
                {" "}
                <circle cx="680" cy="14" fill="#EA580C" r="4" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
              {" "}
              <div className="absolute top-1 right-28 bg-amber-100 text-amber-800 text-[10px] font-telemetry-sm font-semibold px-2 py-0.5 rounded border border-amber-200">Thermal Drift Initiation (T-02:10)</div>
            </div>
            {" "}
            {/* BOTTOM ROW: Residual & Anomaly Score Track (0 to 1 scale) */}
            {" "}
            <div className="row-span-1 border-t border-outline-variant/60 flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-label-caps text-outline uppercase font-bold">Residual Anomaly Track</span>
                {" "}
                <span className="text-telemetry-sm font-telemetry-sm text-slate-700">
                  Score:{" "}
                  <strong className="text-amber-700">0.74</strong>
                  {" "}(Threshold 0.45)
                </span>
              </div>
              {" "}
              {/* Mini Bar Stream Graph */}
              {" "}
              <div className="w-80 h-3 flex items-end gap-1">
                <div className="w-3 h-1 bg-emerald-400 rounded-xs" />
                {" "}
                <div className="w-3 h-1 bg-emerald-400 rounded-xs" />
                {" "}
                <div className="w-3 h-1.5 bg-emerald-400 rounded-xs" />
                {" "}
                <div className="w-3 h-1 bg-emerald-400 rounded-xs" />
                {" "}
                <div className="w-3 h-1 bg-emerald-400 rounded-xs" />
                {" "}
                <div className="w-3 h-1.5 bg-emerald-400 rounded-xs" />
                {" "}
                <div className="w-3 h-1 bg-emerald-400 rounded-xs" />
                {" "}
                <div className="w-3 h-2 bg-emerald-400 rounded-xs" />
                {" "}
                <div className="w-3 h-1.5 bg-emerald-400 rounded-xs" />
                {" "}
                {/* Drift Phase (Amber) */}
                {" "}
                <div className="w-3 h-2.5 bg-amber-400 rounded-xs" />
                {" "}
                <div className="w-3 h-3 bg-amber-500 rounded-xs" />
                {" "}
                <div className="w-3 h-3 bg-amber-500 rounded-xs" />
                {" "}
                <div className="w-3 h-3.5 bg-amber-600 rounded-xs" />
                {" "}
                <div className="w-3 h-3.5 bg-amber-600 rounded-xs" />
                {" "}
                <div className="w-3 h-3.5 bg-amber-600 rounded-xs" />
              </div>
              {" "}
              <span className="text-[10px] font-telemetry-sm text-outline">Confidence: 99.4%</span>
            </div>
          </div>
        </div>
      </section>
      {" "}
      {/* ======================================================= */}
      {" "}
      {/* COLUMN 2: RIGHT PANEL - TWIN VS REAL SYNTHESIS (~35%) */}
      {" "}
      {/* ======================================================= */}
      {" "}
      <aside className="col-span-4 flex flex-col gap-space-md h-full overflow-y-auto pr-1">
        {/* 1. OBSERVED VS TWIN EXPECTED MATRIX */}
        {" "}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" data-icon="compare_arrows">compare_arrows</span>
              {" "}
              <h2 className="text-headline-sm font-headline-sm font-bold text-slate-900 text-[14px]">Observed vs Twin Expected</h2>
            </div>
            {" "}
            <span className="text-telemetry-sm font-telemetry-sm text-outline text-[10px]">Δ Tolerance: ±2.5%</span>
          </div>
          {" "}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-[10px] font-label-caps text-slate-500 uppercase tracking-wider">
                <th className="py-1">Parameter</th>
                <th className="py-1 text-right">Obs</th>
                <th className="py-1 text-right">Twin</th>
                <th className="py-1 text-right">Residual</th>
                <th className="py-1 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-telemetry-sm text-telemetry-sm">
              {/* Cyl 3 CHT (Amber Watch) */}
              <tr className="bg-amber-50/60 font-semibold text-slate-900">
                <td className="py-1.5 flex items-center gap-1 font-headline-sm text-slate-900 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {" "}CHT Cyl 3
                </td>
                <td className="py-1.5 text-right font-bold text-amber-900">128°C</td>
                <td className="py-1.5 text-right text-slate-600">121°C</td>
                <td className="py-1.5 text-right text-amber-700 font-bold">+7.0°C</td>
                <td className="py-1.5 text-center">
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">WATCH</span>
                </td>
              </tr>
              {/* EGT Avg */}
              <tr className="hover:bg-slate-50">
                <td className="py-1.5 text-slate-700 font-body-md">EGT Avg</td>
                <td className="py-1.5 text-right">812°C</td>
                <td className="py-1.5 text-right text-slate-500">815°C</td>
                <td className="py-1.5 text-right text-slate-600">-3.0°C</td>
                <td className="py-1.5 text-center">
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">Normal</span>
                </td>
              </tr>
              {/* Oil Temp */}
              <tr className="hover:bg-slate-50">
                <td className="py-1.5 text-slate-700 font-body-md">Oil Temp</td>
                <td className="py-1.5 text-right">98°C</td>
                <td className="py-1.5 text-right text-slate-500">96°C</td>
                <td className="py-1.5 text-right text-slate-600">+2.0°C</td>
                <td className="py-1.5 text-center">
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">Normal</span>
                </td>
              </tr>
              {/* Fuel Flow */}
              <tr className="hover:bg-slate-50">
                <td className="py-1.5 text-slate-700 font-body-md">Fuel Flow</td>
                <td className="py-1.5 text-right">24.1 L/h</td>
                <td className="py-1.5 text-right text-slate-500">23.9 L/h</td>
                <td className="py-1.5 text-right text-slate-600">+0.2 L/h</td>
                <td className="py-1.5 text-center">
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">Normal</span>
                </td>
              </tr>
              {/* MAP (Manifold Absolute Pressure) */}
              <tr className="hover:bg-slate-50">
                <td className="py-1.5 text-slate-700 font-body-md">MAP (Turbo)</td>
                <td className="py-1.5 text-right">38.5 inHg</td>
                <td className="py-1.5 text-right text-slate-500">38.4 inHg</td>
                <td className="py-1.5 text-right text-slate-600">+0.1 inHg</td>
                <td className="py-1.5 text-center">
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">Normal</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {" "}
        {/* 2. ESTIMATED HEALTH PARAMETERS (Sparklines & Deltas) */}
        {" "}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" data-icon="monitor_heart">monitor_heart</span>
              {" "}
              <h2 className="text-headline-sm font-headline-sm font-bold text-slate-900 text-[14px]">Estimated Health Parameters</h2>
            </div>
            {" "}
            <span className="text-telemetry-sm font-telemetry-sm text-outline text-[10px]">Kalman Filter Model</span>
          </div>
          {" "}
          <div className="divide-y divide-slate-100">
            {/* Cooling Effectiveness (Watch) */}
            {" "}
            <div className="py-1.5 flex items-center justify-between">
              <div>
                <span className="text-[12px] font-body-md text-slate-800 font-semibold block">Cooling Effectiveness</span>
                {" "}
                <span className="text-[10px] text-amber-700 font-telemetry-sm font-bold">0.82 (-18% degradation)</span>
              </div>
              {" "}
              <div className="flex items-center gap-2">
                {/* Mini SVG sparkline downward */}
                {" "}
                <svg className="w-14 h-4" viewBox="0 0 50 14">
                  <path d="M 0 3 L 20 4 L 35 7 L 50 12" fill="none" stroke="#D97706" strokeWidth="1.8" />
                </svg>
                {" "}
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-telemetry-sm font-bold rounded">WATCH</span>
              </div>
            </div>
            {" "}
            {/* Volumetric Efficiency */}
            {" "}
            <div className="py-1.5 flex items-center justify-between">
              <div>
                <span className="text-[12px] font-body-md text-slate-800 block">Volumetric Efficiency</span>
                {" "}
                <span className="text-[10px] text-slate-500 font-telemetry-sm">0.98 (-1% delta)</span>
              </div>
              {" "}
              <div className="flex items-center gap-2">
                <svg className="w-14 h-4" viewBox="0 0 50 14">
                  <path d="M 0 6 L 25 7 L 50 6" fill="none" stroke="#16A34A" strokeWidth="1.5" />
                </svg>
                {" "}
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-telemetry-sm rounded">Nominal</span>
              </div>
            </div>
            {" "}
            {/* Injector Flow Coeff */}
            {" "}
            <div className="py-1.5 flex items-center justify-between">
              <div>
                <span className="text-[12px] font-body-md text-slate-800 block">Injector Flow Coeff</span>
                {" "}
                <span className="text-[10px] text-slate-500 font-telemetry-sm">0.99 (0.0% delta)</span>
              </div>
              {" "}
              <div className="flex items-center gap-2">
                <svg className="w-14 h-4" viewBox="0 0 50 14">
                  <path d="M 0 7 L 25 7 L 50 7" fill="none" stroke="#16A34A" strokeWidth="1.5" />
                </svg>
                {" "}
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-telemetry-sm rounded">Nominal</span>
              </div>
            </div>
            {" "}
            {/* Friction Factor */}
            {" "}
            <div className="py-1.5 flex items-center justify-between">
              <div>
                <span className="text-[12px] font-body-md text-slate-800 block">Friction Factor</span>
                {" "}
                <span className="text-[10px] text-slate-500 font-telemetry-sm">1.03 (+2% delta)</span>
              </div>
              {" "}
              <div className="flex items-center gap-2">
                <svg className="w-14 h-4" viewBox="0 0 50 14">
                  <path d="M 0 8 L 25 7 L 50 6" fill="none" stroke="#16A34A" strokeWidth="1.5" />
                </svg>
                {" "}
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-telemetry-sm rounded">Normal</span>
              </div>
            </div>
            {" "}
            {/* Oil Pump Efficiency */}
            {" "}
            <div className="py-1.5 flex items-center justify-between">
              <div>
                <span className="text-[12px] font-body-md text-slate-800 block">Oil Pump Efficiency</span>
                {" "}
                <span className="text-[10px] text-slate-500 font-telemetry-sm">0.97 (-1% delta)</span>
              </div>
              {" "}
              <div className="flex items-center gap-2">
                <svg className="w-14 h-4" viewBox="0 0 50 14">
                  <path d="M 0 6 L 25 7 L 50 7" fill="none" stroke="#16A34A" strokeWidth="1.5" />
                </svg>
                {" "}
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-telemetry-sm rounded">Normal</span>
              </div>
            </div>
            {" "}
            {/* Turbocharger Efficiency */}
            {" "}
            <div className="py-1.5 flex items-center justify-between">
              <div>
                <span className="text-[12px] font-body-md text-slate-800 block">Turbocharger Efficiency</span>
                {" "}
                <span className="text-[10px] text-slate-500 font-telemetry-sm">0.95 (Nominal)</span>
              </div>
              {" "}
              <div className="flex items-center gap-2">
                <svg className="w-14 h-4" viewBox="0 0 50 14">
                  <path d="M 0 7 L 25 7 L 50 7" fill="none" stroke="#16A34A" strokeWidth="1.5" />
                </svg>
                {" "}
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-telemetry-sm rounded">Nominal</span>
              </div>
            </div>
          </div>
        </div>
        {" "}
        {/* 3. FAULT SOURCE AI ATTRIBUTION CARD */}
        {" "}
        <div className="bg-surface-container-lowest border-2 border-amber-300 rounded-xl p-space-md shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-400/10 rounded-bl-full pointer-events-none" />
          {" "}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-amber-600" data-icon="psychology">psychology</span>
              {" "}
              <h3 className="text-headline-sm font-headline-sm font-bold text-slate-900 text-[13px]">Fault Source AI Attribution</h3>
            </div>
            {" "}
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-telemetry-sm font-bold">Engine Fault (Not Sensor)</span>
          </div>
          {" "}
          <div className="flex items-start gap-2 bg-amber-50/70 p-2 rounded-lg border border-amber-200/80 mb-2">
            <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5" data-icon="check_circle">check_circle</span>
            {" "}
            <p className="text-[11px] text-slate-700 leading-snug">Sensor integrity validated: thermocouple CHT-03 electrical resistance & bias nominal (0.998 correlation).</p>
          </div>
          {" "}
          <p className="text-[11px] text-slate-700 font-body-md leading-relaxed">
            <strong className="text-amber-900">Diagnosis:</strong>
            {" "}Thermodynamic residual pattern matches physical cylinder coolant shroud restriction or fin fouling, causing asymmetric head heat buildup without combustion knock.
          </p>
        </div>
        {" "}
        {/* 4. COMPONENT INSPECTOR DOCKED CARD (CYLINDER 3 ASSEMBLY) */}
        {" "}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-sm flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" data-icon="hub">hub</span>
                {" "}
                <h3 className="text-headline-sm font-headline-sm font-bold text-slate-900 text-[13px]">Selected: Cylinder 3 Assembly</h3>
              </div>
              {" "}
              <span className="text-telemetry-sm font-telemetry-sm font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Health: 71/100</span>
            </div>
            {" "}
            <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 font-telemetry-sm">
              <div className="bg-surface-container-low p-2 rounded">
                <span className="text-[10px] text-outline font-body-md block">Active Sensor Binds</span>
                {" "}
                <span className="font-semibold text-slate-900 block mt-0.5">CHT-03, EGT-03</span>
                {" "}
                <span className="text-[10px] text-slate-500">Spark Igniter 3 (Dual)</span>
              </div>
              {" "}
              <div className="bg-surface-container-low p-2 rounded">
                <span className="text-[10px] text-outline font-body-md block">Anomaly Onset</span>
                {" "}
                <span className="font-semibold text-amber-800 block mt-0.5">T-02:10:44</span>
                {" "}
                <span className="text-[10px] text-slate-500">Persistent +7°C delta</span>
              </div>
            </div>
            {" "}
            <div className="bg-surface-container-low/60 p-2 rounded border border-outline-variant/40 text-[11px] mb-2">
              <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-1">
                <span className="material-symbols-outlined text-[14px]" data-icon="history_edu">history_edu</span>
                {" "}
                <span className="font-label-caps uppercase font-bold">Maintenance Record</span>
              </div>
              {" "}
              <span className="text-slate-800 font-body-md">Cylinder head gasket & shroud serviced 142 flight hrs ago. Next overhaul scheduled in 58 hrs.</span>
            </div>
          </div>
          {" "}
          {/* Bottom Action Buttons */}
          {" "}
          <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/60">
            <button className="flex-1 h-9 rounded bg-primary text-white text-[12px] font-headline-sm font-semibold hover:bg-primary/90 transition-colors shadow-xs flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[16px]" data-icon="troubleshoot">troubleshoot</span>
              {" "}
              <span>Execute Twin Stress Test</span>
            </button>
            {" "}
            <button className="h-9 px-3 rounded border border-outline-variant hover:bg-surface-container text-slate-700 text-[12px] font-headline-sm font-medium transition-colors" title="Export Diagnostic Dump">
              <span className="material-symbols-outlined" data-icon="file_download">file_download</span>
            </button>
          </div>
        </div>
      </aside>
    </main>
  );
}
