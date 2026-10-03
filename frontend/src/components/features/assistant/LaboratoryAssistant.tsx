import { useLocale } from '../../../providers/LocaleProvider';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Bot } from 'lucide-react';
import { apiRequest } from '../../../api.js';
import { hasMessage } from '../../../i18n.js';
import { formatVietnamDateTime, vietnamTimeToIso } from '../../../utils/timezone';
import './assistant.css';
type Slot = { resourceId: string; startAt: string; endAt: string };
type Segment = { text?: string; key?: string; params?: Record<string, unknown>; labels?: Record<string, string>; times?: Record<string, string> };
type Resource = { id: string; name: string; code: string; category?: string; location?: string; operationalStatus?: string };
type Source = { chunkId: string; excerpt: string; document: { title: string; version?: string; fileName?: string } };
type Answer = { answer: string; summary: Segment[]; locale: string; provider: string; modelStatus: string; source: string; toolsUsed: string[]; actions: { type: string; labelKey: string; payload: Slot }[]; toolResults: { tool: string; result: Record<string, unknown> }[] };
export default function LaboratoryAssistant({ onClose, onPrefill }: { onClose: () => void; onPrefill: (slot: Slot) => void }) {
  const { locale, tr, changeLocale } = useLocale();
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose;
  const panel = useRef<HTMLElement>(null), close = useRef<HTMLButtonElement>(null), latestTurn = useRef<HTMLElement>(null);
  const mounted = useRef(false), inFlight = useRef<AbortController | null>(null), previousLocale = useRef(locale);
  const [messages, setMessages] = useState<{ question: string; response: Answer }[]>([]), [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [suggestions, setSuggestions] = useState<string[]>([]), [mode, setMode] = useState('CHECKING');
  const [resources, setResources] = useState<Resource[]>([]), [resourceId, setResourceId] = useState('');
  const [duration, setDuration] = useState(''), [startAt, setStartAt] = useState(''), [endAt, setEndAt] = useState('');
  useEffect(() => { latestTurn.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); }, [messages]);
  useEffect(() => {
    mounted.current = true; const controller = new AbortController();
    Promise.all([apiRequest('/assistant/suggestions', { signal: controller.signal }), apiRequest('/resources', { signal: controller.signal })]).then(([data, rows]) => {
      if (controller.signal.aborted) return;
      setSuggestions(data.suggestionKeys || []); setMode(data.mode); setResources(Array.isArray(rows) ? rows : rows.resources || []);
    }).catch(() => { if (!controller.signal.aborted) { setError('assistant.unavailable'); setMode('UNAVAILABLE'); } });
    return () => { mounted.current = false; controller.abort(); inFlight.current?.abort(); };
  }, []);
  useEffect(() => {
    if (locale !== previousLocale.current) { previousLocale.current = locale; if (inFlight.current) { inFlight.current.abort(); setError('assistant.languageChanged'); } }
  }, [locale]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement, overflow = document.body.style.overflow;
    close.current?.focus(); document.body.style.overflow = 'hidden';
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onCloseRef.current(); return; }
      if (event.key !== 'Tab') return;
      const nodes = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[href]') || []).filter(node => node.getClientRects().length > 0);
      const first = nodes[0], last = nodes[nodes.length - 1]; if (!first) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', key); previous?.focus(); };
  }, []);
  function cancel() { inFlight.current?.abort(); setError('assistant.cancelled'); }
  async function send(text: string) {
    if (inFlight.current || text.trim().length < 2) return;
    if (duration !== '' && (!Number.isInteger(Number(duration)) || Number(duration) < 15 || Number(duration) > 480)) { setError('assistant.invalidDuration'); return; }
    let startIso: string | undefined, endIso: string | undefined;
    try {
      const parse = (value: string) => { const [date, time] = value.split('T'); return vietnamTimeToIso(date, time); };
      startIso = startAt ? parse(startAt) : undefined; endIso = endAt ? parse(endAt) : undefined;
      if (startIso && endIso && startIso >= endIso) throw new Error();
    } catch { setError('api.INVALID_BOOKING_TIME'); return; }
    const controller = new AbortController(); inFlight.current = controller;
    const timer = window.setTimeout(() => { setError('assistant.timeout'); controller.abort(); }, 65000);
    setBusy(true); setError('');
    try {
      const response = await apiRequest('/assistant/chat', { method: 'POST', signal: controller.signal, body: JSON.stringify({ message: text, locale, ...(resourceId ? { resourceId } : {}), ...(duration !== '' ? { durationMinutes: Number(duration) } : {}), ...(startIso ? { startAt: startIso } : {}), ...(endIso ? { endAt: endIso } : {}) }) });
      if (!mounted.current || controller.signal.aborted) return;
      setMessages(previous => [...previous.slice(-9), { question: text, response }]); setQuestion(current => current.trim() === text.trim() ? '' : current);
    } catch (failure) { if (mounted.current && !controller.signal.aborted) setError((failure as Error).message); }
    finally { window.clearTimeout(timer); if (inFlight.current === controller) { inFlight.current = null; if (mounted.current) setBusy(false); } }
  }
  const label = (key: string) => tr(hasMessage(key) ? key : 'core.empty.value');
  const time = (value: string) => new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
  const summary = (segments: Segment[]) => segments.map(segment => segment.text ?? labelText(segment));
  function labelText(segment: Segment) { return tr(segment.key && hasMessage(segment.key) ? segment.key : 'api.DATA_UNAVAILABLE', { ...segment.params, ...Object.fromEntries(Object.entries(segment.labels || {}).map(([key, id]) => [key, label(id)])), ...Object.fromEntries(Object.entries(segment.times || {}).map(([key, value]) => [key, time(value)])) }); }
  return createPortal(<div className="lab-assistant-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="lab-assistant" ref={panel} role="dialog" aria-modal="true" aria-labelledby="lab-assistant-title">
      <header><div><h2 id="lab-assistant-title"><Bot size={20} /> {tr('assistant.title')}</h2><p>{tr('assistant.subtitle')}</p></div><div className="assistant-language" role="group" aria-label={tr("assistant.changeLanguage")}>{["vi", "en"].map(value => <button type="button" key={value} className="secondary-button" aria-pressed={locale === value} onClick={() => void changeLocale(value)}>{value.toUpperCase()}</button>)}</div><button ref={close} className="secondary-button" onClick={onClose} aria-label={tr('assistant.close')}><X size={20} /></button></header>
      <div className="lab-assistant-content"><p className="assistant-boundary">{tr('assistant.boundary')}</p><p className="assistant-verified">{label(`assistant.mode.${mode}`)}</p>
        <details><summary>{tr('assistant.context')}</summary><div className="assistant-context">
          <label>{tr('assistant.resource')}<select value={resourceId} onChange={event => setResourceId(event.target.value)}><option value="">{tr('assistant.inferResource')}</option>{resources.map(resource => <option value={resource.id} key={resource.id}>{resource.code} · {resource.name}</option>)}</select></label>
          <label>{tr('assistant.duration')}<input type="number" min={15} max={480} step={1} value={duration} placeholder={tr('assistant.durationAuto')} aria-describedby="assistant-duration-help" onChange={event => setDuration(event.target.value)} /><small id="assistant-duration-help">{tr('assistant.durationHelp')}</small></label>
          <label>{tr('assistant.start')}<input type="datetime-local" value={startAt} onChange={event => setStartAt(event.target.value)} /></label><label>{tr('assistant.end')}<input type="datetime-local" value={endAt} onChange={event => setEndAt(event.target.value)} /></label>
        </div></details>
        {!messages.length && <div className="assistant-suggestions"><h3>{tr('assistant.getStarted')}</h3>{suggestions.map(key => <button className="secondary-button" key={key} disabled={busy} onClick={() => void send(label(key))}>{label(key)}</button>)}</div>}
        <div aria-live="polite" aria-relevant="additions">{messages.map((turn, index) => <article key={index} className="assistant-turn" ref={index === messages.length - 1 ? latestTurn : undefined}>
          <p className="assistant-question">{turn.question}</p><div className="assistant-answer">
            {turn.response.provider === 'openai' && <><h3>{tr('assistant.modelSummary')}</h3><p>{turn.response.answer}</p>{turn.response.locale !== locale && <small>{tr('assistant.previousLanguage', { locale: turn.response.locale.toUpperCase() })}</small>}</>}
            <h3>{tr(turn.response.source === 'local_guidance' ? 'assistant.guidanceSummary' : 'assistant.summary')}</h3><p>{summary(turn.response.summary || []).join('\n')}</p><small>{tr(turn.response.source === 'local_guidance' ? 'assistant.fromGuidance' : turn.response.provider === 'local' ? 'assistant.fromTools' : 'assistant.fromModel')}</small>
            {turn.response.modelStatus === 'MODEL_UNAVAILABLE' && <p>{tr('assistant.modelUnavailable')}</p>}{turn.response.modelStatus === 'CIRCUIT_OPEN' && <p>{tr('assistant.circuitOpen')}</p>}{turn.response.modelStatus === 'INPUT_TOO_LARGE' && <p>{tr('assistant.inputLarge')}</p>}
            {turn.response.toolResults?.filter(result => ['search_resources', 'recommend_equipment'].includes(result.tool)).flatMap(result => Array.isArray(result.result.resources) ? result.result.resources as Resource[] : []).map(resource => <article className="assistant-resource-result" key={resource.id}><strong>{resource.name}</strong><small>{resource.code} · {label(`enum.category.${resource.category}`)}</small><dl><div><dt>{tr('assistant.location')}</dt><dd>{resource.location || tr('core.empty.value')}</dd></div><div><dt>{tr('assistant.operationalStatus')}</dt><dd>{label(`enum.operational.${resource.operationalStatus}`)}</dd></div></dl><p>{tr('assistant.resourceBoundary')}</p></article>)}
            <details><summary>{tr('assistant.sourceDetails')}</summary><div className="assistant-tools">{turn.response.toolsUsed.map(tool => <span key={tool}>{label(`assistant.tool.${tool}`)}</span>)}</div></details>
            {turn.response.toolResults?.some(result => Array.isArray(result.result.sources) && result.result.sources.length) && <details><summary>{tr('assistant.originalDocuments')}</summary>{turn.response.toolResults.filter(result => result.tool === 'search_knowledge_base').flatMap(result => Array.isArray(result.result.sources) ? result.result.sources as Source[] : []).map(source => <article className="assistant-resource-result" key={source.chunkId}><strong>{source.document.title}</strong>{source.document.version && <small>{tr('assistant.documentVersion', { version: source.document.version })}</small>}{source.document.fileName && <small>{source.document.fileName}</small>}<p>{source.excerpt}</p></article>)}</details>}
            {turn.response.actions?.filter(action => action.type === 'PREFILL_BOOKING').map(action => <div className="assistant-slot-result" key={`${action.payload.resourceId}-${action.payload.startAt}`}><strong>{resources.find(resource => resource.id === action.payload.resourceId)?.name || tr('assistant.resource')}</strong><p>{formatVietnamDateTime(action.payload.startAt)} → {formatVietnamDateTime(action.payload.endAt)}</p><small>{tr('assistant.vietnamTime')}</small><button className="secondary-button" onClick={() => { onClose(); onPrefill(action.payload); }}>{tr('assistant.openBooking')}</button></div>)}
          </div></article>)}</div>
        {busy && <p role="status">{tr('assistant.lookupBusy')}</p>}{error && <p className="alert danger" role="alert">{tr(error)}</p>}
      </div>
      <form className="assistant-compose" onSubmit={event => { event.preventDefault(); void send(question); }}><label className="sr-only" htmlFor="assistant-question">{tr('assistant.question')}</label><textarea id="assistant-question" maxLength={2000} minLength={2} required rows={2} value={question} onChange={event => setQuestion(event.target.value)} placeholder={tr('assistant.placeholder')} />{busy ? <button type="button" className="secondary-button" onClick={cancel}>{tr('assistant.cancel')}</button> : <button className="primary-button" disabled={question.trim().length < 2} aria-label={tr('assistant.send')}><Send size={18} /></button>}</form>
    </section>
  </div>, document.body);
}
