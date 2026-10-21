import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Inbox,
  KeyRound,
  Layers,
  Package,
  ScanLine,
  Settings,
  Wrench,
  type LucideIcon
} from "lucide-react";
import { translate as t } from "../../../i18n.js";
import { BookingStatusBadge } from "../../BookingStatusBadge";
import { formatVietnamDateTime } from "../../../utils/timezone";
import type { BookingAction, BookingRecord, BookingStatus } from "../../../types/booking";
import type { RoleHomeProps } from "./homeTypes";
import type { BookingQueueSummary } from "../../../types/queue";
import { useQueuePage } from "../../../hooks/useQueuePage";
import { QueuePagination } from "../../base/QueuePagination";

/* ------------------------------------------------------------------ */
/*  Workflow model — four operational lanes (overview -> queue ->     */
/*  item) plus a shared icon rail. The 4 statuses below are the       */
/*  canonical BookingStatus values LAB_STAFF walks through every      */
/*  shift: confirm, hand out, receive, complete.                      */
/* ------------------------------------------------------------------ */

type LaneId = "overview" | BookingStatus;

interface LaneSpec {
  id: LaneId;
  status: BookingStatus;
  step: number;
  labelKey: string;
  ctaKey: string;
  action: BookingAction;
  descriptionKey: string;
  icon: LucideIcon;
}

const LANES: LaneSpec[] = [
  { id: "PENDING_APPROVAL", status: "PENDING_APPROVAL", step: 1, labelKey: "ui.home.staff.queue.pending", ctaKey: "ui.home.staff.action.review", action: "APPROVE", descriptionKey: "ui.home.staff.lane.pending.desc", icon: ClipboardList },
  { id: "CONFIRMED", status: "CONFIRMED", step: 2, labelKey: "ui.home.staff.queue.handover", ctaKey: "ui.home.staff.action.handover", action: "CHECK_OUT", descriptionKey: "ui.home.staff.lane.handover.desc", icon: KeyRound },
  { id: "CHECKED_OUT", status: "CHECKED_OUT", step: 3, labelKey: "ui.home.staff.queue.return", ctaKey: "ui.home.staff.action.return", action: "RETURN", descriptionKey: "ui.home.staff.lane.return.desc", icon: ScanLine },
  { id: "RETURNED", status: "RETURNED", step: 4, labelKey: "ui.home.staff.queue.inspect", ctaKey: "ui.home.staff.action.inspect", action: "COMPLETE", descriptionKey: "ui.home.staff.lane.inspect.desc", icon: CheckCircle2 }
];

const ICON_RAIL: { id: string; labelKey: string; icon: LucideIcon; tab: string; params?: Record<string, string> }[] = [
  { id: "stock", labelKey: "ui.home.staff.stock", icon: Package, tab: "stock" },
  { id: "resources", labelKey: "ui.home.staff.resourceStatus", icon: Settings, tab: "admin_management" }
];

function laneForStatus(status: BookingStatus): LaneSpec {
  return LANES.find(l => l.status === status) ?? LANES[0];
}

function isOverdue(record: BookingRecord): boolean {
  if (record.status !== "CHECKED_OUT") return false;
  const end = new Date(record.endAt).getTime();
  return Number.isFinite(end) && end < Date.now();
}

function isDueToday(record: BookingRecord): boolean {
  if (record.status === "RETURNED" || record.status === "COMPLETED") return false;
  const end = new Date(record.endAt);
  const now = new Date();
  return end.toDateString() === now.toDateString();
}

function relativeFromNow(iso: string): { label: string; tone: "overdue" | "soon" | "later" } {
  const target = new Date(iso).getTime();
  if (!Number.isFinite(target)) return { label: "—", tone: "later" };
  const diffMs = target - Date.now();
  const absMin = Math.round(Math.abs(diffMs) / 60000);
  if (absMin < 1) return { label: "now", tone: diffMs < 0 ? "overdue" : "soon" };
  if (absMin < 60) return { label: `${absMin}m`, tone: diffMs < 0 ? "overdue" : "soon" };
  const absHr = Math.round(absMin / 60);
  if (absHr < 36) return { label: `${absHr}h`, tone: diffMs < 0 ? "overdue" : "soon" };
  const absDay = Math.round(absHr / 24);
  return { label: `${absDay}d`, tone: diffMs < 0 ? "overdue" : "later" };
}

