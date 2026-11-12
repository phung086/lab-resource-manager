import { formatVnd } from '../../../utils/currency';
import { Fragment } from 'react';
import { CircleAlert, Printer, ReceiptText, ShieldCheck } from 'lucide-react';
import { BaseModal2026 } from '../../BaseModal2026';
import { useLocale } from '../../../providers/LocaleProvider';
import { formatVietnamDateTime } from '../../../utils/timezone';
import { paymentProviderName } from '../../../utils/paymentValidation';
import './payments.css';
import './payment-receipt.css';

export type PaymentReceiptData = {
  generatedAt: string;
  transaction: {
    txnRef: string; amount: number; currency: string; status: string;
    provider: string; paidAt: string | null; reconciliationStatus: string;
    user?: { fullName: string };
    booking: { id: string; bookingCode?: string; title: string; status: string;
      resource: { name: string; code?: string } } | null;
  };
};

export function PaymentReceipt({ receipt, onClose }: { receipt: PaymentReceiptData | null; onClose: () => void }) {
  const { tr } = useLocale();
  return <BaseModal2026 isOpen={!!receipt} onClose={onClose}
    title={tr('ui.receipt.title')} icon={ReceiptText}
    footer={<button type="button" className="primary-button" onClick={() => window.print()}><Printer size={17} aria-hidden="true"/>{tr('ui.print_receipt_ce9c48ea')}</button>}>
    {receipt && <PaymentReceiptContent receipt={receipt} />}
  </BaseModal2026>;
}

export function PaymentReceiptContent({ receipt, standalone = false }: { receipt: PaymentReceiptData; standalone?: boolean }) {
  const { tr, locale } = useLocale();
  const row = receipt.transaction;
  const review = row.reconciliationStatus === 'manual_review';
  const Title = standalone ? 'h1' : 'h2';
  const fields = [
    ['ui.transaction_reference_717b27eb', row.txnRef],
    ['ui.payer_9f6325a0', row.user?.fullName || '—'],
    ['ui.bookings_00f5b333', row.booking?.title || tr('ui.no_longer_linked_774c604c')],
    ['ui.booking_reference_189e7a5d', row.booking?.bookingCode || row.booking?.id || '—'],
    ['ui.resource_9a35ef53', [row.booking?.resource?.code, row.booking?.resource?.name].filter(Boolean).join(' · ') || '—'],
    ['ui.receipt.bookingStatus', row.booking ? tr(`enum.booking.${row.booking.status}`) : '—'],
    ['ui.payment_time_cfbad42e', row.paidAt ? formatVietnamDateTime(row.paidAt) : '—'],
    ['ui.receipt_generated_at_9f7b0997', formatVietnamDateTime(receipt.generatedAt)],
  ];
  return <article className={`payment-receipt${review ? ' needs-review' : ''}`}>
      <header className="receipt-heading"><span className="receipt-brand">{tr('ui.lab_7a62e3ac')}<span>{tr('ui.receipt.brandDescriptor')}</span></span><ReceiptText size={28} aria-hidden="true"/></header>
      <Title className="receipt-title">{tr('ui.receipt.title')}</Title>
      <div className="receipt-total"><span className="receipt-verified"><ShieldCheck size={18} aria-hidden="true"/>{tr('ui.payment_verified_c37ae36e')}</span>
        <h2>{formatVnd(row.amount, locale)}</h2>
        <p>{paymentProviderName(row.provider)}</p>
      </div>
      {review && <aside className="receipt-review" role="note"><CircleAlert size={21} aria-hidden="true"/><div><strong>{tr('ui.manual_reconciliation_required_ad0551a4')}</strong><p>{tr('ui.receipt.reviewHelp')}</p></div></aside>}
      <dl>{fields.map(([key, value]) => <Fragment key={key}><dt>{tr(key)}</dt><dd>{value}</dd></Fragment>)}</dl>
      <footer className="receipt-disclaimer">{tr('ui.paymentJourney.receiptDisclaimer')}</footer>
    </article>;
}
