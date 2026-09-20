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
}

type FilterKey = "ALL" | "PENDING_APPROVAL" | "CONFIRMED" | "CHECKED_OUT" | "RETURNED" | "HISTORY";
const FILTER_LABELS: Record<FilterKey, string> = {
  ALL: "Tất cả", PENDING_APPROVAL: "Chờ duyệt", CONFIRMED: "Chờ bàn giao",
  CHECKED_OUT: "Đang sử dụng", RETURNED: "Chờ hoàn tất", HISTORY: "Lịch sử"
};
const HISTORY_STATUSES = new Set(["COMPLETED", "REJECTED", "CANCELLED"]);

export const BookingOperationsView: React.FC<BookingOperationsViewProps> = ({ user, onChanged }) => {
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

  const visibleBookings = useMemo(() => {
    if (filter === "ALL") return bookings;
    if (filter === "HISTORY") return bookings.filter((b) => HISTORY_STATUSES.has(b.status));
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

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
      setSuccess(`Đã cập nhật booking ${updated.resource?.code || updated.id} sang ${updated.status}.${warning}`);
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

  async function cancelBooking(booking: BookingRecord) {
    if (!window.confirm(`Hủy booking “${booking.title}”?`)) return;
    setBusyId(booking.id);
    setError("");
    setSuccess("");
    try {
      const updated = await cancelOwnBooking(booking.id, "Người đặt chủ động hủy booking");
      setSuccess(`Booking đã được hủy (${updated.status}).`);
      await loadBookings();
      onChanged?.();
    } catch (requestError: any) {
      setError(requestError?.message || "Không thể hủy booking.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="operations-view">
      <header className="operations-header">
        <div>
          <span className="operations-kicker">REQUIRED CORE · OPERATIONAL WORKFLOW</span>
          <h2>{isStaff ? "Vận hành booking & bàn giao tài nguyên" : "Lịch đặt và tiến trình sử dụng của tôi"}</h2>
          <p>{isStaff
            ? "Duyệt yêu cầu, bàn giao, tiếp nhận hoàn trả và đóng workflow bằng dữ liệu đã lưu trong PostgreSQL."
            : "Theo dõi trạng thái duyệt, lịch sử bàn giao và tình trạng tài nguyên của các booking thuộc tài khoản hiện tại."}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={loadBookings} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Làm mới
        </button>
      </header>

      {error && <div className="alert danger" role="alert"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="alert success" role="status" aria-live="polite">{success}</div>}

      <nav className="operations-filter-row" aria-label="Bộ lọc workflow booking">
        {filters.map((key) => (
          <button key={key} type="button" className={filter === key ? "is-active" : ""} onClick={() => setFilter(key)}>
            <span>{FILTER_LABELS[key]}</span><strong>{counts[key]}</strong>
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="operations-empty"><RefreshCw size={20} className="animate-spin" /> Đang tải dữ liệu thật...</div>
      ) : visibleBookings.length === 0 ? (
        <div className="operations-empty"><ClipboardList size={22} /><strong>Không có booking trong nhóm này.</strong><span>Dữ liệu sẽ xuất hiện khi có workflow phù hợp với bộ lọc hiện tại.</span></div>
      ) : (
        <div className="operations-list">
          {visibleBookings.map((booking) => (
            <BookingOperationCard
              key={booking.id}
              booking={booking}
              isStaff={isStaff}
              busy={busyId === booking.id}
              onAction={(action, selected) => setActionState({ action, booking: selected })}
              onOpenHistory={openHistory}
              onCancel={!isStaff ? cancelBooking : undefined}
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
