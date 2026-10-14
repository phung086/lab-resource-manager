import { useLocale } from '../../../providers/LocaleProvider';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send } from 'lucide-react';
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
type Answer = { answer: string; summary: Segment[]; locale: string; provider: string; modelStatus: string; source: string; toolsUsed: string[]; actions: Action[]; toolResults: { tool: string; result: Record<string, unknown> }[]; proposals?: BridgeProposal[]; conversation?: { id: string; expiresAt: string; retainedTurns?: number } };
type Props = { isOpen: boolean; onClose: () => void; onPrefill: (slot: Slot) => void; onNavigate: (tab: string) => void; workspaceTab?: string; actorRole?: string };

export default function LaboratoryAssistant({ isOpen, onClose, onPrefill, onNavigate, workspaceTab, actorRole }: Props) {
  const { locale, tr, changeLocale } = useLocale();
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose;
  const panel = useRef<HTMLElement>(null), content = useRef<HTMLDivElement>(null), contextFields = useRef<HTMLDetailsElement>(null);
  const questionInput = useRef<HTMLTextAreaElement>(null), resourceInput = useRef<HTMLSelectElement>(null), latestTurn = useRef<HTMLElement>(null);
  const mounted = useRef(false), inFlight = useRef<AbortController | null>(null), previousLocale = useRef(locale);
  const conversationId = useRef<string | undefined>(undefined);
  const bridgeConversationId = useRef<string | undefined>(undefined);
  const bridgeWork = useRef<Promise<BridgeRequest> | null>(null);
  const [conversationExpired, setConversationExpired] = useState(false);
  const [messages, setMessages] = useState<{ question: string; response: Answer }[]>([]), [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [setupError, setSetupError] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]), [mode, setMode] = useState('CHECKING'), [connectionAttempt, setConnectionAttempt] = useState(0);
  const [resources, setResources] = useState<Resource[]>([]), [resourceId, setResourceId] = useState('');
  const [duration, setDuration] = useState(''), [startAt, setStartAt] = useState(''), [endAt, setEndAt] = useState('');
  const [bridge, setBridge] = useState<{ enabled: boolean; connected: boolean; mode: string } | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState('');
  const [humanMode, setHumanMode] = useState(false), [humanDraft, setHumanDraft] = useState<BridgeSupportDraft | undefined>();
  useEffect(() => { if (humanMode && isOpen && content.current) content.current.scrollTop = content.current.scrollHeight; }, [humanMode, isOpen]);
  const usesBridge = actorRole === 'CUSTOMER' && bridge?.enabled && bridge.mode === 'chatgpt_bridge';
  const bridgeUnavailable = Boolean(usesBridge && !bridge?.connected);
  useEffect(() => {
    if (!isOpen || actorRole !== 'CUSTOMER') return;
    const controller = new AbortController();
    supportApi.list(new URLSearchParams({ page: '1', pageSize: '1' }), controller.signal).then(result => {
      if (!controller.signal.aborted && result.activeSession && !inFlight.current) setHumanMode(true);
    }).catch(() => { /* The support form shows its own connection error when opened. */ });
    return () => controller.abort();
  }, [isOpen, actorRole]);

  useEffect(() => {
    if (!isOpen || !content.current || !latestTurn.current) return;
    // Scroll the conversation only; opening a result must not move the workspace.
    content.current.scrollTop += latestTurn.current.getBoundingClientRect().top - content.current.getBoundingClientRect().top - 12;
  }, [messages, isOpen]);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    setMode('CHECKING'); setSetupError(false);
    Promise.allSettled([
      apiRequest('/assistant/suggestions', { signal: controller.signal }),
      apiRequest('/resources', { signal: controller.signal })
    ]).then(([settings, rows]) => {
      if (controller.signal.aborted) return;
      if (settings.status === 'fulfilled') { setSuggestions(settings.value.suggestionKeys || []); setMode(settings.value.mode); setBridge(settings.value.bridge || null); }
      else setMode('UNAVAILABLE');
      if (rows.status === 'fulfilled') setResources(Array.isArray(rows.value) ? rows.value : rows.value.resources || []);
      setSetupError(settings.status === 'rejected' || rows.status === 'rejected');
    });
    return () => { mounted.current = false; controller.abort(); inFlight.current?.abort(); };
  }, [connectionAttempt]);
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
  async function send(text: string) {
    if (inFlight.current || conversationExpired || text.trim().length < 2) return;
    if (bridgeUnavailable) { setError('bridge.unavailable'); return; }
    if (duration !== '' && (!Number.isInteger(Number(duration)) || Number(duration) < 15 || Number(duration) > 480)) { setError('assistant.invalidDuration'); return; }
    if (Boolean(startAt) !== Boolean(endAt)) { setError('assistant.completeWindow'); return; }
    let startIso: string | undefined, endIso: string | undefined;
    try {
      const parse = (value: string) => { const [date, time] = value.split('T'); return vietnamTimeToIso(date, time); };
      startIso = startAt ? parse(startAt) : undefined; endIso = endAt ? parse(endAt) : undefined;
      if (startIso && endIso && startIso >= endIso) throw new Error();
    } catch { setError('api.INVALID_BOOKING_TIME'); return; }
    const controller = new AbortController(); inFlight.current = controller;
    const timer = usesBridge ? undefined : window.setTimeout(() => { setError('assistant.timeout'); controller.abort(); }, 65000);
    setBusy(true); setError(''); setPendingQuestion(usesBridge ? text : '');
    try {
      const currentConversation = usesBridge ? bridgeConversationId.current : conversationId.current;
      const body = { message: text, locale, ...(currentConversation ? { conversationId: currentConversation } : {}), ...(workspaceTab ? { workspace: workspaceTab } : {}), ...(resourceId ? { resourceId } : {}), ...(duration !== '' ? { durationMinutes: Number(duration) } : {}), ...(startIso ? { startAt: startIso } : {}), ...(endIso ? { endAt: endIso } : {}) };
      let response: Answer;
      if (usesBridge) {
        const work = askChatgptBridge(body, { signal: controller.signal }); bridgeWork.current = work;
        const result = await work;
        response = { answer: result.answer!, locale: result.locale || locale, provider: 'chatgpt', source: 'chatgpt_bridge', modelStatus: 'ANSWERED', summary: [], toolsUsed: [], toolResults: [], actions: [], conversation: result.conversation, proposals: result.proposals };
      } else response = await apiRequest('/assistant/chat', { method: 'POST', signal: controller.signal, body: JSON.stringify(body) });
      if (!mounted.current || controller.signal.aborted) return;
      if (usesBridge) bridgeConversationId.current = response.conversation?.id;
      else conversationId.current = response.conversation?.id;
      setMessages(previous => [...previous.slice(-9), { question: text, response }]);
      setQuestion(current => current.trim() === text.trim() ? '' : current);
    } catch (failure) { if (mounted.current && (!controller.signal.aborted || (failure as { code?: string }).code === 'bridge.cancelFailed')) { setError((failure as Error).message); if ((failure as { code?: string }).code === 'ASSISTANT_CONVERSATION_EXPIRED') setConversationExpired(true); } }
    finally { if (timer) window.clearTimeout(timer); if (inFlight.current === controller) { inFlight.current = null; bridgeWork.current = null; if (mounted.current) { setBusy(false); setPendingQuestion(''); } } }
  }
  const label = (key: string) => tr(hasMessage(key) ? key : 'core.empty.value');
  const time = (value: string) => new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
  function labelText(segment: Segment) {
    return segment.text ?? tr(segment.key && hasMessage(segment.key) ? segment.key : 'api.DATA_UNAVAILABLE', { ...segment.params,
      ...Object.fromEntries(Object.entries(segment.labels || {}).map(([key, id]) => [key, label(id)])),
      ...Object.fromEntries(Object.entries(segment.times || {}).map(([key, value]) => [key, time(value)])) });
  }
  function navigate(tab: 'bookings' | 'resources') { dismiss(false); onNavigate(tab); }
  function review(proposal: BridgeProposal) {
    try {
      const draft = reviewBridgeProposal(proposal);
      if (draft.kind === 'BOOKING') { dismiss(false); onPrefill(draft); }
      else { setHumanDraft(draft); setHumanMode(true); setError(''); }
    } catch (failure) { setError((failure as Error).message); }
  }
  if (!isOpen && !humanMode) return null;

  return createPortal(<section id="lab-assistant-panel" hidden={!isOpen} className={`lab-assistant${messages.length ? ' has-conversation' : ''}`} ref={panel} role="dialog" aria-modal="false" aria-labelledby="lab-assistant-title"
    onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); dismiss(); } }}>
    <header>
      <div><h2 id="lab-assistant-title">{tr(humanMode ? 'support.handoff' : 'assistant.title')}</h2>{!humanMode && <p>{tr('assistant.subtitle')}</p>}</div>
      <div className="assistant-language" role="group" aria-label={tr('assistant.changeLanguage')}>
        {['vi', 'en'].map(value => <button type="button" key={value} aria-pressed={locale === value} onClick={() => void changeLocale(value)}>{value.toUpperCase()}</button>)}
      </div>
      <button type="button" className="assistant-minimize" onClick={() => dismiss()} aria-label={tr('assistant.minimize')}><X size={19} aria-hidden="true" /></button>
    </header>
    <div className="lab-assistant-content" ref={content}>
      {!humanMode && !messages.length && <div className="assistant-welcome"><h3>{tr('assistant.welcome')}</h3><p>{tr('assistant.welcomeHelp')}</p></div>}
      <details hidden={humanMode} ref={contextFields} className="assistant-context-disclosure"><summary>{tr('assistant.context')}{resourceId && <span>{resources.find(resource => resource.id === resourceId)?.code}</span>}</summary>
        <div className="assistant-context">
          <label>{tr('assistant.resource')}<select ref={resourceInput} value={resourceId} onChange={event => setResourceId(event.target.value)}><option value="">{tr('assistant.inferResource')}</option>{resources.map(resource => <option value={resource.id} key={resource.id}>{resource.code} · {resource.name}</option>)}</select></label>
          <label>{tr('assistant.duration')}<input type="number" min={15} max={480} step={1} value={duration}  aria-describedby="assistant-duration-help" onChange={event => setDuration(event.target.value)} /><small id="assistant-duration-help">{tr('assistant.durationHelp')}</small></label>
          <label>{tr('assistant.start')}<input type="datetime-local" value={startAt} onChange={event => setStartAt(event.target.value)} /></label>
          <label>{tr('assistant.end')}<input type="datetime-local" value={endAt} onChange={event => setEndAt(event.target.value)} /></label>
        </div>
      </details>
      {setupError && <div role="alert" className="assistant-setup-error"><p>{tr('assistant.unavailable')}</p><button type="button" className="secondary-button" disabled={busy} onClick={() => setConnectionAttempt(value => value + 1)}>{tr('assistant.retryConnection')}</button></div>}
      {bridgeUnavailable && <div role="status" className="assistant-setup-error"><p>{tr('bridge.unavailable')}</p><button type="button" className="secondary-button" disabled={busy} onClick={() => setConnectionAttempt(value => value + 1)}>{tr('assistant.retryConnection')}</button></div>}
      {!humanMode && !messages.length && <div className="assistant-suggestions" aria-label={tr('assistant.getStarted')}>
        {suggestions.slice(0, 3).map(key => <button type="button" key={key} disabled={busy || conversationExpired || bridgeUnavailable} onClick={() => void send(label(key))}>{label(key)}</button>)}
      </div>}
      <div className="assistant-conversation" aria-live="polite" aria-relevant="additions">{messages.map((turn, index) => {
        const slots = turn.response.toolResults?.flatMap(result => Array.isArray(result.result.slots) ? result.result.slots as Slot[] : []) || [];
        const foundResources = turn.response.toolResults?.filter(result => ['search_resources', 'recommend_equipment'].includes(result.tool)).flatMap(result => Array.isArray(result.result.resources) ? result.result.resources as Resource[] : []) || [];
        const segments = (turn.response.summary || []).filter(segment => !(slots.length && segment.key === 'assistant.slotLine') && !(foundResources.length && segment.key === 'assistant.resourceLine'));
        return <article key={index} className="assistant-turn" ref={index === messages.length - 1 ? latestTurn : undefined}>
          <p className="assistant-question">{turn.question}</p>
          <div className="assistant-answer">
            {['openai', 'chatgpt'].includes(turn.response.provider) && <><p>{turn.response.answer}</p>{turn.response.locale !== locale && <small>{tr('assistant.previousLanguage', { locale: turn.response.locale.toUpperCase() })}</small>}</>}
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
            <details className="assistant-evidence"><summary>{tr(turn.response.source === 'authenticated_mcp' ? 'assistant.sourceDetails' : 'assistant.responseInfo')}</summary>
              <small>{tr(turn.response.source === 'chatgpt_bridge' ? 'bridge.answerSource' : turn.response.source === 'model_conversation' ? 'assistant.fromConversation' : turn.response.source === 'model_guidance' ? 'assistant.fromModelGuidance' : turn.response.source === 'local_guidance' ? 'assistant.fromGuidance' : turn.response.provider === 'local' ? 'assistant.fromTools' : 'assistant.fromModel')}</small>
              {turn.response.provider === 'openai' && <p>{segments.map(labelText).join('\n')}</p>}
              {turn.response.modelStatus === 'MODEL_UNAVAILABLE' && <p>{tr('assistant.modelUnavailable')}</p>}
              {turn.response.modelStatus === 'CIRCUIT_OPEN' && <p>{tr('assistant.circuitOpen')}</p>}
              {turn.response.modelStatus === 'INPUT_TOO_LARGE' && <p>{tr('assistant.inputLarge')}</p>}
              <ul>{turn.response.toolsUsed.map(tool => <li key={tool}>{label(`assistant.tool.${tool}`)}</li>)}</ul>
              {turn.response.toolResults?.filter(result => result.tool === 'search_knowledge_base').flatMap(result => Array.isArray(result.result.sources) ? result.result.sources as Source[] : []).map(source => <article key={source.chunkId}><strong>{source.document.title}</strong>{source.document.version && <small>{tr('assistant.documentVersion', { version: source.document.version })}</small>}{source.document.fileName && <small>{source.document.fileName}</small>}<p>{source.excerpt}</p></article>)}
            </details>
          </div>
        </article>;
      })}</div>
      {pendingQuestion && <p className="assistant-question">{pendingQuestion}</p>}
      {busy && <p role="status" className="assistant-busy">{tr(bridgeWork.current ? 'bridge.waiting' : 'assistant.lookupBusy')}</p>}
      {error && <p className="alert danger" role="alert">{tr(error)}</p>}
      {humanMode && <CustomerSupportChat visible={isOpen} initialDraft={humanDraft} initialMessage={question.trim() || messages.at(-1)?.question || ''} conversationId={!conversationExpired ? conversationId.current : undefined} onReturn={() => { setHumanMode(false); setHumanDraft(undefined); requestAnimationFrame(() => questionInput.current?.focus({ preventScroll: true })); }} />}
    </div>
    <div className="assistant-bottom" hidden={humanMode}>
      <button type="button" className="secondary-button" disabled={busy && !usesBridge} onClick={() => void handoff()}>{tr('support.handoff')}</button>
      <form className="assistant-compose" onSubmit={event => { event.preventDefault(); void send(question); }}>
        <label className="sr-only" htmlFor="assistant-question">{tr('assistant.question')}</label>
        <textarea ref={questionInput} id="assistant-question" maxLength={2000} minLength={2} required rows={2} value={question} onChange={event => setQuestion(event.target.value)}  />
        {busy ? <button type="button" className="secondary-button" onClick={cancel}>{tr('assistant.cancel')}</button> : <button type="submit" className="primary-button" disabled={conversationExpired || bridgeUnavailable || setupError || mode === 'CHECKING' || question.trim().length < 2} aria-label={tr('assistant.send')}><Send size={18} aria-hidden="true" /></button>}
      </form>
      <p className="assistant-boundary">{tr('assistant.boundary')}</p>
      <div className="assistant-session-controls"><details className="assistant-about"><summary>{tr('assistant.about')}</summary><p>{usesBridge ? tr(bridgeUnavailable ? 'bridge.unavailable' : 'bridge.connectedMode') : label(`assistant.mode.${mode}`)}</p><p>{tr('assistant.historyHelp')}</p></details>
        <button type="button" disabled={(busy && !usesBridge) || (!messages.length && !conversationExpired && !busy)} onClick={() => void newConversation()}>{tr('assistant.newConversation')}</button>
      </div>
    </div>
  </section>, document.body);
}