/* ------------------------------------------------------------------ */
/*  Shell — the cluster has three levels:                              */
/*                                                                    */
/*    1. SHIFT CONSOLE  — focus panels at the top of the page         */
/*       (attention cards + control rail).                            */
/*    2. WORKFLOW QUEUE — 4 vertical lanes, one per BookingStatus.    */
/*       A lane can drill into...                                     */
/*    3. ITEM DETAIL  — split panel: list on the left, the focused    */
/*       record on the right with a sticky footer CTA.                */
/* ------------------------------------------------------------------ */

export function StaffHome({ user, bookingSummary, incidentSummary, maintenance, onNavigate }: RoleHomeProps) {
  const [activeLane, setActiveLane] = useState<LaneId>(() => pickInitialLane(bookingSummary));
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);

  const jobs = maintenance.filter(job => ["scheduled", "in_progress"].includes(job.status));
  const overdueCount = bookingSummary?.overdue ?? 0;
  const incidentCount = incidentSummary?.open ?? 0;
  const maintenanceCount = jobs.length;
  const legacyPending = Math.max(0, (bookingSummary?.byStatus.PENDING_APPROVAL || 0) - (bookingSummary?.pendingPayment || 0));

  const laneCounts = useMemo(() => buildLaneCounts(bookingSummary), [bookingSummary]);

  return (
    <div className="ops-cluster" data-view={activeRecordId ? "item" : activeLane === "overview" ? "console" : "queue"}>
      {/* LEVEL 1 — Shift Console (top-of-page focus panels) */}
      {!activeRecordId && <ShiftConsole
        overdueCount={overdueCount}
        incidentCount={incidentCount}
        maintenanceCount={maintenanceCount}
        jobsPreview={jobs.slice(0, 3)}
        onOpenLane={(id) => { setActiveRecordId(null); setActiveLane(id); }}
        onOpenIncidents={() => onNavigate("incidents")}
        onOpenMaintenance={() => onNavigate("maintenance")}
      />}

      {/* LEVEL 2/3 — Workflow Queue + Item detail */}
      {activeRecordId ? (
        <ItemDetail
          recordId={activeRecordId}
          userId={user.id}
          role={user.role}
          onBack={() => setActiveRecordId(null)}
          onNavigate={onNavigate}
        />
      ) : (
        <WorkflowQueue
          userId={user.id}
          role={user.role}
          activeLane={activeLane}
          onSelectLane={setActiveLane}
          laneCounts={laneCounts}
          legacyPending={legacyPending}
          onPickRecord={setActiveRecordId}
          onNavigate={onNavigate}
        />
      )}

      {/* LEVEL 1.b — Persistent operations icon rail (replaces sidebar tools) */}
      <IconRail onOpen={(entry) => onNavigate(entry.tab, entry.params)} />
    </div>
  );
}

function pickInitialLane(summary?: BookingQueueSummary | null): LaneId {
  if (!summary) return "CONFIRMED";
  if (summary.overdue) return "CHECKED_OUT";
  const order: BookingStatus[] = ["PENDING_APPROVAL", "CONFIRMED", "CHECKED_OUT", "RETURNED"];
  for (const s of order) {
    if ((s === "PENDING_APPROVAL" ? Math.max(0, (summary.byStatus[s] || 0) - (summary.pendingPayment || 0)) : summary.byStatus[s] || 0) > 0) return s;
  }
  return "CONFIRMED";
}

function buildLaneCounts(summary?: BookingQueueSummary | null): Record<BookingStatus, number> {
  const base: Record<BookingStatus, number> = { PENDING_APPROVAL: 0, CONFIRMED: 0, CHECKED_OUT: 0, RETURNED: 0, COMPLETED: 0, REJECTED: 0, CANCELLED: 0 };
  if (!summary?.byStatus) return base;
  for (const k of Object.keys(base)) {
    base[k as BookingStatus] = summary.byStatus[k] || 0;
  }
  base.PENDING_APPROVAL = Math.max(0, base.PENDING_APPROVAL - (summary.pendingPayment || 0));
  return base;
}

/* ==================================================================
   LEVEL 1 — SHIFT CONSOLE
   ================================================================== */

