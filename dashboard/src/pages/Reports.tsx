/* Reports — rebuilt from the Stitch "Reports" screen (7_reports.html); bound to /api/reports. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { API_BASE, ApiError, request } from "../lib/api";
import { usePoll } from "../lib/usePoll";
import { fmt, fmtHms, kToC, signed } from "../lib/units";

const TYPE_CHIPS: [string, string][] = [
  ["post_mission", "Post-Mission"],
  ["scheduled_maintenance", "Scheduled Maintenance"],
  ["anomaly_investigation", "Anomaly Investigation"],
  ["airworthiness_cert", "Airworthiness Cert"],
];

const SUBSYSTEMS: [string, string][] = [
  ["combustion", "Combust"],
  ["cooling", "Cooling"],
  ["lubrication", "Oil Sys"],
  ["electrical", "Electr"],
];

const STATUS_CHIP: Record<string, { cls: string; dot?: string; label: string }> = {
  PENDING_REVIEW: { cls: "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]", dot: "bg-[#F59E0B]", label: "PENDING REVIEW" },
  APPROVED: { cls: "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]", dot: "bg-[#16A34A]", label: "APPROVED" },
  WORK_ORDER_ISSUED: { cls: "bg-[#FFEDD5] text-[#C2410C] border border-[#FED7AA]", dot: "bg-[#EA580C]", label: "WORK ORDER ISSUED" },
  ARCHIVED: { cls: "bg-surface-container text-on-surface-variant", label: "ARCHIVED" },
};

const RISK_CHIP: Record<string, string> = {
  NORMAL: "bg-[#DCFCE7] text-[#15803D]",
  WATCH: "bg-[#FEF3C7] text-[#B45309]",
  WARNING: "bg-[#FFEDD5] text-[#C2410C]",
  CRITICAL: "bg-[#FEE2E2] text-[#DC2626]",
};

const SHAP_COLORS = ["#EA580C", "#0047d3", "#64748B"];

const SEGMENT_LABELS: Record<string, string> = {
  taxi: "Taxi", takeoff: "Takeoff", climb: "Climb", cruise: "Cruise", loiter: "Loiter", transit: "Transit",
  descent: "Descent prep", landing: "Landing", dash: "Dash", hold: "Hold",
};

const RAW_FMT: Record<string, [string, string]> = {
  "HDF5 Raw Sensor Dump": ["hdf5", "HDF5"],
  "MIL-STD-1553B JSON": ["1553json", "1553B JSON"],
};

/** Health-index colour as in the Stitch list: green ≥ 90, amber ≥ 80, orange below. */
function hiColor(v: number | null | undefined): string {
  if (v == null) return "text-on-surface";
  return v >= 90 ? "text-[#15803D]" : v >= 80 ? "text-[#B45309]" : "text-[#EA580C]";
}

