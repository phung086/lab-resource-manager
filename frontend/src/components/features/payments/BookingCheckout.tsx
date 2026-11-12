import { formatVnd } from '../../../utils/currency';
import { PageHeading } from '../../base/PageHeading';
import { translate } from "../../../i18n.js";
import { useLocale } from '../../../providers/LocaleProvider';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, RefreshCw, ShieldCheck, CreditCard, ReceiptText, CalendarDays, CircleAlert, Landmark } from "lucide-react";
import { canChoosePaymentProvider, canInitiateBookingPayment, paymentMethods, paymentSessionStatus, paymentStatusLabels, safeVnpayUrl, type PaymentProvider, type PaymentAvailability } from "../../../utils/paymentValidation";
import { apiRequest } from "../../../api.js";
import { formatVietnamDateTime } from "../../../utils/timezone";
import { QuoteDiscountSummary } from './QuoteDiscountSummary';
import { BookingAccessPanel } from '../operations/BookingAccessPanel';
import { PaymentHoldNotice } from './PaymentHoldNotice';
import { BankTransferQr, type BankTransferDetails } from './BankTransferQr';
import { ReceiptButton } from './ReceiptButton';
import { workspacePathForTab } from '../../../workspaceRoutes.js';
import "./payments.css";
import "./payment-experience.css";

type Booking = { id: string; bookingCode?: string; requestedById: string; title: string; status: string; paymentDueAt?: string | null; feeAmountVnd: number; contactSnapshot?: { fullName: string; phone: string; email: string }; feeSnapshot?: { baseAmountVnd: number; discountAmountVnd: number; discountBps: number; loyaltyTier: string; loyaltyPolicyVersion: number; amountVnd: number }; fulfillmentSnapshot?: { mode: string; deliveryFeeVnd?: number }; startAt: string; endAt: string; resource: { code: string; name: string; category?: string } };
type Charge = { id: string; userId: string; amount: number; currency: string; status: string; provider: string; txnRef: string; paidAt: string | null; paymentUrlExpiresAt: string | null; reconciliationStatus: string; reconciliationReason: string | null };

