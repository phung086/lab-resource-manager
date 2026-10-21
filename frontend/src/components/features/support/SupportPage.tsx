import { useEffect, useRef, useState } from 'react';
import { submitChatOnEnter } from '../../../utils/chatKeyboard';
import { MessageCircle, Send, RefreshCw, CheckCircle, Circle, Headphones } from 'lucide-react';
import { useLocale } from '../../../providers/LocaleProvider';
import { navigateApp, workspacePathForTab } from '../../../workspaceRoutes.js';
import { supportApi, type SupportDetail, type SupportList, type SupportMetadata, type SupportSession } from '../../../services/support';
import { reviewBridgeProposal, type BridgeSupportDraft } from '../../../services/chatgptBridgeProposals';
import { RobotMascot } from '../assistant/RobotMascot';
import { AI_ASSISTANT_ENABLED } from '../../../config/featureFlags';
import './support.css';

type User = { id: string; role: string; fullName: string };
const statuses = ['WAITING', 'ACTIVE', 'CLOSED', 'CANCELLED'];
const categories = ['BOOKING', 'PAYMENT', 'ACCOUNT', 'RESOURCE', 'OTHER'];
const errorKey = (error: unknown) => error instanceof Error ? error.message : 'api.API_REQUEST_FAILED';

export default function SupportPage({ user, conversationId, sessionId, initialDraft, onDraftApplied }: { user: User; conversationId?: string; sessionId?: string; initialDraft?: BridgeSupportDraft; onDraftApplied?: () => void }) {
  const { tr, locale } = useLocale();
  const staff = user.role === 'LAB_STAFF', admin = user.role === 'ADMIN', customer = !staff && !admin;
  const [metadata, setMetadata] = useState<SupportMetadata | null>(null);
  const [list, setList] = useState<SupportList | null>(null), [detail, setDetail] = useState<SupportDetail | null>(null);
  const [selected, setSelected] = useState(sessionId || ''), selectedRef = useRef(selected); selectedRef.current = selected;
  const [page, setPage] = useState(1), [status, setStatus] = useState(''), [labFilter, setLabFilter] = useState('');
  const [laboratoryId, setLaboratoryId] = useState(''), [category, setCategory] = useState('OTHER'), [requestMessage, setRequestMessage] = useState('');
  const [shareContext, setShareContext] = useState(Boolean(conversationId)), [contextCount, setContextCount] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({}), [reason, setReason] = useState('');
  const [accepting, setAccepting] = useState(false), [busy, setBusy] = useState(false), busyRef = useRef(false);
  const [error, setError] = useState(''), [connectionErrors, setConnectionErrors] = useState<Record<string, string>>({}), [revision, setRevision] = useState(0);
  const connectionError = Object.values(connectionErrors).find(Boolean);
  const setConnectionError = (area: string, value: string) => setConnectionErrors(current => ({ ...current, [area]: value }));
  const [loading, setLoading] = useState(true);
  const [customerTab, setCustomerTab] = useState<'request' | 'history'>(sessionId ? 'history' : 'request');
  const chatPanel = useRef<HTMLElement>(null), focusChat = useRef(Boolean(sessionId));
  const cursorRef = useRef(0), mounted = useRef(true), transcript = useRef<HTMLDivElement>(null);
  const requestAttempt = useRef<{ signature: string; id: string } | null>(null), sendAttempt = useRef<{ signature: string; id: string } | null>(null);
  const nearBottom = useRef(true);
  const presenceEpoch = useRef(0), changingPresence = useRef(false);
  const time = (value: string) => new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
  const draft = drafts[selected] || '';
  const setDraft = (value: string) => setDrafts(current => ({ ...current, [selected]: value }));
  function choose(id: string) { focusChat.current = Boolean(id); setSelected(id); if (id) setCustomerTab('history'); navigateApp(workspacePathForTab('support', id ? { session: id } : {})); }

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setSelected(sessionId || ''); }, [sessionId]);
  useEffect(() => { if (customer && selected) setCustomerTab('history'); }, [customer, selected]);
  useEffect(() => {
    const controller = new AbortController();
    supportApi.metadata(controller.signal).then(result => {
      if (controller.signal.aborted) return; setMetadata(result); setAccepting(Boolean(result.presence?.accepting));
      setLaboratoryId(current => current || result.laboratories[0]?.id || '');
    }).catch(cause => { if (!controller.signal.aborted) setError(errorKey(cause)); });
    return () => controller.abort();
  }, [user.id]);
  useEffect(() => {
    setShareContext(Boolean(conversationId)); setContextCount(0);
    if (!conversationId || !customer) return;
    const controller = new AbortController();
    supportApi.context(conversationId, controller.signal).then(result => {
      if (controller.signal.aborted) return; setRequestMessage(current => current || result.message); setContextCount(result.messageCount);
    }).catch(cause => { if (!controller.signal.aborted) { setShareContext(false); setError(errorKey(cause)); } });
    return () => controller.abort();
  }, [conversationId, customer]);
  useEffect(() => {
    if (!staff || !metadata) return;
    let stopped = false, timer: ReturnType<typeof setTimeout>;
    async function beat() {
      const epoch = presenceEpoch.current, mayUpdate = !changingPresence.current;
      try { const result = await supportApi.presence(); if (!stopped) { if (mayUpdate && epoch === presenceEpoch.current) setAccepting(result.accepting); setConnectionError('presence', ''); } } catch (cause) { if (!stopped) setConnectionError('presence', errorKey(cause)); }
      if (!stopped) timer = setTimeout(() => void beat(), 15_000);
    }
    void beat();
    return () => { stopped = true; clearTimeout(timer); };
  }, [staff, metadata]);
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    setLoading(true);
    async function refresh() {
      try {
        const result = await supportApi.list(new URLSearchParams({ page: String(page), pageSize: '20', ...(status ? { status } : {}), ...(labFilter ? { laboratoryId: labFilter } : {}) }), controller.signal);
        if (controller.signal.aborted) return; setList(result); setConnectionError('list', '');
        if (page > 1 && page > result.pagination.totalPages) { setPage(Math.max(1, result.pagination.totalPages)); return; }
        if (!selectedRef.current) {
          const active = result.activeSession;
          if (active) setSelected(active.id);
        }
      } catch (cause) { if (!controller.signal.aborted) setConnectionError('list', errorKey(cause)); }
      finally { if (!controller.signal.aborted) { setLoading(false); timer = setTimeout(() => void refresh(), 2000); } }
    }
    void refresh(); return () => { controller.abort(); clearTimeout(timer); };
  }, [user.id, staff, customer, page, status, labFilter, revision]);
  useEffect(() => {
    setDetail(null); cursorRef.current = 0; setReason(''); nearBottom.current = true; setConnectionError('detail', '');
    if (!selected) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const result = await supportApi.detail(selected, cursorRef.current, controller.signal);
        if (controller.signal.aborted) return;
        cursorRef.current = result.nextCursor; setConnectionError('detail', '');
        setDetail(current => {
          const rows = new Map((current?.messages || []).map(row => [row.id, row])); result.messages.forEach(row => rows.set(row.id, row));
          return { ...result, messages: [...rows.values()].sort((a, b) => a.sequence - b.sequence) };
        });
      } catch (cause) {
        if (!controller.signal.aborted) {
          setConnectionError('detail', errorKey(cause));
          if (staff && (cause as { status?: number }).status === 404) { setDetail(null); setSelected(''); navigateApp(workspacePathForTab('support')); }
        }
      }
      finally { if (!controller.signal.aborted) timer = setTimeout(() => void refresh(), 2000); }
    }
    void refresh(); return () => { controller.abort(); clearTimeout(timer); };
  }, [selected, staff]);
  useEffect(() => { if (nearBottom.current && transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight; }, [detail?.messages.length]);

  async function mutate(work: () => Promise<void>) {
    if (busyRef.current) return; busyRef.current = true; setBusy(true); setError('');
    try { await work(); if (mounted.current) setRevision(value => value + 1); }
    catch (cause) { if (mounted.current) { setError(errorKey(cause)); const session = (cause as { details?: { sessionId?: string } }).details?.sessionId; if (session) choose(session); } }
    finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  }
  const openRequest = Boolean(list?.summary.WAITING || list?.summary.ACTIVE);
  const appliedDraft = useRef('');
  useEffect(() => {
    if (!initialDraft || !metadata || !list || appliedDraft.current === initialDraft.id) return;
    appliedDraft.current = initialDraft.id;
    try {
      reviewBridgeProposal(initialDraft);
      if (!customer || openRequest || requestMessage.trim()) throw new Error('bridge.supportDraftConflict');
      if (!metadata.laboratories.some(lab => lab.id === initialDraft.laboratoryId)) throw new Error('bridge.unavailable');
      setLaboratoryId(initialDraft.laboratoryId); setCategory(initialDraft.category); setRequestMessage(initialDraft.message); setShareContext(false);
    } catch (cause) { setError(errorKey(cause)); }
    onDraftApplied?.();
  }, [initialDraft, metadata, list, customer, openRequest, requestMessage, onDraftApplied]);
  const current = detail?.session;
  useEffect(() => {
    if (!current || !focusChat.current || current.id !== selected) return;
    focusChat.current = false;
    if (window.matchMedia('(max-width:720px)').matches) { chatPanel.current?.scrollIntoView({ block:'start' }); chatPanel.current?.focus({ preventScroll:true }); }
  }, [current, selected]);
  const canSend = current && ['WAITING', 'ACTIVE'].includes(current.status) && (customer || (staff && current.assignedStaffId === user.id && current.status === 'ACTIVE'));
  async function request() {
    const data = { laboratoryId, category, message: requestMessage.trim(), ...(shareContext && conversationId ? { conversationId } : {}) };
    const signature = JSON.stringify(data);
    if (requestAttempt.current?.signature !== signature) requestAttempt.current = { signature, id: crypto.randomUUID() };
    const result = await supportApi.request({ ...data, requestId: requestAttempt.current.id });
    if (!mounted.current) return; requestAttempt.current = null; setRequestMessage(''); choose(result.id);
  }
  async function send() {
    const body = draft.trim(), signature = JSON.stringify([selected, body]);
    if (sendAttempt.current?.signature !== signature) sendAttempt.current = { signature, id: crypto.randomUUID() };
    await supportApi.send(selected, sendAttempt.current.id, body);
    if (!mounted.current) return; sendAttempt.current = null; setDrafts(current => ({ ...current, [selected]: current[selected]?.trim() === body ? '' : current[selected] })); nearBottom.current = true;
  }
  async function transition(action: 'finish' | 'cancel' | 'requeue') {
    await supportApi.transition(selected, action, reason.trim());
    if (!mounted.current) return; setReason(''); if (action === 'finish') choose('');
  }
  async function availability() {
    presenceEpoch.current += 1; changingPresence.current = true;
    try { const result = await supportApi.presence(!accepting); if (mounted.current) setAccepting(result.accepting); }
    finally { changingPresence.current = false; }
  }
  const labelSession = (row: SupportSession) => row.status === 'WAITING' ? tr('support.position', { position: row.queuePosition }) : tr(`support.status.${row.status}`);
  return <section className="support-page" data-role={user.role} aria-labelledby="support-heading">
    <header className="page-section-header"><div><h1 id="support-heading">{tr('support.title')}</h1><p>{tr(admin ? 'support.adminHelp' : staff ? 'support.staffHelp' : 'support.customerHelp')}</p></div><button type="button" className="secondary-button" onClick={() => setRevision(value => value + 1)}><RefreshCw size={16} />{tr('support.refresh')}</button></header>
    {error && <p className="alert danger" role="alert">{tr(error)}</p>}
    <p className={`support-connection${connectionError ? ' is-error' : ''}`} role="status">{connectionError ? tr(connectionError) : tr('support.liveHelp')}</p>
    {staff && <div className="support-availability"><Headphones size={20} /><div><strong>{tr(accepting ? 'support.accepting' : 'support.paused')}</strong><p>{tr('support.availabilityHelp')}</p></div><button type="button" className="primary-button" disabled={busy || !metadata?.laboratories.length} onClick={() => void mutate(availability)}>{tr(accepting ? 'support.pause' : 'support.goReady')}</button></div>}
    <div className="support-layout">
      <div className="support-sidebar">
        {customer && <nav className="support-sidebar-tabs" aria-label={tr('support.redesign.sections')}>
          <button type="button" aria-pressed={customerTab === 'request'} disabled={openRequest} onClick={() => setCustomerTab('request')}>{tr('support.redesign.newRequest')}</button>
          <button type="button" aria-pressed={customerTab === 'history'} onClick={() => setCustomerTab('history')}>{tr('support.redesign.mySessions')} <span>{list?.pagination.total ?? '—'}</span></button>
        </nav>}
    {customer && !openRequest && customerTab === 'request' && <form className="support-request" onSubmit={event => { event.preventDefault(); void mutate(request); }}>
      <h2>{tr('support.requestTitle')}</h2><div className="support-request-fields"><label>{tr('support.lab')}<select required value={laboratoryId} onChange={event => setLaboratoryId(event.target.value)}><option value="">{tr('support.chooseLab')}</option>{metadata?.laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.code} · {lab.name}</option>)}</select></label><label>{tr('support.category')}<select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(value => <option key={value} value={value}>{tr(`support.category.${value}`)}</option>)}</select></label></div>
      <label>{tr('support.describe')}<textarea onKeyDown={submitChatOnEnter} required minLength={3} maxLength={2000} rows={3} value={requestMessage} onChange={event => setRequestMessage(event.target.value)} /></label>
      {!!conversationId && !!contextCount && <label className="support-share"><input type="checkbox" checked={shareContext} onChange={event => setShareContext(event.target.checked)} />{tr('support.shareContext', { count: contextCount })}</label>}
      <button className="primary-button" type="submit" disabled={busy || loading || !laboratoryId || requestMessage.trim().length < 3}><MessageCircle size={17} />{tr('support.request')}</button>
    </form>}

      <aside hidden={customer && customerTab !== 'history'} className="support-queue" aria-label={tr('support.queue')}><div className="support-queue-heading"><h2>{tr(admin ? 'support.history' : customer ? 'support.redesign.mySessions' : 'support.queue')}</h2><span>{list?.pagination.total ?? '—'}</span></div>
        <div className="support-filters"><label>{tr('support.status')}<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">{tr('support.all')}</option>{statuses.map(value => <option key={value} value={value}>{tr(`support.status.${value}`)}</option>)}</select></label><label>{tr('support.lab')}<select value={labFilter} onChange={event => { setLabFilter(event.target.value); setPage(1); }}><option value="">{tr('support.all')}</option>{metadata?.laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.code}</option>)}</select></label></div>
        {loading && !list && <p role="status">{tr('support.loading')}</p>}
        {list?.items.map(row => <button type="button" className={`support-queue-row${selected === row.id ? ' is-selected' : ''}`} key={row.id} disabled={staff && row.assignedStaffId !== user.id} onClick={() => choose(row.id)}><span className="support-queue-row-top"><strong>{customer ? row.subject : row.requester.fullName}</strong><span>{labelSession(row)}</span></span><span>{customer ? tr(`support.category.${row.category}`) : row.subject}</span><small>{row.laboratory.code}{row.assignedStaff && ` · ${row.assignedStaff.fullName}`} · {time(row.createdAt)}</small></button>)}
        {!loading && list && !list.items.length && <p className="support-empty">{tr('support.emptyQueue')}</p>}
        {!!list && <nav className="support-pagination" aria-label={tr('support.pages')}><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>{tr('support.previous')}</button><span>{tr('support.page', { page, pages: Math.max(1, list.pagination.totalPages) })}</span><button type="button" disabled={page >= list.pagination.totalPages} onClick={() => setPage(value => value + 1)}>{tr('support.next')}</button></nav>}
      </aside>
      </div>
      <section ref={chatPanel} tabIndex={-1} className="support-chat" aria-label={tr('support.conversation')}>
        {!current || (customer && customerTab === 'request') ? <div className="support-chat-empty">{customer ? <RobotMascot /> : <MessageCircle size={35} />}<h2>{tr(customer && customerTab === 'request' ? 'support.redesign.startTitle' : 'support.selectSession')}</h2><p>{tr(customer && customerTab === 'request' && AI_ASSISTANT_ENABLED ? 'support.redesign.startHelp' : staff ? 'support.autoAssignHelp' : 'support.selectHelp')}</p>{customer && AI_ASSISTANT_ENABLED && <button type="button" className="primary-button" onClick={() => window.dispatchEvent(new CustomEvent('lrm:open-assistant'))}>{tr('support.redesign.askRobot')}</button>}</div> : <>
          <header className="support-chat-header"><div><h2>{current.subject}</h2><p>{current.laboratory.name} · {tr(`support.category.${current.category}`)}</p></div><span className={`support-state status-${current.status.toLowerCase()}`}>{labelSession(current)}</span></header>
          {current.status === 'WAITING' && <p className="support-waiting" role="status">{tr('support.waitingHelp', { position: current.queuePosition })}</p>}
          {current.status === 'ACTIVE' && <p className="support-assignee" role="status"><Circle size={10} fill={current.staffConnected ? 'currentColor' : 'none'} />{tr('support.assignedTo', { name: current.assignedStaff?.fullName || '' })} · {tr(current.staffConnected ? 'support.connected' : 'support.disconnected')}</p>}
          <div className="support-transcript" ref={transcript} role="log" aria-live="polite" aria-relevant="additions" onScroll={() => { if (transcript.current) nearBottom.current = transcript.current.scrollHeight - transcript.current.scrollTop - transcript.current.clientHeight < 80; }}>
            {detail?.messages.map(message => <article key={message.id} className={`support-message kind-${message.kind.toLowerCase()}${message.sender?.id === user.id ? ' is-own' : ''}`}>
              {message.kind === 'SYSTEM' ? <><p>{tr(`support.event.${message.eventType}`, { name: message.sender?.fullName || '' })}</p>{message.body && <p>{message.body}</p>}<time dateTime={message.createdAt}>{time(message.createdAt)}</time></> : <><div className="support-message-author"><strong>{message.kind === 'ASSISTANT' ? tr('support.assistant') : message.sender?.fullName}</strong><time dateTime={message.createdAt}>{time(message.createdAt)}</time></div><p>{message.body}</p>{message.source === 'AI_HANDOFF' && <small>{tr('support.priorContext')}</small>}</>}
            </article>)}
            {detail?.hasMore && <p role="status">{tr('support.moreMessages')}</p>}
          </div>
          {staff && canSend && <details className="support-quick-replies"><summary>{tr('support.quickReplies')}</summary><p>{tr('support.quickHelp')}</p><div>{metadata?.quickReplies.map(reply => <button type="button" key={reply.id} onClick={() => setDraft(draft ? `${draft}\n${tr(reply.bodyKey)}` : tr(reply.bodyKey))}>{tr(reply.titleKey)}</button>)}</div></details>}
          {canSend && <form className="support-compose" onSubmit={event => { event.preventDefault(); void mutate(send); }}><label className="sr-only" htmlFor="support-message">{tr('support.message')}</label><textarea id="support-message" rows={2} required maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={submitChatOnEnter} /><button type="submit" className="primary-button" disabled={busy || !draft.trim()}><Send size={17} />{tr('support.send')}</button></form>}
          {((admin && current.status === 'ACTIVE') || (staff && canSend) || (customer && ['WAITING', 'ACTIVE'].includes(current.status))) && <form className="support-close" onSubmit={event => { event.preventDefault(); void mutate(() => transition(admin ? 'requeue' : staff ? 'finish' : 'cancel')); }}>
            <label>{tr(admin ? 'support.requeueReason' : staff ? 'support.resolution' : 'support.cancelReason')}<input required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
            {(!admin || current.status === 'ACTIVE') && <button type="submit" className="secondary-button" disabled={busy || reason.trim().length < 3}><CheckCircle size={17} />{tr(admin ? 'support.requeue' : staff ? 'support.finish' : 'support.cancel')}</button>}
          </form>}
          {!!current.closedAt && <p className="support-closed">{tr('support.closedAt', { time: time(current.closedAt) })}</p>}
        </>}
      </section>
    </div>
  </section>;
}
