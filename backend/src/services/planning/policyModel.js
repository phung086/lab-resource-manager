import { z } from 'zod';

export const policyDefaults = Object.freeze({ revision: 0, minAdvanceBookingMinutes: 30,
  minBookingMinutes: 15, maxBookingMinutes: 480, maxAdvanceBookingDays: 30,
  allowWeekend: false, workDayStartHour: 8, workDayEndHour: 18, turnaroundMinutes: 0 });
export function policySnapshot(policy) {
  return Object.fromEntries(Object.entries(policyDefaults).map(([key, fallback]) => [key, policy?.[key] ?? fallback]));
}
export const policyInput = z.object({
  expectedRevision: z.number().int().nonnegative(), reason: z.string().trim().min(10).max(500),
  minAdvanceBookingMinutes: z.number().int().min(30).max(43200),
  minBookingMinutes: z.number().int().min(1).max(1440), maxBookingMinutes: z.number().int().min(1).max(1440),
  maxAdvanceBookingDays: z.number().int().min(1).max(365),
  allowWeekend: z.boolean(), workDayStartHour: z.number().int().min(0).max(23),
  workDayEndHour: z.number().int().min(1).max(24), turnaroundMinutes: z.number().int().min(0).max(240)
}).strict().refine(p => p.minBookingMinutes <= p.maxBookingMinutes && p.workDayStartHour < p.workDayEndHour
  && p.minAdvanceBookingMinutes <= p.maxAdvanceBookingDays * 1440
  && p.minBookingMinutes <= (p.workDayEndHour - p.workDayStartHour) * 60,
{ message: 'Policy limits contradict each other' });

// The earlier reservation owns its preparation interval. An early return starts
// that interval at the declared return time; it is not a sensor measurement.
export function turnaroundEnd(booking) {
  const end = booking.schedulingReleasedAt || booking.endAt;
  return new Date(+new Date(end) + Number(booking.policySnapshot?.turnaroundMinutes || 0) * 60000);
}
export function occupiesWithTurnaround(booking, startAt, endAt, candidateMinutes = 0) {
  const from = booking.schedulingReleasedAt || booking.startAt;
  const until = turnaroundEnd(booking);
  return +until > +new Date(from) && +new Date(from) < +new Date(endAt) + candidateMinutes * 60000 && +until > +new Date(startAt);
}

export function preparationBookingWhere(startAt, endAt) {
  return { startAt: { lt: new Date(+endAt + 240 * 60000) }, endAt: { gt: new Date(+startAt - 240 * 60000) },
    OR: [{ status: { in: ['PENDING_APPROVAL','CONFIRMED','CHECKED_OUT','RETURNED'] }, schedulingReleasedAt: null },
      { status: { in: ['RETURNED','COMPLETED'] }, schedulingReleasedAt: { gt: new Date(+startAt - 240 * 60000) }, policySnapshot: { path: ['turnaroundMinutes'], gt: 0 } }] };
}
