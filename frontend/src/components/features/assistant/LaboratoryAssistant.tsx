import { LocaleScope, useLocale } from '../../../providers/LocaleProvider';
import { useEffect, useRef, useState } from 'react';
import { submitChatOnEnter } from '../../../utils/chatKeyboard';
import { createPortal } from 'react-dom';
import { X, Send, Square, Plus, Headphones, ArrowUpRight, RotateCcw, CheckCircle2 } from 'lucide-react';
import { RobotMascot } from './RobotMascot';
import { apiRequest } from '../../../api.js';
import { hasMessage } from '../../../i18n.js';
import { vietnamTimeToIso } from '../../../utils/timezone';
import { navigateApp, workspacePathForTab } from '../../../workspaceRoutes.js';
import { askChatgptBridge, type BridgeRequest } from '../../../services/chatgptBridgeApi';
import { reviewBridgeProposal, type BridgeProposal, type BridgeSupportDraft } from '../../../services/chatgptBridgeProposals';
import CustomerSupportChat from '../support/CustomerSupportChat';
import { supportApi } from '../../../services/support';
import './assistant.css';

type Slot = { resourceId: string; startAt: string; endAt: string; resourceName?: string; resourceCode?: string; title?: string; purpose?: string; purposeCode?: string };
type Action = { type: string; labelKey: string; payload?: Slot };
type Segment = { text?: string; key?: string; params?: Record<string, unknown>; labels?: Record<string, string>; times?: Record<string, string> };
type Resource = { id: string; name: string; code: string; category?: string; operationalStatus?: string };
type Source = { chunkId: string; excerpt: string; document: { title: string; version?: string; fileName?: string } };
type Answer = { answer: string; summary: Segment[]; locale: string; provider: string; modelStatus: string; source: string; toolsUsed: string[]; actions: Action[]; toolResults: { tool: string; result: Record<string, unknown> }[]; proposals?: BridgeProposal[]; nextTab?: string; conversation?: { id: string; expiresAt: string; retainedTurns?: number } };
type Props = { isOpen: boolean; onClose: () => void; onPrefill: (slot: Slot) => void; onNavigate: (tab: string) => void; workspaceTab?: string; actorRole?: string };
type Turn = { id: string; question: string; response?: Answer; partial?: string; delivery: 'sending' | 'sent' | 'failed' | 'cancelled' };

export default function LaboratoryAssistant(props: Props) {
  return <LocaleScope><AssistantConversation {...props} /></LocaleScope>;
}

