/* Stitch screen "AeroTwin — Screen 5: Mission Planner (Go / No-Go)", bound to the twin planner.
 *
 * Laid out as a mission-planning workspace in the order the planner is used:
 * 1 configure (the Stitch "Flight Parameter Inputs" card) -> 2 plan the route ->
 * 3 route calculations -> 4 GO / NO-GO (the Stitch verdict, profile and curves) ->
 * 5 save & fly (sticky action bar). Every block reuses the Stitch card, input,
 * slider, status-chip and list-row styles. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useStationState } from "../app/StationContext";
import { ApiError, request } from "../lib/api";
import { useLiveSocket } from "../lib/useLiveSocket";
import { usePoll } from "../lib/usePoll";
import { ago, fmt, fmtHms, kToC } from "../lib/units";

const CARD = "bg-surface-container-lowest border border-outline-variant rounded-xl p-margin-compact shadow-sm";
const SEG_LABEL: Record<string, string> = {
  taxi: "TAXI", takeoff: "TAKEOFF", climb: "CLIMB", cruise: "CRUISE", loiter: "LOITER", descent: "DESCENT", landing: "LANDING",
  ingress: "INGRESS", egress: "EGRESS", cap_station: "CAP STATION", transit: "TRANSIT", search_pattern: "SEARCH PATTERN",
  transit_home: "TRANSIT HOME", relay_orbit: "RELAY ORBIT", ew_orbit: "EW ORBIT", cruise_high: "CRUISE HIGH",
  loiter_slow: "LOITER SLOW", pattern_work: "PATTERN WORK", touch_and_go: "TOUCH & GO", hold: "HOLD",
};
const INPUT = "w-full h-9 px-space-sm bg-surface-container-lowest border border-outline-variant rounded text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const SELECT = `${INPUT} pl-space-md pr-space-xl appearance-none cursor-pointer truncate`;
const BTN2 = "h-9 px-3 whitespace-nowrap inline-flex items-center justify-center gap-1.5 bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-body-sm font-semibold text-on-surface hover:bg-surface-container hover:border-outline transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface-container-lowest";
const CELL = "w-full h-8 px-1.5 bg-surface-container-lowest border border-outline-variant rounded font-telemetry-sm text-telemetry-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const SETUP_FIELDS = new Set(["name", "code", "tail_id", "template_id", "cruise_altitude_m", "duration_h", "surface_temp_c", "airspeed_ktas", "power_pct_mcp"]);

interface Waypoint {
  name: string;
  east_km: number;
  north_km: number;
  altitude_m: number | null;
  airspeed_ktas: number | null;
  hold_min: number;
  station: boolean;
}

interface Form {
  plan_id: string | null;
  name: string;
  code: string;
  tail_id: string | null;
  mission_id: string; // mission type (preset template)
  cruise_altitude_m: number;
  duration_h: number;
  surface_temp_c: number;
  airspeed_ktas: number;
  power_pct_mcp: number;
  use_current_health: boolean;
  waypoints: Waypoint[];
}

interface Issue { level: "error" | "warning" | "info"; field: string; text: string; waypoint: number | null }

function hm(s: number): string {
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}
function dur(s: number): string {
  return s < 3600 ? `${Math.round(s / 60)}m` : `${fmt(s / 3600, s % 3600 ? 1 : 0)}h`.replace(".0h", "h");
}
function hhmm(s: number | null | undefined): string {
  return s == null ? "--" : fmtHms(s).slice(0, 5);
}
/** Form fields that define the mission (what save/simulate compare). */
const essence = (f: Form | null) => (f ? JSON.stringify({ ...f, plan_id: undefined }) : "");

function presetForm(p: any, keep: Partial<Form>): Form {
  return {
    plan_id: null, name: "", code: "", tail_id: null, waypoints: [], use_current_health: true, ...keep,
    mission_id: p.mission_id,
    cruise_altitude_m: Math.round(p.cruise_altitude_m / 50) * 50,
    duration_h: Math.round(p.duration_h * 2) / 2,
    surface_temp_c: Math.round(p.surface_temp_c),
    airspeed_ktas: Math.round(p.airspeed_ktas),
    power_pct_mcp: Math.round(p.power_pct_mcp),
  };
}

function planForm(plan: any): Form {
  const s = plan.spec;
  return {
    plan_id: plan.plan_id, name: s.name, code: s.code, tail_id: s.tail_id, mission_id: s.template_id,
    cruise_altitude_m: s.cruise_altitude_m, duration_h: s.duration_h, surface_temp_c: s.surface_temp_c,
    airspeed_ktas: s.airspeed_ktas, power_pct_mcp: s.power_pct_mcp, use_current_health: s.use_current_health,
    waypoints: s.waypoints.map((w: any) => ({ ...w })),
  };
}

const errText = (e: unknown) => {
  if (e instanceof ApiError) {
    try {
      const d = JSON.parse(e.detail);
      return d.message ? `${d.message}${d.issues?.length ? ` ${d.issues.map((i: Issue) => i.text).join(" ")}` : ""}` : e.detail;
    } catch {
      return e.detail;
    }
  }
  return e instanceof Error ? e.message : String(e);
};

