import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { config } from '../config.js';
import { HttpError } from '../middleware/errors.js';
import { localize, normalizeLocale } from '../locales/index.js';
import { assistantTools } from './toolHandlers.js';
import { RequestGate, ModelCircuitBreaker, assertNotAborted, abortReason, withinSignal, closeWithin } from './assistantRuntime.js';
import { buildAssistantSummary, renderAssistantSummary } from './assistantSummary.js';
import { providerAvailability } from '../services/paymentProviders.js';
import { AssistantConversationStore, CONVERSATION_LIMITS } from './assistantConversation.js';
import { planWithModel, summarizeWithModel, validateModelPlan, modelInputFits } from './assistantModel.js';
export const suggestionKeys = ['assistant.prompt.slots', 'assistant.prompt.bookingHelp', 'assistant.prompt.payment', 'assistant.prompt.resources', 'assistant.prompt.bookings'];
export const getAssistantSuggestions = (locale = 'vi') => suggestionKeys.map(key => localize(locale, key));
export const listAssistantTools = () => assistantTools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema, readOnly: true }));
const plain = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
const introductionIntent = text => /^(?:ban la ai|who are you)\b/.test(text) ||
  /^(?:(?:xin )?chao(?: ban)?|hello|hi|hey|ban ten (?:la )?gi|ban co the lam (?:duoc )?gi|ban giup (?:duoc )?gi|gioi thieu ban than|what can you do|what is your name|introduce yourself|help me|giup toi)[?!.,…]*$/.test(text);
const paymentIntent = text => /thanh toan|payment|tra tien|\bpay\b/.test(text);
const slotIntent = text => /lich(?: con)? trong|khung gio|thoi gian(?: con)? trong|(?:phong|thiet bi)(?: con)? trong(?=$|[?!.,…]|\s+(?:ngay|hom|luc|tuan|\d))|dat lich|\b(?:slots?|availability|book|reserve)\b/.test(text);
// Relative dates and clock times in prose are not parsed by the local planner.
// Require the explicit Vietnam-time controls rather than silently searching a different day.
const needsTimeWindow = (data, text) => slotIntent(text) && !(data.startAt && data.endAt) &&
  /hom nay|ngay mai|toi nay|tuan sau|thu [2-7]|chu nhat|today|tomorrow|tonight|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\b\d{1,2}[:h]\d{2}\b|\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/.test(text);
