import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
import { workspacePathForTab } from '../../../workspaceRoutes.js';
import { PaymentReceiptContent, type PaymentReceiptData } from './PaymentReceipt';
import { paymentProviderName } from '../../../utils/paymentValidation';

const POLL_INTERVAL_MS = 5000;
const POLL_WINDOW_MS = 60000;
const terminalLabels: Record<string, string> = {
  failed: 'ui.payment_failed_39d4ec59',
  expired: 'ui.session_expired_213530d5',
  refunded: 'ui.refunded_d0d4c45f',
};

type ReceiptState =
  | { kind: 'loading' }
  | { kind: 'pending'; provider: string }
  | { kind: 'unavailable' | 'error'; message: string }
  | { kind: 'ready'; receipt: PaymentReceiptData };

export function PaymentReceiptPage({ transactionId, onChanged }: { transactionId: string; onChanged?: () => void }) {
  const { tr } = useLocale();
  const [state, setState] = useState<ReceiptState>({ kind: 'loading' });
  const [revision, setRevision] = useState(0);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const path = `/payments/${encodeURIComponent(transactionId)}`;
    const deadline = Date.now() + POLL_WINDOW_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function readPayment() {
      try {
        const payment: { status: string; provider: string } = await apiRequest(path, { signal });
        if (signal.aborted) return;

        if (payment.status === 'success') {
          const receipt: PaymentReceiptData = await apiRequest(`${path}/receipt`, { signal });
          if (signal.aborted) return;
          setState({ kind: 'ready', receipt });
          onChangedRef.current?.();
        } else if (payment.status === 'pending') {
          setState({ kind: 'pending', provider: payment.provider });
          if (Date.now() + POLL_INTERVAL_MS <= deadline) {
            timer = setTimeout(() => void readPayment(), POLL_INTERVAL_MS);
          }
        } else {
          setState({ kind: 'unavailable', message: terminalLabels[payment.status] || 'api.PAYMENT_NOT_VERIFIED' });
        }
      } catch (error) {
        if (!signal.aborted) {
          setState({ kind: 'error', message: error instanceof Error ? error.message : 'api.API_REQUEST_FAILED' });
        }
      }
    }

    void readPayment();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [transactionId, revision]);

  function refresh() {
    setState({ kind: 'loading' });
    setRevision(value => value + 1);
  }

  return <section className="payment-receipt-page">
    <div className="payment-receipt-actions">
      <a className="btn btn-secondary" href={workspacePathForTab('payments')}>
        <ArrowLeft size={16} aria-hidden="true" />{tr('ui.view_transactions_c48a4c6f')}
      </a>
      {state.kind === 'ready'
        ? <button type="button" className="primary-button" onClick={() => window.print()}>
          <Printer size={17} aria-hidden="true" />{tr('ui.print_receipt_ce9c48ea')}
        </button>
        : <button type="button" className="secondary-button" onClick={refresh} disabled={state.kind === 'loading'}>
          <RefreshCw size={16} aria-hidden="true" />{tr('ui.refresh_b4c61340')}
        </button>}
    </div>
    {state.kind === 'ready' ? <PaymentReceiptContent receipt={state.receipt} standalone /> : <div className="payment-receipt-status">
      <h1>{tr('ui.receipt.title')}</h1>
      {state.kind === 'loading' && <p role="status">{tr('ui.loading_payment_details_1be4a89c')}</p>}
      {state.kind === 'pending' && <p role="status">{tr('ui.receipt.returnPending', { provider: paymentProviderName(state.provider) })}</p>}
      {state.kind === 'unavailable' && <p role="status" className="alert warning">{tr(state.message)}</p>}
      {state.kind === 'error' && <p role="alert" className="alert danger">{tr(state.message)}</p>}
    </div>}
  </section>;
}
