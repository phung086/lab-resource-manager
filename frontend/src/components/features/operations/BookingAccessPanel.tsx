import { useEffect, useState } from 'react';
import '../payments/payments.css';
import { apiRequest } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
import { formatVietnamDateTime } from '../../../utils/timezone';

type Access = { mode: string; roomPassword: string | null; roomAccessConfigured: boolean; availableAt: string; canCheckIn: boolean; pickupInstructions: string; address?: { fullAddress: string }; deliveryFeeVnd?: number };
export function BookingAccessPanel({ bookingId, status, category, onChanged }: { bookingId: string; status: string; category?: string | null; onChanged?: () => void }) {
  const { tr } = useLocale();
  const [access, setAccess] = useState<Access | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0);
  const [condition, setCondition] = useState(''), [returning, setReturning] = useState(false), [copied, setCopied] = useState(false);
  useEffect(() => {
    setAccess(null); setError(''); setReturning(false); setCondition('');
    if (!['CONFIRMED','CHECKED_OUT'].includes(status)) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      if (controller.signal.aborted) return;
      if (document.hidden) { timer = setTimeout(() => void load(), 30000); return; }
      try { const result = await apiRequest(`/bookings/${bookingId}/access`, { signal: controller.signal }); if (!controller.signal.aborted) { setAccess(result); setError(''); } }
      catch (cause: any) { if (!controller.signal.aborted) { setAccess(null); if (cause.code !== 'BOOKING_PAYMENT_REQUIRED') setError(cause.message); } return; }
      if (!controller.signal.aborted) timer = setTimeout(() => void load(), 30000);
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [bookingId, status, revision]);
  async function act(action: string) {
    if (busy) return; setBusy(true); setError('');
    try { await apiRequest(`/bookings/${bookingId}/${action}`, { method: 'POST', body: JSON.stringify(action === 'self-return' ? { conditionAfter: condition.trim() } : {}) }); onChanged?.(); setRevision(value => value + 1); }
    catch (cause: any) { setError(cause.message); }
    finally { setBusy(false); }
  }
  return <section className="booking-access-panel" aria-label={tr('ui.fulfillment.title')}>
    {error && <div className="alert danger" role="alert"><p>{tr(error)}</p><button type="button" className="btn btn-secondary" onClick={() => setRevision(value => value + 1)}>{tr('ui.retry_c58d068c')}</button></div>}
    {access && <>
      {category === 'ROOM' ? <>
        <h3>{tr('ui.fulfillment.roomAccess')}</h3>
        {access.roomPassword ? <><p>{tr('ui.fulfillment.phoneCodeHint')}</p><div className="room-access-code"><code className="room-access-password">{access.roomPassword}</code><button type="button" className="btn btn-secondary" onClick={async () => { try { await navigator.clipboard.writeText(access.roomPassword!); setCopied(true); } catch { setError('ui.fulfillment.copyFailed'); } }}>{tr(copied ? 'ui.fulfillment.copied' : 'ui.fulfillment.copyCode')}</button></div></> : !access.roomAccessConfigured && <p className="alert warning">{tr('ui.fulfillment.missingPhone')}</p>}
        <p>{tr('ui.fulfillment.checkInAt', { time: formatVietnamDateTime(access.availableAt) })}</p>
        {status === 'CONFIRMED' && <button type="button" className="primary-button" disabled={busy || !access.canCheckIn || !access.roomAccessConfigured} onClick={() => void act('self-check-in')}>{tr('ui.fulfillment.checkIn')}</button>}
        {status === 'CHECKED_OUT' && !returning && <button type="button" className="primary-button" disabled={busy} onClick={() => setReturning(true)}>{tr('ui.fulfillment.returnRoom')}</button>}
        {returning && <form onSubmit={event => { event.preventDefault(); void act('self-return'); }}>
          <label htmlFor={`return-condition-${bookingId}`}>{tr('ui.fulfillment.returnCondition')}</label>
          <input id={`return-condition-${bookingId}`} required maxLength={2000} value={condition} onChange={event => setCondition(event.target.value)} />
          <button type="submit" className="primary-button" disabled={busy || !condition.trim()}>{tr('ui.fulfillment.confirmReturn')}</button>
          <button type="button" className="secondary-button" disabled={busy} onClick={() => setReturning(false)}>{tr('ui.close_5d54c2a1')}</button>
        </form>}
      </> : <><h3>{tr(access.mode === 'HOME_DELIVERY' ? 'ui.fulfillment.homeDelivery' : 'ui.fulfillment.labPickup')}</h3><p>{access.address?.fullAddress || access.pickupInstructions}</p><p>{tr(access.mode === 'HOME_DELIVERY' ? 'ui.fulfillment.staffDelivery' : 'ui.fulfillment.staffPickup')}</p>{access.mode === 'HOME_DELIVERY' && <p>{tr('ui.fulfillment.deliveryFee', { amount: new Intl.NumberFormat('vi-VN').format(access.deliveryFeeVnd || 0) })}</p>}</>}
    </>}
    {status === 'RETURNED' && <p role="status">{tr(category === 'ROOM' ? 'ui.fulfillment.awaitingInspection' : 'ui.fulfillment.awaitingResourceInspection')}</p>}
  </section>;
}
