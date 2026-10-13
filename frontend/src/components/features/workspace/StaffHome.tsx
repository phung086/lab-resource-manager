import React, { useState } from "react";
import { ArrowRight, Clock, AlertTriangle, Wrench, Package, Settings, Inbox } from "lucide-react";
import { translate as t } from "../../../i18n.js";
import { BookingStatusBadge } from "../../BookingStatusBadge";
import { formatVietnamDateTime } from "../../../utils/timezone";
import type { BookingAction, BookingRecord, BookingStatus } from "../../../types/booking";
import type { RoleHomeProps } from "./homeTypes";
import type { BookingQueueSummary } from "../../../types/queue";
import { useQueuePage } from "../../../hooks/useQueuePage";
import { QueuePagination } from "../../base/QueuePagination";
import { HelpDisclosure } from "../../base/HelpDisclosure";

const WORKFLOW_STEPS: { status: BookingStatus; labelKey: string; action: BookingAction; ctaKey: string; step: number }[] = [
  { status: "CONFIRMED", labelKey: "ui.home.staff.queue.handover", action: "CHECK_OUT", ctaKey: "ui.home.staff.action.handover", step: 1 },
  { status: "CHECKED_OUT", labelKey: "ui.home.staff.queue.return", action: "RETURN", ctaKey: "ui.home.staff.action.return", step: 2 },
  { status: "RETURNED", labelKey: "ui.home.staff.queue.inspect", action: "COMPLETE", ctaKey: "ui.home.staff.action.inspect", step: 3 },
  { status: "PENDING_APPROVAL", labelKey: "ui.home.staff.queue.pending", action: "APPROVE", ctaKey: "ui.home.staff.action.review", step: 4 }
];

