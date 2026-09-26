import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { apiRequest } from "../../../api.js";
import { formatVietnamDateTime } from "../../../utils/timezone";
import "./payments.css";

type Booking = { id: string; title: string; status: string; feeAmountVnd: number; startAt: string; endAt: string; resource: { code: string; name: string } };
type Charge = { id: string; amount: number; currency: string; status: string; provider: string; txnRef: string; paidAt: string | null };
const money = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

export function BookingCheckout({ bookingId, onClearBooking }: { bookingId: string; onClearBooking?: () => void }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [charge, setCharge] = useState<Charge | null>(null);
  const [vnpayReady, setVnpayReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [bookingRow, charges, paymentList] = await Promise.all([
        apiRequest(`/bookings/${encodeURIComponent(bookingId)}`),
        apiRequest(`/payments/booking/${encodeURIComponent(bookingId)}`),
        apiRequest("/payments/my")
      ]);
      setBooking(bookingRow);
      setCharge(charges.find((row: Charge) => row.status === "success") || charges.find((row: Charge) => row.status === "pending") || charges[0] || null);
      setVnpayReady(Boolean(paymentList.providers?.vnpay));
    } catch (cause: any) { setError(cause.message || "Không thể tải lịch đặt LAB."); }
    finally { setLoading(false); }
  }, [bookingId]);

  useEffect(() => { void load(); }, [load]);

  async function pay() {
    if (!charge || !booking || redirecting) return;
    setRedirecting(true); setError("");
    try {
      const result = await apiRequest(`/payments/${charge.id}/vnpay`, { method: "POST", body: "{}" });
      const target = new URL(result.paymentUrl);
      if (target.origin !== "https://sandbox.vnpayment.vn" || target.pathname !== "/paymentv2/vpcpay.html" || target.searchParams.get("vnp_BankCode") !== "VNPAYQR") {
        throw new Error("Địa chỉ thanh toán VNPAY không hợp lệ. Vui lòng liên hệ cán bộ lab.");
      }
      window.location.assign(target.toString());
    } catch (cause: any) { setError(cause.message || "Không thể mở cổng thanh toán VNPAY."); setRedirecting(false); }
  }

  return <section className="content-stack payment-page booking-checkout" aria-labelledby="booking-checkout-heading">
    <header className="page-section-header">
      <div><h1 id="booking-checkout-heading">Thanh toán lịch đặt LAB</h1><p className="section-description">Xem lại lịch đặt LAB và thanh toán bằng QR tại cổng VNPAY.</p></div>
      <button type="button" className="secondary-button" onClick={load} disabled={loading || redirecting}><RefreshCw size={16} /> Làm mới</button>
    </header>
    {error && <p className="alert danger" role="alert">{error}</p>}
    {loading ? <p role="status">Đang tải thông tin thanh toán…</p> : booking && <div className="panel booking-checkout-order">
      <h2>{booking.title}</h2>
      <p>{booking.resource.code} · {booking.resource.name}</p>
      <dl>
        <dt>Thời gian</dt><dd>{formatVietnamDateTime(booking.startAt)} – {formatVietnamDateTime(booking.endAt)}</dd>
        <dt>Mã booking</dt><dd className="payment-ref">{booking.id}</dd>
        <dt>Phí sử dụng</dt><dd><strong className="payment-amount">{money(booking.feeAmountVnd)}</strong></dd>
        {charge && <><dt>Mã thanh toán</dt><dd className="payment-ref">{charge.txnRef}</dd></>}
      </dl>
      {booking.feeAmountVnd === 0 ? <div className="alert" role="status">Lịch đặt này không có phí sử dụng, nên không có QR thanh toán. Nếu tài nguyên có bảng giá mới, mức giá đó chỉ áp dụng cho booking tạo sau khi bảng giá được lưu.</div>
        : booking.status === "PENDING_APPROVAL" ? <div className="alert" role="status">Yêu cầu đang chờ cán bộ lab duyệt. Sau khi được duyệt, hệ thống tạo khoản thu và bạn có thể thanh toán tại đây.</div>
        : ["REJECTED", "CANCELLED"].includes(booking.status) ? <div className="alert" role="status">Lịch đặt đã {booking.status === "REJECTED" ? "bị từ chối" : "hủy"}. Không thể thanh toán booking này.</div>
        : charge?.status === "success" ? <div className="alert success" role="status"><ShieldCheck size={18} /> Đã xác minh thanh toán {money(charge.amount)} lúc {charge.paidAt ? formatVietnamDateTime(charge.paidAt) : "—"}.</div>
        : charge?.status === "pending" ? <div className="booking-checkout-payment">
          <h3>Thanh toán bằng VNPAY-QR</h3>
          <p>Chọn thanh toán để mở trang bảo mật của VNPAY. Mã QR sẽ được VNPAY hiển thị tại đó; bạn quét bằng ứng dụng ngân hàng hỗ trợ VNPAY-QR. Thông tin thẻ hoặc tài khoản ngân hàng được nhập trên trang VNPAY.</p>
          <button type="button" className="primary-button" disabled={!vnpayReady || redirecting || charge.provider === "vietqr"} onClick={pay}><ExternalLink size={17} /> {redirecting ? "Đang chuyển sang VNPAY…" : `Thanh toán ${money(charge.amount)} qua VNPAY-QR`}</button>
          {!vnpayReady && <p className="alert warning" role="status">Cổng VNPAY chưa được cấu hình trên máy chủ. Khoản thu đã lưu nhưng chưa thể tạo QR thanh toán; vui lòng liên hệ cán bộ lab.</p>}
          {charge.provider === "vietqr" && <p className="alert warning">Giao dịch này đã chọn VietQR và đang chờ đối soát. Không thể đổi sang VNPAY cho cùng giao dịch.</p>}
          <small>Trạng thái “đã thanh toán” chỉ xuất hiện khi máy chủ nhận và kiểm tra thông báo xác thực từ VNPAY.</small>
        </div> : <div className="alert warning">Chưa có khoản thu hợp lệ cho booking này. Vui lòng làm mới hoặc liên hệ cán bộ lab.</div>}
    </div>}
    <button type="button" className="secondary-button" onClick={onClearBooking}><ArrowLeft size={16} /> Xem các giao dịch</button>
  </section>;
}
