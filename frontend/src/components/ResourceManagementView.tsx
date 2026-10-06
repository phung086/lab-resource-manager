import type { LocaleMessage } from "../providers/LocaleProvider";
import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Edit3,
  Eye,
  FilterX,
  Plus,
  RefreshCw,
  Search,
  Server,
  DoorOpen,
  Microscope,
  FlaskConical,
  Package,
  Wrench
} from "lucide-react";

import { apiRequest } from "../api.js";
import { ResourceDetailsModal } from "./ResourceDetailsModal.tsx";
import { ResourceMediaPreview } from "./ResourceMediaPreview";
import { ResourceMediaEditor } from "./ResourceMediaEditor.tsx";
import { ResourceStatusModal } from "./ResourceStatusModal.tsx";

const categories = ["ROOM", "EQUIPMENT", "MACHINE", "EXPERIMENT_KIT", "MATERIAL"];
const subtypes = ["ROOM", "GPU_SERVER", "RASPBERRY_PI", "UAV", "CAMERA", "KIT", "MATERIAL", "OTHER"];
const operationalStatuses = ["AVAILABLE", "IN_USE", "MAINTENANCE", "CALIBRATION", "BROKEN", "RETIRED", "OFFLINE"];

const categoryLabels: Record<string, string> = {
  ROOM: "ui.room_6aec2ab4",
  EQUIPMENT: "ui.resources_eb706979",
  MACHINE: "ui.machine_1d4b86ad",
  EXPERIMENT_KIT: "ui.experiment_kit_0acb51cf",
  MATERIAL: "ui.material_23ab10cc"
};
const statusLabels: Record<string, string> = {
  AVAILABLE: "ui.available_d654065d",
  IN_USE: "ui.in_use_a07a3647",
  MAINTENANCE: "ui.maintenance_8ad424bd",
  CALIBRATION: "ui.calibration_a71e17c8",
  BROKEN: "ui.broken_fd69bba6",
  RETIRED: "ui.retired_910c0237",
  OFFLINE: "ui.offline_96a8bb03",
  RESERVED: "ui.reserved_837420a4",
  RESTRICTED: "ui.restricted_booking_1e5b50c0",
  UNAVAILABLE: "ui.unavailable_567f82dd"
};

interface UserIdentity {
  id: string;
  role: "ADMIN" | "LAB_STAFF" | "LECTURER" | "STUDENT";
}

interface ResourceManagementViewProps {
  user: UserIdentity;
  managementMode?: boolean;
  initialSearch?: string;
  initialCategory?: string;
  initialClassification?: string;
  onViewCalendar?: (resourceId: string) => void;
}

interface Filters {
  search: string;
  laboratoryId: string;
  category: string;
  subtype: string;
  operationalStatus: string;
  classification: string;
  availability: string;
}

const initialFilters: Filters = {
  search: "",
  laboratoryId: "",
  category: "",
  subtype: "",
  operationalStatus: "",
  availability: "",
  classification: "ALL"
};

const emptyForm = {
  code: "",
  name: "",
  description: "",
  laboratoryId: "",
  category: "",
  subtype: "OTHER",
  bookingState: "bookable",
  location: "",
  ownerTeam: "",
  capacity: "1",
  requiresApproval: false,
  manufacturer: "",
  model: "",
  beforeUse: "", steps: "", afterUse: "", safetyNotes: ""
};

