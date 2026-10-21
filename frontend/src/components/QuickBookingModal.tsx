import '../styles/calendar-workspace.css';
import { BookingAvailabilityHelp } from './features/planning/BookingAvailabilityHelp';
import type { LocaleMessage } from "../providers/LocaleProvider";
import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React, { useState, useEffect, useRef } from "react";
import { Calendar, AlertCircle, CheckCircle2, ArrowRight, ShieldAlert, Shield, RefreshCw } from "lucide-react";
import { BaseModal2026 } from "./BaseModal2026.js";
import { LabPolicySummary } from "./LabPolicySummary";
import { QuoteDiscountSummary } from "./features/payments/QuoteDiscountSummary";
import { PaymentHoldNotice } from './features/payments/PaymentHoldNotice';
import { VietnamAddressSelector } from './VietnamAddressSelector';
import "../styles/loyalty-account.css";
import { bookingNoticeSatisfied, minimumBookingNotice, type BookingNoticePolicy } from '../utils/bookingNotice';
import { apiRequest, ApiError } from "../api.js";
import {
  toVietnamDateString,
  toVietnamTimeString,
  vietnamTimeToIso,
  getVietnamTodayDateString,
  getVietnamTomorrowDateString
} from "../utils/timezone.js";

function bookingTimeErrors(date: string, start: string, end: string, policy?: BookingNoticePolicy | null): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!date) errors['booking-date'] = 'ui.enter_a_date_and_time_72a12ba5';
  if (!start) errors['booking-start-time'] = 'ui.enter_start_and_end_times_dd573c8f';
  if (!end) errors['booking-end-time'] = 'ui.enter_start_and_end_times_dd573c8f';
  if (Object.keys(errors).length) return errors;
  try {
    const startIso = vietnamTimeToIso(date, start);
    const endIso = vietnamTimeToIso(date, end);
    if (toVietnamDateString(startIso) !== date || toVietnamTimeString(startIso) !== start || toVietnamTimeString(endIso) !== end) {
      errors['booking-date'] = 'ui.invalid_date_or_time_e55672a4';
    } else if (date < getVietnamTodayDateString()) {
      errors['booking-date'] = 'ui.the_booking_date_cannot_be_f83fc184';
    } else if (new Date(startIso).getTime() <= Date.now()) {
      errors['booking-start-time'] = 'ui.calendarWorkspace.futureTime';
    } else if (new Date(startIso).getTime() >= new Date(endIso).getTime()) {
      errors['booking-end-time'] = 'ui.start_time_must_be_before_fe9fe060';
    } else if (!bookingNoticeSatisfied(startIso, policy)) {
      errors['booking-start-time'] = 'ui.bookingNotice.tooSoon';
    }
  } catch {
    errors['booking-date'] = 'ui.invalid_date_or_time_e55672a4';
  }
  return errors;
}

export type BookingDraft = { date: string; start: string; end: string; title: string; purpose: string; purposeCode: string };
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
    title?: string;
    purpose?: string;
    purposeCode?: string;
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
  initialDraft?: BookingDraft;
  onDraftChange?: (draft: BookingDraft) => void;
  onQuoteChanged?: (quote: { amountVnd: number; version: string } | null) => void;
  onAttempt?: () => void;
  onBookingError?: (message: LocaleMessage, uncertain: boolean) => void;
}

