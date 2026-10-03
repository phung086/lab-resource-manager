import { translate } from "../i18n.js";
import { ResourceUsageGuide } from "./ResourceUsageGuide";
import { useLocale } from '../providers/LocaleProvider';
import React from "react";
import { ResourceGallery } from './ResourceGallery';
import { CalendarClock, History, Server } from "lucide-react";

import { BaseModal2026 } from "./BaseModal2026";
import { LabPolicySummary } from "./LabPolicySummary";
import { formatVietnamDateTime } from "../utils/timezone.js";

export interface ResourceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource?: any;
  onViewCalendar?: (resourceId: string) => void;
}

const categoryLabels: Record<string, string> = {
  ROOM: "ui.room_6aec2ab4",
  EQUIPMENT: "ui.resources_eb706979",
  MACHINE: "ui.machine_1d4b86ad",
  EXPERIMENT_KIT: "ui.experiment_kit_0acb51cf",
  MATERIAL: "ui.material_23ab10cc"
};
const operationalLabels: Record<string, string> = {
  AVAILABLE: "ui.available_d654065d", IN_USE: "ui.in_use_a07a3647", MAINTENANCE: "ui.maintenance_8ad424bd",
  CALIBRATION: "ui.calibration_a71e17c8", BROKEN: "ui.broken_fd69bba6", RETIRED: "ui.offline_b4f199c3", OFFLINE: "ui.offline_96a8bb03"
};
const bookingLabels: Record<string, string> = {
  PENDING_APPROVAL: "ui.pending_approval_6af96613", CONFIRMED: "ui.confirmed_e72d13e3", CHECKED_OUT: "ui.in_use_a07a3647",
  RETURNED: "ui.returned_fd3eb4fb", COMPLETED: "ui.completed_b0484236", REJECTED: "ui.reject_b61a0ebc", CANCELLED: "ui.cancelled_2f777a90"
};
const availabilityLabels: Record<string, string> = {
  AVAILABLE: "ui.bookable_a6f2434f", RESERVED: "ui.reserved_b5eaf84b", RESTRICTED: "ui.restricted_booking_1e5b50c0", UNAVAILABLE: "ui.not_bookable_cc51bab6"
};
const maintenanceLabels: Record<string, string> = {
  scheduled: "ui.scheduled_2cf00513", in_progress: "ui.in_progress_50e04c04", completed: "ui.completed_5eb36f8c", cancelled: "ui.cancelled_2f777a90"
};

