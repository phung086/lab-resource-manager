import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { fromJsonSchema } from '@modelcontextprotocol/server';
import { assistantTools } from '../assistant/toolHandlers.js';
import { getUserLoyalty } from '../services/loyaltyService.js';
import { quoteBooking, PURPOSE_CODES } from '../services/bookingPricingService.js';
import { assertNotAborted, RequestGate } from '../assistant/assistantRuntime.js';
import { activeUser, activeRequester, requestRole, assertGrant, bridgeLocks, bridgeError } from './access.js';
import { CANONICAL_ROLES } from '../constants/roles.js';
import { fastQueryPlan } from '../assistant/fastQueries.js';
import { buildAssistantSummary, renderAssistantSummary } from '../assistant/assistantSummary.js';
import { businessKnowledge } from './knowledge.js';
import { bridgeTimeContext } from './timeContext.js';
import { customerProposalSchema, prepareCustomerProposals } from './customerProposals.js';
import { isDeepStrictEqual } from 'node:util';
import { quickReplyKey } from '../assistant/quickReplies.js';
import { localize } from '../locales/index.js';

const id = z.string().uuid(), date = z.string().datetime({ offset: true });
const questionSchema = z.object({ message: z.string().trim().min(2).max(2000), locale: z.enum(['vi', 'en']).default('vi'),
  conversationId: id.optional(), workspace: z.string().max(60).optional(), resourceId: id.optional(),
  startAt: date.optional(), endAt: date.optional(), durationMinutes: z.number().int().min(15).max(480).optional() }).strict()
  .refine(v => Boolean(v.startAt) === Boolean(v.endAt) && (!v.startAt || new Date(v.startAt) < new Date(v.endAt)), { message: 'Invalid interval', path: ['endAt'] });
const allowedNames = new Set(['search_resources', 'get_resource_detail', 'find_available_slots', 'check_booking_conflicts',
  'get_my_bookings', 'get_booking_detail', 'list_notifications', 'recommend_equipment', 'check_user_eligibility', 'get_incidents',
  'get_operational_summary', 'get_material_stock', 'search_customers', 'get_lab_schedule', 'get_operations_report']);
const sharedTools = assistantTools.filter(t => allowedNames.has(t.name));
const scopedSchemas = new Map(sharedTools.map(t => [t.name, fromJsonSchema(t.inputSchema)]));
const extras = {
  get_resource_tariff: z.object({ resourceId: id }).strict(),
  quote_rental: z.object({ resourceId: id, purposeCode: z.enum(PURPOSE_CODES), startAt: date, endAt: date }).strict()
    .refine(v => new Date(v.startAt) < new Date(v.endAt) && new Date(v.endAt) - new Date(v.startAt) <= 30 * 86400000),
  get_my_payment_status: z.object({ bookingId: id }).strict(), get_my_loyalty: z.object({}).strict(), get_my_support_status: z.object({}).strict(), get_support_options: z.object({}).strict()
};
const objectSchema = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const resourceProperty = { type: 'string', format: 'uuid' };
const extraJsonSchemas = {
  get_resource_tariff: objectSchema({ resourceId: resourceProperty }),
  quote_rental: objectSchema({ resourceId: resourceProperty, purposeCode: { type: 'string', enum: PURPOSE_CODES },
    startAt: { type: 'string', format: 'date-time' }, endAt: { type: 'string', format: 'date-time' } }),
  get_my_payment_status: objectSchema({ bookingId: resourceProperty }), get_my_loyalty: objectSchema({}), get_my_support_status: objectSchema({}), get_support_options: objectSchema({})
};
export const bridgeReadTools = [...sharedTools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
  ...Object.entries(extraJsonSchemas).map(([name, inputSchema]) => ({ name, description: name.replaceAll('_', ' '), inputSchema }))];
const toolSchema = z.object({ requestId: id, tool: z.string().max(80), input: z.record(z.string(), z.unknown()).default({}) }).strict();
const replySchema = z.object({ requestId: id, generation: id, answer: z.string().trim().min(2).max(6000), proposals: customerProposalSchema.default([]) }).strict();
const partialSchema = z.object({ requestId: id, generation: id, sequence: z.number().int().min(1).max(3),
  text: z.string().trim().min(2).max(1500) }).strict();
