import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, ShieldCheck } from "lucide-react";
import { BaseModal2026 } from "./BaseModal2026";
import type { BookingAction, BookingActionPayload, BookingRecord } from "../types/booking.js";

export interface BookingActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: BookingAction;
  booking: BookingRecord;
  onConfirm: (payload: BookingActionPayload) => Promise<void> | void;
  busy?: boolean;
}

const ACTION_COPY: Record<BookingAction, { title: string; submit: string; hint: string }> = {
  APPROVE: { title: "Duyệt yêu cầu đặt lịch", submit: "Duyệt booking", hint: "Xác nhận booking sau khi đã kiểm tra lịch và điều kiện sử dụng." },
  REJECT: { title: "Từ chối yêu cầu đặt lịch", submit: "Xác nhận từ chối", hint: "Lý do từ chối được lưu vào lịch sử và hiển thị cho người đặt." },
  CHECK_OUT: { title: "Bàn giao tài nguyên", submit: "Xác nhận bàn giao", hint: "Ghi nhận tình trạng thực tế trước khi người dùng nhận tài nguyên." },
  RETURN: { title: "Tiếp nhận hoàn trả tài nguyên", submit: "Xác nhận hoàn trả", hint: "Ghi nhận tình trạng thực tế của tài nguyên tại thời điểm nhận lại." },
  COMPLETE: { title: "Hoàn tất hồ sơ booking", submit: "Hoàn tất workflow", hint: "Hoàn tất hồ sơ sau khi đã đối soát việc bàn giao và hoàn trả." }
};

const CONDITION_SUGGESTIONS = [
  "Ngoại quan nguyên vẹn",
  "Phụ kiện được kiểm đếm đầy đủ",
  "Không phát hiện bất thường khi kiểm tra cơ bản"
];

export const BookingActionModal: React.FC<BookingActionModalProps> = ({
  isOpen, onClose, action, booking, onConfirm, busy = false
}) => {
  const [reason, setReason] = useState("");
  const [condition, setCondition] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setCondition("");
      setError("");
    }
  }, [isOpen, action, booking?.id]);

  const copy = ACTION_COPY[action];
  const conditionField = action === "CHECK_OUT" ? "conditionBefore" : action === "RETURN" ? "conditionAfter" : null;
  const reasonRequired = action === "REJECT";
  const subtitle = useMemo(() => `${booking?.resource?.code || "Tài nguyên"} • ${booking?.title || "Booking"}`, [booking]);

  if (!isOpen || !booking) return null;

  function addSuggestion(value: string) {
    setCondition((current) => current.trim() ? `${current.trim()}; ${value}` : value);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedReason = reason.trim();
    const normalizedCondition = condition.trim();

    if (reasonRequired && !normalizedReason) {
      setError("Vui lòng nhập lý do từ chối.");
      return;
    }
    if (conditionField && !normalizedCondition) {
      setError(action === "CHECK_OUT"
        ? "Vui lòng ghi nhận tình trạng tài nguyên trước khi bàn giao."
        : "Vui lòng ghi nhận tình trạng tài nguyên sau khi hoàn trả.");
      return;
    }

    const payload: BookingActionPayload = {};
    if (normalizedReason) payload.reason = normalizedReason;
    if (conditionField === "conditionBefore") payload.conditionBefore = normalizedCondition;
    if (conditionField === "conditionAfter") payload.conditionAfter = normalizedCondition;

    setError("");
    try {
      await onConfirm(payload);
    } catch (requestError: any) {
      setError(requestError?.message || "Không thể thực hiện thao tác. Vui lòng kiểm tra và thử lại.");
    }
  }

  return (
    <BaseModal2026
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={copy.title}
      subtitle={subtitle}
      icon={ClipboardCheck}
      iconColor="text-blue-400"
      maxWidth="max-w-xl"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Hủy</button>
          <button type="submit" form="booking-operation-form" className={`btn ${action === "REJECT" ? "btn-danger" : "btn-primary"}`} disabled={busy}>
            <CheckCircle2 size={15} />
            <span>{busy ? "Đang lưu..." : copy.submit}</span>
          </button>
        </>
      }
    >
      <form id="booking-operation-form" onSubmit={submit} className="booking-operation-form" noValidate>
        <div className="operation-modal-resource">
          <div>
            <span className="operation-resource-code">{booking.resource?.code}</span>
            <strong>{booking.resource?.name}</strong>
          </div>
          <ShieldCheck size={18} aria-hidden="true" />
        </div>

        <p className="operation-modal-hint">{copy.hint}</p>
        {action === "RETURN" && booking.handoverCondition && <p className="operation-modal-hint">Tình trạng khi bàn giao: {booking.handoverCondition}</p>}
        {error && <div className="alert danger" role="alert">{error}</div>}

        {(action === "APPROVE" || action === "REJECT" || action === "COMPLETE") && (
          <label className="operation-field">
            <span>{action === "REJECT" ? "Lý do từ chối *" : "Ghi chú / lý do"}</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={action === "REJECT" ? "Nêu rõ lý do để người đặt có thể hiểu và xử lý tiếp." : "Ghi chú vận hành (không bắt buộc)"}
              maxLength={1000}
              required={reasonRequired}
              autoFocus
            />
          </label>
        )}

        {conditionField && (
          <div className="operation-field">
            <label htmlFor="booking-condition-evidence">
              {action === "CHECK_OUT" ? "Tình trạng trước khi sử dụng *" : "Tình trạng sau khi sử dụng *"}
            </label>
            <textarea
              id="booking-condition-evidence"
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
              placeholder="Mô tả những gì cán bộ lab thực tế quan sát/kiểm tra. Không chọn sẵn kết luận."
              maxLength={2000}
              required
            />
            <div className="operation-suggestion-row" aria-label="Gợi ý nhập nhanh, chưa được xác nhận">
              {CONDITION_SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} type="button" className="operation-suggestion" onClick={() => addSuggestion(suggestion)}>
                  + {suggestion}
                </button>
              ))}
            </div>
            <small>Các gợi ý chỉ hỗ trợ nhập liệu và không được xem là kết quả kiểm tra cho đến khi cán bộ xác nhận.</small>
          </div>
        )}
      </form>
    </BaseModal2026>
  );
};
