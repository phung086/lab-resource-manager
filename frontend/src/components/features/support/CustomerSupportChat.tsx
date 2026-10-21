import { useEffect, useRef, useState } from 'react';
import { submitChatOnEnter } from '../../../utils/chatKeyboard';
import { Send, Headphones } from 'lucide-react';
import { useLocale } from '../../../providers/LocaleProvider';
import { supportApi, type SupportDetail, type SupportMetadata, type SupportSession } from '../../../services/support';
import { reviewBridgeProposal, type BridgeSupportDraft } from '../../../services/chatgptBridgeProposals';

const categories = ['BOOKING', 'PAYMENT', 'ACCOUNT', 'RESOURCE', 'OTHER'];
const open = (session?: SupportSession) => !!session && ['WAITING', 'ACTIVE'].includes(session.status);
const errorKey = (cause: unknown) => cause instanceof Error ? cause.message : 'api.API_REQUEST_FAILED';

// Uses the existing authenticated support workflow. No model may submit this form.
export default function CustomerSupportChat({ visible, initialDraft, initialMessage, conversationId, onReturn }: {
  visible: boolean; initialDraft?: BridgeSupportDraft; initialMessage: string; conversationId?: string; onReturn: () => void;
}) {
  const { tr, locale } = useLocale();
  const [metadata, setMetadata] = useState<SupportMetadata | null>(null);
  const [detail, setDetail] = useState<SupportDetail | null>(null);
  const [selected, setSelected] = useState('');
  const [laboratoryId, setLaboratoryId] = useState(initialDraft?.laboratoryId || '');
  const [category, setCategory] = useState<string>(initialDraft?.category || 'OTHER');
  const [message, setMessage] = useState(initialDraft?.message || initialMessage);
  const [draft, setDraft] = useState(''), [reason, setReason] = useState('');
  const [shareContext, setShareContext] = useState(false);
  const [loading, setLoading] = useState(true), [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [connectionError, setConnectionError] = useState('');
  const [revision, setRevision] = useState(0);
  const mounted = useRef(false), writing = useRef(false), cursor = useRef(0);
  const requestAttempt = useRef<{ signature: string; id: string } | null>(null);
  const sendAttempt = useRef<{ signature: string; id: string } | null>(null);
  const bottom = useRef<HTMLDivElement>(null), nearBottom = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController(); setLoading(true); setReady(false);
    Promise.all([
      supportApi.metadata(controller.signal),
      supportApi.list(new URLSearchParams({ page: '1', pageSize: '1' }), controller.signal)
    ]).then(([options, sessions]) => {
      if (controller.signal.aborted) return;
      setMetadata(options); setReady(true); setConnectionError('');
      if (sessions.activeSession) setSelected(sessions.activeSession.id);
    }).catch(cause => { if (!controller.signal.aborted) setConnectionError(errorKey(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [visible, revision]);
  useEffect(() => {
    if (!selected || !visible) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const next = await supportApi.detail(selected, cursor.current, controller.signal);
        if (controller.signal.aborted) return;
        cursor.current = next.nextCursor;
        setDetail(current => {
          const rows = new Map((current?.session.id === selected ? current.messages : []).map(row => [row.id, row]));
          next.messages.forEach(row => rows.set(row.id, row));
          return { ...next, messages: [...rows.values()].sort((a, b) => a.sequence - b.sequence) };
        });
        setConnectionError('');
        if (next.hasMore || open(next.session)) timer = setTimeout(() => void refresh(), next.hasMore ? 0 : 2000);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setConnectionError(errorKey(cause));
          timer = setTimeout(() => void refresh(), 2000);
        }
      }
    }
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [selected, visible]);
  useEffect(() => {
    const transcript = bottom.current?.parentElement;
    if (visible && nearBottom.current && transcript) transcript.scrollTop = transcript.scrollHeight;
  }, [detail?.messages.length, visible]);
  async function mutate(work: () => Promise<void>) {
    if (writing.current) return;
    writing.current = true; setBusy(true); setError('');
    try { await work(); }
    catch (cause) {
      if (mounted.current) {
        setError(errorKey(cause));
        const existing = (cause as { details?: { sessionId?: string } }).details?.sessionId;
        if (existing) { cursor.current = 0; setDetail(null); setSelected(existing); }
      }
    } finally { writing.current = false; if (mounted.current) setBusy(false); }
  }
  async function request() {
    if (!ready) return;
    if (initialDraft) reviewBridgeProposal(initialDraft);
    const body = { laboratoryId, category, message: message.trim(), ...(shareContext && conversationId ? { conversationId } : {}) };
    const signature = JSON.stringify(body);
    if (requestAttempt.current?.signature !== signature) requestAttempt.current = { signature, id: crypto.randomUUID() };
    const session = await supportApi.request({ ...body, requestId: requestAttempt.current.id });
    if (!mounted.current) return;
    requestAttempt.current = null; cursor.current = 0; setDetail(null); setSelected(session.id);
  }
  async function send() {
    const body = draft.trim(), signature = JSON.stringify([selected, body]);
    if (sendAttempt.current?.signature !== signature) sendAttempt.current = { signature, id: crypto.randomUUID() };
    await supportApi.send(selected, sendAttempt.current.id, body);
    if (!mounted.current) return;
    sendAttempt.current = null; setDraft(current => current.trim() === body ? '' : current); nearBottom.current = true;
  }
  async function cancel() {
    const session = await supportApi.transition(selected, 'cancel', reason.trim());
    if (mounted.current) setDetail(current => current ? { ...current, session } : current);
  }
  const session = detail?.session;
  const status = session?.status === 'WAITING' ? tr('support.position', { position: session.queuePosition }) : session ? tr(`support.status.${session.status}`) : tr('support.handoff');
  const time = (value: string) => new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
  return <section className="assistant-human" aria-label={tr('support.handoff')}>
    <header className="assistant-human-status"><Headphones size={18} aria-hidden="true" /><strong role="status">{status}</strong>
      {session?.assignedStaff && <span>{session.assignedStaff.fullName} · {tr(session.staffConnected ? 'support.connected' : 'support.disconnected')}</span>}
    </header>
    {loading && <p role="status">{tr('support.loading')}</p>}
    {connectionError && <div role="alert"><p>{tr(connectionError)}</p><button type="button" disabled={busy} onClick={() => setRevision(value => value + 1)}>{tr('support.refresh')}</button></div>}
    {error && <p role="alert">{tr(error)}</p>}
    {!selected && !loading && <form className="assistant-human-request" onSubmit={event => { event.preventDefault(); void mutate(request); }}>
      <label>{tr('support.lab')}<select required value={laboratoryId} onChange={event => setLaboratoryId(event.target.value)}><option value="">{tr('support.chooseLab')}</option>{metadata?.laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.code} · {lab.name}</option>)}</select></label>
      <label>{tr('support.category')}<select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(value => <option key={value} value={value}>{tr(`support.category.${value}`)}</option>)}</select></label>
      <label>{tr('support.describe')}<textarea onKeyDown={submitChatOnEnter} required minLength={3} maxLength={2000} rows={3} value={message} onChange={event => setMessage(event.target.value)} /></label>
      {conversationId && <label className="assistant-human-share"><input type="checkbox" checked={shareContext} onChange={event => setShareContext(event.target.checked)} />{tr('support.inlineShareContext')}</label>}
      <button type="submit" className="primary-button" disabled={busy || !ready || !laboratoryId || message.trim().length < 3}>{tr('support.request')}</button>
    </form>}
    {session && <>
      {session.status === 'WAITING' && <p role="status">{tr('support.waitingHelp', { position: session.queuePosition })}</p>}
      <div className="assistant-human-transcript" role="log" aria-live="polite" aria-relevant="additions" onScroll={event => { const el = event.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
        {detail?.messages.map(row => <article key={row.id} className={row.kind === 'CUSTOMER' ? 'assistant-question' : 'assistant-human-message'}>
          {row.kind === 'SYSTEM' ? <p>{tr(`support.event.${row.eventType}`, { name: row.sender?.fullName || '' })}{row.body && ` · ${row.body}`}</p> : <><strong>{row.kind === 'ASSISTANT' ? tr('support.assistant') : row.sender?.fullName}</strong><p>{row.body}</p></>}
          <time dateTime={row.createdAt}>{time(row.createdAt)}</time>
        </article>)}
        <div ref={bottom} />
      </div>
      {open(session) && <>
        <form className="assistant-compose" onSubmit={event => { event.preventDefault(); void mutate(send); }}>
          <label className="sr-only" htmlFor="assistant-human-message">{tr('support.message')}</label>
          <textarea id="assistant-human-message" rows={2} required maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={submitChatOnEnter} />
          <button type="submit" className="primary-button" disabled={busy || !draft.trim()} aria-label={tr('support.send')}><Send size={18} aria-hidden="true" /></button>
        </form>
        <details><summary>{tr('support.cancel')}</summary><form className="assistant-human-request" onSubmit={event => { event.preventDefault(); void mutate(cancel); }}><label>{tr('support.cancelReason')}<input required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label><button type="submit" disabled={busy || reason.trim().length < 3}>{tr('support.cancel')}</button></form></details>
      </>}
    </>}
    {!loading && (!selected || (session && !open(session))) && <button type="button" className="secondary-button" disabled={busy} onClick={onReturn}>{tr('support.returnAssistant')}</button>}
  </section>;
}
