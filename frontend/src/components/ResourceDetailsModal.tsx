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
      footer={<><button type="button" className="secondary-button" onClick={onClose}>{tr("Đóng")}</button>{onViewCalendar && <button className="primary-button" onClick={() => { onClose(); onViewCalendar(resource.id); }}>{tr("Xem lịch của tài nguyên")}</button>}</>}
    >
      <ResourceGallery key={resource.id} resourceId={resource.id} initialItems={resource.media} />
      <div className="resource-detail-status-line">
        <span className={`resource-status-pill status-${String(resource.operationalStatus).toLowerCase()}`}>{tr(operationalLabels[resource.operationalStatus]) || resource.operationalStatus}</span>
        <span className={`resource-status-pill status-${String(resource.availability?.state || "unavailable").toLowerCase()}`}>{tr(availabilityLabels[resource.availability?.state]) || tr("Không thể đặt")}</span>
        {!resource.category && <span className="resource-status-pill status-unresolved">{tr("Chưa phân loại")}</span>}
      </div>

      <p className="section-description">{tr("Trạng thái khả dụng phản ánh thời điểm đang xem. Chọn ngày và giờ trong lịch để kiểm tra đặt chỗ; hệ thống sẽ xác nhận lại khi gửi yêu cầu.")}</p>
      <dl className="resource-detail-grid">
        <Detail label={tr("Nhóm tài nguyên")} value={resource.category ? tr(categoryLabels[resource.category]) || resource.category : tr("Chưa phân loại")} />
        <Detail label={tr("Subtype kỹ thuật")} value={resource.subtype} />
        <Detail label={tr("Phòng thí nghiệm")} value={resource.laboratory ? `${resource.laboratory.code} - ${resource.laboratory.name}` : tr("Chưa gán phòng")} />
        <Detail label={tr("Chính sách đặt lịch")} value={resource.bookingState === "bookable" ? tr("Cho phép đặt") : resource.bookingState === "restricted" ? tr("Hạn chế đặt") : tr("Không cho đặt")} />
        <Detail label={tr("Sức chứa / số lượng")} value={String(resource.capacity)} />
        <Detail label={tr("Yêu cầu phê duyệt")} value={resource.effectiveRequiresApproval ? tr("Cần duyệt") : tr("Xác nhận ngay khi hợp lệ")} />
        <Detail label={tr("Nhà sản xuất")} value={resource.manufacturer || tr("Chưa cập nhật")} />
        <Detail label="Model" value={resource.model || tr("Chưa cập nhật")} />
      </dl>

      <LabPolicySummary policy={resource.labPolicy || resource.laboratory?.labPolicy} requiresApproval={resource.effectiveRequiresApproval} />

      <section className="resource-detail-section">
        <h4>{tr("Mô tả")}</h4>
        <p>{resource.description || tr("Chưa có mô tả.")}</p>
      </section>

      <ResourceUsageGuide guide={resource.specs?.usageGuide} />

      {resource.specs && Object.keys(resource.specs).some(key => key !== "usageGuide") && (
        <section className="resource-detail-section">
          <h4>{tr("Thông số kỹ thuật đã lưu")}</h4>
          <dl className="resource-spec-grid">{Object.entries(resource.specs).filter(([key]) => key !== "usageGuide").map(([key, value]) => <Detail key={key} label={key} value={String(value)} />)}</dl>
        </section>
      )}

      <section className="resource-detail-section" aria-labelledby="resource-schedule-heading">
        <h4 id="resource-schedule-heading"><CalendarClock size={16} aria-hidden="true" /> {tr("Lịch sử dụng và bảo trì")}</h4>
        {bookings.length === 0 && maintenance.length === 0 ? <p className="resource-detail-empty">{tr("Không có lịch đã lưu trong khoảng đang xem.")}</p> : (
          <div className="resource-event-list">
            {bookings.map((row: any) => <div key={`booking-${row.id}`}><strong>{tr("Lịch đặt ·")}{tr(bookingLabels[row.status]) || row.status}</strong><span>{formatDate(row.startAt)} → {formatDate(row.endAt)}</span></div>)}
            {maintenance.map((row: any) => <div key={`maintenance-${row.id}`}><strong>{row.kind === "calibration" ? tr("Hiệu chuẩn") : tr("Bảo trì")} · {tr(maintenanceLabels[row.status]) || row.status}</strong><span>{row.title} · {formatDate(row.startAt)} → {formatDate(row.endAt)}</span></div>)}
          </div>
        )}
      </section>

      <section className="resource-detail-section" aria-labelledby="resource-history-heading">
        <h4 id="resource-history-heading"><History size={16} aria-hidden="true" /> {tr("Nhật ký có nguồn dữ liệu")}</h4>
        {history.length === 0 ? <p className="resource-detail-empty">{tr("Chưa có sự kiện lịch sử được lưu.")}</p> : (
          <div className="resource-event-list resource-history-list">
            {history.slice(0, 20).map((event: any) => <div key={`${event.source}-${event.id}`}>
              <strong>{historyLabel(event)}</strong>
              <span>{formatDate(event.timestamp)} {tr("· nguồn:")}{event.source}{event.actor?.fullName ? ` · ${event.actor.fullName}` : ""}</span>
            </div>)}
          </div>
        )}
      </section>

      <p className="resource-detail-timestamps">{tr("Tạo:")}{formatDate(resource.createdAt)} {tr("· Cập nhật:")}{formatDate(resource.updatedAt)}</p>
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
