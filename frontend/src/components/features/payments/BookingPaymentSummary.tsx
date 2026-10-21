import { useEffect, useState } from 'react';
import { apiRequest } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
import type { BookingRecord } from '../../../types/booking';
import { ReceiptButton } from './ReceiptButton';
import { canInitiateBookingPayment } from '../../../utils/paymentValidation';

export function BookingPaymentSummary({ booking, user, onPayment }: { booking: BookingRecord; user: { id: string; role: string }; onPayment?: (booking: BookingRecord) => void }) {
  const { tr } = useLocale();
  const [rows, setRows] = useState<any[] | null>(null), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setRows(null); setError('');
    apiRequest(`/payments/booking/${encodeURIComponent(booking.id)}`, { signal:controller.signal }).then(data => { if (!controller.signal.aborted) setRows(data); }).catch((cause: any) => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [booking.id, booking.status, revision]);
  const charge = rows?.find(row => row.status === 'success') || rows?.find(row => row.status === 'pending') || rows?.[0];
  const canPay = canInitiateBookingPayment(user, booking, charge);
  return <section className="booking-payment-summary operations-dossier-section" aria-label={tr('ui.payment_ledger_49cf3f23')}>
    <div><h3>{tr(charge?.status === 'success' ? 'ui.payment_verified_c37ae36e' : 'ui.usage_fee_cdf18099')}</h3><strong>{new Intl.NumberFormat('vi-VN', {style:'currency',currency:'VND'}).format(booking.feeAmountVnd || 0)}</strong></div>
    {rows === null && !error && <p role="status">{tr('ui.loading_payment_details_1be4a89c')}</p>}
    {error && <p role="alert">{tr(error)} <button type="button" className="btn btn-secondary" onClick={() => setRevision(value => value + 1)}>{tr('ui.retry_c58d068c')}</button></p>}
    {charge?.status === 'success' && <ReceiptButton transactionId={charge.id} />}
    {charge?.reconciliationStatus === 'manual_review' && <p className="alert warning" role="status">{tr('ui.manual_reconciliation_required_ad0551a4')}</p>}
    {onPayment && rows && <button type="button" className="btn btn-secondary" onClick={() => onPayment(booking)}>{tr(canPay ? 'ui.pay_for_booking_317a349c' : 'ui.paymentJourney.viewDetails')}</button>}
  </section>;
}
