import React, { useEffect, useRef, useState } from 'react';
import { useLocale } from '../../../providers/LocaleProvider';
import { formatVietnamDateTime } from '../../../utils/timezone';

export function PaymentHoldNotice({ paymentDueAt: storedDeadline, startAt, onExpired }: { paymentDueAt: string; startAt?: string; onExpired?: () => void }) {
  const paymentDueAt = new Date(Math.min(Date.parse(storedDeadline), startAt ? Date.parse(startAt) : Infinity)).toISOString();
  const { t } = useLocale();
  const [now, setNow] = useState(Date.now);
  const expiredCallback = useRef(onExpired);
  expiredCallback.current = onExpired;
  useEffect(() => {
    const tick = () => {
      const time = Date.now(); setNow(time);
      if (time >= Date.parse(paymentDueAt)) { clearInterval(timer); expiredCallback.current?.(); }
    };
    const timer = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, [paymentDueAt]);
  const seconds = Math.max(0, Math.ceil((Date.parse(paymentDueAt) - now) / 1000));
  const remaining = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return <div className="alert warning payment-hold-notice">
    <strong>{t('ui.paymentHold.pending')}</strong>
    <p>{seconds > 0 ? t('ui.paymentHold.deadline', { time: formatVietnamDateTime(paymentDueAt), remaining }) : t('ui.paymentHold.expired')}</p>
    <p>{t('ui.paymentHold.rule')}</p>
  </div>;
}
