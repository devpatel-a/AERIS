/* Auto-converted from Stitch export 8_simcontrol.html — reference skeleton. */
export default function SimControlRaw() {
  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* ================= LEFT SIDEBAR (SideNavBar Shared Component) ================= */}
      {" "}
      {" "}
      {/* ================= MAIN WORKBENCH CANVAS ================= */}
      {" "}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* TopNavBar Instrumentation Header */}
        {" "}
        {" "}
        {/* Content Workspace */}
        {" "}
        <div className="flex-1 flex flex-col overflow-y-auto bg-background p-space-md gap-space-md">
          {/* TOP CONTROL BAR & HARDWARE-IN-THE-LOOP (HiL) STATUS */}
          {" "}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-sm shrink-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-center">
              {/* Simulation State & Basic Controls (Col 5) */}
              {" "}
              <div className="lg:col-span-5 flex flex-col gap-space-xs border-r border-outline-variant pr-space-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">SIMULATION STATE</span>
                    {" "}
                    <span className="px-2 py-0.5 rounded text-telemetry-sm font-telemetry-sm bg-surface-container-highest text-primary font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      {" "}RUNNING (vcan0 bus active)
                    </span>
                  </div>
                  {" "}
                  <span className="font-telemetry-sm text-telemetry-sm text-outline">Loop: 50.0ms</span>
                </div>
                {" "}
                {/* Playback Controls */}
                {" "}
                <div className="flex items-center gap-space-xs mt-1">
                  <button className="px-space-md h-9 bg-primary text-on-primary rounded font-body-md text-body-md font-semibold flex items-center gap-space-xs hover:bg-surface-tint active:scale-[0.98] transition-all shadow-xs">
                    <span className="material-symbols-outlined text-[16px]" data-icon="pause">pause</span>
                    {" "}Pause
                  </button>
                  {" "}
                  <button className="px-space-md h-9 border border-error text-error bg-surface rounded font-body-md text-body-md font-semibold flex items-center gap-space-xs hover:bg-error-container active:scale-[0.98] transition-all">
                    <span className="material-symbols-outlined text-[16px]" data-icon="stop">stop</span>
                    {" "}Stop
                  </button>
                  {" "}
                  <button className="px-space-md h-9 border border-outline-variant bg-surface text-on-surface rounded font-body-md text-body-md font-semibold flex items-center gap-space-xs hover:bg-surface-container active:scale-[0.98] transition-all">
                    <span className="material-symbols-outlined text-[16px]" data-icon="restart_alt">restart_alt</span>
                    {" "}Restart
                  </button>
                  {" "}
                  <button className="px-space-md h-9 border border-outline-variant bg-surface text-on-surface rounded font-body-md text-body-md font-semibold flex items-center gap-space-xs hover:bg-surface-container active:scale-[0.98] transition-all" title="Execute single cycle">
                    <span className="material-symbols-outlined text-[16px]" data-icon="redo">redo</span>
                    {" "}Step Forward
                  </button>
                </div>
              </div>
              {" "}
              {/* Time Acceleration & Presets (Col 4) */}
              {" "}
              <div className="lg:col-span-4 flex flex-col gap-space-xs pr-space-md border-r border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">TIME ACCELERATION</span>
                  {" "}
                  <span className="font-telemetry-sm text-telemetry-sm text-primary font-bold">WARP: 1.0× REAL-TIME</span>
                </div>
                {" "}
                {/* Acceleration Segment Buttons */}
                {" "}
                <div className="inline-flex rounded border border-outline-variant bg-surface-container p-0.5" role="group">
                  <button className="flex-1 py-1 text-center font-telemetry-sm text-telemetry-sm bg-surface text-primary font-bold rounded shadow-xs">1×</button>
                  {" "}
                  <button className="flex-1 py-1 text-center font-telemetry-sm text-telemetry-sm text-on-surface-variant hover:text-on-surface">2×</button>
                  {" "}
                  <button className="flex-1 py-1 text-center font-telemetry-sm text-telemetry-sm text-on-surface-variant hover:text-on-surface">5×</button>
                  {" "}
                  <button className="flex-1 py-1 text-center font-telemetry-sm text-telemetry-sm text-on-surface-variant hover:text-on-surface">10×</button>
                  {" "}
                  <button className="flex-1 py-1 text-center font-telemetry-sm text-telemetry-sm text-on-surface-variant hover:text-on-surface">20×</button>
                </div>
                {" "}
                {/* Scenarios chips */}
                {" "}
                <div className="flex items-center gap-1 overflow-x-auto pt-1 no-scrollbar">
                  <button className="px-2 py-0.5 rounded-full text-telemetry-sm font-telemetry-sm bg-primary-fixed text-on-primary-fixed border border-primary font-medium shrink-0">Standard Day (ISA)</button>
                  {" "}
                  <button className="px-2 py-0.5 rounded-full text-telemetry-sm font-telemetry-sm bg-surface-container text-on-surface-variant hover:bg-surface-variant shrink-0">High Altitude (6,000 m)</button>
                  {" "}
                  <button className="px-2 py-0.5 rounded-full text-telemetry-sm font-telemetry-sm bg-surface-container text-on-surface-variant hover:bg-surface-variant shrink-0">Extreme Hot Day (45 °C)</button>
                  {" "}
                  <button className="px-2 py-0.5 rounded-full text-telemetry-sm font-telemetry-sm bg-surface-container text-on-surface-variant hover:bg-surface-variant shrink-0">Cold Weather (-20 °C)</button>
                </div>
              </div>
              {" "}
              {/* CAN Bus Status Card (Col 3) */}
              {" "}
              <div className="lg:col-span-3 flex flex-col justify-between bg-surface-container-low p-space-sm rounded border border-outline-variant">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-secondary" data-icon="cable">cable</span>
                    {" "}HIL CAN-BUS 0
                  </span>
                  {" "}
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-surface-container-highest text-secondary font-bold">MIL-SPEC</span>
                </div>
                {" "}
                <div className="font-telemetry-sm text-telemetry-sm text-on-surface space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Interface:</span>
                    {" "}
                    <span className="font-bold">vcan0 · 1 Mbps</span>
                  </div>
                  {" "}
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Throughput:</span>
                    {" "}
                    <span className="text-secondary font-bold">420 frames/sec (0 drops)</span>
                  </div>
                  {" "}
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">HMAC-SHA256:</span>
                    {" "}
                    <span className="text-primary font-bold">OK / Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {" "}
          {/* MAIN SPLIT WORKSPACE: 65% FAULT MATRIX vs 35% DETECTION & TWIN RESPONSE */}
          {" "}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-space-md min-h-0 overflow-hidden">
            {/* ================= LEFT: FAULT INJECTION MATRIX (65% -> 8 cols) ================= */}
            {" "}
            <section className="lg:col-span-8 flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              {/* Matrix Header */}
              {" "}
              <div className="p-space-md border-b border-outline-variant flex items-center justify-between bg-surface-container-low shrink-0">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]" data-icon="electric_bolt">electric_bolt</span>
                  </div>
                  {" "}
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">Fault Injection Matrix</h2>
                    {" "}
                    <p className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">Dynamic Hardware-in-the-Loop perturbation framework · 10 subsystem inject vectors</p>
                  </div>
                </div>
                {" "}
                {/* Batch actions */}
                {" "}
                <div className="flex items-center gap-space-xs">
                  <span className="px-2 py-1 rounded text-telemetry-sm font-telemetry-sm bg-tertiary-container text-on-tertiary-container font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed animate-ping" />
                    {" "}1 FAULT ACTIVE
                  </span>
                  {" "}
                  <button className="px-space-sm h-8 border border-outline-variant bg-surface rounded text-on-surface font-body-sm text-body-sm hover:bg-surface-container transition-colors">Reset All Injections</button>
                </div>
              </div>
              {" "}
              {/* Cards Scrollable Grid (10 Fault Cards) */}
              {" "}
              <div className="flex-1 overflow-y-auto p-space-md grid grid-cols-1 md:grid-cols-2 gap-space-dense">
                {/* CARD 1: Cooling Degradation (ACTIVE) */}
                {" "}
                <div className="bg-surface border-2 border-tertiary rounded-lg p-space-sm flex flex-col justify-between shadow-xs bg-gradient-to-br from-surface to-surface-container-low">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-telemetry-sm text-telemetry-sm font-bold text-tertiary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]" data-icon="device_thermostat">device_thermostat</span>
                        {" "}01 · COOLING DEGRADATION
                      </span>
                      {" "}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-tertiary text-on-tertiary font-bold tracking-wide animate-pulse">ACTIVE · 18%</span>
                    </div>
                    {" "}
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Heat exchanger airflow blockage / radiator fin fouling.</p>
                    {" "}
                    {/* Parameter Slider Control */}
                    {" "}
                    <div className="mt-space-sm space-y-1 bg-surface-container-lowest p-space-xs rounded border border-outline-variant">
                      <div className="flex justify-between font-telemetry-sm text-telemetry-sm">
                        <span className="text-on-surface-variant">Blockage Ratio:</span>
                        {" "}
                        <span className="text-tertiary font-bold">18% (Ramp: 120s)</span>
                      </div>
                      {" "}
                      <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                        <div className="bg-tertiary h-full rounded-full" style={{width: '36%'}} />
                      </div>
                      {" "}
                      <div className="flex justify-between text-[10px] font-telemetry-sm text-outline">
                        <span>10%</span>
                        {" "}
                        <span>30%</span>
                        {" "}
                        <span>50%</span>
                      </div>
                    </div>
                  </div>
                  {" "}
                  <div className="mt-space-sm flex items-center justify-between pt-space-xs border-t border-outline-variant">
                    <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">Injected: T+00:03:12</span>
                    {" "}
                    <button className="px-space-md h-7 rounded border border-error text-error bg-surface hover:bg-error-container font-telemetry-sm text-telemetry-sm font-bold transition-all">Clear Fault</button>
                  </div>
                </div>
                {" "}
                {/* CARD 2: Injector Abnormality */}
                {" "}
                <div className="bg-surface border border-outline-variant rounded-lg p-space-sm flex flex-col justify-between hover:border-primary transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-telemetry-sm text-telemetry-sm font-bold text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary" data-icon="opacity">opacity</span>
                        {" "}02 · INJECTOR ABNORMALITY
                      </span>
                      {" "}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-surface-container text-on-surface-variant">STANDBY</span>
                    </div>
                    {" "}
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Fuel spray pattern asymmetry & pintle erosion on Cyl 2.</p>
                    {" "}
                    <div className="mt-space-sm font-telemetry-sm text-telemetry-sm text-on-surface-variant bg-surface-container-low p-1.5 rounded">Target: Injector-02 · Profile: Step -25% Mass</div>
                  </div>
                  {" "}
                  <div className="mt-space-sm flex items-center justify-between pt-space-xs border-t border-outline-variant">
                    <span className="font-telemetry-sm text-telemetry-sm text-outline">Latency: &lt;5ms</span>
                    {" "}
                    <button className="px-space-md h-7 rounded bg-primary text-on-primary hover:bg-surface-tint font-telemetry-sm text-telemetry-sm font-bold shadow-xs active:scale-[0.98] transition-all">Inject</button>
                  </div>
                </div>
                {" "}
                {/* CARD 3: Cylinder Misfire */}
                {" "}
                <div className="bg-surface border border-outline-variant rounded-lg p-space-sm flex flex-col justify-between hover:border-primary transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-telemetry-sm text-telemetry-sm font-bold text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary" data-icon="flash_on">flash_on</span>
                        {" "}03 · CYLINDER MISFIRE
                      </span>
                      {" "}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-surface-container text-on-surface-variant">STANDBY</span>
                    </div>
                    {" "}
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Partial ignition drop on Spark Plug A (Cyl 1 & 4 secondary coil).</p>
                    {" "}
                    <div className="mt-space-sm font-telemetry-sm text-telemetry-sm text-on-surface-variant bg-surface-container-low p-1.5 rounded">Dual-plug failover active · Duty: 60% cycle</div>
                  </div>
                  {" "}
                  <div className="mt-space-sm flex items-center justify-between pt-space-xs border-t border-outline-variant">
                    <span className="font-telemetry-sm text-telemetry-sm text-outline">Coil A: Isolated</span>
                    {" "}
                    <button className="px-space-md h-7 rounded bg-primary text-on-primary hover:bg-surface-tint font-telemetry-sm text-telemetry-sm font-bold shadow-xs active:scale-[0.98] transition-all">Inject</button>
                  </div>
                </div>
                {" "}
                {/* CARD 4: Lubrication Issue */}
                {" "}
                <div className="bg-surface border border-outline-variant rounded-lg p-space-sm flex flex-col justify-between hover:border-primary transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-telemetry-sm text-telemetry-sm font-bold text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary" data-icon="oil_barrel">oil_barrel</span>
                        {" "}04 · LUBRICATION ISSUE
                      </span>
                      {" "}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-surface-container text-on-surface-variant">STANDBY</span>
                    </div>
                    {" "}
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Oil cooler bypass valve stuck open or scavenge line pressure drop.</p>
                    {" "}
                    <div className="mt-space-sm font-telemetry-sm text-telemetry-sm text-on-surface-variant bg-surface-container-low p-1.5 rounded">Pressure delta: -1.2 bar · Temp rise: +15°C</div>
                  </div>
                  {" "}
                  <div className="mt-space-sm flex items-center justify-between pt-space-xs border-t border-outline-variant">
                    <span className="font-telemetry-sm text-telemetry-sm text-outline">Regulator: Mech</span>
                    {" "}
                    <button className="px-space-md h-7 rounded bg-primary text-on-primary hover:bg-surface-tint font-telemetry-sm text-telemetry-sm font-bold shadow-xs active:scale-[0.98] transition-all">Inject</button>
                  </div>
                </div>
                {" "}
                {/* CARD 5: Sensor Drift */}
                {" "}
                <div className="bg-surface border border-outline-variant rounded-lg p-space-sm flex flex-col justify-between hover:border-primary transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-telemetry-sm text-telemetry-sm font-bold text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary" data-icon="timeline">timeline</span>
                        {" "}05 · SENSOR DRIFT
                      </span>
                      {" "}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-surface-container text-on-surface-variant">STANDBY</span>
                    </div>
                    {" "}
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Thermocouple CHT-03 +5°C offset bias gradual calibration drift.</p>
                    {" "}
                    <div className="mt-space-sm font-telemetry-sm text-telemetry-sm text-on-surface-variant bg-surface-container-low p-1.5 rounded">Bias: +0.25°C / min · Target: Cyl 3 Head</div>
                  </div>
                  {" "}
                  <div className="mt-space-sm flex items-center justify-between pt-space-xs border-t border-outline-variant">
                    <span className="font-telemetry-sm text-telemetry-sm text-outline">Kalman residual: +0.4σ</span>
                    {" "}
                    <button className="px-space-md h-7 rounded bg-primary text-on-primary hover:bg-surface-tint font-telemetry-sm text-telemetry-sm font-bold shadow-xs active:scale-[0.98] transition-all">Inject</button>
                  </div>
                </div>
                {" "}
                {/* CARD 6: Sensor Total Failure */}
                {" "}
                <div className="bg-surface border border-outline-variant rounded-lg p-space-sm flex flex-col justify-between hover:border-primary transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-telemetry-sm text-telemetry-sm font-bold text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary" data-icon="error_outline">error_outline</span>
                        {" "}06 · SENSOR TOTAL FAILURE
                      </span>
                      {" "}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-surface-container text-on-surface-variant">STANDBY</span>
                    </div>
                    {" "}
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Exhaust Gas Temp (EGT-02) sensor open-circuit / NaN readout.</p>
                    {" "}
                    <div className="mt-space-sm font-telemetry-sm text-telemetry-sm text-on-surface-variant bg-surface-container-low p-1.5 rounded">Output: 0xFFFF (High impedance drop)</div>
                  </div>
                  {" "}
                  <div className="mt-space-sm flex items-center justify-between pt-space-xs border-t border-outline-variant">
                    <span className="font-telemetry-sm text-telemetry-sm text-outline">Failsafe: Twin Synth</span>
                    {" "}
                    <button className="px-space-md h-7 rounded bg-primary text-on-primary hover:bg-surface-tint font-telemetry-sm text-telemetry-sm font-bold shadow-xs active:scale-[0.98] transition-all">Inject</button>
                  </div>
                </div>
                {" "}
                {/* CARD 7: Combustion Instability */}
                {" "}
                <div className="bg-surface border border-outline-variant rounded-lg p-space-sm flex flex-col justify-between hover:border-primary transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-telemetry-sm text-telemetry-sm font-bold text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary" data-icon="mode_heat">mode_heat</span>
                        {" "}07 · COMBUSTION INSTABILITY
                      </span>
                      {" "}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-surface-container text-on-surface-variant">STANDBY</span>
                    </div>
                    {" "}
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Lean blowout condition induced at extreme high altitude climb.</p>
                    {" "}
                    <div className="mt-space-sm font-telemetry-sm text-telemetry-sm text-on-surface-variant bg-surface-container-low p-1.5 rounded">AFR: 16.8:1 · Knock envelope: Marg.</div>
                  </div>
                  {" "}
                  <div className="mt-space-sm flex items-center justify-between pt-space-xs border-t border-outline-variant">
                    <span className="font-telemetry-sm text-telemetry-sm text-outline">Throttle: 82%</span>
                    {" "}
                    <button className="px-space-md h-7 rounded bg-primary text-on-primary hover:bg-surface-tint font-telemetry-sm text-telemetry-sm font-bold shadow-xs active:scale-[0.98] transition-all">Inject</button>
                  </div>
                </div>
                {" "}
                {/* CARD 8: Overheating Trend */}
                {" "}
                <div className="bg-surface border border-outline-variant rounded-lg p-space-sm flex flex-col justify-between hover:border-primary transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-telemetry-sm text-telemetry-sm font-bold text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary" data-icon="thermostat">thermostat</span>
                        {" "}08 · OVERHEATING TREND
                      </span>
                      {" "}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-surface-container text-on-surface-variant">STANDBY</span>
                    </div>
                    {" "}
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Turbo wastegate actuator sluggish response / boost creep.</p>
                    {" "}
                    <div className="mt-space-sm font-telemetry-sm text-telemetry-sm text-on-surface-variant bg-surface-container-low p-1.5 rounded">Manifold MAP: +22 kPa delta limit</div>
                  </div>
                  {" "}
                  <div className="mt-space-sm flex items-center justify-between pt-space-xs border-t border-outline-variant">
                    <span className="font-telemetry-sm text-telemetry-sm text-outline">Actuator: Stiction</span>
                    {" "}
                    <button className="px-space-md h-7 rounded bg-primary text-on-primary hover:bg-surface-tint font-telemetry-sm text-telemetry-sm font-bold shadow-xs active:scale-[0.98] transition-all">Inject</button>
                  </div>
                </div>
                {" "}
                {/* CARD 9: Abnormal Vibration */}
                {" "}
                <div className="bg-surface border border-outline-variant rounded-lg p-space-sm flex flex-col justify-between hover:border-primary transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-telemetry-sm text-telemetry-sm font-bold text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary" data-icon="vibration">vibration</span>
                        {" "}09 · ABNORMAL VIBRATION
                      </span>
                      {" "}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-surface-container text-on-surface-variant">STANDBY</span>
                    </div>
                    {" "}
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Propeller blade aerodynamic unbalance / bearing spalling 1.0× spike.</p>
                    {" "}
                    <div className="mt-space-sm font-telemetry-sm text-telemetry-sm text-on-surface-variant bg-surface-container-low p-1.5 rounded">FFT Peak: 38.2 Hz · Amplitude: 1.8 IPS</div>
                  </div>
                  {" "}
                  <div className="mt-space-sm flex items-center justify-between pt-space-xs border-t border-outline-variant">
                    <span className="font-telemetry-sm text-telemetry-sm text-outline">Sensor: Accel-Z</span>
                    {" "}
                    <button className="px-space-md h-7 rounded bg-primary text-on-primary hover:bg-surface-tint font-telemetry-sm text-telemetry-sm font-bold shadow-xs active:scale-[0.98] transition-all">Inject</button>
                  </div>
                </div>
                {" "}
                {/* CARD 10: Alternator Degradation */}
                {" "}
                <div className="bg-surface border border-outline-variant rounded-lg p-space-sm flex flex-col justify-between hover:border-primary transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-telemetry-sm text-telemetry-sm font-bold text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary" data-icon="battery_alert">battery_alert</span>
                        {" "}10 · ALTERNATOR DEGRADATION
                      </span>
                      {" "}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-surface-container text-on-surface-variant">STANDBY</span>
                    </div>
                    {" "}
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Voltage regulator ripple / avionics bus sag to 11.8V under heavy servo load.</p>
                    {" "}
                    <div className="mt-space-sm font-telemetry-sm text-telemetry-sm text-on-surface-variant bg-surface-container-low p-1.5 rounded">Ripple: 480mV RMS · Bus: 11.8V (Crit: 11.5V)</div>
                  </div>
                  {" "}
                  <div className="mt-space-sm flex items-center justify-between pt-space-xs border-t border-outline-variant">
                    <span className="font-telemetry-sm text-telemetry-sm text-outline">Internal DC/DC</span>
                    {" "}
                    <button className="px-space-md h-7 rounded bg-primary text-on-primary hover:bg-surface-tint font-telemetry-sm text-telemetry-sm font-bold shadow-xs active:scale-[0.98] transition-all">Inject</button>
                  </div>
                </div>
              </div>
            </section>
            {" "}
            {/* ================= RIGHT: LIVE DETECTION & DIGITAL TWIN RESPONSE (35% -> 4 cols) ================= */}
            {" "}
            <section className="lg:col-span-4 flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              {/* Column Header */}
              {" "}
              <div className="p-space-md border-b border-outline-variant bg-surface-container-low shrink-0 flex items-center justify-between">
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Digital Twin Response Log</h2>
                  {" "}
                  <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">Live telemetry observer & isolation telemetry</span>
                </div>
                {" "}
                <span className="material-symbols-outlined text-primary text-[20px]" data-icon="deployed_code_history">deployed_code_history</span>
              </div>
              {" "}
              {/* Body Content: Analytics Gauges + Chronological Event Log */}
              {" "}
              <div className="flex-1 overflow-y-auto p-space-md space-y-space-md">
                {/* RESIDUAL TRACKING & KALMAN INNOVATION SCORE */}
                {" "}
                <div className="bg-surface border border-outline-variant rounded-lg p-space-sm space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">RESIDUAL KALMAN INNOVATION</span>
                    {" "}
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-telemetry-sm bg-tertiary-container text-on-tertiary-container font-bold">THRESHOLD EXCEEDED</span>
                  </div>
                  {" "}
                  {/* Mini-gauge visual readout */}
                  {" "}
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="font-telemetry-xl text-telemetry-xl text-tertiary font-bold">0.74</span>
                      {" "}
                      <span className="font-telemetry-sm text-telemetry-sm text-outline">/ 1.00</span>
                    </div>
                    {" "}
                    <div className="text-right font-telemetry-sm text-telemetry-sm">
                      <span className="text-outline">Baseline:</span>
                      {" "}
                      <span className="text-on-surface font-semibold">0.08</span>
                      {" "}
                      <span className="text-tertiary font-bold ml-1">(Lim 0.65)</span>
                    </div>
                  </div>
                  {" "}
                  {/* Bar gauge display */}
                  {" "}
                  <div className="relative w-full bg-surface-container h-3 rounded-full overflow-hidden">
                    {/* Limit Marker */}
                    {" "}
                    <div className="absolute top-0 bottom-0 w-[2px] bg-on-surface z-10" style={{left: '65%'}} title="Alarm Threshold: 0.65" />
                    {" "}
                    {/* Innovation Fill */}
                    {" "}
                    <div className="bg-tertiary h-full rounded-full transition-all duration-500" style={{width: '74%'}} />
                  </div>
                  {" "}
                  <div className="flex justify-between text-[9px] font-telemetry-sm text-outline">
                    <span>0.00 (Nominal)</span>
                    {" "}
                    <span className="text-on-surface font-semibold">Alarm: 0.65</span>
                    {" "}
                    <span>1.00 (Divergence)</span>
                  </div>
                </div>
                {" "}
                {/* MODEL PARAMETERS LIVE CONVERGENCE MONITOR */}
                {" "}
                <div className="bg-surface border border-outline-variant rounded-lg p-space-sm space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">MODEL PARAMETERS CONVERGENCE</span>
                    {" "}
                    <span className="font-telemetry-sm text-telemetry-sm text-secondary font-bold">L-M Solver: 18 iter</span>
                  </div>
                  {" "}
                  <div className="space-y-1.5 text-telemetry-sm font-telemetry-sm">
                    {/* Param 1 */}
                    {" "}
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-on-surface">Radiator Heat Transfer Coeff (U·A)</span>
                        {" "}
                        <span className="text-tertiary font-bold">0.82 (-18.0%)</span>
                      </div>
                      {" "}
                      <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                        <div className="bg-tertiary h-full rounded-full" style={{width: '82%'}} />
                      </div>
                    </div>
                    {" "}
                    {/* Param 2 */}
                    {" "}
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-on-surface">Volumetric Air Efficiency (η_v)</span>
                        {" "}
                        <span className="text-secondary font-bold">0.96 (Nominal)</span>
                      </div>
                      {" "}
                      <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                        <div className="bg-secondary h-full rounded-full" style={{width: '96%'}} />
                      </div>
                    </div>
                    {" "}
                    {/* Param 3 */}
                    {" "}
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-on-surface">Brake Specific Fuel Consumption</span>
                        {" "}
                        <span className="text-on-surface font-bold">285 g/kWh</span>
                      </div>
                      {" "}
                      <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{width: '71%'}} />
                      </div>
                    </div>
                  </div>
                </div>
                {" "}
                {/* REAL-TIME CHRONOLOGICAL EVENT LOG */}
                {" "}
                <div className="space-y-space-sm">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">INCIDENT & ISOLATION TIMELINE</span>
                  {" "}
                  <div className="border-l-2 border-outline-variant pl-space-md space-y-space-md ml-1.5">
                    {/* Entry 1: 14:22:10 INJECTED */}
                    {" "}
                    <div className="relative">
                      <div className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-tertiary border-2 border-surface" />
                      {" "}
                      <div className="flex items-center justify-between">
                        <span className="font-telemetry-sm text-telemetry-sm font-bold text-tertiary">[INJECTED]</span>
                        {" "}
                        <span className="font-telemetry-sm text-telemetry-sm text-outline">14:22:10 UTC</span>
                      </div>
                      {" "}
                      <p className="font-body-sm text-body-sm text-on-surface font-medium mt-0.5">Cooling degradation 18% ramp initiated via HiL bus.</p>
                      {" "}
                      <span className="text-[10px] font-telemetry-sm text-outline">Source: Ground Station Operator</span>
                    </div>
                    {" "}
                    {/* Entry 2: 14:25:22 DETECTED */}
                    {" "}
                    <div className="relative">
                      <div className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-error border-2 border-surface" />
                      {" "}
                      <div className="flex items-center justify-between">
                        <span className="font-telemetry-sm text-telemetry-sm font-bold text-error">[DETECTED]</span>
                        {" "}
                        <span className="font-telemetry-sm text-telemetry-sm text-outline">14:25:22 UTC</span>
                      </div>
                      {" "}
                      <p className="font-body-sm text-body-sm text-on-surface font-medium mt-0.5">Digital Twin anomaly flagged: 'CHT Cyl 3 residual divergence (+6.2 °C)'.</p>
                      {" "}
                      <div className="inline-block mt-1 px-1.5 py-0.5 bg-surface-container-high rounded text-[10px] font-telemetry-sm text-primary font-bold">Detection Latency: 3m 12s</div>
                    </div>
                    {" "}
                    {/* Entry 3: 14:26:05 AI DIAGNOSIS */}
                    {" "}
                    <div className="relative">
                      <div className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-primary border-2 border-surface" />
                      {" "}
                      <div className="flex items-center justify-between">
                        <span className="font-telemetry-sm text-telemetry-sm font-bold text-primary">[AI DIAGNOSIS]</span>
                        {" "}
                        <span className="font-telemetry-sm text-telemetry-sm text-outline">14:26:05 UTC</span>
                      </div>
                      {" "}
                      <p className="font-body-sm text-body-sm text-on-surface font-medium mt-0.5">Fault isolated: Radiator heat exchange efficiency 0.82.</p>
                      {" "}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-telemetry-sm text-secondary font-bold">Confidence: 94.2%</span>
                        {" "}
                        <span className="text-[10px] font-telemetry-sm text-outline">Model: PINN-Prop-v4</span>
                      </div>
                    </div>
                    {" "}
                    {/* Entry 4: 14:27:00 RUL UPDATE */}
                    {" "}
                    <div className="relative">
                      <div className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-on-surface-variant border-2 border-surface" />
                      {" "}
                      <div className="flex items-center justify-between">
                        <span className="font-telemetry-sm text-telemetry-sm font-bold text-on-surface">[RUL UPDATE]</span>
                        {" "}
                        <span className="font-telemetry-sm text-telemetry-sm text-outline">14:27:00 UTC</span>
                      </div>
                      {" "}
                      <p className="font-body-sm text-body-sm text-on-surface font-medium mt-0.5">Remaining Useful Life (RUL) revised from 480 hrs to 412 hrs.</p>
                      {" "}
                      <div className="inline-block mt-1 px-1.5 py-0.5 bg-error-container text-on-error-container rounded text-[10px] font-telemetry-sm font-bold">Δ: -68 flight hours (-14.1%)</div>
                    </div>
                  </div>
                </div>
                {" "}
                {/* Twin Quick Mitigation Presets */}
                {" "}
                <div className="pt-space-xs border-t border-outline-variant">
                  <span className="font-label-caps text-label-caps text-on-surface-variant mb-space-xs block">RECOMMENDED CONTINGENCY</span>
                  {" "}
                  <div className="bg-surface-container-low p-space-sm rounded border border-outline-variant flex items-center justify-between">
                    <div>
                      <div className="font-body-md text-body-md font-semibold text-on-surface">Throttle Limit 78% (Cruise)</div>
                      {" "}
                      <div className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">Prevents CHT escalation beyond 135°C limit</div>
                    </div>
                    {" "}
                    <button className="px-space-sm h-8 bg-primary text-on-primary rounded font-body-sm text-body-sm font-bold hover:bg-surface-tint transition-all">Apply</button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
