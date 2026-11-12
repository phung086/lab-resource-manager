import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, CalendarClock, ChevronDown, ChevronRight, Clock3, RefreshCw, ShieldAlert, Wrench, type LucideIcon } from "lucide-react";
import { apiRequest } from "../../../api.js";
import { useLocale } from "../../../providers/LocaleProvider";
import { formatVietnamDateTime } from "../../../utils/timezone";
import type { HomeNavigate } from "./homeTypes";
import "../../../styles/operations-brief.css";

type Resource = { id: string; name: string; code: string };
type RecordPreview = { id: string; resource: Resource };
type Group<T extends RecordPreview> = { total: number; items: T[] };
type Brief = {
  generatedAt: string;
  horizonHours: number;
  laboratories: { id: string; name: string }[];
  overdue: Group<RecordPreview & { endAt: string; nextBooking: { id: string; startAt: string } | null }> & { withNextBooking: number };
  incidents: Group<RecordPreview & { severity: "critical" | "high"; detectedAt: string }>;
  maintenance: Group<RecordPreview & { title: string; startAt: string; endAt: string }>;
};
type BriefState = { laboratory: string; revision: number } & (
  { data: Brief; failed?: never } | { data?: never; failed: true }
);

function isBrief(value: Partial<Brief> | null | undefined): value is Brief {
  return Boolean(value && typeof value.generatedAt === "string" && Number.isInteger(value.horizonHours)
    && Array.isArray(value.laboratories) && Number.isInteger(value.overdue?.withNextBooking)
    && [value.overdue, value.incidents, value.maintenance].every(group => Number.isInteger(group?.total) && Array.isArray(group?.items)));
}

function BriefGroup({ title, total, icon: Icon, tone, empty, action, onOpen, children }: {
  title: string; total: number; icon: LucideIcon; tone: string; empty: string;
  action: string; onOpen: () => void; children: ReactNode;
}) {
  return <section className="ops-brief-group" data-tone={tone} data-empty={total === 0}>
    <details>
      <summary className="ops-brief-group-heading">
        <span className="ops-brief-icon"><Icon size={18} aria-hidden="true" /></span>
        <span>{title}</span><strong>{total.toLocaleString()}</strong>
        <ChevronDown className="ops-brief-chevron" size={15} aria-hidden="true" />
      </summary>
      {total ? <ul>{children}</ul> : <p className="ops-brief-empty">{empty}</p>}
    </details>
    <button type="button" className="ops-brief-open" onClick={onOpen}>{action}<ArrowUpRight size={15} aria-hidden="true" /></button>
  </section>;
}

function BriefRow({ label, children, onOpen }: { label: string; children: ReactNode; onOpen: () => void }) {
  return <button type="button" className="ops-brief-row" onClick={onOpen}>
    <span><strong>{label}</strong>{children}</span>
    <ChevronRight size={16} aria-hidden="true" />
  </button>;
}

