import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ClipboardList, History, RefreshCw } from "lucide-react";
import { BookingActionModal } from "../../BookingActionModal.js";
import { BaseModal2026 } from "../../BaseModal2026.js";
import { BookingOperationCard } from "./BookingOperationCard.js";
import { BookingWorkflowTimeline } from "./BookingWorkflowTimeline.js";
import {
  cancelOwnBooking,
  getBookingHistory,
  listOperationalBookings,
  performBookingAction
} from "../../../services/bookingOperations.js";
import type {
  BookingAction,
  BookingActionPayload,
  BookingHistoryResponse,
  BookingRecord
} from "../../../types/booking.js";
import "../../../styles/operations.css";

export interface BookingOperationsViewProps {
  user: { id: string; role: string; fullName: string };
  onChanged?: () => void;
  onPayment?: (booking: BookingRecord) => void;
}

type FilterKey = "ALL" | "PENDING_APPROVAL" | "CONFIRMED" | "CHECKED_OUT" | "RETURNED" | "HISTORY";
const FILTER_LABELS: Record<FilterKey, string> = {
  ALL: "Tất cả", PENDING_APPROVAL: "Chờ duyệt", CONFIRMED: "Chờ bàn giao",
  CHECKED_OUT: "Đang sử dụng", RETURNED: "Chờ hoàn tất", HISTORY: "Lịch sử"
};
const HISTORY_STATUSES = new Set(["COMPLETED", "REJECTED", "CANCELLED"]);
const STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "chờ duyệt", CONFIRMED: "đã xác nhận", CHECKED_OUT: "đang sử dụng",
  RETURNED: "đã hoàn trả", COMPLETED: "hoàn tất", REJECTED: "bị từ chối", CANCELLED: "đã hủy"
};