export function StaffHome({ user, bookingSummary, incidentSummary, maintenance, onNavigate }: RoleHomeProps) {
  const [activeStatus, setActiveStatus] = useState<BookingStatus>(() => {
    if (bookingSummary?.overdue) return "CHECKED_OUT";
    return WORKFLOW_STEPS.find(s => bookingSummary?.byStatus[s.status])?.status || "CONFIRMED";
  });

  const page = useQueuePage<BookingRecord, BookingQueueSummary>("/bookings", activeStatus, `${user.id}:${user.role}`, 5);
  const summary = page.data?.summary || bookingSummary;
  const workflowSteps = WORKFLOW_STEPS.filter(step => step.status !== "PENDING_APPROVAL" || activeStatus === step.status || (summary?.byStatus.PENDING_APPROVAL || 0) > 0);
  const activeStep = WORKFLOW_STEPS.find(s => s.status === activeStatus)!;
  const jobs = maintenance.filter(job => ["scheduled", "in_progress"].includes(job.status));

  const overdueCount = summary?.overdue ?? 0;
  const incidentCount = incidentSummary?.open ?? 0;
  const maintenanceCount = jobs.length;
  const activeIndex = workflowSteps.findIndex(s => s.status === activeStatus);

  return (
    <div className="workspace-container stagger">
      {/* Workspace Header */}
      <div className="workspace-header">
        <div className="workspace-title-group">
          <h2 className="workspace-title">{t("ui.home.staff.workspace")}</h2>
          <p className="workspace-subtitle">
            {t("ui.home.staff.greeting", { name: user.fullName })}
          </p>
        </div>
        <div className="workspace-actions">
          <button className="btn btn-secondary" onClick={page.refresh} disabled={page.loading}>
            {t("ui.home.staff.refresh")}
          </button>
        </div>
      </div>

      {/* Analytics Node */}

      {/* Attention Bar */}
      <div className="attention-bar">
        <button
          className={`attention-card ${overdueCount > 0 ? 'is-urgent' : ''}`}
          onClick={() => setActiveStatus("CHECKED_OUT")}
        >
          <div className={`attention-icon ${overdueCount > 0 ? 'attention-icon-danger' : 'attention-icon-teal'}`}>
            <Clock size={24} aria-hidden="true" />
          </div>
          <div className="attention-content">
            <span className="attention-count">{overdueCount}</span>
            <span className="attention-label">{t("ui.home.staff.overdueReturn")}</span>
          </div>
          <ArrowRight size={20} className="attention-arrow" aria-hidden="true" />
        </button>

        <button className="attention-card" onClick={() => onNavigate("incidents")}>
          <div className="attention-icon attention-icon-amber">
            <AlertTriangle size={24} aria-hidden="true" />
          </div>
          <div className="attention-content">
            <span className="attention-count">{incidentCount}</span>
            <span className="attention-label">{t("ui.home.staff.openIncidents")}</span>
          </div>
          <ArrowRight size={20} className="attention-arrow" aria-hidden="true" />
        </button>

        <button className="attention-card" onClick={() => onNavigate("maintenance")}>
          <div className="attention-icon attention-icon-teal">
            <Wrench size={24} aria-hidden="true" />
          </div>
          <div className="attention-content">
            <span className="attention-count">{maintenanceCount}</span>
            <span className="attention-label">{t("ui.home.staff.maintenanceJobs")}</span>
          </div>
          <ArrowRight size={20} className="attention-arrow" aria-hidden="true" />
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="workspace-main">
        {/* Workflow Navigator */}
        <div className="workflow-navigator">
          <nav className="workflow-track" aria-label={t("ui.home.staff.workflowLabel")}>
            {workflowSteps.map((step, index) => {
              const count = summary?.byStatus[step.status] ?? 0;
              const isActive = step.status === activeStatus;
              const isPast = index < activeIndex;

              return (
                <React.Fragment key={step.status}>
                  <div className={`workflow-step ${isActive ? 'is-active' : ''} ${isPast ? 'is-past' : ''}`}>
                    <button
                      className={`workflow-step-btn ${isActive ? 'is-active' : ''} ${isPast ? 'is-past' : ''}`}
                      onClick={() => setActiveStatus(step.status)}
                      aria-current={isActive ? "step" : undefined}
                    >
                      <span className="workflow-step-number">{step.step}</span>
                      <span className="workflow-step-info">
                        <span className="workflow-step-label">{t(step.labelKey)}</span>
                        <span className="workflow-step-count">{count} {t("ui.home.staff.records")}</span>
                      </span>
                      <span className="workflow-step-badge">{count}</span>
                    </button>
                  </div>
                  {index < workflowSteps.length - 1 && (
                    <div className={`workflow-connector ${isPast ? 'is-complete' : ''}`} aria-hidden="true" />
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Queue Panel */}
        <div className="queue-panel">
          <div className="queue-header">
            <h2 className="queue-title">{t("ui.home.staff.queueTitle")}</h2>
            <HelpDisclosure>{t(`ui.home.staff.hint.${activeStatus}`)}</HelpDisclosure>
          </div>

          {page.loading ? (
            <div className="empty-state" style={{ padding: 'var(--lab-space-8)' }}>
              <p role="status">{t("ui.loading_data_84c68bd5")}</p>
            </div>
          ) : page.error ? (
            <div className="empty-state" style={{ padding: 'var(--lab-space-8)' }}>
              <p style={{ color: 'var(--lab-danger-500)' }}>{t(page.error)}</p>
              <button className="btn btn-secondary" onClick={page.refresh}>{t("ui.retry_c58d068c")}</button>
            </div>
          ) : page.items.length > 0 ? (
            <div className="queue-list">
              {page.items.map(record => {
                const isOverdue = record.status === "CHECKED_OUT" && new Date(record.endAt).getTime() < Date.now();
                const isDueToday = !isOverdue && new Date(record.endAt).toDateString() === new Date().toDateString();

                return (
                  <article
                    key={record.id}
                    className={`queue-item ${isOverdue ? 'is-overdue' : ''} ${isDueToday ? 'is-due-today' : ''}`}
                  >
                    <div className={`queue-status-dot ${isOverdue ? 'is-danger' : isDueToday ? 'is-warning' : 'is-pending'}`} />

                    <div className="queue-item-content">
                      <div className="queue-item-header">
                        <span className="queue-item-code">{record.resource?.code || record.bookingCode}</span>
                        {isOverdue && (
                          <span className="queue-item-badge queue-item-badge-danger">{t("ui.home.staff.overdue")}</span>
                        )}
                      </div>
                      <h3 className="queue-item-title">{record.resource?.name || record.title}</h3>
                      <p className="queue-item-meta">{record.requestedBy?.fullName} · {record.title}</p>
                      <div className="queue-item-time">
                        <Clock size={14} aria-hidden="true" />
                        <time dateTime={record.startAt}>{formatVietnamDateTime(record.startAt)}</time>
                        <span aria-hidden="true">→</span>
                        <time dateTime={record.endAt}>{formatVietnamDateTime(record.endAt)}</time>
                      </div>
                    </div>

                    {record.resource?.laboratory && (
                      <div className="queue-location">
                        <span className="queue-location-badge">{record.resource.laboratory.name}</span>
                      </div>
                    )}

                    <div className="queue-action">
                      <button
                        className="queue-action-btn"
                        onClick={() => onNavigate("bookings", { booking: record.id, action: activeStep.action })}
                      >
                        {t(activeStep.ctaKey)}
                        <ArrowRight size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Inbox size={40} aria-hidden="true" />
              </div>
              <h3 className="empty-state-title">{t("ui.home.staff.noRecords")}</h3>
              <p className="empty-state-desc">
                {t("ui.home.staff.noRecordsHint")}
              </p>
              <button className="btn btn-primary" onClick={() => onNavigate("bookings", { filter: "ALL" })}>
                {t("ui.home.staff.allRecords")}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Pagination */}
          {page.pagination && (
            <div style={{ padding: 'var(--lab-space-4)', borderTop: '1px solid var(--lab-border-subtle)' }}>
              <QueuePagination pagination={page.pagination} onPage={page.setPage} disabled={page.loading} />
            </div>
          )}

          {/* View All */}
          {page.data && page.data.pagination.total > 5 && (
            <button
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', padding: 'var(--lab-space-4)', borderRadius: 0 }}
              onClick={() => onNavigate("bookings", { filter: activeStatus })}
            >
              {t("ui.home.staff.viewAll")} ({page.data.pagination.total} {t("ui.home.staff.recordsPlural")})
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Sidebar */}
        <div className="workspace-sidebar">
          {/* Tools Section */}
          <div className="tools-section">
            <div className="tools-header">
              <h3 className="tools-title">{t("ui.home.staff.controlTools")}</h3>
            </div>
            <div className="tools-list">
              <button className="tool-card" onClick={() => onNavigate("stock")}>
                <div className="tool-icon tool-icon-teal">
                  <Package size={22} aria-hidden="true" />
                </div>
                <div className="tool-content">
                  <span className="tool-title">{t("ui.home.staff.stock")}</span>
                  <span className="tool-desc">{t("ui.home.staff.stockHint")}</span>
                </div>
                <ArrowRight size={18} className="tool-arrow" aria-hidden="true" />
              </button>
              <button className="tool-card" onClick={() => onNavigate("admin_management")}>
                <div className="tool-icon tool-icon-navy">
                  <Settings size={22} aria-hidden="true" />
                </div>
                <div className="tool-content">
                  <span className="tool-title">{t("ui.home.staff.resourceStatus")}</span>
                  <span className="tool-desc">{t("ui.home.staff.resourceStatusHint")}</span>
                </div>
                <ArrowRight size={18} className="tool-arrow" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Maintenance Section */}
          {jobs.length > 0 && (
            <div className="maintenance-section">
              <div className="maintenance-header">
                <h3 className="maintenance-title">{t("ui.home.staff.maintenanceJobsTitle")}</h3>
                <button className="maintenance-link" onClick={() => onNavigate("maintenance")}>
                  {t("ui.home.staff.viewAll")}
                </button>
              </div>
              <div className="maintenance-list">
                {jobs.slice(0, 3).map(job => (
                  <button key={job.id} className="maintenance-item" onClick={() => onNavigate("maintenance")}>
                    <Wrench size={16} className="maintenance-item-icon" aria-hidden="true" />
                    <div className="maintenance-item-content">
                      <span className="maintenance-item-title">{job.title}</span>
                      <span className="maintenance-item-resource">{job.resource?.name}</span>
                    </div>
                    <span className={`maintenance-item-status ${job.status === 'in_progress' ? 'maintenance-item-status-progress' : 'maintenance-item-status-scheduled'}`}>
                      {job.status === 'in_progress' ? t("ui.home.staff.inProgress") : t("ui.home.staff.scheduled")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Context Note */}
          <HelpDisclosure>{t("ui.home.staff.contextNote")}</HelpDisclosure>
        </div>
      </div>
    </div>
  );
}