export const ResourceManagementView: React.FC<ResourceManagementViewProps> = ({ user, managementMode = false, initialSearch = "", initialCategory = "", initialClassification = "ALL", onViewCalendar }) => {
  const { tr, t } = useLocale();
  const [resources, setResources] = useState<any[]>([]);
  const [laboratories, setLaboratories] = useState<any[]>([]);
  const [filters, setFilters] = useState<Filters>({ ...initialFilters, search: initialSearch.slice(0, 120), category: categories.includes(initialCategory) ? initialCategory : "", classification: initialClassification === "UNRESOLVED" ? "UNRESOLVED" : "ALL" });
  const [sort, setSort] = useState("name");
  const requestVersion = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<LocaleMessage>("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const detailOpener = useRef<HTMLElement | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const detailRequest = useRef(0);
  useEffect(() => () => { detailRequest.current += 1; }, []);
  const [detailLoadingId, setDetailLoadingId] = useState("");
  const [detailError, setDetailError] = useState("");
  const [statusResource, setStatusResource] = useState<any | null>(null);
  const [retireResource, setRetireResource] = useState<any | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const canManage = ["ADMIN", "LAB_STAFF"].includes(user.role);
  const assignedLabIds = useMemo(() => new Set(laboratories.map((lab) => lab.id)), [laboratories]);

  function queryString() {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value && !(key === "classification" && value === "ALL")) params.set(key, String(value));
    }
    return params.toString();
  }

  async function loadResources() {
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    try {
      const query = queryString();
      const result = await apiRequest(`/resources${query ? `?${query}` : ""}`);
      if (version === requestVersion.current) setResources(result);
    } catch (requestError: any) {
      if (version === requestVersion.current) setError(requestError?.message || "ui.could_not_load_resource_catalogue_0a0a445c");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }

  useEffect(() => {
    apiRequest("/laboratories")
      .then(setLaboratories)
      .catch((requestError) => setError(requestError?.message || "ui.could_not_load_laboratories_0b0c0da9"));
  }, [user.id, tr]);

  useEffect(() => {
    const timer = window.setTimeout(loadResources, filters.search ? 250 : 0);
    return () => { window.clearTimeout(timer); requestVersion.current += 1; };
  }, [filters.search, filters.laboratoryId, filters.category, filters.subtype, filters.operationalStatus, filters.classification, filters.availability]);

  const visibleResources = [...resources].sort((a, b) => String(sort === "code" ? a.code : a.name).localeCompare(String(sort === "code" ? b.code : b.name), "vi"));

  function canManageResource(resource: any) {
    return user.role === "ADMIN" || (Boolean(resource.laboratoryId) && assignedLabIds.has(resource.laboratoryId));
  }

  function resetForm() {
    setForm({ ...emptyForm, laboratoryId: laboratories.length === 1 ? laboratories[0].id : "" });
    setEditing(null);
    setFormError("");
    setShowForm(false);
  }

  function startCreate() {
    setEditing(null);
    setForm({ ...emptyForm, laboratoryId: laboratories.length === 1 ? laboratories[0].id : "" });
    setFormError("");
    setShowForm(true);
  }

  function startEdit(resource: any) {
    setEditing(resource);
    setForm({
      code: resource.code || "",
      name: resource.name || "",
      description: resource.description || "",
      laboratoryId: resource.laboratoryId || "",
      category: resource.category || "",
      subtype: resource.subtype || "OTHER",
      bookingState: resource.bookingState || "bookable",
      location: resource.location || "",
      ownerTeam: resource.ownerTeam || "",
      capacity: String(resource.capacity || 1),
      requiresApproval: Boolean(resource.requiresApproval),
      manufacturer: resource.manufacturer || "",
      model: resource.model || "",
      beforeUse: (resource.specs?.usageGuide?.beforeUse || []).join("\n"),
      steps: (resource.specs?.usageGuide?.steps || []).join("\n"),
      afterUse: (resource.specs?.usageGuide?.afterUse || []).join("\n"),
      safetyNotes: resource.specs?.usageGuide?.safetyNotes || ""
    });
    setFormError("");
    setShowForm(true);
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError("");
    setNotice("");
    const payload: any = {
      code: form.code,
      name: form.name,
      description: form.description || null,
      laboratoryId: form.laboratoryId,
      category: form.category || null,
      subtype: form.subtype,
      bookingState: form.bookingState,
      location: form.location,
      ownerTeam: form.ownerTeam,
      capacity: Number(form.capacity),
      requiresApproval: form.requiresApproval,
      manufacturer: form.manufacturer || null,
      model: form.model || null,
      specs: {
        ...(editing?.specs || {}),
        usageGuide: {
          beforeUse: form.beforeUse.split(/\r?\n/).map(line => line.trim()).filter(Boolean),
          steps: form.steps.split(/\r?\n/).map(line => line.trim()).filter(Boolean),
          afterUse: form.afterUse.split(/\r?\n/).map(line => line.trim()).filter(Boolean),
          safetyNotes: form.safetyNotes.trim()
        }
      }
    };
    try {
      if (editing) {
        payload.changeReason = tr("ui.resource_record_updated_through_administration_0dc1c90d");
        await apiRequest(`/resources/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setNotice({ key: "ui.changes_saved_for_c41dcbb4", params: { value0: form.code } });
      } else {
        await apiRequest("/resources", { method: "POST", body: JSON.stringify(payload) });
        setNotice({ key: "ui.resource_created_42b7d4dd", params: { value0: form.code } });
      }
      resetForm();
      await loadResources();
    } catch (requestError: any) {
      setFormError(requestError?.message || "ui.could_not_save_resource_e6637acf");
      window.setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(resource: any) {
    const request = ++detailRequest.current;
    detailOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDetailLoadingId(resource.id);
    setDetailError("");
    try {
      const [record, schedule] = await Promise.all([
        apiRequest(`/resources/${resource.id}`),
        apiRequest(`/resources/${resource.id}/schedule`)
      ]);
      if (request !== detailRequest.current) return;
      setDetail({ ...record, schedule });
    } catch (requestError: any) {
      if (request === detailRequest.current) setDetailError(requestError?.message || "ui.could_not_load_resource_details_4c2dba0d");
    } finally {
      if (request === detailRequest.current) setDetailLoadingId("");
    }
  }

  function closeDetail() {
    setDetail(null);
    requestAnimationFrame(() => {
      if (detailOpener.current?.isConnected) detailOpener.current.focus();
    });
  }

  async function updateStatus(targetStatus: string, reason: string) {
    if (!statusResource) return;
    await apiRequest(`/resources/${statusResource.id}/operational-status`, {
      method: "PATCH",
      body: JSON.stringify({ operationalStatus: targetStatus, reason: reason || null })
    });
    setNotice({ key: "ui.status_updated_for_4c792773", params: { value0: statusResource.code } });
    setStatusResource(null);
    await loadResources();
  }

  async function retire(reason: string) {
    if (!retireResource) return;
    await apiRequest(`/resources/${retireResource.id}/retire`, { method: "POST", body: JSON.stringify({ reason }) });
    setNotice({ key: "ui.resource_retired_its_history_is_ff39f226", params: { value0: retireResource.code } });
    setRetireResource(null);
    await loadResources();
  }

  return (
    <div className="content-stack resource-management-view">
      {detailError && <div className="alert danger resource-detail-error" role="alert">{tr(detailError)}</div>}
      <section className="panel resource-catalog-header">
        <div className="panel-heading">
          <div className="panel-title"><Server aria-hidden="true" /><h2>{managementMode ? tr("ui.resource_management_44713fdd") : tr("ui.laboratory_resource_catalogue_84d37caf")}</h2></div>
          <div className="resource-header-actions">
            <button type="button" className="secondary-button" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={() => setFiltersOpen(!filtersOpen)}>{tr("refine.searchFilters")}{Object.entries(filters).filter(([key, value]) => value !== initialFilters[key as keyof typeof initialFilters]).length > 0 && <span className="filter-count">{Object.entries(filters).filter(([key, value]) => value !== initialFilters[key as keyof typeof initialFilters]).length}</span>}</button>
            <button type="button" className="secondary-button" onClick={loadResources} disabled={loading}>
              <RefreshCw size={16} aria-hidden="true" /><span>{tr("ui.refresh_b4c61340")}</span>
            </button>
            {managementMode && canManage && (
              <button type="button" className="primary-button" onClick={startCreate}>
                <Plus size={16} aria-hidden="true" /><span>{tr("ui.add_resource_f1609e2a")}</span>
              </button>
            )}
          </div>
        </div>

        <div id="catalog-filters" hidden={!filtersOpen} className="resource-filter-grid" aria-label={tr("ui.resource_filters_08961fcd")}>
          <label className="resource-search-field">
            <span>{tr("ui.search_87ae432c")}</span>
            <span className="search-box"><Search size={17} aria-hidden="true" /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder={tr("ui.code_name_location_or_laboratory_30a6bca0")} /></span>
          </label>
          <label><span id="resource-filter-laboratoryId-label">{tr("ui.laboratory_eb85976f")}</span><select aria-labelledby="resource-filter-laboratoryId-label" value={filters.laboratoryId} onChange={(event) => setFilters({ ...filters, laboratoryId: event.target.value })}><option value="">{tr("ui.all_49c73a31")}</option>{laboratories.map((lab) => <option key={lab.id} value={lab.id}>{lab.code} - {lab.name}</option>)}</select></label>
          <label><span id="resource-filter-category-label">{tr("ui.resource_category_5fc170bb")}</span><select aria-labelledby="resource-filter-category-label" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value, classification: "ALL" })}><option value="">{tr("ui.all_49c73a31")}</option>{categories.map((value) => <option key={value} value={value}>{tr(categoryLabels[value])}</option>)}</select></label>
          <label><span id="resource-filter-classification-label">{tr("ui.classification_a077263e")}</span><select aria-labelledby="resource-filter-classification-label" value={filters.classification} onChange={(event) => setFilters({ ...filters, classification: event.target.value, category: "" })}><option value="ALL">{tr("ui.all_49c73a31")}</option><option value="UNRESOLVED">{tr("ui.unclassified_10fe63fa")}</option></select></label>
          <label><span id="resource-filter-subtype-label">{tr("ui.technical_subtype_f4ef03ac")}</span><select aria-labelledby="resource-filter-subtype-label" value={filters.subtype} onChange={(event) => setFilters({ ...filters, subtype: event.target.value })}><option value="">{tr("ui.all_49c73a31")}</option>{subtypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><span id="resource-filter-operationalStatus-label">{tr("ui.physical_status_e07deca7")}</span><select aria-labelledby="resource-filter-operationalStatus-label" value={filters.operationalStatus} onChange={(event) => setFilters({ ...filters, operationalStatus: event.target.value })}><option value="">{tr("ui.all_49c73a31")}</option>{operationalStatuses.map((value) => <option key={value} value={value}>{tr(statusLabels[value])}</option>)}</select></label>
          <button type="button" className="secondary-button resource-clear-filters" disabled={JSON.stringify(filters) === JSON.stringify(initialFilters)} onClick={() => setFilters(initialFilters)}>
            <FilterX size={16} aria-hidden="true" /><span>{tr("ui.clear_filters_f8f509b1")}</span>
          </button>
          <label><span id="resource-filter-availability-label">{tr("ui.current_availability_f57c5e36")}</span><select aria-labelledby="resource-filter-availability-label" value={filters.availability} onChange={event => setFilters({ ...filters, availability: event.target.value })}><option value="">{tr("ui.all_49c73a31")}</option><option value="AVAILABLE">{tr("ui.available_now_d746228e")}</option><option value="RESERVED">{tr("ui.currently_reserved_d9123964")}</option><option value="UNAVAILABLE">{tr("ui.unavailable_567f82dd")}</option></select></label>
        </div>
        <div className="catalog-results-bar"><span role="status">{loading ? tr("ui.searching_resources_5efc267e") : error ? tr("ui.could_not_load_results_e4fd179f") : translate("ui.matching_resources_f3d67a97", { value0: resources.length })}</span><label>{tr("ui.sort_by_4dc94c53")}<select value={sort} onChange={event => setSort(event.target.value)}><option value="name">{tr("ui.resource_name_69dcb475")}</option><option value="code">{tr("ui.resource_code_e0983eab")}</option></select></label></div>
        {!filtersOpen && JSON.stringify(filters) !== JSON.stringify(initialFilters) && <button type="button" className="table-action" onClick={() => setFilters(initialFilters)}>{tr("ui.clear_filters_f8f509b1")}</button>}
      </section>

      {error && <div className="alert danger" role="alert">{translate(error)}</div>}
      {notice && <div className="alert success" role="status">{translate(notice)}</div>}

      {managementMode && canManage && <ResourceMediaEditor resources={resources} />}
      {managementMode && showForm && (
        <section className="panel resource-editor" aria-labelledby="resource-editor-title">
          <div className="panel-title"><Edit3 aria-hidden="true" /><h2 id="resource-editor-title">{editing ? translate("ui.edit_c0c536ca", { value0: editing.code }) : tr("ui.create_resource_08170666")}</h2></div>
          {formError && <div ref={errorRef} tabIndex={-1} className="alert danger" role="alert">{translate(formError)}</div>}
          <form className="booking-form" onSubmit={submitForm}>
            <fieldset disabled={saving} className="resource-edit-fields">
            <div className="form-grid">
              <label htmlFor="resource-code"><span>{tr("ui.resource_code_4497b674")}</span><input id="resource-code" required maxLength={64} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
              <label htmlFor="resource-name"><span>{tr("ui.resource_name_a2df2ca7")}</span><input id="resource-name" required maxLength={255} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label htmlFor="resource-lab"><span>{tr("ui.laboratory_a9a9cbec")}</span><select id="resource-lab" required value={form.laboratoryId} onChange={(event) => setForm({ ...form, laboratoryId: event.target.value })}><option value="">{tr("ui.choose_laboratory_09dc49a7")}</option>{laboratories.filter((lab) => lab.isActive).map((lab) => <option key={lab.id} value={lab.id}>{lab.code} - {lab.name}</option>)}</select></label>
              <label htmlFor="resource-category"><span>{tr("ui.resource_category_5fc170bb")}</span><select id="resource-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="">{tr("ui.unclassified_10fe63fa")}</option>{categories.map((value) => <option key={value} value={value}>{tr(categoryLabels[value])}</option>)}</select></label>
              <label htmlFor="resource-subtype"><span>{tr("ui.technical_subtype_ee18db20")}</span><select id="resource-subtype" required value={form.subtype} onChange={(event) => setForm({ ...form, subtype: event.target.value })}>{subtypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label htmlFor="resource-location"><span>{tr("ui.location_0f9e5e67")}</span><input id="resource-location" required maxLength={255} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
              <label htmlFor="resource-capacity"><span>{tr("ui.capacity_quantity_87bc5ff1")}</span><input id="resource-capacity" type="number" min="1" max="100000" required value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></label>
              <label htmlFor="resource-booking-state"><span>{tr("ui.booking_policy_5636b6c2")}</span><select id="resource-booking-state" value={form.bookingState} onChange={(event) => setForm({ ...form, bookingState: event.target.value })}><option value="bookable">{tr("ui.bookable_f7ce3273")}</option><option value="restricted">{tr("ui.restricted_c256a4e1")}</option><option value="non_bookable">{tr("ui.not_bookable_fd9badec")}</option></select></label>
              <label htmlFor="resource-manufacturer"><span>{tr("ui.manufacturer_ceeb2ab5")}</span><input id="resource-manufacturer" maxLength={255} value={form.manufacturer} onChange={(event) => setForm({ ...form, manufacturer: event.target.value })} /></label>
              <label htmlFor="resource-model"><span>{translate("ui.model_5e2c614c")}</span><input id="resource-model" maxLength={255} value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} /></label>
            </div>
            <label htmlFor="resource-description"><span>{tr("ui.description_9eca256d")}</span><textarea id="resource-description" rows={3} maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <fieldset className="resource-guide-editor">
              <legend>{t("ui.practical_usage_instructions_23b3986c")}</legend>
              <p>{t("ui.one_step_per_line_up_81dc9517")}</p>
              {([['beforeUse', t("ui.preparation_handover_checks_b9eef15e")], ['steps', t("ui.operating_steps_758a12dc")], ['afterUse', t("ui.return_checks_859395de")]] as const).map(([key, label]) => <label key={key} htmlFor={`resource-guide-${key}`}><span>{label}</span><textarea id={`resource-guide-${key}`} rows={3} maxLength={10020} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}
              <label htmlFor="resource-guide-safety"><span>{t("ui.safety_notes_4d6fcfbc")}</span><textarea id="resource-guide-safety" rows={3} maxLength={2000} value={form.safetyNotes} onChange={event => setForm({ ...form, safetyNotes: event.target.value })} /></label>
            </fieldset>
            <label className="check-line"><input type="checkbox" checked={form.requiresApproval} onChange={(event) => setForm({ ...form, requiresApproval: event.target.checked })} /><span>{tr("ui.require_booking_approval_a8ccf129")}</span></label>
            </fieldset>
            <div className="resource-form-actions">
              <button type="button" className="secondary-button" onClick={resetForm} disabled={saving}>{tr("ui.cancel_74fcd352")}</button>
              <button type="submit" className="primary-button" disabled={saving}>{saving ? tr("ui.saving_2b5c2a46") : editing ? tr("ui.save_changes_48ee3bfe") : tr("ui.create_resource_47097ec2")}</button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <p className="empty-state" role="status">{tr("ui.loading_resource_data_ffc046b7")}</p>
      ) : error ? (<div className="empty-state"><p>{tr("ui.catalogue_is_currently_unavailable_eac7938a")}</p><button className="secondary-button" onClick={loadResources}>{tr("ui.retry_c58d068c")}</button></div>) : resources.length === 0 ? (
        <p className="empty-state">{tr("ui.no_resources_match_these_filters_b9ee67a0")}</p>
      ) : managementMode ? (
        <section className="panel resource-table-panel">
          <div className="resource-table-wrap">
            <table className="resource-management-table">
              <caption>{resources.length} {tr("ui.resources_in_catalogue_9bf90b97")}</caption>
              <thead><tr><th>{tr("ui.resource_9a35ef53")}</th><th>{tr("ui.classification_a077263e")}</th><th>{tr("ui.lab_room_34bf22b1")}</th><th>{tr("ui.physical_state_c30af32d")}</th><th>{translate("ui.availability_12f67f85")}</th><th><span className="sr-only">{tr("ui.actions_fc29e7e6")}</span></th></tr></thead>
              <tbody>{visibleResources.map((resource) => {
                const manageable = canManageResource(resource);
                return <tr key={resource.id}>
                  <td><strong>{resource.code}</strong><span>{resource.name}</span></td>
                  <td><span className={resource.category ? "" : "text-warning"}>{resource.category ? tr(categoryLabels[resource.category]) : tr("ui.unclassified_10fe63fa")}</span><small>{resource.subtype}</small></td>
                  <td>{resource.laboratory ? <><span>{resource.laboratory.code}</span><small>{resource.laboratory.name}</small></> : <span className="text-warning">{tr("ui.no_laboratory_assigned_a03dd58a")}</span>}</td>
                  <td><StatusPill value={resource.operationalStatus} /></td>
                  <td><StatusPill value={resource.availability?.state || "UNAVAILABLE"} /></td>
                  <td><div className="resource-row-actions">
                    <button type="button" className="icon-action" aria-label={`${tr("ui.view_details_f6f88b0f")} ${resource.code}`} title={tr("ui.view_details_f6f88b0f")} onClick={() => openDetail(resource)} disabled={detailLoadingId === resource.id}><Eye size={16} /></button>
                    <button type="button" className="icon-action" aria-label={translate("ui.edit_a4391fd7", { value0: resource.code })} title={manageable ? tr("ui.edit_7a77d761") : tr("ui.outside_your_assigned_laboratories_c9ab3939")} onClick={() => startEdit(resource)} disabled={!manageable}><Edit3 size={16} /></button>
                    <button type="button" className="icon-action" aria-label={translate("ui.change_the_status_of_004e9f27", { value0: resource.code })} title={tr("ui.change_status_e85b5764")} onClick={() => setStatusResource(resource)} disabled={!manageable || resource.operationalStatus === "RETIRED"}><Wrench size={16} /></button>
                    <button type="button" className="icon-action danger" aria-label={translate("ui.retire_f59ae3e7", { value0: resource.code })} title={tr("ui.retire_f9fe2615")} onClick={() => setRetireResource(resource)} disabled={!manageable || resource.operationalStatus === "RETIRED"}><Archive size={16} /></button>
                  </div></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="resource-grid" aria-label={tr("ui.resource_list_e55da62f")}>
          {visibleResources.map((resource) => {
            const cover = resource.media?.find((item: any) => item.kind === "IMAGE");
            return <article className="resource-card canonical-resource-card" key={resource.id}>
              <figure className="catalog-record-cover">
                {cover ? <><ResourceMediaPreview key={cover.url} kind="IMAGE" url={cover.url} alt={cover.altText || cover.title || resource.name} />{cover.sourceUrl && <figcaption>{tr("refine.referenceImage")}</figcaption>}</> : <span className="catalog-category-mark" aria-hidden="true">{React.createElement(({ ROOM: DoorOpen, EQUIPMENT: Microscope, MACHINE: Wrench, EXPERIMENT_KIT: FlaskConical, MATERIAL: Package } as Record<string, typeof Server>)[resource.category] || Server, { size: 28, strokeWidth: 1.5 })}</span>}
              </figure>
              <div className="resource-body">
                <h2><button className="catalog-resource-name" onClick={() => openDetail(resource)} disabled={detailLoadingId === resource.id}>{resource.name}</button></h2>
                <div className="catalog-resource-meta"><span>{resource.code}</span><span>{tr(categoryLabels[resource.category]) || tr("ui.unclassified_10fe63fa")}</span></div>
              </div>
              <p className="catalog-resource-lab">{resource.laboratory?.name || resource.location || tr("ui.not_assigned_ebe3cb5d")}</p>
              <div className="catalog-record-status"><StatusPill value={resource.availability?.state || "UNAVAILABLE"} /></div>
              <div className="resource-discovery-actions">
                {onViewCalendar && <button className="table-action" onClick={() => onViewCalendar(resource.id)}>{tr("ui.view_bookings_42358c1f")}</button>}
                <button className="secondary-button" type="button" onClick={() => openDetail(resource)} disabled={detailLoadingId === resource.id}>{detailLoadingId === resource.id ? tr("ui.loading_148ded83") : tr("ui.view_details_f6f88b0f")}</button>
              </div>
            </article>;
          })}
        </section>
      )}

      <ResourceDetailsModal key={detail?.id || "closed"} isOpen={Boolean(detail)} onClose={closeDetail} resource={detail} onViewCalendar={onViewCalendar} />
      <ResourceStatusModal
        isOpen={Boolean(statusResource)}
        onClose={() => setStatusResource(null)}
        resource={statusResource}
        statuses={operationalStatuses.filter((status) => status !== "RETIRED")}
        onConfirm={updateStatus}
      />
      <ResourceStatusModal
        isOpen={Boolean(retireResource)}
        onClose={() => setRetireResource(null)}
        resource={retireResource}
        statuses={["RETIRED"]}
        initialStatus="RETIRED"
        destructive
        onConfirm={(_status, reason) => retire(reason)}
      />
    </div>
  );
};

function StatusPill({ value }: { value: string }) {
  const { tr } = useLocale();
  return <span className={`resource-status-pill status-${String(value).toLowerCase()}`}>{tr(statusLabels[value]) || value}</span>;
}