export const BookingOperationsView: React.FC<BookingOperationsViewProps> = ({ user, onChanged, onPayment }) => {
  const isStaff = ["ADMIN", "LAB_STAFF"].includes(user.role);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [filter, setFilter] = useState<FilterKey>(isStaff ? "PENDING_APPROVAL" : "ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState("");
  const [actionState, setActionState] = useState<{ action: BookingAction; booking: BookingRecord } | null>(null);
  const [historyState, setHistoryState] = useState<BookingHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [cancelState, setCancelState] = useState<BookingRecord | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBookings(await listOperationalBookings());
    } catch (requestError: any) {
      setError(requestError?.message || "Không thể tải dữ liệu booking.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);
  useEffect(() => { setFilter(isStaff ? "PENDING_APPROVAL" : "ALL"); }, [isStaff]);

  const counts = useMemo(() => ({
    ALL: bookings.length,
    PENDING_APPROVAL: bookings.filter((b) => b.status === "PENDING_APPROVAL").length,
    CONFIRMED: bookings.filter((b) => b.status === "CONFIRMED").length,
    CHECKED_OUT: bookings.filter((b) => b.status === "CHECKED_OUT").length,
    RETURNED: bookings.filter((b) => b.status === "RETURNED").length,
    HISTORY: bookings.filter((b) => HISTORY_STATUSES.has(b.status)).length
  }), [bookings]);

  const linkedBookingId = new URLSearchParams(window.location.hash.split("?")[1] || "").get("booking");
  const visibleBookings = useMemo(() => {
    if (linkedBookingId) return bookings.filter(b => b.id === linkedBookingId);
    if (filter === "ALL") return bookings;
    if (filter === "HISTORY") return bookings.filter((b) => HISTORY_STATUSES.has(b.status));
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter, linkedBookingId]);

  const filters: FilterKey[] = isStaff
    ? ["PENDING_APPROVAL", "CONFIRMED", "CHECKED_OUT", "RETURNED", "HISTORY", "ALL"]
    : ["ALL", "PENDING_APPROVAL", "CONFIRMED", "CHECKED_OUT", "RETURNED", "HISTORY"];

  async function submitAction(payload: BookingActionPayload) {
    if (!actionState) return;
    setBusyId(actionState.booking.id);
    setError("");
    setSuccess("");
    try {
      const updated = await performBookingAction(actionState.booking.id, actionState.action, payload);
      const warning = updated.physicalStateWarning ? ` ${updated.physicalStateWarning}` : "";
      setSuccess(`Đã cập nhật booking ${updated.resource?.code || updated.id}: ${STATUS_LABELS[updated.status] || updated.status}.${warning}`);
      setActionState(null);
      await loadBookings();
      onChanged?.();
    } finally {
      setBusyId("");
    }
  }

  async function openHistory(booking: BookingRecord) {
    setHistoryLoading(true);
    setHistoryState(null);
    setError("");
    try {
      setHistoryState(await getBookingHistory(booking.id));
    } catch (requestError: any) {
      setError(requestError?.message || "Không thể tải lịch sử booking.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function confirmCancellation() {
    if (!cancelState || busyId) return;
    const booking = cancelState;
    setBusyId(booking.id);
    setError("");
    setSuccess("");
    try {
      const updated = await cancelOwnBooking(booking.id, "Người đặt chủ động hủy booking");
      setSuccess(`Booking đã được hủy (${STATUS_LABELS[updated.status] || updated.status}).`);
      setCancelState(null);
      await loadBookings();
      onChanged?.();
    } catch (requestError: any) {
      setError(requestError?.message || "Không thể hủy booking.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="operations-view" data-testid="operations-view">
      <header className="operations-header">
        <div>
          <h2>{isStaff ? "Vận hành booking & bàn giao tài nguyên" : "Lịch đặt và tiến trình sử dụng của tôi"}</h2>
          <p>{isStaff
            ? "Duyệt yêu cầu → ghi nhận bàn giao → tiếp nhận hoàn trả → hoàn tất lịch đặt."
            : "Theo dõi kết quả duyệt, thời gian sử dụng và lịch sử bàn giao. Bạn có thể hủy lịch còn đủ điều kiện hoặc tự trả phòng LAB đang sử dụng."}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={loadBookings} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Làm mới
        </button>
      </header>


      {error && <div className="alert danger" role="alert"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="alert success" role="status" aria-live="polite">{success}</div>}

      {linkedBookingId && <p>Đang xem lịch đặt từ thông báo. <a href="#/workspace/booking">Xem tất cả lịch đặt</a></p>}
      <nav className="operations-filter-row" aria-label="Bộ lọc workflow booking">
        {filters.map((key) => (
          <button key={key} type="button" className={filter === key ? "is-active" : ""} aria-pressed={filter === key} onClick={() => setFilter(key)}>
            <span>{FILTER_LABELS[key]}</span><strong>{counts[key]}</strong>
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="operations-empty"><RefreshCw size={20} className="animate-spin" /> Đang tải dữ liệu thật...</div>
      ) : error ? (<div className="operations-empty"><strong>Chưa thể tải lịch đặt.</strong><button className="secondary-button" onClick={loadBookings}>Thử lại</button></div>) : visibleBookings.length === 0 ? (
        <div className="operations-empty"><ClipboardList size={22} /><strong>Không có booking trong nhóm này.</strong><span>Chọn nhóm khác để xem các lịch đã lưu.</span></div>
      ) : (
        <div className="operations-list">
          {visibleBookings.map((booking) => (
            <BookingOperationCard
              key={booking.id}
              onPayment={user.role === "ADMIN" || booking.requestedById === user.id ? onPayment : undefined}
              booking={booking}
              isOwner={booking.requestedById === user.id}
              isStaff={isStaff}
              busy={busyId === booking.id}
              onAction={(action, selected) => setActionState({ action, booking: selected })}
              onOpenHistory={openHistory}
              onCancel={!isStaff ? setCancelState : undefined}
            />
          ))}
        </div>
      )}

      {actionState && (
        <BookingActionModal
          isOpen
          action={actionState.action}
          booking={actionState.booking}
          busy={busyId === actionState.booking.id}
          onClose={() => setActionState(null)}
          onConfirm={submitAction}
        />
      )}

      <BaseModal2026
        isOpen={Boolean(cancelState)}
        onClose={() => { if (!busyId) setCancelState(null); }}
        title="Xác nhận hủy booking"
        subtitle={cancelState ? `${cancelState.resource?.code || "Tài nguyên"} · ${cancelState.title}` : ""}
        maxWidth="max-w-md"
        footer={<>
          <button type="button" className="btn btn-secondary" disabled={Boolean(busyId)} onClick={() => setCancelState(null)}>Giữ booking</button>
          <button type="button" className="btn btn-danger" disabled={Boolean(busyId)} onClick={confirmCancellation}>{busyId ? "Đang hủy..." : "Xác nhận hủy"}</button>
        </>}
      >
        <p>Booking sẽ chuyển sang trạng thái đã hủy sau khi hệ thống lưu thành công. Thao tác này không thể hoàn tác từ giao diện.</p>
      </BaseModal2026>

      <BaseModal2026
        isOpen={Boolean(historyState) || historyLoading}
        onClose={() => !historyLoading && setHistoryState(null)}
        title="Lịch sử workflow booking"
        subtitle={historyState ? `${historyState.booking.resource?.code} • ${historyState.booking.title}` : "Đang tải dữ liệu audit..."}
        icon={History}
        maxWidth="max-w-3xl"
      >
        {historyLoading || !historyState
          ? <div className="operations-empty"><RefreshCw size={18} className="animate-spin" /> Đang tải timeline...</div>
          : <BookingWorkflowTimeline booking={historyState.booking} timeline={historyState.timeline} />}
      </BaseModal2026>
    </div>
  );
};
