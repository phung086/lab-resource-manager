import React, { useEffect, useState } from "react";
import { Wrench, X } from "lucide-react";
import { apiRequest } from "../../../api.js";
import { useLocale } from "../../../providers/LocaleProvider";
import { workspacePathForTab } from "../../../workspaceRoutes.js";
import "../../../styles/resource-care.css";

type Notice = { id: string; titleKey: string; messageParams: { resourceId: string; resourceName: string; progress: number } };
export function MaintenanceNoticeToast({ role }: { role: string }) {
  const { tr } = useLocale();
  const [notices, setNotices] = useState<Notice[]>([]), [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => {
    if (!["ADMIN", "LAB_STAFF"].includes(role)) return;
    let controller: AbortController | null = null, alive = true;
    const load = async () => {
      if (controller || document.hidden) return;
      controller = new AbortController();
      try { const rows: Notice[] = await apiRequest("/notifications?unreadOnly=true&take=100", { signal: controller.signal }); if (alive) setNotices(rows.filter(row => ["care.near.title", "care.due.title"].includes(row.titleKey))); }
      catch { /* The standard inbox exposes fetch failures; never synthesize alerts. */ }
      finally { controller = null; }
    };
    void load(); const timer = setInterval(() => void load(), 30000);
    return () => { alive = false; clearInterval(timer); controller?.abort(); };
  }, [role]);
  const visible = notices.filter(row => !dismissed.includes(row.id)).slice(0, 3);
  if (!visible.length) return null;
  async function dismiss(id: string) { setDismissed(rows => [...rows, id]); try { await apiRequest(`/notifications/${id}/read`, { method: "POST" }); } catch { /* Keep the persisted unread notice for the next session. */ } }
  return <aside className="care-toast-stack" aria-live="polite" aria-label={tr("ui.rental.maintenanceAlerts")}>{visible.map(row => <div className="care-toast" key={row.id}>
    <Wrench size={20}/><div><strong>{tr(`notification.${row.titleKey}`)}</strong><p>{row.messageParams.resourceName}</p><a href={workspacePathForTab("maintenance", { resource: row.messageParams.resourceId })}>{tr("ui.rental.scheduleService")}</a></div>
    <button type="button" onClick={() => void dismiss(row.id)} aria-label={tr("ui.close_5d54c2a1")}><X size={16}/></button>
  </div>)}</aside>;
}
