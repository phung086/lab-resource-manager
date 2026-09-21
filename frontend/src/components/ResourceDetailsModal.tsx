import React from "react";
import { CalendarClock, History, Server } from "lucide-react";

import { BaseModal2026 } from "./BaseModal2026";
import { formatVietnamDateTime } from "../utils/timezone.js";

export interface ResourceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource?: any;
}

const categoryLabels: Record<string, string> = {
  ROOM: "Phòng",
  EQUIPMENT: "Thiết bị",
  MACHINE: "Máy móc",
  EXPERIMENT_KIT: "Bộ thí nghiệm",
  MATERIAL: "Vật tư"
};
const operationalLabels: Record<string, string> = {
  AVAILABLE: "Sẵn sàng", IN_USE: "Đang sử dụng", MAINTENANCE: "Bảo trì",
  CALIBRATION: "Hiệu chuẩn", BROKEN: "Hỏng", RETIRED: "Ngừng sử dụng", OFFLINE: "Ngoại tuyến"
};
const bookingLabels: Record<string, string> = {
  PENDING_APPROVAL: "Chờ duyệt", CONFIRMED: "Đã xác nhận", CHECKED_OUT: "Đang sử dụng",
  RETURNED: "Đã hoàn trả", COMPLETED: "Hoàn tất", REJECTED: "Từ chối", CANCELLED: "Đã hủy"
};
const availabilityLabels: Record<string, string> = {
  AVAILABLE: "Có thể đặt", RESERVED: "Đã có lịch đặt", RESTRICTED: "Hạn chế đặt", UNAVAILABLE: "Không thể đặt"
};
const maintenanceLabels: Record<string, string> = {
  scheduled: "Đã lên lịch", in_progress: "Đang thực hiện", completed: "Hoàn thành", cancelled: "Đã hủy"
};

export const ResourceDetailsModal: React.FC<ResourceDetailsModalProps> = ({ isOpen, onClose, resource }) => {
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
      footer={<button type="button" className="secondary-button" onClick={onClose}>Đóng</button>}
    >
      <div className="resource-detail-status-line">
        <span className={`resource-status-pill status-${String(resource.operationalStatus).toLowerCase()}`}>{operationalLabels[resource.operationalStatus] || resource.operationalStatus}</span>
        <span className={`resource-status-pill status-${String(resource.availability?.state || "unavailable").toLowerCase()}`}>{availabilityLabels[resource.availability?.state] || "Không thể đặt"}</span>
        {!resource.category && <span className="resource-status-pill status-unresolved">Chưa phân loại</span>}
      </div>

      <dl className="resource-detail-grid">
        <Detail label="Nhóm tài nguyên" value={resource.category ? categoryLabels[resource.category] || resource.category : "Chưa phân loại"} />
        <Detail label="Subtype kỹ thuật" value={resource.subtype} />
        <Detail label="Phòng thí nghiệm" value={resource.laboratory ? `${resource.laboratory.code} - ${resource.laboratory.name}` : "Chưa gán phòng"} />
        <Detail label="Chính sách đặt lịch" value={resource.bookingState === "bookable" ? "Cho phép đặt" : resource.bookingState === "restricted" ? "Hạn chế đặt" : "Không cho đặt"} />
        <Detail label="Sức chứa / số lượng" value={String(resource.capacity)} />
        <Detail label="Yêu cầu phê duyệt" value={resource.requiresApproval ? "Có" : "Không"} />
        <Detail label="Nhà sản xuất" value={resource.manufacturer || "Chưa cập nhật"} />
        <Detail label="Model" value={resource.model || "Chưa cập nhật"} />
      </dl>

      <section className="resource-detail-section">
        <h4>Mô tả</h4>
        <p>{resource.description || "Chưa có mô tả."}</p>
      </section>

      {resource.specs && Object.keys(resource.specs).length > 0 && (
        <section className="resource-detail-section">
          <h4>Thông số kỹ thuật đã lưu</h4>
          <dl className="resource-spec-grid">{Object.entries(resource.specs).map(([key, value]) => <Detail key={key} label={key} value={String(value)} />)}</dl>
        </section>
      )}

      <section className="resource-detail-section" aria-labelledby="resource-schedule-heading">
        <h4 id="resource-schedule-heading"><CalendarClock size={16} aria-hidden="true" /> Lịch sử dụng và bảo trì</h4>
        {bookings.length === 0 && maintenance.length === 0 ? <p className="resource-detail-empty">Không có lịch đã lưu trong khoảng đang xem.</p> : (
          <div className="resource-event-list">
            {bookings.map((row: any) => <div key={`booking-${row.id}`}><strong>Lịch đặt · {bookingLabels[row.status] || row.status}</strong><span>{formatDate(row.startAt)} → {formatDate(row.endAt)}</span></div>)}
            {maintenance.map((row: any) => <div key={`maintenance-${row.id}`}><strong>{row.kind === "calibration" ? "Hiệu chuẩn" : "Bảo trì"} · {maintenanceLabels[row.status] || row.status}</strong><span>{row.title} · {formatDate(row.startAt)} → {formatDate(row.endAt)}</span></div>)}
          </div>
        )}
      </section>

      <section className="resource-detail-section" aria-labelledby="resource-history-heading">
        <h4 id="resource-history-heading"><History size={16} aria-hidden="true" /> Nhật ký có nguồn dữ liệu</h4>
        {history.length === 0 ? <p className="resource-detail-empty">Chưa có sự kiện lịch sử được lưu.</p> : (
          <div className="resource-event-list resource-history-list">
            {history.slice(0, 20).map((event: any) => <div key={`${event.source}-${event.id}`}>
              <strong>{historyLabel(event)}</strong>
              <span>{formatDate(event.timestamp)} · nguồn: {event.source}{event.actor?.fullName ? ` · ${event.actor.fullName}` : ""}</span>
            </div>)}
          </div>
        )}
      </section>

      <p className="resource-detail-timestamps">Tạo: {formatDate(resource.createdAt)} · Cập nhật: {formatDate(resource.updatedAt)}</p>
    </BaseModal2026>
  );
};

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div><dt>{label}</dt><dd>{value}</dd></div>
);

function formatDate(value: string) {
  if (!value) return "Không xác định";
  return formatVietnamDateTime(value);
}

function historyLabel(event: any) {
  if (event.eventType === "OPERATIONAL_STATUS_CHANGED") return `${operationalLabels[event.data?.fromStatus] || event.data?.fromStatus} → ${operationalLabels[event.data?.toStatus] || event.data?.toStatus}${event.data?.reason ? `: ${event.data.reason}` : ""}`;
  if (event.source === "booking") return `Lịch đặt · ${bookingLabels[event.data?.status] || event.data?.status}`;
  if (event.source === "maintenance_window") return `${event.data?.title || "Bảo trì"} · ${maintenanceLabels[event.data?.status] || event.data?.status}`;
  if (event.source === "incident") return `${event.data?.title || "Sự cố"} · ${event.data?.status}`;
  return event.data?.message || event.eventType;
}