export function OperationsBrief({ onNavigate }: { onNavigate: HomeNavigate }) {
  const { t } = useLocale();
  const [laboratory, setLaboratory] = useState("");
  const [laboratories, setLaboratories] = useState<Brief["laboratories"]>([]);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<BriefState | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const query = laboratory ? `?${new URLSearchParams({ laboratoryId: laboratory })}` : "";
    apiRequest(`/dashboard/operations-brief${query}`, { signal: controller.signal }).then((data: Partial<Brief> | null) => {
      if (controller.signal.aborted) return;
      if (!isBrief(data)) {
        setResult({ laboratory, revision, failed: true });
        return;
      }
      setLaboratories(data.laboratories);
      setResult({ laboratory, revision, data });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ laboratory, revision, failed: true });
    });
    return () => controller.abort();
  }, [laboratory, revision]);
  const current = result?.laboratory === laboratory && result.revision === revision ? result : null;
  const brief = current?.data;
  const time = (value: string) => formatVietnamDateTime(value);
  const refresh = () => setRevision(value => value + 1);

  return <section className="ops-brief" aria-labelledby="ops-brief-title" aria-busy={!current}>
    <header className="ops-brief-header">
      <div className="ops-brief-intro">
        <span className="ops-brief-mark"><CalendarClock size={23} aria-hidden="true" /></span>
        <div><h2 id="ops-brief-title">{t("ui.operationsBrief.title")}</h2>
          {brief && <p><Clock3 size={13} aria-hidden="true" /><time dateTime={brief.generatedAt}>{t("ui.operationsBrief.asOf", { time: time(brief.generatedAt) })}</time></p>}
        </div>
      </div>
      <div className="ops-brief-controls">
        <label><span>{t("ui.operationsBrief.scope")}</span><select value={laboratory} onChange={event => setLaboratory(event.target.value)}>
          <option value="">{t("ui.operationsBrief.allLabs")}</option>
          {laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
        </select></label>
        <button type="button" className="ops-brief-refresh" aria-label={t("ui.refresh_46140fa8")} title={t("ui.refresh_46140fa8")} disabled={!current} onClick={refresh}><RefreshCw size={17} aria-hidden="true" /></button>
      </div>
    </header>
    {!current && <p className="ops-brief-feedback" role="status">{t("ui.operationsBrief.loading")}</p>}
    {current?.failed && <p className="ops-brief-feedback" role="alert">{t("ui.operationsBrief.failed")}</p>}
    {brief && <>
      {brief.overdue.withNextBooking > 0 && <p className="ops-brief-priority"><Clock3 size={16} aria-hidden="true" />{t("ui.operationsBrief.priority", { count: brief.overdue.withNextBooking, hours: brief.horizonHours })}</p>}
      <div className="ops-brief-groups">
        <BriefGroup icon={Clock3} tone="amber" title={t("ui.operationsBrief.overdue")} total={brief.overdue.total}
          empty={t("ui.operationsBrief.noOverdue")} action={t("ui.operationsBrief.openBookings")} onOpen={() => onNavigate("bookings", { filter: "CHECKED_OUT" })}>
          {brief.overdue.items.map(item => <li key={item.id}>
            <BriefRow label={item.resource.name} onOpen={() => onNavigate("bookings", { filter: "CHECKED_OUT", booking: item.id })}>
              <small>{t("ui.operationsBrief.dueAt", { time: time(item.endAt) })}</small>
            </BriefRow>
            {item.nextBooking && <button className="ops-brief-next" type="button" onClick={() => onNavigate("bookings", { filter: "CONFIRMED", booking: item.nextBooking!.id })}>
              {t("ui.operationsBrief.nextBooking", { time: time(item.nextBooking.startAt) })}<ArrowUpRight size={14} aria-hidden="true" />
            </button>}
          </li>)}
        </BriefGroup>
        <BriefGroup icon={ShieldAlert} tone="red" title={t("ui.operationsBrief.incidents")} total={brief.incidents.total}
          empty={t("ui.operationsBrief.noIncidents")} action={t("ui.operationsBrief.openIncidents")} onOpen={() => onNavigate("incidents", { filter: "OPEN" })}>
          {brief.incidents.items.map(item => <li key={item.id}>
            <BriefRow label={item.resource.name} onOpen={() => onNavigate("incidents", { filter: "OPEN", incident: item.id })}>
              <small>{t(item.severity === "critical" ? "ui.home.severity.critical" : "ui.home.severity.high")} · {time(item.detectedAt)}</small>
            </BriefRow>
          </li>)}
        </BriefGroup>
        <BriefGroup icon={Wrench} tone="blue" title={t("ui.operationsBrief.maintenance", { hours: brief.horizonHours })} total={brief.maintenance.total}
          empty={t("ui.operationsBrief.noMaintenance")} action={t("ui.operationsBrief.openMaintenance")} onOpen={() => onNavigate("maintenance")}>
          {brief.maintenance.items.map(item => <li key={item.id}>
            <BriefRow label={item.title} onOpen={() => onNavigate("maintenance", { job: item.id, resource: item.resource.id })}>
              <small>{item.resource.name} · {time(item.startAt)}</small>
            </BriefRow>
          </li>)}
        </BriefGroup>
      </div>
    </>}
  </section>;
}
