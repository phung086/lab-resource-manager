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
export function canInitiateBookingPayment(actor: { id: string }, booking: { requestedById: string; status: string } | null, charge: { userId: string; status: string } | null) {
 return !!actor.id && booking?.requestedById === actor.id && charge?.userId === actor.id && booking.status === 'CONFIRMED' && ['pending','failed','expired'].includes(charge.status);
}
// Display the hosted session's deadline without inventing provider settlement.
export function paymentSessionStatus(charge: { status: string; provider: string; paymentUrlExpiresAt?: string | null }, now = Date.now()) {
 const expiry = charge.paymentUrlExpiresAt ? Date.parse(charge.paymentUrlExpiresAt) : NaN;
 return charge.status === 'pending' && charge.provider === 'vnpay' && Number.isFinite(expiry) && expiry <= now ? 'expired' : charge.status;
}
