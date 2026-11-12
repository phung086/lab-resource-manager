import { useEffect, useState } from 'react';
import { ArrowRight, CalendarClock, X } from 'lucide-react';
import { apiRequest } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
import { formatVietnamDateTime } from '../../../utils/timezone';

type Reminder = {
  id: string;
  startAt: string;
  endAt: string;
  expired: boolean;
  resource: { name: string; category: string | null };
};

const reminderKey = (row: Reminder) => `${row.id}:${row.startAt}:${row.expired}`;

export function HandoverReminder({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useLocale();
  const [rows, setRows] = useState<Reminder[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    let request: AbortController | null = null;
    const refresh = async () => {
      if (document.hidden || request) return;
      const controller = new AbortController();
      request = controller;
      try {
        const reminders: Reminder[] = await apiRequest('/bookings/handover-reminders', { signal: controller.signal });
        if (!controller.signal.aborted) setRows(Array.isArray(reminders) ? reminders : []);
      } catch {
        if (!controller.signal.aborted) setRows([]);
      } finally { request = null; }
    };
    void refresh();
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      request?.abort();
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const visible = rows.filter(row => !dismissed.includes(reminderKey(row)));
  const row = visible[0];
  if (!row) return null;

  const dismiss = () => setDismissed(current => [...current, reminderKey(row)]);
  const title = row.expired ? 'ui.handoverReminder.expired' : row.resource.category === 'ROOM' ? 'ui.handoverReminder.room' : 'ui.handoverReminder.resource';
  return <aside className="handover-reminder" aria-label={t(title)} data-expired={row.expired}>
    <span className="workspace-popover-icon" aria-hidden="true"><CalendarClock size={19} /></span>
    <div className="handover-reminder-copy">
      <div role="status">
        <strong>{t(title)}</strong>
        <p>{row.resource.name}</p>
        <span>{t(row.expired ? 'ui.handoverReminder.ended' : 'ui.handoverReminder.started', { time: formatVietnamDateTime(row.expired ? row.endAt : row.startAt) })}</span>
      </div>
      <button type="button" className="handover-reminder-open" onClick={() => { dismiss(); onOpen(row.id); }}>
        {t('ui.home.customer.viewDetails')}<ArrowRight size={15} aria-hidden="true" />
      </button>
    </div>
    <button type="button" className="handover-reminder-close" onClick={dismiss} aria-label={t('ui.close_5d54c2a1')}><X size={17} aria-hidden="true" /></button>
  </aside>;
}
