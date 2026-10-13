import { HelpDisclosure } from "../../base/HelpDisclosure";
import React, { useState, useId, useEffect, useRef } from "react";
import "../../../styles/incidents-workspace.css";
import { useLocale } from "../../../providers/LocaleProvider";
import { useQueuePage } from "../../../hooks/useQueuePage";
import { QueuePagination } from "../../base/QueuePagination";
import { BaseModal2026 } from "../../BaseModal2026";
import { translate } from "../../../i18n.js";
import { apiRequest } from "../../../api.js";
import { navigateApp, readRouteParams, workspacePathForTab } from "../../../workspaceRoutes.js";
import { validateIncidentDraft, validateIncidentResolution, type IncidentErrors, type IncidentField } from "../../../utils/incidentValidation";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { formatVietnamDateTime } from "../../../utils/timezone";
import {
  investigateIncident,
  reportIncident,
  resolveIncident,
  triageIncident,
} from "../../../services/incidents";
import type {
  IncidentRecord,
  IncidentSeverity,
} from "../../../types/incident";
import type { IncidentQueueSummary } from "../../../types/queue";

interface ResourceOption {
  id: string;
  code: string;
  name: string;
  operationalStatus?: string;
}

interface Props {
  user: { id?: string; role: string } | null;
  resources: ResourceOption[];
  incidents: IncidentRecord[];
  onChanged?: () => Promise<void> | void;
}

const SEVERITY_KEYS: IncidentSeverity[] = ["low", "medium", "high", "critical"];

const severityI18n: Record<IncidentSeverity, string> = {
  low: "ui.low_4e45ab86",
  medium: "ui.medium_928d4573",
  high: "ui.high_e1595bd0",
  critical: "ui.critical_9559e09a",
};

const statusI18n: Record<string, string> = {
  reported: "ui.reported_977c15d8",
  triaged: "ui.triaged_4652a509",
  assigned: "ui.assigned_5dd582ca",
  investigating: "ui.investigating_8723e350",
  resolved: "ui.resolved_6023373b",
  verified: "ui.verified_662e363d",
  closed: "ui.closed_6b919498",
};

const resourceStatusI18n: Record<string, string> = {
  AVAILABLE: "ui.available_d654065d",
  IN_USE: "ui.in_use_a07a3647",
  MAINTENANCE: "ui.under_maintenance_746ec905",
  CALIBRATION: "ui.under_calibration_779c1ea8",
  BROKEN: "ui.broken_fd69bba6",
  RETIRED: "ui.retired_910c0237",
  OFFLINE: "ui.offline_96a8bb03",
};

const OPEN_STATUSES = new Set(["reported", "triaged", "assigned", "investigating"]);

/* ── helpers ── */
function isOpen(status: string) {
  return OPEN_STATUSES.has(status);
}

function statusClass(status: string): string {
  if (status === "investigating") return "investigating";
  if (OPEN_STATUSES.has(status)) return "open";
  return "resolved";
}

/* ── SeverityBadge ── */
const SeverityBadge: React.FC<{ severity: IncidentSeverity; label: string }> = ({
  severity,
  label,
}) => (
  <span className={`incident-job-severity incident-job-severity--${severity}`}>
    {label}
  </span>
);

/* ── StatusPill ── */
const StatusPill: React.FC<{ status: string; label: string }> = ({
  status,
  label,
}) => (
  <span className={`incident-status-pill incident-status-pill--${statusClass(status)}`}>
    {label}
  </span>
);

