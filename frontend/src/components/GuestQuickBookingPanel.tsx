import type { LocaleMessage } from "../providers/LocaleProvider";
import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  User,
  WalletCards
} from "lucide-react";
import { apiRequest } from "../api.js";
import { getVietnamTodayDateString, vietnamTimeToIso } from "../utils/timezone.js";
import { VietnamAddressSelector } from "./VietnamAddressSelector";
import "../styles/guest-booking.css";

export type Resource = {
  id: string;
  name: string;
  code: string;
  category?: string;
  location?: string;
  operationalStatus?: string;
  effectiveRequiresApproval?: boolean;
  trainingRequirements?: Array<{ id: string; courseId: string; code?: string; name?: string }>;
};

export type AddressValue = { addressLine: string; provinceCode: string; wardCode: string };

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

const categoryLabels: Record<string, string> = {
  ROOM: "ui.lab_room_8ed94274",
  EQUIPMENT: "ui.resources_eb706979",
  MACHINE: "ui.machine_1d4b86ad",
  EXPERIMENT_KIT: "ui.experiment_kit_0acb51cf",
  MATERIAL: "ui.material_23ab10cc"
};

const operationalLabels: Record<string, string> = {
  AVAILABLE: "ui.available_73dc3284",
  IN_USE: "ui.in_use_a07a3647",
  MAINTENANCE: "ui.under_maintenance_746ec905",
  CALIBRATION: "ui.under_calibration_779c1ea8",
  BROKEN: "ui.broken_53e74bf5",
  RETIRED: "ui.offline_b4f199c3",
  OFFLINE: "ui.offline_96a8bb03"
};

import { mapOtpErrorCode } from "../utils/otpErrors.js";

