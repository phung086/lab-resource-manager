import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  DoorOpen,
  Info,
  Microscope,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { apiRequest } from "../api.js";
import { CANONICAL_BOOKING_STATUS_LABELS } from "../constants.js";
import { GuestQuickBookingPanel } from "./GuestQuickBookingPanel";
import { ResourceGallery } from "./ResourceGallery";
import { ResourceUsageGuide, UsageGuide } from "./ResourceUsageGuide";
import { ResourceMediaPreview } from "./ResourceMediaPreview";
import { formatVietnamDateTime } from "../utils/timezone";
import "../styles/public-catalog.css";

type Media = {
  id: string;
  kind: "IMAGE" | "VIDEO";
  url: string;
  title: string;
  altText: string;
  sourceUrl?: string;
  credit?: string;
  license?: string;
};

type TrainingReq = {
  id: string;
  courseId: string;
  code?: string;
  name?: string;
};

type Resource = {
  id: string;
  code: string;
  name: string;
  description?: string;
  specs?: { usageGuide?: UsageGuide };
  category?: string;
  location: string;
  capacity: number;
  bookingState: string;
  operationalStatus: string;
  media?: Media[];
  laboratory?: {
    name: string;
    labPolicy?: {
      requiresApproval?: boolean;
      maxBookingMinutes?: number;
      minBookingMinutes?: number;
      maxAdvanceBookingDays?: number;
      allowWeekend?: boolean;
      workDayStartHour?: number;
      workDayEndHour?: number;
    };
  };
  effectiveRequiresApproval: boolean;
  trainingRequirements?: TrainingReq[];
  manufacturer?: string;
  model?: string;
};

type ScheduleBlock = { id: string; status?: string; kind?: string; title?: string; startAt: string; endAt: string };
type SchedulePayload = { bookings: ScheduleBlock[]; maintenanceWindows: ScheduleBlock[] };

const categoryLabels: Record<string, string> = {
  ROOM: "ui.lab_room_8ed94274",
  EQUIPMENT: "ui.resources_eb706979",
  MACHINE: "ui.machine_1d4b86ad",
  EXPERIMENT_KIT: "ui.experiment_kit_0acb51cf",
  MATERIAL: "ui.material_23ab10cc"
};

const operationalBadgeLabels: Record<string, { label: string; class: string }> = {
  AVAILABLE: { label: "ui.available_73dc3284", class: "badge-op-available" },
  IN_USE: { label: "ui.in_use_a07a3647", class: "badge-op-inuse" },
  MAINTENANCE: { label: "ui.maintenance_8ad424bd", class: "badge-op-maintenance" },
  CALIBRATION: { label: "ui.calibration_a71e17c8", class: "badge-op-calibration" },
  BROKEN: { label: "ui.broken_969112a4", class: "badge-op-broken" },
  RETIRED: { label: "ui.offline_b4f199c3", class: "badge-op-retired" },
  OFFLINE: { label: "ui.offline_96a8bb03", class: "badge-op-offline" }
};

const bookingBlockStatuses = new Set(["PENDING_APPROVAL", "CONFIRMED", "CHECKED_OUT", "RETURNED"]);

function formatRange(startAt: string, endAt: string) {
  return `${formatVietnamDateTime(startAt)} – ${formatVietnamDateTime(endAt)}`;
}