export function BookingCheckout({ user, bookingId, onClearBooking, onChanged }: { user: { id: string; role: string }; bookingId: string; onClearBooking?: () => void; onChanged?: () => void }) {
  const { tr, locale } = useLocale();
  const actionErrorRef = useRef<HTMLParagraphElement>(null);
  const focusActionError = useRef(false);
  const loadAbort=useRef<AbortController | null>(null), busyRef=useRef(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [charge, setCharge] = useState<Charge | null>(null);
  const [providers, setProviders] = useState<PaymentAvailability>({});
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState("");
  const [transfer, setTransfer] = useState<{ id: string; details: BankTransferDetails } | null>(null);
  const [error, setError] = useState("");
  useEffect(()=>{if(error && !redirecting && focusActionError.current && actionErrorRef.current){focusActionError.current=false;actionErrorRef.current.focus();}},[error,redirecting]);
  const canPay = canInitiateBookingPayment(user, booking, charge);
  const homeDelivery = booking?.fulfillmentSnapshot?.mode === 'HOME_DELIVERY' ? booking.fulfillmentSnapshot : null;
  const displayStatus = charge ? paymentSessionStatus(charge) : '';
  const needsReview = charge?.reconciliationStatus === 'manual_review';
  const bookingClosed = !!booking && ['CANCELLED', 'REJECTED'].includes(booking.status);
  const bannerState = needsReview ? 'review' : charge?.status === 'success' || charge?.status === 'refunded' ? charge.status : bookingClosed ? 'closed' : displayStatus || 'pending';
  const bannerLabel = needsReview ? 'ui.manual_reconciliation_required_ad0551a4' : bookingClosed && charge?.status !== 'success' && charge?.status !== 'refunded' ? `enum.booking.${booking?.status}` : charge ? paymentStatusLabels[displayStatus] || 'ui.awaiting_payment_dd717eb2' : 'ui.payment_request_ec7f1b84';

  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;
  const sharedSnapshot = useRef("");
  const load = useCallback(async (silent = false, preserveError = false) => {
    loadAbort.current?.abort(); const controller=new AbortController();loadAbort.current=controller;if (!silent) { setLoading(true); setBooking(null); setCharge(null); } if (!preserveError) setError("");
    try {
      const [bookingRow, charges, paymentList] = await Promise.all([
        apiRequest(`/bookings/${encodeURIComponent(bookingId)}`,{signal:controller.signal}),
        apiRequest(`/payments/booking/${encodeURIComponent(bookingId)}`,{signal:controller.signal}),
        apiRequest("/payments/my",{signal:controller.signal})
      ]);
      if(controller.signal.aborted)return;setBooking(bookingRow);
      setCharge(charges.find((row: Charge) => row.status === "success") || charges.find((row: Charge) => row.status === "pending") || charges.find((row: Charge) => ["failed", "expired"].includes(row.status)) || charges[0] || null);
      setProviders(paymentList.providers || {});
      const snapshot = JSON.stringify([bookingRow.id, bookingRow.status, bookingRow.paymentDueAt, charges.map((row: Charge) => [row.id, row.status])]);
      if (snapshot !== sharedSnapshot.current) {
        sharedSnapshot.current = snapshot;
        onChangedRef.current?.();
      }
    } catch (cause: any) { if(!controller.signal.aborted && !preserveError)setError(cause.message || "ui.unable_to_load_the_lab_0799c568"); }
    finally { if(!controller.signal.aborted)setLoading(false); }
  }, [bookingId]);

  useEffect(() => { void load(); return()=>loadAbort.current?.abort(); }, [load]);
  useEffect(() => {
    if (charge?.status !== 'pending' || !booking || !['PENDING_APPROVAL','CONFIRMED'].includes(booking.status) || Date.parse(booking.endAt) <= Date.now()) return;
    let stopped = false, timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function poll() {
      if (stopped) return;
      if (!document.hidden && !busyRef.current) {
        try {
          const rows: Charge[] = await apiRequest(`/payments/booking/${encodeURIComponent(bookingId)}`, { signal:controller.signal });
          if (stopped) return;
          const updated = rows.find(row => row.status === 'success') || rows.find(row => row.id === charge?.id);
          if (updated && updated.status !== 'pending') { await load(true); return; }
        } catch (cause: any) {
          if (!controller.signal.aborted) setError(cause.message);
          // A failed/status-limited read requires explicit refresh. Never loop on 429.
          return;
        }
      }
      timer = setTimeout(() => void poll(), 10000);
    }
    timer = setTimeout(() => void poll(), 10000);
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, [bookingId, booking, charge?.id, charge?.status, load]);

  async function pay(method: PaymentProvider) {
    if (!charge || !booking || !canInitiateBookingPayment(user, booking, charge) || busyRef.current || !providers[method] || !canChoosePaymentProvider(charge, method)) return;
    busyRef.current=true;
    setRedirecting(method); setError("");
    try {
      const result = await apiRequest(`/payments/${charge.id}/${method}`, { method: "POST", body: "{}" });
      setCharge(result.transaction);
      if (method === 'vietqr') {
        setTransfer({ id: result.transaction.id, details: result.vietqr });
        return;
      }
      const target = result.transaction.status === 'success'
        ? workspacePathForTab('payments', { receipt: result.transaction.id })
        : safeVnpayUrl(result.paymentUrl);
      if (!target) throw new Error('ui.checkout.invalidProviderUrl');
      window.location.assign(target);
    } catch (cause: any) {
      focusActionError.current = true;
      setError(cause.message || 'api.PROVIDER_UNAVAILABLE');
      if (cause.code === 'PAYMENT_PROVIDER_LOCKED') void load(true, true);
    } finally {
      busyRef.current = false;
      setRedirecting('');
    }
  }

  return <section className="content-stack payment-page booking-checkout" aria-labelledby="booking-checkout-heading">
    <PageHeading className="page-section-header">
      <div><h1 id="booking-checkout-heading">{tr(charge?.status === 'success' ? 'ui.fulfillment.receipt' : 'ui.lab_booking_payment_5e2f0fb9')}</h1></div>
      <button type="button" className="secondary-button" onClick={() => void load()} disabled={loading || !!redirecting}><RefreshCw size={16} /> {tr("ui.refresh_b4c61340")}</button>
    </PageHeading>
    {error && <p ref={actionErrorRef} tabIndex={-1} className="alert danger" role="alert">{translate(error)}</p>}
    {loading ? <p role="status">{translate("ui.loading_payment_details_1be4a89c")}</p> : booking && <><section className={`checkout-banner is-${bannerState}`} aria-label={tr('ui.checkout.summary')}>
      <div className="checkout-banner-icon" aria-hidden="true">{needsReview || bookingClosed ? <CircleAlert size={32}/> : charge?.status === 'success' ? <ShieldCheck size={32}/> : <CreditCard size={32}/>}</div>
      <div><span className="checkout-banner-status">{tr(bannerLabel)}</span><h2>{formatVnd(charge?.amount ?? booking.feeAmountVnd, locale)}</h2><p>{booking.bookingCode || booking.id}</p></div>
      <div className="checkout-banner-context"><CalendarDays size={18} aria-hidden="true"/><span>{booking.resource.name}<small>{formatVietnamDateTime(booking.startAt)}</small></span></div>
    </section><div className="booking-checkout-order"><div className="booking-checkout-summary">
      <h2>{booking.title}</h2>
      <p>{booking.resource.code} · {booking.resource.name}</p>
      <a className="btn btn-secondary" href={workspacePathForTab('bookings', { booking:booking.id })}>{tr('ui.paymentJourney.openBooking')}</a>
      <dl>
        <dt>{tr("ui.booking_reference_e80792a6")}</dt><dd className="payment-ref">{booking.bookingCode || booking.id}</dd>
        <dt>{tr("ui.time_b295fd62")}</dt><dd>{formatVietnamDateTime(booking.startAt)} – {formatVietnamDateTime(booking.endAt)}</dd>
        <dt>{tr("ui.usage_fee_cdf18099")}</dt><dd><strong className="payment-amount">{formatVnd(booking.feeAmountVnd, locale)}</strong></dd>
        {homeDelivery && <>
          <dt>{tr('ui.fulfillment.receiveMethod')}</dt><dd>{tr('ui.fulfillment.homeDelivery')}</dd>
          <dt>{tr('ui.checkout.deliveryFeeLabel')}</dt><dd>{typeof homeDelivery.deliveryFeeVnd === 'number' ? formatVnd(homeDelivery.deliveryFeeVnd, locale) : '—'}</dd>
        </>}
        {charge && <><dt>{translate("ui.payment_reference_3749e1af")}</dt><dd className="payment-ref">{charge.txnRef}</dd></>}
        {charge?.status === 'success' && booking.contactSnapshot && <><dt>{tr('ui.full_name_03de764f')}</dt><dd>{booking.contactSnapshot.fullName}</dd><dt>{tr('ui.customer.phoneLabel')}</dt><dd>{booking.contactSnapshot.phone}</dd></>}
      </dl>
      <QuoteDiscountSummary quote={booking.feeSnapshot} />
      {booking.status === 'PENDING_APPROVAL' && booking.paymentDueAt && !['success', 'refunded'].includes(charge?.status || '') && <PaymentHoldNotice paymentDueAt={booking.paymentDueAt} startAt={booking.startAt} onExpired={() => void load(true)} />}
      </div><div className="booking-checkout-status"><h2 className="checkout-action-heading"><ReceiptText size={20} aria-hidden="true"/>{tr('ui.checkout.nextAction')}</h2>{booking.feeAmountVnd === 0 ? <div className="alert" role="status">{translate("ui.this_booking_is_free_and_a79ab8e0")}</div>
        : booking.status === 'PENDING_APPROVAL' && !booking.paymentDueAt ? <div className="alert" role="status">{translate('ui.awaiting_lab_staff_approval_a_7acf2a8a')}</div>
        : ["REJECTED", "CANCELLED"].includes(booking.status) && charge?.status === "success" && charge.reconciliationStatus === "manual_review" ? <div className="alert warning" role="status">{tr('ui.checkout.latePayment')} {booking.status === "REJECTED" ? tr("ui.rejected_cb6ec8af") : tr("ui.cancelled_2cdb07af")}{translate("ui.an_administrator_must_reconcile_the_682abc88")}</div>
        : ["REJECTED", "CANCELLED"].includes(booking.status) ? <div className="alert" role="status">{translate("ui.the_booking_has_been_09264f80")} {booking.status === "REJECTED" ? tr("ui.rejected_cb6ec8af") : translate("ui.cancelled_a37e2797")}{translate("ui.this_booking_cannot_be_paid_ed942f5f")}</div>
        : charge?.status === "success" ? <div className="alert success" role="status"><ShieldCheck size={18} />  {translate("ui.payment_verified_c37ae36e")} {formatVnd(charge.amount, locale)}  {translate("ui.at_0febedcf")} {charge.paidAt ? formatVietnamDateTime(charge.paidAt) : "—"}.</div>
        : charge && !canPay ? <div className="booking-checkout-payment"><h3>{tr('ui.payment_request_ec7f1b84')}</h3><span className={`payment-state payment-${displayStatus}`}>{tr(paymentStatusLabels[displayStatus])}</span>{charge.paidAt && <p>{formatVietnamDateTime(charge.paidAt)}</p>}</div>
        : charge && canPay ? <div className="booking-checkout-payment">
          <h3>{tr('ui.choose_method_da36b3c9')}</h3>
          {displayStatus !== "pending" && <p className="alert warning" role="status">{tr(paymentStatusLabels[displayStatus])}</p>}
          <div className="payment-provider-choices">
            {paymentMethods.map(method => (
              <button key={method} type="button" className={method === 'vnpay' ? 'primary-button' : 'secondary-button'}
                disabled={!providers[method] || !!redirecting || !canChoosePaymentProvider(charge, method)} onClick={() => void pay(method)}>
                {method === 'vnpay' ? <ExternalLink size={17} aria-hidden="true" /> : <Landmark size={17} aria-hidden="true" />}
                {redirecting === method ? tr('ui.processing_79eb2035') : method === 'vnpay'
                  ? tr('ui.pay_using_vnpay_qr_8b6b9bbd', { value0: formatVnd(charge.amount, locale) })
                  : tr('ui.checkout.bankTransfer')}
                {!providers[method] && <small className="checkout-provider-state">{tr('ui.checkout.providerNotConfigured')}</small>}
              </button>
            ))}
          </div>
          {!paymentMethods.some(method => providers[method]) && <p className="alert warning" role="status">{tr('ui.payments.noGateway')}</p>}
          {charge.status === 'pending' && transfer?.id === charge.id &&
            <BankTransferQr key={transfer.id} details={transfer.details} expiresAt={charge.paymentUrlExpiresAt} />}
        </div> : <div className="alert warning">{translate("ui.no_valid_charge_exists_for_44e6869a")}</div>}
      {charge?.status === 'success' && <ReceiptButton transactionId={charge.id} />}
      {booking.requestedById === user.id && (booking.feeAmountVnd === 0 || (charge?.status === 'success' && charge.reconciliationStatus === 'none')) && <BookingAccessPanel key={booking.id} bookingId={booking.id} status={booking.status} category={booking.resource.category} onChanged={() => void load(true)} />}
    <aside className="checkout-email-note"><strong>{tr('ui.checkout.receiptTitle')}</strong><p>{tr('ui.checkout.receiptHelp')}</p></aside></div></div></>}
    <button type="button" className="secondary-button" onClick={onClearBooking}><ArrowLeft size={16} />  {translate("ui.view_transactions_c48a4c6f")}</button>
  </section>;
}
