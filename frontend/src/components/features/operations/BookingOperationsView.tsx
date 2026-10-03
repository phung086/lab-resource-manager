import type { LocaleMessage } from "../../../providers/LocaleProvider";
import { translate } from "../../../i18n.js";
import { useLocale } from '../../../providers/LocaleProvider';
import React, { useEffect, useState } from "react";
import { AlertCircle, ClipboardList, History, RefreshCw } from "lucide-react";
import { BookingActionModal } from "../../BookingActionModal.js";
import { BaseModal2026 } from "../../BaseModal2026.js";
import { BookingOperationCard } from "./BookingOperationCard.js";
import { BookingWorkflowTimeline } from "./BookingWorkflowTimeline.js";
import {
  cancelOwnBooking,
  getBookingHistory,
  performBookingAction
} from "../../../services/bookingOperations.js";
import type {
  BookingAction,
  BookingActionPayload,
  BookingHistoryResponse,
  BookingRecord
} from "../../../types/booking.js";
import "../../../styles/operations.css";
import { canOpenBookingAction } from "../../../utils/bookingActions";
import { useQueuePage } from "../../../hooks/useQueuePage";
import { QueuePagination } from "../../base/QueuePagination";
import type { BookingQueueSummary } from "../../../types/queue";

export interface BookingOperationsViewProps {
  user: { id: string; role: string; fullName: string };
  onChanged?: () => void;
  onPayment?: (booking: BookingRecord) => void;
}

type FilterKey = "ALL" | "PENDING_APPROVAL" | "CONFIRMED" | "CHECKED_OUT" | "RETURNED" | "HISTORY";
const FILTER_LABELS: Record<FilterKey, string> = {
  ALL: "ui.all_49c73a31", PENDING_APPROVAL: "ui.pending_approval_6af96613", CONFIRMED: "ui.awaiting_handover_de28611f",
  CHECKED_OUT: "ui.in_use_a07a3647", RETURNED: "ui.awaiting_inspection_cee3e686", HISTORY: "ui.history_0a235708"
};
const routeParams = () => new URLSearchParams(window.location.hash.split("?")[1] || "");
function initialFilter(isStaff: boolean): FilterKey {
  const value = routeParams().get("filter");
  return Object.hasOwn(FILTER_LABELS, value || "") ? value as FilterKey : isStaff ? "PENDING_APPROVAL" : "ALL";
}
const STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "ui.pending_approval_bc216c10", CONFIRMED: "ui.confirmed_0df7ecd4", CHECKED_OUT: "ui.in_use_ee0c455e",
  RETURNED: "ui.returned_ed5e4805", COMPLETED: "ui.completed_13625dbf", REJECTED: "ui.rejected_cb6ec8af", CANCELLED: "ui.cancelled_2cdb07af"
};

