import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, Clock, GripVertical, UserRound } from 'lucide-react';
import { useLocale } from '../../../providers/LocaleProvider';
import { useQueuePage } from '../../../hooks/useQueuePage';
import { canOpenBookingAction } from '../../../utils/bookingActions';
import { formatVietnamDateTime } from '../../../utils/timezone';
import type { BookingAction, BookingRecord } from '../../../types/booking';
import type { BookingQueueSummary } from '../../../types/queue';
import { BookingStatusBadge } from '../../BookingStatusBadge';
import { QueuePagination } from '../../base/QueuePagination';

const columns = [
  { filter: 'PENDING_PAYMENT', title: 'ui.paymentHold.pending', next: '', action: '', target: '' },
  { filter: 'PENDING_APPROVAL', title: 'ui.pending_approval_6af96613', next: 'APPROVE', action: 'ui.approve_e94fc148', target: 'CONFIRMED' },
  { filter: 'CONFIRMED', title: 'ui.awaiting_handover_de28611f', next: 'CHECK_OUT', action: 'ui.hand_over_resource_2b919047', target: 'CHECKED_OUT' },
  { filter: 'CHECKED_OUT', title: 'ui.in_use_a07a3647', next: 'RETURN', action: 'ui.receive_returned_resource_0c4b837a', target: 'RETURNED' },
  { filter: 'RETURNED', title: 'ui.awaiting_inspection_cee3e686', next: 'COMPLETE', action: 'ui.fulfillment.inspectionComplete', target: 'HISTORY' },
  { filter: 'HISTORY', title: 'ui.history_0a235708', next: '', action: '', target: '' },
] as const;
type Column = typeof columns[number];
type Props = { user: { id: string; role: string }; busyId: string; selectedId: string | null; onSelect: (booking: BookingRecord) => void; onMove: (booking: BookingRecord, action: BookingAction) => void };

/** Columns are independently paged server queues. Dropping opens the existing
 * confirmation; cards move only after the API commits and queues refresh. */
