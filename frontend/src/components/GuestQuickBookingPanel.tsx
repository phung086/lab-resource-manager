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
  // Wizard Step: 1 = Resource & Booking, 2 = Customer Info, 3 = OTP & Final Review
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Resource & Booking fields
  const [title, setTitle] = useState(`Đặt nhanh ${resource.name}`);
  const [purpose, setPurpose] = useState("Sử dụng phòng LAB mở / hợp tác học thuật");
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
        if (active) setQuoteError(cause?.message || "Không tính được phí sử dụng.");
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [resource.id, purposeCode, selectedDate, startTime, endTime, quoteKey]);

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
  function handleGoToStep2(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setStep1Error("");

    if (!title.trim()) {
      setStep1Error("Vui lòng nhập tiêu đề lịch đặt.");
      return;
    }
    if (!purpose.trim()) {
      setStep1Error("Vui lòng nhập mục đích sử dụng.");
      return;
    }
    if (!selectedDate) {
      setStep1Error("Vui lòng chọn ngày sử dụng.");
      return;
    }
    const today = getVietnamTodayDateString();
    if (selectedDate < today) {
      setStep1Error("Ngày sử dụng không được trong quá khứ.");
      return;
    }
    if (startTime >= endTime) {
      setStep1Error("Giờ bắt đầu phải trước giờ kết thúc.");
      return;
    }
    setStep(2);
  }

  function handleGoToStep3(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setStep2Error("");

    if (!fullName.trim() || fullName.trim().length < 2) {
      setStep2Error("Họ tên phải có ít nhất 2 ký tự.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setStep2Error("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }
    const cleanPhone = phone.trim().replace(/[^\d+]/g, "");
    if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 20) {
      setStep2Error("Số điện thoại phải từ 9 đến 20 chữ số.");
      return;
    }
    if (!address.addressLine.trim() || !address.provinceCode || !address.wardCode) {
      setStep2Error("Vui lòng chọn đầy đủ địa chỉ Việt Nam.");
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
      setError(mapOtpErrorCode(cause?.code, cause?.message || "Không gửi được OTP."));
    } finally {
      setBusyOtp(false);
    }
  }

  async function submitBooking(event: React.FormEvent) {
    event.preventDefault();
    if (busyBooking || !quote || quote.key !== quoteKey) return;
    if (!otpCode || otpCode.length !== 6) {
      setError("Vui lòng nhập đủ 6 chữ số mã OTP.");
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
        setMessage("Đặt lịch thành công. Tài khoản đã tồn tại; vui lòng đăng nhập bằng mật khẩu hiện tại để tiếp tục.");
      }
      onComplete(result);
    } catch (cause: any) {
      setError(mapOtpErrorCode(cause?.code, cause?.message || "Không hoàn tất được đặt lịch."));
    } finally {
      setBusyBooking(false);
    }
  }

  const categoryName = categoryLabels[resource.category || ""] || resource.category || "Tài nguyên";
  const operationalName = operationalLabels[resource.operationalStatus || ""] || resource.operationalStatus || "Khả dụng";
  const hasTraining = Boolean(resource.trainingRequirements && resource.trainingRequirements.length > 0);

  return (
    <div className="guest-booking-panel" role="region" aria-label="Đặt nhanh tài nguyên cho khách ngoài trường">
      <div className="guest-booking-head">
        <span>
          <WalletCards size={18} aria-hidden="true" />
          Đặt nhanh dành cho khách & đơn vị hợp tác
        </span>
        <p>Quy trình 3 bước: Chọn thời gian → Điền thông tin → Xác thực OTP qua email để bảo đảm an toàn lịch đặt.</p>
      </div>

      {/* Step Indicator */}
      <nav className="guest-wizard-nav" aria-label="Tiến trình đặt lịch">
        <button
          type="button"
          className={`guest-wizard-step ${step === 1 ? "is-active" : step > 1 ? "is-completed" : ""}`}
          onClick={() => setStep(1)}
          aria-current={step === 1 ? "step" : undefined}
        >
          <span className="step-number">1</span>
          <span className="step-label">Tài nguyên & Lịch đặt</span>
        </button>
        <span className="step-divider" aria-hidden="true">→</span>
        <button
          type="button"
          className={`guest-wizard-step ${step === 2 ? "is-active" : step > 2 ? "is-completed" : ""}`}
          onClick={() => handleGoToStep2()}
          aria-current={step === 2 ? "step" : undefined}
        >
          <span className="step-number">2</span>
          <span className="step-label">Thông tin người đặt</span>
        </button>
        <span className="step-divider" aria-hidden="true">→</span>
        <button
          type="button"
          className={`guest-wizard-step ${step === 3 ? "is-active" : ""}`}
          onClick={() => {
            handleGoToStep2();
            handleGoToStep3();
          }}
          aria-current={step === 3 ? "step" : undefined}
        >
          <span className="step-number">3</span>
          <span className="step-label">Xác thực OTP & Chốt lịch</span>
        </button>
      </nav>

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
                {resource.effectiveRequiresApproval ? "Cần cán bộ LAB duyệt" : "Xác nhận tự động theo chính sách"}
              </span>
            </div>
            <h4 className="guest-resource-title">{resource.name}</h4>
            {resource.location && <p className="guest-resource-loc">Địa điểm: {resource.location}</p>}

            {/* Mandatory training notice */}
            <div className="guest-eligibility-notice">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                {hasTraining
                  ? `Khóa an toàn bắt buộc: ${resource.trainingRequirements!.map((t) => t.name || t.code).join(", ")}. Khách ngoài trường sẽ được hướng dẫn khi nhận bàn giao.`
                  : "Không yêu cầu chứng chỉ an toàn tiên quyết."}
              </span>
            </div>
          </div>

          {step1Error && (
            <div className="guest-booking-alert danger" role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              {step1Error}
            </div>
          )}

          <div className="guest-booking-grid">
            <label htmlFor="guest-booking-title">
              Tiêu đề lịch đặt *
              <input
                id="guest-booking-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={255}
                placeholder="VD: Thực nghiệm cảm biến đồ án"
              />
            </label>
            <label htmlFor="guest-booking-purpose">
              Mục đích sử dụng *
              <input
                id="guest-booking-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                maxLength={500}
                placeholder="VD: Nghiên cứu hợp tác học thuật"
              />
            </label>
            <label htmlFor="guest-booking-date">
              Ngày sử dụng (giờ Việt Nam UTC+7) *
              <input
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
                Giờ bắt đầu *
                <input
                  id="guest-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </label>
              <label htmlFor="guest-end-time">
                Giờ kết thúc *
                <input
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
              Mục đích tính phí LAB
              <select
                id="guest-pricing-purpose"
                value={purposeCode}
                onChange={(e) => setPurposeCode(e.target.value)}
              >
                {pricingRules.map((rule) => (
                  <option key={rule.id} value={rule.purposeCode}>
                    {rule.label} — {formatMoney(rule.hourlyRateVnd)} đ/giờ
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="guest-booking-quote" aria-live="polite">
            {quoteError ? (
              <span role="alert" className="quote-error">{quoteError}</span>
            ) : quote?.key === quoteKey ? (
              <span>
                Phí tạm tính: <strong>{formatMoney(quote.amountVnd)} đ</strong>
                {quote.amountVnd > 0
                  ? " · Nếu lịch được xác nhận, tiếp tục thanh toán qua VNPAY Sandbox."
                  : " · Tài nguyên hoặc mục đích này đang miễn phí."}
              </span>
            ) : (
              <span>Đang tính phí…</span>
            )}
          </div>

          <div className="guest-action-row">
            <button type="submit" className="public-primary guest-wizard-btn next">
              Tiếp tục <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: Customer Information */}
      {step === 2 && (
        <form className="guest-step-form" onSubmit={handleGoToStep3}>
          <div className="step-info-banner">
            <User size={16} aria-hidden="true" />
            <span>Chỉ thu thập thông tin người đặt thực tế để cấp quyền ra vào LAB và gửi mã OTP xác thực.</span>
          </div>

          {step2Error && (
            <div className="guest-booking-alert danger" role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              {step2Error}
            </div>
          )}

          <div className="guest-booking-grid">
            <label htmlFor="guest-full-name">
              Họ và tên *
              <input
                id="guest-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                maxLength={255}
                autoComplete="name"
                placeholder="Nguyễn Văn A"
              />
            </label>
            <label htmlFor="guest-email">
              Email nhận OTP *
              <input
                id="guest-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                autoComplete="email"
                placeholder="email@example.com"
              />
            </label>
            <label htmlFor="guest-phone">
              Số điện thoại liên hệ *
              <input
                id="guest-phone"
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
              Đơn vị / Doanh nghiệp / Tổ chức
              <input
                id="guest-organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                maxLength={160}
                autoComplete="organization"
                placeholder="Không bắt buộc"
              />
            </label>
          </div>

          <div className="guest-address-block">
            <span className="block-title">Địa chỉ liên hệ Việt Nam *</span>
            <VietnamAddressSelector value={address} onChange={setAddress} required />
          </div>

          <div className="guest-action-row between">
            <button type="button" className="public-secondary guest-wizard-btn prev" onClick={() => setStep(1)}>
              <ArrowLeft size={16} aria-hidden="true" /> Quay lại
            </button>
            <button type="submit" className="public-primary guest-wizard-btn next">
              Tiếp tục sang bước OTP <ArrowRight size={17} aria-hidden="true" />
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
            <div className="guest-booking-alert danger" role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              {error}
            </div>
          )}

          {/* Final Review Summary Card */}
          <div className="guest-review-card">
            <h5>Kiểm tra lại thông tin lịch đặt</h5>
            <dl className="guest-review-dl">
              <div>
                <dt>Tài nguyên</dt>
                <dd>{resource.name} ({resource.code}) · {categoryName}</dd>
              </div>
              <div>
                <dt>Thời gian</dt>
                <dd>Ngày {selectedDate} ({startTime} – {endTime}) · Giờ VN</dd>
              </div>
              <div>
                <dt>Người đặt</dt>
                <dd>{fullName} · {phone} · {email}</dd>
              </div>
              {organization && (
                <div>
                  <dt>Đơn vị</dt>
                  <dd>{organization}</dd>
                </div>
              )}
              <div>
                <dt>Địa chỉ</dt>
                <dd>{address.addressLine || "—"}</dd>
              </div>
              <div>
                <dt>Phí sử dụng</dt>
                <dd>
                  <strong className="text-teal-700 font-semibold">{formatMoney(quote?.amountVnd)} đ</strong>
                </dd>
              </div>
              <div>
                <dt>Kỳ vọng xử lý</dt>
                <dd>
                  {resource.effectiveRequiresApproval
                    ? "Yêu cầu sẽ ở trạng thái Chờ duyệt để cán bộ LAB xem xét trước khi bàn giao."
                    : "Lịch đặt được xác nhận tự động theo chính sách phòng LAB."}
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
                disabled={busyOtp || resendCooldown > 0 || !email}
              >
                {busyOtp ? (
                  <Loader2 className="spin" size={16} aria-hidden="true" />
                ) : (
                  <Mail size={16} aria-hidden="true" />
                )}
                {resendCooldown > 0
                  ? `Gửi lại mã (${resendCooldown}s)`
                  : otpSent
                  ? "Gửi lại OTP"
                  : "Gửi mã OTP qua email"}
              </button>
              <label htmlFor="guest-otp-input">
                Mã OTP (6 chữ số) *
                <input
                  id="guest-otp-input"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  minLength={6}
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="6 chữ số"
                  disabled={!otpSent}
                  autoComplete="one-time-code"
                />
              </label>
            </div>
            {!otpSent && (
              <p className="otp-hint-text">
                Vui lòng bấm nút <strong>Gửi mã OTP qua email</strong> để nhận mã xác thực gồm 6 chữ số gửi tới <strong>{email}</strong>.
              </p>
            )}
          </div>

          <div className="guest-action-row between">
            <button type="button" className="public-secondary guest-wizard-btn prev" onClick={() => setStep(2)}>
              <ArrowLeft size={16} aria-hidden="true" /> Quay lại thông tin
            </button>
            <button
              type="submit"
              className="public-primary guest-wizard-btn submit"
              disabled={busyBooking || !otpSent || !quote || quote.key !== quoteKey || otpCode.length !== 6}
            >
              {busyBooking ? (
                <Loader2 className="spin" size={17} aria-hidden="true" />
              ) : (
                <KeyRound size={17} aria-hidden="true" />
              )}
              Xác nhận đặt lịch
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
