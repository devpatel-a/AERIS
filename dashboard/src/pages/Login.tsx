import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { authApi, type FleetTail, type RoleOption, type SystemStatus } from "../auth/api";
import { useAuth } from "../auth/AuthContext";

/** Stitch screen "AeroTwin — Secure Access (Login)". */
export default function Login() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/live-ops";

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [tails, setTails] = useState<FleetTail[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const [role, setRole] = useState("propulsion_engineer");
  const [operatorId, setOperatorId] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [tailId, setTailId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    authApi.roles().then(setRoles).catch(() => undefined);
    authApi
      .fleetTails()
      .then((t) => {
        setTails(t);
        setTailId((cur) => cur || (t.find((x) => x.primary) ?? t[0])?.tail_id || "");
      })
      .catch(() => undefined);
  }, []);

  // Station/bus status + measured round-trip latency, refreshed every 5 s.
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      const t0 = performance.now();
      try {
        const s = await authApi.systemStatus();
        if (!alive) return;
        setLatencyMs(performance.now() - t0);
        setStatus(s);
      } catch {
        if (alive) setStatus(null);
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (session) return <Navigate to={from} replace />;

  const selectedTail = tails.find((t) => t.tail_id === tailId);
  const station = status?.station;
  const rateHz = status ? Math.round(status.link.rate_hz) : null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(operatorId, pin, role, tailId || null);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="icon-base-20 bg-[#F5F7FA] text-on-surface font-body-md text-body-md min-h-screen flex flex-col justify-between select-none relative overflow-x-hidden antialiased">
      <div className="absolute inset-0 pointer-events-none bg-telemetry-grid z-0" />
      <div className="absolute inset-0 pointer-events-none bg-radar-concentric z-0" />
      <BlueprintWatermark />

      {/* Top Security Classification Bar */}
      <header className="w-full bg-[#131B2E] text-white z-10 px-margin py-1.5 flex items-center justify-between border-b border-slate-700 shadow-sm">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-amber-400 text-[18px]">lock</span>
          <span className="font-telemetry-sm text-telemetry-sm tracking-widest uppercase font-semibold text-slate-100">
            {station?.classification ?? ""}
          </span>
        </div>
        <div className="flex items-center gap-space-lg text-slate-300 font-telemetry-sm text-telemetry-sm">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${status?.bus.ready ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
            <span className="text-slate-200">
              GCS NODE: {status ? (status.bus.ready ? "OK" : "FAULT") : "OFFLINE"}
              {rateHz !== null ? ` (${rateHz} Hz)` : ""}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-slate-400">verified_user</span>
            <span>{station?.gateway ?? ""}</span>
          </div>
          <span className="text-slate-400">SESSION: {status?.session.state ?? "IDLE"}</span>
        </div>
      </header>

      <main className="w-full max-w-[1440px] mx-auto px-margin py-space-xl flex-1 flex flex-col justify-center items-center z-10">
        <div className="w-full max-w-[620px] bg-surface-container-lowest rounded-xl border border-[#E3E8EF] shadow-aerospace p-8 transition-all relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-t-xl" />

          {/* Brand & System Header */}
          <div className="flex items-start justify-between pb-space-lg border-b border-[#E3E8EF]">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center border border-[#CBD5E1] text-primary">
                <span className="material-symbols-outlined text-[30px]">4g_mobiledata</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">AeroTwin</h1>
                  {station && (
                    <span className="bg-[#EEF4FF] text-primary border border-primary/20 px-2 py-0.5 rounded text-[11px] font-telemetry-sm uppercase font-semibold">
                      {station.software_tag}
                    </span>
                  )}
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant font-medium mt-0.5">
                  Tactical Propulsion Digital Twin &amp; Health Management System
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end pt-1">
              {status?.bus.ready ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span className="font-telemetry-sm text-telemetry-sm text-emerald-800 font-semibold">BUS READY</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                  <span className="font-telemetry-sm text-telemetry-sm text-red-800 font-semibold">BUS OFFLINE</span>
                </div>
              )}
            </div>
          </div>

          {/* Security Compliance Assurance Badge */}
          <div className="my-space-md py-2 px-3 bg-[#F8FAFC] border border-[#E3E8EF] rounded-lg flex items-center justify-between text-slate-700">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">security</span>
              <span className="font-label-caps text-label-caps tracking-wider text-slate-600 uppercase">{station?.compliance ?? ""}</span>
            </div>
            <div className="flex items-center gap-1 font-telemetry-sm text-telemetry-sm text-slate-500">
              <span className="material-symbols-outlined text-[14px] text-emerald-600">lock_clock</span>
              <span>{station ? `Crypto Level ${station.crypto_level}` : ""}</span>
            </div>
          </div>

          <form className="space-y-space-md mt-4" onSubmit={onSubmit}>
            {/* Role Selector Group */}
            <div>
              <label className="block font-label-caps text-label-caps text-slate-600 uppercase mb-2">Select Operational Clearance Role</label>
              <div className="grid grid-cols-1 gap-2" role="radiogroup">
                {roles.map((r) =>
                  r.role === role ? (
                    <label key={r.role} className="relative flex items-center justify-between p-2.5 rounded-lg border-2 border-primary bg-[#F0F5FF] cursor-pointer shadow-sm">
                      <div className="flex items-center gap-3">
                        <input checked className="w-4 h-4 text-primary border-primary focus:ring-primary" name="operator_role" type="radio" value={r.role} onChange={() => setRole(r.role)} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-headline-sm text-headline-sm font-semibold text-primary">{r.label}</span>
                            <span className="bg-primary text-white text-[10px] font-telemetry-sm px-1.5 py-0.2 rounded font-semibold tracking-wider">ACTIVE INTENT</span>
                          </div>
                          <div className="font-body-sm text-body-sm text-slate-600 font-medium">{r.description}</div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-primary text-[20px]">{r.icon}</span>
                    </label>
                  ) : (
                    <label key={r.role} className="relative flex items-center justify-between p-2.5 rounded-lg border border-[#E3E8EF] bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <input checked={false} className="w-4 h-4 text-primary border-slate-300 focus:ring-primary" name="operator_role" type="radio" value={r.role} onChange={() => setRole(r.role)} />
                        <div>
                          <div className="font-headline-sm text-headline-sm text-on-surface">{r.label}</div>
                          <div className="font-body-sm text-body-sm text-slate-500">{r.description}</div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 text-[18px]">{r.icon}</span>
                    </label>
                  ),
                )}
              </div>
            </div>

            {/* Identity & Credential Fields */}
            <div className="grid grid-cols-1 gap-3.5 pt-1">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-label-caps text-label-caps text-slate-600 uppercase" htmlFor="dod-id">Operator / DoD ID Number</label>
                  <span className="font-telemetry-sm text-telemetry-sm text-slate-400">EDIPI FORMAT</span>
                </div>
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <span className="material-symbols-outlined text-[19px]">badge</span>
                  </div>
                  <input
                    className="block w-full rounded-md border-[#CBD5E1] pl-10 pr-3 py-2 text-on-surface font-telemetry-md text-telemetry-md focus:border-primary focus:ring-primary sm:text-sm bg-white"
                    id="dod-id" placeholder="MIL-XXXX-XXXX" type="text" autoComplete="username" required
                    value={operatorId} onChange={(e) => setOperatorId(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-label-caps text-label-caps text-slate-600 uppercase" htmlFor="sec-pin">Security Credential / CAC PIN</label>
                  <span className="font-telemetry-sm text-telemetry-sm text-slate-400">6-8 NUMERIC DIGITS</span>
                </div>
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <span className="material-symbols-outlined text-[19px]">key</span>
                  </div>
                  <input
                    ref={pinRef}
                    className="block w-full rounded-md border-[#CBD5E1] pl-10 pr-10 py-2 text-on-surface font-telemetry-md text-telemetry-md focus:border-primary focus:ring-primary sm:text-sm bg-white"
                    id="sec-pin" placeholder="Enter PIN" type={showPin ? "text" : "password"} autoComplete="current-password"
                    inputMode="numeric" pattern="[0-9]{6,8}" minLength={6} maxLength={8} required
                    value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  />
                  <button className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600" type="button" onClick={() => setShowPin((v) => !v)} aria-label={showPin ? "Hide PIN" : "Show PIN"}>
                    <span className="material-symbols-outlined text-[18px]">{showPin ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>
              {/* CAC / Hardware Token Quick-Select Action (no hardware reader: moves focus to the PIN) */}
              <div className="pt-0.5">
                <button
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-dashed border-slate-300 hover:border-primary rounded-md bg-slate-50 hover:bg-[#EEF4FF] transition text-slate-700 hover:text-primary font-body-md text-body-md"
                  type="button" onClick={() => pinRef.current?.focus()}
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">cloud_download</span>
                  <span className="font-medium">Insert CAC or Security Token (PIV Reader Active)</span>
                </button>
              </div>
              <div className="pt-1">
                <label className="block font-label-caps text-label-caps text-slate-600 uppercase mb-1" htmlFor="engine-assignment">Assigned Airframe &amp; Propulsion Node</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                    <span className="material-symbols-outlined text-[19px]">flight</span>
                  </div>
                  <select
                    className="block w-full rounded-md border-[#CBD5E1] pl-10 pr-8 py-2 text-on-surface font-telemetry-md text-telemetry-md focus:border-primary focus:ring-primary sm:text-sm bg-white"
                    id="engine-assignment" value={tailId} onChange={(e) => setTailId(e.target.value)}
                  >
                    {tails.map((t) => (
                      <option key={t.tail_id} value={t.tail_id}>
                        {t.tail_id} ({t.engine_class} · SN {t.engine_serial}{t.unit ? ` · ${t.unit}` : ""})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                className="w-full h-11 bg-primary-container text-white font-headline-sm text-headline-sm font-semibold rounded-md shadow hover:bg-[#1748D1] active:bg-[#143DAF] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all flex items-center justify-center gap-2 tracking-wide disabled:opacity-70"
                type="submit" disabled={submitting}
              >
                <span className="material-symbols-outlined text-[20px]">fingerprint</span>
                <span>{submitting ? "AUTHENTICATING…" : "AUTHENTICATE & ENTER GROUND CONTROL STATION"}</span>
              </button>
              {error && (
                <div role="alert" className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E3E8EF] flex items-center justify-between text-slate-500 font-telemetry-sm text-telemetry-sm">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${status?.bus.ready ? "bg-emerald-500" : "bg-red-500"}`} />
                <span>Sync: {rateHz ?? "--"} Hz {station?.avionics_bus ?? ""}</span>
              </div>
              <div>
                <span>Station: <strong className="text-slate-700">{station?.station_id ?? "--"}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-slate-400">lock</span>
                <span>{station?.link_cipher ?? ""}</span>
              </div>
            </div>
          </form>
        </div>

        {/* Auxiliary GCS diagnostics bar */}
        <div className="w-full max-w-[620px] mt-4 flex items-center justify-between px-2 text-slate-500 font-telemetry-sm text-telemetry-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-primary" />
            <span className="uppercase">Standby Engine Monitor: {selectedTail?.engine_monitor_label ?? "--"}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>LATENCY: {latencyMs !== null ? `${Math.round(latencyMs)}ms` : "--"}</span>
            <span>LINK MARGIN: {status ? `${status.link.margin_db >= 0 ? "+" : ""}${status.link.margin_db.toFixed(1)} dB` : "--"}</span>
          </div>
        </div>
      </main>

      <footer className="w-full bg-[#EAEDFF]/60 border-t border-slate-200 py-3 px-margin z-10 text-center">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-slate-600 font-body-sm text-body-sm">
          <div className="flex items-center gap-2 text-left">
            <span className="material-symbols-outlined text-amber-600 text-[18px]">warning</span>
            <span>
              <strong>RESTRICTED MILITARY SYSTEM:</strong> {station?.restricted_notice ?? ""}
            </span>
          </div>
          <div className="font-telemetry-sm text-telemetry-sm text-slate-500 whitespace-nowrap">
            {station ? `AeroTwin GCS v${station.software_version} · ${station.fips_cert}` : ""}
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Rotax 4-cylinder opposed-architecture blueprint watermark (from the Stitch export). */
function BlueprintWatermark() {
  const fins = (x1: number, x2: number, ys: number[]) => ys.map((y) => <line key={`${x1}-${y}`} x1={x1} x2={x2} y1={y} y2={y} />);
  return (
    <svg className="absolute right-6 top-1/2 -translate-y-1/2 w-[720px] h-[720px] text-slate-300 opacity-20 pointer-events-none z-0" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 800 800">
      <circle cx="400" cy="400" r="90" strokeDasharray="4 4" />
      <circle cx="400" cy="400" r="160" />
      <circle cx="400" cy="400" r="280" strokeDasharray="2 4" />
      <line strokeDasharray="8 4" x1="40" x2="760" y1="400" y2="400" />
      <line strokeDasharray="8 4" x1="400" x2="400" y1="40" y2="760" />
      <rect height="90" rx="4" width="170" x="140" y="290" />
      <rect height="90" rx="4" width="170" x="140" y="420" />
      <rect height="90" rx="4" width="170" x="490" y="290" />
      <rect height="90" rx="4" width="170" x="490" y="420" />
      {fins(120, 140, [305, 325, 345, 365, 435, 455, 475, 495])}
      {fins(660, 680, [305, 325, 345, 365, 435, 455, 475, 495])}
      <path d="M400,240 C340,160 460,120 400,60" strokeDasharray="3 3" />
      <circle cx="400" cy="200" r="34" />
      <circle cx="225" cy="275" r="5" />
      <circle cx="225" cy="525" r="5" />
      <circle cx="575" cy="275" r="5" />
      <circle cx="575" cy="525" r="5" />
    </svg>
  );
}
