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
  ROOM: "Phòng LAB",
  EQUIPMENT: "Thiết bị",
  MACHINE: "Máy móc",
  EXPERIMENT_KIT: "Bộ thí nghiệm",
  MATERIAL: "Vật tư"
};

const operationalLabels: Record<string, string> = {
  AVAILABLE: "Khả dụng",
  IN_USE: "Đang sử dụng",
  MAINTENANCE: "Đang bảo trì",
  CALIBRATION: "Đang hiệu chuẩn",
  BROKEN: "Đang hỏng",
  RETIRED: "Ngừng sử dụng",
  OFFLINE: "Ngoại tuyến"
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
  const [title, setTitle] = useState(`Đặt nhanh ${resource.name}`);
  const [purpose, setPurpose] = useState(tr("Sử dụng phòng LAB mở / hợp tác học thuật"));
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
  const [message, setMessage] = useState("");
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
    setTitle(`Đặt nhanh ${resource.name}`);
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
        if (active) setQuoteError(cause.message || "Không tải được bảng phí.");
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
        if (active) setQuoteError(cause?.message || tr("Không tính được phí sử dụng."));
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
      return invalid(tr("Vui lòng nhập tiêu đề lịch đặt."));
    }
    if (!purpose.trim()) {
      return invalid(tr("Vui lòng nhập mục đích sử dụng."));
    }
    if (!selectedDate) {
      return invalid(tr("Vui lòng chọn ngày sử dụng."));
    }
    const today = getVietnamTodayDateString();
    if (selectedDate < today) {
      return invalid(tr("Ngày sử dụng không được trong quá khứ."));
    }
    if (!startTime || !endTime) return invalid(tr("Vui lòng nhập giờ bắt đầu và giờ kết thúc."));
    if (startTime >= endTime) {
      return invalid(tr("Giờ bắt đầu phải trước giờ kết thúc."));
    }
    if (!quote || quote.key !== quoteKey) return invalid(quoteError || tr("Vui lòng chờ phí sử dụng được cập nhật trước khi tiếp tục."));
    if (advance) setStep(2);
    return true;
  }

  function handleGoToStep3(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!handleGoToStep2(undefined, false)) return;
    setStep(2);
    setStep2Error("");

    if (!fullName.trim() || fullName.trim().length < 2) {
      setStep2Error(tr("Họ tên phải có ít nhất 2 ký tự."));
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setStep2Error(tr("Vui lòng nhập địa chỉ email hợp lệ."));
      return;
    }
    const cleanPhone = phone.trim().replace(/[^\d+]/g, "");
    if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 20) {
      setStep2Error(tr("Số điện thoại phải từ 9 đến 20 chữ số."));
      return;
    }
    if (!address.addressLine.trim() || !address.provinceCode || !address.wardCode) {
      setStep2Error(tr("Vui lòng chọn đầy đủ địa chỉ Việt Nam."));
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
      setMessage(`Mã OTP đã được gửi tới ${email}. Mã hết hạn sau 10 phút.`);
    } catch (cause: any) {
      setError(mapOtpErrorCode(cause?.code, cause?.message || tr("Không gửi được OTP.")));
    } finally {
      setBusyOtp(false);
    }
  }

  async function submitBooking(event: React.FormEvent) {
    event.preventDefault();
    if (busyBooking || !quote || quote.key !== quoteKey) return;
    if (!otpCode || otpCode.length !== 6) {
      setError(tr("Vui lòng nhập đủ 6 chữ số mã OTP."));
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
        setMessage(tr("Đặt lịch thành công. Tài khoản đã tồn tại; vui lòng đăng nhập bằng mật khẩu hiện tại để tiếp tục."));
      }
      onComplete(result);
    } catch (cause: any) {
      setError(mapOtpErrorCode(cause?.code, cause?.message || tr("Không hoàn tất được đặt lịch.")));
    } finally {
      setBusyBooking(false);
    }
  }

  const categoryName = categoryLabels[resource.category || ""] || resource.category || tr("Tài nguyên");
  const operationalName = operationalLabels[resource.operationalStatus || ""] || resource.operationalStatus || tr("Khả dụng");
  const hasTraining = Boolean(resource.trainingRequirements && resource.trainingRequirements.length > 0);

  return (
    <div ref={panelRef} className="guest-booking-panel" role="region" aria-label={tr("Đặt nhanh tài nguyên cho khách ngoài trường")} aria-busy={busy}>
      <div className="guest-booking-head">
        <span>
          <WalletCards size={18} aria-hidden="true" />
          {tr("Đặt nhanh dành cho khách & đơn vị hợp tác")}</span>
        <p>{tr("Quy trình 3 bước: Chọn thời gian → Điền thông tin → Xác thực OTP qua email để bảo đảm an toàn lịch đặt.")}</p>
      </div>

      {/* Step Indicator */}
      <nav className="guest-wizard-nav" aria-label={tr("Tiến trình đặt lịch")}>
        <button
          type="button"
          className={`guest-wizard-step ${step === 1 ? "is-active" : step > 1 ? "is-completed" : ""}`}
          onClick={() => setStep(1)}
          disabled={busy}
          aria-current={step === 1 ? "step" : undefined}
        >
          <span className="step-number">1</span>
          <span className="step-label">{tr("Lịch đặt")}</span>
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
          <span className="step-label">{tr("Liên hệ")}</span>
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
          <span className="step-label">{tr("Xác thực")}</span>
        </button>
      </nav>

      <h4 className="guest-step-heading" ref={stepHeadingRef} tabIndex={-1}>
        {tr("Bước")}{step} / 3: {step === 1 ? tr("Tài nguyên và lịch đặt") : step === 2 ? tr("Thông tin người đặt") : tr("Xác thực và kiểm tra lịch đặt")}
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
                {resource.effectiveRequiresApproval ? tr("Cần cán bộ LAB duyệt") : tr("Xác nhận tự động theo chính sách")}
              </span>
            </div>
            <h4 className="guest-resource-title">{resource.name}</h4>
            {resource.location && <p className="guest-resource-loc">{tr("Địa điểm:")}{resource.location}</p>}

            {/* Mandatory training notice */}
            <div className="guest-eligibility-notice">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                {hasTraining
                  ? `Khóa an toàn bắt buộc: ${resource.trainingRequirements!.map((t) => t.name || t.code).join(", ")}. Tài khoản phải có chứng chỉ còn hiệu lực trước khi đặt lịch. Nếu chưa có, hãy liên hệ cán bộ LAB để hoàn tất đào tạo; xác thực OTP không thay thế điều kiện này.`
                  : tr("Không yêu cầu chứng chỉ an toàn tiên quyết.")}
              </span>
            </div>
          </div>

          {step1Error && (
            <div className="guest-booking-alert danger" role="alert" tabIndex={-1}>
              <AlertTriangle size={16} aria-hidden="true" />
              {step1Error}
            </div>
          )}

          <div className="guest-booking-grid">
            <label htmlFor="guest-booking-title">
              {tr("Tiêu đề lịch đặt *")}<input
                id="guest-booking-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={255}
                placeholder={tr("VD: Thực nghiệm cảm biến đồ án")}
              />
            </label>
            <label htmlFor="guest-booking-purpose">
              {tr("Mục đích sử dụng *")}<input
                id="guest-booking-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                maxLength={500}
                placeholder={tr("VD: Nghiên cứu hợp tác học thuật")}
              />
            </label>
            <label htmlFor="guest-booking-date">
              {tr("Ngày sử dụng (giờ Việt Nam UTC+7) *")}<input
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
                {tr("Giờ bắt đầu *")}<input
                  id="guest-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </label>
              <label htmlFor="guest-end-time">
                {tr("Giờ kết thúc *")}<input
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
              {tr("Mục đích tính phí LAB")}<select
                id="guest-pricing-purpose"
                value={purposeCode}
                onChange={(e) => setPurposeCode(e.target.value)}
              >
                {pricingRules.map((rule) => (
                  <option key={rule.id} value={rule.purposeCode}>
                    {rule.label} — {formatMoney(rule.hourlyRateVnd)} {tr("đ/giờ")}</option>
                ))}
              </select>
            </label>
          )}

          <div className="guest-booking-quote" aria-live="polite">
            {quoteError ? (
              <span role="alert" className="quote-error">{tr(quoteError)}</span>
            ) : quote?.key === quoteKey ? (
              <span>
                {tr("Phí tạm tính:")}<strong>{formatMoney(quote.amountVnd)} {tr("đ")}</strong>
                {quote.amountVnd > 0
                  ? tr(" · Nếu lịch được xác nhận, tiếp tục thanh toán qua VNPAY Sandbox.")
                  : tr(" · Tài nguyên hoặc mục đích này đang miễn phí.")}
              </span>
            ) : (
              <span>{tr("Đang tính phí…")}</span>
            )}
          </div>

          <div className="guest-action-row">
            <button type="submit" className="public-primary guest-wizard-btn next">
              {tr("Tiếp tục")}<ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: Customer Information */}
      {step === 2 && (
        <form className="guest-step-form" onSubmit={handleGoToStep3}>
          <div className="step-info-banner">
            <User size={16} aria-hidden="true" />
            <span>{tr("Chỉ thu thập thông tin người đặt thực tế để cấp quyền ra vào LAB và gửi mã OTP xác thực.")}</span>
          </div>

          {step2Error && (
            <div className="guest-booking-alert danger" role="alert" tabIndex={-1}>
              <AlertTriangle size={16} aria-hidden="true" />
              {step2Error}
            </div>
          )}

          <div className="guest-booking-grid">
            <label htmlFor="guest-full-name">
              {tr("Họ và tên *")}<input
                id="guest-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                maxLength={255}
                autoComplete="name"
                placeholder={tr("Nguyễn Văn A")}
              />
            </label>
            <label htmlFor="guest-email">
              {tr("Email nhận OTP *")}<input
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
                placeholder="email@example.com"
              />
            </label>
            <label htmlFor="guest-phone">
              {tr("Số điện thoại liên hệ *")}<input
                id="guest-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                minLength={9}
                maxLength={20}
                autoComplete="tel"
                placeholder="0912345678"
              />
            </label>
            <label htmlFor="guest-organization">
              {tr("Đơn vị / Doanh nghiệp / Tổ chức")}<input
                id="guest-organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                maxLength={160}
                autoComplete="organization"
                placeholder={tr("Không bắt buộc")}
              />
            </label>
          </div>

          <div className="guest-address-block">
            <span className="block-title">{tr("Địa chỉ liên hệ Việt Nam *")}</span>
            <VietnamAddressSelector value={address} onChange={setAddress} required />
          </div>

          <div className="guest-action-row between">
            <button type="button" className="public-secondary guest-wizard-btn prev" onClick={() => setStep(1)}>
              <ArrowLeft size={16} aria-hidden="true" /> {tr("Quay lại")}</button>
            <button type="submit" className="public-primary guest-wizard-btn next">
              {tr("Tiếp tục sang bước OTP")}<ArrowRight size={17} aria-hidden="true" />
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
              {message}
            </div>
          )}
          {error && (
            <div className="guest-booking-alert danger" role="alert" tabIndex={-1}>
              <AlertTriangle size={16} aria-hidden="true" />
              {error}
            </div>
          )}

          {/* Final Review Summary Card */}
          <div className="guest-review-card">
            <h5>{tr("Kiểm tra lại thông tin lịch đặt")}</h5>
            <dl className="guest-review-dl">
              <div>
                <dt>{tr("Tài nguyên")}</dt>
                <dd>{resource.name} ({resource.code}) · {categoryName}</dd>
              </div>
              <div>
                <dt>{tr("Thời gian")}</dt>
                <dd>{tr("Ngày")}{selectedDate} ({startTime} – {endTime}{tr(") · Giờ VN")}</dd>
              </div>
              <div>
                <dt>{tr("Người đặt")}</dt>
                <dd>{fullName} · {phone} · {email}</dd>
              </div>
              {organization && (
                <div>
                  <dt>{tr("Đơn vị")}</dt>
                  <dd>{organization}</dd>
                </div>
              )}
              <div>
                <dt>{tr("Địa chỉ")}</dt>
                <dd>{address.addressLine || "—"}</dd>
              </div>
              <div>
                <dt>{tr("Phí sử dụng")}</dt>
                <dd>
                  <strong>{quote?.key === quoteKey ? `${formatMoney(quote.amountVnd)} đ` : tr("Chưa xác định — quay lại bước 1 để kiểm tra phí")}</strong>
                </dd>
              </div>
              <div>
                <dt>{tr("Kỳ vọng xử lý")}</dt>
                <dd>
                  {resource.effectiveRequiresApproval
                    ? tr("Yêu cầu sẽ ở trạng thái Chờ duyệt để cán bộ LAB xem xét trước khi bàn giao.")
                    : tr("Lịch đặt được xác nhận tự động theo chính sách phòng LAB.")}
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
                  ? `Gửi lại mã (${resendCooldown}s)`
                  : otpSent
                  ? tr("Gửi lại OTP")
                  : tr("Gửi mã OTP qua email")}
              </button>
              <label htmlFor="guest-otp-input">
                {tr("Mã OTP (6 chữ số) *")}<input
                  id="guest-otp-input"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  minLength={6}
                  maxLength={6}
                  inputMode="numeric"
                  placeholder={tr("6 chữ số")}
                  disabled={!otpSent || busy}
                  autoComplete="one-time-code"
                />
              </label>
            </div>
            {!otpSent && (
              <p className="otp-hint-text">
                {tr("Vui lòng bấm nút")}<strong>{tr("Gửi mã OTP qua email")}</strong> {tr("để nhận mã xác thực gồm 6 chữ số gửi tới")}<strong>{email}</strong>.
              </p>
            )}
          </div>

          <div className="guest-action-row between">
            <button type="button" className="public-secondary guest-wizard-btn prev" disabled={busy} onClick={() => setStep(2)}>
              <ArrowLeft size={16} aria-hidden="true" /> {tr("Quay lại thông tin")}</button>
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
              {tr("Xác nhận đặt lịch")}</button>
          </div>
        </form>
      )}
    </div>
  );
}
