/**
 * ResourceDetailPage.tsx
 * Dedicated page for viewing resource details (R3-A repair)
 * Uses callback props — NO react-router-dom
 * Reuses: ResourceGallery, ResourceUsageGuide, LabPolicySummary
 */

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarClock, History, DoorOpen, Microscope, MapPin, Users, ShieldCheck } from "lucide-react";
import { apiRequest } from "../api.js";
import { useLocale } from "../providers/LocaleProvider";
import { translate } from "../i18n.js";
import { ResourceGallery } from "../components/ResourceGallery";
import { ResourceUsageGuide } from "../components/ResourceUsageGuide";
import { LabPolicySummary } from "../components/LabPolicySummary";
import { ResourceSpecifications } from "../components/ResourceSpecifications";
import { ResourcePricingSummary } from "../components/ResourcePricingSummary";
import { ResourceFulfillmentEditor } from '../components/features/operations/ResourceFulfillmentEditor';
import { formatVietnamDateTime } from "../utils/timezone.js";
import "../styles/resource-workspace.css";
import "../styles/resource-discovery.css";
import "../styles/resource-catalogue.css";

export interface ResourceDetailPageProps {
  user?: { id: string; role: string };
  resourceId: string;
  onBack: () => void;
  onViewCalendar?: (id: string) => void;
  onAddToSelection?: (resource: any) => void;
  isSelected?: boolean;
  selectionFull?: boolean;
  onViewSelection?: () => void;
}

const categoryLabels: Record<string, string> = {
  ROOM: "ui.room_6aec2ab4",
  EQUIPMENT: "enum.category.EQUIPMENT",
  MACHINE: "ui.machine_1d4b86ad",
  EXPERIMENT_KIT: "ui.experiment_kit_0acb51cf",
  MATERIAL: "ui.material_23ab10cc"
};
const operationalLabels: Record<string, string> = {
  AVAILABLE: "ui.available_d654065d", IN_USE: "ui.in_use_a07a3647", MAINTENANCE: "ui.maintenance_8ad424bd",
  CALIBRATION: "ui.calibration_a71e17c8", BROKEN: "ui.broken_fd69bba6", RETIRED: "ui.retired_910c0237", OFFLINE: "ui.offline_96a8bb03"
};
const bookingLabels: Record<string, string> = {
  PENDING_APPROVAL: "ui.pending_approval_6af96613", CONFIRMED: "ui.confirmed_e72d13e3", CHECKED_OUT: "ui.in_use_a07a3647",
  RETURNED: "ui.returned_fd3eb4fb", COMPLETED: "ui.completed_b0484236", REJECTED: "ui.reject_b61a0ebc", CANCELLED: "ui.cancelled_2f777a90"
};
const maintenanceLabels: Record<string, string> = {
  scheduled: "ui.scheduled_2cf00513", in_progress: "ui.in_progress_50e04c04", completed: "ui.completed_5eb36f8c", cancelled: "ui.cancelled_2f777a90"
};
const availabilityLabels: Record<string, string> = {
  AVAILABLE: "ui.available_d654065d", RESERVED: "ui.reserved_b5eaf84b", RESTRICTED: "ui.restricted_booking_1e5b50c0", UNAVAILABLE: "ui.not_bookable_cc51bab6"
};

