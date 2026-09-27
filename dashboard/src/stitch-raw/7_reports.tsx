/* Auto-converted from Stitch export 7_reports.html — reference skeleton. */
export default function ReportsRaw() {
  return (
    <main className="flex-1 flex overflow-hidden">
      {/* ==================== LEFT COLUMN: REPORTS MANAGEMENT (~38%) ==================== */}
      {" "}
      <section className="w-[38%] border-r border-outline-variant flex flex-col bg-surface-bright h-full overflow-hidden shrink-0">
        {/* Left Column Header */}
        {" "}
        <div className="p-space-lg border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <div>
            <h2 className="text-headline-sm font-headline-sm text-on-surface tracking-tight">Airworthiness & Mission Reports</h2>
            {" "}
            <p className="font-body-sm text-body-sm text-on-surface-variant">Archived digital twin telemetry and STANAG debriefs</p>
          </div>
          {" "}
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded text-body-sm font-medium hover:bg-[#1748D1] active:bg-[#143DAF] transition-colors shadow-xs" id="open-gen-modal">
            <span className="material-symbols-outlined text-[16px]" data-icon="add">add</span>
            {" "}
            <span>Generate New Report</span>
          </button>
        </div>
        {" "}
        {/* Filter Chips Container */}
        {" "}
        <div className="px-space-lg py-space-sm border-b border-outline-variant bg-surface flex items-center gap-1.5 overflow-x-auto text-nowrap">
          <button className="px-2.5 py-1 rounded-full text-telemetry-sm font-telemetry-sm bg-primary text-on-primary font-semibold">All (28)</button>
          {" "}
          <button className="px-2.5 py-1 rounded-full text-telemetry-sm font-telemetry-sm bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-medium">Post-Mission</button>
          {" "}
          <button className="px-2.5 py-1 rounded-full text-telemetry-sm font-telemetry-sm bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-medium">Scheduled Maintenance</button>
          {" "}
          <button className="px-2.5 py-1 rounded-full text-telemetry-sm font-telemetry-sm bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-medium">Anomaly Investigation</button>
          {" "}
          <button className="px-2.5 py-1 rounded-full text-telemetry-sm font-telemetry-sm bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-medium">Airworthiness Cert</button>
        </div>
        {" "}
        {/* Scrollable List of Reports */}
        {" "}
        <div className="flex-1 overflow-y-auto divide-y divide-outline-variant">
          {/* Report 1: SELECTED */}
          {" "}
          <article className="p-space-lg bg-surface-container-high border-l-4 border-primary cursor-pointer hover:bg-surface-container-highest transition-colors">
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-telemetry-md text-telemetry-md font-bold text-primary">REP-2024-084</span>
                {" "}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-telemetry-sm font-telemetry-sm bg-[#FEF3C7] text-[#B45309] font-semibold border border-[#FDE68A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  {" "}PENDING REVIEW
                </span>
              </div>
              {" "}
              <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant font-medium">Today, 14:22</span>
            </div>
            {" "}
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">UAV-07 Mission ISR-18H Anomaly Debrief</h3>
            {" "}
            <div className="flex items-center gap-space-lg font-telemetry-sm text-telemetry-sm text-on-surface-variant">
              <div className="flex items-center gap-1">
                <span className="text-outline">Health Index:</span>
                {" "}
                <span className="font-bold text-[#B45309]">87/100</span>
              </div>
              {" "}
              <div className="flex items-center gap-1">
                <span className="text-outline">Engine:</span>
                {" "}
                <span>Rotax 914 F3</span>
              </div>
              {" "}
              <div className="flex items-center gap-1 text-primary">
                <span className="material-symbols-outlined text-[14px]" data-icon="task_alt">task_alt</span>
                {" "}
                <span>STANAG-4671</span>
              </div>
            </div>
          </article>
          {" "}
          {/* Report 2 */}
          {" "}
          <article className="p-space-lg bg-surface-container-lowest hover:bg-[#EEF4FF] cursor-pointer transition-colors">
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-telemetry-md text-telemetry-md font-bold text-on-surface">REP-2024-081</span>
                {" "}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-telemetry-sm font-telemetry-sm bg-[#DCFCE7] text-[#15803D] font-semibold border border-[#BBF7D0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                  {" "}APPROVED
                </span>
              </div>
              {" "}
              <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">2 days ago</span>
            </div>
            {" "}
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">UAV-03 100-Hr Inspection Report</h3>
            {" "}
            <div className="flex items-center gap-space-lg font-telemetry-sm text-telemetry-sm text-on-surface-variant">
              <div className="flex items-center gap-1">
                <span className="text-outline">Health Index:</span>
                {" "}
                <span className="font-bold text-[#15803D]">94/100</span>
              </div>
              {" "}
              <div className="flex items-center gap-1">
                <span className="text-outline">Scope:</span>
                {" "}
                <span>Full Drivetrain</span>
              </div>
            </div>
          </article>
          {" "}
          {/* Report 3 */}
          {" "}
          <article className="p-space-lg bg-surface-container-lowest hover:bg-[#EEF4FF] cursor-pointer transition-colors">
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-telemetry-md text-telemetry-md font-bold text-on-surface">REP-2024-079</span>
                {" "}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-telemetry-sm font-telemetry-sm bg-surface-container text-on-surface-variant font-semibold">ARCHIVED</span>
              </div>
              {" "}
              <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">Last week</span>
            </div>
            {" "}
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Fleet Rotax 914 Turbocharger Wear Analysis</h3>
            {" "}
            <div className="flex items-center gap-space-lg font-telemetry-sm text-telemetry-sm text-on-surface-variant">
              <div className="flex items-center gap-1">
                <span className="text-outline">Scope:</span>
                {" "}
                <span>Fleet-Wide (12 Units)</span>
              </div>
              {" "}
              <div className="flex items-center gap-1">
                <span className="text-outline">Confidence:</span>
                {" "}
                <span className="font-bold text-on-surface">99.4%</span>
              </div>
            </div>
          </article>
          {" "}
          {/* Report 4 */}
          {" "}
          <article className="p-space-lg bg-surface-container-lowest hover:bg-[#EEF4FF] cursor-pointer transition-colors">
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-telemetry-md text-telemetry-md font-bold text-on-surface">REP-2024-075</span>
                {" "}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-telemetry-sm font-telemetry-sm bg-[#FFEDD5] text-[#C2410C] font-semibold border border-[#FED7AA]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
                  {" "}WORK ORDER ISSUED
                </span>
              </div>
              {" "}
              <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">2 weeks ago</span>
            </div>
            {" "}
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">UAV-02 Scheduled Top Overhaul Recommendation</h3>
            {" "}
            <div className="flex items-center gap-space-lg font-telemetry-sm text-telemetry-sm text-on-surface-variant">
              <div className="flex items-center gap-1">
                <span className="text-outline">Health Index:</span>
                {" "}
                <span className="font-bold text-[#EA580C]">73/100</span>
              </div>
              {" "}
              <div className="flex items-center gap-1">
                <span className="text-outline">Hours:</span>
                {" "}
                <span>498.5 hrs</span>
              </div>
            </div>
          </article>
        </div>
        {" "}
        {/* Embedded Quick Generation Config Panel */}
        {" "}
        <div className="p-space-lg border-t border-outline-variant bg-surface-container-low shrink-0">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-caps text-label-caps text-on-surface font-bold uppercase">Quick Report Parameter Setup</span>
            {" "}
            <span className="text-telemetry-sm font-telemetry-sm text-primary">STANAG 4671 Ed.3</span>
          </div>
          {" "}
          <div className="grid grid-cols-2 gap-space-sm mb-space-sm">
            <div>
              <label className="block font-label-caps text-[10px] text-outline mb-1">TARGET MISSION</label>
              {" "}
              <select className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary">
                <option>ISR-18H (Current Flight)</option>
                <option>ISR-17B Patrol 14-OCT</option>
                <option>REC-04 Alpine Sweep</option>
              </select>
            </div>
            {" "}
            <div>
              <label className="block font-label-caps text-[10px] text-outline mb-1">EXPORT COMPLIANCE</label>
              {" "}
              <select className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary">
                <option>STANAG 4671 PDF</option>
                <option>HDF5 Raw Sensor Dump</option>
                <option>MIL-STD-1553B JSON</option>
              </select>
            </div>
          </div>
          {" "}
          <div className="mb-space-sm">
            <label className="block font-label-caps text-[10px] text-outline mb-1">INCLUDE SUBSYSTEM ATTRIBUTION</label>
            {" "}
            <div className="grid grid-cols-4 gap-1">
              <label className="flex items-center gap-1 text-[11px] font-body-sm bg-surface-container-lowest border border-outline-variant px-1.5 py-1 rounded cursor-pointer">
                <input defaultChecked className="rounded text-primary focus:ring-0 w-3 h-3" type="checkbox" />
                {" "}
                <span>Combust</span>
              </label>
              {" "}
              <label className="flex items-center gap-1 text-[11px] font-body-sm bg-surface-container-lowest border border-outline-variant px-1.5 py-1 rounded cursor-pointer">
                <input defaultChecked className="rounded text-primary focus:ring-0 w-3 h-3" type="checkbox" />
                {" "}
                <span>Cooling</span>
              </label>
              {" "}
              <label className="flex items-center gap-1 text-[11px] font-body-sm bg-surface-container-lowest border border-outline-variant px-1.5 py-1 rounded cursor-pointer">
                <input defaultChecked className="rounded text-primary focus:ring-0 w-3 h-3" type="checkbox" />
                {" "}
                <span>Oil Sys</span>
              </label>
              {" "}
              <label className="flex items-center gap-1 text-[11px] font-body-sm bg-surface-container-lowest border border-outline-variant px-1.5 py-1 rounded cursor-pointer">
                <input defaultChecked className="rounded text-primary focus:ring-0 w-3 h-3" type="checkbox" />
                {" "}
                <span>Electr</span>
              </label>
            </div>
          </div>
          {" "}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-1.5 text-body-sm text-on-surface cursor-pointer select-none">
              <input defaultChecked className="rounded text-primary focus:ring-0 w-3.5 h-3.5" type="checkbox" />
              {" "}
              <span className="font-medium text-telemetry-sm">Include AI Shapley Value Attribution</span>
            </label>
            {" "}
            <button className="px-3 py-1 bg-surface-container-highest border border-outline-variant text-primary rounded font-telemetry-sm text-telemetry-sm font-semibold hover:bg-surface-variant transition-colors">Dispatch Job</button>
          </div>
        </div>
      </section>
      {" "}
      {/* ==================== RIGHT COLUMN: A4 TECHNICAL DOCUMENT PREVIEW (~62%) ==================== */}
      {" "}
      <section className="flex-1 flex flex-col bg-surface-container h-full overflow-hidden">
        {/* Document Action Bar */}
        {" "}
        <div className="h-12 bg-surface-container-lowest border-b border-outline-variant px-space-lg flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-telemetry-sm text-telemetry-sm font-bold text-on-surface">DOCUMENT PREVIEW:</span>
            {" "}
            <span className="font-telemetry-sm text-telemetry-sm text-outline">STANAG-4671-REP-UAV07-M84.pdf (Page 1 of 3)</span>
          </div>
          {" "}
          <div className="flex items-center gap-space-sm">
            <button className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-body-sm hover:bg-surface-container transition-colors shadow-xs">
              <span className="material-symbols-outlined text-[16px]" data-icon="file_download">file_download</span>
              {" "}
              <span className="font-telemetry-sm text-telemetry-sm">Download PDF (STANAG A4)</span>
            </button>
            {" "}
            <button className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-body-sm hover:bg-surface-container transition-colors shadow-xs">
              <span className="material-symbols-outlined text-[16px]" data-icon="data_object">data_object</span>
              {" "}
              <span className="font-telemetry-sm text-telemetry-sm">Export Raw CSV/HDF5</span>
            </button>
            {" "}
            <button className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary text-on-primary rounded font-body-sm hover:bg-[#1748D1] transition-colors shadow-xs">
              <span className="material-symbols-outlined text-[16px]" data-icon="send">send</span>
              {" "}
              <span className="font-telemetry-sm text-telemetry-sm font-semibold">Send to Flight-Line Alpha</span>
            </button>
          </div>
        </div>
        {" "}
        {/* Document Viewport Scroller (A4 Sheet Simulation) */}
        {" "}
        <div className="flex-1 overflow-y-auto p-space-xl flex justify-center watermark-pattern">
          {/* Authentic A4 Defense Engineering Sheet */}
          {" "}
          <div className="w-full max-w-[820px] bg-white border border-[#CBD5E1] rounded-sm p-10 shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)] text-[#0F172A] relative flex flex-col justify-between my-auto">
            {/* Top Watermark Classification Bar */}
            {" "}
            <div className="border-b-2 border-[#0F172A] pb-3 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#0047d3] text-white flex items-center justify-center font-bold text-xs rounded-sm">AT</div>
                  {" "}
                  <div>
                    <h1 className="text-headline-md font-headline-md font-bold tracking-tight text-[#0F172A] leading-tight">AeroTwin DEFENSE SYSTEMS</h1>
                    {" "}
                    <p className="font-label-caps text-[10px] text-[#475569] tracking-wider uppercase">PROPULSION DIGITAL TWIN AIRWORTHINESS ASSESSMENT</p>
                  </div>
                </div>
                {" "}
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] font-telemetry-sm text-[10px] font-bold tracking-wider">RESTRICTED // MIL-STD-882E</span>
                  {" "}
                  <p className="font-telemetry-sm text-[10px] text-[#64748B] mt-0.5">REF: STANAG-4671-REP-UAV07-M84</p>
                </div>
              </div>
              {" "}
              {/* Metadata Strip */}
              {" "}
              <div className="grid grid-cols-4 gap-2 bg-[#F8FAFC] border border-[#E2E8F0] p-2 font-telemetry-sm text-telemetry-sm text-[#334155] rounded-xs">
                <div>
                  <span className="text-[#64748B]">SERIAL:</span>
                  {" "}
                  <strong>UAV-07 (Rotax 914 F3)</strong>
                </div>
                {" "}
                <div>
                  <span className="text-[#64748B]">PROPULSION SN:</span>
                  {" "}
                  <strong>4471</strong>
                </div>
                {" "}
                <div>
                  <span className="text-[#64748B]">TOTAL FLIGHT HRS:</span>
                  {" "}
                  <strong>442.2 hrs</strong>
                </div>
                {" "}
                <div>
                  <span className="text-[#64748B]">DATE OF ISSUANCE:</span>
                  {" "}
                  <strong>24-OCT-2024</strong>
                </div>
              </div>
            </div>
            {" "}
            {/* Main Document Body */}
            {" "}
            <div className="space-y-6">
              {/* Section 1: Executive Summary & Telemetry KPIs */}
              {" "}
              <div>
                <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-1 mb-3">
                  <h2 className="font-headline-sm text-headline-sm font-bold tracking-tight uppercase text-[#0F172A] flex items-center gap-1.5">
                    <span className="text-[#0047d3]">1.0</span>
                    {" "}Executive Propulsion Assessment & In-Flight Telemetry
                  </h2>
                  {" "}
                  <span className="font-telemetry-sm text-[10px] text-[#64748B]">MISSION: ISR-18H ENDURANCE</span>
                </div>
                {" "}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {/* KPI 1 */}
                  {" "}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded">
                    <p className="font-label-caps text-[10px] text-[#64748B] font-semibold">ENGINE HEALTH INDEX (EHI)</p>
                    {" "}
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-telemetry-xl text-telemetry-xl font-bold text-[#B45309]">87</span>
                      {" "}
                      <span className="font-telemetry-sm text-telemetry-sm text-[#64748B]">/ 100</span>
                      {" "}
                      <span className="px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#B45309] text-[10px] font-bold font-telemetry-sm ml-auto">WATCH</span>
                    </div>
                    {" "}
                    <p className="font-telemetry-sm text-[10px] text-[#64748B] mt-1">-5.2 delta against baseline</p>
                  </div>
                  {" "}
                  {/* KPI 2 */}
                  {" "}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded">
                    <p className="font-label-caps text-[10px] text-[#64748B] font-semibold">REMAINING USEFUL LIFE (RUL)</p>
                    {" "}
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-telemetry-xl text-telemetry-xl font-bold text-[#0F172A]">412</span>
                      {" "}
                      <span className="font-telemetry-sm text-telemetry-sm text-[#64748B]">hours</span>
                      {" "}
                      <span className="text-telemetry-sm text-[11px] text-[#64748B] ml-auto">(±38 hrs)</span>
                    </div>
                    {" "}
                    <p className="font-telemetry-sm text-[10px] text-[#15803D] mt-1">Sufficient for planned sorties</p>
                  </div>
                  {" "}
                  {/* KPI 3 */}
                  {" "}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded">
                    <p className="font-label-caps text-[10px] text-[#64748B] font-semibold">FLIGHT ENVELOPE PROFILE</p>
                    {" "}
                    <div className="flex items-baseline gap-1 mt-1 font-telemetry-md text-telemetry-md font-bold text-[#0F172A]">
                      <span>5,200m ALT</span>
                      {" "}
                      <span className="text-[#64748B] font-normal">·</span>
                      {" "}
                      <span>-12°C OAT</span>
                    </div>
                    {" "}
                    <p className="font-telemetry-sm text-[10px] text-[#64748B] mt-1">Density altitude: 6,140m</p>
                  </div>
                </div>
                {" "}
                {/* Primary Finding Callout Box */}
                {" "}
                <div className="border-l-4 border-[#EA580C] bg-[#FFF7ED] p-3 rounded-r text-[#9A3412]">
                  <div className="flex items-center gap-1.5 font-bold font-telemetry-sm text-telemetry-sm">
                    <span className="material-symbols-outlined text-[16px]" data-icon="warning">warning</span>
                    {" "}
                    <span>PRIMARY ANOMALY IDENTIFIED: CYLINDER 3 THERMAL DISSIPATION RESIDUAL</span>
                  </div>
                  {" "}
                  <p className="font-body-sm text-body-sm text-[#7C2D12] mt-1 leading-relaxed">Digital twin thermodynamic surrogate detected an uncommanded +7.0 °C residual drift above expected Cylinder Head Temperature (CHT 3) at cruise RPM (4,950). Secondary manifold pressure remained nominal, isolating the vector to localized cooling duct airflow restriction or thermal transfer interface degradation.</p>
                </div>
              </div>
              {" "}
              {/* Section 2: Embedded Telemetry Chart & Shapley Attribution Grid */}
              {" "}
              <div>
                <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-1 mb-2">
                  <h2 className="font-headline-sm text-headline-sm font-bold tracking-tight uppercase text-[#0F172A] flex items-center gap-1.5">
                    <span className="text-[#0047d3]">2.0</span>
                    {" "}Digital Twin Telemetry Divergence & Feature Attribution
                  </h2>
                  {" "}
                  <span className="font-telemetry-sm text-[10px] text-[#64748B]">SAMPLING: 20 Hz SYNCHRONOUS</span>
                </div>
                {" "}
                <div className="grid grid-cols-12 gap-3">
                  {/* Synthetic Divergence Spark Graph (SVG/Canvas Simulation) */}
                  {" "}
                  <div className="col-span-7 bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-telemetry-sm text-[11px] font-bold text-[#0F172A]">CHT CYLINDER 3 vs. TWIN SIMULATION</span>
                      {" "}
                      <div className="flex items-center gap-3 font-telemetry-sm text-[10px]">
                        <span className="flex items-center gap-1 text-[#0047d3]">
                          <span className="w-3 h-0.5 bg-[#0047d3]" />
                          {" "}Measured Intake
                        </span>
                        {" "}
                        <span className="flex items-center gap-1 text-[#006a69]">
                          <span className="w-3 h-0.5 bg-[#006a69] border-t border-dashed" />
                          {" "}Twin Baseline
                        </span>
                      </div>
                    </div>
                    {" "}
                    {/* Custom Clean Vector Sparkline */}
                    {" "}
                    <div className="h-28 w-full relative flex items-end">
                      {/* Grid lines */}
                      {" "}
                      <div className="absolute inset-0 flex flex-col justify-between opacity-30 pointer-events-none">
                        <div className="w-full border-b border-[#94A3B8]" />
                        {" "}
                        <div className="w-full border-b border-[#94A3B8]" />
                        {" "}
                        <div className="w-full border-b border-[#94A3B8]" />
                      </div>
                      {" "}
                      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 100">
                        {/* Shaded Anomaly Region */}
                        {" "}
                        <polygon fill="#FEE2E2" opacity="0.6" points="240,65 280,50 320,40 360,35 400,30 400,75 360,76 320,77 280,78 240,78" />
                        {" "}
                        {/* Digital Twin Baseline (Teal) */}
                        {" "}
                        <path d="M0,80 Q100,78 200,79 T400,76" fill="none" stroke="#006a69" strokeDasharray="4,3" strokeWidth="2" />
                        {" "}
                        {/* Real-time Intake (Aviation Blue diverging into high temp) */}
                        {" "}
                        <path d="M0,80 Q100,78 200,79 C240,72 280,50 320,40 C360,35 380,32 400,30" fill="none" stroke="#0047d3" strokeWidth="2.5" />
                        {" "}
                        {/* Anomaly Flag Marker */}
                        {" "}
                        <circle cx="340" cy="37" fill="#DC2626" r="4" />
                      </svg>
                      {" "}
                      {/* Annotation badge */}
                      {" "}
                      <div className="absolute top-2 right-2 bg-white/95 border border-[#FCA5A5] px-1.5 py-0.5 rounded shadow-xs text-right">
                        <span className="font-telemetry-sm text-[9px] text-[#DC2626] font-bold">Δ +7.0 °C Divergence</span>
                      </div>
                    </div>
                    {" "}
                    <div className="flex justify-between font-telemetry-sm text-[9px] text-[#64748B] mt-1 pt-1 border-t border-[#E2E8F0]">
                      <span>T+04:10:00 (Climb)</span>
                      {" "}
                      <span>T+05:00:00 (Cruising altitude 5,200m)</span>
                      {" "}
                      <span>T+06:40:00 (Descent prep)</span>
                    </div>
                  </div>
                  {" "}
                  {/* AI Shapley Attribution Values Table */}
                  {" "}
                  <div className="col-span-5 bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded flex flex-col justify-between">
                    <div>
                      <span className="font-telemetry-sm text-[11px] font-bold text-[#0F172A] block mb-1.5">AI SHAPLEY ATTRIBUTION VALUES</span>
                      {" "}
                      <p className="font-body-sm text-[10px] text-[#64748B] mb-2 leading-tight">Contribution weight towards anomalous thermodynamic variance:</p>
                      {" "}
                      <div className="space-y-1.5">
                        <div>
                          <div className="flex justify-between font-telemetry-sm text-[10px] text-[#334155] mb-0.5">
                            <span>Baffle Duct Airflow Gap</span>
                            {" "}
                            <span className="font-bold text-[#EA580C]">+0.58 Φ</span>
                          </div>
                          {" "}
                          <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#EA580C] h-full" style={{width: '58%'}} />
                          </div>
                        </div>
                        {" "}
                        <div>
                          <div className="flex justify-between font-telemetry-sm text-[10px] text-[#334155] mb-0.5">
                            <span>Coolant Manifold Diff. P</span>
                            {" "}
                            <span className="font-bold text-[#0047d3]">+0.24 Φ</span>
                          </div>
                          {" "}
                          <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#0047d3] h-full" style={{width: '24%'}} />
                          </div>
                        </div>
                        {" "}
                        <div>
                          <div className="flex justify-between font-telemetry-sm text-[10px] text-[#334155] mb-0.5">
                            <span>Fuel-Air Lambda Staging</span>
                            {" "}
                            <span className="font-bold text-[#64748B]">+0.11 Φ</span>
                          </div>
                          {" "}
                          <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#64748B] h-full" style={{width: '11%'}} />
                          </div>
                        </div>
                      </div>
                    </div>
                    {" "}
                    <div className="text-[9px] font-telemetry-sm text-[#64748B] pt-2 border-t border-[#E2E8F0]">
                      Twin Model Confidence:{" "}
                      <strong>98.7%</strong>
                      {" "}(MIL-HDBK-516C)
                    </div>
                  </div>
                </div>
              </div>
              {" "}
              {/* Section 3: Itemized Maintenance Advisory Checklist */}
              {" "}
              <div>
                <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-1 mb-2">
                  <h2 className="font-headline-sm text-headline-sm font-bold tracking-tight uppercase text-[#0F172A] flex items-center gap-1.5">
                    <span className="text-[#0047d3]">3.0</span>
                    {" "}Mandatory Pre-Flight Corrective Actions
                  </h2>
                  {" "}
                  <span className="font-telemetry-sm text-[10px] text-[#DC2626] font-bold">AIRWORTHINESS DIRECTIVE</span>
                </div>
                {" "}
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5 p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded">
                    <div className="w-5 h-5 rounded bg-error-container text-on-error-container flex items-center justify-center font-telemetry-sm text-[11px] font-bold shrink-0 mt-0.5">1</div>
                    {" "}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-headline-sm text-body-md font-bold text-[#0F172A]">Visual Bore Inspection of Radiator Cowlings & Baffle Seals</h4>
                        {" "}
                        <span className="font-telemetry-sm text-[10px] text-[#DC2626] font-semibold uppercase">MANDATORY PRIOR TO SORTIE</span>
                      </div>
                      {" "}
                      <p className="font-body-sm text-[11px] text-[#475569] mt-0.5">Inspect port cylinder #3 shroud intake channel for foreign object debris, silicone sealant displacement, or baffle warping exceeding 0.75mm tolerance.</p>
                    </div>
                  </div>
                  {" "}
                  <div className="flex items-start gap-2.5 p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded">
                    <div className="w-5 h-5 rounded bg-surface-container-high text-primary flex items-center justify-center font-telemetry-sm text-[11px] font-bold shrink-0 mt-0.5">2</div>
                    {" "}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-headline-sm text-body-md font-bold text-[#0F172A]">Coolant Fluid Pressure Integrity Test</h4>
                        {" "}
                        <span className="font-telemetry-sm text-[10px] text-[#0047d3] font-semibold uppercase">BENCH CALIBRATION</span>
                      </div>
                      {" "}
                      <p className="font-body-sm text-[11px] text-[#475569] mt-0.5">Execute 1.2 bar pressurized line hold test on Rotax expansion chamber for 180 seconds. Verify zero cavitation in secondary recirculation loop.</p>
                    </div>
                  </div>
                </div>
              </div>
              {" "}
              {/* Section 4: Dual Airworthiness Engineering Sign-off Block */}
              {" "}
              <div className="pt-2">
                <div className="border-t border-[#CBD5E1] pt-3">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Sign-off 1: Propulsion Chief Engineer (Digitally Signed) */}
                    {" "}
                    <div className="border border-[#CBD5E1] p-3 rounded bg-[#F8FAFC] relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-label-caps text-[10px] text-[#64748B] font-bold">PROPULSION CHIEF ENGINEER</span>
                        {" "}
                        <span className="inline-flex items-center gap-1 font-telemetry-sm text-[9px] text-[#15803D] bg-[#DCFCE7] px-1.5 py-0.5 rounded font-bold">
                          <span className="material-symbols-outlined text-[12px]" data-icon="verified">verified</span>
                          {" "}DIGITALLY SIGNED
                        </span>
                      </div>
                      {" "}
                      <p className="font-body-md text-body-md font-bold text-[#0F172A]">Capt. M. Vance, PE</p>
                      {" "}
                      <p className="font-telemetry-sm text-[10px] text-[#64748B]">CAC ID: 8829-AF-ENG · Cert #44192</p>
                      {" "}
                      <div className="mt-2 pt-2 border-t border-[#E2E8F0] flex items-center justify-between font-telemetry-sm text-[9px] text-[#64748B]">
                        <span>Timestamp: 2024-10-24 14:18:02Z</span>
                        {" "}
                        <span className="font-mono">SHA-256: 9b2d...f41a</span>
                      </div>
                    </div>
                    {" "}
                    {/* Sign-off 2: Chief Maintenance Officer (Pending) */}
                    {" "}
                    <div className="border border-dashed border-[#F59E0B] p-3 rounded bg-[#FFFBEB] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-label-caps text-[10px] text-[#B45309] font-bold">CHIEF MAINTENANCE OFFICER</span>
                          {" "}
                          <span className="font-telemetry-sm text-[9px] text-[#B45309] font-bold">ACTION REQUIRED</span>
                        </div>
                        {" "}
                        <p className="font-body-md text-body-md font-bold text-[#0F172A]">Flight-Line Base Engineering</p>
                        {" "}
                        <p className="font-telemetry-sm text-[10px] text-[#64748B]">Awaiting physical ground inspection verification</p>
                      </div>
                      {" "}
                      <div className="mt-2 pt-2 border-t border-[#FDE68A] flex items-center justify-between">
                        <span className="font-telemetry-sm text-[10px] text-[#B45309]">Signoff unlocks flight permit</span>
                        {" "}
                        <button className="px-3 py-1 bg-[#1E5EFF] text-white rounded text-telemetry-sm font-telemetry-sm font-semibold hover:bg-[#1748D1] transition-colors shadow-xs">Execute Signature</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {" "}
            {/* Authentic Footer Bar of STANAG Page */}
            {" "}
            <div className="mt-8 pt-3 border-t border-[#CBD5E1] flex items-center justify-between font-telemetry-sm text-[9px] text-[#64748B]">
              <span>STANAG 4671 ED.3 // AIRWORTHINESS CODE FOR MILITARY UAV SYSTEMS</span>
              {" "}
              <span>AeroTwin Engine Telemetry Analytics v4.12.0</span>
              {" "}
              <span>PAGE 1 OF 3 // CLASSIFIED GROUND USE ONLY</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