function AssistantConversation({ isOpen, onClose, onPrefill, onNavigate, workspaceTab, actorRole }: Props) {
  const { locale, tr, changeLocale, loadingLocale, localeError } = useLocale();
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose;
  const panel = useRef<HTMLElement>(null), content = useRef<HTMLDivElement>(null), contextFields = useRef<HTMLDetailsElement>(null);
  const questionInput = useRef<HTMLTextAreaElement>(null), resourceInput = useRef<HTMLSelectElement>(null), latestTurn = useRef<HTMLElement>(null);
  const mounted = useRef(false), inFlight = useRef<AbortController | null>(null), previousLocale = useRef(locale);
  const nearBottom = useRef(true);
  const resourcesLoaded = useRef(false);
  const conversationId = useRef<string | undefined>(undefined);
  const bridgeConversationId = useRef<string | undefined>(undefined);
  const bridgeWork = useRef<Promise<BridgeRequest> | null>(null);
  const [conversationExpired, setConversationExpired] = useState(false);
  const [messages, setMessages] = useState<Turn[]>([]), [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [setupError, setSetupError] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]), [mode, setMode] = useState('CHECKING'), [connectionAttempt, setConnectionAttempt] = useState(0);
  const [resources, setResources] = useState<Resource[]>([]), [resourceId, setResourceId] = useState('');
  const [duration, setDuration] = useState(''), [startAt, setStartAt] = useState(''), [endAt, setEndAt] = useState('');
  const [bridge, setBridge] = useState<{ enabled: boolean; connected: boolean; mode: string } | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [humanMode, setHumanMode] = useState(false), [humanDraft, setHumanDraft] = useState<BridgeSupportDraft | undefined>();
  useEffect(() => { if (humanMode && isOpen && content.current) content.current.scrollTop = content.current.scrollHeight; }, [humanMode, isOpen]);
  const usesBridge = Boolean(bridge?.enabled && bridge.connected && bridge.mode === 'chatgpt_bridge');
  const operator = actorRole === 'ADMIN' || actorRole === 'LAB_STAFF';
  useEffect(() => {
    if (!isOpen || actorRole !== 'CUSTOMER') return;
    const controller = new AbortController();
    supportApi.list(new URLSearchParams({ page: '1', pageSize: '1' }), controller.signal).then(result => {
      if (!controller.signal.aborted && result.activeSession && !inFlight.current) setHumanMode(true);
    }).catch(() => { /* The support form shows its own connection error when opened. */ });
    return () => controller.abort();
  }, [isOpen, actorRole]);

  useEffect(() => {
    if (!isOpen || !content.current || !latestTurn.current || !nearBottom.current) return;
    // Scroll the conversation only; opening a result must not move the workspace.
    content.current.scrollTop += latestTurn.current.getBoundingClientRect().top - content.current.getBoundingClientRect().top - 12;
  }, [messages, isOpen]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; inFlight.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setCheckingConnection(true); setSetupError(false);
    Promise.allSettled([
      apiRequest('/assistant/suggestions', { signal: controller.signal }),
      resourcesLoaded.current ? Promise.resolve(null) : apiRequest('/resources', { signal: controller.signal })
    ]).then(([settings, rows]) => {
      if (controller.signal.aborted) return;
      if (settings.status === 'fulfilled') { setSuggestions(settings.value.suggestionKeys || []); setMode(settings.value.mode); setBridge(settings.value.bridge || null); }
      else { setMode('UNAVAILABLE'); setBridge(null); }
      if (rows.status === 'fulfilled' && rows.value) { setResources(Array.isArray(rows.value) ? rows.value : rows.value.resources || []); resourcesLoaded.current = true; }
      setSetupError(settings.status === 'rejected' || rows.status === 'rejected');
      setCheckingConnection(false);
    });
    return () => controller.abort();
  }, [isOpen, connectionAttempt]);
  useEffect(() => {
    if (locale !== previousLocale.current) {
      previousLocale.current = locale;
      if (inFlight.current) { inFlight.current.abort(); setError('assistant.languageChanged'); }
    }
  }, [locale]);
  useEffect(() => {
    if (!isOpen) { if (inFlight.current) { inFlight.current.abort(); setError('assistant.cancelled'); } return; }
    questionInput.current?.focus({ preventScroll: true });
    const checkFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || panel.current?.contains(target) || target.closest('.assistant-launcher')) return;
      const widget = panel.current?.getBoundingClientRect(), focused = target.getBoundingClientRect();
      if (target.closest('[role="dialog"],dialog') || (widget && focused.width && focused.height && focused.right > widget.left && focused.left < widget.right && focused.bottom > widget.top && focused.top < widget.bottom)) onCloseRef.current();
    };
    document.addEventListener('focusin', checkFocus);
    return () => document.removeEventListener('focusin', checkFocus);
  }, [isOpen]);

  function dismiss(restoreFocus = true) {
    const previous = document.querySelector<HTMLElement>('.assistant-launcher');
    onClose();
    if (restoreFocus) requestAnimationFrame(() => { if (previous?.isConnected) previous.focus({ preventScroll: true }); });
  }
  function chooseContext() {
    if (contextFields.current) contextFields.current.open = true;
    resourceInput.current?.focus({ preventScroll: true });
    if (content.current) content.current.scrollTop = 0;
  }
  function cancel() { inFlight.current?.abort(); setError('assistant.cancelled'); }
  async function stopBridge() {
    const pending = bridgeWork.current;
    inFlight.current?.abort();
    if (!pending) return true;
    try { await pending; }
    catch (failure) { if ((failure as { code?: string }).code === 'bridge.cancelFailed') { if (mounted.current) setError('bridge.cancelFailed'); return false; } }
    return true;
  }
  async function handoff() {
    if (busy && !bridgeWork.current) return;
    if (bridgeWork.current && !await stopBridge()) return;
    if (actorRole === 'CUSTOMER') { setHumanDraft(undefined); setHumanMode(true); setError(''); }
    else { dismiss(false); navigateApp(workspacePathForTab('support')); }
  }
  async function newConversation() {
    if (bridgeWork.current && !await stopBridge()) return;
    if (inFlight.current) return;
    nearBottom.current = true;
    const controller = new AbortController(); inFlight.current = controller; setBusy(true); setError('');
    try {
      if (conversationId.current && !conversationExpired) await apiRequest(`/assistant/conversations/${conversationId.current}`, { method: 'DELETE', signal: controller.signal });
      if (!mounted.current || controller.signal.aborted) return;
      conversationId.current = undefined; bridgeConversationId.current = undefined; setConversationExpired(false); setMessages([]);
      setResourceId(''); setDuration(''); setStartAt(''); setEndAt('');
      questionInput.current?.focus({ preventScroll: true });
    } catch (failure) {
      if (!mounted.current || controller.signal.aborted) return;
      if ((failure as { code?: string }).code === 'ASSISTANT_CONVERSATION_EXPIRED') {
        conversationId.current = undefined; bridgeConversationId.current = undefined; setConversationExpired(false); setMessages([]);
        setResourceId(''); setDuration(''); setStartAt(''); setEndAt('');
        questionInput.current?.focus({ preventScroll: true });
      } else setError((failure as Error).message);
    } finally { if (inFlight.current === controller) { inFlight.current = null; if (mounted.current) setBusy(false); } }
  }
  async function send(text: string, retryId?: string) {
    if (inFlight.current || conversationExpired || checkingConnection || setupError || mode === 'CHECKING' || text.trim().length < 2) return;
    if (duration !== '' && (!Number.isInteger(Number(duration)) || Number(duration) < 15 || Number(duration) > 480)) { setError('assistant.invalidDuration'); return; }
    if (Boolean(startAt) !== Boolean(endAt)) { setError('assistant.completeWindow'); return; }
    let startIso: string | undefined, endIso: string | undefined;
    try {
      const parse = (value: string) => { const [date, time] = value.split('T'); return vietnamTimeToIso(date, time); };
      startIso = startAt ? parse(startAt) : undefined; endIso = endAt ? parse(endAt) : undefined;
      if (startIso && endIso && startIso >= endIso) throw new Error();
    } catch { setError('api.INVALID_BOOKING_TIME'); return; }
    nearBottom.current = true;
    const controller = new AbortController(); inFlight.current = controller;
    const turnId = retryId || crypto.randomUUID();
    setMessages(previous => retryId ? previous.map(turn => turn.id === retryId ? { ...turn, delivery: 'sending' } : turn) : [...previous.slice(-9), { id: turnId, question: text, delivery: 'sending' }]);
    setQuestion(current => current.trim() === text.trim() ? '' : current);
    const timer = usesBridge ? undefined : window.setTimeout(() => { setError('assistant.timeout'); controller.abort(); }, 65000);
    setBusy(true); setError('');
    try {
      const currentConversation = usesBridge ? bridgeConversationId.current : conversationId.current;
      const body = { message: text, locale, ...(currentConversation ? { conversationId: currentConversation } : {}), ...(workspaceTab ? { workspace: workspaceTab } : {}), ...(resourceId ? { resourceId } : {}), ...(duration !== '' ? { durationMinutes: Number(duration) } : {}), ...(startIso ? { startAt: startIso } : {}), ...(endIso ? { endAt: endIso } : {}) };
      let response: Answer;
      if (usesBridge) {
        const work = askChatgptBridge(body, { signal: controller.signal, onPending: request => {
          if (!controller.signal.aborted && mounted.current) setMessages(previous => previous.map(turn => turn.id === turnId ? { ...turn, partial: request.partialReply?.text, delivery: 'sent' } : turn));
        } }); bridgeWork.current = work;
        const result = await work;
        response = { answer: result.answer!, locale: result.locale || locale, provider: result.provider!, source: result.source!, modelStatus: 'ANSWERED', summary: [{ text: result.answer! }], toolsUsed: result.toolsUsed || [], toolResults: [], actions: [], conversation: result.conversation, proposals: result.proposals, nextTab: result.nextTab };
      } else response = await apiRequest('/assistant/chat', { method: 'POST', signal: controller.signal, body: JSON.stringify(body) });
      if (!mounted.current || controller.signal.aborted) return;
      if (usesBridge) bridgeConversationId.current = response.conversation?.id;
      else conversationId.current = response.conversation?.id;
      setMessages(previous => previous.map(turn => turn.id === turnId ? { ...turn, response, delivery: 'sent' } : turn));
    } catch (failure) { if (mounted.current && (!controller.signal.aborted || (failure as { code?: string }).code === 'bridge.cancelFailed')) { setError((failure as Error).message); if ((failure as { code?: string }).code === 'BRIDGE_UNAVAILABLE') setBridge(previous => previous ? { ...previous, connected: false } : previous); if ((failure as { code?: string }).code === 'ASSISTANT_CONVERSATION_EXPIRED') setConversationExpired(true); } }
    finally {
      if (timer) window.clearTimeout(timer);
      if (mounted.current) setMessages(previous => previous.map(turn => turn.id === turnId && !turn.response ? { ...turn, delivery: controller.signal.aborted ? 'cancelled' : 'failed' } : turn));
      if (inFlight.current === controller) { inFlight.current = null; bridgeWork.current = null; if (mounted.current) setBusy(false); }
    }
  }
  const label = (key: string) => tr(hasMessage(key) ? key : 'core.empty.value');
  const time = (value: string) => new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
  function labelText(segment: Segment) {
    return segment.text ?? tr(segment.key && hasMessage(segment.key) ? segment.key : 'api.DATA_UNAVAILABLE', { ...segment.params,
      ...Object.fromEntries(Object.entries(segment.labels || {}).map(([key, id]) => [key, label(id)])),
      ...Object.fromEntries(Object.entries(segment.times || {}).map(([key, value]) => [key, time(value)])) });
  }
  function navigate(tab: string) { dismiss(false); onNavigate(tab); }
  const targetLabels: Record<string, string> = { stock: 'assistant.openStock', users: 'assistant.openCustomers', dashboard: 'assistant.openReport', smart_calendar: 'assistant.openCalendar' };
  function review(proposal: BridgeProposal) {
    try {
      const draft = reviewBridgeProposal(proposal);
      if (draft.kind === 'BOOKING') { dismiss(false); onPrefill(draft); }
      else { setHumanDraft(draft); setHumanMode(true); setError(''); }
    } catch (failure) { setError((failure as Error).message); }
  }
  if (!isOpen && !humanMode) return null;

  return createPortal(<section id="lab-assistant-panel" lang={locale} hidden={!isOpen} className={`lab-assistant${messages.length ? ' has-conversation' : ''}`} ref={panel} role="dialog" aria-modal="false" aria-labelledby="lab-assistant-title"
    onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); dismiss(); } }}>
    <header>
      <span className="assistant-avatar" aria-hidden="true">{humanMode ? <Headphones size={21} /> : <RobotMascot />}</span>
      <div className="assistant-heading"><h2 id="lab-assistant-title">{tr(humanMode ? 'support.handoff' : 'assistant.title')}</h2><p>{tr(humanMode ? 'support.message' : 'assistant.subtitle')}</p></div>
      <div className="assistant-language" role="group" aria-label={tr('assistant.changeLanguage')}>
        {['vi', 'en'].map(value => <button type="button" key={value} disabled={!!loadingLocale} aria-pressed={locale === value} onClick={() => void changeLocale(value)}>{value.toUpperCase()}</button>)}
      </div>
      {!humanMode && <button type="button" className="assistant-new" disabled={busy || !messages.length} onClick={() => void newConversation()} aria-label={tr('assistant.newConversation')} title={tr('assistant.newConversation')}><Plus size={19} aria-hidden="true" /></button>}
      <button type="button" className="assistant-minimize" onClick={() => dismiss()} aria-label={tr('assistant.minimize')}><X size={19} aria-hidden="true" /></button>
    </header>
    <div className="lab-assistant-content" ref={content} onScroll={event => { const el = event.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
      {localeError && <p role="alert">{tr('assistant.languageLoadFailed')}</p>}
      {!humanMode && !messages.length && <div className="assistant-welcome"><h3>{tr('assistant.welcome')}</h3><p>{tr(operator ? 'assistant.operatorWelcome' : 'assistant.welcomeHelp')}</p></div>}
      {!humanMode && checkingConnection && <p className="assistant-connection-check" role="status">{tr('assistant.mode.CHECKING')}</p>}
      <details hidden={humanMode} ref={contextFields} className="assistant-context-disclosure"><summary>{tr('assistant.context')}{resourceId && <span>{resources.find(resource => resource.id === resourceId)?.code}</span>}</summary>
        <div className="assistant-context">
          <label>{tr('assistant.resource')}<select ref={resourceInput} value={resourceId} onChange={event => setResourceId(event.target.value)}><option value="">{tr('assistant.inferResource')}</option>{resources.map(resource => <option value={resource.id} key={resource.id}>{resource.code} · {resource.name}</option>)}</select></label>
          <label>{tr('assistant.duration')}<input type="number" min={15} max={480} step={1} value={duration}  aria-describedby="assistant-duration-help" onChange={event => setDuration(event.target.value)} /><small id="assistant-duration-help">{tr('assistant.durationHelp')}</small></label>
          <label>{tr('assistant.start')}<input type="datetime-local" value={startAt} onChange={event => setStartAt(event.target.value)} /></label>
          <label>{tr('assistant.end')}<input type="datetime-local" value={endAt} onChange={event => setEndAt(event.target.value)} /></label>
        </div>
      </details>
      {!humanMode && setupError && <div role="alert" className="assistant-setup-error"><p>{tr('assistant.unavailable')}</p><button type="button" className="secondary-button" disabled={busy || checkingConnection} onClick={() => setConnectionAttempt(value => value + 1)}>{tr('assistant.retryConnection')}</button></div>}
      {!humanMode && !setupError && bridge?.enabled && !bridge.connected && <div className="assistant-capabilities">
        <p className="assistant-capability-ready"><CheckCircle2 size={16} aria-hidden="true" />{tr('assistant.connection.localReady')}</p>
        <details><summary>{tr('assistant.connection.limits')}</summary><p>{tr('assistant.localAvailable')}</p>
          {actorRole === 'ADMIN' && <p>{tr('assistant.connection.adminHelp')}</p>}
          <div className="assistant-connection-actions"><button type="button" disabled={busy || checkingConnection} onClick={() => setConnectionAttempt(value => value + 1)}>{tr('assistant.connection.check')}</button>
            {actorRole === 'ADMIN' && <button type="button" onClick={() => navigate('chatgpt_bridge')}>{tr('assistant.connection.manage')}</button>}</div>
        </details>
      </div>}
      {!humanMode && !messages.length && <div className="assistant-suggestions" aria-label={tr('assistant.getStarted')}>
        {suggestions.slice(0, operator ? 4 : 3).map(key => <button type="button" key={key} disabled={busy || conversationExpired || checkingConnection || setupError} onClick={() => void send(label(key))}>{label(key)}</button>)}
      </div>}
      <div className="assistant-conversation" aria-live="polite" aria-relevant="additions">{messages.map((turn, index) => {
        if (!turn.response) return <article key={turn.id} className="assistant-turn" ref={index === messages.length - 1 ? latestTurn : undefined}>
          <p className="assistant-question">{turn.question}</p>
          {turn.partial && <div className="assistant-answer"><p>{turn.partial}</p><small>{tr('assistant.partialReply')}</small></div>}
          <small className="assistant-delivery" role="status">{tr(`assistant.delivery.${turn.delivery}`)}</small>
          {['sending', 'sent'].includes(turn.delivery) ? <div role="status" className="assistant-busy"><span className="assistant-thinking" aria-hidden="true"><i /><i /><i /></span>{tr('assistant.lookupBusy')}</div> :
            <button type="button" className="assistant-retry" disabled={busy || conversationExpired} onClick={() => void send(turn.question, turn.id)}><RotateCcw size={14} aria-hidden="true" />{tr('assistant.retryMessage')}</button>}
        </article>;
        const slots = turn.response.toolResults?.flatMap(result => Array.isArray(result.result.slots) ? result.result.slots as Slot[] : []) || [];
        const foundResources = turn.response.toolResults?.filter(result => ['search_resources', 'recommend_equipment'].includes(result.tool)).flatMap(result => Array.isArray(result.result.resources) ? result.result.resources as Resource[] : []) || [];
        const segments = (turn.response.summary || []).filter(segment => !(slots.length && segment.key === 'assistant.slotLine') && !(foundResources.length && segment.key === 'assistant.resourceLine'));
        return <article key={turn.id} className="assistant-turn" ref={index === messages.length - 1 ? latestTurn : undefined}>
          <p className="assistant-question">{turn.question}</p>
          <div className="assistant-answer">
            {['openai', 'chatgpt'].includes(turn.response.provider) && <p>{turn.response.answer}</p>}
            {!['openai', 'chatgpt'].includes(turn.response.provider) && <p>{segments.map(labelText).join('\n')}</p>}
            {turn.response.proposals?.map(proposal => <div className="assistant-slot-result" key={proposal.id}>
              <strong>{proposal.kind === 'BOOKING' ? proposal.resourceName : tr('support.handoff')}</strong>
              {proposal.kind === 'BOOKING' ? <>
                <p><time dateTime={proposal.startAt}>{time(proposal.startAt)}</time> → <time dateTime={proposal.endAt}>{time(proposal.endAt)}</time></p>
                <small>{new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(proposal.quote.amountVnd)}</small>
              </> : <small>{proposal.laboratoryName}</small>}
              <button type="button" className="secondary-button" disabled={busy || humanMode} onClick={() => review(proposal)}>{tr('bridge.reviewProposal')}</button>
            </div>)}
            {foundResources.map(resource => <article className="assistant-resource-result" key={resource.id}><strong>{resource.name}</strong><small>{resource.code} · {label(`enum.operational.${resource.operationalStatus}`)}</small></article>)}
            {!!foundResources.length && <button type="button" className="secondary-button" onClick={() => navigate('resources')}>{tr('assistant.viewResources')}</button>}
            {slots.map(slot => {
              const action = turn.response.actions?.find(action => action.type === 'PREFILL_BOOKING' && action.payload?.resourceId === slot.resourceId && action.payload.startAt === slot.startAt && action.payload.endAt === slot.endAt);
              return <div className="assistant-slot-result" key={`${slot.resourceId}-${slot.startAt}`}>
                <strong>{slot.resourceName || resources.find(resource => resource.id === slot.resourceId)?.name || tr('assistant.resource')}</strong>
                <p><time dateTime={slot.startAt}>{time(slot.startAt)}</time><span aria-hidden="true"> → </span><time dateTime={slot.endAt}>{time(slot.endAt)}</time></p>
                {action?.payload ? <button type="button" className="secondary-button" onClick={() => { dismiss(false); onPrefill(action.payload!); }}>{tr('assistant.openBooking')}</button> : <small>{tr('assistant.slotNotBookable')}</small>}
              </div>;
            })}
            {turn.response.actions?.filter(action => ['OPEN_BOOKINGS', 'CHOOSE_CONTEXT'].includes(action.type)).map(action => <button type="button" className="secondary-button" key={action.type} onClick={() => action.type === 'OPEN_BOOKINGS' ? navigate('bookings') : chooseContext()}>{label(action.labelKey)}</button>)}
            {turn.response.toolResults?.filter(result => result.tool === 'search_knowledge_base').flatMap(result => Array.isArray(result.result.sources) ? result.result.sources as Source[] : []).map(source => <details className="assistant-evidence" key={source.chunkId}><summary>{source.document.title}{source.document.version && ` · ${source.document.version}`}</summary><p>{source.excerpt}</p></details>)}
            {index === messages.length - 1 && <nav className="assistant-next-actions" aria-label={tr('assistant.continueInLab')}>
              <span>{tr('assistant.continueInLab')}</span>
              {turn.response.nextTab && targetLabels[turn.response.nextTab] && (operator || turn.response.nextTab === 'smart_calendar') && <button type="button" onClick={() => navigate(turn.response!.nextTab!)}>{tr(targetLabels[turn.response.nextTab])}<ArrowUpRight size={14} aria-hidden="true" /></button>}
              {operator && !turn.response.nextTab && <button type="button" onClick={() => navigate('stock')}>{tr('assistant.openStock')}<ArrowUpRight size={14} aria-hidden="true" /></button>}
              <button type="button" onClick={() => navigate('resources')}>{tr('assistant.viewResources')}<ArrowUpRight size={14} aria-hidden="true" /></button>
              <button type="button" onClick={() => navigate('bookings')}>{tr('assistant.viewBookings')}<ArrowUpRight size={14} aria-hidden="true" /></button>
            </nav>}
          </div>
        </article>;
      })}</div>
      {error && <p className="alert danger" role="alert">{tr(error)}</p>}
      {humanMode && <CustomerSupportChat visible={isOpen} initialDraft={humanDraft} initialMessage={question.trim() || messages.at(-1)?.question || ''} conversationId={!conversationExpired ? conversationId.current : undefined} onReturn={() => { setHumanMode(false); setHumanDraft(undefined); requestAnimationFrame(() => questionInput.current?.focus({ preventScroll: true })); }} />}
    </div>
    <div className="assistant-bottom" hidden={humanMode}>
      <form className="assistant-compose" onSubmit={event => { event.preventDefault(); void send(question); }}>
        <label className="sr-only" htmlFor="assistant-question">{tr('assistant.question')}</label>
        <textarea ref={questionInput} id="assistant-question" placeholder={tr('assistant.composerPlaceholder')} maxLength={2000} minLength={2} required rows={2} value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={submitChatOnEnter} />
        {busy ? <button type="button" className="assistant-stop" onClick={cancel} aria-label={tr('assistant.cancel')} title={tr('assistant.cancel')}><Square size={16} aria-hidden="true" /></button> : <button type="submit" className="primary-button" disabled={conversationExpired || setupError || checkingConnection || mode === 'CHECKING' || question.trim().length < 2} aria-label={tr('assistant.send')}><Send size={18} aria-hidden="true" /></button>}
      </form>
      <div className="assistant-footer"><span>{tr('assistant.keyboardHelp')}</span><button type="button" disabled={busy && !usesBridge} onClick={() => void handoff()}><Headphones size={14} aria-hidden="true" />{tr(operator ? 'assistant.supportInbox' : 'assistant.contactStaff')}</button></div>
    </div>
  </section>, document.body);
}
