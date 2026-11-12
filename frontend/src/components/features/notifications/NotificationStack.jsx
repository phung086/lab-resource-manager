import { useState } from 'react';
import { Bell, CalendarCheck, ChevronLeft, ChevronRight, Check, ArrowUpRight, CreditCard } from 'lucide-react';
import { useLocale } from '../../../providers/LocaleProvider';
import { formatVietnamDateTime } from '../../../utils/timezone';
import '../../../styles/notifications-workspace.css';

/** A user-controlled preview of loaded unread records, never a floating toast. */
export function NotificationStack({ items, disabled = false, onOpen, onRead = undefined, compact = false }) {
  const { tr } = useLocale();
  const [previewId, setPreviewId] = useState('');
  const index = Math.max(0, items.findIndex(item => item.id === previewId));
  const current = items[index];
  if (!current) return null;
  const payment = current.titleKey?.startsWith('payment.');
  const calendar = current.type?.startsWith('BOOKING') || current.type === 'RETURN_REMINDER';
  const Icon = payment ? CreditCard : calendar ? CalendarCheck : Bell;
  return <section className={`inbox-stack${compact ? ' is-compact' : ''}`} aria-labelledby="inbox-stack-title" data-depth={Math.min(items.length, 3)}>
    <div className="inbox-stack-heading"><span className="inbox-stack-symbol"><Bell size={21} aria-hidden="true" /></span><div><h2 id="inbox-stack-title">{tr('ui.inbox.stackTitle')}</h2><p>{tr('ui.inbox.stackCount', { value0: items.length })}</p></div></div>
    <div className="inbox-stack-deck">
      <article className="inbox-stack-card" data-tone={payment ? 'teal' : calendar ? 'violet' : 'blue'}>
        <div className="inbox-stack-card-top"><span className="inbox-stack-icon"><Icon size={20} aria-hidden="true" /></span><time dateTime={current.sentAt || current.createdAt}>{formatVietnamDateTime(current.sentAt || current.createdAt)}</time></div>
        <div aria-live="polite" aria-atomic="true"><div className="inbox-stack-copy" key={current.id}><h3>{current.title}</h3><p>{current.message}</p></div></div>
        <div className="inbox-stack-actions"><button type="button" className="btn btn-secondary inbox-stack-open" disabled={disabled} onClick={() => onOpen(current.id)}>{tr('ui.inbox.stackOpen')}<ArrowUpRight size={16} aria-hidden="true" /></button>{onRead && <button type="button" className="inbox-stack-read" disabled={disabled} onClick={() => onRead(current.id)} title={tr('ui.mark_read_2e5a0c72')} aria-label={tr('ui.mark_read_2e5a0c72')}><Check size={18} aria-hidden="true" /></button>}</div>
      </article>
      <div className="inbox-stack-controls"><button type="button" disabled={disabled || items.length < 2} aria-label={tr('ui.inbox.stackPrevious')} onClick={() => setPreviewId(items[(index - 1 + items.length) % items.length].id)}><ChevronLeft size={17} aria-hidden="true" /></button><span role="status" aria-live="polite">{tr('ui.inbox.stackPosition', { value0: index + 1, value1: items.length })}</span><div className="inbox-stack-dots" aria-hidden="true">{items.slice(0, 5).map((item, itemIndex) => <span key={item.id} data-active={itemIndex === (index < 5 ? index : 4)} />)}</div><button type="button" disabled={disabled || items.length < 2} aria-label={tr('ui.inbox.stackNext')} onClick={() => setPreviewId(items[(index + 1) % items.length].id)}><ChevronRight size={17} aria-hidden="true" /></button></div>
    </div>
  </section>;
}
