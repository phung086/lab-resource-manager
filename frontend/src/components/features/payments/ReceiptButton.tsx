import { useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { apiRequest } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
import { BaseModal2026 } from '../../BaseModal2026';
import { formatVietnamDateTime } from '../../../utils/timezone';
import './payments.css';

export function ReceiptButton({ transactionId }: { transactionId: string }) {
  const { tr } = useLocale();
  const [receipt, setReceipt] = useState<any>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function open() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { setReceipt(await apiRequest(`/payments/${encodeURIComponent(transactionId)}/receipt`)); }
    catch (cause: any) { setError(cause.message); }
    finally { pending.current = false; setBusy(false); }
  }
  const row = receipt?.transaction;
  return <>
    <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void open()}><FileText size={17} />{tr(busy ? 'ui.loading_148ded83' : 'ui.open_receipt_68f863f1')}</button>
    {error && <p className="alert danger" role="alert">{tr(error)}</p>}
    <BaseModal2026 isOpen={!!receipt} onClose={() => setReceipt(null)} title={tr('ui.internal_payment_receipt_d9efbde5')} footer={<button type="button" className="primary-button" onClick={() => window.print()}>{tr('ui.print_receipt_ce9c48ea')}</button>}>
      {row && <article className="payment-receipt"><h2>{tr('ui.internal_payment_receipt_d9efbde5')}</h2><p>{tr('ui.payment_verified_c37ae36e')}</p><dl>
        <dt>{tr('ui.transaction_reference_717b27eb')}</dt><dd>{row.txnRef}</dd>
        <dt>{tr('ui.amount_4cbdc55b')}</dt><dd>{new Intl.NumberFormat('vi-VN', { style:'currency', currency:'VND' }).format(row.amount)}</dd>
        <dt>{tr('ui.payer_9f6325a0')}</dt><dd>{row.user?.fullName}</dd>
        <dt>{tr('ui.bookings_00f5b333')}</dt><dd>{row.booking?.title}</dd>
        <dt>{tr('ui.resource_9a35ef53')}</dt><dd>{row.booking?.resource?.name}</dd>
        <dt>{tr('ui.booking_reference_189e7a5d')}</dt><dd>{row.booking?.bookingCode || row.booking?.id}</dd>
        <dt>{tr('ui.payment_time_cfbad42e')}</dt><dd>{row.paidAt ? formatVietnamDateTime(row.paidAt) : '—'}</dd>
      </dl><p>{tr('ui.paymentJourney.receiptDisclaimer')}</p></article>}
    </BaseModal2026>
  </>;
}