export function PublicResourceCatalog({
  onViewSchedule,
  onGuestBookingComplete,
  onReady
}: {
  onViewSchedule: (id: string) => void;
  onGuestBookingComplete?: (result: any) => void;
  onReady?: () => void;
}) {
  const { tr, t } = useLocale();
  const [resources, setResources] = useState<Resource[]>([]);
  const [guestBookingOpened, setGuestBookingOpened] = useState(false);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [schedule, setSchedule] = useState<SchedulePayload | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const detailRequest = useRef(0);
  const detailOpener = useRef<HTMLElement | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!loading) onReady?.();
  }, [loading, onReady]);

  useEffect(() => () => { detailRequest.current += 1; }, []);

  // Authenticated user state if present
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lrm_user");
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiRequest("/resources")
      .then((rows: Resource[]) => {
        if (active) {
          setResources(
            rows.filter(
              (row) =>
                ["ROOM", "EQUIPMENT", "MACHINE", "EXPERIMENT_KIT", "MATERIAL"].includes(row.category || "") &&
                row.operationalStatus !== "RETIRED"
            )
          );
        }
      })
      .catch((cause: Error) => {
        if (active) setError(cause.message || "ui.could_not_load_the_resource_f0ca2a15");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision, tr]);

  const categoryOrder = ["ROOM", "EQUIPMENT", "MACHINE", "EXPERIMENT_KIT", "MATERIAL"];
  const matches = resources.filter(row => (filter === "ALL" || row.category === filter) && `${row.name} ${row.code} ${row.location}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .sort((a, b) => categoryOrder.indexOf(a.category || "") - categoryOrder.indexOf(b.category || "") || a.code.localeCompare(b.code));
  const visible = matches.slice(0, limit);

  async function openDetails(row: Resource, rememberOpener = true) {
    const request = ++detailRequest.current;
    if (rememberOpener && selected?.id !== row.id) setGuestBookingOpened(false);
    if (rememberOpener) detailOpener.current = document.activeElement as HTMLElement;
    setSelected(row);
    setDetailLoading(true);
    setDetailError("");
    setSchedule(null);
    setScheduleError("");
    setScheduleLoading(true);
    requestAnimationFrame(() => {
      if (request !== detailRequest.current) return;
      detailHeading.current?.focus({ preventScroll: true });
      document.getElementById("chi-tiet-tai-nguyen")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start"
      });
    });
    const now = new Date();
    const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const [detailResult, scheduleResult] = await Promise.allSettled([
      apiRequest(`/resources/${encodeURIComponent(row.id)}`),
      apiRequest(
        `/resources/${encodeURIComponent(row.id)}/schedule?from=${encodeURIComponent(
          now.toISOString()
        )}&to=${encodeURIComponent(end.toISOString())}`
      )
    ]);
    if (request !== detailRequest.current) return;
    if (detailResult.status === "fulfilled") setSelected(detailResult.value);
    else setDetailError("ui.could_not_load_access_requirements_f8f02857");
    if (scheduleResult.status === "fulfilled") setSchedule(scheduleResult.value);
    if (scheduleResult.status === "rejected") setScheduleError("ui.could_not_load_this_resource_3e14358b");
    setScheduleLoading(false);
    setDetailLoading(false);
  }

  function closeDetails() {
    detailRequest.current += 1;
    setSelected(null);
    detailOpener.current?.focus();
  }

  const busyBookings = (schedule?.bookings || [])
    .filter((row) => row.status && bookingBlockStatuses.has(row.status));
  const busyMaintenance = (schedule?.maintenanceWindows || [])
    .filter((row) => row.status === "scheduled" || row.status === "in_progress");

  // Compute eligibility verdict for selected resource
  function computeEligibility(resource: Resource) {
    if (resource.bookingState !== "bookable") return {
      status: "RESTRICTED", label: t("ui.booking_restricted_7636ca33"),
      message: t("ui.self_service_booking_is_not_abeb64ab"), type: "danger"
    };
    const isPhysicalOk = ["AVAILABLE", "IN_USE"].includes(resource.operationalStatus);
    if (!isPhysicalOk) {
      return {
        status: "UNAVAILABLE",
        label: tr("ui.temporarily_unavailable_47a89b92"),
        message: t("ui.this_resource_is_not_accepting_b608ddec"),
        type: "danger"
      };
    }

    const trainingList = resource.trainingRequirements || [];
    if (trainingList.length === 0) {
      return {
        status: "ELIGIBLE",
        label: tr("ui.no_training_prerequisite_40cc3697"),
        message: tr("ui.no_prerequisite_safety_certification_is_2196781b"),
        type: "success"
      };
    }

    if (!currentUser) {
      return {
        status: "AUTH_REQUIRED",
        label: tr("ui.safety_certification_required_fd466d1a"),
        message: t("ui.required_training_cfc8f7a5") + trainingList.map(item => item.name || item.code).join(', ') + t("ui.your_account_must_hold_valid_064ccae3"),
        type: "info"
      };
    }

    return {
      status: "TRAINING_REQUIRED",
      label: t("ui.certification_check_required_b7981848"),
      message: t("ui.required_42499a23") + trainingList.map(item => item.name || item.code).join(', ') + t("ui.valid_certifications_are_verified_when_afa12870"),
      type: "info"
    };
  }

  return (
    <div className="public-live-catalog">
      <div className="catalog-head">
        <div>
          <h3>{tr("ui.explore_lab_rooms_and_equipment_be952c10")}</h3>
          <p>
            {tr("ui.review_physical_condition_access_requirements_f841db8b")}</p>
        </div>
        <button type="button" onClick={() => setRevision((value) => value + 1)} aria-label={tr("ui.refresh_catalogue_31811f79")}>
          <RefreshCw size={17} aria-hidden="true" />
        </button>
      </div>

      <label className="catalog-search-label">{t("ui.find_a_room_or_equipment_818cf711")}<input type="search" value={search} maxLength={120} onChange={event => { setSearch(event.target.value); setLimit(6); }} placeholder={t("ui.name_resource_code_or_location_9c88af3a")} /></label>
      <div className="catalog-filters" role="group" aria-label={tr("ui.filter_resources_011c6ead")}>
        {[
          ["ALL", tr("ui.all_49c73a31")],
          ["ROOM", tr("ui.lab_room_8ed94274")],
          ["EQUIPMENT", tr("ui.resources_eb706979")],
          ["MACHINE", tr("ui.machine_1d4b86ad")],
          ["EXPERIMENT_KIT", tr("ui.experiment_kit_0acb51cf")],
          ["MATERIAL", tr("ui.material_23ab10cc")]
        ].map(([code, label]) => (
          <button
            key={code}
            type="button"
            aria-pressed={filter === code}
            onClick={() => { setFilter(code); setLimit(6); }}
          >
            {tr(label)}
          </button>
        ))}
      </div>

      {loading && <p role="status">{tr("ui.loading_rooms_and_equipment_e2ad6ba4")}</p>}
      {error && (
        <div className="catalog-message" role="alert">
          {translate(error)}{" "}
          <button type="button" onClick={() => setRevision((value) => value + 1)}>
            {tr("ui.retry_c58d068c")}</button>
        </div>
      )}
      {!loading && !error && visible.length === 0 && (
        <p className="catalog-message">{tr("ui.no_resources_in_this_category_4f1d40ef")}</p>
      )}

      {/* Catalog Cards Grid */}
      <div className="catalog-grid">
        {visible.map((row) => {
          const image = row.media?.find((item) => item.kind === "IMAGE");
          const opBadge = operationalBadgeLabels[row.operationalStatus] || {
            label: row.operationalStatus,
            class: "badge-op-other"
          };
          return (
            <article key={row.id} className="catalog-card">
              <button
                type="button"
                className="catalog-cover"
                onClick={() => void openDetails(row)}
                aria-label={`${t("ui.view_details_f6f88b0f")}: ${row.name}`}
              >
                {image ? (
                  <ResourceMediaPreview key={image.url} kind="IMAGE" url={image.url} alt={image.altText || row.name} />
                ) : (
                  <span className="catalog-placeholder">
                    {row.category === "ROOM" ? <DoorOpen size={48} /> : <Microscope size={48} />}
                    <small>{tr("ui.no_image_available_dcd8ffe7")}</small>
                  </span>
                )}
              </button>

              <div className="catalog-card-body">
                {/* LAB-oriented Status Badges */}
                <div className="catalog-card-badges">
                  <span className={`card-badge ${opBadge.class}`}>{tr(opBadge.label)}</span>
                  <span className="card-badge badge-approval">
                    {row.effectiveRequiresApproval ? tr("ui.approval_required_dc95ee8f") : tr("ui.automatic_a25c8028")}
                  </span>
                  {row.trainingRequirements && row.trainingRequirements.length > 0 && (
                    <span className="card-badge badge-training">{tr("ui.training_required_cf046e4c")}</span>
                  )}
                </div>

                <span className="catalog-card-meta">
                  {tr(categoryLabels[row.category || ""] || row.category || "")} · {row.code}
                </span>
                <h4>{row.name}</h4>
                <p className="catalog-card-loc">{row.location}</p>

                {/* Primary CTA */}
                <button
                  type="button"
                  className="catalog-card-cta"
                  onClick={() => void openDetails(row)}
                >
                  {tr("ui.view_schedule_book_8ca5d3f1")}<ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && !error && matches.length > limit && <button type="button" className="public-secondary catalog-show-more" onClick={() => setLimit(value => value + 6)}>{t("ui.show_more_resources_8cf8a7b8")} ({matches.length - limit})</button>}
      {/* Resource Detail Section */}
      {selected && (
        <section className="catalog-detail" id="chi-tiet-tai-nguyen" aria-labelledby="catalog-detail-title">
          <div className="catalog-detail-heading">
            <div>
              <span>
                {tr(categoryLabels[selected.category || ""])} · {selected.code}
              </span>
              <h3 id="catalog-detail-title" ref={detailHeading} tabIndex={-1}>{selected.name}</h3>
              <p>{selected.laboratory?.name || selected.location}</p>
            </div>
            <button type="button" onClick={closeDetails} aria-label={tr("ui.close_details_f6d87bfc")}>
              {tr("ui.close_5d54c2a1")}</button>
          </div>

          {detailLoading ? (
            <p role="status">{tr("ui.checking_information_and_access_requirements_72ae64fb")}</p>
          ) : detailError ? (
            <div className="catalog-message" role="alert">
              {translate(detailError)}{" "}
              <button type="button" onClick={() => void openDetails(selected, false)}>{tr("ui.retry_c58d068c")}</button>
            </div>
          ) : null}

          <div className="catalog-detail-layout">
            <div className="catalog-media-gallery">
              <ResourceGallery key={selected.id} resourceId={selected.id} initialItems={selected.media} />
              <ResourceUsageGuide guide={selected.specs?.usageGuide} />
            </div>

            <div className="catalog-facts">
              {/* Eligibility First Card: Answers "Tôi có thể sử dụng tài nguyên này không?" */}
              {(() => {
                const verdict = computeEligibility(selected);
                return (
                  <div className={`catalog-eligibility-verdict verdict-${verdict.type}`}>
                    <div className="verdict-header">
                      {verdict.type === "success" ? (
                        <CheckCircle2 size={18} aria-hidden="true" />
                      ) : verdict.type === "warning" ? (
                        <ShieldAlert size={18} aria-hidden="true" />
                      ) : verdict.type === "danger" ? (
                        <XCircle size={18} aria-hidden="true" />
                      ) : (
                        <Info size={18} aria-hidden="true" />
                      )}
                      <strong>{tr("ui.access_requirements_6c692202")}{" "}{verdict.label}</strong>
                    </div>
                    <p>{verdict.message}</p>
                  </div>
                );
              })()}

              <p className="catalog-description">
                {selected.description || tr("ui.lab_staff_maintain_the_detailed_af9d4644")}
              </p>

              <dl className="catalog-spec-dl">
                <div>
                  <dt>{tr("ui.location_4c781313")}</dt>
                  <dd>{selected.location}</dd>
                </div>
                <div>
                  <dt>{tr("ui.capacity_quantity_a35ef20e")}</dt>
                  <dd>{selected.capacity}</dd>
                </div>
                <div>
                  <dt>{tr("ui.approve_e94fc148")}</dt>
                  <dd>
                    {selected.effectiveRequiresApproval
                      ? tr("ui.staff_approval_required_before_handover_4d6bf5a3")
                      : tr("ui.automatic_confirmation_under_policy_bfbbda9a")}
                  </dd>
                </div>
                <div>
                  <dt>{tr("ui.safety_training_d48b0cef")}</dt>
                  <dd>
                    {selected.trainingRequirements && selected.trainingRequirements.length > 0
                      ? selected.trainingRequirements.map((t) => t.name || t.code).join(", ")
                      : tr("ui.not_required_ae94c3a4")}
                  </dd>
                </div>
                {selected.laboratory?.labPolicy && (
                  <div>
                    <dt>{tr("ui.operating_hours_7850d7de")}</dt>
                    <dd>
                      {selected.laboratory.labPolicy.workDayStartHour ?? 8}:00 –{" "}
                      {selected.laboratory.labPolicy.workDayEndHour ?? 18}:00{" "}
                      {selected.laboratory.labPolicy.allowWeekend ? tr("ui.weekends_included_1da10d25") : tr("ui.working_days_629bf527")}
                    </dd>
                  </div>
                )}
                {selected.model && (
                  <div>
                    <dt>{tr("ui.model_reference_da0677f5")}</dt>
                    <dd>{selected.model}</dd>
                  </div>
                )}
              </dl>

              {/* Busy Schedule in Next 14 Days */}
              <div className="catalog-schedule">
                <div>
                  <strong>{tr("ui.busy_times_in_the_next_d56621b7")}</strong>
                  <span>{tr("ui.vietnam_time_utc_07_00_f7f7e8e0")}</span>
                </div>
                {scheduleLoading && <p role="status">{tr("ui.loading_busy_times_045df5bf")}</p>}
                {scheduleError && (
                  <p role="alert">
                    {translate(scheduleError)}{" "}
                    <button type="button" onClick={() => void openDetails(selected, false)}>{tr("ui.retry_c58d068c")}</button>
                  </p>
                )}
                {!scheduleLoading && !scheduleError && busyBookings.length === 0 && busyMaintenance.length === 0 && (
                  <p>{tr("ui.no_bookings_or_maintenance_in_aede2f1d")}</p>
                )}
                <ul>
                  {busyBookings.slice(0, 6).map((row) => (
                    <li key={`booking-${row.id}`}>
                      <span>{tr(CANONICAL_BOOKING_STATUS_LABELS[row.status || ""] || row.status || "")}</span>
                      <strong>{formatRange(row.startAt, row.endAt)}</strong>
                    </li>
                  ))}
                  {busyMaintenance.slice(0, 4).map((row) => (
                    <li key={`maintenance-${row.id}`}>
                      <span>{row.kind === "calibration" ? tr("ui.calibration_a71e17c8") : tr("ui.maintenance_8ad424bd")}</span>
                      <strong>{formatRange(row.startAt, row.endAt)}</strong>
                    </li>
                  ))}
                </ul>
                {(busyBookings.length > 6 || busyMaintenance.length > 4) && (
                  <p>{tr("ui.showing_68091fea")}{Math.min(busyBookings.length, 6) + Math.min(busyMaintenance.length, 4)} / {busyBookings.length + busyMaintenance.length} {tr("ui.busy_periods_sign_in_for_432bdad0")}</p>
                )}
              </div>

              {/* Internal Booking CTA */}
              <button
                type="button"
                className="public-primary"
                onClick={() => onViewSchedule(selected.id)}
                disabled={detailLoading || Boolean(detailError) || computeEligibility(selected).type === "danger"}
              >
                <CalendarDays size={18} aria-hidden="true" /> {currentUser ? t("ui.open_calendar_to_book_47ce166f") : tr("ui.sign_in_to_book_with_df7c9bb7")}{" "}
                <ArrowRight size={17} aria-hidden="true" />
              </button>

              {/* Guest Quick Booking Section */}
              {onGuestBookingComplete && !detailLoading && !detailError && computeEligibility(selected).type !== "danger" && (
                <details key={selected.id} className="catalog-guest-booking" onToggle={event => { if (event.currentTarget.open) setGuestBookingOpened(true); }}>
                  <summary>{t("ui.quick_booking_for_external_visitors_81f66209")}</summary>
                  <p>{t("ui.verify_your_email_and_access_8a527832")}</p>
                  {guestBookingOpened && <GuestQuickBookingPanel key={selected.id} resource={selected} onComplete={onGuestBookingComplete} />}
                </details>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
