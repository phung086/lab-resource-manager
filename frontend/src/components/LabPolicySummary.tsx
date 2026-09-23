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
  const unknown = "Chưa có thông tin";
  const duration = (minutes?: number | null) => minutes == null ? unknown : `${minutes} phút`;
  const hours = policy?.workDayStartHour != null && policy?.workDayEndHour != null
    ? `${String(policy.workDayStartHour).padStart(2, "0")}:00 – ${String(policy.workDayEndHour).padStart(2, "0")}:00 (giờ Việt Nam)` : unknown;
  const entries = [
    ["Giờ mở cửa", hours],
    ["Thời lượng tối thiểu", duration(policy?.minBookingMinutes)],
    ["Thời lượng tối đa", duration(policy?.maxBookingMinutes)],
    ["Đặt trước tối đa", policy?.maxAdvanceBookingDays == null ? unknown : `${policy.maxAdvanceBookingDays} ngày`],
    ["Thứ 7 & Chủ Nhật", policy?.allowWeekend == null ? unknown : policy.allowWeekend ? "Cho phép đặt lịch" : "Không cho phép đặt lịch"],
    ["Phê duyệt", requiresApproval == null ? unknown : requiresApproval ? "Cần cán bộ có quyền duyệt" : "Xác nhận khi lịch hợp lệ"],
  ];
  return <section className="lab-policy-summary" aria-label="Chính sách đặt lịch của LAB">
    <h4>Chính sách đặt lịch của LAB</h4>
    <dl>{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p>Khung giờ còn phụ thuộc vào lịch đã đặt, bảo trì và trạng thái tài nguyên. Hệ thống kiểm tra lại khi gửi yêu cầu.</p>
  </section>;
}
