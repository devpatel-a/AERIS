/* Auto-converted from Stitch export 4_trends.html — reference skeleton. */
export default function TrendsRaw() {
  return (
    <main className="flex-1 overflow-y-auto px-space-xl py-space-md space-y-space-md flex flex-col justify-between">
      {/* Operational Filter Control Bar */}
      {" "}
      <section aria-label="Fleet and Trend Filters" className="bg-surface-container-lowest border border-outline-variant rounded-lg p-space-sm shadow-[0_1px_3px_rgba(15,23,42,0.05)] flex flex-wrap items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-md">
          {/* Engine / UAV Multi-selector */}
          {" "}
          <div className="flex items-center gap-2">
            <span className="text-label-caps font-label-caps text-on-surface-variant">ENGINE:</span>
            {" "}
            <div className="inline-flex rounded-md p-0.5 bg-surface-container border border-outline-variant/60 text-telemetry-sm">
              <button className="px-3 py-1 font-medium text-on-surface-variant hover:text-on-surface transition-colors" type="button">Rotax 914 Fleet (6)</button>
              {" "}
              <button className="px-3 py-1 font-semibold bg-surface-container-lowest text-primary rounded shadow-xs border border-outline-variant/40 flex items-center gap-1.5" type="button">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                {" "}UAV-07 (Rotax 914)
              </button>
            </div>
          </div>
          {" "}
          {/* Date Range Selector */}
          {" "}
          <div className="flex items-center gap-2">
            <span className="text-label-caps font-label-caps text-on-surface-variant">RANGE:</span>
            {" "}
            <div className="inline-flex rounded-md p-0.5 bg-surface-container border border-outline-variant/60 text-telemetry-sm">
              <button className="px-3 py-1 font-semibold bg-surface-container-lowest text-primary rounded shadow-xs border border-outline-variant/40" type="button">Last 20 Missions</button>
              {" "}
              <button className="px-3 py-1 font-medium text-on-surface-variant hover:text-on-surface transition-colors" type="button">30 Days</button>
            </div>
          </div>
          {" "}
          {/* Mission Profile Filter */}
          {" "}
          <div className="flex items-center gap-2">
            <span className="text-label-caps font-label-caps text-on-surface-variant">PROFILE:</span>
            {" "}
            <div className="inline-flex rounded-md p-0.5 bg-surface-container border border-outline-variant/60 text-telemetry-sm">
              <button className="px-2.5 py-1 font-semibold bg-surface-container-lowest text-primary rounded shadow-xs border border-outline-variant/40" type="button">All Profiles</button>
              {" "}
              <button className="px-2.5 py-1 font-medium text-on-surface-variant hover:text-on-surface" type="button">ISR Endurance</button>
              {" "}
              <button className="px-2.5 py-1 font-medium text-on-surface-variant hover:text-on-surface" type="button">High Altitude</button>
              {" "}
              <button className="px-2.5 py-1 font-medium text-on-surface-variant hover:text-on-surface" type="button">Combat Air Patrol</button>
            </div>
          </div>
        </div>
        {" "}
        {/* Export & Parameter Actions */}
        {" "}
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 border border-outline-variant bg-surface-container-lowest text-on-surface rounded font-body-md text-body-md hover:bg-surface-container hover:border-outline transition-colors flex items-center gap-1.5" type="button">
            <span className="material-symbols-outlined text-base" data-icon="tune">tune</span>
            {" "}
            <span>Params</span>
          </button>
          {" "}
          <button className="h-9 px-3 bg-primary text-on-primary rounded font-body-md text-body-md hover:bg-on-primary-fixed-variant transition-colors flex items-center gap-1.5 shadow-sm" type="button">
            <span className="material-symbols-outlined text-base" data-icon="file_download">file_download</span>
            {" "}
            <span>Export CSV</span>
          </button>
        </div>
      </section>
      {" "}
      {/* Section 1: 4 Trend Cards (Last 20 Missions) */}
      {" "}
      <section aria-labelledby="trend-cards-heading">
        <div className="flex items-center justify-between mb-space-sm">
          <div className="flex items-center gap-2">
            <h2 className="text-headline-md font-headline-md text-on-surface tracking-tight" id="trend-cards-heading">Propulsion Degradation Trends</h2>
            {" "}
            <span className="text-label-caps font-label-caps text-on-surface-variant">(SORTIES M-01 TO M-20 · BENCHMARK: UAV-07)</span>
          </div>
          {" "}
          <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">Algorithm: MIL-HDBK-1798 RUL Core</span>
        </div>
        {" "}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gutter">
          {/* Card 1: Overall Health Index */}
          {" "}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <span className="text-label-caps font-label-caps text-on-surface-variant">OVERALL HEALTH INDEX</span>
                {" "}
                {/* Amber Declining Badge */}
                {" "}
                <span className="rounded-full px-2 py-0.5 text-telemetry-sm font-telemetry-sm font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  {" "}-0.18/mission
                </span>
              </div>
              {" "}
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-telemetry-xl font-telemetry-xl text-on-surface font-bold">87</span>
                {" "}
                <span className="text-telemetry-sm font-telemetry-sm text-outline">/ 100</span>
                {" "}
                <span className="ml-2 text-body-sm text-[#B45309] font-medium flex items-center">
                  <span className="material-symbols-outlined text-sm" data-icon="trending_down">trending_down</span>
                  {" "}Declining
                </span>
              </div>
              {" "}
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Accelerated downward delta over past 6 sorties.</p>
            </div>
            {" "}
            {/* Sparkline SVG */}
            {" "}
            <div className="mt-4 pt-2 border-t border-outline-variant/40">
              <div className="flex justify-between items-center text-telemetry-sm font-telemetry-sm text-outline mb-1">
                <span>M-01: 96</span>
                {" "}
                <span className="text-[#B45309] font-semibold">M-20: 87</span>
              </div>
              {" "}
              <svg className="w-full h-11 overflow-visible" fill="none" viewBox="0 0 200 40">
                {/* Nominal guideline */}
                {" "}
                <line stroke="#E2E8F0" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="200" y1="8" y2="8" />
                {" "}
                {/* Trend line */}
                {" "}
                <path d="M0,10 L30,11 L60,12 L90,13 L120,15 L140,20 L160,26 L180,31 L200,35" fill="none" stroke="#F59E0B" strokeLinecap="round" strokeWidth="2.5" />
                {" "}
                {/* Last 6 sorties accent fill */}
                {" "}
                <polygon fill="#FEF3C7" opacity="0.6" points="120,15 140,20 160,26 180,31 200,35 200,40 120,40" />
                {" "}
                {/* Current point */}
                {" "}
                <circle cx="200" cy="35" fill="#B45309" r="3.5" stroke="#FFFFFF" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
          {" "}
          {/* Card 2: Brake Specific Fuel Consumption (BSFC) */}
          {" "}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <span className="text-label-caps font-label-caps text-on-surface-variant">BSFC EFFICIENCY</span>
                {" "}
                {/* Watch Badge */}
                {" "}
                <span className="rounded-full px-2 py-0.5 text-telemetry-sm font-telemetry-sm font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  {" "}+1.2%
                </span>
              </div>
              {" "}
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-telemetry-xl font-telemetry-xl text-on-surface font-bold">242</span>
                {" "}
                <span className="text-telemetry-sm font-telemetry-sm text-outline">g/kWh</span>
                {" "}
                <span className="ml-2 text-body-sm text-[#B45309] font-medium flex items-center">
                  <span className="material-symbols-outlined text-sm" data-icon="trending_up">trending_up</span>
                  {" "}Creep
                </span>
              </div>
              {" "}
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Stable benchmark baseline with subtle upward creep.</p>
            </div>
            {" "}
            {/* Sparkline SVG */}
            {" "}
            <div className="mt-4 pt-2 border-t border-outline-variant/40">
              <div className="flex justify-between items-center text-telemetry-sm font-telemetry-sm text-outline mb-1">
                <span>M-01: 238 g</span>
                {" "}
                <span className="text-[#B45309] font-semibold">M-20: 242 g</span>
              </div>
              {" "}
              <svg className="w-full h-11 overflow-visible" fill="none" viewBox="0 0 200 40">
                <line stroke="#E2E8F0" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="200" y1="30" y2="30" />
                {" "}
                <path d="M0,28 L30,27 L60,29 L90,26 L120,24 L150,21 L175,19 L200,16" fill="none" stroke="#F59E0B" strokeLinecap="round" strokeWidth="2" />
                {" "}
                <circle cx="200" cy="16" fill="#B45309" r="3.5" stroke="#FFFFFF" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
          {" "}
          {/* Card 3: Cylinder Head Temp Margin to Redline */}
          {" "}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <span className="text-label-caps font-label-caps text-on-surface-variant">CHT MARGIN TO REDLINE</span>
                {" "}
                {/* Warning Badge */}
                {" "}
                <span className="rounded-full px-2 py-0.5 text-telemetry-sm font-telemetry-sm font-semibold bg-[#FFEDD5] text-[#C2410C] border border-[#EA580C]/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
                  {" "}-0.35 °C/sortie
                </span>
              </div>
              {" "}
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-telemetry-xl font-telemetry-xl text-[#C2410C] font-bold">+17</span>
                {" "}
                <span className="text-telemetry-sm font-telemetry-sm text-outline">°C margin</span>
                {" "}
                <span className="ml-2 text-telemetry-sm text-outline line-through">(prev +24 °C)</span>
              </div>
              {" "}
              <p className="text-body-sm font-body-sm text-[#C2410C] font-medium mt-1">Warning: Thermal reserve degrading rapidly.</p>
            </div>
            {" "}
            {/* Sparkline SVG */}
            {" "}
            <div className="mt-4 pt-2 border-t border-outline-variant/40">
              <div className="flex justify-between items-center text-telemetry-sm font-telemetry-sm text-outline mb-1">
                <span>Nominal: +28°C</span>
                {" "}
                <span className="text-[#EA580C] font-semibold">Critical: +10°C</span>
              </div>
              {" "}
              <svg className="w-full h-11 overflow-visible" fill="none" viewBox="0 0 200 40">
                {/* Redline threshold zone */}
                {" "}
                <rect fill="#FEE2E2" height="10" opacity="0.6" width="200" x="0" y="30" />
                {" "}
                <line stroke="#DC2626" strokeDasharray="3 2" strokeWidth="1" x1="0" x2="200" y1="30" y2="30" />
                {" "}
                <path d="M0,8 L35,10 L70,11 L105,14 L135,18 L165,22 L185,25 L200,28" fill="none" stroke="#EA580C" strokeLinecap="round" strokeWidth="2.5" />
                {" "}
                <circle cx="200" cy="28" fill="#EA580C" r="3.5" stroke="#FFFFFF" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
          {" "}
          {/* Card 4: Oil Consumption Proxy */}
          {" "}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <span className="text-label-caps font-label-caps text-on-surface-variant">OIL CONSUMPTION PROXY</span>
                {" "}
                {/* Normal Green Badge */}
                {" "}
                <span className="rounded-full px-2 py-0.5 text-telemetry-sm font-telemetry-sm font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#16A34A]/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                  {" "}+0.02 L (Normal)
                </span>
              </div>
              {" "}
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-telemetry-xl font-telemetry-xl text-on-surface font-bold">0.18</span>
                {" "}
                <span className="text-telemetry-sm font-telemetry-sm text-outline">L / 10h</span>
                {" "}
                <span className="ml-2 text-body-sm text-[#15803D] font-medium flex items-center">
                  <span className="material-symbols-outlined text-sm" data-icon="check_circle">check_circle</span>
                  {" "}Compliant
                </span>
              </div>
              {" "}
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Well within MIL-E-8593 operational tolerance limit.</p>
            </div>
            {" "}
            {/* Sparkline SVG */}
            {" "}
            <div className="mt-4 pt-2 border-t border-outline-variant/40">
              <div className="flex justify-between items-center text-telemetry-sm font-telemetry-sm text-outline mb-1">
                <span>MIL-Limit: 0.40 L</span>
                {" "}
                <span className="text-[#15803D] font-semibold">Current: 0.18 L</span>
              </div>
              {" "}
              <svg className="w-full h-11 overflow-visible" fill="none" viewBox="0 0 200 40">
                <line stroke="#DC2626" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="200" y1="6" y2="6" />
                {" "}
                <path d="M0,24 L30,23 L60,25 L90,22 L120,23 L150,22 L175,21 L200,20" fill="none" stroke="#16A34A" strokeLinecap="round" strokeWidth="2" />
                {" "}
                <circle cx="200" cy="20" fill="#16A34A" r="3.5" stroke="#FFFFFF" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        </div>
      </section>
      {" "}
      {/* Section 2: Fleet Status Table (6 UAV Rows) */}
      {" "}
      <section aria-labelledby="fleet-table-heading" className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)] overflow-hidden">
        {/* Table Header Control Panel */}
        {" "}
        <div className="px-space-md py-3 border-b border-outline-variant flex flex-wrap items-center justify-between gap-space-sm bg-surface-container/30">
          <div className="flex items-center gap-space-sm">
            <h2 className="text-headline-md font-headline-md text-on-surface" id="fleet-table-heading">MALE Squadron Fleet Status</h2>
            {" "}
            <span className="text-telemetry-sm font-telemetry-sm bg-surface-container-highest px-2 py-0.5 rounded text-on-surface font-semibold">6 Units Online</span>
          </div>
          {" "}
          <div className="flex items-center gap-space-md text-telemetry-sm font-telemetry-sm text-on-surface-variant">
            <span>
              Sort by:{" "}
              <strong className="text-on-surface">UAV Identifier</strong>
            </span>
            {" "}
            <span className="h-3 w-px bg-outline-variant" />
            {" "}
            <span>
              RUL Model:{" "}
              <strong className="text-on-surface">Continuous Weibull Hazard</strong>
            </span>
          </div>
        </div>
        {" "}
        {/* Table Container */}
        {" "}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="h-8 bg-surface-container-low border-b border-outline-variant/80 text-label-caps font-label-caps text-on-surface-variant select-none">
                <th className="px-space-md py-1.5 font-semibold" scope="col">UAV ID</th>
                <th className="px-space-md py-1.5 font-semibold" scope="col">ENGINE SERIAL</th>
                <th className="px-space-md py-1.5 font-semibold text-right" scope="col">TOTAL HOURS</th>
                <th className="px-space-md py-1.5 font-semibold" scope="col">HEALTH INDEX</th>
                <th className="px-space-md py-1.5 font-semibold text-right" scope="col">RUL</th>
                <th className="px-space-md py-1.5 font-semibold" scope="col">LAST MISSION</th>
                <th className="px-space-md py-1.5 font-semibold" scope="col">STATUS</th>
                <th className="px-space-md py-1.5 font-semibold" scope="col">NEXT MAINTENANCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 text-body-md font-body-md">
              {/* Row 1: UAV-07 (Rotax 914, SN 4471) Highlighted Current Engine */}
              <tr className="h-9 hover:bg-[#EEF4FF] transition-colors bg-primary-fixed/20 border-l-4 border-l-primary font-medium">
                <td className="px-space-md py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    {" "}
                    <span className="font-telemetry-md font-bold text-primary">UAV-07</span>
                    {" "}
                    <span className="text-[10px] bg-primary text-on-primary font-telemetry-sm px-1.5 rounded">CURRENT</span>
                  </div>
                </td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">Rotax 914 · SN 4471</td>
                <td className="px-space-md py-2 whitespace-nowrap text-right font-telemetry-sm text-on-surface">442 hrs</td>
                <td className="px-space-md py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-surface-container rounded-full h-2 overflow-hidden border border-outline-variant/50">
                      <div className="bg-[#F59E0B] h-full rounded-full" style={{width: '87%'}} />
                    </div>
                    {" "}
                    <span className="font-telemetry-sm font-semibold text-on-surface">87/100</span>
                  </div>
                </td>
                <td className="px-space-md py-2 whitespace-nowrap text-right font-telemetry-sm font-semibold text-on-surface">412 hrs</td>
                <td className="px-space-md py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-telemetry-sm">
                    <span className="font-semibold text-primary">ISR-18H</span>
                    {" "}
                    <span className="text-secondary font-bold">(Active Now)</span>
                  </div>
                </td>
                <td className="px-space-md py-2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-telemetry-sm font-telemetry-sm font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                    {" "}WATCH
                  </span>
                </td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm">
                  <span className="text-[#B45309] font-semibold">In 58 hrs</span>
                  {" "}
                  <span className="text-outline text-body-sm">(Radiator inspection)</span>
                </td>
              </tr>
              {/* Row 2: UAV-03 (Rotax 914, SN 4210) */}
              <tr className="h-9 hover:bg-[#EEF4FF] transition-colors bg-surface-container-lowest">
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-md font-semibold text-on-surface">UAV-03</td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">Rotax 914 · SN 4210</td>
                <td className="px-space-md py-2 whitespace-nowrap text-right font-telemetry-sm text-on-surface">890 hrs</td>
                <td className="px-space-md py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-surface-container rounded-full h-2 overflow-hidden border border-outline-variant/50">
                      <div className="bg-[#16A34A] h-full rounded-full" style={{width: '94%'}} />
                    </div>
                    {" "}
                    <span className="font-telemetry-sm font-semibold text-on-surface">94/100</span>
                  </div>
                </td>
                <td className="px-space-md py-2 whitespace-nowrap text-right font-telemetry-sm font-semibold text-on-surface">620 hrs</td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">Maritime Patrol (2d ago)</td>
                <td className="px-space-md py-2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-telemetry-sm font-telemetry-sm font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#16A34A]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                    {" "}MISSION READY
                  </span>
                </td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">In 210 hrs</td>
              </tr>
              {/* Row 3: UAV-11 (Rotax 914, SN 4680) */}
              <tr className="h-9 hover:bg-[#EEF4FF] transition-colors bg-[#F8FAFC]">
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-md font-semibold text-on-surface">UAV-11</td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">Rotax 914 · SN 4680</td>
                <td className="px-space-md py-2 whitespace-nowrap text-right font-telemetry-sm text-on-surface">120 hrs</td>
                <td className="px-space-md py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-surface-container rounded-full h-2 overflow-hidden border border-outline-variant/50">
                      <div className="bg-[#16A34A] h-full rounded-full" style={{width: '99%'}} />
                    </div>
                    {" "}
                    <span className="font-telemetry-sm font-semibold text-on-surface">99/100</span>
                  </div>
                </td>
                <td className="px-space-md py-2 whitespace-nowrap text-right font-telemetry-sm font-semibold text-on-surface">1,180 hrs</td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">Border Recon (12h ago)</td>
                <td className="px-space-md py-2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-telemetry-sm font-telemetry-sm font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#16A34A]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                    {" "}MISSION READY
                  </span>
                </td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">In 480 hrs</td>
              </tr>
              {/* Row 4: UAV-02 (Rotax 914, SN 3992) Maintenance Required */}
              <tr className="h-9 hover:bg-[#EEF4FF] transition-colors bg-surface-container-lowest">
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-md font-semibold text-on-surface">UAV-02</td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">Rotax 914 · SN 3992</td>
                <td className="px-space-md py-2 whitespace-nowrap text-right font-telemetry-sm text-on-surface">1,240 hrs</td>
                <td className="px-space-md py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-surface-container rounded-full h-2 overflow-hidden border border-outline-variant/50">
                      <div className="bg-[#EA580C] h-full rounded-full" style={{width: '73%'}} />
                    </div>
                    {" "}
                    <span className="font-telemetry-sm font-semibold text-[#EA580C]">73/100</span>
                  </div>
                </td>
                <td className="px-space-md py-2 whitespace-nowrap text-right font-telemetry-sm font-semibold text-[#EA580C]">85 hrs</td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">High-Alt Relay (Yesterday)</td>
                <td className="px-space-md py-2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-telemetry-sm font-telemetry-sm font-semibold bg-[#FFEDD5] text-[#C2410C] border border-[#EA580C]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
                    {" "}MAINTENANCE REQ
                  </span>
                </td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm">
                  <span className="text-[#DC2626] font-bold">In 12 hrs</span>
                  {" "}
                  <span className="text-outline text-body-sm">(Scheduled top overhaul)</span>
                </td>
              </tr>
              {/* Row 5: UAV-09 (Rotax 914, SN 4553) */}
              <tr className="h-9 hover:bg-[#EEF4FF] transition-colors bg-[#F8FAFC]">
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-md font-semibold text-on-surface">UAV-09</td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">Rotax 914 · SN 4553</td>
                <td className="px-space-md py-2 whitespace-nowrap text-right font-telemetry-sm text-on-surface">310 hrs</td>
                <td className="px-space-md py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-surface-container rounded-full h-2 overflow-hidden border border-outline-variant/50">
                      <div className="bg-[#16A34A] h-full rounded-full" style={{width: '91%'}} />
                    </div>
                    {" "}
                    <span className="font-telemetry-sm font-semibold text-on-surface">91/100</span>
                  </div>
                </td>
                <td className="px-space-md py-2 whitespace-nowrap text-right font-telemetry-sm font-semibold text-on-surface">740 hrs</td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">Training Sortie (3d ago)</td>
                <td className="px-space-md py-2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-telemetry-sm font-telemetry-sm font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#16A34A]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                    {" "}MISSION READY
                  </span>
                </td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">In 290 hrs</td>
              </tr>
              {/* Row 6: UAV-05 (Rotax 914, SN 4118) */}
              <tr className="h-9 hover:bg-[#EEF4FF] transition-colors bg-surface-container-lowest">
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-md font-semibold text-on-surface">UAV-05</td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">Rotax 914 · SN 4118</td>
                <td className="px-space-md py-2 whitespace-nowrap text-right font-telemetry-sm text-on-surface">670 hrs</td>
                <td className="px-space-md py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-surface-container rounded-full h-2 overflow-hidden border border-outline-variant/50">
                      <div className="bg-[#F59E0B] h-full rounded-full" style={{width: '82%'}} />
                    </div>
                    {" "}
                    <span className="font-telemetry-sm font-semibold text-on-surface">82/100</span>
                  </div>
                </td>
                <td className="px-space-md py-2 whitespace-nowrap text-right font-telemetry-sm font-semibold text-on-surface">290 hrs</td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm text-on-surface-variant">Electronic Warfare (4d ago)</td>
                <td className="px-space-md py-2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-telemetry-sm font-telemetry-sm font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                    {" "}WATCH
                  </span>
                </td>
                <td className="px-space-md py-2 whitespace-nowrap font-telemetry-sm">
                  <span className="text-[#B45309] font-medium">In 95 hrs</span>
                  {" "}
                  <span className="text-outline text-body-sm">(Turbo inspection)</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      {" "}
      {/* Section 3: Subsystem Health vs Missions Heatmap Matrix */}
      {" "}
      <section aria-labelledby="heatmap-heading" className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-md pb-space-sm border-b border-outline-variant/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-headline-md font-headline-md text-on-surface" id="heatmap-heading">Subsystem Health Matrix Across Sorties</h2>
              {" "}
              <span className="text-telemetry-sm font-telemetry-sm px-2 py-0.5 rounded bg-surface-container font-semibold text-on-surface">UAV-07 Rotax 914</span>
            </div>
            {" "}
            <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">Chronological component telemetry score mapped across the last 20 flight mission profiles.</p>
          </div>
          {" "}
          {/* Color-Coding Matrix Legend */}
          {" "}
          <div className="flex items-center gap-space-md text-telemetry-sm font-telemetry-sm">
            <span className="text-label-caps font-label-caps text-on-surface-variant">LEGEND:</span>
            {" "}
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#15803D]" />
              {" "}
              <span className="text-on-surface">95–100 (Nominal)</span>
            </div>
            {" "}
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#86EFAC] border border-[#16A34A]/40" />
              {" "}
              <span className="text-on-surface">88–94 (Stable)</span>
            </div>
            {" "}
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#F59E0B]" />
              {" "}
              <span className="text-on-surface">70–80 (Degraded)</span>
            </div>
          </div>
        </div>
        {" "}
        {/* Heatmap Grid */}
        {" "}
        <div className="overflow-x-auto">
          <div className="min-w-[840px]">
            {/* Column Labels (M-01 to M-20) */}
            {" "}
            <div className="grid grid-cols-[140px_repeat(20,_minmax(0,_1fr))] gap-1 items-center pb-2 text-center text-telemetry-sm font-telemetry-sm text-on-surface-variant font-semibold border-b border-outline-variant/40">
              <div className="text-left pl-2 text-label-caps font-label-caps">SUBSYSTEM</div>
              {" "}
              <div>M-01</div>
              <div>M-02</div>
              <div>M-03</div>
              <div>M-04</div>
              <div>M-05</div>
              {" "}
              <div>M-06</div>
              <div>M-07</div>
              <div>M-08</div>
              <div>M-09</div>
              <div>M-10</div>
              {" "}
              <div>M-11</div>
              <div>M-12</div>
              <div>M-13</div>
              <div>M-14</div>
              <div>M-15</div>
              {" "}
              <div>M-16</div>
              {" "}
              {/* Degradation sorties highlighted */}
              {" "}
              <div className="text-tertiary font-bold bg-tertiary-fixed/40 rounded">M-17</div>
              {" "}
              <div className="text-tertiary font-bold bg-tertiary-fixed/40 rounded">M-18</div>
              {" "}
              <div className="text-tertiary font-bold bg-tertiary-fixed/40 rounded">M-19</div>
              {" "}
              <div className="text-[#DC2626] font-bold bg-error-container rounded">M-20</div>
            </div>
            {" "}
            {/* Heatmap Rows */}
            {" "}
            <div className="divide-y divide-outline-variant/20 pt-1">
              {/* Row 1: Combustion */}
              {" "}
              <div className="grid grid-cols-[140px_repeat(20,_minmax(0,_1fr))] gap-1 py-1.5 items-center hover:bg-surface-container/40 rounded">
                <div className="font-telemetry-sm text-telemetry-sm font-semibold text-on-surface pl-2 flex items-center justify-between pr-2">
                  <span>Combustion</span>
                  {" "}
                  <span className="text-outline text-[10px]">96 avg</span>
                </div>
                {" "}
                {/* M-01 to M-20 (Healthy 95-100) */}
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-01: 98 (Optimal spark)">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-02: 97">97</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-03: 98">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-04: 96">96</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-05: 97">97</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-06: 96">96</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-07: 94">94</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-08: 97">97</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-09: 98">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-10: 96">96</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-11: 95">95</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-12: 96">96</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-13: 97">97</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-14: 95">95</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-15: 93">93</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-16: 95">95</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-17: 92">92</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-18: 91">91</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-19: 90">90</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-20: 89">89</div>
              </div>
              {" "}
              {/* Row 2: Cooling (Degradation on M-17 through M-20 highlight) */}
              {" "}
              <div className="grid grid-cols-[140px_repeat(20,_minmax(0,_1fr))] gap-1 py-1.5 items-center bg-[#FEF3C7]/20 hover:bg-[#FEF3C7]/40 rounded border-l-2 border-[#EA580C]">
                <div className="font-telemetry-sm text-telemetry-sm font-bold text-[#B45309] pl-2 flex items-center justify-between pr-2">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] animate-pulse" />
                    {" "}Cooling
                  </span>
                  {" "}
                  <span className="text-tertiary text-[10px] font-bold">78 alert</span>
                </div>
                {" "}
                {/* M-01 to M-16 (Normal to degraded transition) */}
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-01: 98 (Cooling nominal)">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-02: 97">97</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-03: 96">96</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-04: 95">95</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-05: 96">96</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-06: 94">94</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-07: 93">93</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-08: 94">94</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-09: 92">92</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-10: 91">91</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-11: 90">90</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-12: 89">89</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-13: 88">88</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-14: 88">88</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-15: 86">86</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-16: 84">84</div>
                {" "}
                {/* M-17 through M-20 Amber Degraded (70-80 range) with Inspection tooltips */}
                {" "}
                <div className="h-7 rounded bg-[#F59E0B] text-[10px] text-white flex items-center justify-center font-telemetry-sm font-bold shadow-xs cursor-help ring-1 ring-[#EA580C]" title="M-17 Sortie: 79 (Inspection Tooltip: Radiator airflow restriction detected +3.2°C)">79</div>
                {" "}
                <div className="h-7 rounded bg-[#F59E0B] text-[10px] text-white flex items-center justify-center font-telemetry-sm font-bold shadow-xs cursor-help ring-1 ring-[#EA580C]" title="M-18 Sortie: 76 (Inspection Tooltip: Coolant pump differential pressure -0.4 bar)">76</div>
                {" "}
                <div className="h-7 rounded bg-[#F59E0B] text-[10px] text-white flex items-center justify-center font-telemetry-sm font-bold shadow-xs cursor-help ring-1 ring-[#EA580C]" title="M-19 Sortie: 73 (Inspection Tooltip: CHT Cylinder #3 peak 118°C approaching limit)">73</div>
                {" "}
                <div className="h-7 rounded bg-[#F59E0B] text-[10px] text-white flex items-center justify-center font-telemetry-sm font-bold shadow-xs cursor-help ring-2 ring-[#DC2626]" title="M-20 Sortie: 71 (CRITICAL INSPECTION: CHT margin down to +17°C redline reserve)">71</div>
              </div>
              {" "}
              {/* Row 3: Lubrication */}
              {" "}
              <div className="grid grid-cols-[140px_repeat(20,_minmax(0,_1fr))] gap-1 py-1.5 items-center hover:bg-surface-container/40 rounded">
                <div className="font-telemetry-sm text-telemetry-sm font-semibold text-on-surface pl-2 flex items-center justify-between pr-2">
                  <span>Lubrication</span>
                  {" "}
                  <span className="text-outline text-[10px]">93 avg</span>
                </div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-01: 96">96</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-02: 95">95</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-03: 96">96</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-04: 94">94</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-05: 93">93</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-06: 94">94</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-07: 92">92</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-08: 93">93</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-09: 93">93</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-10: 92">92</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-11: 93">93</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-12: 91">91</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-13: 92">92</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-14: 92">92</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-15: 90">90</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-16: 91">91</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-17: 90">90</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-18: 91">91</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-19: 89">89</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-20: 89">89</div>
              </div>
              {" "}
              {/* Row 4: Fuel / Injection */}
              {" "}
              <div className="grid grid-cols-[140px_repeat(20,_minmax(0,_1fr))] gap-1 py-1.5 items-center hover:bg-surface-container/40 rounded">
                <div className="font-telemetry-sm text-telemetry-sm font-semibold text-on-surface pl-2 flex items-center justify-between pr-2">
                  <span>Fuel / Inj</span>
                  {" "}
                  <span className="text-outline text-[10px]">95 avg</span>
                </div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-01: 97">97</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-02: 98">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-03: 97">97</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-04: 96">96</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-05: 95">95</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-06: 96">96</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-07: 95">95</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-08: 97">97</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-09: 96">96</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-10: 95">95</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-11: 94">94</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-12: 93">93</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-13: 94">94</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-14: 92">92</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-15: 93">93</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-16: 92">92</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-17: 91">91</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-18: 91">91</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-19: 90">90</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-20: 89">89</div>
              </div>
              {" "}
              {/* Row 5: Electrical */}
              {" "}
              <div className="grid grid-cols-[140px_repeat(20,_minmax(0,_1fr))] gap-1 py-1.5 items-center hover:bg-surface-container/40 rounded">
                <div className="font-telemetry-sm text-telemetry-sm font-semibold text-on-surface pl-2 flex items-center justify-between pr-2">
                  <span>Electrical</span>
                  {" "}
                  <span className="text-outline text-[10px]">99 avg</span>
                </div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-01: 99">99</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-02: 100">100</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-03: 99">99</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-04: 99">99</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-05: 100">100</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-06: 99">99</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-07: 98">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-08: 99">99</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-09: 99">99</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-10: 98">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-11: 99">99</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-12: 99">99</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-13: 98">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-14: 98">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-15: 97">97</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-16: 98">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-17: 98">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-18: 97">97</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-19: 97">97</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-20: 96">96</div>
              </div>
              {" "}
              {/* Row 6: Turbo / Air */}
              {" "}
              <div className="grid grid-cols-[140px_repeat(20,_minmax(0,_1fr))] gap-1 py-1.5 items-center hover:bg-surface-container/40 rounded">
                <div className="font-telemetry-sm text-telemetry-sm font-semibold text-on-surface pl-2 flex items-center justify-between pr-2">
                  <span>Turbo / Air</span>
                  {" "}
                  <span className="text-outline text-[10px]">91 avg</span>
                </div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-01: 96">96</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-02: 95">95</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-03: 94">94</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-04: 93">93</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-05: 93">93</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-06: 92">92</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-07: 91">91</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-08: 92">92</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-09: 90">90</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-10: 91">91</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-11: 89">89</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-12: 90">90</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-13: 88">88</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-14: 89">89</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-15: 88">88</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-16: 87">87</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-17: 86">86</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-18: 85">85</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-19: 84">84</div>
                {" "}
                <div className="h-7 rounded bg-[#86EFAC] text-[10px] text-[#131b2e] flex items-center justify-center font-telemetry-sm font-semibold" title="M-20: 83">83</div>
              </div>
              {" "}
              {/* Row 7: Sensors */}
              {" "}
              <div className="grid grid-cols-[140px_repeat(20,_minmax(0,_1fr))] gap-1 py-1.5 items-center hover:bg-surface-container/40 rounded">
                <div className="font-telemetry-sm text-telemetry-sm font-semibold text-on-surface pl-2 flex items-center justify-between pr-2">
                  <span>Sensors</span>
                  {" "}
                  <span className="text-outline text-[10px]">98 avg</span>
                </div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-01: 99">99</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-02: 98">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-03: 99">99</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-04: 98">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-05: 98">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-06: 97">97</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-07: 98">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-08: 99">99</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-09: 98">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-10: 97">97</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-11: 98">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-12: 98">98</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-13: 97">97</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-14: 97">97</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-15: 96">96</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-16: 97">97</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-17: 96">96</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-18: 96">96</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-19: 95">95</div>
                {" "}
                <div className="h-7 rounded bg-[#15803D] text-[10px] text-white flex items-center justify-center font-telemetry-sm" title="M-20: 95">95</div>
              </div>
            </div>
          </div>
        </div>
        {" "}
        {/* Heatmap Diagnostic Summary Callout */}
        {" "}
        <div className="mt-space-md p-space-sm bg-surface-container/40 border border-outline-variant/60 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#EA580C]" data-icon="warning">warning</span>
            {" "}
            <span className="text-body-sm font-body-sm text-on-surface">
              <strong className="font-semibold text-on-surface">Automated Anomaly Correlation:</strong>
              {" "}UAV-07 shows steady degradation localized solely to the{" "}
              <strong>Cooling Subsystem</strong>
              {" "}across M-17 through M-20. Electrical and Injection subsystems remain at &gt;95% operational baseline.
            </span>
          </div>
          {" "}
          <button className="px-2.5 py-1 bg-surface-container-lowest text-primary border border-outline-variant rounded text-telemetry-sm font-semibold hover:bg-surface-container transition-colors shrink-0" type="button">Open Cooling Diagnostics</button>
        </div>
      </section>
    </main>
  );
}