const byteLength = value => Buffer.byteLength(JSON.stringify(value), 'utf8');

export function createBridgeRequests({ prisma, settings, now = () => new Date() }) {
  const fastGate = new RequestGate(4);
  const enabled = () => { if (!settings.enabled) throw bridgeError(503, 'BRIDGE_UNAVAILABLE'); };
  async function requester(tx, actor) {
    const current = await tx.user.findUnique({ where: { id: actor.id } });
    if (!CANONICAL_ROLES.includes(current?.role) || !activeUser(current, actor.role, actor.authVersion)) throw bridgeError(403, 'FORBIDDEN');
    return current;
  }
  const supportOpen = (tx, customerId) => tx.supportSession.findFirst({ where: { requesterId: customerId, status: { in: ['WAITING', 'ACTIVE'] } }, select: { id: true } });
  async function terminal(tx, job) {
    if (job.status !== 'PENDING') return job;
    let status;
    if (job.expiresAt <= now()) status = 'EXPIRED';
    else if (await supportOpen(tx, job.customerId)) status = 'HANDED_OFF';
    else if (!activeRequester(job) ||
      !activeUser(job.grant.owner, 'ADMIN', job.grant.ownerAuthVersion) || job.grant.revokedAt || job.grant.expiresAt <= now()) status = 'CANCELLED';
    if (!status) return job;
    await tx.chatgptBridgeRequest.updateMany({ where: { id: job.id, status: 'PENDING' }, data: { status } });
    await tx.chatgptBridgeDelivery.updateMany({ where: { requestId: job.id, status: 'PENDING' }, data: { status: 'CANCELLED', leaseToken: null, leaseUntil: null } });
    return { ...job, status };
  }
  async function jobFor(tx, grant, requestId, scope = 'lab.assistant.read') {
    await assertGrant(tx, grant, settings, now(), scope);
    const job = await tx.chatgptBridgeRequest.findUnique({ where: { id: id.parse(requestId) }, include: { customer: true } });
    if (!job || job.grantId !== grant.id || job.generation !== grant.generation) throw bridgeError(404, 'NOT_FOUND');
    if (!activeRequester(job)) throw bridgeError(403, 'BRIDGE_REQUEST_INACTIVE');
    if (job.expiresAt <= now() || !['PENDING', 'ANSWERED'].includes(job.status) || await supportOpen(tx, job.customerId)) throw bridgeError(409, 'BRIDGE_REQUEST_INACTIVE');
    return job;
  }
  function dto(job) {
    return { id: job.id, status: job.status, expiresAt: job.expiresAt.toISOString(), locale: job.locale,
      ...(job.status === 'PENDING' && job.context?.partialReply ? { partialReply: job.context.partialReply } : {}),
      ...(job.status === 'ANSWERED' ? { answer: job.answer, provider: job.context?.quickReplyKey || job.context?.fastQuery ? 'local' : 'chatgpt',
        source: job.context?.fastQuery ? 'authenticated_mcp' : job.context?.quickReplyKey ? 'local_guidance' : 'chatgpt_bridge',
        ...(job.context?.fastQuery ? { toolsUsed: [job.context.fastQuery.name], nextTab: job.context.nextTab } : {}),
        generatedAt: job.answeredAt.toISOString(), proposals: job.context?.publicProposals || [] } : {}),
      conversation: { id: job.conversationId, expiresAt: new Date(job.createdAt.getTime() + 30 * 60000).toISOString() } };
  }
  async function create(actor, raw) {
    enabled(); const input = questionSchema.parse(raw), fastPlan = fastQueryPlan(input, now());
    const created = await prisma.$transaction(async tx => {
      await bridgeLocks(tx); await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('support:dispatch'))::text`;
      const user = await requester(tx, actor);
      if (await supportOpen(tx, user.id)) throw bridgeError(409, 'BRIDGE_STAFF_SESSION_ACTIVE');
      const grant = await tx.chatgptBridgeGrant.findFirst({ where: { revokedAt: null, expiresAt: { gt: now() } }, include: { owner: true } });
      if (!grant) throw bridgeError(503, 'BRIDGE_UNAVAILABLE');
      await assertGrant(tx, grant, settings, now());
      const sub = await tx.chatgptBridgeSubscription.findFirst({ where: { grantId: grant.id, status: 'VERIFIED', expiresAt: { gt: now() } } });
      if (!sub) throw bridgeError(503, 'BRIDGE_UNAVAILABLE');
      await tx.chatgptBridgeRequest.updateMany({ where: { customerId: user.id, status: 'PENDING', expiresAt: { lte: now() } }, data: { status: 'EXPIRED' } });
      await tx.chatgptBridgeRequest.updateMany({ where: { customerId: user.id, status: 'PENDING', OR: [
        { customerAuthVersion: { not: user.authVersion } }, { grantId: { not: grant.id } }, { generation: { not: grant.generation } }
      ] }, data: { status: 'CANCELLED' } });
      if (await tx.chatgptBridgeRequest.findFirst({ where: { customerId: user.id, status: 'PENDING' } })) throw bridgeError(409, 'ASSISTANT_BUSY');
      let conversationId = randomUUID();
      if (input.conversationId) {
        const previous = await tx.chatgptBridgeRequest.findFirst({ where: { conversationId: input.conversationId,
          customerId: user.id, customerAuthVersion: user.authVersion, grantId: grant.id, generation: grant.generation }, orderBy: { createdAt: 'desc' } });
        if (!previous || requestRole(previous) !== user.role || previous.createdAt.getTime() + 30 * 60000 <= now().getTime()) throw bridgeError(409, 'ASSISTANT_CONVERSATION_EXPIRED');
        conversationId = previous.conversationId;
      }
      const { message, locale, conversationId: unused, ...context } = input; void unused;
      const quickKey = quickReplyKey(message);
      const replyKey = user.role !== 'CUSTOMER' && /\.(greeting|capabilities)$/.test(quickKey || '') ? 'assistant.quick.operator' : quickKey;
      const job = await tx.chatgptBridgeRequest.create({ data: { id: randomUUID(), conversationId, customerId: user.id,
        customerAuthVersion: user.authVersion, grantId: grant.id, generation: grant.generation, message, locale,
        context: { ...context, actorRole: user.role, ...(replyKey ? { quickReplyKey: replyKey } : {}), ...(fastPlan ? { fastQuery: fastPlan } : {}) },
        ...(replyKey ? { status: 'ANSWERED', answer: localize(locale, replyKey), answeredAt: now() } : {}),
        expiresAt: new Date(now().getTime() + settings.requestTtlMs) } });
      if (!replyKey && !fastPlan) await tx.chatgptBridgeDelivery.create({ data: { id: randomUUID(), subscriptionId: sub.id, requestId: job.id, eventId: randomUUID() } });
      return job;
    });
    if (!fastPlan || created.status === 'ANSWERED') return dto(created);
    let release;
    try {
      release = fastGate.acquire(actor.id);
      const tool = sharedTools.find(tool => tool.name === fastPlan.name);
      const result = await tool.handler(fastPlan.input, actor, { signal: globalThis.AbortSignal.timeout(settings.toolTimeoutMs || 10000) });
      const summary = buildAssistantSummary([{ tool: tool.name, result }]);
      const answer = renderAssistantSummary(summary, (key, params) => localize(input.locale, key, params), input.locale);
      if (byteLength(answer) > 24000) throw bridgeError(429, 'BRIDGE_CONTEXT_LIMIT');
      return await prisma.$transaction(async tx => {
        await bridgeLocks(tx); await requester(tx, actor);
        const job = await tx.chatgptBridgeRequest.findUnique({ where: { id: created.id }, include: { customer: true, grant: { include: { owner: true } } } });
        if ((await terminal(tx, job)).status !== 'PENDING') throw bridgeError(409, 'BRIDGE_REQUEST_INACTIVE');
        const nextTab = ({ get_material_stock: 'stock', search_customers: 'users', get_operations_report: 'dashboard', get_operational_summary: 'dashboard', get_lab_schedule: 'smart_calendar', find_available_slots: 'smart_calendar', search_resources: 'resources' })[tool.name];
        return dto(await tx.chatgptBridgeRequest.update({ where: { id: job.id }, data: { status: 'ANSWERED', answer,
          answeredAt: now(), readCount: 1, contextBytes: byteLength(answer), context: { ...job.context, nextTab } } }));
      });
    } catch (error) {
      await prisma.chatgptBridgeRequest.updateMany({ where: { id: created.id, status: 'PENDING' }, data: { status: 'CANCELLED' } });
      throw error;
    } finally { release?.(); }
  }
  async function read(actor, requestId) {
    enabled(); id.parse(requestId);
    return prisma.$transaction(async tx => {
      await bridgeLocks(tx); await requester(tx, actor);
      const job = await tx.chatgptBridgeRequest.findUnique({ where: { id: requestId }, include: { customer: true, grant: { include: { owner: true } } } });
      if (!job || job.customerId !== actor.id || job.customerAuthVersion !== actor.authVersion || requestRole(job) !== actor.role) throw bridgeError(404, 'NOT_FOUND');
      return dto(await terminal(tx, job));
    });
  }
  async function cancel(actor, requestId) {
    enabled(); id.parse(requestId);
    await prisma.$transaction(async tx => {
      await bridgeLocks(tx); await requester(tx, actor);
      const job = await tx.chatgptBridgeRequest.findUnique({ where: { id: requestId } });
      if (!job || job.customerId !== actor.id || job.customerAuthVersion !== actor.authVersion || requestRole(job) !== actor.role) throw bridgeError(404, 'NOT_FOUND');
      await tx.chatgptBridgeRequest.updateMany({ where: { id: requestId, status: 'PENDING' }, data: { status: 'CANCELLED' } });
      await tx.chatgptBridgeDelivery.updateMany({ where: { requestId, status: 'PENDING' }, data: { status: 'CANCELLED', leaseToken: null, leaseUntil: null } });
    });
  }
  async function budget(tx, job, bytes = 0) {
    if (job.readCount >= 13 || job.contextBytes + bytes > 24000) throw bridgeError(429, 'BRIDGE_CONTEXT_LIMIT');
    await tx.chatgptBridgeRequest.update({ where: { id: job.id }, data: { readCount: { increment: 1 }, contextBytes: { increment: bytes } } });
  }
  async function context(grant, requestId) {
    enabled(); return prisma.$transaction(async tx => {
      await bridgeLocks(tx); const job = await jobFor(tx, grant, requestId);
      if (job.status !== 'PENDING') throw bridgeError(409, 'BRIDGE_REQUEST_INACTIVE');
      const history = await tx.chatgptBridgeRequest.findMany({ where: { customerId: job.customerId, customerAuthVersion: job.customerAuthVersion,
        conversationId: job.conversationId, generation: job.generation, status: 'ANSWERED', createdAt: { gte: new Date(now().getTime() - 30 * 60000) } },
        select: { message: true, answer: true, context: true }, orderBy: { createdAt: 'desc' }, take: 10 });
      for (const turn of history) { if (turn.context?.fastQuery) turn.answer = `[Previous ${turn.context.fastQuery.name} lookup. Read again for current facts.]`; delete turn.context; }
      while (byteLength(history) > 12000) history.pop();
      const currentTime = now();
      const value = { requestId: job.id, generation: job.generation, question: job.message, locale: job.locale,
        formContext: job.context, history: history.reverse(), historyIsUnverified: true, now: currentTime.toISOString(),
        actorRole: requestRole(job), timeContext: bridgeTimeContext(currentTime), businessKnowledge,
        allowedProposals: requestRole(job) === 'CUSTOMER' ? ['BOOKING', 'STAFF_SUPPORT'] : [],
        tools: bridgeReadTools.filter(tool => requestRole(job) !== 'CUSTOMER' || !['get_material_stock', 'search_customers', 'get_operations_report', 'get_operational_summary'].includes(tool.name)),
        remainingReads: Math.max(0, 12 - job.readCount), dataSource: 'current_request' };
      await budget(tx, job, byteLength({ question: value.question, formContext: value.formContext, history: value.history }));
      await tx.chatgptBridgeRequest.update({ where: { id: job.id }, data: { context: { ...job.context, knowledgeVersion: businessKnowledge.version } } });
      return value;
    });
  }
  async function runExtra(name, input, actor) {
    if (name === 'get_support_options') return { laboratories: await prisma.laboratory.findMany({
      where: { isActive: true, staffAssignments: { some: { user: { role: 'LAB_STAFF', isActive: true, deletedAt: null } } } },
      select: { id: true, code: true, name: true }, orderBy: { code: 'asc' }, take: 50 }), source: 'database' };
    if (name === 'get_my_loyalty') return prisma.$transaction(tx => getUserLoyalty(tx, actor.id), { isolationLevel: 'RepeatableRead' });
    if (name === 'get_my_support_status') {
      const session = await prisma.supportSession.findFirst({ where: { requesterId: actor.id, status: { in: ['WAITING', 'ACTIVE'] } },
        select: { status: true, ordinal: true, laboratoryId: true, createdAt: true } });
      return session ? { status: session.status, requestedAt: session.createdAt,
        queuePosition: session.status === 'WAITING' ? 1 + await prisma.supportSession.count({ where: { laboratoryId: session.laboratoryId, status: 'WAITING', ordinal: { lt: session.ordinal } } }) : 0 } : { status: 'NONE' };
    }
    if (name === 'get_my_payment_status') {
      const booking = await prisma.booking.findFirst({ where: { id: input.bookingId, requestedById: actor.id },
        select: { id: true, bookingCode: true, status: true, feeAmountVnd: true, payments: { where: { userId: actor.id }, orderBy: { createdAt: 'desc' }, take: 5,
          select: { status: true, provider: true, amount: true, currency: true, paidAt: true, reconciliationStatus: true, createdAt: true } } } });
      if (!booking) throw bridgeError(404, 'NOT_FOUND'); return { booking, source: 'database' };
    }
    await sharedTools.find(t => t.name === 'get_resource_detail').handler({ resourceId: input.resourceId }, actor);
    if (name === 'quote_rental') return prisma.$transaction(tx => quoteBooking(tx, input, { userId: actor.id }), { isolationLevel: 'RepeatableRead' });
    return { resourceId: input.resourceId, currency: 'VND', rules: await prisma.resourcePricingRule.findMany({ where: { resourceId: input.resourceId },
      select: { purposeCode: true, label: true, hourlyRateVnd: true, version: true }, orderBy: { purposeCode: 'asc' } }), source: 'database' };
  }
  async function readTool(grant, raw, { signal } = {}) {
    enabled(); const data = toolSchema.parse(raw); assertNotAborted(signal);
    let input = data.input, tool;
    if (extras[data.tool]) input = extras[data.tool].parse(input);
    else {
      tool = sharedTools.find(t => t.name === data.tool);
      if (!tool) throw bridgeError(400, 'BRIDGE_TOOL_NOT_ALLOWED');
      const validation = await scopedSchemas.get(data.tool)['~standard'].validate(input);
      if (validation.issues) throw bridgeError(400, 'VALIDATION_ERROR'); input = validation.value;
    }
    const actor = await prisma.$transaction(async tx => {
      await bridgeLocks(tx); const job = await jobFor(tx, grant, data.requestId);
      if (job.status !== 'PENDING') throw bridgeError(409, 'BRIDGE_REQUEST_INACTIVE');
      await budget(tx, job); return job.customer;
    });
    const value = tool ? await tool.handler(input, actor, { signal }) : await runExtra(data.tool, input, actor);
    assertNotAborted(signal);
    return prisma.$transaction(async tx => {
      await bridgeLocks(tx); const job = await jobFor(tx, grant, data.requestId);
      if (job.status !== 'PENDING') throw bridgeError(409, 'BRIDGE_REQUEST_INACTIVE');
      const bytes = byteLength(value);
      if (job.contextBytes + bytes > 24000) throw bridgeError(429, 'BRIDGE_CONTEXT_LIMIT');
      await tx.chatgptBridgeRequest.update({ where: { id: job.id }, data: { contextBytes: { increment: bytes } } });
      return { tool: data.tool, data: value, readAt: now().toISOString(), source: 'authenticated_actor_read' };
    });
  }
  async function reply(grant, raw) {
    enabled(); const data = replySchema.parse(raw);
    return prisma.$transaction(async tx => {
      await bridgeLocks(tx); await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('support:dispatch'))::text`;
      const job = await jobFor(tx, grant, data.requestId, 'lab.assistant.reply');
      if (data.generation !== job.generation) throw bridgeError(409, 'BRIDGE_REQUEST_INACTIVE');
      if (job.status === 'ANSWERED') {
        if (job.answer !== data.answer || !isDeepStrictEqual(job.context?.publishedProposalInputs || [], data.proposals)) throw bridgeError(409, 'BRIDGE_REPLY_CONFLICT');
        return { requestId: job.id, status: 'ANSWERED', alreadyPublished: true };
      }
      if (job.context?.knowledgeVersion !== businessKnowledge.version) throw bridgeError(409, 'BRIDGE_CONTEXT_REQUIRED');
      if (requestRole(job) !== 'CUSTOMER' && data.proposals.length) throw bridgeError(403, 'FORBIDDEN');
      const proposals = await prepareCustomerProposals(tx, data.proposals, job.customer, now(), job.expiresAt);
      const bytes = byteLength({ publicProposals: proposals, publishedProposalInputs: data.proposals });
      if (job.contextBytes + bytes > 24000) throw bridgeError(429, 'BRIDGE_CONTEXT_LIMIT');
      await tx.chatgptBridgeRequest.update({ where: { id: job.id }, data: { status: 'ANSWERED', answer: data.answer, answeredAt: now(),
        contextBytes: { increment: bytes }, context: { ...job.context, publishedProposalInputs: data.proposals, publicProposals: proposals } } });
      return { requestId: job.id, status: 'ANSWERED', alreadyPublished: false };
    });
  }
  async function partial(grant, raw) {
    enabled(); const data = partialSchema.parse(raw);
    return prisma.$transaction(async tx => {
      await bridgeLocks(tx); await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('support:dispatch'))::text`;
      const job = await jobFor(tx, grant, data.requestId, 'lab.assistant.reply');
      if (job.status !== 'PENDING' || data.generation !== job.generation) throw bridgeError(409, 'BRIDGE_REQUEST_INACTIVE');
      if (job.context?.knowledgeVersion !== businessKnowledge.version) throw bridgeError(409, 'BRIDGE_CONTEXT_REQUIRED');
      const previous = job.context?.partialReply;
      if (previous?.sequence === data.sequence && previous.text === data.text) return { requestId: job.id, status: 'PENDING', alreadyPublished: true };
      if (data.sequence !== (previous?.sequence || 0) + 1 || (previous && !data.text.startsWith(previous.text))) throw bridgeError(409, 'BRIDGE_REPLY_CONFLICT');
      const partialReply = { text: data.text, sequence: data.sequence, generatedAt: now().toISOString() };
      const delta = byteLength(partialReply) - (previous ? byteLength(previous) : 0);
      if (job.contextBytes + delta > 24000) throw bridgeError(429, 'BRIDGE_CONTEXT_LIMIT');
      await tx.chatgptBridgeRequest.update({ where: { id: job.id }, data: {
        contextBytes: { increment: delta }, context: { ...job.context, partialReply } } });
      return { requestId: job.id, status: 'PENDING', alreadyPublished: false };
    });
  }
  return { create, read, cancel, context, readTool, reply, partial };
}
