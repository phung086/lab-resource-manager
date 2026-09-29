import { useLocale } from '../providers/LocaleProvider';
import React from "react";

interface LabPolicy {
  workDayStartHour?: number | null;
  workDayEndHour?: number | null;
  minBookingMinutes?: number | null;
  maxBookingMinutes?: number | null;
  maxAdvanceBookingDays?: number | null;
  allowWeekend?: boolean | null;
}

export function LabPolicySummary({ policy, requiresApproval }: { policy?: LabPolicy | null; requiresApproval?: boolean }) {
  const { tr } = useLocale();
  const unknown = tr("Chưa có thông tin");
  const duration = (minutes?: number | null) => minutes == null ? unknown : `${minutes} phút`;
  const hours = policy?.workDayStartHour != null && policy?.workDayEndHour != null
    ? `${String(policy.workDayStartHour).padStart(2, "0")}:00 – ${String(policy.workDayEndHour).padStart(2, "0")}:00 (giờ Việt Nam)` : unknown;
  const entries = [
    [tr("Giờ mở cửa"), hours],
    [tr("Thời lượng tối thiểu"), duration(policy?.minBookingMinutes)],
    [tr("Thời lượng tối đa"), duration(policy?.maxBookingMinutes)],
    [tr("Đặt trước tối đa"), policy?.maxAdvanceBookingDays == null ? unknown : `${policy.maxAdvanceBookingDays} ngày`],
    [tr("Thứ 7 & Chủ Nhật"), policy?.allowWeekend == null ? unknown : policy.allowWeekend ? tr("Cho phép đặt lịch") : tr("Không cho phép đặt lịch")],
    [tr("Phê duyệt"), requiresApproval == null ? unknown : requiresApproval ? tr("Cần cán bộ có quyền duyệt") : tr("Xác nhận khi lịch hợp lệ")],
  ];
  return <section className="lab-policy-summary" aria-label={tr("Chính sách đặt lịch của LAB")}>
    <h4>{tr("Chính sách đặt lịch của LAB")}</h4>
    <dl>{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p>{tr("Khung giờ còn phụ thuộc vào lịch đã đặt, bảo trì và trạng thái tài nguyên. Hệ thống kiểm tra lại khi gửi yêu cầu.")}</p>
  </section>;
}
