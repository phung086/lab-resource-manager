import { BookingWaitlist } from '../planning/BookingWaitlist';
import { navigateApp, readRouteParams, workspacePathForTab } from '../../../workspaceRoutes.js';
import { apiRequest } from "../../../api.js";
import type { LocaleMessage } from "../../../providers/LocaleProvider";
import { translate } from "../../../i18n.js";
import { useLocale } from '../../../providers/LocaleProvider';
import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, ClipboardList, History, RefreshCw, X, Clock, FileText } from "lucide-react";
import { BookingActionModal } from "../../BookingActionModal.js";
import { BaseModal2026 } from "../../BaseModal2026.js";
import { BookingOperationCard } from "./BookingOperationCard.js";
import { BookingAccessPanel } from './BookingAccessPanel';
import { BookingPaymentSummary } from '../payments/BookingPaymentSummary';
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
import { formatVietnamDateTime } from "../../../utils/timezone.js";
import { BookingStatusBadge } from "../../BookingStatusBadge.js";
import { BookingRescheduleModal } from "./BookingRescheduleModal";
import { PaymentHoldNotice } from '../payments/PaymentHoldNotice';

export interface BookingOperationsViewProps {
  user: { id: string; role: string; fullName: string };
  onChanged?: () => void;
  onPayment?: (booking: BookingRecord) => void;
}

type FilterKey = 'ALL' | 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'CONFIRMED' | 'CHECKED_OUT' | 'RETURNED' | 'HISTORY';
const FILTER_LABELS: Record<FilterKey, string> = {
  ALL: "ui.all_49c73a31",
  PENDING_PAYMENT: 'ui.paymentHold.pending',
  PENDING_APPROVAL: "ui.pending_approval_6af96613",
  CONFIRMED: "ui.awaiting_handover_de28611f",
  CHECKED_OUT: "ui.in_use_a07a3647",
  RETURNED: "ui.awaiting_inspection_cee3e686",
  HISTORY: "ui.history_0a235708"
};
const routeParams = () => readRouteParams();

function initialFilter(isStaff: boolean): FilterKey {
  const value = routeParams().get("filter");
  return Object.hasOwn(FILTER_LABELS, value || "") ? value as FilterKey : isStaff ? "CONFIRMED" : "ALL";
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "ui.pending_approval_bc216c10",
  CONFIRMED: "ui.confirmed_0df7ecd4",
  CHECKED_OUT: "ui.in_use_ee0c455e",
  RETURNED: "ui.returned_ed5e4805",
  COMPLETED: "ui.completed_13625dbf",
  REJECTED: "ui.rejected_cb6ec8af",
  CANCELLED: "ui.cancelled_2cdb07af"
};

