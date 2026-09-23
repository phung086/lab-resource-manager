import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Mail, WalletCards } from "lucide-react";
import { apiRequest } from "../api.js";
import { vietnamTimeToIso } from "../utils/timezone.js";
import { VietnamAddressSelector } from "./VietnamAddressSelector";
import "../styles/guest-booking.css";

type Resource = { id: string; name: string; code: string; category?: string };
type AddressValue = { addressLine: string; provinceCode: string; wardCode: string };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

export function GuestQuickBookingPanel({ resource, onComplete }: { resource: Resource; onComplete: (result: any) => void }) {
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<AddressValue>({ addressLine: "", provinceCode: "", wardCode: "" });
  const [title, setTitle] = useState(`Đặt nhanh ${resource.name}`);
  const [purpose, setPurpose] = useState("Sử dụng phòng LAB mở / hợp tác học thuật");
  const [selectedDate, setSelectedDate] = useState(today());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [purposeCode, setPurposeCode] = useState("");
  const [quote, setQuote] = useState<any>(null);
  const [quoteError, setQuoteError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [busyOtp, setBusyOtp] = useState(false);
  const [busyBooking, setBusyBooking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(`Đặt nhanh ${resource.name}`);
    setQuote(null);
    setPricingRules([]);
    setPurposeCode("");
    let active = true;
    apiRequest(`/booking-pricing/${encodeURIComponent(resource.id)}`)
      .then((rows: any[]) => { if (active) { setPricingRules(rows || []); setPurposeCode(rows?.[0]?.purposeCode || ""); } })
      .catch((cause: Error) => { if (active) setQuoteError(cause.message || "Không tải được bảng phí."); });
    return () => { active = false; };
  }, [resource.id, resource.name]);

  const quoteKey = useMemo(() => `${resource.id}|${purposeCode}|${selectedDate}|${startTime}|${endTime}`, [resource.id, purposeCode, selectedDate, startTime, endTime]);

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
    return () => { active = false; clearTimeout(timer); };
  }, [resource.id, purposeCode, selectedDate, startTime, endTime, quoteKey]);

  async function sendOtp() {
    if (busyOtp) return;
    setBusyOtp(true);
    setError("");
    setMessage("");
    try {
      await apiRequest("/guest-booking/otp", {
        method: "POST",
        body: JSON.stringify({ email, fullName })
      });
      setOtpSent(true);
      setMessage("OTP đã được gửi tới email. Mã hết hạn sau 10 phút.");
    } catch (cause: any) {
      setError(cause?.message || "Không gửi được OTP.");
    } finally {
      setBusyOtp(false);
    }
  }

  async function submitBooking(event: React.FormEvent) {
    event.preventDefault();
    if (busyBooking || !quote || quote.key !== quoteKey) return;
    setBusyBooking(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest("/guest-booking/book", {
        method: "POST",
        body: JSON.stringify({
          email,
          otpCode,
          fullName,
          phone,
          organization,
          address,
          booking: {
            resourceId: resource.id,
            title,
            purpose,
            ...(purposeCode ? { purposeCode } : {}),
            acceptedQuote: { amountVnd: quote.amountVnd, version: quote.version },
            startAt: vietnamTimeToIso(selectedDate, startTime),
            endAt: vietnamTimeToIso(selectedDate, endTime)
          }
        })
      });
      onComplete(result);
    } catch (cause: any) {
      setError(cause?.message || "Không hoàn tất được đặt lịch.");
    } finally {
      setBusyBooking(false);
    }
  }

  return (
    <form className="guest-booking-panel" onSubmit={submitBooking}>
      <div className="guest-booking-head">
        <span><WalletCards size={17} /> Quick booking cho khách ngoài trường</span>
        <p>Nhập thông tin một lần, xác thực email bằng OTP, hệ thống tự tạo tài khoản và chuyển vào luồng đặt lịch/thanh toán.</p>
      </div>

      {message && <div className="guest-booking-alert success" role="status"><CheckCircle2 size={16} />{message}</div>}
      {error && <div className="guest-booking-alert danger" role="alert">{error}</div>}

      <div className="guest-booking-grid">
        <label>Họ tên *<input value={fullName} onChange={e => setFullName(e.target.value)} required minLength={2} maxLength={255} autoComplete="name" /></label>
        <label>Đơn vị / tổ chức<input value={organization} onChange={e => setOrganization(e.target.value)} maxLength={160} autoComplete="organization" placeholder="Không bắt buộc" /></label>
        <label>Email nhận OTP *<input value={email} onChange={e => setEmail(e.target.value)} required type="email" autoComplete="email" /></label>
        <label>Số điện thoại *<input value={phone} onChange={e => setPhone(e.target.value)} required minLength={9} maxLength={20} autoComplete="tel" /></label>
      </div>

      <VietnamAddressSelector value={address} onChange={setAddress} required />

      <div className="guest-booking-grid">
        <label>Tiêu đề lịch *<input value={title} onChange={e => setTitle(e.target.value)} required maxLength={255} /></label>
        <label>Mục đích sử dụng *<input value={purpose} onChange={e => setPurpose(e.target.value)} required maxLength={500} /></label>
        <label>Ngày sử dụng *<input type="date" value={selectedDate} min={today()} onChange={e => setSelectedDate(e.target.value)} required /></label>
        <div className="guest-time-row"><label>Giờ bắt đầu *<input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required /></label><label>Giờ kết thúc *<input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required /></label></div>
      </div>

      {pricingRules.length > 0 && <label className="guest-purpose">Mục đích tính phí<select value={purposeCode} onChange={e => setPurposeCode(e.target.value)}>{pricingRules.map(rule => <option key={rule.id} value={rule.purposeCode}>{rule.label} — {formatMoney(rule.hourlyRateVnd)} đ/giờ</option>)}</select></label>}
      <div className="guest-booking-quote" aria-live="polite">
        {quoteError ? <span role="alert">{quoteError}</span> : quote?.key === quoteKey ? <span>Phí tạm tính: <strong>{formatMoney(quote.amountVnd)} đ</strong>{quote.amountVnd > 0 ? " · Nếu lịch được xác nhận, tiếp tục thanh toán bằng VNPAY/VietQR." : " · Tài nguyên/mục đích này đang miễn phí."}</span> : <span>Đang tính phí…</span>}
      </div>

      <div className="guest-otp-row">
        <button type="button" className="public-secondary" onClick={sendOtp} disabled={busyOtp || !email || !fullName}>{busyOtp ? <Loader2 className="spin" size={16} /> : <Mail size={16} />} Gửi OTP email</button>
        <label>OTP *<input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} required minLength={6} maxLength={6} inputMode="numeric" placeholder="6 chữ số" disabled={!otpSent} /></label>
      </div>

      <button type="submit" className="public-primary" disabled={busyBooking || !otpSent || !quote || quote.key !== quoteKey}>{busyBooking ? <Loader2 className="spin" size={17} /> : <KeyRound size={17} />} Xác thực & đặt lịch</button>
    </form>
  );
}
