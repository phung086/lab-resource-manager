import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { apiRequest } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
import { PaymentReceipt, type PaymentReceiptData } from './PaymentReceipt';
import './payments.css';

export function ReceiptButton({ transactionId }: { transactionId: string }) {
  const { tr } = useLocale();
  const [receipt, setReceipt] = useState<PaymentReceiptData | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error && !busy) errorRef.current?.focus(); }, [error, busy]);
  async function open() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { setReceipt(await apiRequest(`/payments/${encodeURIComponent(transactionId)}/receipt`)); }
    catch (cause: any) { setError(cause.message); }
    finally { pending.current = false; setBusy(false); }
  }
  return <>
    <button type="button" className="btn btn-primary" aria-disabled={busy} onClick={() => void open()}><FileText size={17} />{tr(busy ? 'ui.loading_148ded83' : 'ui.open_receipt_68f863f1')}</button>
    {error && <p ref={errorRef} tabIndex={-1} className="alert danger" role="alert">{tr(error)}</p>}
    <PaymentReceipt receipt={receipt} onClose={() => setReceipt(null)} />
  </>;
}