export function GuestQuickBookingPanel({
  resource,
  onComplete
}: {
  resource: Resource;
  onComplete: (result: any) => void;
}) {
  const { tr } = useLocale();
  // Wizard Step: 1 = Resource & Booking, 2 = Customer Info, 3 = OTP & Final Review
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Resource & Booking fields
  const [title, setTitle] = useState(translate("ui.quick_booking_for_f8449101", { value0: resource.name }));
  const [purpose, setPurpose] = useState(tr("ui.open_lab_use_academic_collaboration_fe1ad425"));
  const [selectedDate, setSelectedDate] = useState(() => getVietnamTodayDateString());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [purposeCode, setPurposeCode] = useState("");
  const [quote, setQuote] = useState<any>(null);
  const [quoteError, setQuoteError] = useState("");
  const [step1Error, setStep1Error] = useState("");

  // Step 2: Customer Information fields
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<AddressValue>({ addressLine: "", provinceCode: "", wardCode: "" });
  const [step2Error, setStep2Error] = useState("");

  // Step 3: OTP & Review fields
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [busyOtp, setBusyOtp] = useState(false);
  const [busyBooking, setBusyBooking] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState<LocaleMessage>("");
  const [error, setError] = useState("");

  const cooldownTimerRef = useRef<any>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const busy = busyOtp || busyBooking;
  const currentError = step === 1 ? step1Error : step === 2 ? step2Error : error;

  useEffect(() => {
    if (previousStep.current !== step) stepHeadingRef.current?.focus();
    previousStep.current = step;
  }, [step]);

  useEffect(() => {
    if (currentError) panelRef.current?.querySelector<HTMLElement>('[role="alert"][tabindex]')?.focus();
  }, [currentError]);

  useEffect(() => {
    setTitle(translate("ui.quick_booking_for_f8449101", { value0: resource.name }));
    setQuote(null);
    setPricingRules([]);
    setPurposeCode("");
    let active = true;
    apiRequest(`/booking-pricing/${encodeURIComponent(resource.id)}`)
      .then((rows: any[]) => {
        if (active) {
          setPricingRules(rows || []);
          setPurposeCode(rows?.[0]?.purposeCode || "");
        }
      })
      .catch((cause: Error) => {
        if (active) setQuoteError(cause.message || "ui.could_not_load_pricing_aade6322");
      });
    return () => {
      active = false;
    };
  }, [resource.id, resource.name]);

  const quoteKey = useMemo(
    () => `${resource.id}|${purposeCode}|${selectedDate}|${startTime}|${endTime}`,
    [resource.id, purposeCode, selectedDate, startTime, endTime]
  );

  useEffect(() => {
    let active = true;
    setQuote(null);
    setQuoteError("");
    const timer = setTimeout(async () => {
      try {
        const result = await apiRequest("/booking-pricing/quote", {
          method: "POST",
          body: JSON.stringify({
            resourceId: resource.id,
            ...(purposeCode ? { purposeCode } : {}),
            startAt: vietnamTimeToIso(selectedDate, startTime),
            endAt: vietnamTimeToIso(selectedDate, endTime)
          })
        });
        if (active) setQuote({ ...result, key: quoteKey });
      } catch (cause: any) {
        if (active) setQuoteError(cause?.message || "ui.could_not_calculate_usage_fee_8422b88f");
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [resource.id, purposeCode, selectedDate, startTime, endTime, quoteKey, tr]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      return;
    }
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [resendCooldown]);

  // Validation handlers
  function handleGoToStep2(e?: React.FormEvent, advance = true) {
    if (e) e.preventDefault();
    if (busy) return false;
    setStep1Error("");

    function invalid(message: string) {
      setStep(1);
      setStep1Error(message);
      return false;
    }

    if (!title.trim()) {
      return invalid(tr("ui.enter_a_booking_title_c05aa504"));
    }
    if (!purpose.trim()) {
      return invalid(tr("ui.enter_the_purpose_of_your_2256a6ae"));
    }
    if (!selectedDate) {
      return invalid(tr("ui.choose_a_date_5b0f76c4"));
    }
    const today = getVietnamTodayDateString();
    if (selectedDate < today) {
      return invalid(tr("ui.the_booking_date_cannot_be_f83fc184"));
    }
    if (!startTime || !endTime) return invalid(tr("ui.enter_start_and_end_times_dd573c8f"));
    if (startTime >= endTime) {
      return invalid(tr("ui.start_time_must_be_before_b0b279ec"));
    }
    if (!quote || quote.key !== quoteKey) return invalid(quoteError || tr("ui.wait_for_the_fee_to_077bf617"));
    if (advance) setStep(2);
    return true;
  }

  function handleGoToStep3(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!handleGoToStep2(undefined, false)) return;
    setStep(2);
    setStep2Error("");

    if (!fullName.trim() || fullName.trim().length < 2) {
      setStep2Error("ui.full_name_must_have_at_9c55a1b6");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setStep2Error("ui.enter_a_valid_email_address_7b84c8c5");
      return;
    }
    const cleanPhone = phone.trim().replace(/[^\d+]/g, "");
    if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 20) {
      setStep2Error("ui.phone_number_must_contain_9_e6d51790");
      return;
    }
    if (!address.addressLine.trim() || !address.provinceCode || !address.wardCode) {
      setStep2Error("ui.complete_your_vietnam_address_ee486855");
      return;
    }
    setStep(3);
  }

  async function sendOtp() {
    if (busyOtp || resendCooldown > 0) return;
    setBusyOtp(true);
    setError("");
    setMessage("");
    try {
      const response = await apiRequest("/guest-booking/otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), fullName: fullName.trim() })
      });
      setOtpSent(true);
      const cooldown = response?.resendAfterSeconds || 60;
      setResendCooldown(cooldown);
      setMessage({ key: "ui.an_otp_has_been_sent_baef8802", params: { value0: email } });
    } catch (cause: any) {
      setError(mapOtpErrorCode(cause?.code, cause?.message || "ui.could_not_send_verification_code_158cab3e"));
    } finally {
      setBusyOtp(false);
    }
  }

  async function submitBooking(event: React.FormEvent) {
    event.preventDefault();
    if (busyBooking || !quote || quote.key !== quoteKey) return;
    if (!otpCode || otpCode.length !== 6) {
      setError("ui.enter_the_6_digit_verification_0e45892f");
      return;
    }
    setBusyBooking(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest("/guest-booking/book", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otpCode: otpCode.trim(),
          fullName: fullName.trim(),
          phone: phone.trim(),
          organization: organization.trim() || undefined,
          address,
          booking: {
            resourceId: resource.id,
            title: title.trim(),
            purpose: purpose.trim(),
            ...(purposeCode ? { purposeCode } : {}),
            acceptedQuote: { amountVnd: quote.amountVnd, version: quote.version },
            startAt: vietnamTimeToIso(selectedDate, startTime),
            endAt: vietnamTimeToIso(selectedDate, endTime)
          }
        })
      });
      if (result.requiresLogin) {
        setOtpCode("");
        setMessage("ui.booking_saved_your_account_already_7ec46a96");
      }
      onComplete(result);
    } catch (cause: any) {
      setError(mapOtpErrorCode(cause?.code, cause?.message || "ui.could_not_complete_booking_d0932ca8"));
    } finally {
      setBusyBooking(false);
    }
  }

  const categoryName = categoryLabels[resource.category || ""] || resource.category || tr("ui.resource_9a35ef53");
  const operationalName = operationalLabels[resource.operationalStatus || ""] || resource.operationalStatus || tr("ui.available_73dc3284");
  const hasTraining = Boolean(resource.trainingRequirements && resource.trainingRequirements.length > 0);

  return (
    <div ref={panelRef} className="guest-booking-panel" role="region" aria-label={tr("ui.quick_booking_for_external_visitors_0df84f94")} aria-busy={busy}>
      <div className="guest-booking-head">
        <span>
          <WalletCards size={18} aria-hidden="true" />
          {tr("ui.quick_booking_for_visitors_partners_33aa78be")}</span>
        <p>{tr("ui.three_steps_choose_time_enter_c2441bb9")}</p>
      </div>

      {/* Step Indicator */}
      <nav className="guest-wizard-nav" aria-label={tr("ui.booking_progress_74e6eb3f")}>
        <button
          type="button"
          className={`guest-wizard-step ${step === 1 ? "is-active" : step > 1 ? "is-completed" : ""}`}
          onClick={() => setStep(1)}
          disabled={busy}
          aria-current={step === 1 ? "step" : undefined}
        >
          <span className="step-number">1</span>
          <span className="step-label">{tr("ui.bookings_00f5b333")}</span>
        </button>
        <span className="step-divider" aria-hidden="true">→</span>
        <button
          type="button"
          className={`guest-wizard-step ${step === 2 ? "is-active" : step > 2 ? "is-completed" : ""}`}
          onClick={() => handleGoToStep2()}
          disabled={busy}
          aria-current={step === 2 ? "step" : undefined}
        >
          <span className="step-number">2</span>
          <span className="step-label">{tr("ui.contact_30814846")}</span>
        </button>
        <span className="step-divider" aria-hidden="true">→</span>
        <button
          type="button"
          className={`guest-wizard-step ${step === 3 ? "is-active" : ""}`}
          onClick={() => handleGoToStep3()}
          disabled={busy}
          aria-current={step === 3 ? "step" : undefined}
        >
          <span className="step-number">3</span>
          <span className="step-label">{tr("ui.verify_ad988d2b")}</span>
        </button>
      </nav>

      <h4 className="guest-step-heading" ref={stepHeadingRef} tabIndex={-1}>
        {tr("ui.step_6acd2db3")}{step} / 3: {step === 1 ? tr("ui.resource_and_schedule_cd6aafbe") : step === 2 ? tr("ui.contact_details_7077b10e") : tr("ui.verification_and_review_489a004a")}
      </h4>

      {/* STEP 1: Resource & Booking */}
      {step === 1 && (
        <form className="guest-step-form" onSubmit={handleGoToStep2}>
          <div className="guest-resource-summary-box">
            <div className="guest-resource-badge-row">
              <span className="badge-tag">{categoryName}</span>
              <span className="badge-code font-mono">{resource.code}</span>
              <span className={`status-pill ${resource.operationalStatus === "AVAILABLE" ? "status-available" : "status-other"}`}>
                {operationalName}
              </span>
              <span className="badge-approval">
                {resource.effectiveRequiresApproval ? tr("ui.lab_staff_approval_required_60bf0b59") : tr("ui.automatic_confirmation_under_policy_bfbbda9a")}
              </span>
            </div>
            <h4 className="guest-resource-title">{resource.name}</h4>
            {resource.location && <p className="guest-resource-loc">{tr("ui.location_87f3c284")}{resource.location}</p>}

            {/* Mandatory training notice */}
            <div className="guest-eligibility-notice">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                {hasTraining
                  ? translate("ui.required_safety_training_your_account_bdad2c72", { value0: resource.trainingRequirements!.map((t) => t.name || t.code).join(", ") })
                  : tr("ui.no_prerequisite_safety_certification_required_8182eed8")}
              </span>
            </div>
          </div>

          {step1Error && (
            <div className="guest-booking-alert danger" role="alert" tabIndex={-1}>
              <AlertTriangle size={16} aria-hidden="true" />
              {translate(step1Error)}
            </div>
          )}

          <div className="guest-booking-grid">
            <label htmlFor="guest-booking-title">
              {tr("ui.booking_title_a845edb3")}<input
                id="guest-booking-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={255}
                placeholder={tr("ui.example_sensor_experiment_for_a_3e6f1164")}
              />
            </label>
            <label htmlFor="guest-booking-purpose">
              {tr("ui.purpose_2d299730")}<input
                id="guest-booking-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                maxLength={500}
                placeholder={tr("ui.example_academic_research_collaboration_fa881f33")}
              />
            </label>
            <label htmlFor="guest-booking-date">
              {tr("ui.booking_date_vietnam_time_utc_6b3b90ae")}<input
                id="guest-booking-date"
                type="date"
                value={selectedDate}
                min={getVietnamTodayDateString()}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
              />
            </label>
            <div className="guest-time-row">
              <label htmlFor="guest-start-time">
                {tr("ui.start_time_1dd67708")}<input
                  id="guest-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </label>
              <label htmlFor="guest-end-time">
                {tr("ui.end_time_7a02aed3")}<input
                  id="guest-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </label>
            </div>
          </div>

          {pricingRules.length > 0 && (
            <label className="guest-purpose" htmlFor="guest-pricing-purpose">
              {tr("ui.lab_pricing_purpose_7ae67bf1")}<select
                id="guest-pricing-purpose"
                value={purposeCode}
                onChange={(e) => setPurposeCode(e.target.value)}
              >
                {pricingRules.map((rule) => (
                  <option key={rule.id} value={rule.purposeCode}>
                    {rule.label} — {formatMoney(rule.hourlyRateVnd)} {tr("ui.vnd_hour_c2aca1ee")}</option>
                ))}
              </select>
            </label>
          )}

          <div className="guest-booking-quote" aria-live="polite">
            {quoteError ? (
              <span role="alert" className="quote-error">{tr(quoteError)}</span>
            ) : quote?.key === quoteKey ? (
              <span>
                {tr("ui.estimated_fee_c69e3fcf")}<strong>{formatMoney(quote.amountVnd)} {tr("ui.vnd_bf502a39")}</strong>
                {quote.amountVnd > 0
                  ? tr("ui.after_confirmation_continue_to_vnpay_494a4aa6")
                  : tr("ui.this_resource_or_purpose_has_969242bf")}
              </span>
            ) : (
              <span>{tr("ui.calculating_fee_262728ce")}</span>
            )}
          </div>

          <div className="guest-action-row">
            <button type="submit" className="public-primary guest-wizard-btn next">
              {tr("ui.continue_87a7ae88")}<ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: Customer Information */}
      {step === 2 && (
        <form className="guest-step-form" onSubmit={handleGoToStep3}>
          <div className="step-info-banner">
            <User size={16} aria-hidden="true" />
            <span>{tr("ui.provide_the_actual_booking_contact_f277fd88")}</span>
          </div>

          {step2Error && (
            <div className="guest-booking-alert danger" role="alert" tabIndex={-1}>
              <AlertTriangle size={16} aria-hidden="true" />
              {translate(step2Error)}
            </div>
          )}

          <div className="guest-booking-grid">
            <label htmlFor="guest-full-name">
              {tr("ui.full_name_5f1d93c1")}<input
                id="guest-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                maxLength={255}
                autoComplete="name"
                placeholder={tr("ui.jane_nguyen_debd1b38")}
              />
            </label>
            <label htmlFor="guest-email">
              {tr("ui.verification_email_2a481e07")}<input
                id="guest-email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setOtpSent(false);
                  setOtpCode("");
                  setMessage("");
                  setError("");
                }}
                required
                type="email"
                autoComplete="email"
                placeholder={translate("ui.email_example_com_2a539d65")}
              />
            </label>
            <label htmlFor="guest-phone">
              {tr("ui.contact_phone_e47e9925")}<input
                id="guest-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                minLength={9}
                maxLength={20}
                autoComplete="tel"
                placeholder={translate("ui.0912345678_20faf05b")}
              />
            </label>
            <label htmlFor="guest-organization">
              {tr("ui.department_company_organization_a07413d8")}<input
                id="guest-organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                maxLength={160}
                autoComplete="organization"
                placeholder={tr("ui.optional_2e85bddf")}
              />
            </label>
          </div>

          <div className="guest-address-block">
            <span className="block-title">{tr("ui.vietnam_contact_address_6ea949b8")}</span>
            <VietnamAddressSelector value={address} onChange={setAddress} required />
          </div>

          <div className="guest-action-row between">
            <button type="button" className="public-secondary guest-wizard-btn prev" onClick={() => setStep(1)}>
              <ArrowLeft size={16} aria-hidden="true" /> {tr("ui.back_6d793582")}</button>
            <button type="submit" className="public-primary guest-wizard-btn next">
              {tr("ui.continue_to_verification_cd039ed7")}<ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: OTP & Final Review */}
      {step === 3 && (
        <form className="guest-step-form" onSubmit={submitBooking}>
          {message && (
            <div className="guest-booking-alert success" role="status">
              <CheckCircle2 size={16} aria-hidden="true" />
              {translate(message)}
            </div>
          )}
          {error && (
            <div className="guest-booking-alert danger" role="alert" tabIndex={-1}>
              <AlertTriangle size={16} aria-hidden="true" />
              {translate(error)}
            </div>
          )}

          {/* Final Review Summary Card */}
          <div className="guest-review-card">
            <h5>{tr("ui.review_your_booking_7d0cff6e")}</h5>
            <dl className="guest-review-dl">
              <div>
                <dt>{tr("ui.resource_9a35ef53")}</dt>
                <dd>{resource.name} ({resource.code}) · {categoryName}</dd>
              </div>
              <div>
                <dt>{tr("ui.time_b295fd62")}</dt>
                <dd>{tr("ui.day_c4c3ca76")}{selectedDate} ({startTime} – {endTime}{tr("ui.vietnam_time_3c29d808")}</dd>
              </div>
              <div>
                <dt>{tr("ui.booked_by_0600af3f")}</dt>
                <dd>{fullName} · {phone} · {email}</dd>
              </div>
              {organization && (
                <div>
                  <dt>{tr("ui.organization_9bfbf807")}</dt>
                  <dd>{organization}</dd>
                </div>
              )}
              <div>
                <dt>{tr("ui.address_249de6f5")}</dt>
                <dd>{address.addressLine || "—"}</dd>
              </div>
              <div>
                <dt>{tr("ui.usage_fee_cdf18099")}</dt>
                <dd>
                  <strong>{quote?.key === quoteKey ? translate("ui.vnd_e239b46a", { value0: formatMoney(quote.amountVnd) }) : tr("ui.not_calculated_return_to_step_5c596e9d")}</strong>
                </dd>
              </div>
              <div>
                <dt>{tr("ui.what_happens_next_939dbedd")}</dt>
                <dd>
                  {resource.effectiveRequiresApproval
                    ? tr("ui.your_request_will_await_lab_c95e96c2")
                    : tr("ui.the_booking_will_be_automatically_cde77fc7")}
                </dd>
              </div>
            </dl>
          </div>

          {/* OTP Section */}
          <div className="guest-otp-container">
            <div className="guest-otp-row">
              <button
                type="button"
                className="public-secondary"
                onClick={sendOtp}
                disabled={busy || resendCooldown > 0 || !email}
              >
                {busyOtp ? (
                  <Loader2 className="spin" size={16} aria-hidden="true" />
                ) : (
                  <Mail size={16} aria-hidden="true" />
                )}
                {resendCooldown > 0
                  ? translate("ui.resend_code_s_e454ec41", { value0: resendCooldown })
                  : otpSent
                  ? tr("ui.resend_code_d4042d28")
                  : tr("ui.send_email_verification_code_21598204")}
              </button>
              <label htmlFor="guest-otp-input">
                {tr("ui.verification_code_6_digits_9ce9c26b")}<input
                  id="guest-otp-input"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  minLength={6}
                  maxLength={6}
                  inputMode="numeric"
                  placeholder={tr("ui.6_digits_9046bda2")}
                  disabled={!otpSent || busy}
                  autoComplete="one-time-code"
                />
              </label>
            </div>
            {!otpSent && (
              <p className="otp-hint-text">
                {tr("ui.select_63228d55")}<strong>{tr("ui.send_email_verification_code_21598204")}</strong> {tr("ui.to_receive_a_6_digit_187627a5")}<strong>{email}</strong>.
              </p>
            )}
          </div>

          <div className="guest-action-row between">
            <button type="button" className="public-secondary guest-wizard-btn prev" disabled={busy} onClick={() => setStep(2)}>
              <ArrowLeft size={16} aria-hidden="true" /> {tr("ui.back_to_contact_details_098e42e5")}</button>
            <button
              type="submit"
              className="public-primary guest-wizard-btn submit"
              disabled={busy || !otpSent || !quote || quote.key !== quoteKey || otpCode.length !== 6}
            >
              {busyBooking ? (
                <Loader2 className="spin" size={17} aria-hidden="true" />
              ) : (
                <KeyRound size={17} aria-hidden="true" />
              )}
              {tr("ui.confirm_booking_f6a19e97")}</button>
          </div>
        </form>
      )}
    </div>
  );
}
