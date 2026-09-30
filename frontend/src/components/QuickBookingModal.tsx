import type { LocaleMessage } from "../providers/LocaleProvider";
import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React, { useState, useEffect } from "react";
import { Calendar, AlertCircle, CheckCircle2, ArrowRight, ShieldAlert, Shield, RefreshCw } from "lucide-react";
import { BaseModal2026 } from "./BaseModal2026.js";
import { LabPolicySummary } from "./LabPolicySummary";
import { apiRequest, ApiError } from "../api.js";
import {
  toVietnamDateString,
  toVietnamTimeString,
  vietnamTimeToIso,
  getVietnamTomorrowDateString
} from "../utils/timezone.js";

export interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSlot?: {
    resourceId?: string;
    startAt?: string;
    endAt?: string;
    date?: string;
    time?: string;
    resourceName?: string;
  } | null;
  resources?: Array<{
    id: string;
    name: string;
    code: string;
    subtype?: string;
    type?: string;
    requiresApproval?: boolean;
    effectiveRequiresApproval?: boolean;
    operationalStatus?: string;
    labPolicy?: any;
    laboratory?: {
      id?: string;
      name?: string;
      code?: string;
      labPolicy?: any;
    };
  }>;
  onConfirmBooking?: (booking: any) => void;
  onViewBookings?: () => void;
  onProceedPayment?: (booking: any) => void;
}

