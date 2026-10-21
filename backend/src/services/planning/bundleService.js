import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { HttpError } from '../../middleware/errors.js';
import { lockCurrentAccount } from '../accountAccess.js';
import { preflightBooking, createBookingWithTransaction } from '../bookingService.js';
import { bookingContactSchema } from '../bookingContactService.js';

export const planInput = z.object({
  resourceIds: z.array(z.string().uuid()).min(1).max(5).refine(ids => new Set(ids).size === ids.length),
  startAt: z.string().datetime({ offset: true }), endAt: z.string().datetime({ offset: true }),
  purposeCode: z.enum(['STUDY','TEACHING','RESEARCH','SERVICE'])
}).strict().refine(value => +new Date(value.endAt) > +new Date(value.startAt)
  && +new Date(value.endAt) - +new Date(value.startAt) <= 24 * 3600000, { message: 'Invalid interval' });
export const bundleInput = z.object({
  plan: planInput, requestKey: z.string().uuid(), title: z.string().trim().min(2).max(255),
  purpose: z.string().trim().max(2000).default(''), contact: bookingContactSchema,
  quotes: z.array(z.object({ resourceId: z.string().uuid(), amountVnd: z.number().int().nonnegative(),
    version: z.number().int().nonnegative(), loyaltyPolicyVersion: z.number().int().nonnegative().nullable().optional() }).strict()).min(1).max(5)
}).strict();

async function sameLaboratory(client, ids) {
  const resources = await client.resource.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, code: true, laboratoryId: true } });
  if (resources.length !== ids.length) throw new HttpError(404, 'Resource not found', undefined, 'NOT_FOUND');
  if (!resources[0].laboratoryId || resources.some(row => row.laboratoryId !== resources[0].laboratoryId))
    throw new HttpError(400, 'Select resources from one laboratory', undefined, 'PLAN_SAME_LAB_REQUIRED');
  return resources;
}
export async function reviewPlan(actor, body) {
  const input = planInput.parse(body), resources = await sameLaboratory(prisma, input.resourceIds);
  const items = [];
  for (const resource of resources) {
    const { quote } = await preflightBooking(actor, { ...input, resourceId: resource.id });
    items.push({ resource, quote });
  }
  return { items, amountVnd: items.reduce((sum, item) => sum + item.quote.amountVnd, 0),
    checkedAt: new Date(), reservation: false, individualPayments: true };
}

export async function createBundle(actor, body) {
  const input = bundleInput.parse(body), ids = [...input.plan.resourceIds].sort();
  const requestHash = crypto.createHash('sha256').update(JSON.stringify({ ...input, requestKey: undefined })).digest('hex');
  return prisma.$transaction(async tx => {
    await lockCurrentAccount(tx, actor.id, actor.authVersion);
    // Same owner retries serialize on the user lock. A retry returns the original
    // group even after its payment deadline, never creates a second reservation.
    const existing = await tx.bookingBundle.findUnique({ where: { requestKey: input.requestKey }, include: { bookings: true } });
    if (existing) {
      if (existing.ownerId !== actor.id || existing.requestHash !== requestHash) throw new HttpError(409, 'Request key already used', undefined, 'REQUEST_KEY_REUSED');
      return existing;
    }
    for (const id of ids) await tx.$queryRaw`SELECT id FROM resources WHERE id = ${id} FOR UPDATE`;
    await sameLaboratory(tx, ids);
    const bundle = await tx.bookingBundle.create({ data: { id: crypto.randomUUID(), ownerId: actor.id,
      requestKey: input.requestKey, requestHash, title: input.title } });
    const bookings = [];
    for (const resourceId of ids) {
      const quote = input.quotes.find(row => row.resourceId === resourceId);
      if (!quote || input.quotes.filter(row => row.resourceId === resourceId).length !== 1) throw new HttpError(400, 'Each resource needs a quote', undefined, 'VALIDATION_ERROR');
      const { resourceId: quotedResource, ...acceptedQuote } = quote;
      const booking = await createBookingWithTransaction(tx, { ...input.plan, resourceId: quotedResource,
        title: input.title, purpose: input.purpose, requestedById: actor.id, expectedAuthVersion: actor.authVersion,
        contact: input.contact, fulfillment: { mode: 'LAB_PICKUP' }, acceptedQuote });
      bookings.push(await tx.booking.update({ where: { id: booking.id }, data: { bundleId: bundle.id } }));
    }
    return { ...bundle, bookings };
  }, { timeout: 20000 });
}

// Bounded, chronological scan: no optimiser, model calls or opaque score.
export async function suggestPlan(actor, body) {
  const input = planInput.parse(body);
  await sameLaboratory(prisma, input.resourceIds);
  const duration = +new Date(input.endAt) - +new Date(input.startAt), suggestions = [];
  const first = Math.ceil(Math.max(+new Date(input.startAt), Date.now() + 30 * 60000) / 1800000) * 1800000;
  for (let offset = 0; offset < 48 && suggestions.length < 3; offset++) {
    const startAt = new Date(first + offset * 1800000).toISOString(), endAt = new Date(+new Date(startAt) + duration).toISOString();
    try {
      const review = await reviewPlan(actor, { ...input, startAt, endAt });
      suggestions.push({ startAt, endAt, amountVnd: review.amountVnd, reason: 'SAME_RESOURCES_NEXT_AVAILABLE' });
    } catch (error) {
      if (![400,409].includes(error.status)) throw error;
    }
  }
  return { suggestions, searchHours: 24, stepMinutes: 30, reservation: false };
}

// Exact declared capability matching only. Missing specifications never mean
// equivalent equipment; the user explicitly chooses and reviews a replacement.
export async function suggestAlternatives(actor, body) {
  const input = planInput.parse(body);
  await sameLaboratory(prisma, input.resourceIds);
  const originals = await prisma.resource.findMany({ where: { id: { in: input.resourceIds } }, include: { capabilities: true } });
  const suggestions = [];
  for (const original of originals) {
    if (!original.category || !original.capabilities.length) continue;
    const candidates = await prisma.resource.findMany({ where: { laboratoryId: original.laboratoryId, category: original.category,
      subtype: original.subtype, id: { notIn: input.resourceIds }, bookingState: 'bookable', capacity: { gte: original.capacity },
      AND: original.capabilities.map(cap => ({ capabilities: { some: { key: cap.key, value: cap.value, unit: cap.unit } } })) },
      orderBy: { code: 'asc' }, take: 5, select: { id: true, name: true, code: true } });
    for (const replacement of candidates) {
      const resourceIds = input.resourceIds.map(value => value === original.id ? replacement.id : value);
      try {
        const review = await reviewPlan(actor, { ...input, resourceIds });
        suggestions.push({ original: { id: original.id, name: original.name }, replacement, resourceIds,
          amountVnd: review.amountVnd, reason: 'MATCHED_DECLARED_CAPABILITIES', matchedKeys: original.capabilities.map(cap => cap.key) });
      } catch (error) { if (![400,409].includes(error.status)) throw error; }
      if (suggestions.length === 3) return { suggestions, reservation: false };
    }
  }
  return { suggestions, reservation: false };
}
