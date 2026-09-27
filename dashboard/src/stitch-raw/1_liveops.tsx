/* Auto-converted from Stitch export 1_liveops.html — reference skeleton. */
export default function LiveOpsRaw() {
  return (
    <main className="flex-1 overflow-y-auto px-margin py-space-md space-y-gutter bg-[#F5F7FA]">
      {/* 1. Top Alert Banner */}
      {" "}
      <div className="w-full bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-space-md flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-space-md">
          <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0 border border-[#FCD34D]">
            <span className="material-symbols-outlined text-[20px]" data-icon="warning">warning</span>
          </div>
          {" "}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-label-caps font-label-caps text-[#B45309] tracking-wider uppercase">Thermal Anomaly Detected</span>
              {" "}
              <span className="font-telemetry-sm text-[10px] text-[#D97706] bg-[#FEF3C7] px-1.5 py-0.5 rounded border border-[#FDE68A]">Confidence 94.2%</span>
            </div>
            {" "}
            <p className="text-body-md font-body-md text-[#78350F] mt-0.5">Cooling effectiveness declining — CHT residual +6.2 °C, detected 2h 10m before threshold</p>
          </div>
        </div>
        {" "}
        <div className="flex items-center gap-space-sm shrink-0">
          <button className="h-9 px-3.5 rounded bg-[#1E5EFF] hover:bg-[#1748D1] text-white text-headline-sm font-headline-sm text-xs flex items-center gap-1.5 transition-colors duration-150 shadow-sm">
            <span className="material-symbols-outlined text-[16px]" data-icon="troubleshoot">troubleshoot</span>
            {" "}
            <span>View Diagnosis</span>
          </button>
          {" "}
          <button className="h-9 px-3 rounded bg-white hover:bg-[#FEF3C7]/40 border border-[#CBD5E1] text-[#475569] text-headline-sm font-headline-sm text-xs transition-colors duration-150">Mute for 30m</button>
        </div>
      </div>
      {" "}
      {/* 2. Health Overview & Subsystem Grid (Top Row) */}
      {" "}
      <section className="grid grid-cols-12 gap-gutter">
        {/* Overall Health Card (4 cols) */}
        {" "}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#E3E8EF] rounded-xl p-space-md custom-shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-space-sm">
            <div>
              <span className="text-label-caps font-label-caps text-[#94A3B8] uppercase">Overall Engine Health</span>
              {" "}
              <p className="text-headline-sm font-headline-sm text-[#0F172A]">Digital Twin Synthetics</p>
            </div>
            {" "}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-telemetry-sm text-telemetry-sm font-semibold border border-[#FDE68A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
              {" "}WATCH
            </span>
          </div>
          {" "}
          <div className="py-space-md flex items-center justify-around">
            {/* Circular Health Gauge */}
            {" "}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="none" r="42" stroke="#EEF2F6" strokeWidth="8" />
                {" "}
                <circle cx="50" cy="50" fill="none" r="42" stroke="#1E5EFF" strokeDasharray="264" strokeDashoffset="34.3" strokeLinecap="round" strokeWidth="8" />
              </svg>
              {" "}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-telemetry-xl text-telemetry-xl text-[#0F172A] font-bold">87</span>
                {" "}
                <span className="font-label-caps text-[10px] text-[#64748B]">INDEX / 100</span>
              </div>
            </div>
            {" "}
            {/* Health Secondary Metrics */}
            {" "}
            <div className="space-y-space-sm pl-space-sm border-l border-[#F1F5F9]">
              <div>
                <span className="text-label-caps font-label-caps text-[#64748B] text-[10px] block uppercase">Remaining Useful Life</span>
                {" "}
                <div className="font-telemetry-md text-telemetry-md text-[#0F172A] font-semibold">
                  412 hrs{" "}
                  <span className="text-[#64748B] text-xs font-normal">(±38)</span>
                </div>
              </div>
              {" "}
              <div>
                <span className="text-label-caps font-label-caps text-[#64748B] text-[10px] block uppercase">Confidence Index</span>
                {" "}
                <div className="font-telemetry-md text-telemetry-md text-[#0F172A] font-semibold flex items-center gap-1">
                  <span>98.4%</span>
                  {" "}
                  <span className="material-symbols-outlined text-[14px] text-emerald-600" data-icon="check_circle">check_circle</span>
                </div>
              </div>
            </div>
          </div>
          {" "}
          <div className="pt-space-xs border-t border-[#F1F5F9] flex items-center justify-between text-[#64748B] font-telemetry-sm text-[10px]">
            <span>
              Baseline Drift:{" "}
              <strong className="text-[#0F172A]">+1.4%</strong>
            </span>
            {" "}
            <span>
              Degradation:{" "}
              <strong className="text-[#B45309]">Subsystem-2</strong>
            </span>
          </div>
        </div>
        {" "}
        {/* Seven Subsystem Tiles (8 cols) */}
        {" "}
        <div className="col-span-12 lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-gutter-dense">
          {/* Combustion */}
          {" "}
          <div className="bg-white border border-[#E3E8EF] rounded-xl p-space-sm flex flex-col justify-between custom-shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-label-caps font-label-caps text-[#64748B] text-[10px]">COMBUSTION</span>
              {" "}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            {" "}
            <div className="my-space-xs flex items-baseline justify-between">
              <span className="font-telemetry-xl text-[24px] text-[#0F172A] font-bold">94</span>
              {" "}
              <span className="px-1.5 py-0.2 rounded-full bg-[#DCFCE7] text-[#15803D] font-telemetry-sm text-[10px]">Normal</span>
            </div>
            {" "}
            <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{width: '94%'}} />
            </div>
          </div>
          {" "}
          {/* Cooling (Watch) */}
          {" "}
          <div className="bg-white border-2 border-[#F59E0B]/40 rounded-xl p-space-sm flex flex-col justify-between custom-shadow-card bg-[#FEF3C7]/10">
            <div className="flex items-center justify-between">
              <span className="text-label-caps font-label-caps text-[#B45309] font-bold text-[10px]">COOLING</span>
              {" "}
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            {" "}
            <div className="my-space-xs flex items-baseline justify-between">
              <span className="font-telemetry-xl text-[24px] text-[#B45309] font-bold">71</span>
              {" "}
              <span className="px-1.5 py-0.2 rounded-full bg-[#FEF3C7] text-[#B45309] font-telemetry-sm text-[10px] font-bold border border-[#FDE68A]">Watch</span>
            </div>
            {" "}
            <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{width: '71%'}} />
            </div>
          </div>
          {" "}
          {/* Lubrication */}
          {" "}
          <div className="bg-white border border-[#E3E8EF] rounded-xl p-space-sm flex flex-col justify-between custom-shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-label-caps font-label-caps text-[#64748B] text-[10px]">LUBRICATION</span>
              {" "}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            {" "}
            <div className="my-space-xs flex items-baseline justify-between">
              <span className="font-telemetry-xl text-[24px] text-[#0F172A] font-bold">90</span>
              {" "}
              <span className="px-1.5 py-0.2 rounded-full bg-[#DCFCE7] text-[#15803D] font-telemetry-sm text-[10px]">Normal</span>
            </div>
            {" "}
            <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{width: '90%'}} />
            </div>
          </div>
          {" "}
          {/* Fuel & Injection */}
          {" "}
          <div className="bg-white border border-[#E3E8EF] rounded-xl p-space-sm flex flex-col justify-between custom-shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-label-caps font-label-caps text-[#64748B] text-[10px]">FUEL / INJ</span>
              {" "}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            {" "}
            <div className="my-space-xs flex items-baseline justify-between">
              <span className="font-telemetry-xl text-[24px] text-[#0F172A] font-bold">92</span>
              {" "}
              <span className="px-1.5 py-0.2 rounded-full bg-[#DCFCE7] text-[#15803D] font-telemetry-sm text-[10px]">Normal</span>
            </div>
            {" "}
            <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{width: '92%'}} />
            </div>
          </div>
          {" "}
          {/* Electrical */}
          {" "}
          <div className="bg-white border border-[#E3E8EF] rounded-xl p-space-sm flex flex-col justify-between custom-shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-label-caps font-label-caps text-[#64748B] text-[10px]">ELECTRICAL</span>
              {" "}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            {" "}
            <div className="my-space-xs flex items-baseline justify-between">
              <span className="font-telemetry-xl text-[24px] text-[#0F172A] font-bold">96</span>
              {" "}
              <span className="px-1.5 py-0.2 rounded-full bg-[#DCFCE7] text-[#15803D] font-telemetry-sm text-[10px]">Normal</span>
            </div>
            {" "}
            <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{width: '96%'}} />
            </div>
          </div>
          {" "}
          {/* Vibration */}
          {" "}
          <div className="bg-white border border-[#E3E8EF] rounded-xl p-space-sm flex flex-col justify-between custom-shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-label-caps font-label-caps text-[#64748B] text-[10px]">VIBRATION</span>
              {" "}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            {" "}
            <div className="my-space-xs flex items-baseline justify-between">
              <span className="font-telemetry-xl text-[24px] text-[#0F172A] font-bold">88</span>
              {" "}
              <span className="px-1.5 py-0.2 rounded-full bg-[#DCFCE7] text-[#15803D] font-telemetry-sm text-[10px]">Normal</span>
            </div>
            {" "}
            <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{width: '88%'}} />
            </div>
          </div>
          {" "}
          {/* Sensor Array */}
          {" "}
          <div className="bg-white border border-[#E3E8EF] rounded-xl p-space-sm flex flex-col justify-between custom-shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-label-caps font-label-caps text-[#64748B] text-[10px]">SENSOR ARRAY</span>
              {" "}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            {" "}
            <div className="my-space-xs flex items-baseline justify-between">
              <span className="font-telemetry-xl text-[24px] text-[#0F172A] font-bold">99</span>
              {" "}
              <span className="px-1.5 py-0.2 rounded-full bg-[#DCFCE7] text-[#15803D] font-telemetry-sm text-[10px]">Normal</span>
            </div>
            {" "}
            <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{width: '99%'}} />
            </div>
          </div>
          {" "}
          {/* Telemetry Sync Mini Indicator */}
          {" "}
          <div className="bg-[#F8FAFC] border border-dashed border-[#CBD5E1] rounded-xl p-space-sm flex flex-col justify-between">
            <span className="text-label-caps font-label-caps text-[#94A3B8] text-[10px]">SAMPLING RATE</span>
            {" "}
            <div className="font-telemetry-md text-[#0F172A] font-bold flex items-center justify-between">
              <span>20.00 Hz</span>
              {" "}
              <span className="text-xs text-emerald-600 font-normal">0 drops</span>
            </div>
            {" "}
            <span className="text-[10px] text-[#64748B] font-telemetry-sm">Synced with CAN-Bus A</span>
          </div>
        </div>
      </section>
      {" "}
      {/* 3. Primary Instrumentation Gauges (Second Row - 4 Semicircular dials) */}
      {" "}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {/* Gauge 1: Engine RPM */}
        {" "}
        <div className="bg-white border border-[#E3E8EF] rounded-xl p-space-md custom-shadow-card flex flex-col items-center">
          <div className="w-full flex items-center justify-between border-b border-[#F1F5F9] pb-space-xs">
            <span className="text-label-caps font-label-caps text-[#94A3B8]">ENGINE SPEED</span>
            {" "}
            <span className="font-telemetry-sm text-[10px] text-[#64748B]">MAX 5,800</span>
          </div>
          {" "}
          {/* Semi Circular Dial */}
          {" "}
          <div className="relative w-44 h-24 my-2 flex items-end justify-center overflow-hidden">
            <svg className="w-44 h-44 -rotate-180 transform" viewBox="0 0 100 100">
              {/* Background Arc */}
              {" "}
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#E2E8F0" strokeLinecap="round" strokeWidth="8" />
              {" "}
              {/* Green Normal Zone */}
              {" "}
              <path d="M 10 50 A 40 40 0 0 1 76 22" fill="none" stroke="#1E5EFF" strokeLinecap="round" strokeWidth="8" />
              {" "}
              {/* Limit Tick Marker */}
              {" "}
              <line stroke="#DC2626" strokeWidth="2" x1="88" x2="84" y1="50" y2="48" />
            </svg>
            {" "}
            {/* Needle (Simulated Angle) */}
            {" "}
            <div className="absolute bottom-0 w-1 h-20 bg-[#0F172A] origin-bottom transform rotate-[65deg] rounded-t" />
            {" "}
            <div className="absolute bottom-0 w-3 h-3 bg-primary rounded-full ring-2 ring-white" />
          </div>
          {" "}
          <div className="text-center">
            <div className="font-telemetry-xl text-telemetry-xl text-[#0F172A] font-bold">
              5,450{" "}
              <span className="text-telemetry-sm font-normal text-[#64748B]">RPM</span>
            </div>
            {" "}
            <span className="text-label-caps text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">Continuous Operation Zone</span>
          </div>
        </div>
        {" "}
        {/* Gauge 2: Manifold Pressure (MAP) */}
        {" "}
        <div className="bg-white border border-[#E3E8EF] rounded-xl p-space-md custom-shadow-card flex flex-col items-center">
          <div className="w-full flex items-center justify-between border-b border-[#F1F5F9] pb-space-xs">
            <span className="text-label-caps font-label-caps text-[#94A3B8]">MANIFOLD PRESSURE (MAP)</span>
            {" "}
            <span className="font-telemetry-sm text-[10px] text-primary font-bold">TURBO BOOST</span>
          </div>
          {" "}
          <div className="relative w-44 h-24 my-2 flex items-end justify-center overflow-hidden">
            <svg className="w-44 h-44 -rotate-180 transform" viewBox="0 0 100 100">
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#E2E8F0" strokeLinecap="round" strokeWidth="8" />
              {" "}
              <path d="M 10 50 A 40 40 0 0 1 72 24" fill="none" stroke="#0284C7" strokeLinecap="round" strokeWidth="8" />
            </svg>
            {" "}
            <div className="absolute bottom-0 w-1 h-20 bg-[#0F172A] origin-bottom transform rotate-[58deg] rounded-t" />
            {" "}
            <div className="absolute bottom-0 w-3 h-3 bg-[#0284C7] rounded-full ring-2 ring-white" />
          </div>
          {" "}
          <div className="text-center">
            <div className="font-telemetry-xl text-telemetry-xl text-[#0F172A] font-bold">
              38.5{" "}
              <span className="text-telemetry-sm font-normal text-[#64748B]">inHg</span>
            </div>
            {" "}
            <span className="text-label-caps text-[10px] text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded">Wastegate Active (+0.4 bar)</span>
          </div>
        </div>
        {" "}
        {/* Gauge 3: Fuel Flow */}
        {" "}
        <div className="bg-white border border-[#E3E8EF] rounded-xl p-space-md custom-shadow-card flex flex-col items-center">
          <div className="w-full flex items-center justify-between border-b border-[#F1F5F9] pb-space-xs">
            <span className="text-label-caps font-label-caps text-[#94A3B8]">FUEL CONSUMPTION</span>
            {" "}
            <span className="font-telemetry-sm text-[10px] text-[#64748B]">METERED FLOW</span>
          </div>
          {" "}
          <div className="relative w-44 h-24 my-2 flex items-end justify-center overflow-hidden">
            <svg className="w-44 h-44 -rotate-180 transform" viewBox="0 0 100 100">
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#E2E8F0" strokeLinecap="round" strokeWidth="8" />
              {" "}
              <path d="M 10 50 A 40 40 0 0 1 54 11" fill="none" stroke="#059669" strokeLinecap="round" strokeWidth="8" />
            </svg>
            {" "}
            <div className="absolute bottom-0 w-1 h-20 bg-[#0F172A] origin-bottom transform rotate-[15deg] rounded-t" />
            {" "}
            <div className="absolute bottom-0 w-3 h-3 bg-[#059669] rounded-full ring-2 ring-white" />
          </div>
          {" "}
          <div className="text-center">
            <div className="font-telemetry-xl text-telemetry-xl text-[#0F172A] font-bold">
              24.1{" "}
              <span className="text-telemetry-sm font-normal text-[#64748B]">L/h</span>
            </div>
            {" "}
            <span className="text-label-caps text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">Endurance Budget Nominal</span>
          </div>
        </div>
        {" "}
        {/* Gauge 4: Power Output */}
        {" "}
        <div className="bg-white border border-[#E3E8EF] rounded-xl p-space-md custom-shadow-card flex flex-col items-center">
          <div className="w-full flex items-center justify-between border-b border-[#F1F5F9] pb-space-xs">
            <span className="text-label-caps font-label-caps text-[#94A3B8]">POWER OUTPUT</span>
            {" "}
            <span className="font-telemetry-sm text-[10px] text-[#64748B]">MAX CONT: 85%</span>
          </div>
          {" "}
          <div className="relative w-44 h-24 my-2 flex items-end justify-center overflow-hidden">
            <svg className="w-44 h-44 -rotate-180 transform" viewBox="0 0 100 100">
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#E2E8F0" strokeLinecap="round" strokeWidth="8" />
              {" "}
              <path d="M 10 50 A 40 40 0 0 1 70 20" fill="none" stroke="#1E5EFF" strokeLinecap="round" strokeWidth="8" />
            </svg>
            {" "}
            <div className="absolute bottom-0 w-1 h-20 bg-[#0F172A] origin-bottom transform rotate-[45deg] rounded-t" />
            {" "}
            <div className="absolute bottom-0 w-3 h-3 bg-primary rounded-full ring-2 ring-white" />
          </div>
          {" "}
          <div className="text-center">
            <div className="font-telemetry-xl text-telemetry-xl text-[#0F172A] font-bold">
              78%{" "}
              <span className="text-telemetry-sm font-normal text-[#64748B]">PWR</span>
            </div>
            {" "}
            <span className="text-label-caps text-[10px] text-primary font-semibold bg-blue-50 px-2 py-0.5 rounded">Continuous Max Setting</span>
          </div>
        </div>
      </section>
      {" "}
      {/* 4. Cylinder Thermal Profile & Vibration Spectrum (Third Row) */}
      {" "}
      <section className="grid grid-cols-12 gap-gutter">
        {/* Cylinder Thermal Profile (7 cols) */}
        {" "}
        <div className="col-span-12 lg:col-span-7 bg-white border border-[#E3E8EF] rounded-xl p-space-md custom-shadow-card">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-space-sm mb-space-md">
            <div>
              <span className="text-label-caps font-label-caps text-[#94A3B8] uppercase">Thermal Exhaust & Head Analysis</span>
              {" "}
              <h2 className="text-headline-sm font-headline-sm text-[#0F172A]">Cylinder Temperature Matrix (CHT / EGT)</h2>
            </div>
            {" "}
            {/* Legend */}
            {" "}
            <div className="flex items-center gap-space-md font-telemetry-sm text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-primary inline-block" />
                {" "}
                <span>CHT (°C)</span>
              </div>
              {" "}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#64748B] inline-block" />
                {" "}
                <span>EGT (°C / 10)</span>
              </div>
              {" "}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-[#DC2626] inline-block" />
                {" "}
                <span className="text-[#DC2626]">Limit: 135°C</span>
              </div>
            </div>
          </div>
          {" "}
          {/* Chart Area */}
          {" "}
          <div className="relative h-60 w-full pt-4">
            {/* Reference Lines */}
            {" "}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 text-right font-telemetry-sm text-[10px] text-[#94A3B8]">
              <div className="w-full border-b border-dashed border-[#DC2626]/40 flex justify-between">
                <span className="text-[#DC2626] text-[9px] bg-red-50 px-1 rounded">REDLINE CHT 135°C</span>
                {" "}
                <span>140°C</span>
              </div>
              {" "}
              <div className="w-full border-b border-dashed border-[#CBD5E1] flex justify-between">
                <span className="text-[#64748B] text-[9px]">NORMAL CHT TARGET 115°C</span>
                {" "}
                <span>120°C</span>
              </div>
              {" "}
              <div className="w-full border-b border-[#F1F5F9] flex justify-end">
                <span>100°C</span>
              </div>
              {" "}
              <div className="w-full border-b border-[#F1F5F9] flex justify-end">
                <span>80°C</span>
              </div>
            </div>
            {" "}
            {/* Grouped Bars Container */}
            {" "}
            <div className="relative h-full flex items-end justify-around pb-8 px-4">
              {/* Cylinder 1 */}
              {" "}
              <div className="flex flex-col items-center gap-1 w-20">
                <div className="flex items-end gap-1.5 h-44 w-full justify-center">
                  {/* CHT */}
                  {" "}
                  <div className="w-6 bg-primary rounded-t transition-all" style={{height: '68%'}}>
                    <div className="text-[9px] font-telemetry-sm text-white text-center pt-0.5">112°</div>
                  </div>
                  {" "}
                  {/* EGT / 10 */}
                  {" "}
                  <div className="w-6 bg-[#94A3B8] rounded-t transition-all" style={{height: '52%'}}>
                    <div className="text-[9px] font-telemetry-sm text-white text-center pt-0.5">780°</div>
                  </div>
                </div>
                {" "}
                <span className="font-telemetry-sm text-xs text-[#0F172A] font-semibold mt-1">CYL 1</span>
              </div>
              {" "}
              {/* Cylinder 2 */}
              {" "}
              <div className="flex flex-col items-center gap-1 w-20">
                <div className="flex items-end gap-1.5 h-44 w-full justify-center">
                  {/* CHT */}
                  {" "}
                  <div className="w-6 bg-primary rounded-t transition-all" style={{height: '72%'}}>
                    <div className="text-[9px] font-telemetry-sm text-white text-center pt-0.5">116°</div>
                  </div>
                  {" "}
                  {/* EGT */}
                  {" "}
                  <div className="w-6 bg-[#94A3B8] rounded-t transition-all" style={{height: '55%'}}>
                    <div className="text-[9px] font-telemetry-sm text-white text-center pt-0.5">792°</div>
                  </div>
                </div>
                {" "}
                <span className="font-telemetry-sm text-xs text-[#0F172A] font-semibold mt-1">CYL 2</span>
              </div>
              {" "}
              {/* Cylinder 3 (Anomaly Highlight) */}
              {" "}
              <div className="flex flex-col items-center gap-1 w-20 bg-amber-50/70 p-1 rounded border border-amber-200">
                <div className="flex items-end gap-1.5 h-44 w-full justify-center">
                  {/* CHT Elevated (Amber) */}
                  {" "}
                  <div className="w-6 bg-amber-500 rounded-t shadow-sm" style={{height: '89%'}}>
                    <div className="text-[9px] font-telemetry-sm text-white text-center pt-0.5 font-bold">128°</div>
                  </div>
                  {" "}
                  {/* EGT */}
                  {" "}
                  <div className="w-6 bg-[#94A3B8] rounded-t" style={{height: '59%'}}>
                    <div className="text-[9px] font-telemetry-sm text-white text-center pt-0.5">805°</div>
                  </div>
                </div>
                {" "}
                <span className="font-telemetry-sm text-xs text-[#B45309] font-bold mt-1">CYL 3 ⚠</span>
              </div>
              {" "}
              {/* Cylinder 4 */}
              {" "}
              <div className="flex flex-col items-center gap-1 w-20">
                <div className="flex items-end gap-1.5 h-44 w-full justify-center">
                  {/* CHT */}
                  {" "}
                  <div className="w-6 bg-primary rounded-t transition-all" style={{height: '69%'}}>
                    <div className="text-[9px] font-telemetry-sm text-white text-center pt-0.5">114°</div>
                  </div>
                  {" "}
                  {/* EGT */}
                  {" "}
                  <div className="w-6 bg-[#94A3B8] rounded-t transition-all" style={{height: '53%'}}>
                    <div className="text-[9px] font-telemetry-sm text-white text-center pt-0.5">785°</div>
                  </div>
                </div>
                {" "}
                <span className="font-telemetry-sm text-xs text-[#0F172A] font-semibold mt-1">CYL 4</span>
              </div>
            </div>
          </div>
          {" "}
          <div className="mt-space-xs pt-space-xs border-t border-[#F1F5F9] flex items-center justify-between text-[#64748B] font-telemetry-sm text-[11px]">
            <span>
              Anomaly attribution:{" "}
              <strong className="text-amber-700">Cooling Duct 3 Ram-Air Restriction</strong>
            </span>
            {" "}
            <span className="text-emerald-700">No Detonation Signature Detected</span>
          </div>
        </div>
        {" "}
        {/* Vibration Spectrum Order Bar Chart (5 cols) */}
        {" "}
        <div className="col-span-12 lg:col-span-5 bg-white border border-[#E3E8EF] rounded-xl p-space-md custom-shadow-card">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-space-sm mb-space-md">
            <div>
              <span className="text-label-caps font-label-caps text-[#94A3B8] uppercase">Propulsion Dynamics</span>
              {" "}
              <h2 className="text-headline-sm font-headline-sm text-[#0F172A]">Vibration Spectrum (Engine Orders)</h2>
            </div>
            {" "}
            <span className="font-telemetry-sm text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">0.18 ips RMS</span>
          </div>
          {" "}
          {/* Harmonics Bar Chart */}
          {" "}
          <div className="h-60 w-full flex flex-col justify-between">
            <div className="relative flex-1 flex items-end justify-between px-2 pt-4 pb-6">
              {/* Baseline Envelope Curve Simulation */}
              {" "}
              <div className="absolute inset-x-4 top-8 h-24 border-t-2 border-dashed border-[#CBD5E1] pointer-events-none">
                <span className="absolute -top-3 right-0 font-telemetry-sm text-[9px] text-[#94A3B8]">Baseline Normal Envelope</span>
              </div>
              {" "}
              {/* Harmonic Bars */}
              {" "}
              {/* 0.5X Order */}
              {" "}
              <div className="flex flex-col items-center gap-1 w-7">
                <div className="w-4 bg-slate-300 rounded-t" style={{height: '18px'}} />
                {" "}
                <span className="font-telemetry-sm text-[10px] text-[#64748B]">0.5×</span>
              </div>
              {" "}
              {/* 1.0X Order (Propeller / Crank) */}
              {" "}
              <div className="flex flex-col items-center gap-1 w-10">
                <span className="font-telemetry-sm text-[9px] text-primary font-bold">0.12</span>
                {" "}
                <div className="w-5 bg-primary rounded-t" style={{height: '85px'}} />
                {" "}
                <span className="font-telemetry-sm text-[10px] text-[#0F172A] font-bold">1.0×</span>
              </div>
              {" "}
              {/* 1.5X Order */}
              {" "}
              <div className="flex flex-col items-center gap-1 w-7">
                <div className="w-4 bg-slate-300 rounded-t" style={{height: '14px'}} />
                {" "}
                <span className="font-telemetry-sm text-[10px] text-[#64748B]">1.5×</span>
              </div>
              {" "}
              {/* 2.0X Order (Combustion Frequency) */}
              {" "}
              <div className="flex flex-col items-center gap-1 w-10">
                <span className="font-telemetry-sm text-[9px] text-primary font-bold">0.09</span>
                {" "}
                <div className="w-5 bg-primary rounded-t" style={{height: '65px'}} />
                {" "}
                <span className="font-telemetry-sm text-[10px] text-[#0F172A] font-bold">2.0×</span>
              </div>
              {" "}
              {/* 2.5X Order */}
              {" "}
              <div className="flex flex-col items-center gap-1 w-7">
                <div className="w-4 bg-slate-300 rounded-t" style={{height: '10px'}} />
                {" "}
                <span className="font-telemetry-sm text-[10px] text-[#64748B]">2.5×</span>
              </div>
              {" "}
              {/* 3.0X Order */}
              {" "}
              <div className="flex flex-col items-center gap-1 w-7">
                <div className="w-4 bg-slate-300 rounded-t" style={{height: '22px'}} />
                {" "}
                <span className="font-telemetry-sm text-[10px] text-[#64748B]">3.0×</span>
              </div>
              {" "}
              {/* High Frequency Harmonics */}
              {" "}
              <div className="flex flex-col items-center gap-1 w-7">
                <div className="w-4 bg-slate-300 rounded-t" style={{height: '16px'}} />
                {" "}
                <span className="font-telemetry-sm text-[10px] text-[#64748B]">4.0×</span>
              </div>
            </div>
            {" "}
            {/* Footer Meta */}
            {" "}
            <div className="pt-space-xs border-t border-[#F1F5F9] flex items-center justify-between text-[#64748B] font-telemetry-sm text-[10px]">
              <span>Sensor: Tri-axial Accelerometer (Aft Gearbox)</span>
              {" "}
              <span className="text-primary font-medium">No Bearing Fault Detected</span>
            </div>
          </div>
        </div>
      </section>
      {" "}
      {/* 5. Telemetry Metric List with Sparklines & Normal Ranges (Bottom Row) */}
      {" "}
      <section className="bg-white border border-[#E3E8EF] rounded-xl p-space-md custom-shadow-card">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-space-sm mb-space-sm">
          <div>
            <span className="text-label-caps font-label-caps text-[#94A3B8] uppercase">Continuous Telemetry Streams</span>
            {" "}
            <h2 className="text-headline-sm font-headline-sm text-[#0F172A]">Core Subsystem Sensor Telemetry Feed</h2>
          </div>
          {" "}
          <div className="flex items-center gap-2">
            <span className="font-telemetry-sm text-[11px] text-[#64748B]">Auto-refresh rate:</span>
            {" "}
            <span className="font-telemetry-sm text-[11px] text-primary bg-blue-50 px-2 py-0.5 rounded font-bold">50ms (Real-time)</span>
          </div>
        </div>
        {" "}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-gutter-dense pt-2">
          {/* Oil Pressure */}
          {" "}
          <div className="p-space-sm rounded-lg bg-[#F8FAFC] border border-[#E3E8EF] flex flex-col justify-between">
            <span className="text-label-caps font-label-caps text-[#64748B] text-[10px] block">OIL PRESSURE</span>
            {" "}
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-telemetry-lg text-telemetry-lg text-[#0F172A] font-bold">
                4.2{" "}
                <span className="text-xs font-normal text-[#64748B]">bar</span>
              </span>
              {" "}
              <span className="px-1.5 py-0.2 rounded-full bg-[#DCFCE7] text-[#15803D] font-telemetry-sm text-[9px] font-bold">Normal</span>
            </div>
            {" "}
            {/* Sparkline (SVG) */}
            {" "}
            <div className="h-8 my-2">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 25">
                <polyline fill="none" points="0,15 15,14 30,16 45,13 60,15 75,12 90,14 100,13" stroke="#1E5EFF" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
            </div>
            {" "}
            <div className="flex items-center justify-between text-[#94A3B8] font-telemetry-sm text-[9px]">
              <span>Range: 3.5 - 5.0</span>
              {" "}
              <span className="text-[#0F172A]">Nominal</span>
            </div>
          </div>
          {" "}
          {/* Oil Temp */}
          {" "}
          <div className="p-space-sm rounded-lg bg-[#F8FAFC] border border-[#E3E8EF] flex flex-col justify-between">
            <span className="text-label-caps font-label-caps text-[#64748B] text-[10px] block">OIL TEMP</span>
            {" "}
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-telemetry-lg text-telemetry-lg text-[#0F172A] font-bold">
                98{" "}
                <span className="text-xs font-normal text-[#64748B]">°C</span>
              </span>
              {" "}
              <span className="px-1.5 py-0.2 rounded-full bg-[#DCFCE7] text-[#15803D] font-telemetry-sm text-[9px] font-bold">Normal</span>
            </div>
            {" "}
            {/* Sparkline (SVG) */}
            {" "}
            <div className="h-8 my-2">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 25">
                <polyline fill="none" points="0,18 20,17 40,15 60,16 80,14 100,13" stroke="#1E5EFF" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
            </div>
            {" "}
            <div className="flex items-center justify-between text-[#94A3B8] font-telemetry-sm text-[9px]">
              <span>Range: 75 - 110</span>
              {" "}
              <span className="text-[#0F172A]">Stable</span>
            </div>
          </div>
          {" "}
          {/* Coolant Temp (Elevating) */}
          {" "}
          <div className="p-space-sm rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex flex-col justify-between">
            <span className="text-label-caps font-label-caps text-[#B45309] text-[10px] font-bold block">COOLANT TEMP</span>
            {" "}
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-telemetry-lg text-telemetry-lg text-[#B45309] font-bold">
                104{" "}
                <span className="text-xs font-normal text-[#B45309]">°C</span>
              </span>
              {" "}
              <span className="px-1.5 py-0.2 rounded-full bg-[#FEF3C7] text-[#B45309] font-telemetry-sm text-[9px] font-bold border border-[#FDE68A]">Elevating</span>
            </div>
            {" "}
            {/* Sparkline (SVG - trending up) */}
            {" "}
            <div className="h-8 my-2">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 25">
                <polyline fill="none" points="0,20 20,18 40,15 60,12 80,8 100,5" stroke="#D97706" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </div>
            {" "}
            <div className="flex items-center justify-between text-[#B45309] font-telemetry-sm text-[9px]">
              <span>Range: 80 - 105</span>
              {" "}
              <span className="font-bold">+1.2°C/hr</span>
            </div>
          </div>
          {" "}
          {/* Bus Voltage */}
          {" "}
          <div className="p-space-sm rounded-lg bg-[#F8FAFC] border border-[#E3E8EF] flex flex-col justify-between">
            <span className="text-label-caps font-label-caps text-[#64748B] text-[10px] block">BUS VOLTAGE</span>
            {" "}
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-telemetry-lg text-telemetry-lg text-[#0F172A] font-bold">
                13.9{" "}
                <span className="text-xs font-normal text-[#64748B]">V</span>
              </span>
              {" "}
              <span className="px-1.5 py-0.2 rounded-full bg-[#DCFCE7] text-[#15803D] font-telemetry-sm text-[9px] font-bold">Normal</span>
            </div>
            {" "}
            {/* Sparkline (SVG) */}
            {" "}
            <div className="h-8 my-2">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 25">
                <polyline fill="none" points="0,12 25,12 50,13 75,12 100,12" stroke="#1E5EFF" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
            </div>
            {" "}
            <div className="flex items-center justify-between text-[#94A3B8] font-telemetry-sm text-[9px]">
              <span>Range: 13.5 - 14.4</span>
              {" "}
              <span className="text-[#0F172A]">Bus A Regulated</span>
            </div>
          </div>
          {" "}
          {/* Alternator Output */}
          {" "}
          <div className="p-space-sm rounded-lg bg-[#F8FAFC] border border-[#E3E8EF] flex flex-col justify-between">
            <span className="text-label-caps font-label-caps text-[#64748B] text-[10px] block">ALTERNATOR OUT</span>
            {" "}
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-telemetry-lg text-telemetry-lg text-[#0F172A] font-bold">
                18{" "}
                <span className="text-xs font-normal text-[#64748B]">A</span>
              </span>
              {" "}
              <span className="px-1.5 py-0.2 rounded-full bg-[#DCFCE7] text-[#15803D] font-telemetry-sm text-[9px] font-bold">Normal</span>
            </div>
            {" "}
            {/* Sparkline (SVG) */}
            {" "}
            <div className="h-8 my-2">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 25">
                <polyline fill="none" points="0,14 20,15 40,13 60,16 80,14 100,14" stroke="#1E5EFF" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
            </div>
            {" "}
            <div className="flex items-center justify-between text-[#94A3B8] font-telemetry-sm text-[9px]">
              <span>Range: 10 - 25</span>
              {" "}
              <span className="text-[#0F172A]">Gen-1 Active</span>
            </div>
          </div>
          {" "}
          {/* Injection Timing */}
          {" "}
          <div className="p-space-sm rounded-lg bg-[#F8FAFC] border border-[#E3E8EF] flex flex-col justify-between">
            <span className="text-label-caps font-label-caps text-[#64748B] text-[10px] block">INJECTION TIMING</span>
            {" "}
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-telemetry-lg text-telemetry-lg text-[#0F172A] font-bold">
                312°{" "}
                <span className="text-xs font-normal text-[#64748B]">BTDC</span>
              </span>
              {" "}
              <span className="px-1.5 py-0.2 rounded-full bg-[#DCFCE7] text-[#15803D] font-telemetry-sm text-[9px] font-bold">Normal</span>
            </div>
            {" "}
            {/* Sparkline (SVG) */}
            {" "}
            <div className="h-8 my-2">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 25">
                <polyline fill="none" points="0,13 25,13 50,14 75,13 100,13" stroke="#1E5EFF" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
            </div>
            {" "}
            <div className="flex items-center justify-between text-[#94A3B8] font-telemetry-sm text-[9px]">
              <span>Range: 308° - 315°</span>
              {" "}
              <span className="text-[#0F172A]">ECU Dynamic</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
