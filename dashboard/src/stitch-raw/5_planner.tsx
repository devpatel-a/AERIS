/* Auto-converted from Stitch export 5_planner.html — reference skeleton. */
export default function PlannerRaw() {
  return (
    <main className="flex-1 overflow-y-auto p-margin bg-background">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-gutter">
        {/* Header Strip for Workspace */}
        {" "}
        <div className="flex flex-wrap items-center justify-between gap-space-md border-b border-outline-variant pb-space-md">
          <div className="flex items-center gap-space-md">
            <h1 className="text-headline-lg font-headline-lg text-on-surface tracking-tight">Mission Planner (GO / NO-GO)</h1>
            {" "}
            <span className="px-space-sm py-0.5 rounded-full text-telemetry-sm font-telemetry-sm bg-surface-container-high text-primary border border-primary/20">PRE-FLIGHT SIMULATION RUNNER</span>
          </div>
          {" "}
          <div className="flex items-center gap-space-sm">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Twin Model Version:</span>
            {" "}
            <span className="font-telemetry-sm text-telemetry-sm bg-surface-container px-space-sm py-1 rounded text-on-surface border border-outline-variant">AERO-TWIN-v4.8.2-ROTAX-914</span>
          </div>
        </div>
        {" "}
        {/* 2-Column Grid (approx 42% / 58%) */}
        {" "}
        <div className="grid grid-cols-12 gap-gutter items-start">
          {/* LEFT COLUMN (approx 42% width => 5/12 cols) */}
          {" "}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-gutter">
            {/* Parameter Inputs Card */}
            {" "}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-margin-compact shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)] flex flex-col gap-gutter">
              {/* Card Header */}
              {" "}
              <div className="flex items-center justify-between border-b border-outline-variant pb-space-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary" data-icon="tune">tune</span>
                  {" "}
                  <span className="text-headline-sm font-headline-sm text-on-surface">Flight Parameter Inputs</span>
                </div>
                {" "}
                <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">SIM CONFIG</span>
              </div>
              {" "}
              {/* Mission Profile Dropdown */}
              {" "}
              <div className="flex flex-col gap-space-xs">
                <label className="text-label-caps font-label-caps text-on-surface-variant uppercase" htmlFor="missionProfileSelect">Mission Profile</label>
                {" "}
                <div className="relative">
                  <select className="w-full h-9 pl-space-md pr-space-xl bg-surface-container-lowest border border-outline-variant rounded text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer" id="missionProfileSelect" defaultValue={'isr'}>
                    <option value="isr">ISR 18h Endurance</option>
                    <option value="ha">High Altitude 6 km</option>
                    <option value="hw">Hot Weather 45°C Extreme</option>
                    <option value="rt">Rapid Throttle Transitions</option>
                    <option value="custom">Custom Envelope</option>
                  </select>
                  {" "}
                  <span className="material-symbols-outlined absolute right-2.5 top-2 pointer-events-none text-on-surface-variant text-lg" data-icon="expand_more">expand_more</span>
                </div>
              </div>
              {" "}
              {/* SLIDERS WITH PRECISE DIGITAL READOUTS */}
              {" "}
              <div className="flex flex-col gap-space-md">
                {/* Slider 1: Flight Altitude */}
                {" "}
                <div className="flex flex-col gap-1.5 p-space-sm bg-surface-container-low/50 rounded border border-outline-variant/60">
                  <div className="flex justify-between items-center">
                    <span className="text-label-caps font-label-caps text-on-surface-variant">FLIGHT ALTITUDE</span>
                    {" "}
                    <div className="flex items-baseline gap-1">
                      <span className="text-telemetry-lg font-telemetry-lg text-primary font-bold" id="altVal">5,200</span>
                      {" "}
                      <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">m</span>
                    </div>
                  </div>
                  {" "}
                  <input className="w-full" id="altSlider" max="8000" min="1000" step="50" type="range" defaultValue="5200" />
                  {" "}
                  <div className="flex justify-between text-telemetry-sm font-telemetry-sm text-on-surface-variant/70 text-[10px]">
                    <span>1,000 m</span>
                    {" "}
                    <span>8,000 m (Ceiling)</span>
                  </div>
                </div>
                {" "}
                {/* Slider 2: Mission Duration */}
                {" "}
                <div className="flex flex-col gap-1.5 p-space-sm bg-surface-container-low/50 rounded border border-outline-variant/60">
                  <div className="flex justify-between items-center">
                    <span className="text-label-caps font-label-caps text-on-surface-variant">MISSION DURATION</span>
                    {" "}
                    <div className="flex items-baseline gap-1">
                      <span className="text-telemetry-lg font-telemetry-lg text-primary font-bold" id="durVal">18.0</span>
                      {" "}
                      <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">hrs</span>
                    </div>
                  </div>
                  {" "}
                  <input className="w-full" id="durSlider" max="24" min="2" step="0.5" type="range" defaultValue="18.0" />
                  {" "}
                  <div className="flex justify-between text-telemetry-sm font-telemetry-sm text-on-surface-variant/70 text-[10px]">
                    <span>2.0 h</span>
                    {" "}
                    <span>24.0 h (MALE Class)</span>
                  </div>
                </div>
                {" "}
                {/* Slider 3: Ambient Temperature / ISA Deviation */}
                {" "}
                <div className="flex flex-col gap-1.5 p-space-sm bg-surface-container-low/50 rounded border border-outline-variant/60">
                  <div className="flex justify-between items-center">
                    <span className="text-label-caps font-label-caps text-on-surface-variant">AMBIENT TEMP / ISA DEV</span>
                    {" "}
                    <div className="flex items-baseline gap-1">
                      <span className="text-telemetry-lg font-telemetry-lg text-tertiary font-bold">+15 °C</span>
                      {" "}
                      <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant font-medium">(ISA +12)</span>
                    </div>
                  </div>
                  {" "}
                  <input className="w-full" max="45" min="-20" step="1" type="range" defaultValue="15" />
                  {" "}
                  <div className="flex justify-between text-telemetry-sm font-telemetry-sm text-on-surface-variant/70 text-[10px]">
                    <span>-20 °C</span>
                    {" "}
                    <span>+45 °C Hot Extremes</span>
                  </div>
                </div>
                {" "}
                {/* Grid for Airspeed & Power Setting */}
                {" "}
                <div className="grid grid-cols-2 gap-space-sm">
                  {/* Airspeed */}
                  {" "}
                  <div className="p-space-sm bg-surface-container-low/50 rounded border border-outline-variant/60 flex flex-col justify-between">
                    <span className="text-label-caps font-label-caps text-on-surface-variant text-[10px]">CRUISING AIRSPEED</span>
                    {" "}
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-telemetry-lg font-telemetry-lg text-on-surface font-bold">135</span>
                      {" "}
                      <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">KTAS</span>
                    </div>
                    {" "}
                    <div className="w-full bg-outline-variant/30 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-primary h-full w-[68%]" />
                    </div>
                  </div>
                  {" "}
                  {/* Engine Power Setting */}
                  {" "}
                  <div className="p-space-sm bg-surface-container-low/50 rounded border border-outline-variant/60 flex flex-col justify-between">
                    <span className="text-label-caps font-label-caps text-on-surface-variant text-[10px]">ENGINE POWER SETTING</span>
                    {" "}
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-telemetry-lg font-telemetry-lg text-on-surface font-bold">75%</span>
                      {" "}
                      <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">MCP</span>
                    </div>
                    {" "}
                    <div className="w-full bg-outline-variant/30 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-tertiary h-full w-[75%]" />
                    </div>
                  </div>
                </div>
              </div>
              {" "}
              {/* TWIN HEALTH SYNC TOGGLE */}
              {" "}
              <div className="p-space-sm bg-surface-container rounded-lg border border-outline-variant flex items-start gap-space-sm">
                <input defaultChecked className="mt-1 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer" id="twinSync" type="checkbox" />
                {" "}
                <label className="flex flex-col cursor-pointer" htmlFor="twinSync">
                  <span className="font-headline-sm text-headline-sm text-on-surface">Use current engine health from digital twin</span>
                  {" "}
                  <span className="font-telemetry-sm text-telemetry-sm text-error font-medium mt-0.5">UAV-07 SN 4471 — Cooling degraded 18%</span>
                  {" "}
                  <span className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">Simulates actual physical wear telemetry instead of pristine factory tolerances.</span>
                </label>
              </div>
              {" "}
              {/* ENVIRONMENTAL FACTORS BADGES */}
              {" "}
              <div className="flex flex-col gap-1.5">
                <span className="text-label-caps font-label-caps text-on-surface-variant uppercase text-[10px]">Environmental Factors Calculated</span>
                {" "}
                <div className="grid grid-cols-3 gap-space-xs text-center">
                  <div className="p-space-xs bg-surface-container-high rounded border border-outline-variant/40">
                    <div className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">Headwind</div>
                    {" "}
                    <div className="font-telemetry-md text-telemetry-md font-bold text-on-surface">15 kts</div>
                  </div>
                  {" "}
                  <div className="p-space-xs bg-surface-container-high rounded border border-outline-variant/40">
                    <div className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">OAT cruise</div>
                    {" "}
                    <div className="font-telemetry-md text-telemetry-md font-bold text-on-surface">-12 °C</div>
                  </div>
                  {" "}
                  <div className="p-space-xs bg-surface-container-high rounded border border-outline-variant/40">
                    <div className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">Density Alt</div>
                    {" "}
                    <div className="font-telemetry-md text-telemetry-md font-bold text-on-surface">6,100 m</div>
                  </div>
                </div>
              </div>
              {" "}
              {/* BIG TACTICAL PRIMARY CTA */}
              {" "}
              <button className="w-full h-11 bg-primary text-on-primary rounded font-headline-sm text-headline-sm flex items-center justify-center gap-space-sm hover:bg-primary-container active:scale-[0.99] transition-all duration-150 shadow-md">
                <span className="material-symbols-outlined" data-icon="model_training">model_training</span>
                {" "}
                <span className="tracking-wide font-bold">RUN TWIN SIMULATION</span>
              </button>
            </div>
          </div>
          {" "}
          {/* RIGHT COLUMN (approx 58% width => 7/12 cols) - Simulation Results & Verdict */}
          {" "}
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-gutter">
            {/* 1. HIGH-VISIBILITY VERDICT CARD */}
            {" "}
            <div className="bg-surface-container-lowest border-2 border-error rounded-xl p-margin-compact shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-error" />
              {" "}
              {/* Banner Top Row */}
              {" "}
              <div className="flex flex-wrap items-center justify-between gap-space-md">
                <div className="flex items-center gap-space-md">
                  <div className="px-space-md py-1 bg-error text-on-error rounded font-telemetry-xl text-telemetry-xl font-bold tracking-wider flex items-center gap-space-xs shadow-sm">
                    <span className="material-symbols-outlined text-2xl" data-icon="dangerous">dangerous</span>
                    {" "}
                    <span>NO-GO</span>
                  </div>
                  {" "}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-space-xs">
                      <span className="text-label-caps font-label-caps text-error font-bold uppercase tracking-wider">Mission Abort Advised</span>
                      {" "}
                      <span className="px-space-xs py-0.5 rounded text-telemetry-sm font-telemetry-sm bg-error-container text-on-error-container font-semibold">91% Confidence</span>
                    </div>
                    {" "}
                    <span className="font-headline-sm text-headline-sm text-on-surface">Mission profile exceeds safe thermal operating envelope before completion.</span>
                  </div>
                </div>
              </div>
              {" "}
              {/* Root Causes / Exceedance Factors List */}
              {" "}
              <div className="mt-space-md pt-space-sm border-t border-outline-variant/60 flex flex-col gap-space-xs">
                <span className="text-label-caps font-label-caps text-on-surface-variant uppercase text-[10px]">Predicted Root Causes & Thermal Breach Points:</span>
                {" "}
                <div className="flex items-start gap-space-xs text-error font-body-md text-body-md">
                  <span className="material-symbols-outlined text-base mt-0.5 shrink-0" data-icon="warning">warning</span>
                  {" "}
                  <span>
                    <strong>1. Predicted Cylinder 3 CHT exceeds 135 °C</strong>
                    {" "}thermal limit at{" "}
                    <span className="font-telemetry-sm underline font-bold">T+04h 20m</span>
                    {" "}of cruise loiter phase.
                  </span>
                </div>
                {" "}
                <div className="flex items-start gap-space-xs text-error font-body-md text-body-md">
                  <span className="material-symbols-outlined text-base mt-0.5 shrink-0" data-icon="warning">warning</span>
                  {" "}
                  <span>
                    <strong>2. Oil temperature margin drops below minimum buffer</strong>
                    {" "}(4.2 °C remaining vs 10.0 °C required safe contingency).
                  </span>
                </div>
                {" "}
                <div className="flex items-start gap-space-xs text-on-surface-variant font-body-md text-body-md">
                  <span className="material-symbols-outlined text-base mt-0.5 shrink-0 text-tertiary" data-icon="report_problem">report_problem</span>
                  {" "}
                  <span>
                    <strong>3. Cooling subsystem effectiveness degraded 18%</strong>
                    {" "}in current physical twin state (radiator air stagnation detected).
                  </span>
                </div>
              </div>
              {" "}
              {/* Operational Counter-Measures & Mitigation Section */}
              {" "}
              <div className="mt-space-md p-space-sm bg-surface-container rounded-lg border border-outline-variant flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <span className="text-label-caps font-label-caps text-on-surface font-semibold uppercase">Operational Counter-Measures & Mitigation Pathways</span>
                  {" "}
                  <div className="flex items-center gap-space-xs">
                    <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">Conditional Preview:</span>
                    {" "}
                    <button className="px-space-xs py-0.5 rounded text-telemetry-sm font-telemetry-sm bg-surface-container-high hover:bg-surface-variant text-on-surface border border-outline-variant">Amber CAUTION</button>
                    {" "}
                    <button className="px-space-xs py-0.5 rounded text-telemetry-sm font-telemetry-sm bg-surface-container-high hover:bg-surface-variant text-secondary border border-outline-variant font-semibold">Green GO</button>
                  </div>
                </div>
                {" "}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm mt-1">
                  {/* Mitigation 1 */}
                  {" "}
                  <div className="p-space-sm bg-surface-container-lowest rounded border border-outline-variant hover:border-primary cursor-pointer transition-colors">
                    <div className="flex items-center gap-space-xs text-tertiary font-headline-sm text-headline-sm">
                      <span className="material-symbols-outlined text-sm" data-icon="thermostat">thermostat</span>
                      {" "}
                      <span>GO with Condition</span>
                    </div>
                    {" "}
                    <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                      Ambient surface temp ≤ 30 °C. Delays cylinder thermal runaway to{" "}
                      <strong className="text-on-surface">19h+</strong>
                      .
                    </p>
                  </div>
                  {" "}
                  {/* Mitigation 2 */}
                  {" "}
                  <div className="p-space-sm bg-surface-container-lowest rounded border border-outline-variant hover:border-primary cursor-pointer transition-colors">
                    <div className="flex items-center gap-space-xs text-secondary font-headline-sm text-headline-sm">
                      <span className="material-symbols-outlined text-sm" data-icon="build">build</span>
                      {" "}
                      <span>GO after Maintenance</span>
                    </div>
                    {" "}
                    <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Clear radiator air passage and restore coolant baffle seals to recover full 18% cooling margin.</p>
                  </div>
                </div>
              </div>
            </div>
            {" "}
            {/* 2. MISSION ALTITUDE PROFILE CHART (Center) */}
            {" "}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-margin-compact shadow-sm flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary" data-icon="altitude">altitude</span>
                  {" "}
                  <span className="font-headline-sm text-headline-sm text-on-surface">Mission Flight Profile & Thermal Risk Envelope</span>
                </div>
                {" "}
                <div className="flex items-center gap-space-sm font-telemetry-sm text-telemetry-sm">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-primary" />
                    {" "}Flight Path
                  </span>
                  {" "}
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-error" />
                    {" "}Breach Point (4h 20m)
                  </span>
                </div>
              </div>
              {" "}
              {/* SVG Flight Trajectory Profile */}
              {" "}
              <div className="w-full h-44 bg-surface-container-low/40 rounded border border-outline-variant/60 relative p-2">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 700 130">
                  {/* Flight Phase Background Bands */}
                  {" "}
                  <rect fill="#e2e7ff" height="100" opacity="0.4" width="70" x="20" y="10" />
                  {" "}
                  <rect fill="#eaedff" height="100" opacity="0.3" width="130" x="90" y="10" />
                  {" "}
                  <rect fill="#fee2e2" height="100" opacity="0.3" width="370" x="220" y="10" />
                  {" "}
                  <rect fill="#eaedff" height="100" opacity="0.3" width="90" x="590" y="10" />
                  {" "}
                  {/* Grid Lines */}
                  {" "}
                  <line stroke="#c3c5d9" strokeDasharray="3,3" strokeWidth="0.5" x1="20" x2="680" y1="20" y2="20" />
                  {" "}
                  <line stroke="#c3c5d9" strokeDasharray="3,3" strokeWidth="0.5" x1="20" x2="680" y1="65" y2="65" />
                  {" "}
                  <line stroke="#737688" strokeWidth="1" x1="20" x2="680" y1="110" y2="110" />
                  {" "}
                  {/* Trajectory Line (Climb -> Ingress -> Loiter -> Descent) */}
                  {" "}
                  {/* 0-45m (climb): (20,110) to (90, 30) */}
                  {" "}
                  {/* 45m-3h (cruise ingress): (90,30) to (220,30) */}
                  {" "}
                  {/* 3h-15h (loiter): (220,30) to (590,30) */}
                  {" "}
                  {/* 15h-18h (descent): (590,30) to (680,110) */}
                  {" "}
                  <path d="M 20 110 L 90 30 L 220 30 L 590 30 L 680 110" fill="none" stroke="#0047d3" strokeWidth="2.5" />
                  {" "}
                  {/* Thermal Breach Point Marker at T+4h 20m (Roughly x = 275) */}
                  {" "}
                  <line stroke="#ba1a1a" strokeDasharray="4,3" strokeWidth="1.5" x1="275" x2="275" y1="10" y2="110" />
                  {" "}
                  <circle cx="275" cy="30" fill="#ba1a1a" r="5" stroke="#ffffff" strokeWidth="2" />
                  {" "}
                  {/* Callout Tag at Breach */}
                  {" "}
                  <rect fill="#ba1a1a" height="22" rx="3" width="130" x="285" y="16" />
                  {" "}
                  <text fill="#ffffff" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" x="290" y="31">CRITICAL: T+04h 20m CHT</text>
                  {" "}
                  {/* Phase Text Labels */}
                  {" "}
                  <text fill="#737688" fontFamily="Inter" fontSize="9" fontWeight="600" x="30" y="122">CLIMB (0-45m)</text>
                  {" "}
                  <text fill="#737688" fontFamily="Inter" fontSize="9" fontWeight="600" x="110" y="122">INGRESS (45m-3h)</text>
                  {" "}
                  <text fill="#ba1a1a" fontFamily="Inter" fontSize="9" fontWeight="700" x="340" y="122">LOITER STATION (3h-15h) - RISK WINDOW</text>
                  {" "}
                  <text fill="#737688" fontFamily="Inter" fontSize="9" fontWeight="600" x="595" y="122">DESCENT (15h-18h)</text>
                </svg>
              </div>
            </div>
            {" "}
            {/* 3. PREDICTED PARAMETRIC CURVES & RISK PROBABILITIES */}
            {" "}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-margin-compact shadow-sm flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-headline-sm text-headline-sm text-on-surface">Predicted Parametric Curves (0h — 18h Mission Timeline)</span>
                {" "}
                <div className="flex items-center gap-space-md font-telemetry-sm text-telemetry-sm">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-tertiary" />
                    {" "}Pred. CHT Cyl 3
                  </span>
                  {" "}
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-outline stroke-dasharray" />
                    {" "}Nominal (118°C)
                  </span>
                  {" "}
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-secondary" />
                    {" "}Pred. Oil Temp
                  </span>
                  {" "}
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-error stroke-dasharray" />
                    {" "}135°C Threshold
                  </span>
                </div>
              </div>
              {" "}
              {/* Chart SVG Multi-parameter Time Series */}
              {" "}
              <div className="w-full h-36 bg-surface-container-low/30 rounded border border-outline-variant/60 relative p-1">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 700 110">
                  {/* Horizontal limit line at 135 C (y = 35) */}
                  {" "}
                  <line stroke="#ba1a1a" strokeDasharray="4,2" strokeWidth="1.5" x1="25" x2="685" y1="35" y2="35" />
                  {" "}
                  <text fill="#ba1a1a" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" x="30" y="30">MAX CHT CEILING 135 °C</text>
                  {" "}
                  {/* Baseline CHT line at 118 C (y = 65) */}
                  {" "}
                  <line stroke="#737688" strokeDasharray="5,4" strokeWidth="1" x1="25" x2="685" y1="65" y2="65" />
                  {" "}
                  <text fill="#737688" fontFamily="JetBrains Mono" fontSize="8" x="560" y="60">Twin Baseline (118°C)</text>
                  {" "}
                  {/* Predicted CHT Cyl 3 curve: Starts at 85C, warms up quickly to 120 at 3h, creeps past 135 at 4h20m (x = 220), peaks at 144C */}
                  {" "}
                  <path d="M 25 95 Q 120 70 200 45 T 260 30 Q 400 15 550 25 T 685 70" fill="none" stroke="#9c3000" strokeWidth="2.5" />
                  {" "}
                  {/* Oil Temperature Curve (Secondary teal) */}
                  {" "}
                  <path d="M 25 100 Q 150 80 300 70 T 550 65 T 685 85" fill="none" stroke="#006a69" strokeWidth="2" />
                  {" "}
                  {/* Vertical Marker at Breach Point */}
                  {" "}
                  <line stroke="#ba1a1a" strokeDasharray="2,2" strokeWidth="1" x1="220" x2="220" y1="10" y2="105" />
                  {" "}
                  <circle cx="220" cy="35" fill="#ba1a1a" r="4" />
                  {" "}
                  {/* Time axis ticks */}
                  {" "}
                  <line stroke="#c3c5d9" strokeWidth="1" x1="25" x2="685" y1="105" y2="105" />
                  {" "}
                  <text fill="#737688" fontFamily="JetBrains Mono" fontSize="8" x="25" y="112">T+0h</text>
                  {" "}
                  <text fill="#737688" fontFamily="JetBrains Mono" fontSize="8" x="180" y="112">T+4h</text>
                  {" "}
                  <text fill="#737688" fontFamily="JetBrains Mono" fontSize="8" x="345" y="112">T+8h</text>
                  {" "}
                  <text fill="#737688" fontFamily="JetBrains Mono" fontSize="8" x="510" y="112">T+14h</text>
                  {" "}
                  <text fill="#737688" fontFamily="JetBrains Mono" fontSize="8" x="660" y="112">T+18h</text>
                </svg>
              </div>
              {" "}
              {/* Probability-of-Exceedance Bar Gauge */}
              {" "}
              <div className="grid grid-cols-3 gap-space-sm pt-space-xs">
                {/* CHT Limit Risk */}
                {" "}
                <div className="p-space-xs bg-surface-container rounded border border-outline-variant flex flex-col gap-1">
                  <div className="flex justify-between items-center text-telemetry-sm font-telemetry-sm">
                    <span className="text-on-surface font-medium">CHT Exceedance</span>
                    {" "}
                    <span className="font-bold text-error">94.2% Risk</span>
                  </div>
                  {" "}
                  <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div className="bg-error h-full rounded-full w-[94.2%]" />
                  </div>
                </div>
                {" "}
                {/* Oil Temp Risk */}
                {" "}
                <div className="p-space-xs bg-surface-container rounded border border-outline-variant flex flex-col gap-1">
                  <div className="flex justify-between items-center text-telemetry-sm font-telemetry-sm">
                    <span className="text-on-surface font-medium">Oil Temp Buffer</span>
                    {" "}
                    <span className="font-bold text-tertiary">68.1% Risk</span>
                  </div>
                  {" "}
                  <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div className="bg-tertiary h-full rounded-full w-[68.1%]" />
                  </div>
                </div>
                {" "}
                {/* MAP Risk */}
                {" "}
                <div className="p-space-xs bg-surface-container rounded border border-outline-variant flex flex-col gap-1">
                  <div className="flex justify-between items-center text-telemetry-sm font-telemetry-sm">
                    <span className="text-on-surface font-medium">MAP Overboost</span>
                    {" "}
                    <span className="font-bold text-secondary">2.1% Risk</span>
                  </div>
                  {" "}
                  <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full rounded-full w-[2.1%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
