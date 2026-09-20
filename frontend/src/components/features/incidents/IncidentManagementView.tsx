import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, ShieldAlert, X } from "lucide-react";

import type { IncidentRecord, IncidentSeverity } from "../../../types/incident";
import {
  investigateIncident,
  reportIncident,
  resolveIncident,
  triageIncident
} from "../../../services/incidents";

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

const severityLabels: Record<IncidentSeverity, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  critical: "Nghiêm trọng"
};

const statusLabels: Record<string, string> = {
  reported: "Đã báo cáo",
  triaged: "Đã phân loại",
  assigned: "Đã phân công",
  investigating: "Đang điều tra",
  resolved: "Đã xử lý",
  verified: "Đã xác minh",
  closed: "Đã đóng"
};

export const IncidentManagementView: React.FC<Props> = ({ user, resources, incidents, onChanged }) => {
  const isStaff = ["ADMIN", "LAB_STAFF"].includes(user?.role || "");
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "RESOLVED">("ALL");
  const [showReport, setShowReport] = useState(false);
  const [resolving, setResolving] = useState<IncidentRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [resolution, setResolution] = useState("");
  const [form, setForm] = useState({
    resourceId: resources[0]?.id || "",
    severity: "medium" as IncidentSeverity,
    category: "hardware",
    title: "",
    description: ""
  });

  const filtered = useMemo(() => incidents.filter((incident) => {
    const open = ["reported", "triaged", "assigned", "investigating"].includes(incident.status);
    if (filter === "OPEN") return open;
    if (filter === "RESOLVED") return !open;
    return true;
  }), [incidents, filter]);

  const openCount = incidents.filter((incident) =>
    ["reported", "triaged", "assigned", "investigating"].includes(incident.status)
  ).length;

  async function refresh() {
    await onChanged?.();
  }

  async function submitReport(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.resourceId || !form.title.trim() || !form.description.trim()) {
      setError("Vui lòng chọn tài nguyên và nhập đầy đủ tiêu đề, mô tả sự cố.");
      return;
    }
    try {
      setBusyId("create");
      await reportIncident({
        resourceId: form.resourceId,
        severity: form.severity,
        category: form.category.trim() || null,
        title: form.title.trim(),
        description: form.description.trim()
      });
      setShowReport(false);
      setForm((current) => ({ ...current, title: "", description: "" }));
      await refresh();
    } catch (requestError: any) {
      setError(requestError?.message || "Không thể gửi báo cáo sự cố.");
    } finally {
      setBusyId(null);
    }
  }

  async function runAction(incident: IncidentRecord, action: "triage" | "investigate") {
    setError("");
    try {
      setBusyId(incident.id);
      if (action === "triage") await triageIncident(incident.id);
      else await investigateIncident(incident.id);
      await refresh();
    } catch (requestError: any) {
      setError(requestError?.message || "Không thể cập nhật sự cố.");
    } finally {
      setBusyId(null);
    }
  }

  async function submitResolution(event: React.FormEvent) {
    event.preventDefault();
    if (!resolving) return;
    setError("");
    if (!resolution.trim()) {
      setError("Cần nhập kết quả xử lý thực tế trước khi đánh dấu đã giải quyết.");
      return;
    }
    try {
      setBusyId(resolving.id);
      await resolveIncident(resolving.id, resolution.trim());
      setResolving(null);
      setResolution("");
      await refresh();
    } catch (requestError: any) {
      setError(requestError?.message || "Không thể hoàn tất xử lý sự cố.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="content-stack" aria-labelledby="incident-heading">
      <div className="page-section-header">
        <div>
          <p className="eyebrow">VẬN HÀNH PHÒNG THÍ NGHIỆM</p>
          <h1 id="incident-heading">Sự cố tài nguyên</h1>
          <p className="section-description">
            Báo cáo tình trạng bất thường bằng dữ liệu thực. Cán bộ lab xử lý theo phạm vi phòng được phân công.
          </p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => {
          setError("");
          setForm((current) => ({ ...current, resourceId: current.resourceId || resources[0]?.id || "" }));
          setShowReport(true);
        }}>
          <Plus size={16} /> Báo cáo sự cố
        </button>
      </div>

      {error && <div role="alert" className="alert danger">{error}</div>}

      <div className="operational-summary-grid">
        <Summary label="Tổng sự cố" value={incidents.length} />
        <Summary label="Đang xử lý" value={openCount} />
        <Summary label="Đã giải quyết" value={incidents.length - openCount} />
      </div>

      <div className="booking-queue-toolbar" role="group" aria-label="Lọc sự cố">
        {(["ALL", "OPEN", "RESOLVED"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={filter === value ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setFilter(value)}
          >
            {value === "ALL" ? "Tất cả" : value === "OPEN" ? "Đang xử lý" : "Đã giải quyết"}
          </button>
        ))}
      </div>

      <div className="content-stack">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={28} />
            <p>Không có sự cố phù hợp với bộ lọc hiện tại.</p>
          </div>
        ) : filtered.map((incident) => {
          const open = ["reported", "triaged", "assigned", "investigating"].includes(incident.status);
          return (
            <article className="card operational-card" key={incident.id}>
              <div className="operational-card-header">
                <div>
                  <div className="operational-card-meta">
                    <span className={`status-badge status-${incident.severity}`}>
                      {severityLabels[incident.severity]}
                    </span>
                    <span>{statusLabels[incident.status] || incident.status}</span>
                  </div>
                  <h2>{incident.title}</h2>
                  <p>{incident.resource?.code} · {incident.resource?.name}</p>
                </div>
                <time dateTime={incident.detectedAt}>
                  {new Date(incident.detectedAt).toLocaleString("vi-VN")}
                </time>
              </div>

              <p>{incident.description}</p>

              <dl className="operational-evidence-grid">
                <div><dt>Người báo cáo</dt><dd>{incident.reportedBy?.fullName || "—"}</dd></div>
                <div><dt>Người phụ trách</dt><dd>{incident.assignedTo?.fullName || "Chưa phân công"}</dd></div>
                <div><dt>Trạng thái tài nguyên</dt><dd>{incident.resource?.operationalStatus || "—"}</dd></div>
                <div><dt>Kết quả xử lý</dt><dd>{incident.resolution || "Chưa có"}</dd></div>
              </dl>

              {isStaff && open && (
                <div className="operational-card-actions">
                  {incident.status === "reported" && (
                    <button disabled={busyId === incident.id} className="btn btn-secondary" type="button" onClick={() => runAction(incident, "triage")}>
                      Phân loại
                    </button>
                  )}
                  {["triaged", "assigned"].includes(incident.status) && (
                    <button disabled={busyId === incident.id} className="btn btn-secondary" type="button" onClick={() => runAction(incident, "investigate")}>
                      Bắt đầu điều tra
                    </button>
                  )}
                  <button className="btn btn-primary" type="button" onClick={() => {
                    setError("");
                    setResolution("");
                    setResolving(incident);
                  }}>
                    Xác nhận đã xử lý
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {showReport && (
        <div className="modal-backdrop-2026" role="presentation">
          <div className="modal-container-2026" role="dialog" aria-modal="true" aria-labelledby="incident-report-title">
            <div className="modal-header-2026">
              <h2 id="incident-report-title"><ShieldAlert size={18} /> Báo cáo sự cố</h2>
              <button className="icon-button" type="button" aria-label="Đóng" onClick={() => setShowReport(false)}><X size={18} /></button>
            </div>
            <form className="booking-operation-form" onSubmit={submitReport} noValidate>
              <label>
                Tài nguyên
                <select value={form.resourceId} onChange={(event) => setForm({ ...form, resourceId: event.target.value })}>
                  <option value="">Chọn tài nguyên</option>
                  {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.code} — {resource.name}</option>)}
                </select>
              </label>
              <label>
                Mức độ
                <select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value as IncidentSeverity })}>
                  {Object.entries(severityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>
                Nhóm sự cố
                <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} maxLength={100} />
              </label>
              <label>
                Tiêu đề
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={255} />
              </label>
              <label>
                Mô tả thực tế
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={5} maxLength={4000} />
              </label>
              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setShowReport(false)}>Hủy</button>
                <button className="btn btn-primary" type="submit" disabled={busyId === "create"}>{busyId === "create" ? "Đang gửi..." : "Gửi báo cáo"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resolving && (
        <div className="modal-backdrop-2026" role="presentation">
          <div className="modal-container-2026" role="dialog" aria-modal="true" aria-labelledby="incident-resolve-title">
            <div className="modal-header-2026">
              <h2 id="incident-resolve-title"><AlertTriangle size={18} /> Xác nhận xử lý sự cố</h2>
              <button className="icon-button" type="button" aria-label="Đóng" onClick={() => setResolving(null)}><X size={18} /></button>
            </div>
            <form className="booking-operation-form" onSubmit={submitResolution} noValidate>
              <p>{resolving.title}</p>
              <label>
                Kết quả xử lý thực tế
                <textarea value={resolution} onChange={(event) => setResolution(event.target.value)} rows={5} maxLength={4000} />
              </label>
              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setResolving(null)}>Hủy</button>
                <button className="btn btn-primary" type="submit" disabled={busyId === resolving.id}>{busyId === resolving.id ? "Đang lưu..." : "Lưu kết quả xử lý"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

const Summary = ({ label, value }: { label: string; value: number }) => (
  <div className="card operational-summary-card">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);