export function BookingKanbanBoard(props: Props) {
  const { tr } = useLocale();
  const [dragged, setDragged] = useState<BookingRecord | null>(null);
  const board = useRef<HTMLDivElement>(null), positioned = useRef(false);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const onLoaded = useCallback((filter: string, total: number) => setTotals(previous => previous[filter] === total ? previous : { ...previous, [filter]: total }), []);
  useEffect(() => {
    if (positioned.current || Object.keys(totals).length !== columns.length || !board.current) return;
    positioned.current = true;
    if (!window.matchMedia('(max-width: 760px)').matches) return;
    const first = columns.find(column => totals[column.filter] > 0);
    const lane = first && board.current.querySelector<HTMLElement>(`[data-kanban-status="${first.filter}"]`);
    if (lane) board.current.scrollLeft = lane.offsetLeft;
  }, [totals]);
  function scroll(direction: number) {
    const element = board.current;
    if (element) element.scrollBy({ left: direction * element.clientWidth * .85, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  return <div className="booking-board">
    <div className="kanban-navigation"><button type="button" aria-label={tr('ui.kanban.previous')} aria-controls="booking-status-board" onClick={() => scroll(-1)}><ChevronLeft size={18} aria-hidden="true"/></button><button type="button" aria-label={tr('ui.kanban.next')} aria-controls="booking-status-board" onClick={() => scroll(1)}><ChevronRight size={18} aria-hidden="true"/></button></div>
    <div ref={board} id="booking-status-board" className="booking-kanban" data-testid="booking-kanban" role="region" aria-label={tr('ui.kanban.board')} tabIndex={0}>
      {columns.map(column => <KanbanColumn key={column.filter} {...props} column={column} dragged={dragged} onDrag={setDragged} onLoaded={onLoaded}/>)}
    </div>
  </div>;
}

function KanbanColumn({ column, dragged, onDrag, onLoaded, ...props }: Props & { column: Column; dragged: BookingRecord | null; onDrag: (booking: BookingRecord | null) => void; onLoaded: (filter: string, total: number) => void }) {
  const { tr } = useLocale();
  const queue = useQueuePage<BookingRecord, BookingQueueSummary>('/bookings', column.filter, `${props.user.id}:${props.user.role}`, 20);
  useEffect(() => { if (!queue.loading && queue.pagination) onLoaded(column.filter, queue.pagination.total); }, [queue.loading, queue.pagination, onLoaded, column.filter]);
  const origin = dragged && columns.find(item => item.filter === dragged.status);
  const dropAction = origin?.target === column.filter ? origin.next : '';
  const canDrop = !!dragged && !!dropAction && !props.busyId && canOpenBookingAction(dragged, dropAction, props.user);
  if (['PENDING_PAYMENT', 'PENDING_APPROVAL'].includes(column.filter) && !queue.loading && !queue.error && queue.pagination?.total === 0) return null;
  return <section className={`kanban-column${canDrop ? ' is-drop-target' : ''}`} data-kanban-status={column.filter}
    onDragOver={event => { if (canDrop) event.preventDefault(); }}
    onDrop={event => { event.preventDefault(); if (canDrop && dragged && canOpenBookingAction(dragged, dropAction, props.user)) props.onMove(dragged, dropAction); onDrag(null); }}>
    <header><span className="kanban-column-dot"/><h2>{tr(column.title)}</h2><span className="kanban-column-count">{queue.pagination?.total ?? '—'}</span></header>
    <div className="kanban-cards" aria-busy={queue.loading}>
      {queue.loading ? <p role="status">{tr('ui.loading_data_84c68bd5')}</p> : queue.error ? <div className="alert danger" role="alert">{tr(queue.error)}<button type="button" className="btn" onClick={queue.refresh}>{tr('ui.retry_c58d068c')}</button></div> : queue.items.length === 0 ? <p className="kanban-empty">{tr('ui.kanban.empty')}</p> : queue.items.map(booking => {
        const canMove = !!column.next && !props.busyId && canOpenBookingAction(booking, column.next, props.user);
        return <article key={booking.id} className={`kanban-card${props.selectedId === booking.id ? ' is-selected' : ''}`} data-booking-id={booking.id}
          draggable={canMove} onDragStart={event => { event.dataTransfer.setData('text/plain', booking.id); event.dataTransfer.effectAllowed = 'move'; onDrag(booking); }} onDragEnd={() => onDrag(null)}>
          <div className="kanban-card-top"><BookingStatusBadge status={booking.status} paymentDueAt={booking.paymentDueAt}/>{canMove && <GripVertical size={16} aria-hidden="true"/>}</div>
          <button className="kanban-card-open" type="button" onClick={() => props.onSelect(booking)} disabled={props.busyId === booking.id}>
            <span>{booking.resource?.name || booking.title}</span><ArrowUpRight size={16} aria-hidden="true"/>
          </button>
          <p className="kanban-card-time"><Clock size={13} aria-hidden="true"/>{formatVietnamDateTime(booking.startAt)}</p>
          <footer><span className="kanban-person" title={booking.requestedBy?.fullName}><UserRound size={13} aria-hidden="true"/>{booking.requestedBy?.fullName}</span>
          {canMove && <button type="button" className="kanban-next" onClick={() => props.onMove(booking, column.next as BookingAction)} aria-label={`${tr(column.action)}: ${booking.resource?.name || booking.title}`} title={tr(column.action)}><Check size={16} aria-hidden="true"/><span>{tr(column.action)}</span></button>}</footer>
        </article>;
      })}
    </div>
    {queue.pagination && queue.pagination.totalPages > 1 && <QueuePagination pagination={queue.pagination} onPage={queue.setPage} disabled={queue.loading || !!props.busyId}/>}
  </section>;
}
