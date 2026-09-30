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
import { ResourceMediaEditor } from "./ResourceMediaEditor.tsx";
import { ResourceStatusModal } from "./ResourceStatusModal.tsx";

const categories = ["ROOM", "EQUIPMENT", "MACHINE", "EXPERIMENT_KIT", "MATERIAL"];
const subtypes = ["ROOM", "GPU_SERVER", "RASPBERRY_PI", "UAV", "CAMERA", "KIT", "MATERIAL", "OTHER"];
const operationalStatuses = ["AVAILABLE", "IN_USE", "MAINTENANCE", "CALIBRATION", "BROKEN", "RETIRED", "OFFLINE"];

const categoryLabels: Record<string, string> = {
  ROOM: "Phòng",
  EQUIPMENT: "Thiết bị",
  MACHINE: "Máy móc",
  EXPERIMENT_KIT: "Bộ thí nghiệm",
  MATERIAL: "Vật tư"
};
const statusLabels: Record<string, string> = {
  AVAILABLE: "Sẵn sàng",
  IN_USE: "Đang sử dụng",
  MAINTENANCE: "Bảo trì",
  CALIBRATION: "Hiệu chuẩn",
  BROKEN: "Hỏng",
  RETIRED: "Đã ngừng khai thác",
  OFFLINE: "Ngoại tuyến",
  RESERVED: "Đã được đặt",
  RESTRICTED: "Hạn chế đặt",
  UNAVAILABLE: "Không khả dụng"
};

interface UserIdentity {
  id: string;
  role: "ADMIN" | "LAB_STAFF" | "LECTURER" | "STUDENT";
}

interface ResourceManagementViewProps {
  user: UserIdentity;
  managementMode?: boolean;
  initialSearch?: string;
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

export const ResourceManagementView: React.FC<ResourceManagementViewProps> = ({ user, managementMode = false, initialSearch = "", onViewCalendar }) => {
  const { tr, t } = useLocale();
  const [resources, setResources] = useState<any[]>([]);
  const [laboratories, setLaboratories] = useState<any[]>([]);
  const [filters, setFilters] = useState<Filters>({ ...initialFilters, search: initialSearch });
  const [sort, setSort] = useState("name");
  const requestVersion = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const detailRequest = useRef(0);
  useEffect(() => () => { detailRequest.current += 1; }, []);
  const [detailLoadingId, setDetailLoadingId] = useState("");
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
      if (version === requestVersion.current) setError(requestError?.message || tr("Không thể tải danh mục tài nguyên."));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }

