import React, { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { apiRequest } from "../../../api.js";
import { localizeNotification } from '../../../i18n.js';
import { useLocale } from "../../../providers/LocaleProvider";
import { workspacePathForTab } from "../../../workspaceRoutes.js";
import "../../../styles/resource-care.css";

type Notice = { id: string; title: string; message: string; sentAt?: string; titleKey?: string; messageKey?: string; messageParams: { resourceId?: string; resourceName?: string; progress?: number; bookingId?: string; sessionId?: string; paymentId?: string; [key: string]: unknown } };
export function MaintenanceNoticeToast({ role, actorId }: { role: string; actorId?: string }) {
  const { tr } = useLocale();
  const [notices, setNotices] = useState<Notice[]>([]), [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => {
    setNotices([]); setDismissed([]);
    if (!["ADMIN", "LAB_STAFF", "CUSTOMER"].includes(role) || !actorId) return;
    let controller: AbortController | null = null, alive = true;
    const load = async () => {
      if (controller || document.hidden) return;
      controller = new AbortController();
      try { const rows: Notice[] = await apiRequest("/notifications?unreadOnly=true&take=100", { signal: controller.signal }); if (alive) setNotices(rows.filter(row => Boolean(row.sentAt && Date.parse(row.sentAt) >= Date.now() - 600000) && ['care.near.title', 'care.due.title', 'booking.upcoming.title', 'booking.return_reminder.title', 'support.requested.title', 'support.assigned.title', 'payment.success.title'].includes(row.titleKey || ''))); }
      catch { /* The standard inbox exposes fetch failures; never synthesize alerts. */ }
      finally { controller = null; }
    };
    void load(); const timer = setInterval(() => void load(), 5000);
    return () => { alive = false; clearInterval(timer); controller?.abort(); };
  }, [role, actorId]);
  const visible = notices.filter(row => !dismissed.includes(row.id)).slice(0, 3);
  const visibleIds = visible.map(row => row.id).join('|');
  useEffect(() => {
    if (!visibleIds) return;
    const timer = setTimeout(() => setDismissed(rows => [...new Set([...rows, ...visibleIds.split('|')])]), 10000);
    return () => clearTimeout(timer);
  }, [visibleIds]);
  if (!visible.length) return null;
  async function dismiss(id: string) { setDismissed(rows => [...rows, id]); try { await apiRequest(`/notifications/${id}/read`, { method: "POST" }); } catch { /* Keep the persisted unread notice for the next session. */ } }
  return <aside className="care-toast-stack" aria-live="polite" aria-label={tr("ui.notifications_0c951eef")}>{visible.map(row => { const localized = localizeNotification(row); return <div className="care-toast" key={row.id}>
    <Bell size={20}/><div><strong>{localized.title}</strong><p>{row.titleKey?.startsWith('care.') ? row.messageParams.resourceName : localized.message}</p><a href={row.messageParams.sessionId ? workspacePathForTab('support', row.titleKey === 'support.assigned.title' || role === 'ADMIN' ? { session: row.messageParams.sessionId } : {}) : row.messageParams.paymentId ? workspacePathForTab('payments', { booking: row.messageParams.bookingId || '' }) : row.messageParams.bookingId ? workspacePathForTab('bookings', { booking: row.messageParams.bookingId }) : workspacePathForTab('maintenance', { resource: row.messageParams.resourceId || '' })}>{tr(row.titleKey?.startsWith('care.') ? 'ui.rental.scheduleService' : 'ui.home.customer.viewDetails')}</a></div>
    <button type="button" onClick={() => void dismiss(row.id)} aria-label={tr("ui.close_5d54c2a1")}><X size={16}/></button>
  </div>; })}</aside>;
}
