import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { PURPOSE_CODES, quoteBooking } from '../services/bookingPricingService.js';
import { getResourceAvailability, assertResourceAvailable, checkLabPolicyCompliance } from '../services/availabilityService.js';
import { getTrainingEligibility } from '../services/trainingEligibilityService.js';
import { SUPPORT_CATEGORIES } from '../services/supportService.js';
import { bridgeError } from './access.js';

const id = z.string().uuid(), text = max => z.string().trim().min(3).max(max);
const booking = z.object({ kind: z.literal('BOOKING'), resourceId: id,
  startAt: z.string().datetime({ offset: true }), endAt: z.string().datetime({ offset: true }),
  title: text(255), purpose: text(2000), purposeCode: z.enum(PURPOSE_CODES) }).strict();
const support = z.object({ kind: z.literal('STAFF_SUPPORT'), laboratoryId: id,
  category: z.enum(SUPPORT_CATEGORIES), message: text(2000) }).strict();
export const customerProposalSchema = z.array(z.discriminatedUnion('kind', [booking, support])).max(2)
  .refine(items => new Set(items.map(item => item.kind)).size === items.length);
const string = maxLength => ({ type: 'string', minLength: 3, maxLength });
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const customerProposalJsonSchema = { type: 'array', maxItems: 2, items: { oneOf: [
  object({ kind: { type: 'string', const: 'BOOKING' }, resourceId: { type: 'string', format: 'uuid' },
    startAt: { type: 'string', format: 'date-time' }, endAt: { type: 'string', format: 'date-time' },
    title: string(255), purpose: string(2000), purposeCode: { type: 'string', enum: PURPOSE_CODES } }),
  object({ kind: { type: 'string', const: 'STAFF_SUPPORT' }, laboratoryId: { type: 'string', format: 'uuid' },
    category: { type: 'string', enum: SUPPORT_CATEGORIES }, message: string(2000) })
] } };

// Only review drafts are persisted here. Actual submission stays in the normal
// customer forms/APIs, with current authentication and final business checks.
export async function prepareCustomerProposals(tx, inputs, customer, now, expiresAt) {
  const result = [];
  const draftExpiry = new Date(Math.min(expiresAt.getTime(), now.getTime() + 5 * 60000)).toISOString();
  for (const input of inputs) {
    if (input.kind === 'STAFF_SUPPORT') {
      const lab = await tx.laboratory.findUnique({ where: { id: input.laboratoryId }, select: { id: true, name: true, isActive: true } });
      if (!lab?.isActive) throw bridgeError(404, 'NOT_FOUND');
      if (!await tx.userLabAssignment.count({ where: { laboratoryId: lab.id, user: { role: 'LAB_STAFF', isActive: true, deletedAt: null } } }))
        throw bridgeError(409, 'SUPPORT_NO_STAFF');
      result.push({ ...input, id: randomUUID(), expiresAt: draftExpiry, laboratoryName: lab.name });
      continue;
    }
    const startAt = new Date(input.startAt), endAt = new Date(input.endAt), minutes = (endAt - startAt) / 60000;
    if (startAt <= now || !Number.isInteger(minutes) || minutes < 15 || minutes > 480) throw bridgeError(400, 'INVALID_BOOKING_TIME');
    const resource = await tx.resource.findUnique({ where: { id: input.resourceId }, include: { laboratory: { include: { labPolicy: true } } } });
    if (!resource) throw bridgeError(404, 'NOT_FOUND');
    checkLabPolicyCompliance({ policy: resource.laboratory?.labPolicy, startAt, endAt, now });
    assertResourceAvailable(await getResourceAvailability(tx, { resourceId: resource.id, resource, startAt, endAt }));
    if (!(await getTrainingEligibility(tx, { userId: customer.id, resourceId: resource.id, now })).eligible)
      throw bridgeError(409, 'TRAINING_REQUIRED');
    const quote = await quoteBooking(tx, { ...input, startAt, endAt }, { userId: customer.id });
    result.push({ ...input, id: randomUUID(), expiresAt: draftExpiry, resourceName: resource.name,
      resourceCode: resource.code, quote: { amountVnd: quote.amountVnd, currency: 'VND', version: quote.version } });
  }
  return result;
}