export const ResourceDetailPage: React.FC<ResourceDetailPageProps> = ({
  user,
  resourceId,
  onBack,
  onViewCalendar,
  onAddToSelection,
  isSelected = false,
  selectionFull = false,
  onViewSelection
}) => {
  const { tr } = useLocale();

  // Separate resource state
  const [resource, setResource] = useState<any>(null);
  const [resourceLoading, setResourceLoading] = useState(true);
  const [resourceError, setResourceError] = useState("");
  const [resourceRevision, setResourceRevision] = useState(0);
  const [section, setSection] = useState("overview");

  // Separate schedule state
  const [schedule, setSchedule] = useState<any>(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleRevision, setScheduleRevision] = useState(0);

  // History state (on-demand)
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const historyController = useRef<AbortController | null>(null);
  const historyRequest = useRef(0);

  // Abort/stale protection
  const resourceRequest = useRef(0);
  const scheduleRequest = useRef(0);

  useEffect(() => {
    setSection("overview");
    historyController.current?.abort();
    historyRequest.current += 1;
    setHistory([]);
    setHistoryLoaded(false);
    setHistoryLoading(false);
    setHistoryError("");
    return () => {
      historyController.current?.abort();
      historyRequest.current += 1;
    };
  }, [resourceId]);

  // Load resource
  useEffect(() => {
    const req = ++resourceRequest.current;
    setResourceLoading(true);
    setResourceError("");

    const controller = new AbortController();

    apiRequest(`/resources/${resourceId}`, { signal: controller.signal })
      .then((data) => {
        if (req !== resourceRequest.current || controller.signal.aborted) return;
        setResource(data);
        setResourceError("");
      })
      .catch((err) => {
        if (req !== resourceRequest.current || controller.signal.aborted) return;
        setResourceError(err?.message || "ui.could_not_load_resource_details_4c2dba0d");
      })
      .finally(() => {
        if (req === resourceRequest.current) setResourceLoading(false);
      });

    return () => controller.abort();
  }, [resourceId, resourceRevision]);

  // Load schedule separately
  useEffect(() => {
    const req = ++scheduleRequest.current;
    setScheduleLoading(true);
    setScheduleError("");

    const controller = new AbortController();

    apiRequest(`/resources/${resourceId}/schedule`, { signal: controller.signal })
      .then((data) => {
        if (req !== scheduleRequest.current || controller.signal.aborted) return;
        setSchedule(data);
        setScheduleError("");
      })
      .catch((err) => {
        if (req !== scheduleRequest.current || controller.signal.aborted) return;
        setScheduleError(err?.message || "ui.resourceDiscovery.scheduleError");
      })
      .finally(() => {
        if (req === scheduleRequest.current) setScheduleLoading(false);
      });

    return () => controller.abort();
  }, [resourceId, scheduleRevision]);

  // Load history ON DEMAND when user opens section
  const loadHistory = (retry = false) => {
    if (historyLoading || (historyLoaded && !retry)) return;
    setHistoryLoaded(true);
    historyController.current?.abort();
    const controller = new AbortController();
    historyController.current = controller;
    const request = ++historyRequest.current;
    setHistoryLoading(true);
    setHistoryError("");
    setHistory([]);

    apiRequest(`/resources/${resourceId}/history`, { signal: controller.signal })
      .then((payload) => {
        if (!controller.signal.aborted && request === historyRequest.current) {
          setHistory(payload.timeline || []);
          setHistoryError("");
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted && request === historyRequest.current) {
          setHistoryError(err.status === 403 ? "refine.historyScope" : err.message || "api.API_REQUEST_FAILED");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && request === historyRequest.current) setHistoryLoading(false);
      });
  };

  const handleAddToSelection = () => {
    if (resource && onAddToSelection) {
      onAddToSelection(resource);
    }
  };

  // Loading state
  if (resourceLoading) {
    return (
      <div className="workspace-container resource-detail-page">
        <div className="resource-detail-loading" role="status" aria-live="polite">
          <p>{tr("ui.loading_148ded83")}</p>
        </div>
      </div>
    );
  }

  // Resource error state
  if (resourceError || !resource) {
    return (
      <div className="workspace-container resource-detail-page">
        <div className="alert danger" role="alert">
          <p>{tr(resourceError || "ui.resourceDiscovery.notFound")}</p>
          <button type="button" className="btn btn-secondary" onClick={() => setResourceRevision(value => value + 1)}>
            {tr("ui.retry_c58d068c")}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            {tr("ui.resourceDiscovery.back")}
          </button>
        </div>
      </div>
    );
  }

  const bookings = schedule?.bookings || [];
  const maintenance = schedule?.maintenanceWindows || [];
  const cover = resource.media?.find((item: any) => item.kind === "IMAGE");

  return (
    <div className="workspace-container resource-detail-page">
      {/* Breadcrumb / Back */}
      <nav className="resource-detail-breadcrumb" aria-label={tr("ui.resourceDiscovery.navigation")}>
        <button
          type="button"
          className="back-button"
          onClick={onBack}
          aria-label={tr("ui.resourceDiscovery.back")}
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>{tr("ui.resourceDiscovery.backCatalogue")}</span>
        </button>
      </nav>

      <header className="resource-profile-hero">
        <div className="resource-profile-symbol" aria-hidden="true">{resource.category === "ROOM" ? <DoorOpen size={42} strokeWidth={1.4} /> : <Microscope size={42} strokeWidth={1.4} />}</div>
        <div className="resource-profile-identity">
          <div className="resource-profile-meta"><span className="resource-detail-code">{resource.code}</span><span>{resource.category ? tr(categoryLabels[resource.category]) : tr("ui.unclassified_10fe63fa")}</span></div>
          <h1>{resource.name}</h1>
          <p><MapPin size={16} aria-hidden="true" />{resource.laboratory?.name || resource.location || tr("ui.not_assigned_ebe3cb5d")}</p>
        </div>
        <dl className="resource-profile-facts">
          <div><dt><Users size={16} aria-hidden="true" />{tr(resource.category === "ROOM" ? "ui.catalogue.seats" : "ui.catalogue.quantity")}</dt><dd>{resource.capacity}</dd></div>
          <div><dt><ShieldCheck size={16} aria-hidden="true" />{tr("ui.approval_required_cc220dc0")}</dt><dd>{tr(resource.effectiveRequiresApproval ? "ui.approval_required_dc95ee8f" : "ui.confirm_automatically_when_eligible_e47b0eb4")}</dd></div>
        </dl>
      </header>
      <nav className="resource-profile-nav" aria-label={tr("ui.catalogue.detailNavigation")}>
        {[ ["overview", "ui.resourceDiscovery.overview"], ["specs", "ui.catalogue.specifications"], ["usage", "ui.usage_guide_28e5af8d"], ["pricing", "ui.rental.pricing"], ["schedule", "ui.resourceDiscovery.schedule"] ].map(([value,label]) => <button key={value} type="button" aria-pressed={section === value} aria-controls={`${value}-heading`} onPointerEnter={() => setSection(value)} onFocus={() => setSection(value)} onClick={() => setSection(value)}>{tr(label)}</button>)}
      </nav>
      {/* Main Content Grid */}
      <div className="resource-detail-layout">
        {/* Left Column: Gallery + Details */}
        <div className="resource-detail-main">
          {/* Gallery */}
          <section className="resource-detail-gallery" aria-labelledby="gallery-heading" hidden={section !== "overview"}>
            <h2 id="gallery-heading" className="sr-only">{tr("ui.resourceDiscovery.media")}</h2>
            <ResourceGallery key={resource.id} resourceId={resource.id} initialItems={resource.media} />
          </section>

          {/* Overview */}
          <section className="resource-detail-section" aria-labelledby="overview-heading" hidden={section !== "overview"}>
            <h3 id="overview-heading" className="resource-section-title">{tr("ui.resourceDiscovery.overview")}</h3>
            <p className="resource-description">
              {resource.description || tr("ui.no_description_provided_7ca49080")}
            </p>

            {/* Key facts */}
            <dl className="resource-overview-facts">
              <DetailFact
                label={tr("ui.laboratory_eb85976f")}
                value={resource.laboratory?.name || resource.location || tr("ui.not_assigned_ebe3cb5d")}
              />
              <DetailFact
                label={tr("ui.approval_required_cc220dc0")}
                value={resource.effectiveRequiresApproval
                  ? tr("ui.approval_required_dc95ee8f")
                  : tr("ui.confirm_automatically_when_eligible_e47b0eb4")}
              />
              {resource.trainingRequirements?.length > 0 && (
                <DetailFact
                  label={tr("ui.safety_training_d48b0cef")}
                  value={resource.trainingRequirements.map((course: any) => course.name || course.code).join(", ")}
                />
              )}
            </dl>
          </section>

          {/* Specifications */}
          <section className="resource-detail-section" aria-labelledby="specs-heading" hidden={section !== "specs"}>
            <h3 id="specs-heading" className="resource-section-title">{tr("ui.catalogue.specifications")}</h3>
            <dl className="resource-detail-grid">
              <DetailFact label={tr('ui.capacity_quantity_1e2e42b3')} value={String(resource.capacity)}/>
              {resource.manufacturer && <DetailFact label={tr('ui.manufacturer_ceeb2ab5')} value={resource.manufacturer}/>}
              {resource.model && <DetailFact label={tr('ui.model_5e2c614c')} value={resource.model}/>}
              {resource.serialNumber && <DetailFact label={tr('ui.catalogue.assetCode')} value={resource.serialNumber}/>}
            </dl>
            <ResourceSpecifications specs={resource.specs} />
          </section>
          <section className="resource-detail-section" aria-labelledby="usage-heading" hidden={section !== "usage"}>
            <h3 id="usage-heading" className="resource-section-title">{tr("ui.catalogue.conditions")}</h3>
            <LabPolicySummary
                policy={{ ...(resource.labPolicy || resource.laboratory?.labPolicy), maxBookingMinutes: resource.maxBookingMinutes }}
              requiresApproval={resource.effectiveRequiresApproval}
            />

            <ResourceUsageGuide guide={resource.specs?.usageGuide} isSample={resource.specs?.environment === "LOCAL_DEMO"} />
          </section>
          <section className="resource-detail-section" aria-labelledby="pricing-heading" hidden={section !== "pricing"}>
            <h3 id="pricing-heading" className="resource-section-title">{tr("ui.catalogue.pricing")}</h3>
            <ResourcePricingSummary key={resource.id} resourceId={resource.id} />
            {user?.role === 'ADMIN' && <ResourceFulfillmentEditor key={resource.id} resourceId={resource.id} />}
          </section>

          {/* Schedule */}
          <section className="resource-detail-section" aria-labelledby="schedule-heading" hidden={section !== "schedule"}>
            <h3 id="schedule-heading" className="resource-section-title">
              <CalendarClock size={18} aria-hidden="true" />
              {tr("ui.resourceDiscovery.schedule")}
            </h3>
            {scheduleLoading ? (
              <p role="status">{tr("ui.loading_148ded83")}</p>
            ) : scheduleError ? (
              <div role="alert">
                <p>{tr(scheduleError)}</p>
                <button type="button" className="btn btn-secondary" onClick={() => setScheduleRevision(value => value + 1)}>{tr("ui.retry_c58d068c")}</button>
              </div>
            ) : bookings.length === 0 && maintenance.length === 0 ? (
              <p className="resource-detail-empty">{tr("ui.resourceDiscovery.emptySchedule")}</p>
            ) : (
              <div className="resource-event-list">
                {bookings.map((row: any) => (
                  <div key={`booking-${row.id}`} className="resource-event-item">
                    <strong>{tr("ui.booking_b2e1971c")} {tr(bookingLabels[row.status]) || row.status}</strong>
                    <span className="resource-event-time">
                      {formatDate(row.startAt)} → {formatDate(row.endAt)}
                    </span>
                  </div>
                ))}
                {maintenance.map((row: any) => (
                  <div key={`maintenance-${row.id}`} className="resource-event-item">
                    <strong>
                      {row.kind === "calibration" ? tr("ui.calibration_a71e17c8") : tr("ui.maintenance_8ad424bd")}
                      {" · "}
                      {tr(maintenanceLabels[row.status]) || row.status}
                    </strong>
                    <span className="resource-event-time">
                      {row.title} · {formatDate(row.startAt)} → {formatDate(row.endAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* History — loads on demand */}
          <section className="resource-detail-section" aria-labelledby="history-heading" hidden={!user || section !== "schedule"}>
            <h3 id="history-heading" className="resource-section-title">
              <History size={18} aria-hidden="true" />
              {tr("ui.recorded_resource_history_e8b75ec5")}
            </h3>
            {!historyLoaded && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => loadHistory()}
              >
                {tr("ui.resourceDiscovery.loadHistory") || tr("ui.loading_148ded83")}
              </button>
            )}
            {historyLoading && <p role="status">{tr("ui.loading_148ded83")}</p>}
            {historyError && !historyLoading && (
              <div role="alert">
                <p>{tr(historyError)}</p>
                {historyError !== "refine.historyScope" && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => loadHistory(true)}
                  >
                    {tr("ui.retry_c58d068c")}
                  </button>
                )}
              </div>
            )}
            {historyLoaded && !historyLoading && history.length === 0 && !historyError && (
              <p className="resource-detail-empty">{tr("ui.no_history_events_recorded_8a049a1a")}</p>
            )}
            {history.length > 0 && (
              <div className="resource-event-list resource-history-list">
                {history.slice(0, 20).map((event: any) => (
                  <div key={`${event.source}-${event.id}`} className="resource-event-item">
                    <strong>{historyLabel(event)}</strong>
                    <span className="resource-event-meta">
                      {formatDate(event.timestamp)}
                      {" · "}{tr("ui.source_7a7af506")}{event.source}
                      {event.actor?.fullName ? ` · ${event.actor.fullName}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Timestamps */}
          <p className="resource-detail-timestamps" hidden>
            {tr("ui.created_e6ef0fb9")}{formatDate(resource.createdAt)}
            {" · "}{tr("ui.updated_ff4540e4")}{formatDate(resource.updatedAt)}
          </p>
        </div>

        {/* Right Column: Actions Sidebar */}
        <aside className="resource-detail-sidebar">
          <div className="resource-sidebar-card">
            {/* Header */}
            <div className="resource-sidebar-header">
              <h2 className="resource-sidebar-title">{resource.rental ? new Intl.NumberFormat("vi-VN").format(resource.rental.hourlyRateVnd) + " ₫ / " + tr("ui.rental.hour") : tr("ui.rental.pricePending")}</h2>
              <p className="resource-sidebar-subtitle">
                {tr("ui.rental.maxDuration")} {resource.maxBookingMinutes ? resource.maxBookingMinutes / 60 : "—"} {tr("ui.rental.hours")}
              </p>
            </div>

            {/* Status badges */}
            <div className="resource-sidebar-status">
              <div className="resource-status-row">
                <span className="resource-state-label">{tr("ui.physical_state_c30af32d")}</span>
                <span className={`resource-status-pill status-${String(resource.operationalStatus).toLowerCase()}`}>
                  {tr(operationalLabels[resource.operationalStatus]) || resource.operationalStatus}
                </span>
              </div>
              <div className="resource-status-row">
                <span className="resource-state-label">{tr("ui.current_availability_f57c5e36")}</span>
                <span className={`resource-status-pill status-${String(resource.availability?.state || "unavailable").toLowerCase()}`}>
                  {resource.availability?.state
                    ? tr(availabilityLabels[resource.availability.state]) || tr("ui.not_bookable_cc51bab6")
                    : tr("ui.not_bookable_cc51bab6")}
                </span>
              </div>
              {!resource.category && (
                <span className="resource-status-pill status-unresolved">{tr("ui.unclassified_10fe63fa")}</span>
              )}
            </div>

            {/* Action buttons */}
            <div className="resource-sidebar-actions">
              {onViewCalendar && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onViewCalendar(resource.id)}
                >
                  <CalendarClock size={16} aria-hidden="true" />
                  {tr("ui.view_resource_calendar_a11d4b1d")}
                </button>
              )}
              {onAddToSelection && (
                <button
                  type="button"
                  className={isSelected ? "btn btn-selected" : "btn btn-primary"}
                  onClick={handleAddToSelection}
                  disabled={isSelected || selectionFull}
                >
                  {isSelected ? tr("ui.resourceDiscovery.selected") : selectionFull ? tr("ui.resourceSelection.limit") : tr("ui.resourceDiscovery.add")}
                </button>
              )}
              {onViewSelection && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onViewSelection}
                >
                  {tr("ui.resourceDiscovery.viewSelection")}
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

// Helper components
const DetailFact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

function formatDate(value: string) {
  if (!value) return translate("ui.unknown_068b1940");
  return formatVietnamDateTime(value);
}

function historyLabel(event: any) {
  if (event.eventType === "OPERATIONAL_STATUS_CHANGED") {
    return `${translate(operationalLabels[event.data?.fromStatus]) || event.data?.fromStatus} → ${translate(operationalLabels[event.data?.toStatus]) || event.data?.toStatus}${event.data?.reason ? `: ${event.data.reason}` : ""}`;
  }
  if (event.source === "booking") {
    return translate("ui.booking_56267660", { value0: translate(bookingLabels[event.data?.status]) || event.data?.status });
  }
  if (event.source === "maintenance_window") {
    return `${event.data?.title || translate("ui.maintenance_8ad424bd")} · ${translate(maintenanceLabels[event.data?.status]) || event.data?.status}`;
  }
  if (event.source === "incident") {
    return `${event.data?.title || translate("ui.incident_36824380")} · ${event.data?.status}`;
  }
  return event.data?.message || event.eventType;
}
