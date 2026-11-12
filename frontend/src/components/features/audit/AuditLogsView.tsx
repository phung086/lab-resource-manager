import { PageHeading } from '../../base/PageHeading';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "../../../providers/LocaleProvider";
import { QueuePagination } from "../../base/QueuePagination";
import { HelpDisclosure } from "../../base/HelpDisclosure";
import { listAuditEvents, AUDIT_ACTION_OPTIONS, AUDIT_TARGET_TYPE_OPTIONS, AUDIT_PAGE_SIZE } from "../../../services/auditEvents";
import type { AuditEventFilters, SystemAuditEvent } from "../../../types/audit";
import type { QueuePagination as Pagination } from "../../../types/queue";
import { formatVietnamDateTime } from "../../../utils/timezone";
import { auditTargetKind, auditTargetLabel, auditActionTone, formatAuditState, vietnamDateEnd, vietnamDateStart } from "./auditPresentation";

/** Vietnam-local calendar day key of an audit timestamp. */
const auditDayKey = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
const auditDayLabel = (key: string) =>
  new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
import "../../../styles/audit-workspace.css";

export interface AuditLogsViewProps {
  actorRole: string;
}

interface AuditDraft extends Omit<AuditEventFilters, "from" | "to"> {
  fromDate?: string;
  toDate?: string;
}

