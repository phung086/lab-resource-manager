import { useEffect, useState } from 'react';
import { useLocale } from '../../../providers/LocaleProvider';
import { formatVnd } from '../../../utils/currency';

export type BankTransferDetails = {
  qrUrl: string;
  bank: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  content: string;
};

export function BankTransferQr({ details, expiresAt }: { details: BankTransferDetails; expiresAt: string | null }) {
  const { tr, locale } = useLocale();
  const [expired, setExpired] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(() => setExpired(true), Math.max(0, Date.parse(expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt]);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(tr('ui.copied_092dba1f', { value0: label }));
    } catch {
      setCopyStatus(tr('ui.automatic_copying_failed_select_the_2c75e78e'));
    }
  }

  if (expired || !expiresAt || Date.parse(expiresAt) <= Date.now()) {
    return <p className="alert warning" role="status">{tr('ui.session_expired_213530d5')}</p>;
  }
  const fields = [
    ['ui.checkout.recipientBank', details.bank, details.bank],
    ['ui.account_holder_4c1976fc', details.accountName, details.accountName],
    ['ui.account_number_0ff9e285', details.accountNumber, details.accountNumber],
    ['ui.amount_4cbdc55b', formatVnd(details.amount, locale), String(details.amount)],
    ['ui.transfer_description_bcc3b45e', details.content, details.content],
  ];
  return <div className="bank-transfer-details">
    <p role="status">{tr('ui.checkout.transferInstructions')}</p>
    {imageFailed
      ? <p className="alert warning" role="status">{tr('ui.unable_to_load_the_provider_5b97408c')}</p>
      : <img className="payment-qr" src={details.qrUrl} referrerPolicy="no-referrer"
          alt={tr('ui.vietqr_for_transaction_2dbf8b17', { value0: details.content })}
          onError={() => setImageFailed(true)} />}
    <dl>{fields.map(([key, value, raw]) => (
      <div key={key}>
        <dt>{tr(key)}</dt>
        <dd><span>{value}</span> <button type="button" className="table-action"
            aria-label={`${tr('ui.copy_68b42caf')} ${tr(key).toLowerCase()}`} onClick={() => void copy(raw, tr(key))}>
          {tr('ui.copy_68b42caf')}
        </button></dd>
      </div>
    ))}</dl>
    <p role="status">{copyStatus}</p>
  </div>;
}