export const BookingOperationsView: React.FC<BookingOperationsViewProps> = ({ user, onChanged, onPayment }) => {
  const { tr } = useLocale();
  const isStaff = ["ADMIN", "LAB_STAFF"].includes(user.role);
  const [filter, setFilter] = useState<FilterKey>(() => initialFilter(isStaff));
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(() => routeParams().get("booking"));
  const [selectedRecord, setSelectedRecord] = useState<BookingRecord | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState("");
  const [selectionRevision, setSelectionRevision] = useState(0);
  const dossierRef = useRef<HTMLDivElement>(null);
  const focusDetail = useRef(Boolean(routeParams().get('booking')));
  const [routeAction, setRouteAction] = useState(() => routeParams().get("action") || "");
  const [error, setError] = useState("");
  const [actionLinkError, setActionLinkError] = useState("");
  const [success, setSuccess] = useState<LocaleMessage | null>(null);
  const [busyId, setBusyId] = useState("");
  const [actionState, setActionState] = useState<{ action: BookingAction; booking: BookingRecord } | null>(null);
  const [historyState, setHistoryState] = useState<BookingHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [cancelState, setCancelState] = useState<BookingRecord | null>(null);

  const queue = useQueuePage<BookingRecord, BookingQueueSummary>("/bookings", filter, `${user.id}:${user.role}`, 20);
  const { items: bookings, loading } = queue;
  const loadError = queue.error;

  const loadBookings = () => { setError(""); queue.refresh(); setSelectionRevision(value => value + 1); };

  useEffect(() => { setFilter(initialFilter(isStaff)); }, [isStaff]);

  useEffect(() => {
    const restoreRoute = () => {
      if (window.location.pathname !== workspacePathForTab("bookings")) return;
      const params = routeParams();
      setFilter(initialFilter(isStaff));
      setSelectedBookingId(params.get("booking"));
      setRouteAction(params.get("action") || "");
      setActionLinkError("");
      focusDetail.current = Boolean(params.get("booking"));
    };
    window.addEventListener("popstate", restoreRoute);
    return () => window.removeEventListener("popstate", restoreRoute);
  }, [isStaff]);

  useEffect(() => {
    if (!selectedBookingId) { setSelectedRecord(null); setSelectedError(""); setSelectedLoading(false); return; }
    const controller = new AbortController();
    setSelectedLoading(true);
    setSelectedError("");
    void apiRequest(`/bookings/${encodeURIComponent(selectedBookingId)}`, { signal: controller.signal })
      .then((record: BookingRecord) => { if (!controller.signal.aborted) setSelectedRecord(record); })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) { setSelectedRecord(null); setSelectedError(requestError instanceof Error ? requestError.message : "api.API_REQUEST_FAILED"); }
      })
      .finally(() => { if (!controller.signal.aborted) setSelectedLoading(false); });
    return () => controller.abort();
  }, [selectedBookingId, selectionRevision]);

  useEffect(() => {
    if (focusDetail.current && selectedRecord?.id === selectedBookingId && !selectedLoading) {
      focusDetail.current = false;
      dossierRef.current?.focus({ preventScroll: true });
      if (window.matchMedia("(max-width: 1000px)").matches) dossierRef.current?.scrollIntoView({ block: "start" });
    }
  }, [selectedRecord, selectedBookingId, selectedLoading]);

  useEffect(() => {
    if (!routeAction || selectedLoading || (selectedBookingId && !selectedRecord && !selectedError)) return;
    const booking = selectedRecord?.id === selectedBookingId ? selectedRecord : null;
    if (booking && canOpenBookingAction(booking, routeAction, user)) {
      setActionState({ action: routeAction, booking });
    } else {
      setActionLinkError("ui.home.route.actionUnavailable");
    }
    setRouteAction("");
  }, [selectedLoading, selectedError, routeAction, selectedRecord, selectedBookingId, user]);

  function clearRouteAction() {
    const params = routeParams();
    params.delete("action");
    navigateApp(workspacePathForTab("bookings", params), { replace: true, notify: false });
  }

  function selectFilter(key: FilterKey) {
    setFilter(key);
    setSelectedBookingId(null);
    setActionLinkError("");
    const params = routeParams();
    params.set("filter", key);
    params.delete("booking");
    params.delete("action");
    navigateApp(workspacePathForTab("bookings", params), { notify: false });
  }

  function selectBooking(booking: BookingRecord) {
    focusDetail.current = true;
    setSelectedRecord(booking);
    setSelectedBookingId(booking.id);
    const params = routeParams();
    params.set("filter", filter);
    params.set("booking", booking.id);
    params.delete("action");
    navigateApp(workspacePathForTab("bookings", params), { notify: false });
  }

  function deselectBooking() {
    const selectedId = selectedBookingId;
    window.requestAnimationFrame(() => {
      const card = document.querySelector<HTMLButtonElement>(`[data-booking-id="${CSS.escape(selectedId || "")}"] .operation-card-select`);
      (card || document.querySelector<HTMLButtonElement>(".operations-filter-btn.is-active"))?.focus();
    });
    setSelectedBookingId(null);
    const params = routeParams();
    params.set("filter", filter);
    params.delete("booking");
    params.delete("action");
    navigateApp(workspacePathForTab("bookings", params), { notify: false });
  }

  const counts = queue.data ? {
    ...queue.data.summary.byStatus,
    PENDING_PAYMENT: queue.data.summary.pendingPayment || 0,
    PENDING_APPROVAL: (queue.data.summary.byStatus.PENDING_APPROVAL || 0) - (queue.data.summary.pendingPayment || 0),
    ALL: queue.data.summary.total,
    HISTORY: queue.data.summary.history
  } : null;

  const selectedBooking = selectedRecord?.id === selectedBookingId ? selectedRecord : null;

  async function submitAction(payload: BookingActionPayload) {
    if (!actionState) return;
    setBusyId(actionState.booking.id);
    setError("");
    setSuccess(null);
    try {
      const updated = await performBookingAction(actionState.booking.id, actionState.action, payload);
      const warning = updated.physicalStateWarningKey
        ? { key: updated.physicalStateWarningKey, params: { status: { key: `enum.operational.${updated.physicalStateWarningParams?.status}` } } }
        : updated.physicalStateWarning || "";
      setSuccess({
        key: "ui.booking_updated_6643b95c",
        params: {
          value0: updated.resource?.code || updated.id,
          value1: { key: STATUS_LABELS[updated.status] || updated.status },
          value2: warning
        }
      });
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
    setSuccess(null);
    try {
      const updated = await cancelOwnBooking(booking.id, tr("ui.booking_cancelled_by_its_owner_4c4bf2b5"));
      setSuccess({
        key: "ui.booking_cancelled_c79a4ab7",
        params: { value0: { key: STATUS_LABELS[updated.status] || updated.status } }
      });
      setCancelState(null);
      await loadBookings();
      onChanged?.();
    } catch (requestError: any) {
      setError(requestError?.message || "ui.could_not_cancel_the_booking_ac1c23d2");
    } finally {
      setBusyId("");
    }
  }

  const filters: FilterKey[] = isStaff
    ? ["CONFIRMED", "CHECKED_OUT", "RETURNED", "HISTORY", "ALL"]
    : ["ALL", "CONFIRMED", "CHECKED_OUT", "RETURNED", "HISTORY"];
  // Existing pending records remain accessible without presenting approval as the new workflow.
  if (filter === 'PENDING_PAYMENT' || (counts?.PENDING_PAYMENT || 0) > 0) filters.push('PENDING_PAYMENT');
  if (filter === 'PENDING_APPROVAL' || (counts?.PENDING_APPROVAL || 0) > 0) filters.push('PENDING_APPROVAL');

  return (
    <div className="operations-view" data-testid="operations-view">
      <BookingWaitlist/>
      <header className="operations-header">
        <div className="operations-header-group">
          <h1>{isStaff ? tr("ui.bookings_and_handover_3e0e5754") : tr("ui.my_bookings_094ca2d9")}</h1>
        </div>
        <button type="button" className="operations-refresh-btn" onClick={loadBookings} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          {tr("ui.refresh_b4c61340")}
        </button>
      </header>

      {(error || loadError) && (
        <div className="operations-alert danger" role="alert">
          <AlertCircle size={16} />
          <span>{translate(error || loadError || "")}</span>
        </div>
      )}
      {actionLinkError && (
        <div className="operations-alert warning" role="alert">
          <AlertCircle size={16} />
          <span>{translate(actionLinkError)}</span>
        </div>
      )}
      {success && (
        <div className="operations-alert success" role="status" aria-live="polite">
          <span>{translate(success)}</span>
        </div>
      )}

      <nav className="operations-filter-row" aria-label={tr("ui.booking_workflow_filters_65688e95")}>
        {filters.map((key) => (
          <button
            key={key}
            type="button"
            className={`operations-filter-btn${filter === key ? " is-active" : ""}`}
            aria-pressed={filter === key}
            onClick={() => selectFilter(key)}
          >
            <span>{tr(FILTER_LABELS[key])}</span>
            <strong>{counts ? counts[key] || 0 : "—"}</strong>
          </button>
        ))}
      </nav>

      <div className="operations-layout">
        {/* Left: Queue */}
        <div className="operations-queue-col">
          <div className="operations-queue-header">
            <span className="operations-queue-title">{tr("ui.home.staff.queueTitle")}</span>
          </div>

          {loading ? (
            <div className="operations-empty">
              <RefreshCw size={20} className="animate-spin" />
              <span>{tr("ui.loading_data_84c68bd5")}</span>
            </div>
          ) : loadError ? (
            <div className="operations-empty">
              <AlertCircle size={20} className="empty-icon" />
              <strong>{tr("ui.could_not_load_bookings_82846d8c")}</strong>
              <button type="button" className="btn" onClick={loadBookings}>
                {tr("ui.retry_c58d068c")}
              </button>
            </div>
          ) : bookings.length === 0 ? (
            <div className="operations-empty">
              <ClipboardList size={22} className="empty-icon" />
              <strong>{tr("ui.no_bookings_in_this_group_1391cc5e")}</strong>
              <span>{tr("ui.choose_another_group_to_view_00eb6689")}</span>
            </div>
          ) : (
            <>
              <div className="operations-list">
                {bookings.map((booking) => (
                  <BookingOperationCard
                    key={booking.id}
                    booking={booking}
                    busy={busyId === booking.id}
                    isSelected={selectedBookingId === booking.id}
                    onSelect={selectBooking}
                  />
                ))}
              </div>
              {queue.pagination && (
                <QueuePagination pagination={queue.pagination} onPage={queue.setPage} disabled={loading || Boolean(busyId)} />
              )}
            </>
          )}
        </div>

        {/* Right: Dossier */}
        <div className="operations-dossier-col" ref={dossierRef} tabIndex={-1} role="region" aria-label={tr("ui.booking_identity_4e5a6b7c")} aria-busy={selectedLoading}>
          {selectedError && <div className="operations-alert danger" role="alert">{translate(selectedError)}<button type="button" className="btn" onClick={() => setSelectionRevision(value => value + 1)}>{tr("ui.retry_c58d068c")}</button></div>}
          {selectedBooking ? (
            <BookingDossier
              booking={selectedBooking}
              user={user}
              isStaff={isStaff}
              busy={busyId === selectedBooking.id || selectedLoading}
              onClose={deselectBooking}
              onRescheduled={() => { loadBookings(); onChanged?.(); }}
              onCancel={!isStaff && selectedBooking.requestedById === user.id ? () => setCancelState(selectedBooking) : undefined}
              onPayment={user.role === "ADMIN" || selectedBooking.requestedById === user.id ? onPayment : undefined}
              onAction={(action) => setActionState({ action, booking: selectedBooking })}
              onOpenHistory={() => openHistory(selectedBooking)}
            />
          ) : (
            <div className="operations-dossier-empty">
              <FileText size={40} />
              <strong>{tr(selectedLoading ? "ui.loading_data_84c68bd5" : "ui.select_a_booking_to_view_its_details_1e3b7f1a")}</strong>

            </div>
          )}
        </div>
      </div>

      {/* Action modal */}
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

      {/* Cancel confirmation modal */}
      <BaseModal2026
        isOpen={Boolean(cancelState)}
        onClose={() => { if (!busyId) setCancelState(null); }}
        title={tr("ui.confirm_booking_cancellation_2ffe0ef3")}
        subtitle={cancelState ? `${cancelState.resource?.code || tr("ui.resource_9a35ef53")} · ${cancelState.title}` : ""}
        maxWidth="max-w-md"
        footer={
          <>
            <button type="button" className="btn btn-secondary" disabled={Boolean(busyId)} onClick={() => setCancelState(null)}>
              {tr("ui.keep_booking_bbac0317")}
            </button>
            <button type="button" className="btn btn-danger" disabled={Boolean(busyId)} onClick={confirmCancellation}>
              {busyId ? tr("ui.cancelling_2b9c94bf") : tr("ui.confirm_cancellation_127e2fed")}
            </button>
          </>
        }
      >
        <p>{tr("ui.the_booking_will_be_cancelled_8f137b50")}</p>
      </BaseModal2026>

      {/* History modal */}
      <BaseModal2026
        isOpen={Boolean(historyState) || historyLoading}
        onClose={() => !historyLoading && setHistoryState(null)}
        title={tr("ui.booking_history_1045c541")}
        subtitle={historyState ? `${historyState.booking.resource?.code} • ${historyState.booking.title}` : tr("ui.loading_audit_history_a0a87a60")}
        icon={History}
        maxWidth="max-w-3xl"
      >
        {historyLoading || !historyState
          ? (
            <div className="operations-empty">
              <RefreshCw size={18} className="animate-spin" />
              <span>{tr("ui.loading_timeline_27459f56")}</span>
            </div>
          )
          : <BookingWorkflowTimeline role={user.role} booking={historyState.booking} timeline={historyState.timeline} />
        }
      </BaseModal2026>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────
   BookingDossier — right panel showing full booking record
   ──────────────────────────────────────────────────────────────────── */
interface BookingDossierProps {
  onRescheduled: () => void;
  booking: BookingRecord;
  user: { id: string; role: string; fullName: string };
  isStaff: boolean;
  busy: boolean;
  onClose: () => void;
  onAction: (action: BookingAction) => void;
  onOpenHistory: () => void;
  onCancel?: () => void;
  onPayment?: (booking: BookingRecord) => void;
}

function BookingDossier({ booking, user, isStaff, busy, onClose, onAction, onOpenHistory, onCancel, onPayment, onRescheduled }: BookingDossierProps) {
  const [moving,setMoving] = useState(false);
  const { tr } = useLocale();
  const isOwner = booking.requestedById === user.id;
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    if (!isStaff || booking.status !== 'CONFIRMED') return;
    const timer = setInterval(() => setCurrentTime(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [isStaff, booking.status]);
  const availableAt = Date.parse(booking.startAt) - 30 * 60000;
  const handoverInWindow = currentTime >= availableAt && currentTime < Date.parse(booking.endAt);

  const staffActions: Array<{ action: BookingAction; label: string; primary?: boolean }> = [];
  if (isStaff && booking.status === "PENDING_APPROVAL") {
    staffActions.push({ action: "APPROVE", label: "ui.final.approve", primary: true });
    staffActions.push({ action: "REJECT", label: "ui.reject_b61a0ebc" });
  }
  if (isStaff && booking.status === "CONFIRMED") {
    staffActions.push({ action: "CHECK_OUT", label: "ui.final.handover", primary: true });
  }
  if (isStaff && booking.status === "CHECKED_OUT") {
    staffActions.push({ action: "RETURN", label: "ui.receive_return_e099755c", primary: true });
  }
  if (isStaff && booking.status === "RETURNED") {
    staffActions.push({ action: "COMPLETE", label: "ui.fulfillment.inspectionComplete", primary: true });
  }

  return (
    <>
      <header className="operations-dossier-header">
        <div className="operations-dossier-title-group">
          <h2>{booking.resource?.name || booking.title}</h2>
          <p>{booking.title}</p>
          <p>{formatVietnamDateTime(booking.startAt)} – {formatVietnamDateTime(booking.endAt)}</p>
          <BookingStatusBadge status={booking.status} paymentDueAt={booking.paymentDueAt} />
        </div>
        <button
          type="button"
          className="operations-dossier-close"
          onClick={onClose}
          aria-label={tr("ui.close_details_7a1c2e3d")}
        >
          <X size={16} />
        </button>
      </header>

      {isOwner && onPayment && Boolean(booking.feeAmountVnd) && <BookingPaymentSummary key={`payment-${booking.id}`} booking={booking} user={user} onPayment={onPayment} />}
      {isOwner && <BookingAccessPanel key={`access-${booking.id}`} bookingId={booking.id} status={booking.status} category={booking.resource?.category} onChanged={onRescheduled} />}

      {/* Identity */}
      <details className="operations-dossier-section">
        <summary className="operations-dossier-section-title">{tr("ui.booking_identity_4e5a6b7c")}</summary>
        <div className="operations-dossier-field-grid">
          <div>
            <span className="field-label">{tr("ui.booking_id_8a9b0c1d")}</span>
            <span className="field-value small">{booking.id}</span>
          </div>
          <div>
            <span className="field-label">{tr("ui.status_e4f6a7b8")}</span>
            <BookingStatusBadge status={booking.status} paymentDueAt={booking.paymentDueAt} />
          </div>
          <div>
            <span className="field-label">{tr("ui.resource_code_2c3d4e5f")}</span>
            <span className="operation-resource-code">{booking.resource?.code || "—"}</span>
          </div>
          <div>
            <span className="field-label">{tr("ui.resource_9a35ef53")}</span>
            <span className="field-value">{booking.resource?.name || "—"}</span>
          </div>
        </div>
      </details>

      {/* Requester & time */}
      <section className="operations-dossier-section">
        <h3 className="operations-dossier-section-title">{tr("ui.requester_and_time_a1b2c3d4")}</h3>
        <div className="operations-dossier-field-grid">
          {booking.contactSnapshot?.phone && <div><span className="field-label">{tr("ui.contact_phone_3b6da57f")}</span><a className="field-value" href={"tel:"+booking.contactSnapshot.phone}>{booking.contactSnapshot.phone}</a></div>}
          <div>
            <span className="field-label">{tr("ui.booked_by_0600af3f")}</span>
            <span className="field-value">{booking.contactSnapshot?.fullName || booking.requestedBy?.fullName || "—"}</span>
          </div>
          <div>
            <span className="field-label">{tr("ui.role_7a8b9c0d")}</span>
            <span className="field-value small">{booking.requestedBy?.role ? tr(`core.roles.${({ ADMIN: "admin", LAB_STAFF: "lab_staff", CUSTOMER: "customer" } as Record<string, string>)[booking.requestedBy.role] || "customer"}`) : "—"}</span>
          </div>
          <div>
            <span className="field-label">{tr("ui.start_time_5e6f7a8b")}</span>
            <span className="field-value small">{booking.startAt ? formatVietnamDateTime(booking.startAt) : "—"}</span>
          </div>
          <div>
            <span className="field-label">{tr("ui.end_time_9c8d7e6f")}</span>
            <span className="field-value small">{booking.endAt ? formatVietnamDateTime(booking.endAt) : "—"}</span>
          </div>
          <div>
            <span className="field-label">{tr("ui.lab_room_34bf22b1")}</span>
            <span className="field-value">{booking.resource?.laboratory?.name || tr("ui.not_assigned_ebe3cb5d")}</span>
          </div>
          <div>
            <span className="field-label">{tr("ui.lab_code_1a2b3c4d")}</span>
            <span className="field-value small">{booking.resource?.laboratory?.code || "—"}</span>
          </div>
        </div>
      </section>

      {/* Purpose & prerequisites */}
      <details className="operations-dossier-section">
        <summary className="operations-dossier-section-title">{tr("ui.purpose_1b2c3d4e")}</summary>
        <div className="operations-dossier-field-grid">
          <div style={{ gridColumn: "1 / -1" }}>
            <span className="field-label">{tr("ui.purpose_1b2c3d4e")}</span>
            <span className="field-value">{booking.purpose || "—"}</span>
          </div>
        </div>
      </details>

      {/* Physical evidence */}
      {(booking.handoverCondition || booking.returnCondition || booking.actualStartAt || booking.actualEndAt) && (
        <section className="operations-dossier-section">
          <h3 className="operations-dossier-section-title">{tr("ui.physical_evidence_c1d2e3f4")}</h3>
          <div className="operations-dossier-field-grid">
            {booking.handoverCondition && (
              <div>
                <span className="field-label">{tr("ui.condition_before_use_282cd45b")}</span>
                <span className="field-value small">{booking.handoverCondition}</span>
                {booking.actualStartAt && (
                  <span className="field-value small" style={{ color: "var(--mint)" }}>
                    <Clock size={11} style={{ display: "inline", verticalAlign: "middle" }} />{" "}
                    {tr("ui.handover_3c0bcaae")} {formatVietnamDateTime(booking.actualStartAt)}
                  </span>
                )}
              </div>
            )}
            {booking.returnCondition && (
              <div>
                <span className="field-label">{tr("ui.condition_after_use_ad476ecd")}</span>
                <span className="field-value small">{booking.returnCondition}</span>
                {booking.actualEndAt && (
                  <span className="field-value small" style={{ color: "var(--mint)" }}>
                    <Clock size={11} style={{ display: "inline", verticalAlign: "middle" }} />{" "}
                    {tr("ui.return_ed612db7")} {formatVietnamDateTime(booking.actualEndAt)}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Physical state warning */}
      {booking.physicalStateWarning && (
        <section className="operations-dossier-section">
          <div className="operations-state-warning">
            <AlertCircle size={14} />
            <span>
              {booking.physicalStateWarningKey
                ? tr(booking.physicalStateWarningKey, { status: { key: `enum.operational.${booking.physicalStateWarningParams?.status}` } })
                : booking.physicalStateWarning
              }
            </span>
          </div>
        </section>
      )}

      {/* Fee */}
      {!isOwner && Boolean(booking.feeAmountVnd) && (user.role === 'ADMIN' && onPayment ? <BookingPaymentSummary key={`admin-payment-${booking.id}`} booking={booking} user={user} onPayment={onPayment} /> : <section className="operations-dossier-section"><strong>{tr('ui.agreed_usage_fee_38f5f31a')} {booking.feeAmountVnd?.toLocaleString('vi-VN')} {tr('ui.vnd_bf502a39')}</strong></section>)}

      {/* Actions */}
      {booking.status === 'PENDING_APPROVAL' && booking.paymentDueAt && <PaymentHoldNotice paymentDueAt={booking.paymentDueAt} startAt={booking.startAt} onExpired={onRescheduled} />}
      {isStaff && booking.fulfillmentSnapshot && <section className="operations-dossier-section"><h3>{tr('ui.fulfillment.title')}</h3><p>{tr(booking.fulfillmentSnapshot.mode === 'HOME_DELIVERY' ? 'ui.fulfillment.homeDelivery' : booking.fulfillmentSnapshot.mode === 'ROOM_SELF_SERVICE' ? 'ui.fulfillment.roomAccess' : 'ui.fulfillment.labPickup')}</p><p>{booking.fulfillmentSnapshot.address?.fullAddress || booking.fulfillmentSnapshot.pickupInstructions}</p>{booking.contactSnapshot && <p>{booking.contactSnapshot.fullName} · {booking.contactSnapshot.phone}</p>}</section>}
      <div className="operations-dossier-actions">
        {isStaff && booking.status === 'CONFIRMED' && !handoverInWindow && <p role="status">{currentTime < availableAt ? tr('ui.fulfillment.checkInAt', { time: formatVietnamDateTime(new Date(availableAt).toISOString()) }) : tr('api.BOOKING_HANDOVER_EXPIRED')}</p>}
        {isStaff && booking.status === "CONFIRMED" && <button type="button" className="btn btn-secondary" disabled={busy} onClick={()=>setMoving(true)}>{tr("ui.rental.moveBooking")}</button>}
        {moving && <BookingRescheduleModal key={booking.id} booking={booking} onClose={()=>setMoving(false)} onSaved={onRescheduled}/>}
        {staffActions.filter(({ action }) => canOpenBookingAction(booking, action, user)).map(({ action, label }) => (
          <button
            key={action}
            type="button"
            className={`btn ${action === "REJECT" ? "btn-danger" : action === "APPROVE" || action === "CHECK_OUT" || action === "RETURN" || action === "SELF_RETURN" || action === "COMPLETE" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => onAction(action)}
            disabled={busy || (action === 'CHECK_OUT' && !handoverInWindow)}
          >
            {tr(label)}
          </button>
        ))}
        {onCancel && ["PENDING_APPROVAL", "CONFIRMED"].includes(booking.status) && <button type="button" className="btn btn-danger" onClick={onCancel} disabled={busy}>{tr("ui.cancel_booking_c68ed93d")}</button>}
        <span className="operation-actions-spacer" aria-hidden="true" />
        <button type="button" className="btn btn-secondary" onClick={onOpenHistory} disabled={busy}>
          <History size={15} />
          {tr("ui.history_0a235708")}
        </button>
      </div>
    </>
  );
}