export const QuickBookingModal: React.FC<QuickBookingModalProps> = ({
  isOpen,
  onClose,
  initialSlot,
  resources: passedResources,
  onConfirmBooking,
  onViewBookings,
  onProceedPayment
}) => {
  const { tr } = useLocale();
  const [resources, setResources] = useState<any[]>(passedResources || []);
  const [loadingResources, setLoadingResources] = useState(passedResources === undefined);
  const [resourceError, setResourceError] = useState("");
  const [resourceRetry, setResourceRetry] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [resourceId, setResourceId] = useState("");
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<LocaleMessage>("");
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [purposeCode, setPurposeCode] = useState("");
  const [quote, setQuote] = useState<any>(null);
  const [quoteError, setQuoteError] = useState("");
  const [pricingLoaded, setPricingLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setPricingRules([]); setPurposeCode(""); setQuote(null); setPricingLoaded(false);
    if (isOpen && resourceId) apiRequest(`/booking-pricing/${encodeURIComponent(resourceId)}`)
      .then(rows => { if (active) { setPricingRules(rows); setPurposeCode(rows[0]?.purposeCode || ""); setPricingLoaded(true); } })
      .catch(e => { if (active) setQuoteError(e.message); });
    return () => { active = false; };
  }, [isOpen, resourceId]);

  const quoteKey = `${resourceId}|${purposeCode}|${selectedDate}|${startTime}|${endTime}`;
  useEffect(() => {
    let active = true;
    setQuote(null); setQuoteError("");
    if (!isOpen || !resourceId || !selectedDate || !pricingLoaded || (pricingRules.length > 0 && !purposeCode)) return;
    const timer = setTimeout(async () => {
      try {
        const result = await apiRequest("/booking-pricing/quote", { method: "POST", body: JSON.stringify({ resourceId, ...(purposeCode ? { purposeCode } : {}), startAt: vietnamTimeToIso(selectedDate, startTime), endAt: vietnamTimeToIso(selectedDate, endTime) }) });
        if (active) setQuote({ ...result, key: quoteKey });
      } catch (e: any) { if (active) setQuoteError(e.message || "ui.could_not_calculate_the_fee_f0898d04"); }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [isOpen, resourceId, purposeCode, selectedDate, startTime, endTime, pricingLoaded, pricingRules.length, quoteKey, tr]);

  // Load resources if not passed or empty
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setResourceError("");

    if (passedResources !== undefined) {
      setResources(passedResources);
      setLoadingResources(false);
      if (passedResources.length > 0) {
        const initialRes = passedResources.find((r) => r.id === initialSlot?.resourceId) || passedResources[0];
        if (initialRes) setResourceId(initialRes.id);
      } else {
        setResourceId("");
      }
    } else {
      setLoadingResources(true);
      apiRequest("/resources")
        .then((data) => {
          if (!active) return;
          const list = Array.isArray(data) ? data : data.items || [];
          setResources(list);
          if (list.length > 0) {
            const initialRes = list.find((r: any) => r.id === initialSlot?.resourceId) || list[0];
            if (initialRes) setResourceId(initialRes.id);
          } else {
            setResourceId("");
          }
        })
        .catch((err) => {
          if (!active) return;
          setResourceError(err?.message || "ui.could_not_load_resources_426a56ac");
          console.error("Failed to load resources in modal", err);
          setResources([]);
          setResourceId("");
        })
        .finally(() => {
          if (active) setLoadingResources(false);
        });
    }
    return () => { active = false; };
  }, [passedResources, isOpen, initialSlot?.resourceId, resourceRetry]);

  // Handle initialSlot prepopulation
  useEffect(() => {
    if (!isOpen) return;

    if (initialSlot?.startAt) {
      const slotDate = toVietnamDateString(initialSlot.startAt);
      const slotStart = toVietnamTimeString(initialSlot.startAt);
      if (slotDate) setSelectedDate(slotDate);
      if (slotStart) setStartTime(slotStart);

      if (initialSlot.endAt) {
        const slotEnd = toVietnamTimeString(initialSlot.endAt);
        if (slotEnd) setEndTime(slotEnd);
      } else {
        const [h, m] = slotStart.split(":").map(Number);
        const endH = String(Math.min((h || 9) + 2, 21)).padStart(2, "0");
        setEndTime(`${endH}:${String(m || 0).padStart(2, "0")}`);
      }
    } else if (initialSlot?.date) {
      setSelectedDate(initialSlot.date);
      if (initialSlot.time) {
        setStartTime(initialSlot.time);
        const [h, m] = initialSlot.time.split(":").map(Number);
        const endH = String(Math.min((h || 9) + 2, 21)).padStart(2, "0");
        setEndTime(`${endH}:${String(m || 0).padStart(2, "0")}`);
      }
    } else {
      setSelectedDate(getVietnamTomorrowDateString());
      setStartTime("09:00");
      setEndTime("11:00");
    }

    if (initialSlot?.resourceId) {
      setResourceId(initialSlot.resourceId);
    }

    setErrorMessage("");
    setShowSuccess(false);
    setCreatedBooking(null);
  }, [initialSlot, isOpen]);

  if (!isOpen) return null;

  const currentResource = resources.find((r) => r.id === resourceId) || null;
  const currentPolicy = currentResource?.labPolicy || currentResource?.laboratory?.labPolicy || null;

  const effectiveRequiresApproval = Boolean(
    currentResource?.effectiveRequiresApproval ??
    (currentResource?.requiresApproval || currentPolicy?.requiresApproval)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!quote || quote.key !== quoteKey) { setErrorMessage("ui.wait_for_the_fee_to_e7e5a7f0"); return; }
    setErrorMessage("");

    if (!resourceId || !resources.some((r) => r.id === resourceId)) {
      setErrorMessage("ui.choose_a_laboratory_resource_88e754b2");
      return;
    }
    if (!selectedDate || !startTime || !endTime) {
      setErrorMessage("ui.enter_a_date_and_time_72a12ba5");
      return;
    }

    let startAtIso: string;
    let endAtIso: string;
    try {
      startAtIso = vietnamTimeToIso(selectedDate, startTime);
      endAtIso = vietnamTimeToIso(selectedDate, endTime);
    } catch {
      setErrorMessage("ui.invalid_date_or_time_e55672a4");
      return;
    }

    const startAt = new Date(startAtIso);
    const endAt = new Date(endAtIso);

    if (startAt >= endAt) {
      setErrorMessage("ui.start_time_must_be_before_fe9fe060");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        resourceId,
        title: title.trim() || translate("ui.booking_1ca81eb4", { value0: currentResource?.name || tr("ui.resource_9a35ef53") }),
        purpose: purpose.trim() || tr("ui.research_laboratory_practice_c62c993a"),
        ...(purposeCode ? { purposeCode } : {}),
        acceptedQuote: { amountVnd: quote.amountVnd, version: quote.version },
        startAt: startAtIso,
        endAt: endAtIso
      };

      const booking = await apiRequest("/bookings", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setCreatedBooking(booking);
      setShowSuccess(true);

      if (onConfirmBooking) {
        onConfirmBooking(booking);
      }
      if (booking.feeAmountVnd > 0 && booking.status === "CONFIRMED" && onProceedPayment) {
        onProceedPayment(booking);
      }
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || tr("ui.could_not_create_the_booking_ead473e4");
      if (err?.code === "BOOKING_CONFLICT") {
        setErrorMessage("ui.booking_conflict_this_time_slot_13af8e52");
      } else if (err?.code === "MAINTENANCE_CONFLICT" || err?.code === "CALIBRATION_CONFLICT") {
        setErrorMessage("ui.this_resource_has_maintenance_or_2b9a78e7");
      } else if (err?.code === "POLICY_VIOLATION") {
        setErrorMessage({ key: "ui.policy_violation_63125cb4", params: { value0: { key: msg } } });
      } else if (err?.code === "RESOURCE_UNAVAILABLE") {
        setErrorMessage("ui.this_resource_is_offline_or_595adcc9");
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <BaseModal2026
      isOpen={isOpen}
      onClose={onClose}
      dismissible={!isSubmitting}
      title={tr("ui.book_a_laboratory_resource_e409608d")}
      subtitle={tr("ui.availability_is_checked_when_your_ab603059")}
      icon={Calendar}
      iconColor="text-blue-600"
      maxWidth="max-w-xl"
      footer={
        showSuccess ? (
          <div className="w-full flex items-center justify-between">
            <span className="text-xs text-secondary font-medium">
              {tr("ui.review_your_booking_details_above_6cfb4be1")}</span>
            {onViewBookings && <button className="secondary-button" type="button" onClick={onViewBookings}>{tr("ui.view_my_bookings_7130520e")}</button>}
            <button
              id="booking-success-close-btn"
              type="button"
              onClick={onClose}
              className="booking-modal-complete-button"
            >
              {tr("ui.completed_b0484236")}</button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-secondary booking-modal-secondary-button"
            >
              {tr("ui.close_5d54c2a1")}</button>
            <button
              type="submit"
              form="quick-booking-form"
              disabled={isSubmitting || loadingResources || resources.length === 0 || !resourceId || !quote || quote.key !== quoteKey}
              className="btn btn-primary text-xs px-5 py-2.5 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isSubmitting ? tr("ui.submitting_abf01d43") : tr("ui.confirm_booking_f6a19e97")}</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </>
        )
      }
    >
      {showSuccess ? (
        /* Persisted success confirmation */
        <div className="booking-success-panel" role="status">
          <div className="booking-success-header">
            <CheckCircle2 size={28} className="booking-success-icon" aria-hidden="true" />
            <div>
              <h4 className="booking-success-title">{tr("ui.booking_saved_a4789b57")}</h4>
              <p className="booking-success-desc">
                {createdBooking?.status === "CONFIRMED"
                  ? tr("ui.your_booking_has_been_automatically_4e5eb482")
                  : tr("ui.your_request_is_saved_and_3cb1a789")}
              </p>
            </div>
          </div>

          <div className="booking-success-details">
            <div className="booking-detail-row">
              <span className="booking-detail-label">{tr("ui.status_cb31de81")}</span>
              <span
                id="created-booking-status"
                className={`booking-status-chip ${
                  createdBooking?.status === "CONFIRMED" ? "is-confirmed" : "is-pending"
                }`}
              >
                {createdBooking?.status === "CONFIRMED" ? tr("ui.immediate_confirmation_11e1e39e") : tr("ui.pending_approval_9aa55303")}
              </span>
            </div>
            <div className="booking-detail-row">
              <span className="booking-detail-label">{tr("ui.resource_9a35ef53")}</span>
              <span className="booking-detail-value">{currentResource?.name} ({currentResource?.code})</span>
            </div>
            <div className="booking-detail-row">
              <span className="booking-detail-label">{tr("ui.time_b295fd62")}</span>
              <span className="booking-detail-value font-mono">{selectedDate} · {startTime} – {endTime}</span>
            </div>
            {createdBooking?.id && (
              <div className="booking-detail-row border-top">
                <span className="booking-detail-label">{tr("ui.booking_reference_e80792a6")}</span>
                <span className="booking-detail-value font-mono text-muted">{createdBooking.id}</span>
              </div>
            )}
          </div>
          {createdBooking?.feeAmountVnd > 0 && <div className="alert"><p>{tr("ui.agreed_fee_e147e0c0")}{createdBooking.feeAmountVnd.toLocaleString("vi-VN")} {tr("ui.vnd_789721c8")}{createdBooking.status === "PENDING_APPROVAL" ? tr("ui.payment_is_created_after_staff_0ff3ea14") : tr("ui.complete_payment_before_handover_94ef0241")}</p>{onProceedPayment && <button type="button" className="secondary-button" onClick={() => onProceedPayment(createdBooking)}>{tr("ui.view_booking_payment_3a007567")}</button>}</div>}
        </div>
      ) : (
        <form id="quick-booking-form" onSubmit={handleSubmit} className="booking-form">
          {errorMessage && (
            <div className="alert danger" role="alert">
              <AlertCircle size={15} className="shrink-0" aria-hidden="true" />
              <span>{translate(errorMessage)}</span>
            </div>
          )}

          {/* Resource Selector */}
          <div className="booking-field">
            <label htmlFor="booking-resource-select" className="booking-label">
              <span>{tr("ui.equipment_laboratory_room_769c1b5b")}<span aria-hidden="true">*</span></span>
              {currentResource && (
                effectiveRequiresApproval ? (
                  <span className="booking-approval-badge is-required">
                    <ShieldAlert size={11} aria-hidden="true" /> {tr("ui.approval_required_dc95ee8f")}</span>
                ) : (
                  <span className="booking-approval-badge is-instant">
                    <Shield size={11} aria-hidden="true" /> {tr("ui.immediate_confirmation_6313fc02")}</span>
                )
              )}
            </label>
            {loadingResources ? (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                <RefreshCw size={13} className="animate-spin text-blue-600" />
                <span>{tr("ui.loading_resources_0e955376")}</span>
              </div>
            ) : resourceError ? (<div className="alert danger" role="alert"><span>{translate(resourceError)}</span><button className="secondary-button" type="button" onClick={() => setResourceRetry(value => value + 1)}>{tr("ui.retry_c58d068c")}</button></div>) : resources.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex flex-col gap-1">
                <span className="font-semibold flex items-center gap-1">
                  <AlertCircle size={13} /> {tr("ui.no_resources_available_05ba9825")}</span>
                <span>{tr("ui.an_active_room_or_equipment_108e5f2b")}</span>
              </div>
            ) : (
              <select
                id="booking-resource-select"
                aria-label={tr("ui.choose_a_resource_1ba6fed9")}
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                required
              >
                {!resourceId && (
                  <option value="">{tr("ui.choose_a_laboratory_resource_027a2e88")}</option>
                )}
                {resources.map((r) => {
                  const rApproval = Boolean(
                    r.effectiveRequiresApproval ??
                    (r.requiresApproval || r.laboratory?.labPolicy?.requiresApproval || r.labPolicy?.requiresApproval)
                  );
                  return (
                    <option key={r.id} value={r.id}>
                      {r.code} — {r.name}{rApproval ? tr("ui.approval_required_b136f084") : tr("ui.immediate_e80f0a67")}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Booking Title */}
          <div className="booking-field">
            <label htmlFor="booking-title" className="booking-label">
              {tr("ui.session_title_87c59f6e")}<span aria-hidden="true">*</span>
            </label>
            <input
              id="booking-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tr("ui.example_circuit_measurements_robotics_practical_24f8cb43")}
            />
          </div>

          {/* Purpose */}
          {pricingRules.length > 0 && <label className="booking-field">{tr("ui.pricing_purpose_f1a0b490")}<select value={purposeCode} onChange={e => setPurposeCode(e.target.value)}>{pricingRules.map(rule => <option key={rule.id} value={rule.purposeCode}>{rule.label} — {rule.hourlyRateVnd.toLocaleString("vi-VN")} {tr("ui.vnd_hour_c2aca1ee")}</option>)}</select></label>}
          <div className="alert" aria-live="polite">{quoteError ? <span role="alert">{translate(quoteError)}</span> : quote?.key === quoteKey ? <span>{tr("ui.usage_fee_10b23fee")}<strong>{quote.amountVnd.toLocaleString("vi-VN")} {tr("ui.vnd_bf502a39")}</strong>{quote.amountVnd > 0 ? tr("ui.pay_after_confirmation_and_before_2effbba2") : tr("ui.no_payment_required_a44e1364")}</span> : tr("ui.updating_usage_fee_be66cd3f")}</div>
          <div className="booking-field">
            <label htmlFor="booking-purpose" className="booking-label">
              {tr("ui.usage_purpose_701ce708")}</label>
            <textarea
              id="booking-purpose"
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder={tr("ui.describe_your_purpose_project_course_ca281177")}
            />
          </div>

          {/* Date and Time Grid */}
          <div className="booking-time-grid">
            <div className="booking-field">
              <label htmlFor="booking-date" className="booking-label">
                {tr("ui.booking_date_502b0188")}<span aria-hidden="true">*</span>
              </label>
              <input
                id="booking-date"
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="booking-field">
              <label htmlFor="booking-start-time" className="booking-label">
                {tr("ui.start_time_ca61f785")}<span aria-hidden="true">*</span>
              </label>
              <input
                id="booking-start-time"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="booking-field">
              <label htmlFor="booking-end-time" className="booking-label">
                {tr("ui.end_time_dd727a0c")}<span aria-hidden="true">*</span>
              </label>
              <input
                id="booking-end-time"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <p className="booking-review-note">{tr("ui.times_are_in_vietnam_time_bccdbeb2")}{effectiveRequiresApproval ? tr("ui.your_request_will_await_lab_3a2ae485") : tr("ui.your_booking_will_be_confirmed_67024f75")}</p>
          <LabPolicySummary policy={currentPolicy} requiresApproval={currentResource ? effectiveRequiresApproval : undefined} />
        </form>
      )}
    </BaseModal2026>
  );
};
