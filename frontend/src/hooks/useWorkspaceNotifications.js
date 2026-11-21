import { useEffect, useReducer, useState } from 'react';
import { apiRequest } from '../api.js';

const emptyFeed = { items: [], unread: null, urgent: [], error: '', loading: true };
const refreshInterval = 5000;

export function useWorkspaceNotifications(scope, live) {
  const [snapshot, setSnapshot] = useState(null);
  const [revision, refresh] = useReducer(value => value + 1, 0);

  useEffect(() => {
    if (!scope) return;
    const controller = new AbortController();
    let timer, reading = false;

    async function read() {
      if (reading || controller.signal.aborted || (live && document.hidden)) return;
      reading = true;
      const options = { signal: controller.signal };
      try {
        const [rows, total] = await Promise.allSettled([
          apiRequest('/notifications', options),
          apiRequest(live ? '/notifications/unread-count?urgent=true' : '/notifications/unread-count', options)
        ]);
        if (controller.signal.aborted) return;
        const unread = total.status === 'fulfilled' ? total.value?.unread : null;
        const urgent = total.status === 'fulfilled' && Array.isArray(total.value?.urgent) ? total.value.urgent : [];
        setSnapshot(current => ({
          scope,
          items: rows.status === 'fulfilled' ? rows.value : current?.scope === scope ? current.items : [],
          unread: Number.isSafeInteger(unread) && unread >= 0 ? unread : null,
          urgent,
          error: rows.status === 'rejected' ? (rows.reason?.message || 'ui.could_not_load_notifications_ba2db1e3') : '',
          loading: false
        }));
      } finally {
        reading = false;
        if (live && !document.hidden && !controller.signal.aborted) timer = window.setTimeout(() => void read(), refreshInterval);
      }
    }

    function onVisibility() {
      window.clearTimeout(timer);
      if (!document.hidden) void read();
    }

    void read();
    if (live) document.addEventListener('visibilitychange', onVisibility);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [scope, live, revision]);

  return { ...(scope && snapshot?.scope === scope ? snapshot : emptyFeed), refresh };
}