export const BookingOperationsView: React.FC<BookingOperationsViewProps> = ({ user, onChanged, onPayment }) => {
  const { tr } = useLocale();
  const isStaff = ["ADMIN", "LAB_STAFF"].includes(user.role);
  const [filter, setFilter] = useState<FilterKey>(() => initialFilter(isStaff));
  const [linkedBookingId, setLinkedBookingId] = useState(() => routeParams().get("booking"));
  const [routeAction, setRouteAction] = useState(() => routeParams().get("action") || "");
  const [error, setError] = useState("");
  const [actionLinkError, setActionLinkError] = useState("");
  const [success, setSuccess] = useState<LocaleMessage>("");
  const [busyId, setBusyId] = useState("");
  const [actionState, setActionState] = useState<{ action: BookingAction; booking: BookingRecord } | null>(null);
  const [historyState, setHistoryState] = useState<BookingHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [cancelState, setCancelState] = useState<BookingRecord | null>(null);

  const queue = useQueuePage<BookingRecord, BookingQueueSummary>("/bookings", filter, `${user.id}:${user.role}`, 20, linkedBookingId);
  const { items: bookings, loading } = queue;
  const loadError = queue.error;
  const loadBookings = () => { setError(""); queue.refresh(); };
  useEffect(() => { setFilter(initialFilter(isStaff)); }, [isStaff]);
  useEffect(() => {
    if (loading || loadError || !routeAction) return;
    const booking = bookings.find(row => row.id === linkedBookingId);
    if (booking && canOpenBookingAction(booking, routeAction, user)) setActionState({ action: routeAction, booking });
    else setActionLinkError("ui.home.route.actionUnavailable");
    setRouteAction("");
  }, [loading, loadError, routeAction, bookings, linkedBookingId, user]);

  function clearRouteAction() {
    const params = routeParams(); params.delete("action");
    window.history.replaceState(null, "", `${window.location.hash.split("?")[0]}${params.size ? `?${params}` : ""}`);
  }
  function selectFilter(key: FilterKey) {
    setFilter(key); setLinkedBookingId(null); setActionLinkError(""); clearRouteAction();
    const params = new URLSearchParams({ filter: key });
    window.history.replaceState(null, "", `${window.location.hash.split("?")[0]}?${params}`);
  }

  const counts = queue.data ? { ...queue.data.summary.byStatus, ALL: queue.data.summary.total, HISTORY: queue.data.summary.history } : null;
  const visibleBookings = bookings;

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
      const warning = updated.physicalStateWarningKey ? { key: updated.physicalStateWarningKey, params: { status: { key: `enum.operational.${updated.physicalStateWarningParams?.status}` } } } : updated.physicalStateWarning || "";
      setSuccess({ key: "ui.booking_updated_6643b95c", params: { value0: updated.resource?.code || updated.id, value1: { key: STATUS_LABELS[updated.status] || updated.status }, value2: warning } });
      setActionState(null);
      clearRouteAction();
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
      setError(requestError?.message || "ui.could_not_load_booking_history_c55f6dd0");
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
      const updated = await cancelOwnBooking(booking.id, tr("ui.booking_cancelled_by_its_owner_4c4bf2b5"));
      setSuccess({ key: "ui.booking_cancelled_c79a4ab7", params: { value0: { key: STATUS_LABELS[updated.status] || updated.status } } });
      setCancelState(null);
      await loadBookings();
      onChanged?.();
    } catch (requestError: any) {
      setError(requestError?.message || "ui.could_not_cancel_the_booking_ac1c23d2");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="operations-view" data-testid="operations-view">
      <header className="operations-header">
        <div>
          <h2>{isStaff ? tr("ui.bookings_resource_handover_824d4680") : tr("ui.my_bookings_usage_448d20e9")}</h2>
          <p>{isStaff
            ? tr("ui.review_requests_record_handover_receive_957f896f")
            : tr("ui.track_approval_usage_times_and_8a2a3e05")}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={loadBookings} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> {tr("ui.refresh_b4c61340")}</button>
      </header>


      {(error || loadError) && <div className="alert danger" role="alert"><AlertCircle size={16} /> {translate(error || loadError)}</div>}
      {actionLinkError && <div className="alert warning" role="alert"><AlertCircle size={16} /> {translate(actionLinkError)}</div>}
      {success && <div className="alert success" role="status" aria-live="polite">{translate(success)}</div>}

      {linkedBookingId && <p>{tr("ui.viewing_the_booking_linked_from_13fda414")}<a href="#/workspace/booking">{tr("ui.view_all_bookings_a9efade5")}</a></p>}
      <nav className="operations-filter-row" aria-label={tr("ui.booking_workflow_filters_65688e95")}>
        {filters.map((key) => (
          <button key={key} type="button" className={filter === key ? "is-active" : ""} aria-pressed={filter === key} onClick={() => selectFilter(key)}>
            <span>{tr(FILTER_LABELS[key])}</span><strong>{counts ? counts[key] || 0 : "—"}</strong>
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="operations-empty"><RefreshCw size={20} className="animate-spin" /> {tr("ui.loading_data_84c68bd5")}</div>
      ) : loadError ? (<div className="operations-empty"><strong>{tr("ui.could_not_load_bookings_82846d8c")}</strong><button className="secondary-button" onClick={loadBookings}>{tr("ui.retry_c58d068c")}</button></div>) : visibleBookings.length === 0 ? (
        <div className="operations-empty"><ClipboardList size={22} /><strong>{tr("ui.no_bookings_in_this_group_1391cc5e")}</strong><span>{tr("ui.choose_another_group_to_view_00eb6689")}</span></div>
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

      {!linkedBookingId && queue.pagination && <QueuePagination pagination={queue.pagination} onPage={queue.setPage} disabled={loading || Boolean(busyId)} />}

      {actionState && (
        <BookingActionModal
          isOpen
          action={actionState.action}
          booking={actionState.booking}
          busy={busyId === actionState.booking.id}
          onClose={() => { setActionState(null); clearRouteAction(); }}
          onConfirm={submitAction}
        />
      )}

      <BaseModal2026
        isOpen={Boolean(cancelState)}
        onClose={() => { if (!busyId) setCancelState(null); }}
        title={tr("ui.confirm_booking_cancellation_2ffe0ef3")}
        subtitle={cancelState ? `${cancelState.resource?.code || tr("ui.resource_9a35ef53")} · ${cancelState.title}` : ""}
        maxWidth="max-w-md"
        footer={<>
          <button type="button" className="btn btn-secondary" disabled={Boolean(busyId)} onClick={() => setCancelState(null)}>{tr("ui.keep_booking_bbac0317")}</button>
          <button type="button" className="btn btn-danger" disabled={Boolean(busyId)} onClick={confirmCancellation}>{busyId ? tr("ui.cancelling_2b9c94bf") : tr("ui.confirm_cancellation_127e2fed")}</button>
        </>}
      >
        <p>{tr("ui.the_booking_will_be_cancelled_8f137b50")}</p>
      </BaseModal2026>

      <BaseModal2026
        isOpen={Boolean(historyState) || historyLoading}
        onClose={() => !historyLoading && setHistoryState(null)}
        title={tr("ui.booking_history_1045c541")}
        subtitle={historyState ? `${historyState.booking.resource?.code} • ${historyState.booking.title}` : tr("ui.loading_audit_history_a0a87a60")}
        icon={History}
        maxWidth="max-w-3xl"
      >
        {historyLoading || !historyState
          ? <div className="operations-empty"><RefreshCw size={18} className="animate-spin" /> {tr("ui.loading_timeline_27459f56")}</div>
          : <BookingWorkflowTimeline booking={historyState.booking} timeline={historyState.timeline} />}
      </BaseModal2026>
    </div>
  );
};