export const QuickBookingModal: React.FC<QuickBookingModalProps> = ({
  isOpen,
  onClose,
  initialSlot,
  resources: passedResources,
  onConfirmBooking,
  onViewBookings,
  onProceedPayment,
  initialDraft, onDraftChange, onQuoteChanged, onAttempt, onBookingError
}) => {
  const { tr } = useLocale();
  const [contact, setContact] = useState({ fullName: '', phone: '' });
  const [deliveryMode, setDeliveryMode] = useState('LAB_PICKUP');
  const [deliveryAddress, setDeliveryAddress] = useState({ addressLine: '', provinceCode: '', wardCode: '' });
  const [deliveryLabels, setDeliveryLabels] = useState({ provinceName: '', wardName: '' });
  const [fulfillment, setFulfillment] = useState<{ category: string; deliveryAllowed: boolean } | null>(null);
  const [contactLoading, setContactLoading] = useState(true), [contactError, setContactError] = useState(''), [contactRetry, setContactRetry] = useState(0);
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController(); setContactLoading(true); setContactError('');
    apiRequest('/auth/me', { signal: controller.signal }).then(user => { if (!controller.signal.aborted) setContact({ fullName: user.fullName || '', phone: user.phone || '' }); })
      .catch(cause => { if (!controller.signal.aborted) setContactError(cause.message || 'ui.customer.contactLoadFailed'); })
      .finally(() => { if (!controller.signal.aborted) setContactLoading(false); });
    return () => controller.abort();
  }, [isOpen, contactRetry]);
  const [resources, setResources] = useState<any[]>(passedResources || []);
  const [loadingResources, setLoadingResources] = useState(passedResources === undefined);
  const [resourceError, setResourceError] = useState("");
  const [resourceRetry, setResourceRetry] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [resourceId, setResourceId] = useState("");
  useEffect(() => {
    setFulfillment(null); setDeliveryMode('LAB_PICKUP');
    if (!isOpen || !resourceId) return;
    const controller = new AbortController();
    apiRequest(`/resources/${encodeURIComponent(resourceId)}/fulfillment`, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setFulfillment(value); }).catch(() => { /* Delivery stays unavailable; normal LAB booking remains usable. */ });
    return () => controller.abort();
  }, [isOpen, resourceId]);
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionUncertain, setSubmissionUncertain] = useState(false);
  const submittingRef=useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<LocaleMessage>("");
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [purposeCode, setPurposeCode] = useState("");
  const [quote, setQuote] = useState<any>(null);
  const [quoteError, setQuoteError] = useState("");
  const [pricingLoaded, setPricingLoaded] = useState(false);
  const [pricingRetry, setPricingRetry] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [review, setReview] = useState<{ key: string; checkedAt: number; refreshed: boolean } | null>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const bookingField = (id: string) => formRef.current?.querySelector<HTMLElement>('[id="' + id + '"]');
  const reviewKey = JSON.stringify([resourceId, selectedDate, startTime, endTime, title, purpose, purposeCode, contact, deliveryMode, deliveryAddress, quote?.version, quote?.amountVnd, quote?.loyaltyPolicyVersion]);
  const reviewing = review?.key === reviewKey;
  useEffect(() => { if (!isOpen) setReview(null); }, [isOpen]);
  useEffect(() => { if (reviewing) reviewHeading.current?.focus(); }, [reviewing]);
  const currentResource = resources.find((r) => r.id === resourceId) || null;
  const currentPolicy = currentResource?.labPolicy || currentResource?.laboratory?.labPolicy || null;
  const timeErrors = bookingTimeErrors(selectedDate, startTime, endTime, currentPolicy);
  const timeIsValid = Object.keys(timeErrors).length === 0;

  useEffect(() => {
    let active = true;
    setPricingRules([]); setPurposeCode(""); setQuote(null); setPricingLoaded(false); setQuoteError("");
    if (isOpen && resourceId) apiRequest(`/booking-pricing/${encodeURIComponent(resourceId)}`)
      .then(rows => { if (active) {
        const desired = initialDraft?.purposeCode || initialSlot?.purposeCode;
        setPricingRules(rows);
        setPurposeCode(desired && rows.some((row: any) => row.purposeCode === desired) ? desired : initialSlot?.purposeCode ? "" : rows[0]?.purposeCode || "");
        setPricingLoaded(true);
      } })
      .catch(e => { if (active) setQuoteError(e.message); });
    return () => { active = false; };
  }, [isOpen, resourceId, pricingRetry, initialDraft, initialSlot?.purposeCode]);

  const quoteKey = `${resourceId}|${purposeCode}|${selectedDate}|${startTime}|${endTime}`;
  useEffect(() => {
    let active = true;
    setQuote(null); setQuoteError("");
    if (!isOpen || !resourceId || !selectedDate || !timeIsValid || !pricingLoaded || (pricingRules.length > 0 && !purposeCode)) return;
    const timer = setTimeout(async () => {
      try {
        const result = await apiRequest("/booking-pricing/quote", { method: "POST", body: JSON.stringify({ resourceId, ...(purposeCode ? { purposeCode } : {}), startAt: vietnamTimeToIso(selectedDate, startTime), endAt: vietnamTimeToIso(selectedDate, endTime) }) });
        if (active) setQuote({ ...result, key: quoteKey });
      } catch (e: any) { if (active) setQuoteError(e.message || "ui.could_not_calculate_the_fee_f0898d04"); }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [isOpen, resourceId, purposeCode, selectedDate, startTime, endTime, pricingLoaded, pricingRules.length, quoteKey, timeIsValid]);

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

  useEffect(() => {
    if (isOpen && selectedDate) onDraftChange?.({ date: selectedDate, start: startTime, end: endTime, title, purpose, purposeCode });
  }, [isOpen, selectedDate, startTime, endTime, title, purpose, purposeCode, onDraftChange]);
  useEffect(() => {
    onQuoteChanged?.(quote?.key === quoteKey ? { amountVnd: quote.amountVnd, version: quote.version } : null);
  }, [quote, quoteKey, onQuoteChanged]);

  // Handle initialSlot prepopulation
  useEffect(() => {
    if (!isOpen) return;

    if (initialDraft) {
      setSelectedDate(initialDraft.date); setStartTime(initialDraft.start); setEndTime(initialDraft.end);
      setTitle(initialDraft.title); setPurpose(initialDraft.purpose);
    } else if (initialSlot?.startAt) {
      setTitle(initialSlot.title || ""); setPurpose(initialSlot.purpose || "");
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
    setFieldErrors({});
    setShowSuccess(false);
    setCreatedBooking(null);
    setSubmissionUncertain(false);
  }, [initialSlot, isOpen, initialDraft]);

  if (!isOpen) return null;


  const effectiveRequiresApproval = false;

  const validateFields = (): Record<string, string> => {
    const errors = bookingTimeErrors(selectedDate, startTime, endTime, currentPolicy);
    if (!contact.fullName.trim()) errors['booking-contact-name'] = 'ui.customer.nameRequired';
    else if (contact.fullName.trim().length < 2 || contact.fullName.trim().length > 255) errors['booking-contact-name'] = 'ui.customer.nameInvalid';
    if (!contact.phone.trim()) errors['booking-contact-phone'] = 'ui.customer.phoneRequired';
    else if (!/^(?:0\d{9}|\+[1-9]\d{7,14})$/.test(contact.phone.trim())) errors['booking-contact-phone'] = 'ui.customer.phoneInvalid';
    if (!resourceId || !resources.some(r => r.id === resourceId)) errors['booking-resource-select'] = 'ui.choose_a_laboratory_resource_88e754b2';
    if (title.trim().length < 2 || title.trim().length > 255) errors['booking-title'] = 'ui.calendarWorkspace.titleLength';
    if (purpose.trim().length > 2000) errors['booking-purpose'] = 'ui.calendarWorkspace.purposeLength';
    if (deliveryMode === 'HOME_DELIVERY') {
      if (!deliveryAddress.provinceCode) errors['address-province'] = 'ui.fulfillment.addressRequired';
      if (!deliveryAddress.wardCode) errors['address-ward'] = 'ui.fulfillment.addressRequired';
      if (deliveryAddress.addressLine.trim().length < 5) errors['address-line'] = 'ui.fulfillment.addressRequired';
    }
    return errors;
  };
  const validateField = (id: string) => {
    const next = validateFields();
    setFieldErrors(previous => { const updated = { ...previous }; if (next[id]) updated[id] = next[id]; else delete updated[id]; return updated; });
  };
  const clearFieldError = (id: string) => {
    setFieldErrors(previous => { const updated = { ...previous }; delete updated[id]; return updated; });
  };
  const fieldFeedback = (id: string) => fieldErrors[id] && <p className="booking-field-error" id={id + '-error'}>{tr(fieldErrors[id])}</p>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current || submissionUncertain || contactLoading || contactError) return;
    const errors = validateFields();
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setReview(null);
      setErrorMessage('');
      requestAnimationFrame(() => bookingField(Object.keys(errors)[0])?.focus());
      return;
    }
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
    let requestStarted = false;
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

    submittingRef.current=true;
    setIsSubmitting(true);

    try {
      const payload = {
        resourceId,
        contact: { fullName: contact.fullName.trim(), phone: contact.phone.trim() },
        ...(fulfillment?.category !== 'ROOM' && fulfillment ? { fulfillment: { mode: deliveryMode, ...(deliveryMode === 'HOME_DELIVERY' ? { address: deliveryAddress } : {}) } } : {}),
        title: title.trim() || translate("ui.booking_1ca81eb4", { value0: currentResource?.name || tr("ui.resource_9a35ef53") }),
        purpose: purpose.trim() || tr("ui.research_laboratory_practice_c62c993a"),
        ...(purposeCode ? { purposeCode } : {}),
        acceptedQuote: { amountVnd: quote.amountVnd, version: quote.version, loyaltyPolicyVersion: quote.loyaltyPolicyVersion },
        startAt: startAtIso,
        endAt: endAtIso
      };

      if (!reviewing || Date.now() - review!.checkedAt >= 60000) {
        const preflight = await apiRequest('/bookings/preflight', { method: 'POST', body: JSON.stringify({ resourceId,
          startAt: startAtIso, endAt: endAtIso, ...(purposeCode ? { purposeCode } : {}) }) });
        if (preflight.ready !== true || !preflight.quote) throw new Error('api.DATA_UNAVAILABLE');
        setQuote({ ...preflight.quote, key: quoteKey });
        const nextKey = JSON.stringify([resourceId, selectedDate, startTime, endTime, title, purpose, purposeCode, contact, deliveryMode, deliveryAddress, preflight.quote.version, preflight.quote.amountVnd, preflight.quote.loyaltyPolicyVersion]);
        setReview({ key: nextKey, checkedAt: Date.now(), refreshed: Boolean(reviewing) });
        return;
      }

      onAttempt?.();
      requestStarted = true;
      const booking = await apiRequest("/bookings", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (!booking?.id || booking.resourceId !== resourceId || !["CONFIRMED", "PENDING_APPROVAL"].includes(booking.status)) {
        throw new Error("ui.resourceSelection.uncertain");
      }

      setCreatedBooking(booking);
      setShowSuccess(true);

      if (onConfirmBooking) {
        onConfirmBooking(booking);
      }
      if (booking.feeAmountVnd > 0 && (booking.paymentDueAt || booking.status === 'CONFIRMED') && onProceedPayment) {
        onProceedPayment(booking);
      }
    } catch (err: any) {
      setReview(null);
      const msg = err instanceof ApiError ? err.message : err?.message || tr("ui.could_not_create_the_booking_ead473e4");
      const uncertain = requestStarted && (!(err instanceof ApiError) || err.status === 0 || err.status === 408 || err.status >= 500);
      setSubmissionUncertain(uncertain);
      onBookingError?.(msg, uncertain);
      if (err?.code === 'BOOKING_CONTACT_REQUIRED' || err?.code === 'VALIDATION_ERROR') {
        const mapped: Record<string,string> = {};
        const fields: Record<string,string> = { fullName: 'booking-contact-name', phone: 'booking-contact-phone', addressLine: 'address-line', provinceCode: 'address-province', wardCode: 'address-ward', title: 'booking-title', purpose: 'booking-purpose', resourceId: 'booking-resource-select', startAt: 'booking-start-time', endAt: 'booking-end-time' };
        for (const [field,id] of Object.entries(fields)) if (err.details?.fieldErrors?.[field]?.length || err.details?.field === field) mapped[id] = field === 'fullName' ? 'ui.customer.nameInvalid' : field === 'phone' ? 'ui.customer.phoneInvalid' : 'ui.auth_check_field';
        // Zod nests contact errors under the contact object.
        for (const issue of err.details?.issues || []) {
          if (issue.field === 'contact.fullName') mapped['booking-contact-name'] = 'ui.customer.nameInvalid';
          if (issue.field === 'contact.phone') mapped['booking-contact-phone'] = 'ui.customer.phoneInvalid';
          const addressFields: Record<string,string> = { 'fulfillment.address.addressLine': 'address-line', 'fulfillment.address.provinceCode': 'address-province', 'fulfillment.address.wardCode': 'address-ward' };
          if (addressFields[issue.field]) mapped[addressFields[issue.field]] = 'ui.fulfillment.addressRequired';
        }
        setFieldErrors(mapped); requestAnimationFrame(() => bookingField(Object.keys(mapped)[0])?.focus()); setErrorMessage(mapped && Object.keys(mapped).length ? '' : msg);
      } else if (err?.code === "BOOKING_CONFLICT") {
        setErrorMessage("ui.booking_conflict_this_time_slot_13af8e52");
      } else if (err?.code === "MAINTENANCE_CONFLICT" || err?.code === "CALIBRATION_CONFLICT") {
        setErrorMessage("ui.this_resource_has_maintenance_or_2b9a78e7");
      } else if (err?.code === "POLICY_VIOLATION") {
        setErrorMessage({ key: "ui.policy_violation_63125cb4", params: { value0: { key: msg } } });
      } else if (err?.code === "RESOURCE_UNAVAILABLE") {
        setErrorMessage("ui.this_resource_is_offline_or_595adcc9");
      } else if (uncertain) {
        setErrorMessage("ui.resourceSelection.uncertain");
      } else {
        setErrorMessage(msg);
      }
    } finally {
      submittingRef.current=false;
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
              {tr("ui.close_5d54c2a1")}</button>
          </div>
        ) : (
          <>
            {submissionUncertain && onViewBookings && <button type="button" className="secondary-button" onClick={onViewBookings}>{tr("ui.view_my_bookings_7130520e")}</button>}
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
              disabled={contactLoading || !!contactError || submissionUncertain || isSubmitting || loadingResources || resources.length === 0 || !resourceId || !quote || quote.key !== quoteKey}
              className="btn btn-primary text-xs px-5 py-2.5 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{tr(isSubmitting ? 'ui.submitting_abf01d43' : !reviewing ? 'ui.bookingReview.check' : quote?.amountVnd > 0 ? 'ui.paymentHold.reserve' : 'ui.confirm_booking_f6a19e97')}</span>
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
              <h4 className="booking-success-title">{tr(createdBooking?.paymentDueAt ? 'ui.paymentHold.pending' : 'ui.booking_saved_a4789b57')}</h4>
              <p className="booking-success-desc">
                {createdBooking?.status === "CONFIRMED"
                  ? tr("ui.your_booking_has_been_automatically_4e5eb482")
                  : tr(createdBooking?.paymentDueAt ? 'ui.paymentHold.rule' : 'ui.your_request_is_saved_and_3cb1a789')}
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
                {tr(createdBooking?.paymentDueAt ? 'ui.paymentHold.pending' : createdBooking?.status === 'CONFIRMED' ? 'ui.immediate_confirmation_11e1e39e' : 'ui.pending_approval_9aa55303')}
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
          {createdBooking?.paymentDueAt && <PaymentHoldNotice paymentDueAt={createdBooking.paymentDueAt} startAt={createdBooking.startAt} />}
          {createdBooking?.feeAmountVnd > 0 && <div className="alert"><p>{tr('ui.agreed_fee_e147e0c0')}{createdBooking.feeAmountVnd.toLocaleString('vi-VN')} {tr('ui.vnd_789721c8')}</p>{onProceedPayment && <button type="button" className="secondary-button" onClick={() => onProceedPayment(createdBooking)}>{tr('ui.view_booking_payment_3a007567')}</button>}</div>}
        </div>
      ) : (
        <form ref={formRef} id="quick-booking-form" onSubmit={handleSubmit} className="booking-form booking-workspace" noValidate>
          {reviewing && <section className="booking-review" aria-labelledby="booking-review-heading">
            <h3 id="booking-review-heading" tabIndex={-1} ref={reviewHeading}>{tr('ui.bookingReview.title')}</h3>
            <p>{tr('ui.bookingReview.checked')}</p>
            {review?.refreshed && <p role="status">{tr('ui.bookingReview.refreshed')}</p>}
            <dl><dt>{tr('ui.resource_9a35ef53')}</dt><dd>{currentResource?.name} · {currentResource?.code}</dd>
              <dt>{tr('ui.time_b295fd62')}</dt><dd>{selectedDate} · {startTime}–{endTime} {tr('ui.timezoneVietnam')}</dd>
              <dt>{tr('ui.session_title_87c59f6e')}</dt><dd>{title}</dd>
              <dt>{tr('ui.customer.contactTitle')}</dt><dd>{contact.fullName} · {contact.phone}</dd>
              <dt>{tr('ui.fulfillment.receiveMethod')}</dt><dd>{tr(deliveryMode === 'HOME_DELIVERY' ? 'ui.fulfillment.homeDelivery' : 'ui.fulfillment.labPickup')}{deliveryMode === 'HOME_DELIVERY' && ` · ${[deliveryAddress.addressLine, deliveryLabels.wardName, deliveryLabels.provinceName].filter(Boolean).join(', ')}`}</dd>
              <dt>{tr('ui.usage_fee_10b23fee')}</dt><dd>{quote.amountVnd.toLocaleString('vi-VN')} {tr('ui.vnd_bf502a39')}</dd></dl>
            <QuoteDiscountSummary quote={quote} />
            <p>{tr(quote.amountVnd > 0 ? 'ui.paymentHold.rule' : 'ui.bookingReview.free')}</p>
            <p>{tr('ui.bookingReview.next')}</p>
            <button type="button" className="btn btn-secondary" disabled={isSubmitting} onClick={() => { setReview(null); requestAnimationFrame(() => bookingField('booking-contact-name')?.focus()); }}>{tr('ui.bookingReview.edit')}</button>
          </section>}
          <fieldset className="booking-edit-fields" hidden={reviewing} disabled={isSubmitting} aria-label={tr('ui.bookingReview.edit')}>
          <fieldset className="booking-contact" disabled={isSubmitting || contactLoading}><legend>{tr('ui.customer.contactTitle')}</legend>
            {contactLoading && <p role="status">{tr('ui.loading_42d77f3a')}</p>}
            {contactError && <p role="alert">{tr(contactError)} <button type="button" onClick={()=>setContactRetry(value=>value+1)}>{tr('ui.retry_c58d068c')}</button></p>}
            <div className="booking-contact-grid">{[{field:'fullName',id:'booking-contact-name',label:'ui.full_name_03de764f',type:'text',auto:'name',max:255},{field:'phone',id:'booking-contact-phone',label:'ui.customer.phoneLabel',type:'tel',auto:'tel',max:20}].map(item=><div key={item.id} className="booking-field"><label htmlFor={item.id} className="booking-label">{tr(item.label)}</label><input id={item.id} className="booking-input" type={item.type} autoComplete={item.auto} required maxLength={item.max} value={contact[item.field as keyof typeof contact]} aria-invalid={!!fieldErrors[item.id]} aria-describedby={fieldErrors[item.id]?item.id+'-error':undefined} onBlur={()=>validateField(item.id)} onChange={event=>{setContact(value=>({...value,[item.field]:event.target.value}));clearFieldError(item.id);}} />{fieldFeedback(item.id)}</div>)}</div>
          </fieldset>
          {Object.keys(fieldErrors).length > 0 && <div className="booking-error-summary" role="alert"><strong>{tr("ui.calendarWorkspace.checkFields")}</strong><ul>{Object.entries(fieldErrors).map(([id, key]) => <li key={id}><button type="button" onClick={() => bookingField(id)?.focus()}>{tr(key)}</button></li>)}</ul></div>}
          {errorMessage && (
            <div className="alert danger" role="alert">
              <AlertCircle size={15} className="shrink-0" aria-hidden="true" />
              <span>{translate(errorMessage)}</span>
            </div>
          )}

          {errorMessage && timeIsValid && resourceId && !submissionUncertain && <BookingAvailabilityHelp key={quoteKey} resourceId={resourceId} startAt={vietnamTimeToIso(selectedDate, startTime)} endAt={vietnamTimeToIso(selectedDate, endTime)} purposeCode={purposeCode} onChoose={(date, start, end) => { setSelectedDate(date); setStartTime(start); setEndTime(end); setReview(null); setErrorMessage(''); }}/>}
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
                onChange={(e) => { setResourceId(e.target.value); clearFieldError("booking-resource-select"); }}
                onBlur={() => validateField("booking-resource-select")}
                aria-invalid={Boolean(fieldErrors["booking-resource-select"])}
                aria-describedby={fieldErrors["booking-resource-select"] ? "booking-resource-select-error" : undefined}
                required
              >
                {!resourceId && (
                  <option value="">{tr("ui.choose_a_laboratory_resource_027a2e88")}</option>
                )}
                {resources.map((r) => {
                  const rApproval = false;
                  return (
                    <option key={r.id} value={r.id}>
                      {r.code} — {r.name}{rApproval ? tr("ui.approval_required_b136f084") : tr("ui.immediate_e80f0a67")}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {fieldFeedback("booking-resource-select")}

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
                min={getVietnamTodayDateString()}
                onChange={(e) => { setSelectedDate(e.target.value); clearFieldError("booking-date"); clearFieldError("booking-start-time"); }}
                onBlur={() => validateField("booking-date")}
                aria-invalid={Boolean(fieldErrors["booking-date"])}
                aria-describedby={fieldErrors["booking-date"] ? "booking-date-error" : undefined}
              />
              {fieldFeedback("booking-date")}
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
                onChange={(e) => { setStartTime(e.target.value); clearFieldError("booking-start-time"); clearFieldError("booking-end-time"); }}
                onBlur={() => validateField("booking-start-time")}
                aria-invalid={Boolean(fieldErrors["booking-start-time"])}
                aria-describedby={'booking-notice-hint' + (fieldErrors["booking-start-time"] ? ' booking-start-time-error' : '')}
              />
              {fieldFeedback("booking-start-time")}
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
                onChange={(e) => { setEndTime(e.target.value); clearFieldError("booking-end-time"); }}
                onBlur={() => validateField("booking-end-time")}
                aria-invalid={Boolean(fieldErrors["booking-end-time"])}
                aria-describedby={fieldErrors["booking-end-time"] ? "booking-end-time-error" : undefined}
              />
              {fieldFeedback("booking-end-time")}
            </div>
          </div>

          <p id="booking-notice-hint" className="booking-review-note">{tr('ui.bookingNotice.hint', { minutes: minimumBookingNotice(currentPolicy) })}</p>
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
              minLength={2}
              maxLength={255}
              onChange={(e) => { setTitle(e.target.value); clearFieldError("booking-title"); }}
              onBlur={() => validateField("booking-title")}
              aria-invalid={Boolean(fieldErrors["booking-title"])}
              aria-describedby={fieldErrors["booking-title"] ? "booking-title-error" : undefined}
            />
          </div>

          {fieldFeedback("booking-title")}

          {/* Purpose */}
          {pricingRules.length > 0 && new Set(pricingRules.map(rule => rule.hourlyRateVnd)).size > 1 && <label className="booking-field">{tr("ui.pricing_purpose_f1a0b490")}<select value={purposeCode} onChange={e => setPurposeCode(e.target.value)}>{pricingRules.map(rule => <option key={rule.id} value={rule.purposeCode}>{rule.label} — {rule.hourlyRateVnd.toLocaleString("vi-VN")} {tr("ui.vnd_hour_c2aca1ee")}</option>)}</select></label>}
          <div className="alert" aria-live="polite">{quoteError ? <span role="alert">{translate(quoteError)} <button className="secondary-button" type="button" onClick={() => setPricingRetry(value => value + 1)}>{tr("ui.retry_c58d068c")}</button></span> : quote?.key === quoteKey ? <span>{tr("ui.usage_fee_10b23fee")}<strong>{quote.amountVnd.toLocaleString("vi-VN")} {tr("ui.vnd_bf502a39")}</strong>{quote.amountVnd > 0 ? tr("ui.pay_after_confirmation_and_before_2effbba2") : tr("ui.no_payment_required_a44e1364")}</span> : !timeIsValid ? tr("ui.calendarWorkspace.validTimeForFee") : tr("ui.updating_usage_fee_be66cd3f")}</div>
          <QuoteDiscountSummary quote={quote?.key === quoteKey ? quote : null} />
          <div className="booking-field">
            <label htmlFor="booking-purpose" className="booking-label">
              {tr("ui.usage_purpose_701ce708")}</label>
            <textarea
              id="booking-purpose"
              rows={2}
              value={purpose}
              maxLength={2000}
              onChange={(e) => { setPurpose(e.target.value); clearFieldError("booking-purpose"); }}
              onBlur={() => validateField("booking-purpose")}
              aria-invalid={Boolean(fieldErrors["booking-purpose"])}
              aria-describedby={fieldErrors["booking-purpose"] ? "booking-purpose-error" : undefined}

            />
          </div>

          {fieldFeedback("booking-purpose")}
          {fulfillment?.deliveryAllowed && <fieldset className="booking-contact" disabled={isSubmitting}><legend>{tr('ui.fulfillment.title')}</legend><label htmlFor="booking-delivery-mode">{tr('ui.fulfillment.receiveMethod')}</label><select id="booking-delivery-mode" className="booking-input" value={deliveryMode} onChange={event => setDeliveryMode(event.target.value)}><option value="LAB_PICKUP">{tr('ui.fulfillment.labPickup')}</option><option value="HOME_DELIVERY">{tr('ui.fulfillment.homeDelivery')}</option></select>{deliveryMode === 'HOME_DELIVERY' && <><p>{tr('ui.fulfillment.deliveryFee', { amount: '0' })}</p><VietnamAddressSelector required value={deliveryAddress} onLabelsChange={setDeliveryLabels} onChange={value => { setDeliveryAddress(value); clearFieldError('address-province'); clearFieldError('address-ward'); clearFieldError('address-line'); }} fieldErrors={{ provinceCode: fieldErrors['address-province'], wardCode: fieldErrors['address-ward'], addressLine: fieldErrors['address-line'] }} /></>}</fieldset>}
          <p className="booking-review-note">{tr("ui.rental.quickConfirm")}</p>
          <LabPolicySummary policy={{...currentPolicy, maxBookingMinutes: currentResource?.maxBookingMinutes ?? currentPolicy?.maxBookingMinutes}} requiresApproval={currentResource ? effectiveRequiresApproval : undefined} />
          </fieldset>
        </form>
      )}
    </BaseModal2026>
  );
};
