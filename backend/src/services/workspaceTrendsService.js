import { Prisma } from '@prisma/client';
import { HttpError } from '../middleware/errors.js';

export function trendWindow(period, now = new Date()) {
  if (!['day','week','month'].includes(period) || !Number.isFinite(now.getTime())) throw new HttpError(400,'Invalid report window',undefined,'VALIDATION_ERROR');
  const day = 86400000, offset = 7 * 3600000;
  const today = Math.floor((now.getTime() + offset) / day) * day - offset;
  return { start: new Date(today - ({day:0,week:6,month:29}[period]) * day), end: now, step: period === 'day' ? '1 hour' : '1 day' };
}

/** Read-only aggregate; the existing report remains unchanged. No client-side preview totals. */
export async function buildWorkspaceTrends(client, user, { period = 'week', now = new Date(), paymentsEnabled = false } = {}) {
  if (!['ADMIN','LAB_STAFF'].includes(user.role)) throw new HttpError(403,'Insufficient permission',undefined,'FORBIDDEN');
  const { start, end, step } = trendWindow(period,now);
  const scope = user.role === 'ADMIN' ? Prisma.sql`TRUE` : Prisma.sql`EXISTS (SELECT 1 FROM user_lab_assignments a WHERE a."laboratoryId" = r."laboratoryId" AND a."userId" = ${user.id})`;
  const paymentState = user.role !== 'ADMIN' ? 'restricted' : paymentsEnabled ? 'available' : 'disabled';
  const money = paymentState === 'available' ? Prisma.sql`(SELECT COALESCE(SUM(p.amount),0)::double precision FROM payment_transactions p WHERE p.status = 'success' AND p.currency = 'VND' AND p."reconciliationStatus" <> 'manual_review' AND p."paidAt" >= s.t AND p."paidAt" < LEAST(s.t + ${step}::interval,${end}))` : Prisma.sql`NULL::double precision`;
  const rows = await client.$queryRaw(Prisma.sql`
    WITH evidence AS (
      SELECT b.* FROM bookings b JOIN resources r ON r.id=b."resourceId"
      WHERE ${scope} AND ((b."actualStartAt" < ${end} AND COALESCE(b."actualEndAt",${end}) > ${start}) OR (b."createdAt" >= ${start} AND b."createdAt" < ${end}))
    ), slots AS (SELECT generate_series(${start}::timestamp,${end}::timestamp,${step}::interval) AS t)
    SELECT s.t AS "startAt", LEAST(s.t + ${step}::interval,${end}) AS "endAt",
      (SELECT COUNT(*)::int FROM evidence b WHERE b."createdAt" >= s.t AND b."createdAt" < LEAST(s.t + ${step}::interval,${end})) AS requests,
      (SELECT COALESCE(SUM(GREATEST(0,EXTRACT(EPOCH FROM (LEAST(COALESCE(b."actualEndAt",${end}),s.t + ${step}::interval,${end}) - GREATEST(b."actualStartAt",s.t)))/60)),0)::double precision FROM evidence b WHERE b."actualStartAt" < LEAST(s.t + ${step}::interval,${end}) AND COALESCE(b."actualEndAt",${end}) > s.t) AS "usageMinutes",
      ${money} AS "collectedVnd"
    FROM slots s WHERE s.t < ${end} ORDER BY s.t
  `);
  return { source:'database',period,timezone:'Asia/Ho_Chi_Minh',scope:user.role === 'ADMIN' ? 'global' : 'assigned_labs',paymentState,startAt:start.toISOString(),endAt:end.toISOString(),buckets:rows.map(r=>({...r,usageMinutes:Math.round(Number(r.usageMinutes)*100)/100})) };
}