export default function MissionPlanner() {
  const { session } = useAuth();
  const { latest } = useLiveSocket();
  const { tails } = useStationState();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const liveTail = latest?.context?.tail_id ?? session?.tail_id ?? null;
  const presets = usePoll(() => request<any[]>("/api/planner/presets"), 0).data ?? [];
  const envelope = usePoll(() => request<any>("/api/planner/config"), 0).data;
  const plansPoll = usePoll(() => request<any>("/api/planner/plans"), 15000);
  const plans: any[] = plansPoll.data?.plans ?? [];

  const [form, setForm] = useState<Form | null>(null);
  const [saved, setSaved] = useState<Form | null>(null); // last saved/loaded version of the current plan
  const [env, setEnv] = useState<any>(null);
  const [check, setCheck] = useState<any>(null); // /api/planner/validate
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [resultKey, setResultKey] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; kind: "ok" | "error" } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null); // key of an action awaiting a second click
  const [preview, setPreview] = useState<"condition" | "maintenance" | null>(null);
  const [selWp, setSelWp] = useState<number | null>(null);
  const sections = { setup: useRef<HTMLDivElement>(null), route: useRef<HTMLDivElement>(null), verdict: useRef<HTMLDivElement>(null), plans: useRef<HTMLDivElement>(null) };

  const dirty = form != null && essence(form) !== essence(saved ?? (form.plan_id ? null : form));
  const stale = result != null && form != null && resultKey !== essence(form);
  const armConfirm = (key: string) => {
    setConfirm(key);
    setTimeout(() => setConfirm((c) => (c === key ? null : c)), 5000);
  };
  const defaultForm = useCallback(
    () => presetForm(presets.find((p) => p.mission_id === "isr_18h_endurance") ?? presets[0], { tail_id: liveTail }),
    [presets, liveTail],
  );

  // Initial form: ?plan= deep link, otherwise the default ISR mission on the signed-in airframe.
  useEffect(() => {
    if (form || !presets.length) return;
    const planId = search.get("plan");
    if (planId) {
      request<any>(`/api/planner/plans/${planId}`)
        .then((p) => {
          const f = planForm(p);
          setForm(f);
          setSaved(f);
        })
        .catch(() => setForm(defaultForm()));
      return;
    }
    setForm(defaultForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presets]);

  const body = useMemo(() => (form ? JSON.stringify(form) : null), [form]);
  // A user edit clears the last action's message; programmatic loads (save/load/reset) keep theirs.
  const lastBody = useRef<string | null>(null);
  const programmatic = useRef(false);
  useEffect(() => {
    if (lastBody.current != null && body !== lastBody.current && !programmatic.current) setNotice(null);
    programmatic.current = false;
    lastBody.current = body;
  }, [body]);
  const loadForm = (f: Form) => {
    programmatic.current = true;
    setForm(f);
  };
  // Instant feedback: environment factors + validation/route metrics from the backend (debounced).
  useEffect(() => {
    if (!body) return;
    setChecking(true);
    const id = setTimeout(() => {
      request<any>("/api/planner/environment", { method: "POST", body }).then(setEnv).catch(() => undefined);
      request<any>("/api/planner/validate", { method: "POST", body })
        .then(setCheck)
        .catch((e) => setCheck({ valid: false, issues: [{ level: "error", field: "form", text: errText(e), waypoint: null }], metrics: null }))
        .finally(() => setChecking(false));
    }, 250);
    return () => clearTimeout(id);
  }, [body]);

  const issues: Issue[] = check?.issues ?? [];
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const metrics = check?.metrics;
  const blockReason = checking ? "Checking the plan…" : errors.length ? `Fix ${errors.length} validation error${errors.length > 1 ? "s" : ""} first: ${errors[0].text}` : null;

  const run = useCallback(async () => {
    if (!form || !body) return;
    setRunning(true);
    setError(null);
    try {
      setResult(await request<any>("/api/planner/evaluate", { method: "POST", body }));
      setResultKey(essence(form));
      setPreview(null);
      if (form.plan_id) plansPoll.refresh();
    } catch (e) {
      setError(errText(e));
    } finally {
      setRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, body, plansPoll]);

  // Bring the GO / NO-GO analysis into view once a new result has rendered.
  useEffect(() => {
    if (result) sections.verdict.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const applyPreset = (id: string) => {
    const p = presets.find((x) => x.mission_id === id);
    if (p && form) setForm(presetForm(p, { plan_id: form.plan_id, name: form.name, code: form.code, tail_id: form.tail_id, waypoints: form.waypoints, use_current_health: form.use_current_health }));
  };

  async function save() {
    if (!form) return;
    setBusy("save");
    setNotice(null);
    try {
      const plan = await request<any>(form.plan_id ? `/api/planner/plans/${form.plan_id}` : "/api/planner/plans", {
        method: form.plan_id ? "PUT" : "POST", body: JSON.stringify(form),
      });
      const f = planForm(plan);
      loadForm(f);
      setSaved(f);
      setSearch({ plan: plan.plan_id }, { replace: true });
      setNotice({ kind: "ok", text: `${plan.plan_id} · ${plan.code} saved (mission ${plan.mission_id}).` });
      plansPoll.refresh();
    } catch (e) {
      setNotice({ kind: "error", text: errText(e) });
    } finally {
      setBusy(null);
    }
  }

  function loadPlan(plan: any) {
    if (dirty && confirm !== `load-${plan.plan_id}`) {
      armConfirm(`load-${plan.plan_id}`);
      setNotice({ kind: "error", text: `Unsaved changes — click ${plan.code} again to discard them and load it.` });
      return;
    }
    const f = planForm(plan);
    loadForm(f);
    setSaved(f);
    setSelWp(null);
    setConfirm(null);
    setResult(null);
    setResultKey("");
    setNotice({ kind: "ok", text: `${plan.plan_id} · ${plan.code} loaded.` });
    setSearch({ plan: plan.plan_id }, { replace: true });
    sections.setup.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function reset() {
    if (!form) return;
    if (confirm !== "reset") {
      armConfirm("reset");
      return;
    }
    setConfirm(null);
    loadForm(defaultForm());
    setSaved(null);
    setResult(null);
    setResultKey("");
    setError(null);
    setNotice({ kind: "ok", text: "Planner reset to the default ISR mission." });
    setSelWp(null);
    setSearch({}, { replace: true });
  }

  async function removePlan(plan: any) {
    if (confirm !== `del-${plan.plan_id}`) {
      armConfirm(`del-${plan.plan_id}`);
      return;
    }
    setConfirm(null);
    setBusy(`del-${plan.plan_id}`);
    try {
      await request<any>(`/api/planner/plans/${plan.plan_id}`, { method: "DELETE" });
      setNotice({ kind: "ok", text: `${plan.plan_id} deleted.` });
      if (form?.plan_id === plan.plan_id) {
        set({ plan_id: null });
        setSaved(null);
        setSearch({}, { replace: true });
      }
      plansPoll.refresh();
    } catch (e) {
      setNotice({ kind: "error", text: errText(e) });
    } finally {
      setBusy(null);
    }
  }

  const activePlan = plans.find((p) => p.plan_id === form?.plan_id);
  const liveRunning = latest?.mode === "LIVE" && latest?.context;
  async function fly() {
    if (!form?.plan_id || !activePlan) return;
    const needConfirm = liveRunning || result?.verdict === "NO-GO";
    if (needConfirm && confirm !== "fly") {
      armConfirm("fly");
      return;
    }
    setConfirm(null);
    setBusy("fly");
    try {
      await request<any>("/api/live/start", {
        method: "POST",
        body: JSON.stringify({ mission_id: activePlan.mission_id, tail_id: form.tail_id, speed: 20 }),
      });
      navigate("/simulation-control");
    } catch (e) {
      setNotice({ kind: "error", text: errText(e) });
      setBusy(null);
    }
  }
  const saveBlock = blockReason ?? (form?.plan_id && !dirty ? "No unsaved changes" : null);
  const flyBlock = blockReason ?? (!form?.plan_id ? "Save the mission first" : dirty ? "Save your changes first" : null);
  const flyConfirmText = confirm === "fly" ? (liveRunning ? "Launching replaces the active flight — click Confirm Launch." : "The twin predicts NO-GO — click Confirm Launch to fly it in simulation anyway.") : null;

  const verdict = result && !stale ? result.verdict : null;
  const lastVerdict = activePlan && !dirty ? activePlan.last_verdict : null;
  const steps: Step[] = form ? [
    { n: 1, label: "Configure", target: sections.setup, ...(errors.some((i) => SETUP_FIELDS.has(i.field)) ? { tone: "error", value: `${errors.filter((i) => SETUP_FIELDS.has(i.field)).length} to fix` } : { tone: "done", value: form.code || "ready" }) },
    { n: 2, label: "Route", target: sections.route, ...(errors.some((i) => i.field === "waypoint" || i.field === "waypoints") ? { tone: "error", value: "check waypoints" } : { tone: form.waypoints.length ? "done" : "idle", value: form.waypoints.length ? `${form.waypoints.length} WPTS` : "station orbit" }) },
    { n: 3, label: "Calculations", target: sections.route, tone: metrics?.total_s != null ? "done" : checking ? "idle" : "error", value: metrics?.total_s != null ? `${fmt(metrics.total_s / 3600, 1)}h${metrics.route_km != null ? ` ${fmt(metrics.route_km)}km` : ""}` : checking ? "updating" : "blocked" },
    { n: 4, label: "GO/NO-GO", target: sections.verdict, tone: running ? "idle" : verdict === "GO" ? "done" : verdict === "CAUTION" ? "warn" : verdict === "NO-GO" ? "error" : "idle", value: running ? "running" : verdict ?? (stale ? "re-run" : lastVerdict ? `saved ${lastVerdict}` : "not run") },
    { n: 5, label: "Save & Fly", target: sections.plans, tone: form.plan_id && !dirty ? "done" : form.plan_id ? "warn" : "idle", value: form.plan_id ? (dirty ? "unsaved edits" : form.plan_id) : "not saved" },
  ] : [];

  return (
    <main className="flex-1 overflow-y-auto bg-background planner-range">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-gutter px-margin pb-margin">
        <div className="flex flex-wrap items-center justify-between gap-space-md border-b border-outline-variant pb-space-md pt-margin">
          <div className="flex items-center gap-space-md">
            <h1 className="text-headline-lg font-headline-lg text-on-surface tracking-tight">Mission Planner (GO / NO-GO)</h1>
            <span className="px-space-sm py-0.5 rounded-full text-telemetry-sm font-telemetry-sm bg-surface-container-high text-primary border border-primary/20">PRE-FLIGHT SIMULATION RUNNER</span>
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Twin Model Version:</span>
            <span className="font-telemetry-sm text-telemetry-sm bg-surface-container px-space-sm py-1 rounded text-on-surface border border-outline-variant">{result?.twin_model_version ?? "--"}</span>
          </div>
        </div>

        {form && (
          <ActionBar
            steps={steps} running={running} busy={busy} confirm={confirm} dirty={dirty} form={form}
            run={run} save={save} fly={fly} reset={reset} runBlock={blockReason} saveBlock={saveBlock} flyBlock={flyBlock}
            message={confirm === "reset" ? { kind: "warn", text: dirty ? "Unsaved changes will be lost — click Confirm Reset to restore the default mission." : "Click Confirm Reset to restore the default mission." }
              : flyConfirmText ? { kind: "warn", text: flyConfirmText }
              : notice ? { kind: notice.kind, text: notice.text }
              : error ? { kind: "error", text: error }
              : blockReason && !checking ? { kind: "error", text: `⚠ ${blockReason}` }
              : warnings.length && !checking ? { kind: "warn", text: `Ready with ${warnings.length} warning${warnings.length > 1 ? "s" : ""}: ${warnings[0].text}` } : null}
          />
        )}

        {form && (
          <div ref={sections.setup} className="scroll-mt-32">
            <SetupCard form={form} set={set} presets={presets} applyPreset={applyPreset} tails={tails} env={env} envelope={envelope} metrics={metrics} issues={issues} />
          </div>
        )}

        {form && (
          <div ref={sections.route} className="scroll-mt-32">
            <RouteCard form={form} set={set} metrics={metrics} issues={issues} envelope={envelope} selWp={selWp} setSelWp={setSelWp} checking={checking} />
          </div>
        )}

        {form && (
          <div ref={sections.plans} className="grid grid-cols-12 gap-gutter items-start scroll-mt-32">
            <div className="col-span-12 lg:col-span-6">
              <ValidationCard issues={issues} errors={errors} warnings={warnings} checking={checking} airframe={metrics?.airframe} onSelectWp={(i) => { setSelWp(i); sections.route.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <PlansCard plans={plans} current={form.plan_id} dirty={dirty} confirm={confirm} busy={busy} onLoad={loadPlan} onDelete={removePlan} lastVerdict={lastVerdict} />
            </div>
          </div>
        )}

        <div ref={sections.verdict} className="flex flex-col gap-gutter scroll-mt-32">
          <div className="flex items-center gap-space-xs border-b border-outline-variant pb-space-sm">
            <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-[11px] font-bold flex items-center justify-center">4</span>
            <span className="text-headline-sm font-headline-sm text-on-surface">Twin GO / NO-GO Analysis</span>
            <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant ml-space-xs">Full-mission digital-twin simulation of the configured plan</span>
          </div>
          {stale && !running && (
            <div className="p-space-sm rounded-lg border border-[#FDE68A] bg-[#FFFBEB] flex items-center justify-between gap-space-sm">
              <span className="flex items-center gap-1.5 font-body-sm text-body-sm text-[#B45309]">
                <span className="material-symbols-outlined text-[16px]">history</span>
                Parameters changed since this simulation — the verdict below is for the previous configuration.
              </span>
              <button className="text-telemetry-sm font-telemetry-sm font-bold text-primary hover:underline disabled:opacity-50 disabled:no-underline" disabled={!!blockReason} onClick={run}>Re-run</button>
            </div>
          )}
          <div className="grid grid-cols-12 gap-gutter items-start">
            <div className="col-span-12 lg:col-span-5">
              <Verdict result={result} running={running} error={error} preview={preview} setPreview={setPreview} stale={stale} />
            </div>
            <div className="col-span-12 lg:col-span-7 flex flex-col gap-gutter">
              {result ? (
                <>
                  <ProfileChart result={result} />
                  <Curves result={result} />
                </>
              ) : (
                <div className={`${CARD} font-body-sm text-body-sm text-on-surface-variant`}>
                  The mission flight profile, thermal risk envelope and predicted parametric curves appear here after <strong className="text-on-surface">Run Twin Simulation</strong>.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------- workflow bar */
interface Step { n: number; label: string; tone: "done" | "error" | "warn" | "idle"; value: string; target: React.RefObject<HTMLDivElement> }
const STEP_TONE: Record<Step["tone"], { chip: string; dot: string }> = {
  done: { chip: "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]", dot: "bg-secondary" },
  error: { chip: "bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]", dot: "bg-error" },
  warn: { chip: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]", dot: "bg-[#F59E0B]" },
  idle: { chip: "bg-surface-container text-on-surface-variant border-outline-variant", dot: "bg-outline" },
};

function ActionBar(p: {
  steps: Step[]; running: boolean; busy: string | null; confirm: string | null; dirty: boolean; form: Form;
  run: () => void; save: () => void; fly: () => void; reset: () => void;
  runBlock: string | null; saveBlock: string | null; flyBlock: string | null;
  message: { kind: "ok" | "error" | "warn"; text: string } | null;
}) {
  return (
    <div className="sticky top-0 z-30 -mx-margin px-margin py-space-sm bg-background/95 backdrop-blur border-b border-outline-variant">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-space-md py-space-sm shadow-sm flex flex-col gap-space-sm">
        <nav aria-label="Planning workflow" className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {p.steps.map((s, i) => {
            const t = STEP_TONE[s.tone];
            return (
              <span key={s.n} className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => s.target.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full border text-telemetry-sm font-telemetry-sm whitespace-nowrap hover:shadow-xs transition-shadow ${t.chip}`}
                  title={`Go to ${s.label}`}
                >
                  <span className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${t.dot}`}>{s.tone === "done" ? "✓" : s.n}</span>
                  <span className="font-semibold uppercase">{s.label}</span>
                  <span className="opacity-80">{s.value}</span>
                </button>
                {i < p.steps.length - 1 && <span className="material-symbols-outlined text-[14px] text-outline shrink-0">chevron_right</span>}
              </span>
            );
          })}
        </nav>
        <div className="flex items-center justify-between gap-space-sm border-t border-outline-variant/60 pt-space-sm">
          <p className={`min-w-0 flex-1 truncate font-telemetry-sm text-telemetry-sm ${!p.message ? "text-on-surface-variant" : p.message.kind === "error" ? "text-error" : p.message.kind === "warn" ? "text-[#B45309]" : "text-secondary"}`} title={p.message?.text}>
            {p.message ? p.message.text : "Plan is valid — run the twin simulation, save it, or fly it in Simulation Control."}
          </p>
          <div className="flex items-center gap-space-xs shrink-0">
          <button className={`${BTN2} ${p.confirm === "reset" ? "border-error text-error" : ""}`} onClick={p.reset} title="Restore the default ISR mission (asks to confirm)">
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            {p.confirm === "reset" ? "Confirm Reset" : "Reset"}
          </button>
          <button className={BTN2} disabled={!!p.saveBlock || p.busy === "save"} onClick={p.save} title={p.saveBlock ?? (p.form.plan_id ? `Save changes to ${p.form.plan_id}` : "Save this mission plan")}>
            <span className={`material-symbols-outlined text-[16px] ${p.busy === "save" ? "animate-spin" : ""}`}>{p.busy === "save" ? "progress_activity" : "save"}</span>
            {p.form.plan_id ? "Save Changes" : "Save Mission"}
          </button>
          <button className={`${BTN2} ${p.confirm === "fly" ? "border-[#F59E0B] text-[#B45309]" : ""}`} disabled={!!p.flyBlock || p.busy === "fly"} onClick={p.fly} title={p.flyBlock ?? "Start the saved plan as the live session and open Simulation Control"}>
            <span className={`material-symbols-outlined text-[16px] ${p.busy === "fly" ? "animate-spin" : ""}`}>{p.busy === "fly" ? "progress_activity" : "flight_takeoff"}</span>
            {p.confirm === "fly" ? "Confirm Launch" : "Fly in Sim Control"}
          </button>
          <button
            onClick={p.run} disabled={p.running || !!p.runBlock} title={p.runBlock ?? "Simulate the full configured mission on the digital twin"}
            className="h-9 px-space-md bg-primary text-on-primary rounded font-headline-sm text-body-sm flex items-center justify-center gap-1.5 hover:bg-primary-container active:scale-[0.99] transition-all duration-150 shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 whitespace-nowrap"
          >
            <span className={`material-symbols-outlined text-[18px] ${p.running ? "animate-spin" : ""}`}>{p.running ? "progress_activity" : "model_training"}</span>
            <span className="tracking-wide font-bold">{p.running ? "SIMULATING…" : "RUN TWIN SIMULATION"}</span>
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 1. setup */
function SliderBox({ label, value, unit, extra, valueClass = "text-primary", min, max, step, v, onChange, left, right, disabled, invalid }: {
  label: string; value: string; unit: string; extra?: string; valueClass?: string; min: number; max: number; step: number; v: number; onChange: (n: number) => void; left: string; right: string; disabled?: boolean; invalid?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1.5 p-space-sm bg-surface-container-low/50 rounded border ${invalid ? "border-error" : "border-outline-variant/60"} ${disabled ? "opacity-60" : ""}`}>
      <div className="flex justify-between items-center">
        <span className="text-label-caps font-label-caps text-on-surface-variant">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className={`text-telemetry-lg font-telemetry-lg font-bold ${invalid ? "text-error" : valueClass}`}>{value}</span>
          <span className={`text-telemetry-sm font-telemetry-sm text-on-surface-variant ${extra ? "font-medium" : ""}`}>{extra ?? unit}</span>
        </div>
      </div>
      <input aria-label={label} className="w-full disabled:cursor-not-allowed" max={max} min={min} step={step} type="range" value={v} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
      <div className="flex justify-between text-telemetry-sm font-telemetry-sm text-on-surface-variant/70 text-[10px]">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function BarInput({ label, value, unit, pct, bar, min, max, v, onChange, invalid }: { label: string; value: string; unit: string; pct: number; bar: string; min: number; max: number; v: number; onChange: (n: number) => void; invalid?: boolean }) {
  return (
    <div className={`p-space-sm bg-surface-container-low/50 rounded border ${invalid ? "border-error" : "border-outline-variant/60"} flex flex-col justify-between relative`}>
      <span className="text-label-caps font-label-caps text-on-surface-variant text-[10px]">{label}</span>
      <div className="flex items-baseline justify-between mt-1">
        <span className={`text-telemetry-lg font-telemetry-lg font-bold ${invalid ? "text-error" : "text-on-surface"}`}>{value}</span>
        <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">{unit}</span>
      </div>
      <div className="w-full bg-outline-variant/30 h-1.5 rounded-full mt-2 overflow-hidden">
        <div className={`${invalid ? "bg-error" : bar} h-full`} style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
      </div>
      {/* Invisible range over the bar keeps the Stitch card look while making it adjustable. */}
      <input aria-label={label} className="absolute left-space-sm right-space-sm bottom-1 h-4 opacity-0 cursor-ew-resize" style={{ width: "calc(100% - 1rem)" }} type="range" min={min} max={max} value={v} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Field({ label, htmlFor, children, error }: { label: string; htmlFor: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label className={`text-label-caps font-label-caps uppercase ${error ? "text-error" : "text-on-surface-variant"}`} htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <span className="font-telemetry-sm text-[10px] text-error leading-tight">{error}</span>}
    </div>
  );
}

function SectionTitle({ n, icon, title, right }: { n: number; icon: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant pb-space-sm">
      <div className="flex items-center gap-space-xs">
        <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-[11px] font-bold flex items-center justify-center">{n}</span>
        <span className="material-symbols-outlined text-primary">{icon}</span>
        <span className="text-headline-sm font-headline-sm text-on-surface">{title}</span>
      </div>
      {right}
    </div>
  );
}

function SetupCard({ form, set, presets, applyPreset, tails, env, envelope, metrics, issues }: {
  form: Form; set: (f: Partial<Form>) => void; presets: any[]; applyPreset: (id: string) => void; tails: any[]; env: any; envelope: any; metrics: any; issues: Issue[];
}) {
  const err = (field: string) => issues.find((i) => i.level === "error" && i.field === field)?.text;
  const bad = (field: string) => !!err(field);
  const isa = form.surface_temp_c - 15;
  const routed = form.waypoints.length > 0;
  const routeDuration = routed && !form.waypoints.some((w) => w.station) && metrics?.total_s != null;
  const a = envelope?.airframe;
  const tail = tails.find((t) => t.tail_id === form.tail_id);
  const cooling = env?.cooling_effectiveness;
  const degraded = cooling != null && cooling < 0.97 && form.use_current_health;
  const healthText = !form.use_current_health
    ? "Pristine factory tolerances (health sync off)"
    : env?.health_source === "factory"
      ? "No twin health estimate available — factory tolerances"
      : cooling != null && cooling < 0.97
        ? `Cooling degraded ${fmt((1 - cooling) * 100)}%`
        : "No significant degradation estimated";
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-margin-compact shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)] flex flex-col gap-space-md">
      <SectionTitle n={1} icon="tune" title="Mission Setup · Flight Parameter Inputs" right={
        <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">{form.plan_id ? `${form.plan_id} · SIM CONFIG` : "SIM CONFIG"}</span>
      } />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
        {/* Identity */}
        <div className="flex flex-col gap-space-sm">
          <Field label="Mission Name" htmlFor="missionName" error={err("name")}>
            <input id="missionName" className={`${INPUT} ${bad("name") ? "border-error" : ""}`} maxLength={48} placeholder="e.g. North sector ISR orbit" value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Mission Identifier" htmlFor="missionCode" error={err("code")}>
            <input id="missionCode" className={`${INPUT} font-telemetry-md uppercase ${bad("code") ? "border-error" : ""}`} maxLength={16} placeholder="e.g. ISR-NORTH (sortie callsign)" value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })} />
          </Field>
          <Field label="Airframe" htmlFor="airframeSelect" error={err("tail_id")}>
            <div className="relative">
              <select id="airframeSelect" className={`${SELECT} ${bad("tail_id") ? "border-error" : ""}`} value={form.tail_id ?? ""} onChange={(e) => set({ tail_id: e.target.value || null })}>
                <option value="">Select airframe…</option>
                {tails.map((t) => <option key={t.tail_id} value={t.tail_id}>{t.tail_id} · {t.engine_class} · SN {t.engine_serial}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-2 pointer-events-none text-on-surface-variant text-lg">expand_more</span>
            </div>
          </Field>
          <Field label="Mission Profile" htmlFor="missionProfileSelect">
            <div className="relative">
              <select id="missionProfileSelect" className={SELECT} value={form.mission_id} onChange={(e) => applyPreset(e.target.value)}>
                {presets.map((pr) => <option key={pr.mission_id} value={pr.mission_id}>{pr.display_name}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-2 pointer-events-none text-on-surface-variant text-lg">expand_more</span>
            </div>
          </Field>
        </div>
        {/* Altitude / duration / temperature (Stitch sliders) */}
        <div className="flex flex-col gap-space-sm">
          <SliderBox label="FLIGHT ALTITUDE" value={fmt(form.cruise_altitude_m)} unit="m" min={1000} max={a?.service_ceiling_m ?? 8000} step={50} v={form.cruise_altitude_m} onChange={(n) => set({ cruise_altitude_m: n })} left="1,000 m" right={`${fmt(a?.service_ceiling_m ?? 8000)} m (Ceiling)`} invalid={bad("cruise_altitude_m")} />
          <SliderBox
            label="MISSION DURATION" value={fmt(routeDuration ? metrics.total_s / 3600 : form.duration_h, 1)} unit={routeDuration ? "hrs (route)" : "hrs"}
            min={2} max={24} step={0.5} v={form.duration_h} onChange={(n) => set({ duration_h: n })} left="2.0 h" right={routeDuration ? "Set by route (no station)" : "24.0 h (MALE Class)"}
            disabled={routeDuration} invalid={bad("duration_h")}
          />
          <SliderBox label="AMBIENT TEMP / ISA DEV" value={`${form.surface_temp_c >= 0 ? "+" : ""}${form.surface_temp_c} °C`} unit="" extra={`(ISA ${isa >= 0 ? "+" : ""}${isa})`} valueClass="text-tertiary" min={-20} max={45} step={1} v={form.surface_temp_c} onChange={(n) => set({ surface_temp_c: n })} left="-20 °C" right="+45 °C Hot Extremes" invalid={bad("surface_temp_c")} />
        </div>
        {/* Speed / power / health / environment */}
        <div className="flex flex-col gap-space-sm">
          <div className="grid grid-cols-2 gap-space-sm">
            <BarInput label="CRUISING AIRSPEED" value={fmt(form.airspeed_ktas)} unit="KTAS" pct={((form.airspeed_ktas - 40) / 160) * 100} bar="bg-primary" min={40} max={200} v={form.airspeed_ktas} onChange={(n) => set({ airspeed_ktas: n })} invalid={bad("airspeed_ktas")} />
            <BarInput label="ENGINE POWER SETTING" value={`${form.power_pct_mcp}%`} unit="MCP" pct={form.power_pct_mcp} bar="bg-tertiary" min={30} max={100} v={form.power_pct_mcp} onChange={(n) => set({ power_pct_mcp: n })} invalid={bad("power_pct_mcp")} />
          </div>
          {(bad("airspeed_ktas") || bad("power_pct_mcp")) && <span className="font-telemetry-sm text-[10px] text-error -mt-1">{err("airspeed_ktas") ?? err("power_pct_mcp")}</span>}
          <div className="p-space-sm bg-surface-container rounded-lg border border-outline-variant flex items-start gap-space-sm">
            <input checked={form.use_current_health} onChange={(e) => set({ use_current_health: e.target.checked })} className="mt-1 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer" id="twinSync" type="checkbox" />
            <label className="flex flex-col cursor-pointer" htmlFor="twinSync">
              <span className="font-headline-sm text-headline-sm text-on-surface">Use current engine health from digital twin</span>
              <span className={`font-telemetry-sm text-telemetry-sm font-medium mt-0.5 ${degraded ? "text-error" : "text-secondary"}`}>{tail ? `${tail.tail_id} SN ${tail.engine_serial}` : "Unassigned airframe"} — {healthText}</span>
              <span className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">Simulates actual physical wear telemetry instead of pristine factory tolerances.</span>
            </label>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase text-[10px]">Environmental Factors Calculated</span>
            <div className="grid grid-cols-3 gap-space-xs text-center">
              <EnvBox label="Headwind" value={env ? `${fmt(env.headwind_kts)} kts` : "--"} />
              <EnvBox label="OAT cruise" value={env ? `${fmt(env.oat_cruise_c)} °C` : "--"} />
              <EnvBox label="Density Alt" value={env ? `${fmt(env.density_altitude_m)} m` : "--"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IssueLine({ i, onClick }: { i: Issue; onClick?: () => void }) {
  const cls = i.level === "error" ? "text-error" : i.level === "warning" ? "text-[#B45309]" : "text-on-surface-variant";
  const icon = i.level === "error" ? "error" : i.level === "warning" ? "warning" : "info";
  return (
    <div className={`flex items-start gap-space-xs font-body-sm text-body-sm ${cls} ${onClick ? "cursor-pointer hover:underline" : ""}`} onClick={onClick}>
      <span className="material-symbols-outlined text-base mt-0.5 shrink-0">{icon}</span>
      <span>{i.text}</span>
    </div>
  );
}

function EnvBox({ label, value, tone, sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div className="p-space-xs bg-surface-container-high rounded border border-outline-variant/40">
      <div className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">{label}</div>
      <div className={`font-telemetry-md text-telemetry-md font-bold ${tone ?? "text-on-surface"}`}>{value}</div>
      {sub && <div className="text-[10px] font-telemetry-sm text-outline">{sub}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- 2 + 3. route */
function RouteCard({ form, set, metrics, issues, envelope, selWp, setSelWp, checking }: {
  form: Form; set: (f: Partial<Form>) => void; metrics: any; issues: Issue[]; envelope: any; selWp: number | null; setSelWp: (i: number | null) => void; checking: boolean;
}) {
  const wps = form.waypoints;
  const max = envelope?.limits?.max_waypoints ?? 12;
  const warnDb = envelope?.limits?.link_margin_warn_db ?? 6;
  const setWps = (next: Waypoint[]) => set({ waypoints: next });
  const update = (i: number, patch: Partial<Waypoint>) =>
    setWps(wps.map((w, k) => (k === i ? { ...w, ...patch } : patch.station ? { ...w, station: false } : w)));
  const addAt = (east: number, north: number) => {
    if (wps.length >= max) return;
    setWps([...wps, { name: `WP${wps.length + 1}`, east_km: Math.round(east * 10) / 10, north_km: Math.round(north * 10) / 10, altitude_m: null, airspeed_ktas: null, hold_min: 0, station: false }]);
    setSelWp(wps.length);
  };
  const addNext = () => {
    const last = wps[wps.length - 1];
    if (!last) return addAt(0, 30);
    const prev = wps[wps.length - 2] ?? { east_km: 0, north_km: 0 };
    const dx = last.east_km - prev.east_km, dy = last.north_km - prev.north_km;
    const d = Math.hypot(dx, dy) || 1;
    addAt(last.east_km + (dx / d) * 25, last.north_km + (dy / d) * 25);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= wps.length) return;
    const next = [...wps];
    [next[i], next[j]] = [next[j], next[i]];
    setWps(next);
    setSelWp(j);
  };
  const remove = (i: number) => {
    setWps(wps.filter((_, k) => k !== i));
    setSelWp(null);
  };
  const [confirmClear, setConfirmClear] = useState(false);
  const clear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    setConfirmClear(false);
    setWps([]);
    setSelWp(null);
  };
  const wpMetrics: any[] = metrics?.waypoints ?? [];
  const legs: any[] = metrics?.legs ?? [];
  const wpIssues = (i: number) => issues.filter((x) => x.waypoint === i);
  const hasStation = wps.some((w) => w.station);
  const stationName = wps.find((w) => w.station)?.name;

  return (
    <div className={`${CARD} flex flex-col gap-space-sm`}>
      <SectionTitle n={2} icon="route" title="Flight Path & Waypoints" right={
        <div className="flex items-center gap-space-xs">
          <span className="text-label-caps font-label-caps text-on-surface-variant uppercase mr-space-xs">{wps.length}/{max} WAYPOINTS · KM FROM GCS</span>
          <button className={`${BTN2} ${confirmClear ? "border-error text-error" : ""}`} disabled={!wps.length} onClick={clear} title="Remove every waypoint (asks to confirm)">
            <span className="material-symbols-outlined text-[16px]">wrong_location</span> {confirmClear ? "Confirm Clear" : "Clear Route"}
          </button>
          <button
            className="h-9 px-3 whitespace-nowrap inline-flex items-center gap-1.5 bg-primary text-on-primary rounded text-body-sm font-body-sm font-semibold hover:bg-[#1748D1] transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={wps.length >= max} onClick={addNext} title={wps.length >= max ? `At most ${max} waypoints` : "Add a waypoint 25 km beyond the last one — or click the map"}
          >
            <span className="material-symbols-outlined text-[16px]">add_location_alt</span> Add Waypoint
          </button>
        </div>
      } />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm">
        <div className="md:col-span-6">
          <RouteMap form={form} metrics={metrics} envelope={envelope} selWp={selWp} setSelWp={setSelWp} onAdd={addAt} full={wps.length >= max} onMove={(i, e, n) => update(i, { east_km: e, north_km: n })} />
        </div>
        <div className="md:col-span-6 flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-[11px] font-bold flex items-center justify-center">3</span>
              <span className="text-label-caps font-label-caps text-on-surface font-semibold uppercase">Route Calculations</span>
            </span>
            <span className="text-telemetry-sm font-telemetry-sm text-outline">{checking ? "updating…" : "backend · live"}</span>
          </div>
          <div className={`grid grid-cols-2 xl:grid-cols-3 gap-space-xs text-center ${checking ? "opacity-70" : ""}`}>
            <EnvBox label="Route Distance" value={metrics?.route_km != null ? `${fmt(metrics.route_km, 1)} km` : wps.length ? "--" : "0 km"} sub={wps.length ? `${legs.length} legs incl. return` : "no route"} />
            <EnvBox label="Transit Time" value={metrics?.transit_s != null ? hm(metrics.transit_s) : "--"} sub={metrics?.headwind_kts != null ? `${fmt(metrics.headwind_kts)} kt headwind` : undefined} />
            <EnvBox label="On-Station Time" value={metrics ? hm(metrics.station_s ?? 0) : "--"} sub={wps.length ? (hasStation ? `at ${stationName}` : "no station set") : "profile orbit"} tone={wps.length && !hasStation ? "text-on-surface-variant" : undefined} />
            <EnvBox label="Total Duration" value={metrics?.total_s != null ? hm(metrics.total_s) : "--"} sub={metrics?.hold_s ? `incl. ${hm(metrics.hold_s)} holds` : "block time"} />
            <EnvBox label="Max Range GCS" value={metrics?.max_range_km != null ? `${fmt(metrics.max_range_km)} km` : wps.length ? "--" : "0 km"} sub={metrics?.max_range_km != null ? "furthest waypoint" : undefined} />
            <EnvBox label="Min Link Margin" value={metrics?.min_link_margin_db != null ? `${fmt(metrics.min_link_margin_db, 1)} dB` : "--"} sub={`warn < ${fmt(warnDb)} dB`}
              tone={metrics?.min_link_margin_db != null && metrics.min_link_margin_db < warnDb ? "text-tertiary" : undefined} />
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug mt-auto">
            <span className="material-symbols-outlined text-[14px] align-[-2px] text-primary">touch_app</span>{" "}
            Click the map to drop a waypoint, drag a marker to move it. Mark one waypoint <strong className="text-tertiary">ON-STATION</strong> to loiter there for the rest of the mission duration.
          </p>
        </div>
      </div>

      {/* Waypoint table (Stitch table/list-row pattern) */}
      <div className="border border-outline-variant rounded-lg overflow-hidden">
        <div className="grid grid-cols-[28px_minmax(80px,1.4fr)_repeat(5,minmax(52px,1fr))_96px_84px] gap-1.5 px-space-sm py-1.5 bg-surface-container-low text-label-caps font-label-caps text-on-surface-variant uppercase text-[10px] items-center">
          <span>#</span><span>Name</span><span>East km</span><span>North km</span><span>Alt m</span><span>KTAS</span><span>Hold min</span><span>Station</span><span className="text-right">Order · Del</span>
        </div>
        {wps.length === 0 && (
          <div className="px-space-sm py-space-md flex items-center justify-between gap-space-sm bg-surface-container-lowest">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              No waypoints — the {form.mission_id.replace(/_/g, " ")} profile is flown as a station orbit over the launch site.
            </span>
            <button className={BTN2} onClick={addNext}><span className="material-symbols-outlined text-[16px]">add_location_alt</span> Add first waypoint</button>
          </div>
        )}
        <div className="divide-y divide-outline-variant">
          {wps.map((w, i) => {
            const m = wpMetrics[i];
            const leg = legs[i];
            const errs = wpIssues(i);
            const selected = selWp === i;
            const hasErr = errs.some((e) => e.level === "error");
            return (
              <div key={i} onClick={() => setSelWp(i)} className={`px-space-sm py-1.5 cursor-pointer transition-colors ${selected ? "bg-surface-container-high shadow-[inset_4px_0_0_#0047d3]" : "bg-surface-container-lowest hover:bg-[#EEF4FF]"}`}>
                <div className="grid grid-cols-[28px_minmax(80px,1.4fr)_repeat(5,minmax(52px,1fr))_96px_84px] gap-1.5 items-center">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${hasErr ? "bg-error" : w.station ? "bg-tertiary" : "bg-primary"}`}>{i + 1}</span>
                  <input aria-label={`Waypoint ${i + 1} name`} className={`${CELL} font-bold uppercase`} maxLength={16} value={w.name} onClick={(e) => e.stopPropagation()} onChange={(e) => update(i, { name: e.target.value.toUpperCase() })} />
                  <NumCell label={`WP${i + 1} east km`} value={w.east_km} onChange={(v) => update(i, { east_km: v ?? 0 })} />
                  <NumCell label={`WP${i + 1} north km`} value={w.north_km} onChange={(v) => update(i, { north_km: v ?? 0 })} />
                  <NumCell label={`WP${i + 1} altitude m`} value={w.altitude_m} placeholder={fmt(form.cruise_altitude_m)} onChange={(v) => update(i, { altitude_m: v })} />
                  <NumCell label={`WP${i + 1} airspeed KTAS`} value={w.airspeed_ktas} placeholder={fmt(form.airspeed_ktas)} onChange={(v) => update(i, { airspeed_ktas: v })} />
                  <NumCell label={`WP${i + 1} hold min`} value={w.hold_min} onChange={(v) => update(i, { hold_min: v ?? 0 })} />
                  <button aria-pressed={w.station} title="On-station point: loiters for the remaining mission endurance" onClick={(e) => { e.stopPropagation(); update(i, { station: !w.station }); }}
                    className={`h-7 px-2 rounded-full text-[10px] font-telemetry-sm font-bold border transition-colors whitespace-nowrap ${w.station ? "bg-tertiary text-on-tertiary border-tertiary" : "bg-surface-container text-on-surface-variant border-outline-variant hover:border-tertiary"}`}>
                    {w.station ? "ON-STATION" : "SET STATION"}
                  </button>
                  <div className="flex items-center justify-end gap-0.5">
                    <WpIcon icon="arrow_upward" title={`Move WP${i + 1} earlier`} disabled={i === 0} onClick={() => move(i, -1)} />
                    <WpIcon icon="arrow_downward" title={`Move WP${i + 1} later`} disabled={i === wps.length - 1} onClick={() => move(i, 1)} />
                    <WpIcon icon="delete" title={`Remove WP${i + 1}`} danger onClick={() => remove(i)} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-space-md pl-[34px] mt-0.5 font-telemetry-sm text-[11px] text-on-surface-variant">
                  <span>Leg {leg ? `${fmt(leg.distance_km, 1)} km` : "--"}{leg?.bearing_deg != null ? ` @ ${String(Math.round(leg.bearing_deg)).padStart(3, "0")}°` : ""}</span>
                  <span>ETA T+{hhmm(m?.eta_s)}</span>
                  <span>Range {m ? `${fmt(m.range_km)} km` : "--"}</span>
                  <span className={m && m.link_margin_db < warnDb ? "text-tertiary font-bold" : ""}>Link {m ? `${fmt(m.link_margin_db, 1)} dB` : "--"}</span>
                  {w.station && <span className="text-tertiary font-semibold">Loiter {metrics?.station_s != null ? hm(metrics.station_s) : "--"}</span>}
                </div>
                {errs.map((e, k) => <div key={k} className="pl-[34px]"><IssueLine i={e} /></div>)}
              </div>
            );
          })}
        </div>
        {legs.length > 0 && (
          <div className="px-space-sm py-1.5 bg-surface-container-low font-telemetry-sm text-[11px] text-on-surface-variant flex justify-between">
            <span>Return leg WP{wps.length} → GCS: {fmt(legs[legs.length - 1].distance_km, 1)} km @ {String(Math.round(legs[legs.length - 1].bearing_deg ?? 0)).padStart(3, "0")}°</span>
            <span>Blank Alt / KTAS use the cruise setting</span>
          </div>
        )}
      </div>
    </div>
  );
}

function WpIcon({ icon, title, onClick, disabled, danger }: { icon: string; title: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button aria-label={title} title={title} disabled={disabled} onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-7 h-7 rounded flex items-center justify-center text-on-surface-variant transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${danger ? "hover:bg-error-container hover:text-error" : "hover:bg-surface-container"}`}>
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
    </button>
  );
}

function NumCell({ label, value, onChange, placeholder }: { label: string; value: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  const [text, setText] = useState(value == null ? "" : String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value == null ? "" : String(value));
  }, [value]);
  return (
    <input
      aria-label={label} className={CELL} inputMode="decimal" placeholder={placeholder} value={text}
      onClick={(e) => e.stopPropagation()}
      onFocus={() => { focused.current = true; }}
      onChange={(e) => {
        setText(e.target.value);
        const t = e.target.value.trim();
        if (t === "") onChange(null);
        else if (Number.isFinite(Number(t))) onChange(Number(t));
      }}
      onBlur={() => { focused.current = false; setText(value == null ? "" : String(value)); }}
    />
  );
}

function RouteMap({ form, metrics, envelope, selWp, setSelWp, onAdd, full, onMove }: {
  form: Form; metrics: any; envelope: any; selWp: number | null; setSelWp: (i: number) => void; onAdd: (e: number, n: number) => void; full: boolean; onMove: (i: number, e: number, n: number) => void;
}) {
  const wps = form.waypoints;
  const W = 520, H = 280;
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ i: number; view: { cx: number; cy: number; scale: number }; moved: boolean } | null>(null);
  // Frame the GCS and every waypoint (min 40 km span); frozen while dragging so the map doesn't rescale under the cursor.
  const liveView = useMemo(() => {
    const es = [0, ...wps.map((w) => w.east_km)], ns = [0, ...wps.map((w) => w.north_km)];
    const cx = (Math.min(...es) + Math.max(...es)) / 2, cy = (Math.min(...ns) + Math.max(...ns)) / 2;
    const span = Math.max(40, (Math.max(...es) - Math.min(...es)) * 1.3, ((Math.max(...ns) - Math.min(...ns)) * 1.3 * W) / H);
    return { cx, cy, scale: W / span };
  }, [wps]);
  const view = drag?.view ?? liveView;
  const { scale } = view;
  const extent = (W / scale) / 2;
  const X = (e: number) => W / 2 + (e - view.cx) * scale;
  const Y = (n: number) => H / 2 - (n - view.cy) * scale;
  const toPlan = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    // viewBox is letterboxed (xMidYMid meet): map through the uniform scale.
    const k = Math.min(r.width / W, r.height / H);
    const ox = (r.width - W * k) / 2, oy = (r.height - H * k) / 2;
    const sx = (clientX - r.left - ox) / k, sy = (clientY - r.top - oy) / k;
    return [Math.round(((sx - W / 2) / scale + view.cx) * 10) / 10, Math.round(((H / 2 - sy) / scale + view.cy) * 10) / 10];
  };
  // Datalink reach at cruise altitude: radio horizon, capped where the link budget closes.
  const reach = useMemo(() => {
    const d = envelope?.datalink;
    if (!d) return null;
    const horizon = 4.12 * (Math.sqrt(d.gcs_antenna_height_m ?? 10) + Math.sqrt(form.cruise_altitude_m));
    const budget = d.tx_power_dbm + d.tx_antenna_gain_dbi + d.rx_antenna_gain_dbi - d.cable_losses_db - d.rx_sensitivity_dbm;
    const fsplRange = 10 ** ((budget - 20 * Math.log10(d.frequency_mhz) - 32.44) / 20);
    return Math.min(horizon, fsplRange);
  }, [envelope, form.cruise_altitude_m]);
  const pts = [[0, 0], ...wps.map((w) => [w.east_km, w.north_km]), [0, 0]];
  const wpm: any[] = metrics?.waypoints ?? [];
  const far = Math.hypot(Math.max(Math.abs(view.cx), 1) + extent, Math.abs(view.cy) + extent);
  const step = [5, 10, 20, 25, 50, 100, 200][[5, 10, 20, 25, 50, 100, 200].findIndex((k) => far / k <= 6)] ?? 200;
  const ringKms = Array.from({ length: Math.ceil(far / step) }, (_, k) => (k + 1) * step);
  return (
    <div className="w-full bg-surface-container-low/40 rounded border border-outline-variant/60 relative">
      <svg
        ref={svgRef} className={`w-full h-64 select-none ${full ? "" : drag ? "cursor-grabbing" : "cursor-crosshair"}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Route plan view"
        onClick={(e) => { if (!full && !drag) { const [east, north] = toPlan(e.clientX, e.clientY); onAdd(east, north); } }}
        onPointerMove={(e) => {
          if (!drag) return;
          const [east, north] = toPlan(e.clientX, e.clientY);
          onMove(drag.i, east, north);
          if (!drag.moved) setDrag({ ...drag, moved: true });
        }}
        onPointerUp={() => setTimeout(() => setDrag(null), 0)}
        onPointerLeave={() => setDrag(null)}
      >
        {ringKms.map((r) => (
          <g key={r}>
            <circle cx={X(0)} cy={Y(0)} r={r * scale} fill="none" stroke="#c3c5d9" strokeDasharray="2,3" strokeWidth="0.6" />
            <text x={X(0) + r * scale * 0.7071 + 2} y={Y(0) - r * scale * 0.7071 - 2} fontFamily="JetBrains Mono" fontSize="8" fill="#9aa0b4">{fmt(r)} km</text>
          </g>
        ))}
        <line x1={0} x2={W} y1={Y(0)} y2={Y(0)} stroke="#c3c5d9" strokeWidth="0.5" />
        <line x1={X(0)} x2={X(0)} y1={0} y2={H} stroke="#c3c5d9" strokeWidth="0.5" />
        {reach != null && (
          <circle cx={X(0)} cy={Y(0)} r={reach * scale} fill="#0047d3" fillOpacity="0.04" stroke="#0047d3" strokeDasharray="5,3" strokeWidth="1" />
        )}
        <polyline points={pts.map(([e, n]) => `${X(e)},${Y(n)}`).join(" ")} fill="none" stroke="#0047d3" strokeWidth="2" strokeLinejoin="round" />
        {wps.length > 0 && (
          <polyline points={`${X(wps[wps.length - 1].east_km)},${Y(wps[wps.length - 1].north_km)} ${X(0)},${Y(0)}`} fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="3,4" />
        )}
        <rect x={X(0) - 6} y={Y(0) - 6} width="12" height="12" fill="#191b24" rx="1" />
        <text x={X(0) + 9} y={Y(0) + 14} fontFamily="JetBrains Mono" fontSize="10" fill="#434656">GCS / BASE</text>
        {wps.map((w, i) => {
          const bad = wpm[i] && (wpm[i].range_km > wpm[i].radio_horizon_km || wpm[i].link_margin_db < 0);
          return (
            <g
              key={i} className={full || drag ? "cursor-grab" : "cursor-grab"}
              onClick={(e) => { e.stopPropagation(); setSelWp(i); }}
              onPointerDown={(e) => { e.stopPropagation(); (e.target as Element).setPointerCapture?.(e.pointerId); setSelWp(i); setDrag({ i, view: liveView, moved: false }); }}
            >
              {w.station && <circle cx={X(w.east_km)} cy={Y(w.north_km)} r="15" fill="none" stroke="#9c3000" strokeDasharray="3,2" strokeWidth="1.3" />}
              <circle cx={X(w.east_km)} cy={Y(w.north_km)} r={selWp === i ? 10.5 : 9} fill={bad ? "#ba1a1a" : w.station ? "#9c3000" : "#0047d3"} stroke={selWp === i ? "#191b24" : "#ffffff"} strokeWidth="2" />
              <text x={X(w.east_km)} y={Y(w.north_km) + 3.5} textAnchor="middle" fontFamily="Inter" fontSize="10" fontWeight="700" fill="#ffffff" pointerEvents="none">{i + 1}</text>
              <text x={X(w.east_km) + 13} y={Y(w.north_km) - 9} fontFamily="JetBrains Mono" fontSize="10" fill="#191b24" pointerEvents="none">{w.name}</text>
            </g>
          );
        })}
        <text x={W - 6} y={H - 7} textAnchor="end" fontFamily="JetBrains Mono" fontSize="9" fill="#737688">rings {fmt(step)} km from GCS · N ↑</text>
        {reach != null && <text x="6" y={H - 7} fontFamily="JetBrains Mono" fontSize="9" fill="#0047d3">C2 LOS reach {fmt(reach)} km @ {fmt(form.cruise_altitude_m)} m</text>}
        {wps.length === 0 && <text x={W / 2} y={28} textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#434656">Click anywhere on the map to place WP1</text>}
      </svg>
    </div>
  );
}

/* ---------------------------------------------------------------- validation + status */
function ValidationCard({ issues, errors, warnings, checking, airframe, onSelectWp }: { issues: Issue[]; errors: Issue[]; warnings: Issue[]; checking: boolean; airframe: any; onSelectWp: (i: number) => void }) {
  const status = checking ? { text: "CHECKING…", cls: "bg-surface-container text-on-surface-variant border-outline-variant" }
    : errors.length ? { text: `${errors.length} ERROR${errors.length > 1 ? "S" : ""}`, cls: "bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]" }
      : warnings.length ? { text: "READY · WARNINGS", cls: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]" }
        : { text: "READY FOR DISPATCH", cls: "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]" };
  const ordered = [...errors, ...warnings, ...issues.filter((i) => i.level === "info")];
  return (
    <div className={`${CARD} flex flex-col gap-space-sm`}>
      <div className="flex items-center justify-between border-b border-outline-variant pb-space-sm">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-primary">fact_check</span>
          <span className="text-headline-sm font-headline-sm text-on-surface">Mission Validation</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full border text-telemetry-sm font-telemetry-sm font-semibold ${status.cls}`}>{status.text}</span>
      </div>
      {ordered.length === 0 && !checking && (
        <span className="font-body-sm text-body-sm text-on-surface-variant">All mission parameters are within the airframe, engine and datalink envelope.</span>
      )}
      <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
        {ordered.map((i, k) => <IssueLine key={k} i={i} onClick={i.waypoint != null ? () => onSelectWp(i.waypoint!) : undefined} />)}
      </div>
      {airframe && (
        <div className="grid grid-cols-3 gap-space-xs text-center pt-space-xs border-t border-outline-variant/60">
          <EnvBox label="Airframe" value={airframe.tail_id} sub={airframe.status} tone={airframe.status === "MISSION READY" ? "text-secondary" : "text-[#B45309]"} />
          <EnvBox label="Health Index" value={airframe.health_index != null ? `${fmt(airframe.health_index)}/100` : "--"} />
          <EnvBox label="RUL" value={airframe.rul_hours != null ? `${fmt(airframe.rul_hours)} h` : "--"} sub={`${fmt(airframe.total_hours)} eng hrs`} />
        </div>
      )}
    </div>
  );
}

const VERDICT_CHIP: Record<string, string> = {
  GO: "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]",
  CAUTION: "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]",
  "NO-GO": "bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]",
};

/* ---------------------------------------------------------------- 5. saved plans */
function PlansCard({ plans, current, dirty, confirm, busy, onLoad, onDelete }: { plans: any[]; current: string | null; dirty: boolean; confirm: string | null; busy: string | null; onLoad: (p: any) => void; onDelete: (p: any) => void; lastVerdict?: string | null }) {
  return (
    <div className={`${CARD} flex flex-col gap-space-sm`}>
      <div className="flex items-center justify-between border-b border-outline-variant pb-space-sm">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-primary">folder_open</span>
          <span className="text-headline-sm font-headline-sm text-on-surface">Saved Mission Plans</span>
          <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">· click to load</span>
        </div>
        <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">{plans.length} PLANS</span>
      </div>
      {plans.length === 0 && <p className="font-body-sm text-body-sm text-on-surface-variant">No saved missions yet. Name the mission, give it an identifier and choose Save Mission.</p>}
      <div className="flex flex-col divide-y divide-outline-variant -mx-margin-compact max-h-72 overflow-y-auto">
        {plans.map((p) => {
          const active = p.plan_id === current;
          return (
            <article key={p.plan_id} onClick={() => onLoad(p)} title={`Load ${p.code}`} className={`px-margin-compact py-space-sm cursor-pointer transition-colors ${active ? "bg-surface-container-high border-l-4 border-primary" : "hover:bg-[#EEF4FF]"} ${confirm === `load-${p.plan_id}` ? "ring-1 ring-inset ring-[#F59E0B]" : ""}`}>
              <div className="flex items-center justify-between gap-space-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`font-telemetry-md text-telemetry-md font-bold ${active ? "text-primary" : "text-on-surface"}`}>{p.code}</span>
                  {p.last_verdict ? (
                    <span className={`px-2 py-0.5 rounded-full text-telemetry-sm font-telemetry-sm font-semibold ${VERDICT_CHIP[p.last_verdict] ?? ""}`}>{p.last_verdict}</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-telemetry-sm font-telemetry-sm font-semibold bg-surface-container text-on-surface-variant">NOT SIMULATED</span>
                  )}
                  {active && dirty && <span className="text-telemetry-sm font-telemetry-sm text-[#B45309] font-semibold">UNSAVED</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">{ago(p.updated_at)}</span>
                  <button
                    aria-label={`Delete ${p.plan_id}`} disabled={p.flights > 0 || busy === `del-${p.plan_id}`}
                    title={p.flights > 0 ? `Flown ${p.flights}× — kept for mission history` : confirm === `del-${p.plan_id}` ? "Click again to delete" : "Delete plan"}
                    onClick={(e) => { e.stopPropagation(); onDelete(p); }}
                    className={`h-6 rounded flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${confirm === `del-${p.plan_id}` ? "px-2 bg-error text-on-error text-[10px] font-bold" : "w-6 text-on-surface-variant hover:bg-error-container hover:text-error"}`}
                  >
                    {confirm === `del-${p.plan_id}` ? "DELETE?" : <span className="material-symbols-outlined text-[16px]">delete</span>}
                  </button>
                </div>
              </div>
              <div className="font-headline-sm text-headline-sm text-on-surface mt-0.5 truncate">{p.name}</div>
              <div className="flex flex-wrap items-center gap-x-space-md font-telemetry-sm text-telemetry-sm text-on-surface-variant mt-0.5">
                <span><span className="text-outline">Airframe:</span> {p.tail_id ?? "--"}</span>
                <span><span className="text-outline">Route:</span> {p.spec.waypoints.length ? `${p.spec.waypoints.length} WPTS` : "Station orbit"}</span>
                <span><span className="text-outline">Flights:</span> {p.flights}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- verdict */
const VERDICT = {
  "NO-GO": { border: "border-error", bar: "bg-error", badge: "bg-error text-on-error", icon: "dangerous", title: "Mission Abort Advised", titleCls: "text-error", conf: "bg-error-container text-on-error-container", text: "Mission profile exceeds safe thermal operating envelope before completion." },
  CAUTION: { border: "border-[#F59E0B]", bar: "bg-[#F59E0B]", badge: "bg-[#F59E0B] text-white", icon: "warning", title: "Proceed With Caution", titleCls: "text-[#B45309]", conf: "bg-[#FEF3C7] text-[#B45309]", text: "Limit margins are thin under the twin's health-estimate uncertainty." },
  GO: { border: "border-secondary", bar: "bg-secondary", badge: "bg-secondary text-on-secondary", icon: "verified", title: "Mission Cleared", titleCls: "text-secondary", conf: "bg-[#DCFCE7] text-[#15803D]", text: "All monitored limits hold across the full mission timeline." },
} as const;

function Verdict({ result, running, error, preview, setPreview, stale }: { result: any; running: boolean; error: string | null; preview: string | null; setPreview: (p: any) => void; stale?: boolean }) {
  if (!result) {
    return (
      <div className={`${CARD} border-2 relative overflow-hidden`}>
        <div className="flex items-center gap-space-md">
          <span className={`material-symbols-outlined text-primary ${running ? "animate-spin" : ""}`}>{running ? "progress_activity" : "model_training"}</span>
          <div className="flex flex-col">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">{running ? "Simulating" : "Awaiting simulation"}</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">{error ?? (running ? "Running the full mission on the digital twin with Monte Carlo health uncertainty…" : "Complete the mission setup and route, then use Run Twin Simulation.")}</span>
          </div>
        </div>
      </div>
    );
  }
  const v = VERDICT[result.verdict as keyof typeof VERDICT] ?? VERDICT.GO;
  const [cond, maint] = result.mitigations;
  return (
    <div className={`bg-surface-container-lowest border-2 ${v.border} rounded-xl p-margin-compact shadow-sm relative overflow-hidden ${running || stale ? "opacity-60" : ""}`}>
      <div className={`absolute top-0 right-0 left-0 h-1 ${v.bar}`} />
      <div className="flex flex-wrap items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className={`px-space-md py-1 ${v.badge} rounded font-telemetry-xl text-telemetry-xl font-bold tracking-wider flex items-center gap-space-xs shadow-sm`}>
            <span className="material-symbols-outlined text-2xl">{v.icon}</span>
            <span>{result.verdict}</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs">
              <span className={`text-label-caps font-label-caps font-bold uppercase tracking-wider ${v.titleCls}`}>{v.title}</span>
              <span className={`px-space-xs py-0.5 rounded text-telemetry-sm font-telemetry-sm font-semibold ${v.conf}`}>{fmt(result.confidence * 100)}% {result.verdict === "GO" ? "Confidence" : "Breach Probability"}</span>
            </div>
            <span className="font-headline-sm text-headline-sm text-on-surface">{v.text}</span>
          </div>
        </div>
      </div>
      <div className="mt-space-md pt-space-sm border-t border-outline-variant/60 flex flex-col gap-space-xs">
        <span className="text-label-caps font-label-caps text-on-surface-variant uppercase text-[10px]">Predicted Root Causes &amp; Thermal Breach Points:</span>
        {result.root_causes.length === 0 && <span className="font-body-md text-body-md text-on-surface-variant">No limit breach or margin shortfall predicted.</span>}
        {result.root_causes.map((c: any, i: number) => {
          const warn = c.severity === "warning";
          return (
            <div key={i} className={`flex items-start gap-space-xs font-body-md text-body-md ${warn ? "text-error" : "text-on-surface-variant"}`}>
              <span className={`material-symbols-outlined text-base mt-0.5 shrink-0 ${warn ? "" : "text-tertiary"}`}>{warn ? "warning" : "report_problem"}</span>
              <span>
                <strong>{i + 1}. {c.text.split(" (")[0].replace(/\.$/, "")}</strong>
                {c.t_s != null ? (
                  <> at <span className="font-telemetry-sm font-telemetry-sm underline font-bold">T+{hm(c.t_s)}</span> of {(SEG_LABEL[c.segment] ?? c.segment).toLowerCase()} phase.</>
                ) : c.text.includes(" (") ? (
                  <> ({c.text.split(" (").slice(1).join(" (")}</>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-space-md p-space-sm bg-surface-container rounded-lg border border-outline-variant flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <span className="text-label-caps font-label-caps text-on-surface font-semibold uppercase">Operational Counter-Measures &amp; Mitigation Pathways</span>
          <div className="flex items-center gap-space-xs">
            <span className="text-telemetry-sm font-telemetry-sm text-on-surface-variant">Conditional Preview:</span>
            <button onClick={() => setPreview(preview === "condition" ? null : "condition")} className={`px-space-xs py-0.5 rounded text-telemetry-sm font-telemetry-sm bg-surface-container-high hover:bg-surface-variant border ${preview === "condition" ? "border-[#F59E0B] text-[#B45309]" : "border-outline-variant text-on-surface"}`}>Amber {cond.verdict}</button>
            <button onClick={() => setPreview(preview === "maintenance" ? null : "maintenance")} className={`px-space-xs py-0.5 rounded text-telemetry-sm font-telemetry-sm bg-surface-container-high hover:bg-surface-variant text-secondary border font-semibold ${preview === "maintenance" ? "border-secondary" : "border-outline-variant"}`}>Green {maint.verdict}</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm mt-1">
          {[cond, maint].map((m: any) => (
            <div key={m.kind} onClick={() => setPreview(preview === m.kind ? null : m.kind)} className={`p-space-sm bg-surface-container-lowest rounded border hover:border-primary cursor-pointer transition-colors ${preview === m.kind ? "border-primary" : "border-outline-variant"}`}>
              <div className={`flex items-center gap-space-xs font-headline-sm text-headline-sm ${m.kind === "condition" ? "text-tertiary" : "text-secondary"}`}>
                <span className="material-symbols-outlined text-sm">{m.kind === "condition" ? "thermostat" : "build"}</span>
                <span>{m.title}</span>
                <span className="ml-auto text-telemetry-sm font-telemetry-sm text-on-surface-variant">→ {m.verdict}</span>
              </div>
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                {m.condition}{" "}
                {m.breach_t_s != null ? <>Delays cylinder thermal runaway to <strong className="text-on-surface">{fmt(m.breach_t_s / 3600, 1)}h</strong>.</> : <strong className="text-on-surface">No CHT limit breach over the full mission.</strong>}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- charts */
function ProfileChart({ result }: { result: any }) {
  const p = result.profile;
  const T = result.mission_duration_s || p.t_s[p.t_s.length - 1] || 1;
  const maxAlt = Math.max(...p.altitude_m, 1);
  const X = (t: number) => 20 + (t / T) * 660;
  const Y = (a: number) => 110 - (a / maxAlt) * 80;
  const path = p.t_s.map((t: number, i: number) => `${i ? "L" : "M"} ${X(t).toFixed(1)} ${Y(p.altitude_m[i]).toFixed(1)}`).join(" ");
  const b = result.breach;
  // Departure (taxi/takeoff/climb) and arrival (descent/landing) are shown as single
  // CLIMB / DESCENT phases, as in the Stitch profile; every phase is labelled.
  const phaseOf = (n: string) => (["taxi", "takeoff", "climb"].includes(n) ? "climb" : ["descent", "landing"].includes(n) ? "descent" : n);
  const segs: any[] = [];
  for (const s0 of p.segments) {
    const name = phaseOf(s0.name);
    const last = segs[segs.length - 1];
    if (last && last.name === name) last.end_s = s0.end_s;
    else segs.push({ name, start_s: s0.start_s, end_s: s0.end_s });
  }
  // Phase labels left to right, skipping any that would overlap the previous one
  // (the phase containing the breach is always labelled as the risk window).
  const labels: { key: string; x: number; text: string; risk: boolean }[] = [];
  let nextFree = 0;
  for (const s1 of segs) {
    const risk = !!b && s1.start_s <= b.t_s && b.t_s <= s1.end_s;
    const text = `${SEG_LABEL[s1.name] ?? s1.name.toUpperCase()} (${dur(s1.start_s)}-${dur(s1.end_s)})${risk ? " - RISK WINDOW" : ""}`;
    const x = Math.max(X(s1.start_s) + 4, nextFree);
    const w = text.length * 6.8; // viewBox units per 9px glyph (the SVG is stretched horizontally)
    if (x + w > 690 && !risk) continue;
    if (x > X(s1.end_s) && !risk) continue;
    labels.push({ key: s1.name + s1.start_s, x: Math.min(x, 690 - w), text, risk });
    nextFree = x + w + 8;
  }
  const bandFill = (s: any) => (b && s.start_s <= b.t_s && b.t_s <= s.end_s ? "#fee2e2" : "#eaedff");
  const breachAlt = b ? p.altitude_m[p.t_s.findIndex((t: number) => t >= b.t_s)] ?? maxAlt : 0;
  return (
    <div className={`${CARD} flex flex-col gap-space-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-primary">altitude</span>
          <span className="font-headline-sm text-headline-sm text-on-surface">Mission Flight Profile &amp; Thermal Risk Envelope</span>
        </div>
        <div className="flex items-center gap-space-sm font-telemetry-sm text-telemetry-sm">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-primary" /> Flight Path</span>
          {b && <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-error" /> Breach Point ({hm(b.t_s).replace(/^0/, "")})</span>}
        </div>
      </div>
      <div className="w-full h-44 bg-surface-container-low/40 rounded border border-outline-variant/60 relative p-2">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 700 130">
          {segs.map((s: any) => (
            <rect key={s.name + s.start_s} fill={bandFill(s)} height="100" opacity="0.35" width={Math.max(X(s.end_s) - X(s.start_s), 1)} x={X(s.start_s)} y="10" />
          ))}
          <line stroke="#c3c5d9" strokeDasharray="3,3" strokeWidth="0.5" x1="20" x2="680" y1="30" y2="30" />
          <line stroke="#c3c5d9" strokeDasharray="3,3" strokeWidth="0.5" x1="20" x2="680" y1="70" y2="70" />
          <line stroke="#737688" strokeWidth="1" x1="20" x2="680" y1="110" y2="110" />
          <path d={path} fill="none" stroke="#0047d3" strokeWidth="2.5" />
          {b && (
            <>
              <line stroke="#ba1a1a" strokeDasharray="4,3" strokeWidth="1.5" x1={X(b.t_s)} x2={X(b.t_s)} y1="10" y2="110" />
              <circle cx={X(b.t_s)} cy={Y(breachAlt)} fill="#ba1a1a" r="5" stroke="#ffffff" strokeWidth="2" />
              <rect fill="#ba1a1a" height="22" rx="3" width="150" x={Math.min(X(b.t_s) + 10, 530)} y="16" />
              <text fill="#ffffff" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" x={Math.min(X(b.t_s) + 15, 535)} y="31">CRITICAL: T+{hm(b.t_s)} CHT</text>
            </>
          )}
          {labels.map((l) => (
            <text key={l.key} fill={l.risk ? "#ba1a1a" : "#737688"} fontFamily="Inter" fontSize="9" fontWeight={l.risk ? 700 : 600} x={l.x} y="122">{l.text}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function Curves({ result }: { result: any }) {
  const c = result.curves;
  const lim = result.limits;
  const T = result.mission_duration_s || c.t_s[c.t_s.length - 1] || 1;
  const cht = c.cht_hot_k.map(kToC), base = c.cht_baseline_k.map(kToC), oil = c.oil_temp_k.map(kToC);
  const limitC = kToC(lim.max_cht_k)!;
  const all = [...cht, ...base, ...oil, limitC].filter((x: number | null): x is number => x != null);
  const lo = Math.min(...all) - 5, hi = Math.max(...all) + 5;
  const X = (t: number) => 25 + (t / T) * 660;
  const Y = (v: number) => 105 - ((v - lo) / (hi - lo)) * 95;
  const line = (arr: (number | null)[]) => arr.map((v, i) => (v == null ? null : `${X(c.t_s[i]).toFixed(1)},${Y(v).toFixed(1)}`)).filter(Boolean).join(" ");
  const baseMean = base.reduce((a: number, v: number | null) => a + (v ?? 0), 0) / Math.max(base.length, 1);
  const b = result.breach;
  const ticks = useMemo(() => [0, 0.25, 0.5, 0.75, 1].map((f) => f * T), [T]);
  return (
    <div className={`${CARD} flex flex-col gap-space-sm`}>
      <div className="flex items-center justify-between">
        <span className="font-headline-sm text-headline-sm text-on-surface">Predicted Parametric Curves (0h — {fmt(T / 3600)}h Mission Timeline)</span>
        <div className="flex items-center gap-space-md font-telemetry-sm text-telemetry-sm">
          <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-tertiary" /> Pred. CHT Cyl {c.hot_cylinder}</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-outline" /> Twin Baseline ({fmt(baseMean)}°C)</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-secondary" /> Pred. Oil Temp</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-error" /> {fmt(limitC)}°C Threshold</span>
        </div>
      </div>
      <div className="w-full h-36 bg-surface-container-low/30 rounded border border-outline-variant/60 relative p-1">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 700 110">
          <line stroke="#ba1a1a" strokeDasharray="4,2" strokeWidth="1.5" x1="25" x2="685" y1={Y(limitC)} y2={Y(limitC)} />
          <text fill="#ba1a1a" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" x="30" y={Y(limitC) - 5}>MAX CHT CEILING {fmt(limitC)} °C</text>
          <polyline fill="none" points={line(base)} stroke="#737688" strokeDasharray="5,4" strokeWidth="1" />
          <polyline fill="none" points={line(cht)} stroke="#9c3000" strokeWidth="2.5" />
          <polyline fill="none" points={line(oil)} stroke="#006a69" strokeWidth="2" />
          {b && (
            <>
              <line stroke="#ba1a1a" strokeDasharray="2,2" strokeWidth="1" x1={X(b.t_s)} x2={X(b.t_s)} y1="10" y2="105" />
              <circle cx={X(b.t_s)} cy={Y(limitC)} fill="#ba1a1a" r="4" />
            </>
          )}
          <line stroke="#c3c5d9" strokeWidth="1" x1="25" x2="685" y1="105" y2="105" />
          {ticks.map((t, i) => (
            <text key={i} fill="#737688" fontFamily="JetBrains Mono" fontSize="8" x={i === 4 ? X(t) - 25 : X(t)} y="112">T+{fmt(t / 3600)}h</text>
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-space-sm pt-space-xs">
        {result.risks.map((r: any, i: number) => {
          const [txt, bg] = [["text-error", "bg-error"], ["text-tertiary", "bg-tertiary"], ["text-secondary", "bg-secondary"]][i];
          return (
            <div key={r.key} className="p-space-xs bg-surface-container rounded border border-outline-variant flex flex-col gap-1">
              <div className="flex justify-between items-center text-telemetry-sm font-telemetry-sm">
                <span className="text-on-surface font-medium">{r.label}</span>
                <span className={`font-bold ${txt}`}>{fmt(r.probability * 100, 1)}% Risk</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div className={`${bg} h-full rounded-full`} style={{ width: `${r.probability * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