function draftToFilters(draft: AuditDraft): AuditEventFilters {
  const { fromDate, toDate, ...rest } = draft;
  return {
    ...rest,
    from: vietnamDateStart(fromDate ?? ""),
    to: vietnamDateEnd(toDate ?? "")
  };
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ actorRole }) => {
  const { tr } = useLocale();
  const [filters, setFilters] = useState<AuditEventFilters>({});
  const [pageSize, setPageSize] = useState(AUDIT_PAGE_SIZE);
  const [draft, setDraft] = useState<AuditDraft>({});
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ key: string; events?: SystemAuditEvent[]; pagination?: Pagination; error?: string }>();
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const queryKey = JSON.stringify({ filters, page });
  const loadKey = `${queryKey}:${retry}`;

  useEffect(() => {
    const controller = new AbortController();
    listAuditEvents(filters, page, controller.signal, pageSize).then(data => {
      if (!controller.signal.aborted) setResult({ key: loadKey, events: data.events, pagination: { page: data.pagination.page, pageSize: data.pagination.limit, total: data.pagination.total, totalPages: data.pagination.totalPages } });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ key: loadKey, error: error?.message || "ui.audit.loadError" });
    });
    return () => controller.abort();
  }, [loadKey, filters, page, pageSize]);

  const current = result?.key === loadKey ? result : undefined;
  const loading = !current;
  const events = current?.events ?? [];
  const pagination = current?.pagination;
  const error = current?.error;

  const applyFilters = useCallback(() => {
    setPage(1);
    setFilters(draftToFilters(draft));
  }, [draft]);

  const clearFilters = useCallback(() => {
    setDraft({});
    setFilters({});
    setPage(1);
  }, []);

  const actionOptions = useMemo(() => AUDIT_ACTION_OPTIONS, []);
  const enumLabel = (prefix: string, value: string) => { const key = `${prefix}${value}`; try { const label = tr(key as Parameters<typeof tr>[0]); return label === key ? value : label; } catch { return value; } };
  const targetTypeOptions = useMemo(() => AUDIT_TARGET_TYPE_OPTIONS, []);

  return <section className="card audit-workspace" aria-labelledby="audit-logs-title" aria-busy={loading}>
    <PageHeading className="audit-workspace-heading">
      <div>
        <h1 id="audit-logs-title">{tr("ui.audit_logs_883aea8a")}</h1>
        <p className="audit-workspace-subtitle">{tr("ui.audit.subtitle", { role: actorRole })}</p>
      </div>
    </PageHeading>

    <HelpDisclosure>
      <p>{tr("ui.audit.help")}</p>
    </HelpDisclosure>

    <form className="audit-filters" onSubmit={event => { event.preventDefault(); applyFilters(); }}>
      <label>
        <span>{tr("ui.audit.filterAction")}</span>
        <select value={draft.action ?? ""} onChange={event => setDraft(prev => ({ ...prev, action: event.target.value || undefined }))}>
          <option value="">{tr("ui.all_49c73a31")}</option>
          {actionOptions.map(action => <option key={action} value={action}>{enumLabel("ui.audit.action.", action)}</option>)}
        </select>
      </label>
      <label>
        <span>{tr("ui.audit.filterTargetType")}</span>
        <select value={draft.targetType ?? ""} onChange={event => setDraft(prev => ({ ...prev, targetType: event.target.value || undefined }))}>
          <option value="">{tr("ui.all_49c73a31")}</option>
          {targetTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </label>
      <label>
        <span>{tr("ui.audit.filterTargetId")}</span>
        <input type="text" value={draft.targetId ?? ""} onChange={event => setDraft(prev => ({ ...prev, targetId: event.target.value || undefined }))} />
      </label>
      <label>
        <span>{tr("ui.audit.filterActorId")}</span>
        <input type="text" value={draft.actorId ?? ""} onChange={event => setDraft(prev => ({ ...prev, actorId: event.target.value || undefined }))} />
      </label>
      <label>
        <span>{tr("ui.audit.filterFrom")}</span>
        <input type="date" value={draft.fromDate ?? ""} onChange={event => setDraft(prev => ({ ...prev, fromDate: event.target.value || undefined }))} />
      </label>
      <label>
        <span>{tr("ui.audit.filterTo")}</span>
        <input type="date" value={draft.toDate ?? ""} onChange={event => setDraft(prev => ({ ...prev, toDate: event.target.value || undefined }))} />
      </label>
      <div className="audit-filter-actions">
        <button type="submit" className="btn btn-primary">{tr("ui.audit.apply")}</button>
        <button type="button" className="btn btn-secondary" onClick={clearFilters}>{tr("ui.clear_filters_f8f509b1")}</button>
      </div>
    </form>

    {error && <div className="alert danger" role="alert">
      <p>{tr(error)}</p>
      <button className="btn btn-secondary" type="button" onClick={() => setRetry(value => value + 1)}>{tr("ui.retry_c58d068c")}</button>
    </div>}

    {loading && <p className="empty-state" role="status">{tr("ui.loading_audit_history_a0a87a60")}</p>}

    {!loading && !error && !events.length && <p className="empty-state" role="status">{tr("ui.audit.empty")}</p>}

    {!loading && !error && events.length > 0 && <div className="audit-event-list">
      {events.map((event, index) => {
        const open = expanded === event.id;
        const day = auditDayKey(event.createdAt);
        const showDay = index === 0 || auditDayKey(events[index - 1].createdAt) !== day;
        return <React.Fragment key={event.id}>
          {showDay && <h3 className="audit-day-divider">{auditDayLabel(day)}</h3>}
          <article className="audit-event">
          <div className="audit-event-summary">
            <span className={`audit-event-action is-${auditActionTone(event.action)}`}>{enumLabel("ui.audit.action.", event.action)}</span>
            <span className="audit-event-target">{auditTargetKind(event, (type) => enumLabel("ui.audit.target.", type))} · {auditTargetLabel(event)}</span>
            <span className="audit-event-time">{formatVietnamDateTime(event.createdAt)}</span>
          </div>
          <div className="audit-event-meta">
            <span>{tr("ui.audit.actor")}: {event.actor?.fullName ?? event.actorId ?? "—"}</span>
            {event.laboratory && <span>{tr("ui.audit.laboratory")}: {event.laboratory.name}</span>}
            {event.reason && <span>{tr("ui.reason_1a51692b")}: {event.reason}</span>}
          </div>
          <button type="button" className="audit-event-toggle" aria-expanded={open} onClick={() => setExpanded(open ? null : event.id)}>
            {open ? tr("ui.audit.hideDetails") : tr("ui.audit.showDetails")}
          </button>
          {open && <div className="audit-event-detail">
            <div>
              <h4>{tr("ui.audit.before")}</h4>
              <pre>{formatAuditState(event.beforeState)}</pre>
            </div>
            <div>
              <h4>{tr("ui.audit.after")}</h4>
              <pre>{formatAuditState(event.afterState)}</pre>
            </div>
            {event.metadata !== null && event.metadata !== undefined && <div>
              <h4>{tr("ui.audit.metadata")}</h4>
              <pre>{formatAuditState(event.metadata)}</pre>
            </div>}
          </div>}
        </article>
        </React.Fragment>;
      })}
    </div>}

    {pagination && pagination.totalPages > 0 && <QueuePagination pagination={pagination} onPage={setPage} disabled={loading} pageSizes={[20, 50, 100]} onPageSize={setPageSize} />}
  </section>;
};