function ShiftConsole(props: {
  overdueCount: number;
  incidentCount: number;
  maintenanceCount: number;
  jobsPreview: { id: string; title: string; status: string; resource?: { name?: string } }[];
  onOpenLane: (status: BookingStatus) => void;
  onOpenIncidents: () => void;
  onOpenMaintenance: () => void;
}) {
  const { overdueCount, incidentCount, maintenanceCount, jobsPreview, onOpenLane, onOpenIncidents, onOpenMaintenance } = props;
  return (
    <section className="ops-console" aria-label={t("ui.home.staff.consoleLabel")}>
      <header className="ops-console-head">
        <h2 className="ops-console-title">{t("ui.home.staff.consoleTitle")}</h2>
        <p className="ops-console-sub">{t("ui.home.staff.consoleSub")}</p>
      </header>

      <div className="ops-console-grid">
        <button
          type="button"
          className={`ops-focus-card ${overdueCount > 0 ? "is-urgent" : "is-calm"}`}
          onClick={() => onOpenLane("CHECKED_OUT")}
        >
          <div className="ops-focus-card-head">
            <span className="ops-focus-card-icon"><Clock size={18} aria-hidden="true" /></span>
            <span className="ops-focus-card-tab">{t("ui.home.staff.queue.return")}</span>
          </div>
          <div className="ops-focus-card-num">{overdueCount}</div>
          <div className="ops-focus-card-label">{t("ui.home.staff.overdueReturn")}</div>
          <div className="ops-focus-card-hint">{t("ui.home.staff.overdueHint")}</div>
        </button>

        <button type="button" className="ops-focus-card is-amber" onClick={onOpenIncidents}>
          <div className="ops-focus-card-head">
            <span className="ops-focus-card-icon"><AlertTriangle size={18} aria-hidden="true" /></span>
            <span className="ops-focus-card-tab">{t("ui.home.admin.viewIncidents")}</span>
          </div>
          <div className="ops-focus-card-num">{incidentCount}</div>
          <div className="ops-focus-card-label">{t("ui.home.staff.openIncidents")}</div>
          <div className="ops-focus-card-hint">{t("ui.home.staff.incidentHint")}</div>
        </button>

        <div className={`ops-focus-card ${maintenanceCount > 0 ? "is-teal" : "is-empty"}`}>
          <div className="ops-focus-card-head">
            <span className="ops-focus-card-icon"><Wrench size={18} aria-hidden="true" /></span>
            <span className="ops-focus-card-tab">{t("ui.home.staff.scheduled")}</span>
          </div>
          <div className="ops-focus-card-num">{maintenanceCount}</div>
          <div className="ops-focus-card-label">{t("ui.home.staff.maintenanceJobs")}</div>
          <ul className="ops-focus-list">
            {jobsPreview.length === 0 ? (
              <li className="ops-focus-list-empty">{t("ui.home.staff.noJobs")}</li>
            ) : jobsPreview.map(job => (
              <li key={job.id} className="ops-focus-list-row">
                <span className="ops-focus-list-title">{job.title}</span>
                <span className={`ops-focus-list-pill ops-focus-list-pill-${job.status === "in_progress" ? "progress" : "scheduled"}`}>
                  {job.status === "in_progress" ? t("ui.home.staff.inProgress") : t("ui.home.staff.scheduled")}
                </span>
                {job.resource?.name && <span className="ops-focus-list-meta">{job.resource.name}</span>}
              </li>
            ))}
          </ul>
          <button type="button" className="ops-focus-card-link" onClick={onOpenMaintenance}>{t("ui.home.staff.viewAll")} <ArrowRight size={14} aria-hidden="true" /></button>
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
   LEVEL 2 — WORKFLOW QUEUE
   Four vertical lanes. The active lane expands into an inline queue
   column. The others are summary columns showing the top items so the
   shift never loses sight of all four steps at once.
   ================================================================== */

function WorkflowQueue(props: {
  userId: string;
  role: string;
  activeLane: LaneId;
  onSelectLane: (id: LaneId) => void;
  laneCounts: Record<BookingStatus, number>;
  legacyPending: number;
  onPickRecord: (id: string) => void;
  onNavigate: RoleHomeProps["onNavigate"];
}) {
  const { userId, role, activeLane, onSelectLane, laneCounts, legacyPending, onPickRecord, onNavigate } = props;
  const active = laneForStatus(activeLane as BookingStatus);
  return (
    <section className="ops-queue" aria-label={t("ui.home.staff.queueTitle")}>
      <header className="ops-queue-head">
        <div>
          <h2 className="ops-queue-title">{t("ui.home.staff.queueTitle")}</h2>
          <p className="ops-queue-sub">{t(active.descriptionKey)}</p>
        </div>
        <div className="ops-queue-active">
          <span className="ops-queue-active-dot" aria-hidden="true" />
          <span className="ops-queue-active-label">{t(active.labelKey)}</span>
        </div>
      </header>

      <div className="ops-lane-grid">
        {LANES.filter(lane => lane.status !== "PENDING_APPROVAL" || legacyPending > 0).map((lane, index) => {
          const isActive = lane.id === activeLane;
          const count = laneCounts[lane.status] || 0;
          const Icon = lane.icon;
          return (
            <LaneColumn
              key={lane.id}
              lane={{ ...lane, step: index + 1 }}
              icon={Icon}
              isActive={isActive}
              count={count}
              userId={userId}
              role={role}
              onActivate={() => onSelectLane(lane.status)}
              onPickRecord={onPickRecord}
              onNavigate={onNavigate}
            />
          );
        })}
      </div>
    </section>
  );
}

function LaneColumn(props: {
  lane: LaneSpec;
  icon: LucideIcon;
  isActive: boolean;
  count: number;
  userId: string;
  role: string;
  onActivate: () => void;
  onPickRecord: (id: string) => void;
  onNavigate: RoleHomeProps["onNavigate"];
}) {
  const { lane, icon: Icon, isActive, count, userId, role, onActivate, onPickRecord, onNavigate } = props;
  const page = useQueuePage<BookingRecord, BookingQueueSummary>("/bookings", lane.status, `${userId}:${role}`, 4);
  const summary = page.data?.summary;

  return (
    <article className={`ops-lane ${isActive ? "is-active" : ""}`} data-lane={lane.status}>
      <button type="button" className="ops-lane-head" onClick={onActivate} aria-expanded={isActive} aria-controls={`ops-lane-body-${lane.status}`}>
        <span className={`ops-lane-step ${isActive ? "is-active" : ""}`}>{lane.step}</span>
        <span className="ops-lane-icon"><Icon size={16} aria-hidden="true" /></span>
        <span className="ops-lane-label">{t(lane.labelKey)}</span>
        <span className={`ops-lane-count ${count > 0 ? "is-positive" : ""}`}>{count}</span>
        <span className="ops-lane-chevron" aria-hidden="true"><ChevronRight size={14} /></span>
      </button>

      <p className="ops-lane-desc">{t(lane.descriptionKey)}</p>

      <div id={`ops-lane-body-${lane.status}`} className="ops-lane-body" role="region" aria-live="polite">
        {isActive ? (
          page.loading ? (
            <div className="ops-lane-status" role="status">{t("ui.loading_data_84c68bd5")}</div>
          ) : page.error ? (
            <div className="ops-lane-status is-error">
              <p>{t(page.error)}</p>
              <button type="button" className="ops-mini-btn" onClick={page.refresh}>{t("ui.retry_c58d068c")}</button>
            </div>
          ) : page.items.length === 0 ? (
            <div className="ops-lane-empty">
              <Inbox size={20} aria-hidden="true" />
              <p>{t("ui.home.staff.empty")}</p>
              <p className="ops-lane-empty-hint">{t("ui.home.staff.emptyHint")}</p>
            </div>
          ) : (
            <ul className="ops-lane-list">
              {page.items.map((record) => {
                const overdue = isOverdue(record);
                const dueToday = isDueToday(record);
                return (
                  <li key={record.id}>
                    <button
                      type="button"
                      className={`ops-lane-row ${overdue ? "is-overdue" : ""} ${dueToday ? "is-due" : ""}`}
                      onClick={() => onPickRecord(record.id)}
                    >
                      <span className={`ops-lane-dot ${overdue ? "is-overdue" : dueToday ? "is-due" : "is-pending"}`} aria-hidden="true" />
                      <span className="ops-lane-row-main">
                        <span className="ops-lane-row-title">{record.resource?.name || record.title}</span>
                        <span className="ops-lane-row-meta">{record.requestedBy?.fullName} · {record.title}</span>
                      </span>
                      <span className="ops-lane-row-time">
                        <CalendarClock size={12} aria-hidden="true" />
                        <span>{formatVietnamDateTime(record.startAt)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        ) : summary && count > 0 ? (
          <div className="ops-lane-peek">
            <span className="ops-lane-peek-num">{count}</span>
            <span className="ops-lane-peek-text">{t("ui.home.staff.records")}</span>
          </div>
        ) : (
          <div className="ops-lane-peek is-muted">
            <span className="ops-lane-peek-num">0</span>
            <span className="ops-lane-peek-text">{t("ui.home.staff.records")}</span>
          </div>
        )}

        {isActive && page.pagination && page.pagination.totalPages > 1 && (
          <div className="ops-lane-pager">
            <QueuePagination pagination={page.pagination} onPage={page.setPage} disabled={page.loading} />
          </div>
        )}

        {isActive && page.data && page.data.pagination.total > page.items.length && (
          <button type="button" className="ops-lane-more" onClick={() => onNavigate("bookings", { filter: lane.status })}>
            {t("ui.home.staff.viewAll")} <ArrowRight size={14} aria-hidden="true" />
          </button>
        )}

        {isActive && (
          <button type="button" className="ops-lane-cta" onClick={() => onNavigate("bookings", { filter: lane.status })}>
            {t("ui.home.staff.viewQueue", { count: count })}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}

/* ==================================================================
   LEVEL 3 — ITEM DETAIL
   Split: master list of the active lane on the left, the focused
   record on the right with a sticky footer carrying the action CTA.
   ================================================================== */

function ItemDetail(props: {
  recordId: string;
  userId: string;
  role: string;
  onBack: () => void;
  onNavigate: RoleHomeProps["onNavigate"];
}) {
  const { recordId, userId, role, onBack, onNavigate } = props;
  // Fetch the specific record up front (recordId mode), then derive lane + cross-lane peers.
  const own = useQueuePage<BookingRecord, BookingQueueSummary>("/bookings", "ALL", `${userId}:${role}`, 8, recordId);
  const record = own.items.find(r => r.id === recordId) ?? null;
  const peers = useQueuePage<BookingRecord, BookingQueueSummary>("/bookings", record?.status || "ALL", `${userId}:${role}`, 8);
  const list = record ? peers : own;
  const lane = record ? laneForStatus(record.status) : LANES[0];
  const Icon = lane.icon;
  const end = record ? relativeFromNow(record.endAt) : null;
  const overdue = record ? isOverdue(record) : false;

  return (
    <section className="ops-item" aria-label={t("ui.home.staff.itemLabel")}>
      <header className="ops-item-head">
        <button type="button" className="ops-item-back" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{t("ui.home.staff.itemBack")}</span>
        </button>
        <div className="ops-item-title-group">
          <span className={`ops-item-step ${overdue ? "is-overdue" : ""}`}><Icon size={14} aria-hidden="true" /> {t(lane.labelKey)}</span>
          <h2 className="ops-item-title">{record?.resource?.name || t("ui.home.staff.itemFallback")}</h2>
        </div>
        {record?.status && <BookingStatusBadge status={record.status} />}
      </header>

      <div className="ops-item-split">
        <aside className="ops-item-list" aria-label={t("ui.home.staff.itemList")}>
          <h3 className="ops-item-list-title">{t("ui.home.staff.itemListTitle")}</h3>
          {list.loading ? (
            <p className="ops-item-list-status" role="status">{t("ui.loading_data_84c68bd5")}</p>
          ) : list.items.length === 0 ? (
            <p className="ops-item-list-status">{t("ui.home.staff.empty")}</p>
          ) : (
            <ul className="ops-item-list-rows">
              {list.items.map((r) => {
                const isActive = r.id === recordId;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={`ops-item-list-row ${isActive ? "is-active" : ""} ${isOverdue(r) ? "is-overdue" : ""}`}
                      onClick={() => onNavigate && onNavigate("bookings", { booking: r.id })}
                    >
                      <span className="ops-item-list-row-title">{r.resource?.name || r.title}</span>
                      <span className="ops-item-list-row-meta">{r.bookingCode}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <article className="ops-item-detail">
          {record ? (
            <>
              <div className="ops-item-detail-grid">
                <DetailField label={t("ui.home.staff.itemField.code")} value={record.bookingCode} mono />
                <DetailField label={t("ui.home.staff.itemField.resource")} value={record.resource?.code} />
                <DetailField label={t("ui.home.staff.itemField.user")} value={record.requestedBy?.fullName} />
                <DetailField label={t("ui.home.staff.itemField.lab")} value={record.resource?.laboratory?.name} />
                <DetailField label={t("ui.home.staff.itemField.start")} value={formatVietnamDateTime(record.startAt)} />
                <DetailField label={t("ui.home.staff.itemField.end")} value={formatVietnamDateTime(record.endAt)} />
                {end && (
                  <DetailField
                    label={t("ui.home.staff.itemField.countdown")}
                    value={`${end.label}`}
                    tone={end.tone}
                  />
                )}
                <DetailField label={t("ui.home.staff.itemField.title")} value={record.title} wide />
              </div>

              <div className="ops-item-actions">
                <button type="button" className="ops-mini-btn" onClick={() => onNavigate("bookings", { booking: record.id })}>
                  {t("ui.home.staff.itemOpenRecord")} <ArrowRight size={14} aria-hidden="true" />
                </button>
                <button type="button" className="ops-mini-btn" onClick={() => onNavigate("incidents", { resource: record.resource?.id })}>
                  {t("ui.home.staff.itemReportIncident")} <AlertTriangle size={14} aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <div className="ops-item-detail-empty">
              <Inbox size={24} aria-hidden="true" />
              <p>{t("ui.home.staff.itemMissing")}</p>
            </div>
          )}
        </article>
      </div>

      {record && (
        <footer className="ops-item-footer">
          <div className="ops-item-footer-meta">
            <span className="ops-item-footer-step">{t("ui.home.staff.itemStep", { step: lane.step, label: t(lane.labelKey) })}</span>
            <span className="ops-item-footer-hint">{t(lane.descriptionKey)}</span>
          </div>
          <button
            type="button"
            className={`ops-item-footer-cta ${overdue ? "is-urgent" : ""}`}
            onClick={() => onNavigate("bookings", { booking: record.id, action: lane.action })}
          >
            {t(lane.ctaKey)} <ArrowRight size={16} aria-hidden="true" />
          </button>
        </footer>
      )}
    </section>
  );
}

function DetailField(props: { label: string; value?: string | null; mono?: boolean; tone?: "overdue" | "soon" | "later"; wide?: boolean }) {
  const { label, value, mono, tone, wide } = props;
  return (
    <div className={`ops-detail-field ${wide ? "is-wide" : ""} ${tone ? `is-${tone}` : ""}`}>
      <span className="ops-detail-field-label">{label}</span>
      <span className={`ops-detail-field-value ${mono ? "is-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

/* ==================================================================
   Icon rail — fixed strip on the right edge of the cluster. Replaces
   the sidebar "tools" panel. Visible on queue and item views.
   ================================================================== */

function IconRail(props: { onOpen: (entry: typeof ICON_RAIL[number]) => void }) {
  const { onOpen } = props;
  return (
    <nav className="ops-rail" aria-label={t("ui.home.staff.railLabel")}>
      {ICON_RAIL.map((entry) => {
        const Icon = entry.icon;
        return (
          <button
            key={entry.id}
            type="button"
            className="ops-rail-btn"
            onClick={() => onOpen(entry)}
            title={t(entry.labelKey)}
          >
            <Icon size={18} aria-hidden="true" />
            <span className="ops-rail-label">{t(entry.labelKey)}</span>
          </button>
        );
      })}
      <button type="button" className="ops-rail-btn" onClick={() => onOpen({ id: "catalog", labelKey: "ui.home.staff.tools", icon: Layers, tab: "resources" })}>
        <Layers size={18} aria-hidden="true" />
        <span className="ops-rail-label">{t("ui.home.staff.tools")}</span>
      </button>
      <button type="button" className="ops-rail-btn" onClick={() => onOpen({ id: "queue", labelKey: "ui.home.staff.queueTitle", icon: Boxes, tab: "bookings" })}>
        <Boxes size={18} aria-hidden="true" />
        <span className="ops-rail-label">{t("ui.home.staff.queueTitle")}</span>
      </button>
    </nav>
  );
}
