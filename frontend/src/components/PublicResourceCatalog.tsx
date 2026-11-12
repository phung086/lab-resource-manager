import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  DoorOpen,
  Info,
  Microscope,
  RefreshCw,
  SlidersHorizontal,
  MapPin,
  Layers,
  ShieldAlert,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { ExpandableCard } from './base/ExpandableCard';
import { StatusPill } from './features/resources/ResourceStatusPill';
import { StatusBadge } from './base/StatusBadge';
import { apiRequest } from "../api.js";
import { CANONICAL_BOOKING_STATUS_LABELS } from "../constants.js";
import { GuestQuickBookingPanel } from "./GuestQuickBookingPanel";
import { ResourceGallery } from "./ResourceGallery";
import { ResourceUsageGuide, UsageGuide } from "./ResourceUsageGuide";
import { ResourceSpecifications } from "./ResourceSpecifications";
import { ResourceTariffTable } from "./ResourceTariffTable";
import { ResourcePricingSummary } from "./ResourcePricingSummary";
import { ResourceMediaPreview } from "./ResourceMediaPreview";
import { ResourceCategoryArt } from "./ResourceCategoryArt";
import { ResourceFinder } from './features/resources/ResourceFinder';
import { searchResources } from '../utils/resourceSearch';
import { formatVietnamDateTime } from "../utils/timezone";
import "../styles/public-catalog.css";
import "../styles/catalog-explorer.css";

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
  availability?: { source: string; available: boolean; state: string };
  rental?: { hourlyRateVnd: number } | null;
  maxBookingMinutes?: number | null;
  id: string;
  code: string;
  name: string;
  description?: string;
  specs?: Record<string, unknown> & { usageGuide?: UsageGuide };
  category?: string;
  location: string;
  capacity: number;
  bookingState: string;
  operationalStatus: string;
  laboratoryId?: string | null;
  media?: Media[];
  laboratory?: {
    name: string;
    isActive?: boolean;
    labPolicy?: {
      requiresApproval?: boolean;
      maxBookingMinutes?: number;
      minBookingMinutes?: number;
      maxAdvanceBookingDays?: number;
      minAdvanceBookingMinutes?: number;
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
  EQUIPMENT: "enum.category.EQUIPMENT",
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
  RETIRED: { label: "enum.operational.RETIRED", class: "badge-op-retired" },
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
  const [laboratoryId, setLaboratoryId] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [priceView, setPriceView] = useState(false);
  const [detailSection, setDetailSection] = useState("overview");
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
      const raw = sessionStorage.getItem("lrm_user");
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
  const laboratories = [...new Map(resources.flatMap(row => row.laboratoryId && row.laboratory?.name
    ? [[row.laboratoryId, row.laboratory.name] as const] : [])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const scopedRows = resources.filter(row => (!laboratoryId || row.laboratoryId === laboratoryId) && (!availableOnly || row.availability?.state === 'AVAILABLE'));
  const searched = searchResources(scopedRows, search);
  const matches = searched.filter(row => filter === 'ALL' || row.category === filter);
  if (!search.trim()) matches.sort((a, b) => categoryOrder.indexOf(a.category || '') - categoryOrder.indexOf(b.category || '') || a.code.localeCompare(b.code));
  const visible = matches.slice(0, limit);
  const activeFilterCount = Number(filter !== 'ALL') + Number(Boolean(laboratoryId)) + Number(availableOnly);

  async function openDetails(row: Resource, rememberOpener = true) {
    if (rememberOpener) setDetailSection("overview");
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
    requestAnimationFrame(() => detailOpener.current?.focus());
  }

  const busyBookings = (schedule?.bookings || [])
    .filter((row) => row.status && bookingBlockStatuses.has(row.status));
  const busyMaintenance = (schedule?.maintenanceWindows || [])
    .filter((row) => row.status === "scheduled" || row.status === "in_progress");

  // Compute eligibility verdict for selected resource
  function computeEligibility(resource: Resource) {
    if (resource.availability?.source === "maintenance_policy") return {
      status: "UNAVAILABLE", label: tr("ui.rental.serviceRequired"),
      message: tr("ui.rental.serviceRequired"), type: "danger"
    };
    if (resource.bookingState !== "bookable") return {
      status: "RESTRICTED", label: t("ui.booking_restricted_7636ca33"),
      message: t("ui.self_service_booking_is_not_abeb64ab"), type: "danger"
    };
    const isPhysicalOk = ["AVAILABLE", "IN_USE"].includes(resource.operationalStatus) && resource.laboratory?.isActive !== false;
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
          <h2>{tr("ui.explore_lab_rooms_and_equipment_be952c10")}</h2>
          <p>
            {tr("ui.review_physical_condition_access_requirements_f841db8b")}</p>
        </div>
        <button type="button" onClick={() => setRevision((value) => value + 1)} aria-label={tr("ui.refresh_catalogue_31811f79")}>
          <RefreshCw size={17} aria-hidden="true" />
        </button>
      </div>

      <div className="catalog-browser catalog-explorer-refined" hidden={Boolean(selected)}>
      <aside className="catalog-sidebar">
        <h3 className="catalog-filter-heading"><SlidersHorizontal size={17} aria-hidden="true" />{t('ui.filter_resources_011c6ead')}</h3>
        <button type="button" className="catalog-filter-toggle" aria-controls="public-catalog-facets" aria-expanded={filtersExpanded} onClick={() => setFiltersExpanded(!filtersExpanded)}>
          <SlidersHorizontal size={17} aria-hidden="true" />{t('ui.filter_resources_011c6ead')}{activeFilterCount > 0 && <span>{activeFilterCount}</span>}<ChevronDown size={16} aria-hidden="true" />
        </button>
      <div id="public-catalog-facets" className="catalog-facet-stack" data-expanded={filtersExpanded}>
      <fieldset className="catalog-facet"><legend>{t('ui.resource_category_5fc170bb')}</legend>
      <div className="catalog-filters">
        {[
          ["ALL", tr("ui.all_49c73a31")],
          ["ROOM", tr("ui.lab_room_8ed94274")],
          ["EQUIPMENT", tr("enum.category.EQUIPMENT")],
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
            {code === "ROOM" ? <DoorOpen size={18} aria-hidden="true" /> : code === "EQUIPMENT" ? <Microscope size={18} aria-hidden="true" /> : <Layers size={18} aria-hidden="true" />}
            <span>{label}</span>
            {!loading && !error && <small>{code === 'ALL' ? searched.length : searched.filter(row => row.category === code).length}</small>}
          </button>
        ))}
      </div>
      </fieldset>
      <fieldset className="catalog-facet"><legend>{t('ui.laboratory_eb85976f')}</legend>
        <select aria-label={t('ui.laboratory_eb85976f')} value={laboratoryId} onChange={event=>{setLaboratoryId(event.target.value);setLimit(6);}}>
          <option value="">{t('ui.all_49c73a31')}</option>
          {laboratories.map(([id, name])=><option key={id} value={id}>{name}</option>)}
        </select>
      </fieldset>
      <fieldset className="catalog-facet"><legend>{t('ui.current_availability_f57c5e36')}</legend>
        <label className="catalog-availability-toggle"><input type="checkbox" checked={availableOnly} onChange={event=>{setAvailableOnly(event.target.checked);setLimit(6);}}/><span>{t('ui.resourceFinder.availableOnly')}</span></label>
      </fieldset>
      {activeFilterCount > 0 && <button type="button" className="catalog-filter-reset" onClick={()=>{setFilter('ALL');setLaboratoryId('');setAvailableOnly(false);setLimit(6);}}>{t('ui.clear_filters_f8f509b1')}</button>}
      <p className="catalog-sidebar-note">{t('ui.catalogue.explorer.scope')}</p>
      </div>
      </aside>
      <div className="catalog-results">
      <div className="catalog-toolbar">
      <ResourceFinder className="catalog-search-label" label={t('ui.find_a_room_or_equipment_818cf711')} placeholder={t('ui.name_resource_code_or_location_9c88af3a')}
        records={scopedRows.filter(row=>filter==='ALL'||row.category===filter)} ready={!loading&&!error} value={search}
        onChange={value=>{setSearch(value);setLimit(6);}} onSearch={()=>document.getElementById('public-catalog-results')?.focus()}
        onPick={row=>void openDetails(row)}/>
      <button className="catalog-refresh" type="button" onClick={() => setRevision(value => value + 1)} aria-label={t('ui.refresh_catalogue_31811f79')}><RefreshCw size={18} aria-hidden="true" /></button>
      </div>
      {!loading && !error && <p id="public-catalog-results" tabIndex={-1} className="catalog-result-count" role="status">{t('ui.catalogue.explorer.results', { count: matches.length })}</p>}
      {loading && <p role="status">{tr("ui.loading_rooms_and_equipment_e2ad6ba4")}</p>}
      {error && (
        <div className="catalog-message" role="alert">
          {translate(error)}{" "}
          <button type="button" onClick={() => setRevision((value) => value + 1)}>
            {tr("ui.retry_c58d068c")}</button>
        </div>
      )}
      {!priceView && !loading && !error && visible.length === 0 && (
        <p className="catalog-message">{tr("ui.no_resources_in_this_category_4f1d40ef")}</p>
      )}

      {/* Catalog Cards Grid */}
      <div className="rental-view-switch"><button type="button" aria-pressed={!priceView} onClick={() => setPriceView(false)}>{tr("ui.care.assets")}</button><button type="button" aria-pressed={priceView} onClick={() => setPriceView(true)}>{tr("ui.rental.pricing")}</button></div>
      {priceView && !loading && !error && <ResourceTariffTable resources={matches} onSelect={row => { const resource = resources.find(item => item.id === row.id); if (resource) void openDetails(resource); }}/>}
      <div className="catalog-grid" hidden={priceView}>
        {visible.map((row) => {
          const image = row.media?.find((item) => item.kind === "IMAGE");
          const opBadge = operationalBadgeLabels[row.operationalStatus] || {
            label: row.operationalStatus,
            class: "badge-op-other"
          };
          return (
            <article key={row.id} className="catalog-card lab-product-card" data-category={row.category} data-resource-code={row.code}>
              <div className="catalog-card-visual">
              <button
                type="button"
                className="catalog-cover"
                onClick={() => void openDetails(row)}
                aria-label={`${t("ui.view_details_f6f88b0f")}: ${row.name}`}
              >
                {image ? (
                  <ResourceMediaPreview key={image.url} kind="IMAGE" size="card" url={image.url} alt={image.altText || row.name} fallback={<ResourceCategoryArt category={row.category || undefined} />} />
                ) : (
                  <span className="catalog-placeholder">
                    <ResourceCategoryArt category={row.category || undefined} />
                    <small className="sr-only">{tr("ui.no_image_available_dcd8ffe7")}</small>
                  </span>
                )}
              </button>
              <span className="catalog-image-category">{tr(categoryLabels[row.category || ''] || 'ui.unclassified_10fe63fa')}</span>
              <div className="catalog-card-image-actions">
                <button type="button" className="btn btn-secondary" onClick={() => onViewSchedule(row.id)}><CalendarDays size={16} aria-hidden="true" />{tr('ui.catalogue.calendar')}</button>
                <button type="button" className="catalog-card-cta btn btn-primary" onClick={() => void openDetails(row)}>{tr('ui.book_a_resource_729e485c')}<ArrowRight size={16} aria-hidden="true" /></button>
              </div>
              </div>
              <div className="catalog-card-body">
                <span className="catalog-card-meta">
                  {row.code}
                </span>
                <h3><button type="button" className="catalog-card-name" onClick={() => void openDetails(row)}>{row.name}</button></h3>
                <p className="catalog-card-loc"><MapPin size={14} aria-hidden="true" />{row.laboratory?.name || row.location}</p>
                <div className="catalog-card-bottom">
                <strong className="rental-card-price">{row.rental ? new Intl.NumberFormat("vi-VN").format(row.rental.hourlyRateVnd) + " ₫ / " + tr("ui.rental.hour") : tr("ui.rental.pricePending")}</strong>
                <span title={tr('ui.current_availability_f57c5e36')}><StatusPill value={row.availability?.state || 'UNAVAILABLE'} /></span>
                </div>
                <span className="catalog-card-policy badge-approval">{row.effectiveRequiresApproval ? tr("ui.approval_required_dc95ee8f") : Number(row.rental?.hourlyRateVnd) > 0 ? tr("ui.confirmed_after_payment_2c477063") : tr("ui.automatic_a25c8028")}</span>
                {Boolean(row.trainingRequirements?.length) && <StatusBadge tone="attention" className="badge-training">{tr('ui.training_required_cf046e4c')}</StatusBadge>}
                <ExpandableCard title={tr('ui.catalogue.specifications')} icon={SlidersHorizontal} tone="teal" className="catalog-card-specifications">
                  {row.description && <p>{row.description}</p>}
                  <dl><div><dt>{tr('ui.capacity_quantity_a35ef20e')}</dt><dd>{row.capacity}</dd></div><div><dt>{tr('ui.physical_state_c30af32d')}</dt><dd><StatusPill value={row.operationalStatus} label={tr(opBadge.label)} /></dd></div></dl>
                </ExpandableCard>
              </div>
            </article>
          );
        })}
      </div>

      {!priceView && !loading && !error && matches.length > limit && <button type="button" className="public-secondary catalog-show-more" onClick={() => setLimit(value => value + 6)}>{t("ui.show_more_resources_8cf8a7b8")} ({matches.length - limit})</button>}
      </div>
      </div>
      {/* Resource Detail Section */}
      {selected && (
        <section className="catalog-detail" id="chi-tiet-tai-nguyen" aria-labelledby="catalog-detail-title">
          <div className="catalog-detail-heading">
            <div>
              <span>
                {tr(categoryLabels[selected.category || ""])} · {selected.code}
              </span>
              <h2 id="catalog-detail-title" ref={detailHeading} tabIndex={-1}>{selected.name}</h2>
              <p>{selected.laboratory?.name || selected.location}</p>
            </div>
            <button type="button" onClick={closeDetails} aria-label={tr("ui.close_details_f6d87bfc")}>
              {tr("ui.catalogue.explorer.back")}</button>
          </div>

          {detailLoading ? (
            <p role="status">{tr("ui.checking_information_and_access_requirements_72ae64fb")}</p>
          ) : detailError ? (
            <div className="catalog-message" role="alert">
              {translate(detailError)}{" "}
              <button type="button" onClick={() => void openDetails(selected, false)}>{tr("ui.retry_c58d068c")}</button>
            </div>
          ) : null}

          <nav className="resource-profile-nav" aria-label={tr('ui.catalogue.detailNavigation')}>{[['overview','ui.resourceDiscovery.overview'],['specs','ui.catalogue.specifications'],['usage','ui.usage_guide_28e5af8d']].map(([value,key]) => <button key={value} type="button" aria-pressed={detailSection===value} onClick={()=>setDetailSection(value)}>{tr(key)}</button>)}</nav>
          <div className="catalog-detail-layout">
            <div className="catalog-media-gallery">
              <div hidden={detailSection!=="overview"}><ResourceGallery key={selected.id} resourceId={selected.id} initialItems={selected.media}/></div>
              <section className="resource-detail-section" hidden={detailSection!=="specs"}><h3>{tr("ui.recorded_specifications_eeeff271")}</h3><ResourceSpecifications specs={selected.specs} /></section>
              <div hidden={detailSection!=="usage"}><ResourceUsageGuide guide={selected.specs?.usageGuide}/></div>
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

                  </div>
                );
              })()}

              <ResourcePricingSummary resourceId={selected.id}/><p className="catalog-description" hidden={detailSection!=="overview"}>
                {selected.description || tr("ui.lab_staff_maintain_the_detailed_af9d4644")}
              </p>

              <details><summary>{tr("ui.laboratory_booking_policy_37816f8d")}</summary><dl className="catalog-spec-dl">
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
                      : Number(selected.rental?.hourlyRateVnd) > 0 ? tr("ui.confirmed_after_payment_2c477063") : tr("ui.automatic_confirmation_under_policy_bfbbda9a")}
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
              </dl></details>

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

              <button
                type="button"
                className="public-primary"
                onClick={() => onViewSchedule(selected.id)}
                disabled={detailLoading || Boolean(detailError) || computeEligibility(selected).type === "danger"}
              >
                <CalendarDays size={18} aria-hidden="true" /> {currentUser ? t("ui.open_calendar_to_book_47ce166f") : tr("ui.catalog.signInToBook")}{" "}
                <ArrowRight size={17} aria-hidden="true" />
              </button>


            </div>
          </div>
              {/* Guest Quick Booking Section */}
              {onGuestBookingComplete && !detailLoading && !detailError && computeEligibility(selected).type !== "danger" && (
                <details key={selected.id} className="catalog-guest-booking" onToggle={event => { if (event.currentTarget.open) setGuestBookingOpened(true); }}>
                  <summary>{t("ui.guest.quickBooking")}</summary>
                  <p>{t("ui.verify_your_email_and_access_8a527832")}</p>
                  {guestBookingOpened && <GuestQuickBookingPanel key={selected.id} resource={selected} onComplete={onGuestBookingComplete} />}
                </details>
              )}
        </section>
      )}
    </div>
  );
}
