import { translate } from "../../../i18n.js";
import { useLocale } from '../../../providers/LocaleProvider';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { canInitiateBookingPayment, paymentSessionStatus, safeVnpayUrl } from "../../../utils/paymentValidation";
import { apiRequest } from "../../../api.js";
import { formatVietnamDateTime } from "../../../utils/timezone";
import { QuoteDiscountSummary } from './QuoteDiscountSummary';
import "./payments.css";

type Booking = { id: string; requestedById: string; title: string; status: string; feeAmountVnd: number; feeSnapshot?: { baseAmountVnd: number; discountAmountVnd: number; discountBps: number; loyaltyTier: string; loyaltyPolicyVersion: number; amountVnd: number }; startAt: string; endAt: string; resource: { code: string; name: string } };
type Charge = { id: string; userId: string; amount: number; currency: string; status: string; provider: string; txnRef: string; paidAt: string | null; paymentUrlExpiresAt: string | null; reconciliationStatus: string; reconciliationReason: string | null };
const money = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

export function BookingCheckout({ user, bookingId, onClearBooking }: { user: { id: string; role: string }; bookingId: string; onClearBooking?: () => void }) {
  const { tr } = useLocale();
  const loadAbort=useRef<AbortController | null>(null), busyRef=useRef(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [charge, setCharge] = useState<Charge | null>(null);
  const [vnpayReady, setVnpayReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");
  const canPay = canInitiateBookingPayment(user, booking, charge);
  const displayStatus = charge ? paymentSessionStatus(charge) : '';
  const statusKeys: Record<string, string> = { pending: 'ui.awaiting_payment_dd717eb2', success: 'ui.payment_verified_c37ae36e', failed: 'ui.payment_failed_39d4ec59', expired: 'ui.session_expired_213530d5', refunded: 'ui.refunded_d0d4c45f' };

  const load = useCallback(async () => {
    loadAbort.current?.abort(); const controller=new AbortController();loadAbort.current=controller;setLoading(true); setError("");setBooking(null);setCharge(null);
    try {
      const [bookingRow, charges, paymentList] = await Promise.all([
        apiRequest(`/bookings/${encodeURIComponent(bookingId)}`,{signal:controller.signal}),
        apiRequest(`/payments/booking/${encodeURIComponent(bookingId)}`,{signal:controller.signal}),
        apiRequest("/payments/my",{signal:controller.signal})
      ]);
      if(controller.signal.aborted)return;setBooking(bookingRow);
      setCharge(charges.find((row: Charge) => row.status === "success") || charges.find((row: Charge) => row.status === "pending") || charges.find((row: Charge) => ["failed", "expired"].includes(row.status)) || charges[0] || null);
      setVnpayReady(Boolean(paymentList.providers?.vnpay));
    } catch (cause: any) { if(!controller.signal.aborted)setError(cause.message || "ui.unable_to_load_the_lab_0799c568"); }
    finally { if(!controller.signal.aborted)setLoading(false); }
  }, [bookingId]);

  useEffect(() => { void load(); return()=>loadAbort.current?.abort(); }, [load]);

  async function pay() {
    if (!charge || !booking || !canPay || busyRef.current || !vnpayReady) return;
    busyRef.current=true;
    setRedirecting(true); setError("");
    try {
      const result = await apiRequest(`/payments/${charge.id}/vnpay`, { method: "POST", body: "{}" });
      setCharge(result.transaction);
      const target=safeVnpayUrl(result.paymentUrl);if(!target)throw new Error("ui.invalid_vnpay_payment_address_please_bed3b506");window.location.assign(target);
    } catch (cause: any) { setError(cause.message || "ui.unable_to_open_the_vnpay_b0ce765e"); busyRef.current=false;setRedirecting(false); }
  }

  return <section className="content-stack payment-page booking-checkout" aria-labelledby="booking-checkout-heading">
    <header className="page-section-header">
      <div><h1 id="booking-checkout-heading">{translate("ui.lab_booking_payment_5e2f0fb9")}</h1></div>
      <button type="button" className="secondary-button" onClick={load} disabled={loading || redirecting}><RefreshCw size={16} /> {tr("ui.refresh_b4c61340")}</button>
    </header>
    {error && <p className="alert danger" role="alert">{translate(error)}</p>}
    {loading ? <p role="status">{translate("ui.loading_payment_details_1be4a89c")}</p> : booking && <div className="booking-checkout-order"><div className="booking-checkout-summary">
      <h2>{booking.title}</h2>
      <p>{booking.resource.code} · {booking.resource.name}</p>
      <dl>
        <dt>{tr("ui.time_b295fd62")}</dt><dd>{formatVietnamDateTime(booking.startAt)} – {formatVietnamDateTime(booking.endAt)}</dd>
        <dt>{tr("ui.booking_reference_e80792a6")}</dt><dd className="payment-ref">{booking.id}</dd>
        <dt>{tr("ui.usage_fee_cdf18099")}</dt><dd><strong className="payment-amount">{money(booking.feeAmountVnd)}</strong></dd>
        {charge && <><dt>{translate("ui.payment_reference_3749e1af")}</dt><dd className="payment-ref">{charge.txnRef}</dd></>}
      </dl>
      <QuoteDiscountSummary quote={booking.feeSnapshot} />
      </div><div className="booking-checkout-status">{booking.feeAmountVnd === 0 ? <div className="alert" role="status">{translate("ui.this_booking_is_free_and_a79ab8e0")}</div>
        : booking.status === "PENDING_APPROVAL" ? <div className="alert" role="status">{translate("ui.awaiting_lab_staff_approval_a_7acf2a8a")}</div>
        : ["REJECTED", "CANCELLED"].includes(booking.status) && charge?.status === "success" && charge.reconciliationStatus === "manual_review" ? <div className="alert warning" role="status">{translate("ui.vnpay_verified_this_payment_after_b54cfde0")} {booking.status === "REJECTED" ? tr("ui.rejected_cb6ec8af") : tr("ui.cancelled_2cdb07af")}{translate("ui.an_administrator_must_reconcile_the_682abc88")}</div>
        : ["REJECTED", "CANCELLED"].includes(booking.status) ? <div className="alert" role="status">{translate("ui.the_booking_has_been_09264f80")} {booking.status === "REJECTED" ? tr("ui.rejected_cb6ec8af") : translate("ui.cancelled_a37e2797")}{translate("ui.this_booking_cannot_be_paid_ed942f5f")}</div>
        : charge?.status === "success" ? <div className="alert success" role="status"><ShieldCheck size={18} />  {translate("ui.payment_verified_c37ae36e")} {money(charge.amount)}  {translate("ui.at_0febedcf")} {charge.paidAt ? formatVietnamDateTime(charge.paidAt) : "—"}.</div>
        : charge && !canPay ? <div className="booking-checkout-payment"><h3>{tr('ui.payment_request_ec7f1b84')}</h3><span className={`payment-state payment-${displayStatus}`}>{tr(statusKeys[displayStatus])}</span>{charge.paidAt && <p>{formatVietnamDateTime(charge.paidAt)}</p>}</div>
        : charge && canPay ? <div className="booking-checkout-payment">
          <h3>{translate("ui.pay_with_vnpay_qr_5c622fc2")}</h3>
          {displayStatus !== "pending" && <p className="alert warning" role="status">{tr(statusKeys[displayStatus])}</p>}
          <button type="button" className="primary-button" disabled={!vnpayReady || redirecting || charge.provider === "vietqr"} onClick={pay}><ExternalLink size={17} /> {redirecting ? translate("ui.redirecting_to_vnpay_4032989c") : translate("ui.pay_using_vnpay_qr_8b6b9bbd", { value0: money(charge.amount) })}</button>
          {!vnpayReady && <p className="alert warning" role="status">{translate("ui.vnpay_is_not_configured_on_4832ddeb")}</p>}
          {charge.provider === "vietqr" && <p className="alert warning">{translate("ui.this_transaction_uses_vietqr_and_0585cf77")}</p>}
        </div> : <div className="alert warning">{translate("ui.no_valid_charge_exists_for_44e6869a")}</div>}
    </div></div>}
    <button type="button" className="secondary-button" onClick={onClearBooking}><ArrowLeft size={16} />  {translate("ui.view_transactions_c48a4c6f")}</button>
  </section>;
}