/* ── Dossier ── */
const IncidentDossier: React.FC<{
  incident: IncidentRecord;
  userRole: string;
  busyId: string | null;
  onTriage: (id: string) => void;
  onInvestigate: (id: string) => void;
  onResolve: (incident: IncidentRecord) => void;
  tr: (k: string) => string;
}> = ({ incident, userRole, busyId, onTriage, onInvestigate, onResolve, tr }) => {
  const isStaff = ["ADMIN", "LAB_STAFF"].includes(userRole);
  const open = isOpen(incident.status);

  return (
    <div className="incident-detail" tabIndex={-1}>
      <div className="incident-detail-heading">
        <div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
            <SeverityBadge
              severity={incident.severity}
              label={tr(severityI18n[incident.severity])}
            />
            <StatusPill
              status={incident.status}
              label={tr(statusI18n[incident.status] ?? incident.status)}
            />
          </div>
          <h2>{incident.title}</h2>
          {incident.origin === "SIMULATED" && <p className="monitor-simulation-badge">{tr("ui.telemetryDetail.simulatedIncident")}</p>}
          <p>
            {incident.resource?.code
              ? `${incident.resource.code} · `
              : ""}
            {incident.resource?.name ?? tr("ui.resource_9a35ef53")}
          </p>
        </div>
        <time
          dateTime={incident.detectedAt}
          style={{ color: "var(--incident-muted)", fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums" }}
        >
          {formatVietnamDateTime(incident.detectedAt)}
        </time>
      </div>

      <div className="incident-resource">
        <Wrench size={16} />
        <div>
          <strong>
            {incident.resource?.name ?? tr("ui.resource_9a35ef53")}
          </strong>
          <span>
            {incident.resource?.code
              ? `${incident.resource.code} · `
              : ""}
            {incident.resource?.operationalStatus
              ? tr(resourceStatusI18n[incident.resource.operationalStatus] ?? "")
              : ""}
          </span>
        </div>
      </div>

      <dl className="incident-facts">
        <div>
          <dt>{tr("ui.reported_by_635a2e8b")}</dt>
          <dd>{incident.reportedBy?.fullName || "—"}</dd>
        </div>
        <div>
          <dt>{tr("ui.assigned_to_02be53a1")}</dt>
          <dd>{incident.assignedTo?.fullName || tr("ui.unassigned_1f379993")}</dd>
        </div>
        <div>
          <dt>{tr("ui.incident_category_293fddf9")}</dt>
          <dd>{incident.category || "—"}</dd>
        </div>
        <div>
          <dt>{tr("ui.incident.bookingId")}</dt>
          <dd>{incident.bookingId || "—"}</dd>
        </div>
      </dl>

      <div className="incident-description">
        <h3>{tr("ui.description_9eca256d")}</h3>
        <p>{incident.description}</p>
      </div>

      {incident.resolution && (
        <div className="incident-resolution">
          <h3>{tr("ui.resolution_4677c393")}</h3>
          <p>{incident.resolution}</p>
        </div>
      )}

      {isStaff && open && (
        <div className="incident-detail-actions">
          {incident.status === "reported" && (
            <button
              className="secondary-button"
              type="button"
              disabled={busyId !== null}
              onClick={() => onTriage(incident.id)}
            >
              {tr("ui.classification_a077263e")}
            </button>
          )}
          {["triaged", "assigned"].includes(incident.status) && (
            <button
              className="secondary-button"
              type="button"
              disabled={busyId !== null}
              onClick={() => onInvestigate(incident.id)}
            >
              {tr("ui.start_investigation_f9b7e9ae")}
            </button>
          )}
          <button
            className="primary-button"
            type="button"
            disabled={busyId !== null}
            onClick={() => onResolve(incident)}
          >
            {tr("ui.confirm_resolution_df20cec5")}
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Get started placeholder ── */
const GetStarted: React.FC<{ tr: (k: string) => string }> = ({ tr }) => (
  <div className="incident-detail">
    <div className="incident-get-started">
      <ClipboardList size={32} />
      <h2>{tr("ui.incident.select")}</h2>
      <p>{tr("ui.incident.selectHint")}</p>
      <ol>
        <li>{tr("ui.incident.readDetails")}</li>
        <li>{tr("ui.incident.allowedAction")}</li>
        <li>{tr("ui.incident.recordResolution")}</li>
      </ol>
    </div>
  </div>
);

/* ── Main component ── */
export const IncidentManagementView: React.FC<Props> = ({
  user,
  resources,
  onChanged,
}) => {
  const { tr } = useLocale();
  const formId = useId();
  const resolveId = useId();

  const initialFilter = () => { const value = readRouteParams().get("filter"); return value === "OPEN" || value === "RESOLVED" ? value : "ALL"; };
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "RESOLVED">(initialFilter);
  const [search, setSearch] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [resolving, setResolving] = useState<IncidentRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => readRouteParams().get("incident"));
  const [detail, setDetail] = useState<IncidentRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailRevision, setDetailRevision] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);
  const focusDetail = useRef(false);
  const requestBusy = useRef(false);
  const [fieldErrors, setFieldErrors] = useState<IncidentErrors>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [serverError, setServerError] = useState("");
  const [formError, setFormError] = useState("");

  // Preserve draft form across show/hide and locale switch
  const [formDraft, setFormDraft] = useState({
    resourceId: "",
    severity: "medium" as IncidentSeverity,
    category: "",
    title: "",
    description: "",
  });

  const [resolutionDraft, setResolutionDraft] = useState("");

  const queue = useQueuePage<IncidentRecord, IncidentQueueSummary>(
    "/incidents",
    filter,
    `${user?.id}:${user?.role}`
  );

  // Filter by search text client-side
  const filtered = queue.items.filter((inc) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      inc.title.toLowerCase().includes(q) ||
      inc.description.toLowerCase().includes(q) ||
      inc.resource?.name?.toLowerCase().includes(q) ||
      inc.resource?.code?.toLowerCase().includes(q) ||
      inc.category?.toLowerCase().includes(q)
    );
  });

  const selected = !detailLoading && detail?.id === selectedId ? detail : null;
  useEffect(() => {
    const syncRoute = () => { setFilter(initialFilter()); setSelectedId(readRouteParams().get("incident")); };
    window.addEventListener("popstate", syncRoute);
    window.addEventListener("lrm:route-change", syncRoute);
    return () => { window.removeEventListener("popstate", syncRoute); window.removeEventListener("lrm:route-change", syncRoute); };
  }, []);
  useEffect(() => {
    setDetail(null); setDetailError("");
    if (!selectedId) { setDetailLoading(false); return; }
    const controller = new AbortController();
    setDetailLoading(true);
    void apiRequest('/incidents/' + encodeURIComponent(selectedId), {signal: controller.signal})
      .then((record: IncidentRecord) => { if (!controller.signal.aborted) setDetail(record); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setDetailError(error instanceof Error ? error.message : 'api.API_REQUEST_FAILED'); })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selectedId, detailRevision, user?.id, user?.role]);
  useEffect(() => {
    if (!detailLoading && selectedId && focusDetail.current && (selected || detailError)) {
      focusDetail.current = false;
      detailRef.current?.focus({preventScroll: true});
      if (window.matchMedia('(max-width: 999px)').matches) detailRef.current?.scrollIntoView({block:'start'});
    }
  }, [selected, selectedId, detailError, detailLoading]);
  function setSelection(id: string | null) {
    if (requestBusy.current) return;
    const previous = selectedId;
    setSelectedId(id); focusDetail.current = Boolean(id);
    const params = readRouteParams();
    if (id) params.set('incident', id); else params.delete('incident');
    navigateApp(workspacePathForTab('incidents', params), {notify:false});
    if (!id) window.requestAnimationFrame(() => {
      const row = document.querySelector<HTMLButtonElement>('[data-incident-id="' + CSS.escape(previous || '') + '"]');
      (row || document.querySelector<HTMLButtonElement>('.incident-filter [aria-pressed="true"]'))?.focus();
    });
  }
  function chooseFilter(value: "ALL" | "OPEN" | "RESOLVED") {
    if (requestBusy.current) return;
    setFilter(value);
    const params = readRouteParams(); params.set('filter',value);
    navigateApp(workspacePathForTab('incidents', params), {notify:false});
  }
  const inputIds: Record<IncidentField,string> = {resourceId:'inc-resource',severity:'inc-severity',category:'inc-category',title:'inc-title',description:'inc-description',resolution:'inc-resolution'};
  function showValidation(errors: IncidentErrors) {
    setFieldErrors(errors);
    const first = Object.keys(errors)[0] as IncidentField | undefined;
    if (first) window.requestAnimationFrame(() => document.getElementById(inputIds[first])?.focus());
  }
  function fieldError(field: IncidentField) {
    return fieldErrors[field] ? <small className="incident-field-error" id={inputIds[field]+'-error'}>{tr(fieldErrors[field]!)}</small> : null;
  }
  function errorSummary() {
    return Object.keys(fieldErrors).length ? <div role="alert" className="incident-alert"><strong>{tr('ui.incident.formSummary')}</strong><ul>{Object.entries(fieldErrors).map(([field,key]) => <li key={field}><a href={'#'+inputIds[field as IncidentField]} onClick={event => {event.preventDefault();document.getElementById(inputIds[field as IncidentField])?.focus();}}>{tr(key!)}</a></li>)}</ul></div> : null;
  }

  async function refresh() {
    queue.refresh();
    setDetailRevision(value => value + 1);
    await onChanged?.();
  }

  async function runAction(id: string, action: "triage" | "investigate") {
    if (requestBusy.current) return;
    requestBusy.current = true;
    setServerError("");
    try {
      setBusyId(id);
      if (action === "triage") await triageIncident(id);
      else await investigateIncident(id);
      await refresh();
    } catch (e: unknown) {
      setServerError(
        (e as { message?: string })?.message ||
          "ui.could_not_update_incident_26d8044a"
      );
    } finally {
      requestBusy.current = false;
      setBusyId(null);
    }
  }

  function openResolve(incident: IncidentRecord) {
    if (requestBusy.current) return;
    setFormError(""); setFieldErrors({});
    if (resolving?.id !== incident.id) setResolutionDraft("");
    setResolving(incident);
  }

  async function submitReport(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");

    if (requestBusy.current) return;
    const result = validateIncidentDraft(formDraft, resources.map(resource => resource.id));
    showValidation(result.errors);
    if (!result.data) return;
    requestBusy.current = true;
    try {
      setBusyId("create");
      await reportIncident(result.data);
      setShowReport(false);
      setFormDraft((prev) => ({ ...prev, title: "", description: "" }));
      await refresh();
    } catch (e: unknown) {
      setFormError(
        (e as { message?: string })?.message ||
          "ui.could_not_submit_incident_report_cb6bca65"
      );
    } finally {
      requestBusy.current = false;
      setBusyId(null);
    }
  }

  async function submitResolution(event: React.FormEvent) {
    event.preventDefault();
    if (!resolving) return;
    setFormError("");

    if (requestBusy.current) return;
    const result = validateIncidentResolution(resolutionDraft);
    showValidation(result.error ? {resolution:result.error} : {});
    if (result.error) return;
    requestBusy.current = true;
    try {
      setBusyId(resolving.id);
      await resolveIncident(resolving.id, result.resolution);
      setResolving(null);
      setResolutionDraft("");
      await refresh();
    } catch (e: unknown) {
      setFormError(
        (e as { message?: string })?.message ||
          "ui.could_not_complete_incident_resolution_d17cb3c0"
      );
    } finally {
      requestBusy.current = false;
      setBusyId(null);
    }
  }

  function openReport() {
    if (requestBusy.current) return;
    setFormError(""); setFieldErrors({});
    setShowReport(true);
  }

  const summary = queue.data?.summary;
  const queueCount = filtered.length;

  return (
    <div className="incidents-workspace">
      {/* ── Page header ── */}
      <div className="incident-heading">
        <div className="incident-heading-text">
          <h1>{tr("ui.resource_incidents_0cba217b")}</h1>
          <HelpDisclosure>{tr("ui.report_observed_problems_lab_staff_c71e9e68")}</HelpDisclosure>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={openReport}
          disabled={!user || busyId !== null}
        >
          <Plus size={16} />
          {tr("ui.report_an_incident_0527866e")}
        </button>
      </div>

      {/* ── Error banner ── */}
      {(serverError || queue.error) && (
        <div role="alert" className="incident-alert" tabIndex={0}>
          {translate(serverError || queue.error)}
        </div>
      )}

      {/* Compact queue totals from the actual scoped response. */}
      {summary && (
        <div className="incident-summary-grid">
          <div className="incident-summary-card">
            <span>
              <ShieldAlert size={14} />
              {tr("ui.total_incidents_4c1b245c")}
            </span>
            <strong>{summary.total ?? "—"}</strong>
          </div>
          <div className="incident-summary-card">
            <span>
              <AlertTriangle size={14} />
              {tr("ui.processing_e84898db")}
            </span>
            <strong>{summary.open ?? "—"}</strong>
          </div>
          <div className="incident-summary-card">
            <span>
              <CheckCircle2 size={14} />
              {tr("ui.resolved_1c5b11f2")}
            </span>
            <strong>{summary.resolved ?? "—"}</strong>
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="incident-toolbar">
        <div className="incident-search" role="search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            placeholder={tr("ui.incident.searchPage")}
            disabled={busyId !== null}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={tr("ui.incident.searchPage")}
          />
        </div>

        <div className="incident-filter" role="group" aria-label={tr("ui.filter_incidents_695f1591")}>
          {(["ALL", "OPEN", "RESOLVED"] as const).map((val) => (
            <button
              key={val}
              type="button"
              className={filter === val ? "primary-button" : "secondary-button"}
              aria-pressed={filter === val}
              onClick={() => chooseFilter(val)}
              disabled={busyId !== null}
            >
              {val === "ALL"
                ? tr("ui.all_49c73a31")
                : val === "OPEN"
                ? tr("ui.open_incidents_a8d69cb9")
                : tr("ui.resolved_1c5b11f2")}
            </button>
          ))}
          <button
            className="secondary-button"
            type="button"
            onClick={() => { queue.refresh(); setDetailRevision(value => value + 1); }}
            disabled={queue.loading || busyId !== null}
            aria-label={tr("ui.refresh_b4c61340")}
          >
            <RefreshCw size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="incident-columns">
        {/* Queue list */}
        <div className="incident-queue">
          <div className="incident-queue-heading">
            <h2>{tr("ui.incident.queue")}</h2>
            <p>
              {queue.loading
                ? tr("ui.loading_data_84c68bd5")
                : tr("ui.incident.pageCount", {shown:queueCount, page:queue.items.length, total:queue.pagination?.total ?? 0})}
            </p>
          </div>

          {queue.loading ? (
            <div className="incident-empty">
              <p role="status">{tr("ui.loading_data_84c68bd5")}</p>
            </div>
          ) : queue.error ? (
            <div className="incident-empty">
              <AlertTriangle size={28} />
              <p>{translate(queue.error)}</p>
              <button
                className="secondary-button"
                type="button"
                onClick={() => queue.refresh()}
              >
                {tr("ui.retry_c58d068c")}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="incident-empty">
              <CheckCircle2 size={28} />
              <h3>{tr("ui.no_incidents_match_the_current_e09d6f91")}</h3>
              <p>{tr("ui.incident.emptyHint")}</p>
            </div>
          ) : (
            <ul className="incident-job-list" aria-label={tr("ui.incident.queue")}>
              {filtered.map((incident) => (
                <li key={incident.id}>
                  <button
                    type="button"
                    className="incident-job"
                    aria-pressed={selectedId === incident.id}
                    data-incident-id={incident.id}
                    disabled={busyId !== null}
                    onClick={() => setSelection(incident.id)}
                  >
                    <SeverityBadge
                      severity={incident.severity}
                      label={tr(severityI18n[incident.severity])}
                    />
                    <span className="incident-job-title">{incident.title}{incident.origin === "SIMULATED" && <small> · {tr("ui.telemetryDetail.simulated")}</small>}</span>
                    <span className="incident-job-resource">
                      {incident.resource?.code
                        ? `${incident.resource.code} · `
                        : ""}
                      {incident.resource?.name ?? tr("ui.resource_9a35ef53")}
                    </span>
                    <span className="incident-job-time">
                      <time dateTime={incident.detectedAt}>
                        {formatVietnamDateTime(incident.detectedAt)}
                      </time>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* The dossier is separate from the paginated queue. */}
        <div ref={detailRef} tabIndex={-1} aria-busy={detailLoading} className="incident-dossier-host">
          {selectedId && <button className="secondary-button" type="button" disabled={busyId !== null} onClick={() => setSelection(null)}>{tr('core.actions.close')}</button>}
          {detailLoading ? <div className="incident-detail"><p role="status">{tr('ui.loading_data_84c68bd5')}</p></div> : detailError ? <div className="incident-detail"><p role="alert">{translate(detailError)}</p><button className="secondary-button" type="button" onClick={() => setDetailRevision(value => value + 1)}>{tr('ui.retry_c58d068c')}</button></div> : selected ? (
            <IncidentDossier incident={selected} userRole={user?.role ?? ''} busyId={busyId} onTriage={id => runAction(id,'triage')} onInvestigate={id => runAction(id,'investigate')} onResolve={openResolve} tr={tr} />
          ) : <GetStarted tr={tr} />}
        </div>
      </div>

      {/* Pagination */}
      {queue.pagination && (
        <QueuePagination
          pagination={queue.pagination}
          onPage={queue.setPage}
          disabled={queue.loading || busyId !== null}
        />
      )}

      {/* ── Report modal ── */}
      <BaseModal2026
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        title={tr("ui.report_an_incident_0527866e")}
        icon={ShieldAlert}
        dismissible={busyId !== "create"}
      >
        <form
          id={formId}
          className="incident-form-section"
          onSubmit={submitReport}
          noValidate
        >
          {errorSummary()}
          {formError && (
            <div role="alert" tabIndex={-1} ref={node => { if(node) queueMicrotask(() => node.focus()); }} className="incident-alert" style={{ marginBottom: "16px" }}>
              {translate(formError)}
            </div>
          )}

          <div className="incident-fields">
            <div className="incident-field">
              <label htmlFor="inc-resource">
                {tr("ui.resource_9a35ef53")}
                <select
                  id="inc-resource"
                  aria-invalid={Boolean(fieldErrors.resourceId)}
                  aria-describedby={fieldErrors.resourceId ? "inc-resource-error" : undefined}
                  value={formDraft.resourceId}
                  onChange={(e) =>
                    setFormDraft((prev) => ({
                      ...prev,
                      resourceId: e.target.value,
                    }))
                  }
                  disabled={busyId === "create"}
                  required
                >
                  <option value="">{tr("ui.select_a_resource_8849f4e1")}</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} — {r.name}
                    </option>
                  ))}
                </select>
              {fieldError("resourceId")}
              </label>
            </div>

            <div className="incident-field">
              <label htmlFor="inc-severity">
                {tr("ui.severity_9709dbac")}
                <select
                  id="inc-severity"
                  aria-invalid={Boolean(fieldErrors.severity)}
                  aria-describedby={fieldErrors.severity ? "inc-severity-error" : undefined}
                  value={formDraft.severity}
                  onChange={(e) =>
                    setFormDraft((prev) => ({
                      ...prev,
                      severity: e.target.value as IncidentSeverity,
                    }))
                  }
                  disabled={busyId === "create"}
                >
                  {SEVERITY_KEYS.map((sev) => (
                    <option key={sev} value={sev}>
                      {tr(severityI18n[sev])}
                    </option>
                  ))}
                </select>
              {fieldError("severity")}
              </label>
            </div>

            <div className="incident-field">
              <label htmlFor="inc-category">
                {tr("ui.incident_category_293fddf9")}
                <input
                  id="inc-category"
                  aria-invalid={Boolean(fieldErrors.category)}
                  aria-describedby={fieldErrors.category ? "inc-category-error" : undefined}
                  type="text"
                  value={formDraft.category}
                  onChange={(e) =>
                    setFormDraft((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  maxLength={100}
                  disabled={busyId === "create"}
                />
                <small>{tr("ui.incident.categoryHint")}</small>
              {fieldError("category")}
              </label>
            </div>
          </div>

          <div className="incident-field" style={{ marginTop: "16px" }}>
            <label htmlFor="inc-title">
              {tr("ui.title_df5a0009")}
              <input
                id="inc-title"
                  aria-invalid={Boolean(fieldErrors.title)}
                  aria-describedby={fieldErrors.title ? "inc-title-error" : undefined}
                type="text"
                value={formDraft.title}
                onChange={(e) =>
                  setFormDraft((prev) => ({ ...prev, title: e.target.value }))
                }
                maxLength={255}
                minLength={3}
                required
                disabled={busyId === "create"}
              />
              <small>
                {formDraft.title.trim().length}/255 · {tr("ui.incident.minimum")}
              </small>
            {fieldError("title")}
              </label>
          </div>

          <div className="incident-field" style={{ marginTop: "16px" }}>
            <label htmlFor="inc-description">
              {tr("ui.observed_problem_bc874db6")}
              <textarea
                id="inc-description"
                  aria-invalid={Boolean(fieldErrors.description)}
                  aria-describedby={fieldErrors.description ? "inc-description-error" : undefined}
                value={formDraft.description}
                onChange={(e) =>
                  setFormDraft((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={5}
                maxLength={4000}
                minLength={3}
                required
                disabled={busyId === "create"}
              />
              <small>
                {formDraft.description.trim().length}/4000 ·{" "}
                {tr("ui.incident.minimum")}
              </small>
            {fieldError("description")}
              </label>
          </div>

          <div className="incident-form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setShowReport(false)}
              disabled={busyId === "create"}
            >
              {tr("ui.cancel_74fcd352")}
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={busyId === "create"}
            >
              {busyId === "create"
                ? tr("ui.submitting_abf01d43")
                : tr("ui.submit_report_2c993a8a")}
            </button>
          </div>
        </form>
      </BaseModal2026>

      {/* ── Resolve modal ── */}
      <BaseModal2026
        isOpen={Boolean(resolving)}
        onClose={() => setResolving(null)}
        title={tr("ui.confirm_incident_resolution_def9ce3f")}
        icon={AlertTriangle}
        dismissible={busyId !== resolving?.id}
      >
        {resolving && (
          <form
            id={resolveId}
            onSubmit={submitResolution}
            noValidate
          >
            {errorSummary()}
            {formError && (
              <div role="alert" tabIndex={-1} ref={node => { if(node) queueMicrotask(() => node.focus()); }} className="incident-alert" style={{ marginBottom: "16px" }}>
                {translate(formError)}
              </div>
            )}

            <p
              style={{
                marginBottom: "16px",
                fontWeight: 600,
                color: "var(--incident-ink)",
              }}
            >
              {resolving.title}
            </p>

            <div className="incident-field">
              <label htmlFor="inc-resolution">
                {tr("ui.actual_resolution_outcome_11cccb6a")}
                <textarea
                  id="inc-resolution"
                  aria-invalid={Boolean(fieldErrors.resolution)}
                  aria-describedby={fieldErrors.resolution ? "inc-resolution-error" : undefined}
                  value={resolutionDraft}
                  onChange={(e) => setResolutionDraft(e.target.value)}
                  rows={5}
                  maxLength={4000}
                  minLength={3}
                  required
                  disabled={busyId === resolving.id}
                />
                <small>
                  {resolutionDraft.trim().length}/4000 ·{" "}
                  {tr("ui.incident.minimum")}
                </small>
              {fieldError("resolution")}
              </label>
            </div>

            <div className="incident-form-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setResolving(null)}
                disabled={busyId === resolving.id}
              >
                {tr("ui.cancel_74fcd352")}
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={busyId === resolving.id}
              >
                {busyId === resolving.id
                  ? tr("ui.saving_2b5c2a46")
                  : tr("ui.save_resolution_f867848a")}
              </button>
            </div>
          </form>
        )}
      </BaseModal2026>
    </div>
  );
};
