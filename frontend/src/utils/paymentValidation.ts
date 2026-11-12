export function validatePaymentAction(action: 'charge' | 'reconcile' | 'rate', values: Record<string,string>, allowedIds: string[] = []) {
 const errors: Record<string,string> = {}, data: Record<string,string | number> = {};
 if(action==='charge') {data.bookingId=values.bookingId || '';data.description=(values.description||'').trim();if(!allowedIds.includes(String(data.bookingId)))errors.bookingId='ui.payments.bookingRequired';if(String(data.description).length<3||String(data.description).length>500)errors.description='ui.payments.descriptionLength';}
 if(action==='reconcile'){data.reason=(values.reason||'').trim();if(String(data.reason).length<3||String(data.reason).length>500)errors.reason='ui.payments.reasonLength';}
 if(action==='rate'){data.hourlyRateVnd=Number(values.rate);if(!values.rate?.trim()||!Number.isSafeInteger(data.hourlyRateVnd)||data.hourlyRateVnd<0||data.hourlyRateVnd>100000000)errors.rate='ui.payments.rateInvalid';}
 return {errors,data:Object.keys(errors).length?null:data};
}
export function safeVnpayUrl(value: unknown) {
 if(typeof value!=='string')return '';
 try{const target=new URL(value);const banks=target.searchParams.getAll('vnp_BankCode');return target.protocol==='https:' && !target.username && !target.password && /(^|\.)vnpay(?:ment)?\.vn$/i.test(target.hostname) && banks.length<=1 && (banks.length===0 || /^[A-Z0-9]{3,20}$/.test(banks[0]))?target.toString():'';}catch{return '';}
}
export const paymentMethods = ['vnpay', 'vietqr'] as const;
export const paymentProviderLabels = { vnpay: 'VNPAY', vietqr: 'VietQR' } as const;
export type PaymentProvider = keyof typeof paymentProviderLabels;
export type PaymentAvailability = Partial<Record<PaymentProvider, boolean>>;
export const paymentProviderName = (method: string) => paymentProviderLabels[method as PaymentProvider] || method;
export const paymentStatusLabels: Record<string, string> = {
  pending: 'ui.awaiting_payment_dd717eb2',
  success: 'ui.payment_verified_c37ae36e',
  failed: 'ui.payment_failed_39d4ec59',
  expired: 'ui.session_expired_213530d5',
  refunded: 'ui.refunded_d0d4c45f',
};
export function isAwaitingPayment(booking: { status?: string; paymentDueAt?: string | null } | null | undefined) {
 return booking?.status === 'PENDING_APPROVAL' && Boolean(booking.paymentDueAt);
}
export function canInitiateBookingPayment(actor: { id: string }, booking: { requestedById: string; status: string; paymentDueAt?: string | null; startAt?: string } | null, charge: { userId: string; status: string } | null) {
 return !!actor.id && booking?.requestedById === actor.id && charge?.userId === actor.id && (booking.status === 'CONFIRMED' || isAwaitingPayment(booking)) && (!booking.paymentDueAt || Date.parse(booking.paymentDueAt) > Date.now()) && (!isAwaitingPayment(booking) || !booking.startAt || Date.parse(booking.startAt) > Date.now()) && ['pending','failed','expired'].includes(charge.status);
}
// Display the issued session's deadline without inventing provider settlement.
export function paymentSessionStatus(charge: { status: string; provider: string; paymentUrlExpiresAt?: string | null }, now = Date.now()) {
 const expiry = charge.paymentUrlExpiresAt ? Date.parse(charge.paymentUrlExpiresAt) : NaN;
 return charge.status === 'pending' && charge.provider !== 'unselected' &&
   Number.isFinite(expiry) && expiry <= now ? 'expired' : charge.status;
}
export function canChoosePaymentProvider(charge: Parameters<typeof paymentSessionStatus>[0], method: PaymentProvider) {
 return charge.provider === 'unselected' || charge.provider === method || ['failed', 'expired'].includes(paymentSessionStatus(charge));
}
