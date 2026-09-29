import { useLocale } from '../providers/LocaleProvider';
import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Archive, Wrench } from "lucide-react";

import { BaseModal2026 } from "./BaseModal2026";

export interface ResourceStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource?: any;
  statuses: string[];
  initialStatus?: string;
  destructive?: boolean;
  onConfirm: (status: string, reason: string) => Promise<void>;
}

const labels: Record<string, string> = {
  AVAILABLE: "Sẵn sàng",
  IN_USE: "Đang sử dụng",
  MAINTENANCE: "Bảo trì",
  CALIBRATION: "Hiệu chuẩn",
  BROKEN: "Hỏng",
  RETIRED: "Ngừng khai thác",
  OFFLINE: "Ngoại tuyến"
};
const reasonRequired = new Set(["MAINTENANCE", "CALIBRATION", "BROKEN", "RETIRED", "OFFLINE"]);

export const ResourceStatusModal: React.FC<ResourceStatusModalProps> = ({
  isOpen,
  onClose,
  resource,
  statuses,
  initialStatus,
  destructive = false,
  onConfirm
}) => {
  const { tr } = useLocale();
  const [targetStatus, setTargetStatus] = useState(initialStatus || statuses[0] || "AVAILABLE");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetStatus(initialStatus || statuses.find((status) => status !== resource?.operationalStatus) || statuses[0] || "AVAILABLE");
      setReason("");
      setError("");
    }
  }, [isOpen, initialStatus, resource?.id]);

  if (!isOpen || !resource) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (reasonRequired.has(targetStatus) && reason.trim().length < 3) {
      setError(tr("Vui lòng nhập lý do cụ thể, tối thiểu 3 ký tự."));
      window.setTimeout(() => errorRef.current?.focus(), 0);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onConfirm(targetStatus, reason.trim());
    } catch (requestError: any) {
      setError(requestError?.message || tr("Không thể cập nhật trạng thái tài nguyên."));
      window.setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      setBusy(false);
    }
  }

  return (
    <BaseModal2026
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={destructive ? tr("Ngừng khai thác tài nguyên") : tr("Cập nhật trạng thái vận hành")}
      subtitle={`${resource.code} · ${resource.name}`}
      icon={destructive ? Archive : Wrench}
      iconColor={destructive ? "text-rose-400" : "text-amber-400"}
      maxWidth="max-w-lg"
      footer={
        <>
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>{tr("Hủy")}</button>
          <button type="submit" form="resource-status-form" className={destructive ? "danger-button" : "primary-button"} disabled={busy || targetStatus === resource.operationalStatus}>
            {busy ? tr("Đang lưu...") : destructive ? tr("Xác nhận ngừng khai thác") : tr("Lưu trạng thái")}
          </button>
        </>
      }
    >
      {error && <div ref={errorRef} tabIndex={-1} className="alert danger" role="alert"><AlertTriangle size={15} aria-hidden="true" /> {error}</div>}
      <form id="resource-status-form" className="booking-form" onSubmit={submit}>
        <label htmlFor="resource-target-status">
          <span>{tr("Trạng thái mới")}</span>
          <select id="resource-target-status" value={targetStatus} onChange={(event) => setTargetStatus(event.target.value)} disabled={destructive}>
            {statuses.map((status) => <option key={status} value={status}>{labels[status] || status}</option>)}
          </select>
        </label>
        <label htmlFor="resource-status-reason">
          <span>{tr("Lý do")}{reasonRequired.has(targetStatus) ? "*" : tr("(không bắt buộc)")}</span>
          <textarea
            id="resource-status-reason"
            rows={4}
            maxLength={500}
            required={reasonRequired.has(targetStatus)}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={destructive ? tr("Nêu căn cứ ngừng khai thác; dữ liệu lịch sử sẽ được giữ nguyên.") : tr("Mô tả nguyên nhân hoặc quyết định vận hành.")}
          />
        </label>
        {destructive && <p className="resource-destructive-note">{tr("Tài nguyên sẽ không bị xóa. Booking, bảo trì, sự cố và nhật ký hiện có vẫn được bảo toàn.")}</p>}
      </form>
    </BaseModal2026>
  );
};
