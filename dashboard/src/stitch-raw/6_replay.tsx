/* Auto-converted from Stitch export 6_replay.html — reference skeleton. */
export default function ReplayRaw() {
  return (
    <main className="flex-1 flex overflow-hidden p-space-sm gap-gutter-dense bg-[#F5F7FA]">
      {/* ---------------------------------------------------- */}
      {" "}
      {/* LEFT COLUMN: PAST MISSIONS LOG (~24% width) */}
      {" "}
      {/* ---------------------------------------------------- */}
      {" "}
      <section className="w-[24%] flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm shrink-0">
        {/* Section Header */}
        {" "}
        <div className="p-space-sm border-b border-outline-variant bg-surface-bright flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary" data-icon="history">history</span>
            {" "}
            <span className="font-headline-sm text-headline-sm text-on-surface">Sortie Archives</span>
          </div>
          {" "}
          <span className="text-label-caps font-label-caps text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded text-[10px]">5 SORTIES</span>
        </div>
        {" "}
        {/* Search Box & Filter Bar */}
        {" "}
        <div className="p-space-sm border-b border-outline-variant bg-[#F8FAFC] space-y-2">
          <div className="relative">
            <span className="material-symbols-outlined text-[16px] text-outline absolute left-2.5 top-2.5" data-icon="search">search</span>
            {" "}
            <input className="w-full pl-8 pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-[32px]" placeholder="Filter by mission ID, callsign..." type="text" />
          </div>
          {" "}
          <div className="flex items-center justify-between gap-1 text-[11px]">
            <div className="flex items-center gap-1 text-on-surface-variant font-label-caps">
              <span className="material-symbols-outlined text-[14px]" data-icon="calendar_month">calendar_month</span>
              {" "}
              <span>Sort: Recent</span>
            </div>
            {" "}
            <div className="flex gap-1">
              <button className="px-2 py-0.5 bg-surface-container text-primary font-medium rounded text-[10px] border border-outline-variant/80">All</button>
              {" "}
              <button className="px-2 py-0.5 bg-transparent text-on-surface-variant font-medium rounded text-[10px] hover:bg-surface-container">ISR</button>
              {" "}
              <button className="px-2 py-0.5 bg-transparent text-on-surface-variant font-medium rounded text-[10px] hover:bg-surface-container">CAP</button>
            </div>
          </div>
        </div>
        {" "}
        {/* Sorties List */}
        {" "}
        <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/60 custom-scrollbar">
          {/* Item 1: SELECTED MISSION ISR-18H-B */}
          {" "}
          <div className="p-space-sm bg-surface-container-high/60 border-l-4 border-amber-500 cursor-pointer transition-colors relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">ISR-18H-B</span>
                  {" "}
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-telemetry-sm bg-amber-100 text-amber-800 border border-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1" />
                    WATCH
                  </span>
                </div>
                {" "}
                <div className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">Today · Elapsed: 06:42:15</div>
              </div>
              {" "}
              <div className="text-right">
                <span className="text-telemetry-sm font-telemetry-sm font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 block">-7% Δ</span>
                {" "}
                <span className="text-[10px] text-outline font-telemetry-sm mt-0.5 block">PAUSED</span>
              </div>
            </div>
            {" "}
            <div className="mt-2 text-[11px] text-on-surface-variant flex items-center justify-between border-t border-outline-variant/40 pt-1.5">
              <span>Rotax 914-F2 Turbo</span>
              {" "}
              <span className="text-amber-800 font-medium font-telemetry-sm">Anomaly @ 02:10:44</span>
            </div>
          </div>
          {" "}
          {/* Item 2: Mission CAP-04 */}
          {" "}
          <div className="p-space-sm hover:bg-[#F8FAFC] cursor-pointer transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-headline-sm text-headline-sm text-on-surface">Mission CAP-04</span>
                  {" "}
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-telemetry-sm bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1" />
                    OK
                  </span>
                </div>
                {" "}
                <div className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">Yesterday · 14h 10m</div>
              </div>
              {" "}
              <div className="text-right">
                <span className="text-telemetry-sm font-telemetry-sm text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 block">-1% Δ</span>
                {" "}
                <span className="text-[10px] text-outline font-telemetry-sm mt-0.5 block">Nominal</span>
              </div>
            </div>
            {" "}
            <div className="mt-1.5 text-[11px] text-outline flex items-center justify-between">
              <span>High Endurance Orbit</span>
              {" "}
              <span className="font-telemetry-sm">Full Complete</span>
            </div>
          </div>
          {" "}
          {/* Item 3: Mission ISR-12A */}
          {" "}
          <div className="p-space-sm hover:bg-[#F8FAFC] cursor-pointer transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-headline-sm text-headline-sm text-on-surface">Mission ISR-12A</span>
                  {" "}
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-telemetry-sm bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1" />
                    OK
                  </span>
                </div>
                {" "}
                <div className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">3 days ago · 11h 45m</div>
              </div>
              {" "}
              <div className="text-right">
                <span className="text-telemetry-sm font-telemetry-sm text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 block">0% Δ</span>
                {" "}
                <span className="text-[10px] text-outline font-telemetry-sm mt-0.5 block">Nominal</span>
              </div>
            </div>
            {" "}
            <div className="mt-1.5 text-[11px] text-outline flex items-center justify-between">
              <span>Border Recon Patrol</span>
              {" "}
              <span className="font-telemetry-sm">RTB Clean</span>
            </div>
          </div>
          {" "}
          {/* Item 4: Mission TEST-FLIGHT-09 */}
          {" "}
          <div className="p-space-sm hover:bg-[#F8FAFC] cursor-pointer transition-colors bg-red-50/20">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-headline-sm text-headline-sm text-on-surface">TEST-FLIGHT-09</span>
                  {" "}
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-telemetry-sm bg-red-100 text-red-800 border border-red-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1" />
                    ALERT
                  </span>
                </div>
                {" "}
                <div className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">Last week · 2h 30m</div>
              </div>
              {" "}
              <div className="text-right">
                <span className="text-telemetry-sm font-telemetry-sm text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 block">-14% Δ</span>
                {" "}
                <span className="text-[10px] text-red-600 font-telemetry-sm mt-0.5 block">FAULT TEST</span>
              </div>
            </div>
            {" "}
            <div className="mt-1.5 text-[11px] text-red-800 flex items-center justify-between">
              <span>Injected Cooling Fault</span>
              {" "}
              <span className="font-telemetry-sm">Bench Test</span>
            </div>
          </div>
          {" "}
          {/* Item 5: Mission HIGH-ALT-02 */}
          {" "}
          <div className="p-space-sm hover:bg-[#F8FAFC] cursor-pointer transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-headline-sm text-headline-sm text-on-surface">HIGH-ALT-02</span>
                  {" "}
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-telemetry-sm bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1" />
                    OK
                  </span>
                </div>
                {" "}
                <div className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">2 weeks ago · 8h 15m</div>
              </div>
              {" "}
              <div className="text-right">
                <span className="text-telemetry-sm font-telemetry-sm text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 block">+0.2% Δ</span>
                {" "}
                <span className="text-[10px] text-outline font-telemetry-sm mt-0.5 block">Nominal</span>
              </div>
            </div>
            {" "}
            <div className="mt-1.5 text-[11px] text-outline flex items-center justify-between">
              <span>Ceiling Envelope Validation</span>
              {" "}
              <span className="font-telemetry-sm">FL190</span>
            </div>
          </div>
        </div>
        {" "}
        {/* Quick Log Export Footer */}
        {" "}
        <div className="p-space-sm border-t border-outline-variant bg-[#F8FAFC] flex justify-between items-center text-body-sm">
          <button className="text-on-surface font-medium hover:text-primary flex items-center gap-1 text-[11px]">
            <span className="material-symbols-outlined text-[15px]" data-icon="file_download">file_download</span>
            {" "}
            <span>Batch Export HDF5</span>
          </button>
          {" "}
          <span className="text-[10px] text-outline font-telemetry-sm">CRC-32 Validated</span>
        </div>
      </section>
      {" "}
      {/* ---------------------------------------------------- */}
      {" "}
      {/* CENTER AREA: DIGITAL TWIN & TIME SCRUBBER (~52%) */}
      {" "}
      {/* ---------------------------------------------------- */}
      {" "}
      <section className="flex-1 flex flex-col gap-gutter-dense min-w-0">
        {/* Top Half: Compact 3D Digital Twin Engine Thermal Schematic */}
        {" "}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-sm shadow-sm flex flex-col shrink-0">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary" data-icon="view_in_ar">view_in_ar</span>
              {" "}
              <span className="font-headline-sm text-headline-sm text-on-surface">Synchronized Propulsion Twin (4-Cylinder Boxer Layout)</span>
              {" "}
              <span className="text-label-caps font-label-caps text-outline text-[10px]">T+02:10:44 STATE MATRIX</span>
            </div>
            {" "}
            <div className="flex items-center gap-2">
              <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">
                Coolant Mass Flow:{" "}
                <strong className="text-on-surface">1.82 kg/s</strong>
              </span>
              {" "}
              <span className="h-3 w-px bg-outline-variant" />
              {" "}
              <span className="text-telemetry-sm font-telemetry-sm text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {" "}THERMAL GRADIENT ANOMALY
              </span>
            </div>
          </div>
          {" "}
          {/* Schematic Visual Display & Cylinder Diagnostics */}
          {" "}
          <div className="relative bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9] border border-outline-variant/70 rounded-lg p-3 flex items-center justify-between overflow-hidden">
            {/* Structural Hairline Grid Overlay */}
            {" "}
            <div className="absolute inset-0 opacity-15 pointer-events-none" style={{backgroundImage: 'radial-gradient(#737688 1px, transparent 1px)', backgroundSize: '16px 16px'}} />
            {" "}
            {/* Left Engine Bank (Cylinders 1 & 3) */}
            {" "}
            <div className="w-1/3 space-y-2 z-10">
              {/* Cyl 1 */}
              {" "}
              <div className="bg-surface-container-lowest border border-outline-variant p-2 rounded flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-emerald-500" />
                  {" "}
                  <span className="text-label-caps font-label-caps text-on-surface">CYLINDER 1</span>
                </div>
                {" "}
                <div className="text-right">
                  <span className="text-telemetry-sm font-telemetry-sm font-bold text-on-surface">118.2 °C</span>
                  {" "}
                  <span className="text-[10px] text-emerald-700 ml-1">Nominal</span>
                </div>
              </div>
              {" "}
              {/* Cyl 3 (ANOMALY HIGHLIGHTED) */}
              {" "}
              <div className="bg-amber-50 border-2 border-amber-500 p-2.5 rounded shadow-md relative ring-4 ring-amber-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500 animate-ping" />
                    {" "}
                    <span className="text-label-caps font-label-caps text-amber-900 font-bold">CYLINDER 3 (HOT SPOT)</span>
                  </div>
                  {" "}
                  <span className="text-telemetry-sm font-telemetry-sm font-bold text-amber-900 bg-amber-200/70 px-1 rounded">128.0 °C</span>
                </div>
                {" "}
                {/* Callout Badge */}
                {" "}
                <div className="mt-1.5 flex items-center justify-between text-telemetry-sm font-telemetry-sm border-t border-amber-200 pt-1">
                  <span className="text-amber-800 text-[10px]">Variance vs Model:</span>
                  {" "}
                  <span className="font-bold text-amber-900">+7.0 °C delta</span>
                </div>
              </div>
            </div>
            {" "}
            {/* Center Core Engine Block Graphic Representation */}
            {" "}
            <div className="w-1/4 flex flex-col items-center justify-center z-10 px-2 text-center">
              <div className="w-20 h-28 rounded-md border-2 border-outline-variant bg-surface-container-lowest flex flex-col items-center justify-between p-1.5 shadow-sm relative">
                {/* Crankcase & Turbo shaft center */}
                {" "}
                <div className="text-[9px] font-label-caps text-outline tracking-tight">TURBO INTERCOOLER</div>
                {" "}
                <div className="w-12 h-12 rounded-full border border-dashed border-primary flex items-center justify-center bg-primary/5">
                  <span className="material-symbols-outlined text-primary text-[24px]" data-icon="sync">sync</span>
                </div>
                {" "}
                <div className="text-telemetry-sm font-telemetry-sm text-[10px] text-on-surface-variant font-bold">5,450 RPM</div>
                {" "}
                {/* Connecting lines to Cyl 3 */}
                {" "}
                <div className="absolute -left-4 top-16 w-4 h-0.5 bg-amber-500" />
              </div>
              {" "}
              <span className="text-[10px] text-outline font-label-caps mt-1">ROT-914 REDUCTION BOX</span>
            </div>
            {" "}
            {/* Right Engine Bank (Cylinders 2 & 4) */}
            {" "}
            <div className="w-1/3 space-y-2 z-10">
              {/* Cyl 2 */}
              {" "}
              <div className="bg-surface-container-lowest border border-outline-variant p-2 rounded flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-emerald-500" />
                  {" "}
                  <span className="text-label-caps font-label-caps text-on-surface">CYLINDER 2</span>
                </div>
                {" "}
                <div className="text-right">
                  <span className="text-telemetry-sm font-telemetry-sm font-bold text-on-surface">117.8 °C</span>
                  {" "}
                  <span className="text-[10px] text-emerald-700 ml-1">Nominal</span>
                </div>
              </div>
              {" "}
              {/* Cyl 4 */}
              {" "}
              <div className="bg-surface-container-lowest border border-outline-variant p-2 rounded flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-emerald-500" />
                  {" "}
                  <span className="text-label-caps font-label-caps text-on-surface">CYLINDER 4</span>
                </div>
                {" "}
                <div className="text-right">
                  <span className="text-telemetry-sm font-telemetry-sm font-bold text-on-surface">119.1 °C</span>
                  {" "}
                  <span className="text-[10px] text-emerald-700 ml-1">Nominal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {" "}
        {/* Middle: Synchronized Multi-Trace Time-Series Sensor Charts */}
        {" "}
        <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-space-sm shadow-sm flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/60">
            <span className="text-label-caps font-label-caps text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary" data-icon="stacked_line_chart">stacked_line_chart</span>
              {" "}SYNCHRONIZED TELEMETRY BUS TRACES (00:00:00 — 06:42:15)
            </span>
            {" "}
            <div className="flex items-center gap-3 text-telemetry-sm font-telemetry-sm text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-blue-600" />
                {" "}RPM
              </span>
              {" "}
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-amber-500" />
                {" "}Cyl 3 CHT
              </span>
              {" "}
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-slate-400" />
                {" "}Cyl 1,2,4
              </span>
              {" "}
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-rose-500" />
                {" "}EGT
              </span>
              {" "}
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-emerald-600" />
                {" "}Oil Press
              </span>
            </div>
          </div>
          {" "}
          {/* Traces Canvas Container (Relative for Scrubber Bar synchronization) */}
          {" "}
          <div className="flex-1 relative flex flex-col justify-between py-1 overflow-hidden">
            {/* Synchronized Scrubber Vertical Guide (T+02:10:44 -> approx 32.5% along timeline) */}
            {" "}
            <div className="absolute top-0 bottom-0 left-[32.5%] w-0.5 bg-amber-500 z-20 pointer-events-none flex flex-col items-center">
              <div className="bg-amber-600 text-white font-telemetry-sm text-[9px] px-1 py-0.5 rounded shadow whitespace-nowrap -mt-1 font-semibold">02:10:44 (ANOMALY DETECTED)</div>
              {" "}
              <div className="w-2 h-2 rounded-full bg-amber-500 border border-white mt-1" />
            </div>
            {" "}
            {/* Trace 1: RPM (5,450 RPM Plateau) */}
            {" "}
            <div className="h-[18%] flex items-center border-b border-outline-variant/30 py-0.5">
              <div className="w-28 text-telemetry-sm font-telemetry-sm text-outline shrink-0 leading-tight">
                <span className="text-on-surface font-semibold">RPM</span>
                {" "}
                <span className="text-[10px] block text-primary">5,450 cruise</span>
              </div>
              {" "}
              <div className="flex-1 h-full flex items-center relative">
                {/* SVG Waveform */}
                {" "}
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 40">
                  <path d="M0,35 L80,30 L150,15 L220,12 L325,12 L500,12 L700,12 L850,13 L1000,12" fill="none" stroke="#1E5EFF" strokeWidth="2" />
                </svg>
                {" "}
                <div className="absolute right-2 text-telemetry-sm font-telemetry-sm text-primary font-bold text-[11px]">5,452 rpm</div>
              </div>
            </div>
            {" "}
            {/* Trace 2: CHT Cylinders 1-4 (Cyl 3 orange line diverging at 02:10) */}
            {" "}
            <div className="h-[22%] flex items-center border-b border-outline-variant/30 py-0.5 bg-amber-50/20">
              <div className="w-28 text-telemetry-sm font-telemetry-sm text-outline shrink-0 leading-tight">
                <span className="text-amber-900 font-semibold">CHT (CYL 1-4)</span>
                {" "}
                <span className="text-[10px] block text-amber-700">Cyl 3: 128.0 °C</span>
              </div>
              {" "}
              <div className="flex-1 h-full flex items-center relative">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 50">
                  {/* Nominal Cylinders Baseline (118C) */}
                  {" "}
                  <path d="M0,40 L100,32 L200,28 L325,28 L500,28 L700,27 L1000,28" fill="none" stroke="#94A3B8" strokeDasharray="3,3" strokeWidth="1.5" />
                  {" "}
                  {/* Cyl 3 Divergent Trace */}
                  {" "}
                  <path d="M0,40 L100,32 L200,28 L325,28 Q400,14 550,10 L750,8 L1000,8" fill="none" stroke="#F59E0B" strokeWidth="2.5" />
                </svg>
                {" "}
                <div className="absolute right-2 text-telemetry-sm font-telemetry-sm text-amber-800 font-bold text-[11px] bg-amber-100 px-1 rounded">▲ +7.0°C divergence</div>
              </div>
            </div>
            {" "}
            {/* Trace 3: EGT Exhaust Temps (815 °C steady) */}
            {" "}
            <div className="h-[18%] flex items-center border-b border-outline-variant/30 py-0.5">
              <div className="w-28 text-telemetry-sm font-telemetry-sm text-outline shrink-0 leading-tight">
                <span className="text-on-surface font-semibold">EGT AVG</span>
                {" "}
                <span className="text-[10px] block text-rose-700">815 °C steady</span>
              </div>
              {" "}
              <div className="flex-1 h-full flex items-center relative">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 40">
                  <path d="M0,32 L90,26 L180,18 L325,18 L600,17 L750,18 L1000,17" fill="none" stroke="#E11D48" strokeWidth="1.8" />
                </svg>
                {" "}
                <div className="absolute right-2 text-telemetry-sm font-telemetry-sm text-rose-700 font-bold text-[11px]">814.8 °C</div>
              </div>
            </div>
            {" "}
            {/* Trace 4: Oil Pressure & Temperature (4.2 bar / 98 °C) */}
            {" "}
            <div className="h-[18%] flex items-center border-b border-outline-variant/30 py-0.5">
              <div className="w-28 text-telemetry-sm font-telemetry-sm text-outline shrink-0 leading-tight">
                <span className="text-on-surface font-semibold">OIL PRESS/TEMP</span>
                {" "}
                <span className="text-[10px] block text-emerald-700">4.2 bar / 98 °C</span>
              </div>
              {" "}
              <div className="flex-1 h-full flex items-center relative">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 40">
                  <path d="M0,28 L100,20 L325,20 L500,21 L750,22 L1000,22" fill="none" stroke="#059669" strokeWidth="1.8" />
                  {" "}
                  <path d="M0,34 L120,24 L325,24 L600,25 L800,26 L1000,26" fill="none" stroke="#0D9488" strokeDasharray="2,2" strokeWidth="1" />
                </svg>
                {" "}
                <div className="absolute right-2 text-telemetry-sm font-telemetry-sm text-emerald-800 font-bold text-[11px]">4.18 bar · 98.4 °C</div>
              </div>
            </div>
            {" "}
            {/* Trace 5: Real-time Health Index score (drifting from 92 down to 87) */}
            {" "}
            <div className="h-[20%] flex items-center py-0.5">
              <div className="w-28 text-telemetry-sm font-telemetry-sm text-outline shrink-0 leading-tight">
                <span className="text-on-surface font-semibold">HEALTH INDEX</span>
                {" "}
                <span className="text-[10px] block text-primary font-bold">92 → 87</span>
              </div>
              {" "}
              <div className="flex-1 h-full flex items-center relative">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 40">
                  <defs>
                    <linearGradient id="healthGrad" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#16A34A" />
                      {" "}
                      <stop offset="32%" stopColor="#16A34A" />
                      {" "}
                      <stop offset="50%" stopColor="#EAB308" />
                      {" "}
                      <stop offset="100%" stopColor="#F97316" />
                    </linearGradient>
                  </defs>
                  {" "}
                  <path d="M0,8 L325,8 L500,16 L700,22 L1000,24" fill="none" stroke="url(#healthGrad)" strokeWidth="2.5" />
                </svg>
                {" "}
                <div className="absolute right-2 text-telemetry-sm font-telemetry-sm text-amber-700 font-bold text-[11px]">Score: 87.2</div>
              </div>
            </div>
          </div>
        </div>
        {" "}
        {/* Bottom: Scrubbing Timeline Player Control Bar */}
        {" "}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-sm shadow-sm flex flex-col gap-2 shrink-0">
          {/* Top Row: Controls, Play/Pause, Speed Selectors, Active Timestamp */}
          {" "}
          <div className="flex items-center justify-between">
            {/* Transport Controls */}
            {" "}
            <div className="flex items-center gap-1.5">
              {/* Rewind 10s */}
              {" "}
              <button className="h-8 w-8 rounded border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container flex items-center justify-center transition-colors" title="Rewind 10s">
                <span className="material-symbols-outlined text-[18px]" data-icon="replay_10">replay_10</span>
              </button>
              {" "}
              {/* Play / Pause Button */}
              {" "}
              <button className="h-9 px-3 rounded bg-primary text-on-primary font-body-md font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm transition-colors">
                <span className="material-symbols-outlined text-[20px]" data-icon="pause" style={{fontVariationSettings: "'FILL' 1"}}>pause</span>
                {" "}
                <span className="text-[12px]">PAUSE</span>
              </button>
              {" "}
              {/* Forward 10s */}
              {" "}
              <button className="h-8 w-8 rounded border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container flex items-center justify-center transition-colors" title="Forward 10s">
                <span className="material-symbols-outlined text-[18px]" data-icon="forward_10">forward_10</span>
              </button>
            </div>
            {" "}
            {/* Timestamp Readout */}
            {" "}
            <div className="flex flex-col items-center">
              <div className="text-telemetry-lg font-telemetry-lg font-bold text-on-surface tracking-wider">
                02:10:44{" "}
                <span className="text-outline text-telemetry-md font-normal">/ 06:42:15</span>
              </div>
              {" "}
              <div className="text-label-caps font-label-caps text-on-surface-variant text-[10px]">
                MISSION PHASE:{" "}
                <span className="text-primary font-semibold">LOITER STATION ALPHA</span>
                {" "}(5,200m)
              </div>
            </div>
            {" "}
            {/* Playback Speed Selectors */}
            {" "}
            <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-md border border-outline-variant">
              <span className="text-[10px] font-label-caps text-outline px-1">SPEED</span>
              {" "}
              <button className="px-2 py-0.5 rounded text-telemetry-sm font-telemetry-sm text-on-surface-variant hover:bg-surface-container-lowest">1×</button>
              {" "}
              <button className="px-2 py-0.5 rounded text-telemetry-sm font-telemetry-sm text-on-surface-variant hover:bg-surface-container-lowest">10×</button>
              {" "}
              <button className="px-2 py-0.5 rounded text-telemetry-sm font-telemetry-sm bg-primary text-on-primary font-bold shadow-xs">50×</button>
              {" "}
              <button className="px-2 py-0.5 rounded text-telemetry-sm font-telemetry-sm text-on-surface-variant hover:bg-surface-container-lowest">200×</button>
            </div>
          </div>
          {" "}
          {/* Bottom Row: Scrubber Track with Event Markers */}
          {" "}
          <div className="relative pt-3 pb-1 select-none">
            {/* Background Slider Track */}
            {" "}
            <div className="h-3 w-full bg-[#E2E8F0] rounded-full relative cursor-pointer overflow-hidden border border-outline-variant/60">
              {/* Buffer Progress */}
              {" "}
              <div className="h-full bg-primary/20 w-[100%]" />
              {" "}
              {/* Played Elapsed Fill up to 02:10:44 (approx 32.5%) */}
              {" "}
              <div className="absolute top-0 left-0 h-full bg-primary w-[32.5%]" />
            </div>
            {" "}
            {/* Scrubber Thumb Needle */}
            {" "}
            <div className="absolute top-1.5 left-[32.5%] -translate-x-1/2 flex flex-col items-center pointer-events-none z-30">
              <div className="w-3.5 h-6 bg-amber-500 rounded-sm shadow-md border-2 border-white cursor-grab" />
            </div>
            {" "}
            {/* Event Marker Pins on Scrubber Track */}
            {" "}
            {/* Grey dot at 00:35:00 (~8.7% width) */}
            {" "}
            <div className="absolute top-1 left-[8.7%] -translate-x-1/2 group cursor-pointer" title="00:35:00 - Top of Climb">
              <div className="w-3 h-3 rounded-full bg-slate-500 border-2 border-white shadow group-hover:scale-125 transition-transform" />
              {" "}
              <div className="hidden group-hover:block absolute bottom-5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-telemetry-sm px-1.5 py-0.5 rounded whitespace-nowrap z-40">00:35:00 - Top of Climb</div>
            </div>
            {" "}
            {/* Amber warning marker at 02:10:44 (~32.5% width) */}
            {" "}
            <div className="absolute top-1 left-[32.5%] -translate-x-1/2 group cursor-pointer z-20" title="02:10:44 - Thermal Anomaly Detected">
              <div className="w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white ring-2 ring-amber-300 animate-pulse" />
              {" "}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-amber-700 text-white text-[9px] font-telemetry-sm px-2 py-0.5 rounded whitespace-nowrap shadow-md z-40">▲ 02:10:44 Thermal Anomaly Detected - CHT Divergence</div>
            </div>
            {" "}
            {/* Blue marker at 03:15:00 (~48.5% width) */}
            {" "}
            <div className="absolute top-1 left-[48.5%] -translate-x-1/2 group cursor-pointer" title="03:15:00 - Altitude step to 5,500m">
              <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow group-hover:scale-125 transition-transform" />
              {" "}
              <div className="hidden group-hover:block absolute bottom-5 left-1/2 -translate-x-1/2 bg-blue-900 text-white text-[9px] font-telemetry-sm px-1.5 py-0.5 rounded whitespace-nowrap z-40">03:15:00 - Altitude Step (5,500m)</div>
            </div>
            {" "}
            {/* Red alert marker at 04:30:00 (~67.1% width) */}
            {" "}
            <div className="absolute top-1 left-[67.1%] -translate-x-1/2 group cursor-pointer" title="04:30:00 - Predicted limit breach if unmitigated">
              <div className="w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-white shadow ring-2 ring-red-300 group-hover:scale-125 transition-transform" />
              {" "}
              <div className="hidden group-hover:block absolute bottom-5 left-1/2 -translate-x-1/2 bg-red-800 text-white text-[9px] font-telemetry-sm px-1.5 py-0.5 rounded whitespace-nowrap z-40">⚠ 04:30:00 - Predicted Limit Breach if Unmitigated</div>
            </div>
            {" "}
            {/* Timeline Hour Ticks */}
            {" "}
            <div className="flex justify-between text-telemetry-sm font-telemetry-sm text-[10px] text-outline mt-1.5 px-0.5">
              <span>00:00</span>
              {" "}
              <span>01:00</span>
              {" "}
              <span>02:00</span>
              {" "}
              <span>03:00</span>
              {" "}
              <span>04:00</span>
              {" "}
              <span>05:00</span>
              {" "}
              <span>06:42 (End)</span>
            </div>
          </div>
        </div>
      </section>
      {" "}
      {/* ---------------------------------------------------- */}
      {" "}
      {/* RIGHT COLUMN: TELEMETRY & POST-FLIGHT SUMMARY (~24%) */}
      {" "}
      {/* ---------------------------------------------------- */}
      {" "}
      <section className="w-[24%] flex flex-col gap-gutter-dense shrink-0 overflow-y-auto custom-scrollbar">
        {/* Post-Flight Telemetry Summary Card */}
        {" "}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-sm shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5">
            <span className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary" data-icon="assessment">assessment</span>
              {" "}Sortie Telemetry Summary
            </span>
            {" "}
            <span className="text-label-caps font-label-caps text-outline text-[10px]">AUDIT COMPLETE</span>
          </div>
          {" "}
          {/* Health Score Delta Widget */}
          {" "}
          <div className="bg-[#F8FAFC] border border-outline-variant/70 p-2.5 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-label-caps font-label-caps text-outline block text-[10px]">PROPULSION HEALTH DELTA</span>
              {" "}
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-telemetry-lg font-telemetry-lg font-bold text-on-surface">91</span>
                {" "}
                <span className="material-symbols-outlined text-[14px] text-outline" data-icon="arrow_forward">arrow_forward</span>
                {" "}
                <span className="text-telemetry-xl font-telemetry-xl font-bold text-amber-600">84</span>
              </div>
            </div>
            {" "}
            <div className="text-right">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-telemetry-sm font-telemetry-sm bg-amber-100 text-amber-900 font-bold border border-amber-300">-7 pts</span>
              {" "}
              <span className="text-[10px] text-outline block mt-0.5">Degradation noted</span>
            </div>
          </div>
          {" "}
          {/* Time Above Normal Limits */}
          {" "}
          <div className="border border-outline-variant/60 rounded-lg p-2.5 bg-amber-50/40">
            <div className="flex items-center justify-between">
              <span className="text-label-caps font-label-caps text-amber-900 text-[10px]">TIME EXCEEDING LIMITS</span>
              {" "}
              <span className="material-symbols-outlined text-amber-600 text-[16px]" data-icon="timer">timer</span>
            </div>
            {" "}
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-telemetry-xl font-telemetry-xl font-bold text-amber-900">00:14:22</span>
              {" "}
              <span className="text-telemetry-sm font-telemetry-sm text-amber-800 text-[11px]">Cyl 3 &gt; 125 °C</span>
            </div>
            {" "}
            <div className="w-full bg-amber-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-amber-600 h-full w-[35%]" />
            </div>
          </div>
          {" "}
          {/* Peak Values Recorded Grid */}
          {" "}
          <div>
            <span className="text-label-caps font-label-caps text-outline block text-[10px] mb-1.5 uppercase">Peak Observed Extremes</span>
            {" "}
            <div className="grid grid-cols-2 gap-2 text-body-sm">
              {/* Peak CHT */}
              {" "}
              <div className="p-2 bg-surface-container-low rounded border border-outline-variant/60">
                <span className="text-[10px] text-outline font-label-caps block">PEAK CHT</span>
                {" "}
                <span className="text-telemetry-md font-telemetry-md font-bold text-amber-700">129.4 °C</span>
                {" "}
                <span className="text-[10px] text-outline block">Cyl 3 @ 02:44:10</span>
              </div>
              {" "}
              {/* Peak EGT */}
              {" "}
              <div className="p-2 bg-surface-container-low rounded border border-outline-variant/60">
                <span className="text-[10px] text-outline font-label-caps block">PEAK EGT</span>
                {" "}
                <span className="text-telemetry-md font-telemetry-md font-bold text-rose-700">848 °C</span>
                {" "}
                <span className="text-[10px] text-outline block">Exhaust Stk 2</span>
              </div>
              {" "}
              {/* Peak MAP */}
              {" "}
              <div className="p-2 bg-surface-container-low rounded border border-outline-variant/60">
                <span className="text-[10px] text-outline font-label-caps block">PEAK MAP</span>
                {" "}
                <span className="text-telemetry-md font-telemetry-md font-bold text-on-surface">39.1 inHg</span>
                {" "}
                <span className="text-[10px] text-outline block">Turbo Takeoff Boost</span>
              </div>
              {" "}
              {/* Max Vibration */}
              {" "}
              <div className="p-2 bg-surface-container-low rounded border border-outline-variant/60">
                <span className="text-[10px] text-outline font-label-caps block">MAX VIBRATION</span>
                {" "}
                <span className="text-telemetry-md font-telemetry-md font-bold text-on-surface">0.22 ips</span>
                {" "}
                <span className="text-[10px] text-emerald-700 block">RMS Nominal</span>
              </div>
            </div>
          </div>
        </div>
        {" "}
        {/* Key Events Chronology with Jump Action */}
        {" "}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-sm shadow-sm flex flex-col flex-1">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5 mb-2">
            <span className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary" data-icon="timeline">timeline</span>
              {" "}Key Events Chronology
            </span>
            {" "}
            <span className="text-[10px] text-outline font-telemetry-sm">4 MARKERS</span>
          </div>
          {" "}
          {/* Chronology List */}
          {" "}
          <div className="space-y-2 overflow-y-auto flex-1 text-body-sm">
            {/* Event 1 */}
            {" "}
            <button className="w-full text-left p-2 rounded border border-outline-variant/60 hover:bg-[#F8FAFC] transition-colors group flex items-start gap-2">
              <span className="text-telemetry-sm font-telemetry-sm text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded group-hover:bg-primary group-hover:text-white transition-colors">00:35:00</span>
              {" "}
              <div className="flex-1">
                <span className="font-medium text-on-surface block text-[12px] group-hover:text-primary">Top of Climb Reached</span>
                {" "}
                <span className="text-outline text-[11px] block">Level off at 5,200m MSL, cruise trim</span>
              </div>
            </button>
            {" "}
            {/* Event 2: SELECTED / ACTIVE SCRUBBER TIMESTAMP */}
            {" "}
            <button className="w-full text-left p-2 rounded border-2 border-amber-500 bg-amber-50/70 transition-colors group flex items-start gap-2 ring-2 ring-amber-500/10">
              <span className="text-telemetry-sm font-telemetry-sm text-amber-900 font-bold bg-amber-200 px-1.5 py-0.5 rounded">02:10:44</span>
              {" "}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 text-[12px]">Thermal Anomaly Triggered</span>
                  {" "}
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                </div>
                {" "}
                <span className="text-amber-800 text-[11px] block font-telemetry-sm mt-0.5">CHT Cyl 3 diverges +7.0 °C</span>
              </div>
            </button>
            {" "}
            {/* Event 3 */}
            {" "}
            <button className="w-full text-left p-2 rounded border border-outline-variant/60 hover:bg-[#F8FAFC] transition-colors group flex items-start gap-2">
              <span className="text-telemetry-sm font-telemetry-sm text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded group-hover:bg-primary group-hover:text-white transition-colors">03:15:00</span>
              {" "}
              <div className="flex-1">
                <span className="font-medium text-on-surface block text-[12px] group-hover:text-primary">Altitude Step Climb</span>
                {" "}
                <span className="text-outline text-[11px] block">Commenced climb to 5,500m station</span>
              </div>
            </button>
            {" "}
            {/* Event 4 */}
            {" "}
            <button className="w-full text-left p-2 rounded border border-outline-variant/60 hover:bg-[#F8FAFC] transition-colors group flex items-start gap-2">
              <span className="text-telemetry-sm font-telemetry-sm text-red-700 font-bold bg-red-100 px-1.5 py-0.5 rounded group-hover:bg-red-600 group-hover:text-white transition-colors">04:30:00</span>
              {" "}
              <div className="flex-1">
                <span className="font-medium text-on-surface block text-[12px] group-hover:text-red-700">Digital Twin Limit Warning</span>
                {" "}
                <span className="text-outline text-[11px] block">Model predicts redline breach in 12m</span>
              </div>
            </button>
          </div>
          {" "}
          {/* Bottom Diagnostic Action */}
          {" "}
          <div className="pt-2 border-t border-outline-variant/60 mt-2">
            <button className="w-full h-8 rounded border border-primary text-primary hover:bg-primary hover:text-white transition-colors text-[11px] font-semibold flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]" data-icon="psychology">psychology</span>
              {" "}
              <span>Run AI Twin Root Cause Analysis</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
