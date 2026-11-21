import { useState } from 'react';
import { ArrowRight, BellRing, TriangleAlert, X } from 'lucide-react';
import { localizeNotification } from '../../../i18n.js';
import { useLocale } from '../../../providers/LocaleProvider';
import { operatorNotificationDestination } from '../../../utils/notificationDestination.js';

export type OperatorNotice = {
  id: string;
  title: string;
  titleKey: string;
  sentAt: string;
  severity: string;
  messageParams?: { locationName?: string; incidentId?: string; sessionId?: string };
};

const noticeVersion = (notice: OperatorNotice) => `${notice.id}:${notice.sentAt}`;

export function OperatorUrgentNotice({ notices, role, onNavigate }: {
  notices: OperatorNotice[];
  role: string;
  onNavigate: (tab: string, params?: Record<string, string>) => void;
}) {
  const { tr } = useLocale();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const notice = notices.find(item => !dismissed.includes(noticeVersion(item)));
  if (!notice) return null;
  const destination = operatorNotificationDestination(notice, role);
  if (!destination) return null;
  const { title } = localizeNotification(notice);
  const urgent = notice.severity === 'danger';
  const Icon = urgent ? TriangleAlert : BellRing;
  const dismiss = () => setDismissed(items => [...items.slice(-99), noticeVersion(notice)]);

  return <aside className="operator-urgent-notice" data-danger={urgent} aria-label={tr('notification.urgent.label')}>
    <Icon size={18} aria-hidden="true" />
    <div className="operator-urgent-message" role={urgent ? 'alert' : 'status'}>
      <strong>{title}</strong>
      {notice.messageParams?.locationName && <span>{notice.messageParams.locationName}</span>}
    </div>
    <button type="button" onClick={() => { dismiss(); onNavigate(destination.tab, destination.params); }}>
      {tr(destination.labelKey)} <ArrowRight size={15} aria-hidden="true" />
    </button>
    <button type="button" aria-label={tr('notification.urgent.dismiss')} onClick={() => {
      dismiss();
      document.querySelector<HTMLButtonElement>('.header-notification-btn-2026')?.focus({ preventScroll: true });
    }}><X size={17} aria-hidden="true" /></button>
  </aside>;
}
