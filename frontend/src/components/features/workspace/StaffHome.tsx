import React, { useState } from "react";
import { ArrowRight, ClipboardCheck, Clock3, PackageCheck, ShieldAlert, Wrench } from "lucide-react";
import { translate as t } from "../../../i18n.js";
import { BookingStatusBadge } from "../../BookingStatusBadge";
import { formatVietnamDateTime } from "../../../utils/timezone";
import { EmptyState, PriorityTiles, QuickLink, SectionTitle } from "./HomeComponents";
import type { BookingAction, BookingRecord, BookingStatus } from "../../../types/booking";
import type { RoleHomeProps } from "./homeTypes";
import type { BookingQueueSummary } from "../../../types/queue";
import { useQueuePage } from "../../../hooks/useQueuePage";
import { QueuePagination } from "../../base/QueuePagination";

const queues: { status: BookingStatus; label: string; action: BookingAction; cta: string }[] = [
  { status: "PENDING_APPROVAL", label: "ui.home.staff.queue.pending", action: "APPROVE", cta: "ui.home.staff.action.review" },
  { status: "CONFIRMED", label: "ui.home.staff.queue.handover", action: "CHECK_OUT", cta: "ui.home.staff.action.handover" },
  { status: "CHECKED_OUT", label: "ui.home.staff.queue.return", action: "RETURN", cta: "ui.home.staff.action.return" },
  { status: "RETURNED", label: "ui.home.staff.queue.inspect", action: "COMPLETE", cta: "ui.home.staff.action.inspect" }
];

export function StaffHome({ user, bookingSummary, incidentSummary, maintenance, onNavigate }: RoleHomeProps) {
  const [queue, setQueue] = useState<BookingStatus>(() => bookingSummary?.overdue ? "CHECKED_OUT" : queues.find(item => bookingSummary?.byStatus[item.status])?.status || "PENDING_APPROVAL");
  const page = useQueuePage<BookingRecord, BookingQueueSummary>("/bookings", queue, `${user.id}:${user.role}`, 5);
  const summary = page.data?.summary || bookingSummary;
  const active = queues.find(item => item.status === queue)!;
  const jobs = maintenance.filter(job => ["scheduled", "in_progress"].includes(job.status));
  return <>
    <section className="home-operations-heading"><div><h2>{t("ui.home.staff.title")}</h2><p>{t("ui.home.staff.description")}</p></div><span className="home-scope-pill"><ShieldAlert size={17} aria-hidden="true" />{t("ui.home.staff.scope")}</span></section>
    <PriorityTiles scopeKey="ui.queue.countScope" items={[
      { count: summary?.overdue ?? 0, label: "ui.home.staff.overdue", hint: "ui.home.staff.overdueHint", icon: Clock3, urgent: true, onClick: () => setQueue("CHECKED_OUT") },
      { count: incidentSummary?.open ?? 0, label: "ui.home.staff.incidents", hint: "ui.home.staff.incidentHint", icon: ShieldAlert, urgent: true, onClick: () => onNavigate("incidents") },
      { count: jobs.length, label: "ui.home.staff.jobs", hint: "ui.home.staff.jobsHint", icon: Wrench, onClick: () => onNavigate("maintenance") }
    ]} />
    <div className="home-staff-grid">
      <section className="home-panel home-queue-panel">
        <SectionTitle titleKey="ui.home.staff.queueTitle" action="ui.home.staff.allBookings" onAction={() => onNavigate("bookings", { filter: "ALL" })} />
        <div className="home-queue-tabs" aria-label={t("ui.home.staff.queueTitle")}>{queues.map(item => <button key={item.status} className={queue === item.status ? "is-active" : ""} aria-pressed={queue === item.status} onClick={() => setQueue(item.status)}><span>{t(item.label)}</span><strong>{summary?.byStatus[item.status] ?? 0}</strong></button>)}</div>
        <p className="home-queue-description">{t(`ui.home.staff.hint.${queue}`)}</p>
        {page.loading ? <p role="status">{t("ui.loading_data_84c68bd5")}</p> : page.error ? <div className="home-section-error" role="alert"><p>{t(page.error)}</p><button className="secondary-button" onClick={page.refresh}>{t("ui.retry_c58d068c")}</button></div> : page.items.length ? <div className="home-operation-list">{page.items.map(row => {
          const late = row.status === "CHECKED_OUT" && new Date(row.endAt).getTime() < Date.now();
          return <article className={`home-operation-row${late ? " is-overdue" : ""}`} key={row.id}>
            <div className="home-operation-main"><div className="home-operation-tags"><span>{row.bookingCode || row.resource?.code}</span>{late ? <span className="home-overdue-badge">{t("ui.home.staff.overdueBadge")}</span> : <BookingStatusBadge status={row.status} />}</div><h3>{row.resource?.name || row.title}</h3><p>{row.requestedBy?.fullName} · {row.title}</p><div className="home-operation-meta"><span><Clock3 size={15} aria-hidden="true" /><time dateTime={row.startAt}>{formatVietnamDateTime(row.startAt)}</time><span> — </span><time dateTime={row.endAt}>{formatVietnamDateTime(row.endAt)}</time></span><span>{row.resource?.laboratory?.name}</span></div></div>
            <button className="primary-button" onClick={() => onNavigate("bookings", { booking: row.id, action: active.action })}>{t(active.cta)}<ArrowRight size={17} aria-hidden="true" /></button>
          </article>;
        })}</div> : <EmptyState icon={ClipboardCheck} titleKey="ui.home.staff.empty" detail="ui.home.staff.emptyHint" action="ui.home.staff.allBookings" onAction={() => onNavigate("bookings", { filter: "ALL" })} />}
        {page.pagination && <QueuePagination pagination={page.pagination} onPage={page.setPage} disabled={page.loading} />}
        {page.data && page.data.pagination.total > 5 && <button className="home-show-more" onClick={() => onNavigate("bookings", { filter: queue })}>{t("ui.home.staff.viewQueue", { count: page.data.pagination.total })}<ArrowRight size={17} aria-hidden="true" /></button>}
      </section>
      <aside className="home-staff-aside"><section className="home-panel"><SectionTitle titleKey="ui.home.staff.tools" /><QuickLink icon={PackageCheck} titleKey="ui.home.staff.inventory" detail="ui.home.staff.inventoryHint" onClick={() => onNavigate("stock")} /><QuickLink icon={Wrench} titleKey="ui.home.staff.resources" detail="ui.home.staff.resourcesHint" onClick={() => onNavigate("admin_management")} /></section><section className="home-panel"><SectionTitle titleKey="ui.home.staff.maintenanceTitle" action="ui.view_all_44aeb8cb" onAction={() => onNavigate("maintenance")} />{jobs.length ? <div className="home-job-list">{jobs.slice(0, 3).map(job => <button key={job.id} onClick={() => onNavigate("maintenance")}><Wrench size={18} aria-hidden="true" /><span><strong>{job.title}</strong><small>{job.resource?.name}</small><span>{t(job.status === "in_progress" ? "ui.home.staff.jobInProgress" : "ui.home.staff.jobScheduled")}</span></span><ArrowRight size={15} aria-hidden="true" /></button>)}</div> : <p className="home-muted-copy">{t("ui.home.staff.noJobs")}</p>}<div className="home-context-note"><ClipboardCheck size={20} aria-hidden="true" /><p>{t("ui.home.staff.evidenceHint")}</p></div></section></aside>
    </div>
  </>;
}
