/* Auto-converted from Stitch export 3_diagnostics.html — reference skeleton. */
export default function DiagnosticsRaw() {
  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* KPI STRIP */}
      {" "}
      <section className="bg-surface-container-lowest border-b border-outline-variant px-margin py-3 shrink-0 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" data-icon="troubleshoot">troubleshoot</span>
          {" "}
          <h1 className="text-headline-sm font-headline-sm text-on-surface">Propulsion Prognostics & Diagnostics Engine</h1>
          {" "}
          <span className="px-2 py-0.5 rounded text-telemetry-sm font-telemetry-sm bg-surface-container text-on-surface-variant ml-2">UAV ENGINE BAY #1</span>
        </div>
        {" "}
        {/* Metric Badges Strip */}
        {" "}
        <div className="flex items-center gap-3">
          {/* Active Faults */}
          {" "}
          <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-lg">
            <span className="text-label-caps font-label-caps text-on-surface-variant">Active faults:</span>
            {" "}
            <span className="rounded-full h-[22px] px-2 text-telemetry-sm font-telemetry-sm inline-flex items-center gap-1.5 bg-[#FEF3C7] text-[#B45309] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              1
            </span>
          </div>
          {" "}
          {/* Predicted Faults */}
          {" "}
          <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-lg">
            <span className="text-label-caps font-label-caps text-on-surface-variant">Predicted faults:</span>
            {" "}
            <span className="rounded-full h-[22px] px-2 text-telemetry-sm font-telemetry-sm inline-flex items-center gap-1.5 bg-surface-container-highest text-primary font-bold">
              <span className="w-2 h-2 rounded-full bg-primary" />
              2
            </span>
          </div>
          {" "}
          {/* RUL */}
          {" "}
          <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-lg">
            <span className="text-label-caps font-label-caps text-on-surface-variant">RUL:</span>
            {" "}
            <span className="text-telemetry-md font-telemetry-md font-bold text-on-surface">
              412 hrs{" "}
              <span className="text-on-surface-variant text-telemetry-sm font-normal">(±38 hrs)</span>
            </span>
          </div>
          {" "}
          {/* Mission Risk */}
          {" "}
          <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-lg">
            <span className="text-label-caps font-label-caps text-on-surface-variant">Mission risk:</span>
            {" "}
            <span className="rounded-full h-[22px] px-2 text-telemetry-sm font-telemetry-sm inline-flex items-center gap-1.5 bg-[#FEF3C7] text-[#B45309] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              CAUTION
            </span>
          </div>
        </div>
      </section>
      {" "}
      {/* Main Content Split (Left 65% / Right 35%) */}
      {" "}
      <div className="flex-1 overflow-y-auto custom-scroll p-margin">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter h-full">
          {/* Left/Center Column (approx 65% width = 8 cols out of 12) */}
          {" "}
          <div className="lg:col-span-8 flex flex-col gap-gutter">
            {/* 1. FAULTS TABLE CARD */}
            {" "}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]" data-icon="report_problem">report_problem</span>
                  {" "}
                  <h2 className="text-headline-sm font-headline-sm text-on-surface">Subsystem Anomaly & Inferred Fault Matrix</h2>
                </div>
                {" "}
                <div className="flex items-center gap-2">
                  <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">Auto-Refresh 1000ms</span>
                  {" "}
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                </div>
              </div>
              {" "}
              {/* Table container */}
              {" "}
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="h-8 bg-[#F8FAFC] border-b border-[#CBD5E1] text-label-caps font-label-caps text-[#475569]">
                      <th className="px-3">Fault</th>
                      <th className="px-3">Subsystem</th>
                      <th className="px-3 w-40">Confidence</th>
                      <th className="px-3">Severity</th>
                      <th className="px-3">First Detected</th>
                      <th className="px-3">Trend</th>
                      <th className="px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] font-body-md text-body-md">
                    {/* Row 1: Cooling degradation */}
                    <tr className="h-10 hover:bg-[#EEF4FF] transition-colors duration-100 bg-[#FFFFFF]">
                      <td className="px-3 font-semibold text-on-surface flex items-center gap-2 pt-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
                        {" "}Cooling degradation
                      </td>
                      <td className="px-3 text-on-surface-variant">Cooling</td>
                      <td className="px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-surface-container h-2 rounded-full overflow-hidden">
                            <div className="bg-[#F59E0B] h-full rounded-full" style={{width: '87%'}} />
                          </div>
                          {" "}
                          <span className="text-telemetry-sm font-telemetry-sm font-bold text-on-surface">87%</span>
                        </div>
                      </td>
                      <td className="px-3">
                        <span className="rounded-full h-[22px] px-2 text-telemetry-sm font-telemetry-sm inline-flex items-center gap-1.5 bg-[#FEF3C7] text-[#B45309] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                          WATCH
                        </span>
                      </td>
                      <td className="px-3 text-telemetry-sm font-telemetry-sm text-on-surface-variant">T-02:10:44</td>
                      <td className="px-3 text-telemetry-sm font-telemetry-sm text-[#C2410C] font-semibold">Increasing (+0.42/hr)</td>
                      <td className="px-3 text-right">
                        <button className="px-2 py-1 rounded text-primary hover:bg-surface-container font-headline-sm text-xs inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]" data-icon="search">search</span>
                          Isolate
                        </button>
                      </td>
                    </tr>
                    {/* Row 2: Injector abnormality Cyl 2 */}
                    <tr className="h-10 hover:bg-[#EEF4FF] transition-colors duration-100 bg-[#F8FAFC]">
                      <td className="px-3 font-semibold text-on-surface flex items-center gap-2 pt-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {" "}Injector abnormality Cyl 2
                      </td>
                      <td className="px-3 text-on-surface-variant">Fuel/Injection</td>
                      <td className="px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-surface-container h-2 rounded-full overflow-hidden">
                            <div className="bg-primary h-full rounded-full" style={{width: '41%'}} />
                          </div>
                          {" "}
                          <span className="text-telemetry-sm font-telemetry-sm font-bold text-on-surface">41%</span>
                        </div>
                      </td>
                      <td className="px-3">
                        <span className="rounded-full h-[22px] px-2 text-telemetry-sm font-telemetry-sm inline-flex items-center gap-1.5 bg-surface-container-highest text-primary font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          PREDICTED
                        </span>
                      </td>
                      <td className="px-3 text-telemetry-sm font-telemetry-sm text-on-surface-variant">T-00:45:12</td>
                      <td className="px-3 text-telemetry-sm font-telemetry-sm text-on-surface-variant">Stable</td>
                      <td className="px-3 text-right">
                        <button className="px-2 py-1 rounded text-primary hover:bg-surface-container font-headline-sm text-xs inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]" data-icon="tune">tune</span>
                          Trim
                        </button>
                      </td>
                    </tr>
                    {/* Row 3: Sensor drift EGT-4 */}
                    <tr className="h-10 hover:bg-[#EEF4FF] transition-colors duration-100 bg-[#FFFFFF]">
                      <td className="px-3 font-semibold text-on-surface flex items-center gap-2 pt-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                        {" "}Sensor drift EGT-4
                      </td>
                      <td className="px-3 text-on-surface-variant">Sensors</td>
                      <td className="px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-surface-container h-2 rounded-full overflow-hidden">
                            <div className="bg-secondary h-full rounded-full" style={{width: '12%'}} />
                          </div>
                          {" "}
                          <span className="text-telemetry-sm font-telemetry-sm font-bold text-on-surface">12%</span>
                        </div>
                      </td>
                      <td className="px-3">
                        <span className="rounded-full h-[22px] px-2 text-telemetry-sm font-telemetry-sm inline-flex items-center gap-1.5 bg-[#DCFCE7] text-[#15803D] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                          LOW/MONITOR
                        </span>
                      </td>
                      <td className="px-3 text-telemetry-sm font-telemetry-sm text-on-surface-variant">T-05:18:00</td>
                      <td className="px-3 text-telemetry-sm font-telemetry-sm text-on-surface-variant">Intermittent</td>
                      <td className="px-3 text-right">
                        <button className="px-2 py-1 rounded text-on-surface-variant hover:bg-surface-container font-headline-sm text-xs inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]" data-icon="visibility">visibility</span>
                          Log
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            {" "}
            {/* 2. EXPLAINABLE AI ATTRIBUTION PANEL */}
            {" "}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]" data-icon="psychology">psychology</span>
                  {" "}
                  <h2 className="text-headline-sm font-headline-sm text-on-surface">Why the AI thinks so (Explainable AI Attribution)</h2>
                </div>
                {" "}
                <span className="px-2 py-0.5 rounded text-telemetry-sm font-telemetry-sm bg-surface-container-high text-primary font-bold">SHAPLEY RESIDUAL MATRIX</span>
              </div>
              {" "}
              {/* Plain English Explanation Box */}
              {" "}
              <div className="mt-3 p-3 bg-surface-container-low border-l-4 border-[#F59E0B] rounded-r-lg">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[#B45309] shrink-0 mt-0.5" data-icon="info">info</span>
                  {" "}
                  <p className="font-body-md text-body-md text-on-surface leading-relaxed">Digital Twin thermal dissipation model indicates radiator airflow obstruction or coolant flow restriction. CHT Cyl 3 divergence (+7.0 °C) without commensurate EGT spike rules out lean fuel mixture.</p>
                </div>
              </div>
              {" "}
              {/* Horizontal Attribution / Shapley value chart */}
              {" "}
              <div className="mt-4 space-y-3">
                <div className="text-label-caps font-label-caps text-on-surface-variant">PARAMETER SHAPLEY IMPORTANCE VECTOR</div>
                {" "}
                {/* CHT residual trend */}
                {" "}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-body-sm font-body-sm">
                    <span className="font-medium text-on-surface">CHT residual trend</span>
                    {" "}
                    <span className="text-telemetry-sm font-telemetry-sm font-bold text-[#B45309]">+0.42 (High impact)</span>
                  </div>
                  {" "}
                  <div className="h-3 w-full bg-surface-container rounded-sm overflow-hidden flex">
                    <div className="w-1/2 flex justify-end" />
                    {" "}
                    <div className="w-1/2 bg-surface-container flex items-center">
                      <div className="h-full bg-[#F59E0B] rounded-r-sm transition-all duration-300" style={{width: '84%'}} />
                    </div>
                  </div>
                </div>
                {" "}
                {/* Coolant residual */}
                {" "}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-body-sm font-body-sm">
                    <span className="font-medium text-on-surface">Coolant residual</span>
                    {" "}
                    <span className="text-telemetry-sm font-telemetry-sm font-bold text-primary">+0.27 (Moderate impact)</span>
                  </div>
                  {" "}
                  <div className="h-3 w-full bg-surface-container rounded-sm overflow-hidden flex">
                    <div className="w-1/2 flex justify-end" />
                    {" "}
                    <div className="w-1/2 bg-surface-container flex items-center">
                      <div className="h-full bg-primary rounded-r-sm transition-all duration-300" style={{width: '54%'}} />
                    </div>
                  </div>
                </div>
                {" "}
                {/* Oil temp residual */}
                {" "}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-body-sm font-body-sm">
                    <span className="font-medium text-on-surface">Oil temp residual</span>
                    {" "}
                    <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">+0.14 (Moderate impact)</span>
                  </div>
                  {" "}
                  <div className="h-3 w-full bg-surface-container rounded-sm overflow-hidden flex">
                    <div className="w-1/2 flex justify-end" />
                    {" "}
                    <div className="w-1/2 bg-surface-container flex items-center">
                      <div className="h-full bg-surface-dim rounded-r-sm transition-all duration-300" style={{width: '28%'}} />
                    </div>
                  </div>
                </div>
                {" "}
                {/* Airspeed context */}
                {" "}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-body-sm font-body-sm">
                    <span className="font-medium text-on-surface">Airspeed context</span>
                    {" "}
                    <span className="text-telemetry-sm font-telemetry-sm text-secondary font-medium">-0.05 (Negative/dampening impact)</span>
                  </div>
                  {" "}
                  <div className="h-3 w-full bg-surface-container rounded-sm overflow-hidden flex">
                    <div className="w-1/2 flex justify-end items-center">
                      <div className="h-full bg-secondary rounded-l-sm transition-all duration-300" style={{width: '10%'}} />
                    </div>
                    {" "}
                    <div className="w-1/2" />
                  </div>
                </div>
                {" "}
                <div className="flex justify-between text-telemetry-sm font-telemetry-sm text-on-surface-variant pt-1 border-t border-surface-container">
                  <span>-0.50 (Dampening)</span>
                  {" "}
                  <span>0.00 (Neutral)</span>
                  {" "}
                  <span>+0.50 (Driving Anomaly)</span>
                </div>
              </div>
            </div>
            {" "}
            {/* 3. RUL PROJECTION CHART */}
            {" "}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]" data-icon="timeline">timeline</span>
                  {" "}
                  <h2 className="text-headline-sm font-headline-sm text-on-surface">Remaining Useful Life (RUL) Prognostics Curve</h2>
                </div>
                {" "}
                <div className="flex items-center gap-3 text-telemetry-sm font-telemetry-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-1 bg-primary" />
                    Mean Prediction
                  </span>
                  {" "}
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-1.5 bg-primary/20 border border-primary/40" />
                    90% Confidence Interval
                  </span>
                  {" "}
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 bg-error" />
                    Threshold
                  </span>
                </div>
              </div>
              {" "}
              {/* SVG RUL Chart */}
              {" "}
              <div className="relative w-full h-56 mt-3" style={{height: '160px'}}>
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 650 200">
                  <defs>
                    {/* Confidence Envelope Gradient */}
                    {" "}
                    <linearGradient id="rulEnvelope" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#1E5EFF" stopOpacity="0.22" />
                      {" "}
                      <stop offset="100%" stopColor="#1E5EFF" stopOpacity="0.04" />
                    </linearGradient>
                  </defs>
                  {" "}
                  {/* Grid lines */}
                  {" "}
                  <line stroke="#E3E8EF" strokeDasharray="3 3" x1="50" x2="630" y1="20" y2="20" />
                  {" "}
                  <line stroke="#E3E8EF" strokeDasharray="3 3" x1="50" x2="630" y1="65" y2="65" />
                  {" "}
                  <line stroke="#E3E8EF" strokeDasharray="3 3" x1="50" x2="630" y1="110" y2="110" />
                  {" "}
                  <line stroke="#E3E8EF" strokeDasharray="3 3" x1="50" x2="630" y1="155" y2="155" />
                  {" "}
                  {/* Y-Axis Labels (Health Index: 0 to 100) */}
                  {" "}
                  <text className="fill-[#737688] font-telemetry-sm text-[10px]" textAnchor="end" x="42" y="24">100</text>
                  {" "}
                  <text className="fill-[#737688] font-telemetry-sm text-[10px]" textAnchor="end" x="42" y="69">85</text>
                  {" "}
                  <text className="fill-[#737688] font-telemetry-sm text-[10px]" textAnchor="end" x="42" y="114">70</text>
                  {" "}
                  <text className="fill-[#737688] font-telemetry-sm text-[10px]" textAnchor="end" x="42" y="159">55</text>
                  {" "}
                  {/* Maintenance Threshold Line (at 70 = y: 110) */}
                  {" "}
                  <line stroke="#DC2626" strokeDasharray="4 2" strokeWidth="1.5" x1="50" x2="630" y1="110" y2="110" />
                  {" "}
                  <text className="fill-error font-telemetry-sm text-[10px] font-bold" x="635" y="113">Limit: 70</text>
                  {" "}
                  {/* Historical Curve (200h to 440h: 50px to 330px) */}
                  {" "}
                  {/* Health degrades from 96 (y=28) to 84 (y=72) */}
                  {" "}
                  <path d="M 50 28 Q 180 35 330 72" fill="none" stroke="#0047d3" strokeWidth="2.5" />
                  {" "}
                  {/* Current Operating Point (T = 440 hrs, Health = 84) */}
                  {" "}
                  <line stroke="#434656" strokeDasharray="2 2" strokeWidth="1" x1="330" x2="330" y1="15" y2="175" />
                  {" "}
                  <circle className="fill-primary stroke-surface stroke-2" cx="330" cy="72" r="4.5" />
                  {" "}
                  {/* 90% Confidence Envelope (Projected: 440h to 600h: 330px to 610px) */}
                  {" "}
                  <polygon fill="url(#rulEnvelope)" points="330,72 450,96 550,126 610,158 610,132 550,104 450,82" />
                  {" "}
                  {/* Projected Degradation Mean Curve */}
                  {" "}
                  <path d="M 330 72 Q 470 100 610 145" fill="none" stroke="#0047d3" strokeDasharray="4 3" strokeWidth="2" />
                  {" "}
                  {/* Threshold Intersection Point ~ Engine Hours: 520h */}
                  {" "}
                  <circle className="fill-[#DC2626]" cx="495" cy="110" r="4" />
                  {" "}
                  {/* X-Axis (200h to 600h) */}
                  {" "}
                  <line stroke="#CBD5E1" strokeWidth="1" x1="50" x2="630" y1="175" y2="175" />
                  {" "}
                  <text className="fill-[#737688] font-telemetry-sm text-[10px]" textAnchor="middle" x="50" y="190">200h</text>
                  {" "}
                  <text className="fill-[#737688] font-telemetry-sm text-[10px]" textAnchor="middle" x="190" y="190">300h</text>
                  {" "}
                  <text className="fill-primary font-telemetry-sm text-[10px] font-bold" textAnchor="middle" x="330" y="190">440h (NOW)</text>
                  {" "}
                  <text className="fill-[#737688] font-telemetry-sm text-[10px]" textAnchor="middle" x="470" y="190">500h</text>
                  {" "}
                  <text className="fill-[#737688] font-telemetry-sm text-[10px]" textAnchor="middle" x="610" y="190">600h</text>
                </svg>
              </div>
              {" "}
              {/* RUL Callout Strip */}
              {" "}
              <div className="mt-2 p-2.5 bg-surface-container-low border border-outline-variant rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]" data-icon="hourglass_bottom">hourglass_bottom</span>
                  {" "}
                  <span className="text-body-md font-body-md font-semibold text-on-surface">Prognostic Horizon:</span>
                  {" "}
                  <span className="text-on-surface-variant text-body-md font-body-md">412 hrs (374–450 hrs) to maintenance threshold at current cruise power regime</span>
                </div>
                {" "}
                <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant font-bold">Confidence: 90%</span>
              </div>
            </div>
          </div>
          {" "}
          {/* Right Column (approx 35% width = 4 cols out of 12) */}
          {" "}
          <div className="lg:col-span-4 flex flex-col gap-gutter">
            {/* 4. MAINTENANCE ADVISORY CHECKLIST CARD */}
            {" "}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]" data-icon="checklist">checklist</span>
                  {" "}
                  <h2 className="text-headline-sm font-headline-sm text-on-surface">Maintenance Advisory</h2>
                </div>
                {" "}
                <span className="text-telemetry-sm font-telemetry-sm text-[#B45309] font-bold">3 Actions Pending</span>
              </div>
              {" "}
              {/* Checklist Items */}
              {" "}
              <div className="mt-3 space-y-3 flex-1">
                {/* Action 1 */}
                {" "}
                <div className="p-3 bg-surface border border-outline-variant rounded-lg space-y-1.5 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-headline-sm font-headline-sm text-on-surface text-sm">Radiator & Duct Baffles Inspection</span>
                    {" "}
                    <span className="rounded-full h-[20px] px-2 text-telemetry-sm font-telemetry-sm inline-flex items-center gap-1 bg-[#FEF3C7] text-[#B45309] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                      High Priority
                    </span>
                  </div>
                  {" "}
                  <p className="text-body-sm font-body-sm text-on-surface-variant">Inspect heat exchanger intake mesh for foreign debris or deformation.</p>
                  {" "}
                  <div className="text-telemetry-sm font-telemetry-sm text-primary flex items-center gap-1 pt-1">
                    <span className="material-symbols-outlined text-[14px]" data-icon="pin_drop">pin_drop</span>
                    {" "}ATA 75-20 / Rad Core Port
                  </div>
                </div>
                {" "}
                {/* Action 2 */}
                {" "}
                <div className="p-3 bg-surface border border-outline-variant rounded-lg space-y-1.5 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-headline-sm font-headline-sm text-on-surface text-sm">Coolant Circuit & Pump Pressure</span>
                    {" "}
                    <span className="rounded-full h-[20px] px-2 text-telemetry-sm font-telemetry-sm inline-flex items-center gap-1 bg-[#FEF3C7] text-[#B45309] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                      High Priority
                    </span>
                  </div>
                  {" "}
                  <p className="text-body-sm font-body-sm text-on-surface-variant">Check 50/50 water-glycol reserve tank level and check expansion line.</p>
                  {" "}
                  <div className="text-telemetry-sm font-telemetry-sm text-primary flex items-center gap-1 pt-1">
                    <span className="material-symbols-outlined text-[14px]" data-icon="pin_drop">pin_drop</span>
                    {" "}ATA 75-10 / Expansion Tank
                  </div>
                </div>
                {" "}
                {/* Action 3 */}
                {" "}
                <div className="p-3 bg-surface border border-outline-variant rounded-lg space-y-1.5 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-headline-sm font-headline-sm text-on-surface text-sm">CHT Cylinder 3 Sensor Calibration</span>
                    {" "}
                    <span className="rounded-full h-[20px] px-2 text-telemetry-sm font-telemetry-sm inline-flex items-center gap-1 bg-surface-container text-on-surface-variant font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-outline" />
                      Low Priority
                    </span>
                  </div>
                  {" "}
                  <p className="text-body-sm font-body-sm text-on-surface-variant">Cross-reference thermocouple loop impedance.</p>
                  {" "}
                  <div className="text-telemetry-sm font-telemetry-sm text-primary flex items-center gap-1 pt-1">
                    <span className="material-symbols-outlined text-[14px]" data-icon="pin_drop">pin_drop</span>
                    {" "}ATA 77-22 / Cyl 3 Thermocouple
                  </div>
                </div>
              </div>
              {" "}
              {/* Action Buttons */}
              {" "}
              <div className="mt-4 pt-3 border-t border-outline-variant flex items-center gap-2">
                <button className="flex-1 h-[36px] bg-primary text-on-primary rounded text-headline-sm font-headline-sm flex items-center justify-center gap-1.5 hover:bg-[#1748D1] active:bg-[#143DAF] transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-[18px]" data-icon="assignment_add">assignment_add</span>
                  {" "}Create Work Order
                </button>
                {" "}
                <button className="h-[36px] px-3 bg-surface-container-lowest border border-outline-variant text-on-surface rounded text-headline-sm font-headline-sm hover:bg-surface-container hover:border-outline transition-colors">Mark Reviewed</button>
              </div>
            </div>
            {" "}
            {/* 5. SENSOR CORRELATION & DIAGNOSTIC CONTEXT TILE */}
            {" "}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)] flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]" data-icon="hub">hub</span>
                    {" "}
                    <h2 className="text-headline-sm font-headline-sm text-on-surface">Sensor Correlation & Context</h2>
                  </div>
                  {" "}
                  <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">MIL-STD-1553 Bus</span>
                </div>
                {" "}
                {/* Bus Telemetry Parameters Quick Grid */}
                {" "}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="p-2 bg-surface-container-low rounded border border-outline-variant">
                    <div className="text-label-caps font-label-caps text-on-surface-variant">CHT 3 DELTA</div>
                    {" "}
                    <div className="text-telemetry-md font-telemetry-md font-bold text-[#C2410C] mt-0.5">
                      +7.0 °C{" "}
                      <span className="text-body-sm font-normal text-on-surface-variant">div</span>
                    </div>
                  </div>
                  {" "}
                  <div className="p-2 bg-surface-container-low rounded border border-outline-variant">
                    <div className="text-label-caps font-label-caps text-on-surface-variant">COOLANT PRESS</div>
                    {" "}
                    <div className="text-telemetry-md font-telemetry-md font-bold text-on-surface mt-0.5">
                      1.42 bar{" "}
                      <span className="text-body-sm font-normal text-on-surface-variant">(-0.18)</span>
                    </div>
                  </div>
                  {" "}
                  <div className="p-2 bg-surface-container-low rounded border border-outline-variant">
                    <div className="text-label-caps font-label-caps text-on-surface-variant">OIL TEMP (RT)</div>
                    {" "}
                    <div className="text-telemetry-md font-telemetry-md font-bold text-on-surface mt-0.5">
                      94.8 °C{" "}
                      <span className="text-body-sm font-normal text-secondary font-bold">NORM</span>
                    </div>
                  </div>
                  {" "}
                  <div className="p-2 bg-surface-container-low rounded border border-outline-variant">
                    <div className="text-label-caps font-label-caps text-on-surface-variant">MAP BOOST</div>
                    {" "}
                    <div className="text-telemetry-md font-telemetry-md font-bold text-on-surface mt-0.5">
                      38.4 inHg{" "}
                      <span className="text-body-sm font-normal text-secondary font-bold">100%</span>
                    </div>
                  </div>
                </div>
                {" "}
                {/* Diagnostic History Log Feed */}
                {" "}
                <div className="mt-3">
                  <div className="text-label-caps font-label-caps text-on-surface-variant mb-1.5">RECENT DIAGNOSTIC EVENT LOG</div>
                  {" "}
                  <div className="space-y-1.5 text-telemetry-sm font-telemetry-sm">
                    <div className="flex items-center justify-between p-1.5 bg-surface rounded text-on-surface-variant border-l-2 border-[#F59E0B]">
                      <span>06:40:12 UTC</span>
                      {" "}
                      <span className="text-on-surface font-medium truncate ml-2">CHT 3 exceedance threshold flag</span>
                    </div>
                    {" "}
                    <div className="flex items-center justify-between p-1.5 bg-surface rounded text-on-surface-variant border-l-2 border-primary">
                      <span>06:38:05 UTC</span>
                      {" "}
                      <span className="text-on-surface font-medium truncate ml-2">Digital Twin Kalman filter converged</span>
                    </div>
                    {" "}
                    <div className="flex items-center justify-between p-1.5 bg-surface rounded text-on-surface-variant border-l-2 border-outline-variant">
                      <span>06:31:50 UTC</span>
                      {" "}
                      <span className="text-on-surface font-medium truncate ml-2">Full engine bus telemetry re-calibrated</span>
                    </div>
                  </div>
                </div>
              </div>
              {" "}
              {/* Context Link Indicator */}
              {" "}
              <div className="mt-4 pt-2.5 border-t border-outline-variant flex items-center justify-between text-telemetry-sm font-telemetry-sm text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  Dual-redundant RT-12 / RT-14
                </span>
                {" "}
                <span className="font-bold text-primary cursor-pointer hover:underline">View Raw Trace</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