function slotDuration(data, normalized) {
  if (data.durationMinutes !== undefined) return data.durationMinutes;
  const matches = [...normalized.matchAll(/(-?\d+(?:[.,]\d+)?)\s*(minutes?|mins?|phut|hours?|hrs?|gio)\b/g)];
  if (!matches.length) return 60;
  const inHours = match => /hours?|hrs?|gio/.test(match[2]);
  const asMinutes = match => Number(match[1].replace(',', '.')) * (inHours(match) ? 60 : 1);
  const combined = matches.length === 2 && inHours(matches[0]) && !inHours(matches[1]) && /^\s*(?:and|va)?\s*$/.test(normalized.slice(matches[0].index + matches[0][0].length, matches[1].index));
  if (matches.length > 1 && !combined) throw new HttpError(400, 'VALIDATION_ERROR', undefined, 'VALIDATION_ERROR');
  const minutes = matches.reduce((sum, match) => sum + asMinutes(match), 0);
  if (matches.some(match => asMinutes(match) < 0)) throw new HttpError(400, 'VALIDATION_ERROR', undefined, 'VALIDATION_ERROR');
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 480) throw new HttpError(400, 'VALIDATION_ERROR', undefined, 'VALIDATION_ERROR');
  return minutes;
}
export function planAssistantQuestion(data) {
  const n = plain(data.message);
  if (introductionIntent(n)) return [];
  const code = data.message.match(/\b[A-Z][A-Z0-9]*-[A-Z0-9-]+\b/)?.[0];
  const room = /\brooms?\b|phong/.test(n), equipment = /\bequipment\b|thiet bi/.test(n);
  const category = room !== equipment ? room ? 'ROOM' : 'EQUIPMENT' : undefined;
  const query =
    code ||
    (/gpu/.test(n)
      ? "GPU"
      : /camera/.test(n) ? "camera" : undefined);
  if (paymentIntent(n) || needsTimeWindow(data, n)) return [];
  if (/thong bao|notification/.test(n))
    return [
      {
        name: "list_notifications",
        input: { unreadOnly: /chua doc|unread/.test(n) },
      },
    ];
  if (/lich dat.*(toi|sap)|my .*booking|upcoming bookings?/.test(n))
    return [{ name: "get_my_bookings", input: {} }];
  if (/su co|incident/.test(n)) return [{ name: "get_incidents", input: {} }];
  if (/can chu y|giam sat|telemetry|monitor|attention/.test(n))
    return [{ name: "get_monitoring_summary", input: {} }];
  if (/quy trinh|huong dan|sop|tai lieu|instructions|procedure|policy|document/.test(n) && !slotIntent(n))
    return [
      {
        name: "search_knowledge_base",
        input: {
          query: data.message.slice(0, 120),
          ...(data.resourceId ? { resourceId: data.resourceId } : {}),
        },
      },
    ];
  if (/trung|conflict/.test(n))
    return data.resourceId && data.startAt && data.endAt
      ? [
          {
            name: "check_booking_conflicts",
            input: {
              resourceId: data.resourceId,
              startAt: data.startAt,
              endAt: data.endAt,
            },
          },
        ]
      : [];
  if (slotIntent(n))
    return [
      {
        name: "find_available_slots",
        input: {
          ...(category ? { category } : {}),
          ...(data.resourceId
            ? { resourceId: data.resourceId }
            : query
              ? { query }
              : {}),
          ...(data.startAt ? { from: data.startAt } : {}),
          ...(data.endAt ? { to: data.endAt } : {}),
          durationMinutes: slotDuration(data, n),
          limit: 5,
        },
      },
    ];
  if (/dieu kien|eligib/.test(n) && data.resourceId)
    return [
      {
        name: "check_user_eligibility",
        input: { resourceId: data.resourceId },
      },
    ];
  if (/phu hop|recommend|vram|suitable|appropriate/.test(n))
    return [
      {
        name: "recommend_equipment",
        input: {
          ...(category ? { category } : {}),
          ...(query ? { query } : {}),
          ...(/(\d+)\s*gb/.test(n)
            ? { minVramGb: Number(n.match(/(\d+)\s*gb/)[1]) }
            : {}),
        },
      },
    ];
  if (/tim|thiet bi|tai nguyen|resource|equipment|find|search/.test(n))
    return [{ name: "search_resources", input: { ...(query ? { query } : {}), ...(category ? { category } : {}) } }];
  if (/tong quan|operational summary|lab summary|\boverview\b/.test(n))
    return [{ name: 'get_operational_summary', input: {} }];
  return [];
}
function realClient(authorization, signal, settings, locale) {
  const client = new Client({ name: 'lrm-assistant', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${settings.port}/mcp`), { requestInit: { headers: { Authorization: authorization, 'Accept-Language': locale, 'X-LRM-Locale': locale }, signal } });
  return { client, transport };
}
const selectionIndex = text => {
  const normalized = plain(text);
  const match = normalized.match(/(?:cai|khung|lua chon|thiet bi|phong)(?:\s+(?:gio|thu))?\s+([1-5])\b|\b(?:option|slot|number|resource)\s+([1-5])\b/);
  if (match) return Number(match[1] || match[2]) - 1;
  for (const [pattern, index] of [[/\b(?:thu nhat|first one|first slot)\b/, 0], [/\b(?:thu hai|second one|second slot)\b/, 1], [/\b(?:thu ba|third one|third slot)\b/, 2]]) if (pattern.test(normalized)) return index;
  return null;
};
const operationalQuestion = text => /lich|thiet bi|tai nguyen|phong|gia thue|thanh toan|su co|thong bao|bao tri|quyen|chung nhan|\b(?:booking|slots?|resource|equipment|availability|payment|incident|notification|maintenance|price|permission|policy|telemetry)\b/.test(plain(text));
const choicePlan = (row, index) => {
  if (index === null) return null;
  const slot = row.slots[index];
  if (slot) return [{ name: 'find_available_slots', input: { resourceId: slot.resourceId, from: slot.startAt, to: slot.endAt, durationMinutes: Math.round((Date.parse(slot.endAt) - Date.parse(slot.startAt)) / 60000), limit: 1 } }];
  const resource = row.resources[index];
  return resource ? [{ name: 'get_resource_detail', input: { resourceId: resource.id } }] : [];
};
export function createAssistantService({ settings = config, clientFactory = realClient, modelCall = summarizeWithModel, plannerCall = planWithModel, paymentAvailability = providerAvailability, conversations = new AssistantConversationStore() } = {}) {
  const gate = new RequestGate(settings.assistantConcurrency);
  const breaker = new ModelCircuitBreaker({ threshold: settings.assistantModelFailureThreshold, cooldownMs: settings.assistantModelCooldownMs });
  const active = new Map();
  async function answer(data, { authorization, actorId, actorRole, signal: externalSignal } = {}) {
    const release = gate.acquire(actorId);
    const deadline = new globalThis.AbortController();
    const timer = setTimeout(() => deadline.abort(new HttpError(504, 'ASSISTANT_TIMEOUT', undefined, 'ASSISTANT_TIMEOUT')), settings.assistantTimeoutMs);
    const signal = externalSignal ? globalThis.AbortSignal.any([externalSignal, deadline.signal]) : deadline.signal;
    const locale = normalizeLocale(data.locale), toolResults = [], actions = [], toolsUsed = new Set();
    let client, stop, lease = null;
    active.set(actorId, { session: conversations.owner({ actorId, authorization }), controller: deadline });
    try {
      assertNotAborted(signal);
      const context = { authorization, actorId, actorRole };
      const row = conversations.open(data.conversationId, context);
      const originalQuestion = data.message;
      const respond = response => {
        assertNotAborted(signal);
        return { ...response, conversation: conversations.commit(row, originalQuestion, response) };
      };
      let reads = 0;
      const call = async step => {
        assertNotAborted(signal);
        // Five context reads, three planned reads and five eligibility checks.
        if (++reads > 13) throw new HttpError(503, 'ASSISTANT_OVERLOADED', { retryAfterSeconds: 2 }, 'ASSISTANT_OVERLOADED');
        if (!client) {
          const connection = clientFactory(authorization, signal, settings, locale); client = connection.client;
          stop = () => { void closeWithin(client); }; signal.addEventListener('abort', stop, { once: true });
          await withinSignal(() => client.connect(connection.transport, { signal, timeout: settings.assistantToolTimeoutMs }), signal);
        }
        const response = await withinSignal(() => client.callTool({ name: step.name, arguments: step.input }, { signal, timeout: settings.assistantToolTimeoutMs }), signal);
        toolsUsed.add(step.name);
        return response.structuredContent || JSON.parse(response.content?.find(x => x.type === 'text')?.text || '{}');
      };
      const index = selectionIndex(data.message);
      let plan = choicePlan(row, index) ?? planAssistantQuestion(data);
      let modelStatus = 'NOT_CONFIGURED', selectedChoice = index !== null;
      const configured = Boolean(settings.openaiApiKey && settings.openaiModel);
      const conversationMode = configured && settings.assistantConversationEnabled;
      if (conversationMode && !paymentIntent(plain(data.message))) {
        // Re-read referenced resources through MCP before sending any choice
        // names or details to a model. Old business prose is never replayed.
        const choices = [];
        for (const resource of row.resources) {
          const result = await call({ name: 'get_resource_detail', input: { resourceId: resource.id } });
          if (result.error || !result.resource) {
            row.resources = []; row.slots = [];
            return respond({ answer: localize(locale, 'assistant.contextUnavailable'), summary: [{ key: 'assistant.contextUnavailable' }], locale, provider: 'local', modelStatus: 'TOOL_UNAVAILABLE', toolsUsed: [...toolsUsed], toolResults: [{ tool: 'get_resource_detail', result }], actions: [], source: 'authenticated_mcp', generatedAt: new Date().toISOString() });
          }
          choices.push({ id: result.resource.id, code: result.resource.code, name: result.resource.name, category: result.resource.category });
        }
        const payload = { question: data.message, history: row.turns, now: new Date().toISOString(), timeZone: 'Asia/Ho_Chi_Minh', actorRole, workspace: data.workspace || null, context: { resourceId: data.resourceId || null, startAt: data.startAt || null, endAt: data.endAt || null, durationMinutes: data.durationMinutes || null }, choices, historicalSlots: row.slots };
        if (!modelInputFits(payload)) modelStatus = 'INPUT_TOO_LARGE';
        else if (!(lease = breaker.enter())) modelStatus = 'CIRCUIT_OPEN';
        else {
          try {
            const modelPlan = validateModelPlan(await withinSignal(() => plannerCall({ payload, locale, signal, settings }), signal));
            if (modelPlan.kind === 'CHAT' && (plan.length || index !== null || operationalQuestion(data.message))) throw new Error('Operational request requires fresh evidence');
            if (modelPlan.kind === 'CHAT' || modelPlan.kind === 'CLARIFY') {
              if (!modelPlan.reply.trim()) throw new Error('Empty conversational response');
              breaker.finish(lease, 'success'); lease = null;
              return respond({ answer: modelPlan.reply, summary: [], locale, provider: 'openai', modelStatus: 'AVAILABLE', toolsUsed: [...toolsUsed], toolResults: [], actions: [], source: modelPlan.kind === 'CHAT' ? 'model_conversation' : 'model_guidance', generatedAt: new Date().toISOString() });
            }
            if (modelPlan.kind === 'PAYMENT') plan = [];
            else plan = modelPlan.selectedSlotIndex !== null ? choicePlan(row, modelPlan.selectedSlotIndex) || [] : modelPlan.reads;
            selectedChoice = selectedChoice || modelPlan.selectedSlotIndex !== null;
            if (modelPlan.kind === 'PAYMENT') data = { ...data, message: locale === 'en' ? 'Payment guidance' : 'Hướng dẫn thanh toán' };
            modelStatus = 'AVAILABLE';
          } catch {
            if (signal.aborted) { breaker.finish(lease, 'cancelled'); lease = null; throw abortReason(signal); }
            breaker.finish(lease, 'failure'); lease = null; modelStatus = 'MODEL_UNAVAILABLE';
          }
        }
      }
      if (!plan.length) {
        const normalized = plain(data.message);
        let summary = [{ key: 'assistant.clarifyRequest' }];
        if (selectedChoice) {
          summary = [{ key: 'assistant.choiceMissing' }];
        } else if (introductionIntent(normalized)) {
          summary = [{ key: 'assistant.introduction' }];
        } else if (paymentIntent(normalized)) {
          const providers = settings.paymentsEnabled ? paymentAvailability() : {};
          const readiness = !settings.paymentsEnabled ? 'disabled' : providers.vnpay || providers.vietqr ? 'ready' : 'unconfigured';
          summary = [{ key: `assistant.payment.${readiness}` }, { key: 'assistant.payment.conditions' }];
          actions.push({ type: 'OPEN_BOOKINGS', labelKey: 'assistant.viewBookings' });
        } else if (needsTimeWindow(data, normalized)) {
          summary = [{ key: 'assistant.chooseTimeWindow' }];
          actions.push({ type: 'CHOOSE_CONTEXT', labelKey: 'assistant.chooseContext' });
        } else if (/trung|conflict|dieu kien|eligib/.test(normalized)) {
          summary = [{ key: 'assistant.guidance' }];
          actions.push({ type: 'CHOOSE_CONTEXT', labelKey: 'assistant.chooseContext' });
        }
        if (lease) { breaker.finish(lease, 'success'); lease = null; }
        return respond({ answer: renderAssistantSummary(summary, (key, params) => localize(locale, key, params), locale), summary, locale, provider: 'local', modelStatus: ['MODEL_UNAVAILABLE', 'CIRCUIT_OPEN', 'INPUT_TOO_LARGE'].includes(modelStatus) ? modelStatus : 'LOCAL_ONLY', toolsUsed: [...toolsUsed], toolResults: [], actions, source: 'local_guidance', generatedAt: new Date().toISOString() });
      }
      const eligibilityByResource = new Map();
      for (const step of plan) {
        // Explicit form context wins over inferred model arguments. A historical
        // selection keeps its exact interval and is read again, never cached.
        if (step.name === 'find_available_slots' && !selectedChoice) step.input = { ...step.input, ...(data.resourceId ? { resourceId: data.resourceId } : {}), ...(data.startAt ? { from: data.startAt } : {}), ...(data.endAt ? { to: data.endAt } : {}), ...(data.durationMinutes ? { durationMinutes: data.durationMinutes } : {}), limit: Math.min(step.input.limit || 5, 5) };
        const result = await call(step); toolResults.push({ tool: step.name, result }); toolsUsed.add(step.name);
        for (const slot of (result.slots || []).slice(0, 5)) {
          if (!eligibilityByResource.has(slot.resourceId)) {
            eligibilityByResource.set(slot.resourceId, await call({ name: 'check_user_eligibility', input: { resourceId: slot.resourceId } }));
            toolsUsed.add('check_user_eligibility');
          }
          const eligibility = eligibilityByResource.get(slot.resourceId);
          if (eligibility?.bookable && !eligibility.missingTraining?.length) actions.push({ type: 'PREFILL_BOOKING', labelKey: 'assistant.openForm', payload: slot });
        }
      }
      assertNotAborted(signal);
      const summary = buildAssistantSummary(toolResults);
      for (const result of eligibilityByResource.values()) if (result.error || result.deferred) summary.push(...buildAssistantSummary([{ result }]));
      if (plan.some(step => step.name === 'find_available_slots')) {
        const key = selectedChoice ? 'assistant.recheckedChoice' : data.startAt || data.endAt ? 'assistant.selectedWindow' : plan.some(step => step.input.from || step.input.to) ? 'assistant.requestedWindow' : 'assistant.defaultWindow';
        summary.unshift({ key });
      }
      let answer = renderAssistantSummary(summary, (key, params) => localize(locale, key, params), locale), provider = 'local';
      const eligibility = [...eligibilityByResource].map(([resourceId, result]) => ({ resourceId, result }));
      if (configured && (!conversationMode || lease)) {
        const evidence = [...toolResults, ...eligibility];
        const usable = toolResults.length && !evidence.some(({ result }) => result.error || result.deferred);
        if (!lease) lease = usable ? breaker.enter() : null;
        if (!usable) { if (lease) breaker.finish(lease, 'cancelled'); lease = null; modelStatus = evidence.some(({ result }) => result.error) ? 'TOOL_UNAVAILABLE' : 'LOCAL_ONLY'; }
        else if (!lease) modelStatus = 'CIRCUIT_OPEN';
        else if (!modelInputFits({ question: data.message, toolResults, eligibility, history: row.turns })) { modelStatus = 'INPUT_TOO_LARGE'; breaker.finish(lease, 'cancelled'); lease = null; }
        else {
          try {
            const text = await withinSignal(() => modelCall({ question: data.message, toolResults, eligibility, history: row.turns, locale, signal, settings }), signal);
            assertNotAborted(signal);
            if (!text?.trim()) throw new Error('Empty model response');
            answer = text.slice(0, 12000); provider = 'openai'; modelStatus = 'AVAILABLE'; breaker.finish(lease, 'success'); lease = null;
          } catch {
            if (signal.aborted) { breaker.finish(lease, 'cancelled'); lease = null; throw abortReason(signal); }
            breaker.finish(lease, 'failure'); lease = null; modelStatus = 'MODEL_UNAVAILABLE';
          }
        }
      }
      return respond({ answer, summary, locale, provider, modelStatus, toolsUsed: [...toolsUsed], toolResults, actions, source: 'authenticated_mcp', generatedAt: new Date().toISOString() });
    } catch (error) {
      if (signal.aborted) throw abortReason(signal);
      if (error instanceof HttpError) throw error;
      throw new HttpError(503, 'MCP_UNAVAILABLE', undefined, 'MCP_UNAVAILABLE');
    } finally {
      if (lease) breaker.finish(lease, 'cancelled');
      active.delete(actorId);
      clearTimeout(timer); if (stop) signal.removeEventListener('abort', stop);
      try { if (client) await closeWithin(client); } finally { release(); }
    }
  }
  function removeConversation(id, context) { const release = gate.acquire(context.actorId); try { conversations.remove(id, context); } finally { release(); } }
  function forgetSession(context) {
    const work = active.get(context.actorId);
    if (work?.session === conversations.owner({ actorId: context.actorId, authorization: context.authorization })) work.controller.abort(new HttpError(499, 'ASSISTANT_CANCELLED', undefined, 'ASSISTANT_CANCELLED'));
    conversations.forgetSession(context);
  }
  return { answer, gate, breaker, conversations, removeConversation, forgetSession };
}
const service = createAssistantService();
export const answerAssistantQuestion = (data, context) => service.answer(data, context);
export const removeAssistantConversation = (id, context) => service.removeConversation(id, context);
export const forgetAssistantSession = context => service.forgetSession(context);
export const assistantConversationLimits = CONVERSATION_LIMITS;