export const ResourceDetailsModal: React.FC<ResourceDetailsModalProps> = ({ isOpen, onClose, resource, onViewCalendar }) => {
  const { tr } = useLocale();
  if (!isOpen || !resource) return null;
  const bookings = resource.schedule?.bookings || resource.upcomingSchedule?.bookings || [];
  const maintenance = resource.schedule?.maintenanceWindows || resource.upcomingSchedule?.maintenanceWindows || [];
  const history = resource.history || [];

  return (
    <BaseModal2026
      isOpen={isOpen}
      onClose={onClose}
      title={resource.name}
      subtitle={resource.location ? `${resource.code} · ${resource.location}` : resource.code}
      icon={Server}
      maxWidth="max-w-4xl"
      footer={<><button type="button" className="secondary-button" onClick={onClose}>{tr("ui.close_5d54c2a1")}</button>{onViewCalendar && <button className="primary-button" onClick={() => { onClose(); onViewCalendar(resource.id); }}>{tr("ui.view_resource_calendar_a11d4b1d")}</button>}</>}
    >
      <ResourceGallery key={resource.id} resourceId={resource.id} initialItems={resource.media} />
      <div className="resource-detail-status-line">
        <span className={`resource-status-pill status-${String(resource.operationalStatus).toLowerCase()}`}>{tr(operationalLabels[resource.operationalStatus]) || resource.operationalStatus}</span>
        <span className={`resource-status-pill status-${String(resource.availability?.state || "unavailable").toLowerCase()}`}>{tr(availabilityLabels[resource.availability?.state]) || tr("ui.not_bookable_cc51bab6")}</span>
        {!resource.category && <span className="resource-status-pill status-unresolved">{tr("ui.unclassified_10fe63fa")}</span>}
      </div>

      <p className="section-description">{tr("ui.availability_describes_the_current_time_2913c3cd")}</p>
      <dl className="resource-detail-grid">
        <Detail label={tr("ui.resource_category_5fc170bb")} value={resource.category ? tr(categoryLabels[resource.category]) || resource.category : tr("ui.unclassified_10fe63fa")} />
        <Detail label={tr("ui.technical_subtype_f4ef03ac")} value={resource.subtype} />
        <Detail label={tr("ui.laboratory_eb85976f")} value={resource.laboratory ? `${resource.laboratory.code} - ${resource.laboratory.name}` : tr("ui.no_laboratory_assigned_a03dd58a")} />
        <Detail label={tr("ui.booking_policy_5636b6c2")} value={resource.bookingState === "bookable" ? tr("ui.bookable_f7ce3273") : resource.bookingState === "restricted" ? tr("ui.restricted_booking_1e5b50c0") : tr("ui.not_bookable_fd9badec")} />
        <Detail label={tr("ui.capacity_quantity_1e2e42b3")} value={String(resource.capacity)} />
        <Detail label={tr("ui.approval_required_cc220dc0")} value={resource.effectiveRequiresApproval ? tr("ui.approval_required_dc95ee8f") : tr("ui.confirm_automatically_when_eligible_e47b0eb4")} />
        <Detail label={tr("ui.manufacturer_ceeb2ab5")} value={resource.manufacturer || tr("ui.not_updated_ebc5a4d4")} />
        <Detail label={tr("ui.model_5e2c614c")} value={resource.model || tr("ui.not_updated_ebc5a4d4")} />
      </dl>

      <LabPolicySummary policy={resource.labPolicy || resource.laboratory?.labPolicy} requiresApproval={resource.effectiveRequiresApproval} />

      <section className="resource-detail-section">
        <h4>{tr("ui.description_9eca256d")}</h4>
        <p>{resource.description || tr("ui.no_description_provided_7ca49080")}</p>
      </section>

      <ResourceUsageGuide guide={resource.specs?.usageGuide} />

      {resource.specs && Object.keys(resource.specs).some(key => key !== "usageGuide") && (
        <section className="resource-detail-section">
          <h4>{tr("ui.recorded_specifications_eeeff271")}</h4>
          <dl className="resource-spec-grid">{Object.entries(resource.specs).filter(([key]) => key !== "usageGuide").map(([key, value]) => <Detail key={key} label={key} value={String(value)} />)}</dl>
        </section>
      )}

      <section className="resource-detail-section" aria-labelledby="resource-schedule-heading">
        <h4 id="resource-schedule-heading"><CalendarClock size={16} aria-hidden="true" /> {tr("ui.bookings_and_maintenance_7a542896")}</h4>
        {bookings.length === 0 && maintenance.length === 0 ? <p className="resource-detail-empty">{tr("ui.no_saved_schedules_in_this_74dea0aa")}</p> : (
          <div className="resource-event-list">
            {bookings.map((row: any) => <div key={`booking-${row.id}`}><strong>{tr("ui.booking_b2e1971c")}{tr(bookingLabels[row.status]) || row.status}</strong><span>{formatDate(row.startAt)} → {formatDate(row.endAt)}</span></div>)}
            {maintenance.map((row: any) => <div key={`maintenance-${row.id}`}><strong>{row.kind === "calibration" ? tr("ui.calibration_a71e17c8") : tr("ui.maintenance_8ad424bd")} · {tr(maintenanceLabels[row.status]) || row.status}</strong><span>{row.title} · {formatDate(row.startAt)} → {formatDate(row.endAt)}</span></div>)}
          </div>
        )}
      </section>

      <section className="resource-detail-section" aria-labelledby="resource-history-heading">
        <h4 id="resource-history-heading"><History size={16} aria-hidden="true" /> {tr("ui.recorded_resource_history_e8b75ec5")}</h4>
        {history.length === 0 ? <p className="resource-detail-empty">{tr("ui.no_history_events_recorded_8a049a1a")}</p> : (
          <div className="resource-event-list resource-history-list">
            {history.slice(0, 20).map((event: any) => <div key={`${event.source}-${event.id}`}>
              <strong>{historyLabel(event)}</strong>
              <span>{formatDate(event.timestamp)} {tr("ui.source_7a7af506")}{event.source}{event.actor?.fullName ? ` · ${event.actor.fullName}` : ""}</span>
            </div>)}
          </div>
        )}
      </section>

      <p className="resource-detail-timestamps">{tr("ui.created_e6ef0fb9")}{formatDate(resource.createdAt)} {tr("ui.updated_ff4540e4")}{formatDate(resource.updatedAt)}</p>
    </BaseModal2026>
  );
};

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div><dt>{label}</dt><dd>{value}</dd></div>
);

function formatDate(value: string) {
  if (!value) return translate("ui.unknown_068b1940");
  return formatVietnamDateTime(value);
}

function historyLabel(event: any) {
  if (event.eventType === "OPERATIONAL_STATUS_CHANGED") return `${translate(operationalLabels[event.data?.fromStatus]) || event.data?.fromStatus} → ${translate(operationalLabels[event.data?.toStatus]) || event.data?.toStatus}${event.data?.reason ? `: ${event.data.reason}` : ""}`;
  if (event.source === "booking") return translate("ui.booking_56267660", { value0: translate(bookingLabels[event.data?.status]) || event.data?.status });
  if (event.source === "maintenance_window") return `${event.data?.title || translate("ui.maintenance_8ad424bd")} · ${translate(maintenanceLabels[event.data?.status]) || event.data?.status}`;
  if (event.source === "incident") return `${event.data?.title || translate("ui.incident_36824380")} · ${event.data?.status}`;
  return event.data?.message || event.eventType;
}
