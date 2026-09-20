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
  Wrench
} from "lucide-react";

import { apiRequest } from "../api.js";
import { ResourceDetailsModal } from "./ResourceDetailsModal.tsx";
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
}

interface Filters {
  search: string;
  laboratoryId: string;
  category: string;
  subtype: string;
  operationalStatus: string;
  classification: string;
}

const initialFilters: Filters = {
  search: "",
  laboratoryId: "",
  category: "",
  subtype: "",
  operationalStatus: "",
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
  model: ""
};

export const ResourceManagementView: React.FC<ResourceManagementViewProps> = ({ user, managementMode = false }) => {
  const [resources, setResources] = useState<any[]>([]);
  const [laboratories, setLaboratories] = useState<any[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState("");
  const [statusResource, setStatusResource] = useState<any | null>(null);
  const [retireResource, setRetireResource] = useState<any | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const canManage = ["ADMIN", "LAB_STAFF"].includes(user.role);
  const assignedLabIds = useMemo(() => new Set(laboratories.map((lab) => lab.id)), [laboratories]);

  function queryString() {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value && !(key === "classification" && value === "ALL")) params.set(key, value);
    }
    return params.toString();
  }

  async function loadResources() {
    setLoading(true);
    setError("");
    try {
      const query = queryString();
      setResources(await apiRequest(`/resources${query ? `?${query}` : ""}`));
    } catch (requestError: any) {
      setError(requestError?.message || "Không thể tải danh mục tài nguyên.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    apiRequest("/laboratories")
      .then(setLaboratories)
      .catch((requestError) => setError(requestError?.message || "Không thể tải danh sách phòng thí nghiệm."));
  }, [user.id]);

  useEffect(() => {
    const timer = window.setTimeout(loadResources, filters.search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [filters.search, filters.laboratoryId, filters.category, filters.subtype, filters.operationalStatus, filters.classification]);

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
      model: resource.model || ""
    });
    setFormError("");
    setShowForm(true);
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
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
      model: form.model || null
    };
    try {
      if (editing) {
        payload.changeReason = "Cập nhật hồ sơ tài nguyên từ giao diện quản trị";
        await apiRequest(`/resources/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setNotice(`Đã lưu thay đổi cho ${form.code}.`);
      } else {
        await apiRequest("/resources", { method: "POST", body: JSON.stringify(payload) });
        setNotice(`Đã tạo tài nguyên ${form.code}.`);
      }
      resetForm();
      await loadResources();
    } catch (requestError: any) {
      setFormError(requestError?.message || "Không thể lưu tài nguyên.");
      window.setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(resource: any) {
    setDetailLoadingId(resource.id);
    setError("");
    try {
      const [record, schedule, history] = await Promise.all([
        apiRequest(`/resources/${resource.id}`),
        apiRequest(`/resources/${resource.id}/schedule`),
        apiRequest(`/resources/${resource.id}/history`)
      ]);
      setDetail({ ...record, schedule, history: history.timeline || [] });
    } catch (requestError: any) {
      setError(requestError?.message || "Không thể tải chi tiết tài nguyên.");
    } finally {
      setDetailLoadingId("");
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
          <div className="panel-title"><Server aria-hidden="true" /><h2>{managementMode ? "Quản lý tài nguyên" : "Danh mục tài nguyên phòng thí nghiệm"}</h2></div>
          <div className="resource-header-actions">
            <button type="button" className="secondary-button" onClick={loadResources} disabled={loading}>
              <RefreshCw size={16} aria-hidden="true" /><span>Làm mới</span>
            </button>
            {managementMode && canManage && (
              <button type="button" className="primary-button" onClick={startCreate}>
                <Plus size={16} aria-hidden="true" /><span>Thêm tài nguyên</span>
              </button>
            )}
          </div>
        </div>

        <div className="resource-filter-grid" aria-label="Bộ lọc tài nguyên">
          <label className="resource-search-field">
            <span>Tìm kiếm</span>
            <span className="search-box"><Search size={17} aria-hidden="true" /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Mã, tên, vị trí hoặc phòng lab" /></span>
          </label>
          <label><span>Phòng thí nghiệm</span><select value={filters.laboratoryId} onChange={(event) => setFilters({ ...filters, laboratoryId: event.target.value })}><option value="">Tất cả</option>{laboratories.map((lab) => <option key={lab.id} value={lab.id}>{lab.code} - {lab.name}</option>)}</select></label>
          <label><span>Nhóm tài nguyên</span><select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value, classification: "ALL" })}><option value="">Tất cả</option>{categories.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}</select></label>
          <label><span>Phân loại</span><select value={filters.classification} onChange={(event) => setFilters({ ...filters, classification: event.target.value, category: "" })}><option value="ALL">Tất cả</option><option value="UNRESOLVED">Chưa phân loại</option></select></label>
          <label><span>Subtype kỹ thuật</span><select value={filters.subtype} onChange={(event) => setFilters({ ...filters, subtype: event.target.value })}><option value="">Tất cả</option>{subtypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><span>Trạng thái vận hành</span><select value={filters.operationalStatus} onChange={(event) => setFilters({ ...filters, operationalStatus: event.target.value })}><option value="">Tất cả</option>{operationalStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
          <button type="button" className="secondary-button resource-clear-filters" disabled={JSON.stringify(filters) === JSON.stringify(initialFilters)} onClick={() => setFilters(initialFilters)}>
            <FilterX size={16} aria-hidden="true" /><span>Xóa bộ lọc</span>
          </button>
        </div>
      </section>

      {error && <div className="alert danger" role="alert">{error}</div>}
      {notice && <div className="alert success" role="status">{notice}</div>}

      {managementMode && showForm && (
        <section className="panel resource-editor" aria-labelledby="resource-editor-title">
          <div className="panel-title"><Edit3 aria-hidden="true" /><h2 id="resource-editor-title">{editing ? `Chỉnh sửa ${editing.code}` : "Tạo tài nguyên mới"}</h2></div>
          {formError && <div ref={errorRef} tabIndex={-1} className="alert danger" role="alert">{formError}</div>}
          <form className="booking-form" onSubmit={submitForm}>
            <div className="form-grid">
              <label htmlFor="resource-code"><span>Mã tài nguyên *</span><input id="resource-code" required maxLength={64} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
              <label htmlFor="resource-name"><span>Tên tài nguyên *</span><input id="resource-name" required maxLength={255} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label htmlFor="resource-lab"><span>Phòng thí nghiệm *</span><select id="resource-lab" required value={form.laboratoryId} onChange={(event) => setForm({ ...form, laboratoryId: event.target.value })}><option value="">Chọn phòng lab</option>{laboratories.filter((lab) => lab.isActive).map((lab) => <option key={lab.id} value={lab.id}>{lab.code} - {lab.name}</option>)}</select></label>
              <label htmlFor="resource-category"><span>Nhóm tài nguyên</span><select id="resource-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="">Chưa phân loại</option>{categories.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}</select></label>
              <label htmlFor="resource-subtype"><span>Subtype kỹ thuật *</span><select id="resource-subtype" required value={form.subtype} onChange={(event) => setForm({ ...form, subtype: event.target.value })}>{subtypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label htmlFor="resource-location"><span>Vị trí *</span><input id="resource-location" required maxLength={255} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
              <label htmlFor="resource-capacity"><span>Sức chứa / số lượng *</span><input id="resource-capacity" type="number" min="1" max="100000" required value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></label>
              <label htmlFor="resource-booking-state"><span>Chính sách đặt lịch</span><select id="resource-booking-state" value={form.bookingState} onChange={(event) => setForm({ ...form, bookingState: event.target.value })}><option value="bookable">Cho phép đặt</option><option value="restricted">Hạn chế</option><option value="non_bookable">Không cho đặt</option></select></label>
              <label htmlFor="resource-manufacturer"><span>Nhà sản xuất</span><input id="resource-manufacturer" maxLength={255} value={form.manufacturer} onChange={(event) => setForm({ ...form, manufacturer: event.target.value })} /></label>
              <label htmlFor="resource-model"><span>Model</span><input id="resource-model" maxLength={255} value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} /></label>
            </div>
            <label htmlFor="resource-description"><span>Mô tả</span><textarea id="resource-description" rows={3} maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label className="check-line"><input type="checkbox" checked={form.requiresApproval} onChange={(event) => setForm({ ...form, requiresApproval: event.target.checked })} /><span>Yêu cầu phê duyệt trước khi đặt</span></label>
            <div className="resource-form-actions">
              <button type="button" className="secondary-button" onClick={resetForm} disabled={saving}>Hủy</button>
              <button type="submit" className="primary-button" disabled={saving}>{saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo tài nguyên"}</button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <p className="empty-state" role="status">Đang tải dữ liệu tài nguyên...</p>
      ) : resources.length === 0 ? (
        <p className="empty-state">Không có tài nguyên phù hợp với bộ lọc.</p>
      ) : managementMode ? (
        <section className="panel resource-table-panel">
          <div className="resource-table-wrap">
            <table className="resource-management-table">
              <caption>{resources.length} tài nguyên từ PostgreSQL</caption>
              <thead><tr><th>Tài nguyên</th><th>Phân loại</th><th>Phòng lab</th><th>Vận hành</th><th>Availability</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
              <tbody>{resources.map((resource) => {
                const manageable = canManageResource(resource);
                return <tr key={resource.id}>
                  <td><strong>{resource.code}</strong><span>{resource.name}</span></td>
                  <td><span className={resource.category ? "" : "text-warning"}>{resource.category ? categoryLabels[resource.category] : "Chưa phân loại"}</span><small>{resource.subtype}</small></td>
                  <td>{resource.laboratory ? <><span>{resource.laboratory.code}</span><small>{resource.laboratory.name}</small></> : <span className="text-warning">Chưa gán phòng</span>}</td>
                  <td><StatusPill value={resource.operationalStatus} /></td>
                  <td><StatusPill value={resource.availability?.state || "UNAVAILABLE"} /></td>
                  <td><div className="resource-row-actions">
                    <button type="button" className="icon-action" aria-label={`Xem ${resource.code}`} title="Xem chi tiết" onClick={() => openDetail(resource)} disabled={detailLoadingId === resource.id}><Eye size={16} /></button>
                    <button type="button" className="icon-action" aria-label={`Sửa ${resource.code}`} title={manageable ? "Chỉnh sửa" : "Không thuộc phòng lab được phân công"} onClick={() => startEdit(resource)} disabled={!manageable}><Edit3 size={16} /></button>
                    <button type="button" className="icon-action" aria-label={`Đổi trạng thái ${resource.code}`} title="Đổi trạng thái" onClick={() => setStatusResource(resource)} disabled={!manageable || resource.operationalStatus === "RETIRED"}><Wrench size={16} /></button>
                    <button type="button" className="icon-action danger" aria-label={`Ngừng khai thác ${resource.code}`} title="Ngừng khai thác" onClick={() => setRetireResource(resource)} disabled={!manageable || resource.operationalStatus === "RETIRED"}><Archive size={16} /></button>
                  </div></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="resource-grid" aria-label="Danh sách tài nguyên">
          {resources.map((resource) => <article className="resource-card canonical-resource-card" key={resource.id}>
            <div className="resource-body">
              <div className="row between"><div><span className="eyebrow">{resource.code}</span><h2>{resource.name}</h2></div><StatusPill value={resource.availability?.state || resource.operationalStatus} /></div>
              <p>{resource.description || "Chưa có mô tả."}</p>
              <dl className="resource-facts">
                <div><dt>Nhóm</dt><dd className={resource.category ? "" : "text-warning"}>{resource.category ? categoryLabels[resource.category] : "Chưa phân loại"}</dd></div>
                <div><dt>Subtype</dt><dd>{resource.subtype}</dd></div>
                <div><dt>Phòng lab</dt><dd>{resource.laboratory?.name || "Chưa gán"}</dd></div>
                <div><dt>Vận hành</dt><dd>{statusLabels[resource.operationalStatus] || resource.operationalStatus}</dd></div>
              </dl>
              <button className="table-action" type="button" onClick={() => openDetail(resource)} disabled={detailLoadingId === resource.id}><Eye size={15} aria-hidden="true" /><span>{detailLoadingId === resource.id ? "Đang tải..." : "Xem chi tiết"}</span></button>
            </div>
          </article>)}
        </section>
      )}

      <ResourceDetailsModal isOpen={Boolean(detail)} onClose={() => setDetail(null)} resource={detail} />
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
  return <span className={`resource-status-pill status-${String(value).toLowerCase()}`}>{statusLabels[value] || value}</span>;
}