function whenLabel(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const days = Math.floor((now.setHours(0, 0, 0, 0) - new Date(ts * 1000).setHours(0, 0, 0, 0)) / 86400000);
  const hm = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (days <= 0) return `Today, ${hm}`;
  if (days === 1) return `Yesterday, ${hm}`;
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function issueDate(ts: number): string {
  const d = new Date(ts * 1000);
  return `${String(d.getUTCDate()).padStart(2, "0")}-${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase()}-${d.getUTCFullYear()}`;
}

function zulu(ts: number): string {
  return new Date(ts * 1000).toISOString().replace("T", " ").slice(0, 19) + "Z";
}

const shortSha = (h: string | null | undefined) => (h ? `${h.slice(0, 4)}...${h.slice(-4)}` : "--");

export default function Reports() {
  const { session } = useAuth();
  const tailId = session?.tail_id ?? null;
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  const list = usePoll(() => request<any>(`/api/reports?report_type=${filter}`), 15000, [filter]);
  const options = usePoll(() => request<any>(`/api/reports/options${tailId ? `?tail_id=${tailId}` : ""}`), 30000, [tailId]).data;
  const reports: any[] = list.data?.reports ?? [];

  useEffect(() => {
    if (reports.length && (!selected || !reports.some((r) => r.report_id === selected))) setSelected(reports[0].report_id);
  }, [reports, selected]);

  const detail = usePoll(() => (selected ? request<any>(`/api/reports/${selected}`) : Promise.resolve(null)), 0, [selected]);
  const report = detail.data && detail.data.report_id === selected ? detail.data : null;

  // Quick report parameter setup.
  const [mission, setMission] = useState<string>("");
  const [compliance, setCompliance] = useState<string>("STANAG 4671 PDF");
  const [subs, setSubs] = useState<string[]>(SUBSYSTEMS.map(([k]) => k));
  const [shap, setShap] = useState(true);
  const missionRef = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (options?.missions?.length && !options.missions.some((m: any) => m.mission_run_id === mission)) setMission(options.missions[0].mission_run_id);
  }, [options, mission]);

  async function act<T>(key: string, fn: () => Promise<T>, ok: (r: T) => string) {
    setBusy(key);
    setNotice(null);
    try {
      const r = await fn();
      setNotice({ text: ok(r) });
      return r;
    } catch (e) {
      setNotice({ text: e instanceof ApiError ? e.detail : String(e), error: true });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function dispatchJob() {
    const reportType = filter === "all" ? "post_mission" : filter;
    const r = await act(
      "generate",
      () => request<any>("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          report_type: reportType, mission_run_id: reportType === "scheduled_maintenance" ? null : mission || null,
          tail_id: tailId, compliance, subsystems: subs, include_shap: shap,
        }),
      }),
      (r: any) => `${r.report_id} generated`,
    );
    if (r) {
      await list.refresh();
      setSelected((r as any).report_id);
    }
  }

  async function sign(slot: "engineering" | "maintenance") {
    if (!report) return;
    const r = await act(`sign-${slot}`, () => request<any>(`/api/reports/${report.report_id}/sign`, { method: "POST", body: JSON.stringify({ slot }) }),
      () => `Signature recorded on ${report.report_id}`);
    if (r) {
      detail.refresh();
      list.refresh();
    }
  }

  async function sendToFlightLine() {
    if (!report) return;
    const r = await act("dispatch", () => request<any>(`/api/reports/${report.report_id}/dispatch`, { method: "POST" }),
      (r: any) => `Sent to ${r.dispatched_to}`);
    if (r) detail.refresh();
  }

  const rawFmt = RAW_FMT[report?.compliance] ?? ["csv", "CSV"];

  return (
    <main className="flex-1 flex overflow-hidden">
      {/* ==================== LEFT COLUMN: REPORTS MANAGEMENT (~38%) ==================== */}
      <section className="w-[38%] border-r border-outline-variant flex flex-col bg-surface-bright h-full overflow-hidden shrink-0">
        <div className="p-space-lg border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <div>
            <h2 className="text-headline-sm font-headline-sm text-on-surface tracking-tight">Airworthiness & Mission Reports</h2>{" "}
            <p className="font-body-sm text-body-sm text-on-surface-variant">Archived digital twin telemetry and STANAG debriefs</p>
          </div>{" "}
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded text-body-sm font-medium hover:bg-[#1748D1] active:bg-[#143DAF] transition-colors shadow-xs"
            onClick={() => {
              missionRef.current?.scrollIntoView({ block: "nearest" });
              missionRef.current?.focus();
            }}
          >
            <span className="material-symbols-outlined text-[16px]">add</span> <span>Generate New Report</span>
          </button>
        </div>{" "}
        <div className="px-space-lg py-space-sm border-b border-outline-variant bg-surface flex items-center gap-1.5 overflow-x-auto text-nowrap">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>All ({list.data?.total ?? 0})</Chip>{" "}
          {TYPE_CHIPS.map(([k, label]) => (
            <span key={k} className="contents">
              <Chip active={filter === k} onClick={() => setFilter(k)}>{label}</Chip>{" "}
            </span>
          ))}
        </div>{" "}
        <div className="flex-1 overflow-y-auto divide-y divide-outline-variant">
          {reports.map((r) => <ReportRow key={r.report_id} r={r} selected={r.report_id === selected} onClick={() => setSelected(r.report_id)} />)}
          {list.data && reports.length === 0 && (
            <div className="p-space-lg font-body-sm text-body-sm text-on-surface-variant">No reports of this type yet. Use the parameter setup below to dispatch one.</div>
          )}
        </div>{" "}
        {/* Embedded Quick Generation Config Panel */}
        <div className="p-space-lg border-t border-outline-variant bg-surface-container-low shrink-0">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-caps text-label-caps text-on-surface font-bold uppercase">Quick Report Parameter Setup</span>{" "}
            <span className="text-telemetry-sm font-telemetry-sm text-primary">{options?.compliance_edition ?? "STANAG 4671 Ed.3"}</span>
          </div>{" "}
          <div className="grid grid-cols-2 gap-space-sm mb-space-sm">
            <div>
              <label className="block font-label-caps text-[10px] text-outline mb-1">TARGET MISSION</label>{" "}
              <select
                ref={missionRef}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                value={mission}
                onChange={(e) => setMission(e.target.value)}
              >
                {(options?.missions ?? []).map((m: any) => (
                  <option key={m.mission_run_id} value={m.mission_run_id}>
                    {m.current ? `${m.sortie_label} (Current Flight)` : `${m.sortie_label} ${m.start_time ? new Date(m.start_time * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase().replace(" ", "-") : ""}`}
                  </option>
                ))}
              </select>
            </div>{" "}
            <div>
              <label className="block font-label-caps text-[10px] text-outline mb-1">EXPORT COMPLIANCE</label>{" "}
              <select
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                value={compliance}
                onChange={(e) => setCompliance(e.target.value)}
              >
                {(options?.compliance ?? ["STANAG 4671 PDF"]).map((c: string) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>{" "}
          <div className="mb-space-sm">
            <label className="block font-label-caps text-[10px] text-outline mb-1">INCLUDE SUBSYSTEM ATTRIBUTION</label>{" "}
            <div className="grid grid-cols-4 gap-1">
              {SUBSYSTEMS.map(([k, label]) => (
                <label key={k} className="flex items-center gap-1 text-[11px] font-body-sm bg-surface-container-lowest border border-outline-variant px-1.5 py-1 rounded cursor-pointer">
                  <input
                    className="rounded text-primary focus:ring-0 w-3 h-3"
                    type="checkbox"
                    checked={subs.includes(k)}
                    onChange={(e) => setSubs((s) => (e.target.checked ? [...s, k] : s.filter((x) => x !== k)))}
                  />{" "}
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>{" "}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-1.5 text-body-sm text-on-surface cursor-pointer select-none">
              <input className="rounded text-primary focus:ring-0 w-3.5 h-3.5" type="checkbox" checked={shap} onChange={(e) => setShap(e.target.checked)} />{" "}
              <span className="font-medium text-telemetry-sm">Include AI Shapley Value Attribution</span>
            </label>{" "}
            <button
              className="px-3 py-1 bg-surface-container-highest border border-outline-variant text-primary rounded font-telemetry-sm text-telemetry-sm font-semibold hover:bg-surface-variant transition-colors disabled:opacity-60"
              disabled={busy === "generate"}
              onClick={dispatchJob}
            >
              {busy === "generate" ? "Generating…" : "Dispatch Job"}
            </button>
          </div>
          {notice && <p className={`mt-1.5 font-telemetry-sm text-[10px] ${notice.error ? "text-error" : "text-[#15803D]"}`}>{notice.text}</p>}
        </div>
      </section>{" "}
      {/* ==================== RIGHT COLUMN: A4 TECHNICAL DOCUMENT PREVIEW (~62%) ==================== */}
      <section className="flex-1 flex flex-col bg-surface-container h-full overflow-hidden">
        <div className="h-12 bg-surface-container-lowest border-b border-outline-variant px-space-lg flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-telemetry-sm text-telemetry-sm font-bold text-on-surface">DOCUMENT PREVIEW:</span>{" "}
            <span className="font-telemetry-sm text-telemetry-sm text-outline">
              {report ? `${report.pdf_file} (Page 1 of ${report.pdf_pages})` : "--"}
            </span>
          </div>{" "}
          <div className="flex items-center gap-space-sm">
            <a
              className={`inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-body-sm hover:bg-surface-container transition-colors shadow-xs ${report ? "" : "pointer-events-none opacity-60"}`}
              href={report ? `${API_BASE}/api/reports/${report.report_id}/pdf` : undefined}
              download
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>{" "}
              <span className="font-telemetry-sm text-telemetry-sm">Download PDF (STANAG A4)</span>
            </a>{" "}
            <a
              className={`inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-body-sm hover:bg-surface-container transition-colors shadow-xs ${report?.mission_run_id ? "" : "pointer-events-none opacity-60"}`}
              href={report?.mission_run_id ? `${API_BASE}/api/reports/${report.report_id}/raw?fmt=${rawFmt[0]}` : undefined}
              title={`Raw telemetry as ${rawFmt[1]} (${report?.compliance ?? ""})`}
              download
            >
              <span className="material-symbols-outlined text-[16px]">data_object</span>{" "}
              <span className="font-telemetry-sm text-telemetry-sm">Export Raw CSV/HDF5</span>
            </a>{" "}
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary text-on-primary rounded font-body-sm hover:bg-[#1748D1] transition-colors shadow-xs disabled:opacity-60"
              disabled={!report || busy === "dispatch"}
              onClick={sendToFlightLine}
              title={report?.dispatched_at ? `Last sent ${zulu(report.dispatched_at)}` : undefined}
            >
              <span className="material-symbols-outlined text-[16px]">{report?.dispatched_at ? "done_all" : "send"}</span>{" "}
              <span className="font-telemetry-sm text-telemetry-sm font-semibold">Send to {report?.dispatch_recipient ?? "Flight-Line Alpha"}</span>
            </button>
          </div>
        </div>{" "}
        <div className="flex-1 overflow-y-auto p-space-xl flex justify-center watermark-pattern">
          {report ? (
            <Sheet report={report} role={session?.role ?? null} busy={busy} onSign={sign} />
          ) : (
            <div className="my-auto font-body-sm text-body-sm text-on-surface-variant">{list.data && reports.length === 0 ? "No report selected." : "Loading report…"}</div>
          )}
        </div>
      </section>
    </main>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={`px-2.5 py-1 rounded-full text-telemetry-sm font-telemetry-sm ${active ? "bg-primary text-on-primary font-semibold" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-medium"}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function StatusChip({ status }: { status: string }) {
  const s = STATUS_CHIP[status] ?? STATUS_CHIP.ARCHIVED;
  return (
    <span className={`inline-flex items-center ${s.dot ? "gap-1" : ""} px-2 py-0.5 rounded-full text-telemetry-sm font-telemetry-sm font-semibold ${s.cls}`}>
      {s.dot && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
      {s.dot ? " " : ""}
      {s.label}
    </span>
  );
}

function Meta({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-outline">{label}</span> <span className={className}>{children}</span>
    </div>
  );
}

function ReportRow({ r, selected, onClick }: { r: any; selected: boolean; onClick: () => void }) {
  const s = r.summary ?? {};
  const hi = s.health_index;
  return (
    <article
      className={`p-space-lg cursor-pointer transition-colors ${selected ? "bg-surface-container-high border-l-4 border-primary hover:bg-surface-container-highest" : "bg-surface-container-lowest hover:bg-[#EEF4FF]"}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`font-telemetry-md text-telemetry-md font-bold ${selected ? "text-primary" : "text-on-surface"}`}>{r.report_id}</span>{" "}
          <StatusChip status={r.status} />
        </div>{" "}
        <span className={`font-telemetry-sm text-telemetry-sm text-on-surface-variant ${selected ? "font-medium" : ""}`}>{whenLabel(r.created_at)}</span>
      </div>{" "}
      <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">{r.title}</h3>{" "}
      <div className="flex items-center gap-space-lg font-telemetry-sm text-telemetry-sm text-on-surface-variant">
        {r.report_type === "fleet" ? (
          <>
            <Meta label="Scope:">Fleet-Wide ({s.units ?? "--"} Units)</Meta>{" "}
            <Meta label="Type:" className="font-bold text-on-surface">{r.type_label}</Meta>
          </>
        ) : r.report_type === "scheduled_maintenance" ? (
          <>
            <Meta label="Health Index:" className={`font-bold ${hiColor(hi)}`}>{fmt(hi)}/100</Meta>{" "}
            <Meta label="Hours:">{fmt(s.hours, 1)} hrs</Meta>
          </>
        ) : (
          <>
            <Meta label="Health Index:" className={`font-bold ${hiColor(hi)}`}>{fmt(hi)}/100</Meta>{" "}
            <Meta label="Engine:">{s.engine ?? "--"}</Meta>{" "}
            <div className="flex items-center gap-1 text-primary">
              <span className="material-symbols-outlined text-[14px]">task_alt</span> <span>{r.compliance?.startsWith("STANAG") ? "STANAG-4671" : r.compliance}</span>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function SectionHead({ n, title, right, rightClass = "text-[#64748B]", mb = "mb-2" }: { n: string; title: string; right?: string; rightClass?: string; mb?: string }) {
  return (
    <div className={`flex items-center justify-between border-b border-[#CBD5E1] pb-1 ${mb}`}>
      <h2 className="font-headline-sm text-headline-sm font-bold tracking-tight uppercase text-[#0F172A] flex items-center gap-1.5">
        <span className="text-[#0047d3]">{n}</span> {title}
      </h2>{" "}
      {right && <span className={`font-telemetry-sm text-[10px] ${rightClass}`}>{right}</span>}
    </div>
  );
}

function Kpi({ label, children, foot, footClass = "text-[#64748B]" }: { label: string; children: React.ReactNode; foot: string; footClass?: string }) {
  return (
    <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded">
      <p className="font-label-caps text-[10px] text-[#64748B] font-semibold">{label}</p>{" "}
      {children}{" "}
      <p className={`font-telemetry-sm text-[10px] mt-1 ${footClass}`}>{foot}</p>
    </div>
  );
}

function Sheet({ report, role, busy, onSign }: { report: any; role: string | null; busy: string | null; onSign: (slot: "engineering" | "maintenance") => void }) {
  const c = report.content ?? {};
  const tail = c.tail ?? {};
  const s1 = c.section1 ?? {};
  const s2 = c.section2 ?? {};
  const actions: any[] = c.section3?.actions ?? [];
  const isMission = !!c.mission;
  const isFleet = report.report_type === "fleet";
  const pages = report.pdf_pages ?? 1;

  return (
    <div className="w-full max-w-[820px] bg-white border border-[#CBD5E1] rounded-sm p-10 shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_15px_-3px_rgba(15,23,42,0.03)] text-[#0F172A] relative flex flex-col justify-between my-auto">
      <div className="border-b-2 border-[#0F172A] pb-3 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#0047d3] text-white flex items-center justify-center font-bold text-xs rounded-sm">AT</div>{" "}
            <div>
              <h1 className="text-headline-md font-headline-md font-bold tracking-tight text-[#0F172A] leading-tight">AeroTwin DEFENSE SYSTEMS</h1>{" "}
              <p className="font-label-caps text-[10px] text-[#475569] tracking-wider uppercase">PROPULSION DIGITAL TWIN AIRWORTHINESS ASSESSMENT</p>
            </div>
          </div>{" "}
          <div className="text-right">
            <span className="inline-block px-2 py-0.5 bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] font-telemetry-sm text-[10px] font-bold tracking-wider">RESTRICTED // MIL-STD-882E</span>{" "}
            <p className="font-telemetry-sm text-[10px] text-[#64748B] mt-0.5">REF: {c.ref}</p>
          </div>
        </div>{" "}
        <div className="grid grid-cols-4 gap-2 bg-[#F8FAFC] border border-[#E2E8F0] p-2 font-telemetry-sm text-telemetry-sm text-[#334155] rounded-xs">
          <div>
            <span className="text-[#64748B]">SERIAL:</span> <strong>{isFleet ? `FLEET (${c.units ?? "--"} UNITS)` : `${tail.tail_id} (${tail.engine_class})`}</strong>
          </div>{" "}
          <div>
            <span className="text-[#64748B]">PROPULSION SN:</span> <strong>{isFleet ? "--" : tail.engine_serial ?? "--"}</strong>
          </div>{" "}
          <div>
            <span className="text-[#64748B]">TOTAL FLIGHT HRS:</span> <strong>{isFleet ? "--" : `${fmt(tail.total_hours, 1)} hrs`}</strong>
          </div>{" "}
          <div>
            <span className="text-[#64748B]">DATE OF ISSUANCE:</span> <strong>{issueDate(c.issued_at ?? report.created_at)}</strong>
          </div>
        </div>
      </div>{" "}
      <div className="space-y-6">
        {isFleet ? <FleetBody c={c} /> : (
          <>
            <div>
              <SectionHead
                n="1.0"
                title="Executive Propulsion Assessment & In-Flight Telemetry"
                right={isMission ? `MISSION: ${[c.mission.name, c.mission.profile].filter(Boolean).join(" ")}`.toUpperCase() : `STATUS: ${s1.status ?? "--"}`}
                mb="mb-3"
              />{" "}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Kpi
                  label="ENGINE HEALTH INDEX (EHI)"
                  foot={s1.ehi_delta_vs_baseline != null ? `${signed(s1.ehi_delta_vs_baseline, 1)} delta against baseline` : "Baseline not yet established"}
                >
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`font-telemetry-xl text-telemetry-xl font-bold ${hiColor(s1.ehi)}`}>{fmt(s1.ehi)}</span>{" "}
                    <span className="font-telemetry-sm text-telemetry-sm text-[#64748B]">/ 100</span>{" "}
                    {s1.ehi_risk && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-telemetry-sm ml-auto ${RISK_CHIP[s1.ehi_risk] ?? RISK_CHIP.WATCH}`}>{s1.ehi_risk}</span>}
                  </div>
                </Kpi>{" "}
                <RulKpi s1={s1} flightHours={c.mission?.flight_hours} />{" "}
                {isMission ? (
                  <Kpi label="FLIGHT ENVELOPE PROFILE" foot={s1.envelope ? `Density altitude: ${fmt(s1.envelope.density_altitude_m)}m` : "--"}>
                    <div className="flex items-baseline gap-1 mt-1 font-telemetry-md text-telemetry-md font-bold text-[#0F172A]">
                      <span>{s1.envelope ? `${fmt(s1.envelope.altitude_m)}m ALT` : "--"}</span> <span className="text-[#64748B] font-normal">·</span>{" "}
                      <span>{s1.envelope ? `${fmt(s1.envelope.oat_c)}°C OAT` : "--"}</span>
                    </div>
                  </Kpi>
                ) : (
                  <Kpi label="SCHEDULED TASKS DUE" foot={`${(s2.work_orders ?? []).filter((w: any) => w.status !== "CLOSED").length} open work orders`}>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-telemetry-xl text-telemetry-xl font-bold text-[#0F172A]">{(s2.scheduled ?? []).length}</span>{" "}
                      <span className="font-telemetry-sm text-telemetry-sm text-[#64748B]">tasks</span>
                    </div>
                  </Kpi>
                )}
              </div>{" "}
              {isMission && <AnomalyCallout a={s1.primary_anomaly} />}
            </div>{" "}
            {isMission ? <DivergenceSection s2={s2} includeShap={c.include_shap} /> : <ScheduledSection s2={s2} />}
          </>
        )}{" "}
        {actions.length > 0 && (
          <div>
            <SectionHead
              n="3.0"
              title={isMission ? "Mandatory Pre-Flight Corrective Actions" : "Scheduled Maintenance Actions"}
              right={actions.some((a) => a.priority === "HIGH") ? "AIRWORTHINESS DIRECTIVE" : "MAINTENANCE PLANNING"}
              rightClass={actions.some((a) => a.priority === "HIGH") ? "text-[#DC2626] font-bold" : "text-[#0047d3] font-bold"}
            />{" "}
            <div className="space-y-2">
              {actions.map((a) => {
                const high = a.priority === "HIGH";
                return (
                  <div key={a.n} className="flex items-start gap-2.5 p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded">
                    <div className={`w-5 h-5 rounded flex items-center justify-center font-telemetry-sm text-[11px] font-bold shrink-0 mt-0.5 ${high ? "bg-error-container text-on-error-container" : "bg-surface-container-high text-primary"}`}>{a.n}</div>{" "}
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-headline-sm text-body-md font-bold text-[#0F172A]">{a.title}</h4>{" "}
                        <span className={`font-telemetry-sm text-[10px] font-semibold uppercase shrink-0 ${high ? "text-[#DC2626]" : "text-[#0047d3]"}`}>{a.tag}</span>
                      </div>{" "}
                      <p className="font-body-sm text-[11px] text-[#475569] mt-0.5">{a.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}{" "}
        <div className="pt-2">
          <div className="border-t border-[#CBD5E1] pt-3">
            <div className="grid grid-cols-2 gap-6">
              <SignBox
                label="PROPULSION CHIEF ENGINEER"
                signedBy={report.signed_by}
                signerId={report.signer_operator_id}
                signedAt={report.signed_at}
                sha={report.signature_sha256}
                pendingName="Propulsion Engineering"
                pendingNote="Awaiting twin residual & attribution review"
                pendingFoot="Required before maintenance sign-off"
                canSign={role === "propulsion_engineer"}
                roleLabel="Propulsion Engineer"
                busy={busy === "sign-engineering"}
                onSign={() => onSign("engineering")}
              />{" "}
              <SignBox
                label="CHIEF MAINTENANCE OFFICER"
                signedBy={report.maint_signed_by}
                signerId={report.maint_signer_operator_id}
                signedAt={report.maint_signed_at}
                sha={report.maint_signature_sha256}
                pendingName="Flight-Line Base Engineering"
                pendingNote="Awaiting physical ground inspection verification"
                pendingFoot="Signoff unlocks flight permit"
                canSign={role === "maint_tech"}
                roleLabel="Maintenance Technician"
                busy={busy === "sign-maintenance"}
                onSign={() => onSign("maintenance")}
              />
            </div>
          </div>
        </div>
      </div>{" "}
      <div className="mt-8 pt-3 border-t border-[#CBD5E1] flex items-center justify-between font-telemetry-sm text-[9px] text-[#64748B]">
        <span>STANAG 4671 ED.3 // AIRWORTHINESS CODE FOR MILITARY UAV SYSTEMS</span>{" "}
        <span>AeroTwin Engine Telemetry Analytics v{report.software_version}</span>{" "}
        <span>PAGE 1 OF {pages} // CLASSIFIED GROUND USE ONLY</span>
      </div>
    </div>
  );
}

function RulKpi({ s1, flightHours }: { s1: any; flightHours?: number }) {
  const mean = s1.rul_mean_hours;
  const half = s1.rul_p05_hours != null && s1.rul_p95_hours != null ? (s1.rul_p95_hours - s1.rul_p05_hours) / 2 : null;
  // Sufficient if even the pessimistic (5th percentile) life covers another sortie of this length.
  const sortie = flightHours ?? 0;
  const enough = s1.rul_p05_hours == null || s1.rul_p05_hours > Math.max(sortie, 1);
  return (
    <Kpi
      label="REMAINING USEFUL LIFE (RUL)"
      foot={mean == null ? "No significant degradation trend" : enough ? "Sufficient for planned sorties" : "Plan overhaul before next sortie"}
      footClass={mean == null || enough ? "text-[#15803D]" : "text-[#DC2626]"}
    >
      <div className="flex items-baseline gap-2 mt-1">
        <span className="font-telemetry-xl text-telemetry-xl font-bold text-[#0F172A]">{mean == null ? "--" : fmt(mean)}</span>{" "}
        <span className="font-telemetry-sm text-telemetry-sm text-[#64748B]">hours</span>{" "}
        {half != null && <span className="text-telemetry-sm text-[11px] text-[#64748B] ml-auto">(±{fmt(half)} hrs)</span>}
      </div>
    </Kpi>
  );
}

function AnomalyCallout({ a }: { a: any }) {
  if (!a) {
    return (
      <div className="border-l-4 border-[#16A34A] bg-[#F0FDF4] p-3 rounded-r text-[#166534]">
        <div className="flex items-center gap-1.5 font-bold font-telemetry-sm text-telemetry-sm">
          <span className="material-symbols-outlined text-[16px]">verified</span> <span>NO PRIMARY ANOMALY IDENTIFIED</span>
        </div>{" "}
        <p className="font-body-sm text-body-sm text-[#14532D] mt-1 leading-relaxed">All digital twin output residuals remained within tolerance for the sortie; no fault classification persisted past arming.</p>
      </div>
    );
  }
  const parts = [];
  if (a.residual_k != null && a.cylinder) {
    parts.push(`Digital twin thermodynamic surrogate detected an uncommanded ${signed(a.residual_k, 1)} °C residual drift above expected Cylinder Head Temperature (CHT ${a.cylinder})${a.rpm ? ` at ${fmt(a.rpm)} RPM` : ""}.`);
  }
  if (a.manifold_nominal) parts.push("Manifold pressure remained nominal against the twin, ruling out an induction-side cause.");
  if (a.diagnosis) parts.push(a.diagnosis);
  return (
    <div className="border-l-4 border-[#EA580C] bg-[#FFF7ED] p-3 rounded-r text-[#9A3412]">
      <div className="flex items-center gap-1.5 font-bold font-telemetry-sm text-telemetry-sm">
        <span className="material-symbols-outlined text-[16px]">warning</span> <span>{a.title}</span>
      </div>{" "}
      <p className="font-body-sm text-body-sm text-[#7C2D12] mt-1 leading-relaxed">{parts.join(" ")}</p>
    </div>
  );
}

function DivergenceSection({ s2, includeShap }: { s2: any; includeShap: boolean }) {
  const d = s2.divergence;
  // Top positive contributions toward the anomalous class, bars as share of their sum.
  const shap: any[] = (s2.shap ?? []).filter((f: any) => f.value > 0).sort((a: any, b: any) => b.value - a.value).slice(0, 3);
  const shapSum = shap.reduce((t, f) => t + f.value, 0) || 1;
  return (
    <div>
      <SectionHead
        n="2.0"
        title="Digital Twin Telemetry Divergence & Feature Attribution"
        right={s2.sampling_hz ? `SAMPLING: ${fmt(s2.sampling_hz, s2.sampling_hz < 10 ? 1 : 0)} Hz SYNCHRONOUS` : undefined}
      />{" "}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-7 bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="font-telemetry-sm text-[11px] font-bold text-[#0F172A]">CHT CYLINDER {d?.cylinder ?? "--"} vs. TWIN SIMULATION</span>{" "}
            <div className="flex items-center gap-3 font-telemetry-sm text-[10px]">
              <span className="flex items-center gap-1 text-[#0047d3]">
                <span className="w-3 h-0.5 bg-[#0047d3]" /> Measured Intake
              </span>{" "}
              <span className="flex items-center gap-1 text-[#006a69]">
                <span className="w-3 h-0.5 bg-[#006a69] border-t border-dashed" /> Twin Baseline
              </span>
            </div>
          </div>{" "}
          <DivergenceChart d={d} />
        </div>{" "}
        <div className="col-span-5 bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded flex flex-col justify-between">
          <div>
            <span className="font-telemetry-sm text-[11px] font-bold text-[#0F172A] block mb-1.5">AI SHAPLEY ATTRIBUTION VALUES</span>{" "}
            <p className="font-body-sm text-[10px] text-[#64748B] mb-2 leading-tight">Contribution weight towards anomalous thermodynamic variance:</p>{" "}
            <div className="space-y-1.5">
              {shap.map((f, i) => (
                <div key={f.feature}>
                  <div className="flex justify-between font-telemetry-sm text-[10px] text-[#334155] mb-0.5">
                    <span>{f.label}</span> <span className="font-bold" style={{ color: SHAP_COLORS[i] }}>{signed(f.value, 2)} Φ</span>
                  </div>{" "}
                  <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${(f.value / shapSum) * 100}%`, background: SHAP_COLORS[i] }} />
                  </div>
                </div>
              ))}
              {shap.length === 0 && (
                <p className="font-telemetry-sm text-[10px] text-[#64748B]">
                  {includeShap ? "No anomalous classification to attribute for this sortie." : "Shapley attribution excluded from this report."}
                </p>
              )}
            </div>
          </div>{" "}
          <div className="text-[9px] font-telemetry-sm text-[#64748B] pt-2 border-t border-[#E2E8F0]">
            Twin Model Confidence: <strong>{s2.twin_confidence_pct != null ? `${fmt(s2.twin_confidence_pct, 1)}%` : "--"}</strong> (MIL-HDBK-516C)
          </div>
        </div>
      </div>
    </div>
  );
}

function DivergenceChart({ d }: { d: any }) {
  const geo = useMemo(() => {
    if (!d || !d.t_s?.length) return null;
    const n = d.t_s.length;
    const meas: number[] = d.measured_k.map((k: number) => kToC(k)!);
    const exp: number[] = d.expected_k.map((k: number) => kToC(k)!);
    const lo = Math.min(...meas, ...exp);
    const hi = Math.max(...meas, ...exp);
    const span = Math.max(hi - lo, 1);
    const x = (i: number) => (i / Math.max(n - 1, 1)) * 400;
    const y = (v: number) => 85 - ((v - lo) / span) * 60;
    const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const delta = meas.map((m, i) => m - exp[i]);
    const peak = delta.reduce((b, v, i) => (v > delta[b] ? i : b), 0);
    // Shade the divergence from where it first exceeds 30 % of its peak.
    const onset = delta[peak] > 0.5 ? delta.findIndex((v) => v >= 0.3 * delta[peak]) : -1;
    let poly = "";
    if (onset >= 0) {
      const top = [];
      const bot = [];
      for (let i = onset; i < n; i++) {
        top.push(`${x(i).toFixed(1)},${y(Math.max(meas[i], exp[i])).toFixed(1)}`);
        bot.unshift(`${x(i).toFixed(1)},${y(exp[i]).toFixed(1)}`);
      }
      poly = [...top, ...bot].join(" ");
    }
    const segs: string[] = d.segments ?? [];
    const label = (i: number) => {
      const seg = segs[i];
      return `T+${fmtHms(d.t_s[i])}${seg ? ` (${SEGMENT_LABELS[seg] ?? seg})` : ""}`;
    };
    return {
      meas: path(meas), exp: path(exp), poly, peak: { x: x(peak), y: y(meas[peak]) }, onset,
      labels: [label(0), label(Math.floor((n - 1) / 2)), label(n - 1)],
    };
  }, [d]);

  return (
    <>
      <div className="h-28 w-full relative flex items-end">
        <div className="absolute inset-0 flex flex-col justify-between opacity-30 pointer-events-none">
          <div className="w-full border-b border-[#94A3B8]" /> <div className="w-full border-b border-[#94A3B8]" /> <div className="w-full border-b border-[#94A3B8]" />
        </div>{" "}
        {geo && (
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 100">
            {geo.poly && <polygon fill="#FEE2E2" opacity="0.6" points={geo.poly} />}
            <path d={geo.exp} fill="none" stroke="#006a69" strokeDasharray="4,3" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <path d={geo.meas} fill="none" stroke="#0047d3" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            {geo.onset >= 0 && <circle cx={geo.peak.x} cy={geo.peak.y} fill="#DC2626" r="4" />}
          </svg>
        )}{" "}
        {d && (
          <div className="absolute top-2 right-2 bg-white/95 border border-[#FCA5A5] px-1.5 py-0.5 rounded shadow-xs text-right">
            <span className="font-telemetry-sm text-[9px] text-[#DC2626] font-bold">Δ {signed(d.max_delta_k, 1)} °C Divergence</span>
          </div>
        )}
      </div>{" "}
      <div className="flex justify-between font-telemetry-sm text-[9px] text-[#64748B] mt-1 pt-1 border-t border-[#E2E8F0]">
        {(geo?.labels ?? ["--", "--", "--"]).map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </>
  );
}

function ScheduledSection({ s2 }: { s2: any }) {
  const tasks: any[] = s2.scheduled ?? [];
  const wos: any[] = (s2.work_orders ?? []).slice(0, 6);
  return (
    <div>
      <SectionHead n="2.0" title="Scheduled Inspection Intervals & Open Work Orders" right={`${tasks.length} TASKS DUE`} />{" "}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-7 bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded">
          <span className="font-telemetry-sm text-[11px] font-bold text-[#0F172A] block mb-1.5">INTERVAL TASKS BY ENGINE HOURS</span>{" "}
          <div className="space-y-1.5">
            {tasks.slice(0, 5).map((t) => (
              <div key={t.key}>
                <div className="flex justify-between font-telemetry-sm text-[10px] text-[#334155] mb-0.5">
                  <span>{t.title}</span> <span className={`font-bold ${t.due_in_hours <= 10 ? "text-[#EA580C]" : "text-[#0047d3]"}`}>{fmt(t.due_in_hours)} h</span>
                </div>{" "}
                <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full ${t.due_in_hours <= 10 ? "bg-[#EA580C]" : "bg-[#0047d3]"}`} style={{ width: `${Math.max(2, 100 - Math.min(100, (t.due_in_hours / (t.interval_hours || 100)) * 100))}%` }} />
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="font-telemetry-sm text-[10px] text-[#64748B]">No interval tasks due.</p>}
          </div>
        </div>{" "}
        <div className="col-span-5 bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded">
          <span className="font-telemetry-sm text-[11px] font-bold text-[#0F172A] block mb-1.5">WORK ORDERS</span>{" "}
          <div className="space-y-1">
            {wos.map((w) => (
              <div key={w.wo_number} className="flex justify-between font-telemetry-sm text-[10px] text-[#334155]">
                <span className="truncate pr-2">{w.wo_number} · {w.title}</span> <span className="font-bold shrink-0">{w.status}</span>
              </div>
            ))}
            {wos.length === 0 && <p className="font-telemetry-sm text-[10px] text-[#64748B]">No work orders on record.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function FleetBody({ c }: { c: any }) {
  const fleet: any[] = c.fleet ?? [];
  const per: Record<string, any> = Object.fromEntries((c.per_tail ?? []).map((p: any) => [p.tail_id, p]));
  const his = fleet.map((f) => f.health_index).filter((v) => v != null);
  const ruls = fleet.map((f) => f.rul_hours).filter((v) => v != null);
  const focus = String(c.focus ?? "").replace(/_/g, " ").toUpperCase();
  return (
    <>
      <div>
        <SectionHead n="1.0" title="Fleet Propulsion Assessment" right={`FOCUS: ${focus}`} mb="mb-3" />{" "}
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="FLEET MEAN HEALTH INDEX" foot={`${his.length} of ${fleet.length} units reporting`}>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`font-telemetry-xl text-telemetry-xl font-bold ${hiColor(his.length ? his.reduce((a, b) => a + b, 0) / his.length : null)}`}>
                {his.length ? fmt(his.reduce((a, b) => a + b, 0) / his.length) : "--"}
              </span>{" "}
              <span className="font-telemetry-sm text-telemetry-sm text-[#64748B]">/ 100</span>
            </div>
          </Kpi>{" "}
          <Kpi label="LOWEST RUL IN FLEET" foot={ruls.length ? `${fleet.find((f) => f.rul_hours === Math.min(...ruls))?.tail_id}` : "No significant trends"}>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-telemetry-xl text-telemetry-xl font-bold text-[#0F172A]">{ruls.length ? fmt(Math.min(...ruls)) : "--"}</span>{" "}
              <span className="font-telemetry-sm text-telemetry-sm text-[#64748B]">hours</span>
            </div>
          </Kpi>{" "}
          <Kpi label="UNITS ASSESSED" foot={`${fleet.filter((f) => f.status !== "MISSION READY" && f.status !== "READY").length} not mission-ready`}>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-telemetry-xl text-telemetry-xl font-bold text-[#0F172A]">{fleet.length}</span>{" "}
              <span className="font-telemetry-sm text-telemetry-sm text-[#64748B]">airframes</span>
            </div>
          </Kpi>
        </div>
      </div>{" "}
      <div>
        <SectionHead n="2.0" title={`${focus} Subsystem Index Trend per Airframe`} right="LAST 20 SORTIES" />{" "}
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded space-y-1.5">
          {fleet.map((f) => {
            const p = per[f.tail_id] ?? {};
            return (
              <div key={f.tail_id} className="grid grid-cols-12 gap-2 items-center font-telemetry-sm text-[10px] text-[#334155]">
                <span className="col-span-2 font-bold">{f.tail_id}</span>
                <div className="col-span-6 w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full ${p.latest != null && p.latest < 80 ? "bg-[#EA580C]" : "bg-[#0047d3]"}`} style={{ width: `${p.latest ?? 0}%` }} />
                </div>
                <span className="col-span-2 text-right">{fmt(p.latest, 1)}</span>
                <span className="col-span-2 text-right text-[#64748B]">{p.slope_per_mission != null ? `${signed(p.slope_per_mission, 2)}/sortie` : "--"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function SignBox(p: {
  label: string; signedBy: string | null; signerId: string | null; signedAt: number | null; sha: string | null;
  pendingName: string; pendingNote: string; pendingFoot: string; canSign: boolean; roleLabel: string; busy: boolean; onSign: () => void;
}) {
  if (p.signedBy) {
    return (
      <div className="border border-[#CBD5E1] p-3 rounded bg-[#F8FAFC] relative">
        <div className="flex items-center justify-between mb-1">
          <span className="font-label-caps text-[10px] text-[#64748B] font-bold">{p.label}</span>{" "}
          <span className="inline-flex items-center gap-1 font-telemetry-sm text-[9px] text-[#15803D] bg-[#DCFCE7] px-1.5 py-0.5 rounded font-bold">
            <span className="material-symbols-outlined text-[12px]">verified</span> DIGITALLY SIGNED
          </span>
        </div>{" "}
        <p className="font-body-md text-body-md font-bold text-[#0F172A]">{p.signedBy}</p>{" "}
        <p className="font-telemetry-sm text-[10px] text-[#64748B]">CAC ID: {p.signerId ?? "--"} · {p.roleLabel}</p>{" "}
        <div className="mt-2 pt-2 border-t border-[#E2E8F0] flex items-center justify-between font-telemetry-sm text-[9px] text-[#64748B]">
          <span>Timestamp: {p.signedAt ? zulu(p.signedAt) : "--"}</span> <span className="font-mono">SHA-256: {shortSha(p.sha)}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="border border-dashed border-[#F59E0B] p-3 rounded bg-[#FFFBEB] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-label-caps text-[10px] text-[#B45309] font-bold">{p.label}</span>{" "}
          <span className="font-telemetry-sm text-[9px] text-[#B45309] font-bold">ACTION REQUIRED</span>
        </div>{" "}
        <p className="font-body-md text-body-md font-bold text-[#0F172A]">{p.pendingName}</p>{" "}
        <p className="font-telemetry-sm text-[10px] text-[#64748B]">{p.pendingNote}</p>
      </div>{" "}
      <div className="mt-2 pt-2 border-t border-[#FDE68A] flex items-center justify-between">
        <span className="font-telemetry-sm text-[10px] text-[#B45309]">{p.pendingFoot}</span>{" "}
        <button
          className="px-3 py-1 bg-[#1E5EFF] text-white rounded text-telemetry-sm font-telemetry-sm font-semibold hover:bg-[#1748D1] transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!p.canSign || p.busy}
          title={p.canSign ? undefined : `Sign in with the ${p.roleLabel} clearance role to sign`}
          onClick={p.onSign}
        >
          {p.busy ? "Signing…" : "Execute Signature"}
        </button>
      </div>
    </div>
  );
}