  useEffect(() => {
    apiRequest("/laboratories")
      .then(setLaboratories)
      .catch((requestError) => setError(requestError?.message || tr("Không thể tải danh sách phòng thí nghiệm.")));
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
        payload.changeReason = tr("Cập nhật hồ sơ tài nguyên từ giao diện quản trị");
        await apiRequest(`/resources/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setNotice(`Đã lưu thay đổi cho ${form.code}.`);
      } else {
        await apiRequest("/resources", { method: "POST", body: JSON.stringify(payload) });
        setNotice(`Đã tạo tài nguyên ${form.code}.`);
      }
      resetForm();
      await loadResources();
    } catch (requestError: any) {
      setFormError(requestError?.message || tr("Không thể lưu tài nguyên."));
      window.setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(resource: any) {
    const request = ++detailRequest.current;
    setDetailLoadingId(resource.id);
    setError("");
    try {
      const [record, schedule, history] = await Promise.all([
        apiRequest(`/resources/${resource.id}`),
        apiRequest(`/resources/${resource.id}/schedule`),
        apiRequest(`/resources/${resource.id}/history`)
      ]);
      if (request !== detailRequest.current) return;
      setDetail({ ...record, schedule, history: history.timeline || [] });
    } catch (requestError: any) {
      if (request === detailRequest.current) setError(requestError?.message || tr("Không thể tải chi tiết tài nguyên."));
    } finally {
      if (request === detailRequest.current) setDetailLoadingId("");
    }
  }

  async function updateStatus(targetStatus: string, reason: string) {
    if (!statusResource) return;
    await apiRequest(`/resources/${statusResource.id}/operational-status`, {
      method: "PATCH",
      body: JSON.stringify({ operationalStatus: targetStatus, reason: reason || null })
    });
    setNotice(`Đã cập nhật trạng thái ${statusResource.code}.`);
    setStatusResource(null);
    await loadResources();
  }

  async function retire(reason: string) {
    if (!retireResource) return;
    await apiRequest(`/resources/${retireResource.id}/retire`, { method: "POST", body: JSON.stringify({ reason }) });
    setNotice(`Đã ngừng khai thác ${retireResource.code}; lịch sử được giữ nguyên.`);
    setRetireResource(null);
    await loadResources();
  }

  return (
    <div className="content-stack resource-management-view">
      <section className="panel resource-catalog-header">
        <div className="panel-heading">
          <div className="panel-title"><Server aria-hidden="true" /><h2>{managementMode ? tr("Quản lý tài nguyên") : tr("Danh mục tài nguyên phòng thí nghiệm")}</h2></div>
          <div className="resource-header-actions">
            <button type="button" className="secondary-button" onClick={loadResources} disabled={loading}>
              <RefreshCw size={16} aria-hidden="true" /><span>{tr("Làm mới")}</span>
            </button>
            {managementMode && canManage && (
              <button type="button" className="primary-button" onClick={startCreate}>
                <Plus size={16} aria-hidden="true" /><span>{tr("Thêm tài nguyên")}</span>
              </button>
            )}
          </div>
        </div>

        <div className="resource-filter-grid" aria-label={tr("Bộ lọc tài nguyên")}>
          <label className="resource-search-field">
            <span>{tr("Tìm kiếm")}</span>
            <span className="search-box"><Search size={17} aria-hidden="true" /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder={tr("Mã, tên, vị trí hoặc phòng lab")} /></span>
          </label>
          <label><span>{tr("Phòng thí nghiệm")}</span><select value={filters.laboratoryId} onChange={(event) => setFilters({ ...filters, laboratoryId: event.target.value })}><option value="">{tr("Tất cả")}</option>{laboratories.map((lab) => <option key={lab.id} value={lab.id}>{lab.code} - {lab.name}</option>)}</select></label>
          <label><span>{tr("Nhóm tài nguyên")}</span><select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value, classification: "ALL" })}><option value="">{tr("Tất cả")}</option>{categories.map((value) => <option key={value} value={value}>{tr(categoryLabels[value])}</option>)}</select></label>
          <label><span>{tr("Phân loại")}</span><select value={filters.classification} onChange={(event) => setFilters({ ...filters, classification: event.target.value, category: "" })}><option value="ALL">{tr("Tất cả")}</option><option value="UNRESOLVED">{tr("Chưa phân loại")}</option></select></label>
          <label><span>{tr("Subtype kỹ thuật")}</span><select value={filters.subtype} onChange={(event) => setFilters({ ...filters, subtype: event.target.value })}><option value="">{tr("Tất cả")}</option>{subtypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><span>{tr("Trạng thái vận hành")}</span><select value={filters.operationalStatus} onChange={(event) => setFilters({ ...filters, operationalStatus: event.target.value })}><option value="">{tr("Tất cả")}</option>{operationalStatuses.map((value) => <option key={value} value={value}>{tr(statusLabels[value])}</option>)}</select></label>
          <button type="button" className="secondary-button resource-clear-filters" disabled={JSON.stringify(filters) === JSON.stringify(initialFilters)} onClick={() => setFilters(initialFilters)}>
            <FilterX size={16} aria-hidden="true" /><span>{tr("Xóa bộ lọc")}</span>
          </button>
          <label><span>{tr("Khả dụng hiện tại")}</span><select value={filters.availability} onChange={event => setFilters({ ...filters, availability: event.target.value })}><option value="">{tr("Tất cả")}</option><option value="AVAILABLE">{tr("Đang khả dụng")}</option><option value="RESERVED">{tr("Đang có lịch đặt")}</option><option value="UNAVAILABLE">{tr("Không khả dụng")}</option></select></label>
        </div>
        <div className="catalog-results-bar"><span role="status">{loading ? tr("Đang tìm tài nguyên…") : error ? tr("Chưa tải được kết quả") : `${resources.length} tài nguyên phù hợp`}</span><label>{tr("Sắp xếp")}<select value={sort} onChange={event => setSort(event.target.value)}><option value="name">{tr("Tên tài nguyên")}</option><option value="code">{tr("Mã tài nguyên")}</option></select></label></div>
        <p className="catalog-availability-note">{tr("Khả dụng hiện tại không đảm bảo khung giờ trong tương lai. Mở lịch để chọn thời gian sử dụng.")}</p>
      </section>

      {error && <div className="alert danger" role="alert">{error}</div>}
      {notice && <div className="alert success" role="status">{notice}</div>}

      {managementMode && canManage && <ResourceMediaEditor resources={resources} />}
      {managementMode && showForm && (
        <section className="panel resource-editor" aria-labelledby="resource-editor-title">
          <div className="panel-title"><Edit3 aria-hidden="true" /><h2 id="resource-editor-title">{editing ? `Chỉnh sửa ${editing.code}` : tr("Tạo tài nguyên mới")}</h2></div>
          {formError && <div ref={errorRef} tabIndex={-1} className="alert danger" role="alert">{formError}</div>}
          <form className="booking-form" onSubmit={submitForm}>
            <fieldset disabled={saving} className="resource-edit-fields">
            <div className="form-grid">
              <label htmlFor="resource-code"><span>{tr("Mã tài nguyên *")}</span><input id="resource-code" required maxLength={64} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
              <label htmlFor="resource-name"><span>{tr("Tên tài nguyên *")}</span><input id="resource-name" required maxLength={255} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label htmlFor="resource-lab"><span>{tr("Phòng thí nghiệm *")}</span><select id="resource-lab" required value={form.laboratoryId} onChange={(event) => setForm({ ...form, laboratoryId: event.target.value })}><option value="">{tr("Chọn phòng lab")}</option>{laboratories.filter((lab) => lab.isActive).map((lab) => <option key={lab.id} value={lab.id}>{lab.code} - {lab.name}</option>)}</select></label>
              <label htmlFor="resource-category"><span>{tr("Nhóm tài nguyên")}</span><select id="resource-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="">{tr("Chưa phân loại")}</option>{categories.map((value) => <option key={value} value={value}>{tr(categoryLabels[value])}</option>)}</select></label>
              <label htmlFor="resource-subtype"><span>{tr("Subtype kỹ thuật *")}</span><select id="resource-subtype" required value={form.subtype} onChange={(event) => setForm({ ...form, subtype: event.target.value })}>{subtypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label htmlFor="resource-location"><span>{tr("Vị trí *")}</span><input id="resource-location" required maxLength={255} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
              <label htmlFor="resource-capacity"><span>{tr("Sức chứa / số lượng *")}</span><input id="resource-capacity" type="number" min="1" max="100000" required value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></label>
              <label htmlFor="resource-booking-state"><span>{tr("Chính sách đặt lịch")}</span><select id="resource-booking-state" value={form.bookingState} onChange={(event) => setForm({ ...form, bookingState: event.target.value })}><option value="bookable">{tr("Cho phép đặt")}</option><option value="restricted">{tr("Hạn chế")}</option><option value="non_bookable">{tr("Không cho đặt")}</option></select></label>
              <label htmlFor="resource-manufacturer"><span>{tr("Nhà sản xuất")}</span><input id="resource-manufacturer" maxLength={255} value={form.manufacturer} onChange={(event) => setForm({ ...form, manufacturer: event.target.value })} /></label>
              <label htmlFor="resource-model"><span>Model</span><input id="resource-model" maxLength={255} value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} /></label>
            </div>
            <label htmlFor="resource-description"><span>{tr("Mô tả")}</span><textarea id="resource-description" rows={3} maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <fieldset className="resource-guide-editor">
              <legend>{t('Hướng dẫn sử dụng thực tế', 'Practical usage instructions')}</legend>
              <p>{t('Mỗi dòng là một bước (tối đa 20 bước, 500 ký tự mỗi bước). Chỉ ghi quy trình đã được đơn vị xác minh cho đúng model.', 'One step per line (up to 20 steps, 500 characters each). Publish only instructions verified by your unit for this model.')}</p>
              {([['beforeUse', t('Chuẩn bị & kiểm tra khi nhận', 'Preparation & handover checks')], ['steps', t('Các bước vận hành', 'Operating steps')], ['afterUse', t('Kiểm tra & hoàn trả', 'Return checks')]] as const).map(([key, label]) => <label key={key} htmlFor={`resource-guide-${key}`}><span>{label}</span><textarea id={`resource-guide-${key}`} rows={3} maxLength={10020} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}
              <label htmlFor="resource-guide-safety"><span>{t('Lưu ý an toàn', 'Safety notes')}</span><textarea id="resource-guide-safety" rows={3} maxLength={2000} value={form.safetyNotes} onChange={event => setForm({ ...form, safetyNotes: event.target.value })} /></label>
            </fieldset>
            <label className="check-line"><input type="checkbox" checked={form.requiresApproval} onChange={(event) => setForm({ ...form, requiresApproval: event.target.checked })} /><span>{tr("Yêu cầu phê duyệt trước khi đặt")}</span></label>
            </fieldset>
            <div className="resource-form-actions">
              <button type="button" className="secondary-button" onClick={resetForm} disabled={saving}>{tr("Hủy")}</button>
              <button type="submit" className="primary-button" disabled={saving}>{saving ? tr("Đang lưu...") : editing ? tr("Lưu thay đổi") : tr("Tạo tài nguyên")}</button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <p className="empty-state" role="status">{tr("Đang tải dữ liệu tài nguyên...")}</p>
      ) : error ? (<div className="empty-state"><p>{tr("Không thể hiển thị danh mục lúc này.")}</p><button className="secondary-button" onClick={loadResources}>{tr("Thử lại")}</button></div>) : resources.length === 0 ? (
        <p className="empty-state">{tr("Không có tài nguyên phù hợp với bộ lọc.")}</p>
      ) : managementMode ? (
        <section className="panel resource-table-panel">
          <div className="resource-table-wrap">
            <table className="resource-management-table">
              <caption>{resources.length} {tr("tài nguyên trong danh mục")}</caption>
              <thead><tr><th>{tr("Tài nguyên")}</th><th>{tr("Phân loại")}</th><th>{tr("Phòng lab")}</th><th>{tr("Vận hành")}</th><th>Availability</th><th><span className="sr-only">{tr("Thao tác")}</span></th></tr></thead>
              <tbody>{visibleResources.map((resource) => {
                const manageable = canManageResource(resource);
                return <tr key={resource.id}>
                  <td><strong>{resource.code}</strong><span>{resource.name}</span></td>
                  <td><span className={resource.category ? "" : "text-warning"}>{resource.category ? tr(categoryLabels[resource.category]) : tr("Chưa phân loại")}</span><small>{resource.subtype}</small></td>
                  <td>{resource.laboratory ? <><span>{resource.laboratory.code}</span><small>{resource.laboratory.name}</small></> : <span className="text-warning">{tr("Chưa gán phòng")}</span>}</td>
                  <td><StatusPill value={resource.operationalStatus} /></td>
                  <td><StatusPill value={resource.availability?.state || "UNAVAILABLE"} /></td>
                  <td><div className="resource-row-actions">
                    <button type="button" className="icon-action" aria-label={`Xem ${resource.code}`} title={tr("Xem chi tiết")} onClick={() => openDetail(resource)} disabled={detailLoadingId === resource.id}><Eye size={16} /></button>
                    <button type="button" className="icon-action" aria-label={`Sửa ${resource.code}`} title={manageable ? tr("Chỉnh sửa") : tr("Không thuộc phòng lab được phân công")} onClick={() => startEdit(resource)} disabled={!manageable}><Edit3 size={16} /></button>
                    <button type="button" className="icon-action" aria-label={`Đổi trạng thái ${resource.code}`} title={tr("Đổi trạng thái")} onClick={() => setStatusResource(resource)} disabled={!manageable || resource.operationalStatus === "RETIRED"}><Wrench size={16} /></button>
                    <button type="button" className="icon-action danger" aria-label={`Ngừng khai thác ${resource.code}`} title={tr("Ngừng khai thác")} onClick={() => setRetireResource(resource)} disabled={!manageable || resource.operationalStatus === "RETIRED"}><Archive size={16} /></button>
                  </div></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="resource-grid" aria-label={tr("Danh sách tài nguyên")}>
          {visibleResources.map((resource) => <article className="resource-card canonical-resource-card" key={resource.id}>
            <div className="catalog-category-art" aria-hidden="true">{React.createElement(({ ROOM: DoorOpen, EQUIPMENT: Microscope, MACHINE: Wrench, EXPERIMENT_KIT: FlaskConical, MATERIAL: Package } as Record<string, typeof Server>)[resource.category] || Server, { size: 48, strokeWidth: 1.3 })}<span>{tr(categoryLabels[resource.category]) || tr("Chưa phân loại")}</span></div>
            <div className="resource-body">
              <div className="row between"><div><span className="eyebrow">{resource.code}</span><h2>{resource.name}</h2></div><StatusPill value={resource.availability?.state || resource.operationalStatus} /></div>
              <p>{resource.description || tr("Chưa có mô tả.")}</p>
              <dl className="resource-facts">
                <div><dt>{tr("Nhóm")}</dt><dd className={resource.category ? "" : "text-warning"}>{resource.category ? tr(categoryLabels[resource.category]) : tr("Chưa phân loại")}</dd></div>
                <div><dt>{tr("Vị trí")}</dt><dd>{resource.location || tr("Chưa cập nhật")}</dd></div>
                <div><dt>{tr("Phòng lab")}</dt><dd>{resource.laboratory?.name || tr("Chưa gán")}</dd></div>
                <div><dt>{tr("Vận hành")}</dt><dd>{tr(statusLabels[resource.operationalStatus]) || resource.operationalStatus}</dd></div>
              </dl>
              <p className="resource-approval-note">{resource.effectiveRequiresApproval ? tr("Cần cán bộ lab phê duyệt") : tr("Xác nhận ngay khi hợp lệ")}</p>
              <div className="resource-discovery-actions">{onViewCalendar && <button className="primary-button" onClick={() => onViewCalendar(resource.id)}>{["AVAILABLE", "IN_USE"].includes(resource.operationalStatus) ? tr("Xem lịch và đặt chỗ") : tr("Xem lịch")}</button>}
              <button className="table-action" type="button" onClick={() => openDetail(resource)} disabled={detailLoadingId === resource.id}><Eye size={15} aria-hidden="true" /><span>{detailLoadingId === resource.id ? tr("Đang tải...") : tr("Xem chi tiết")}</span></button></div>
            </div>
          </article>)}
        </section>
      )}

      <ResourceDetailsModal isOpen={Boolean(detail)} onClose={() => setDetail(null)} resource={detail} onViewCalendar={onViewCalendar} />
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
