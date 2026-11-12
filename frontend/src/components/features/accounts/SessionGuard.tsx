import React, { useEffect, useState } from 'react';
import { apiRequest, clearSession, logout } from '../../../api.js';
import { getAccessToken } from '../../../services/authStorage.js';
import { useLocale } from '../../../providers/LocaleProvider';
import '../../../styles/session-security.css';

type Session = { idleExpiresAt: string; expiresAt: string; idleTimeoutSeconds: number };
export function SessionGuard() {
  const { tr } = useLocale();
  const [remaining, setRemaining] = useState<number | null>(null), [error, setError] = useState('');
  const [credential, setCredential] = useState(() => getAccessToken());
  useEffect(() => {
    const changed = () => setCredential(getAccessToken());
    window.addEventListener('lrm:session-changed', changed); window.addEventListener('lrm:session-invalid', changed);
    return () => { window.removeEventListener('lrm:session-changed', changed); window.removeEventListener('lrm:session-invalid', changed); };
  }, []);
  useEffect(() => {
    if (!credential) { setRemaining(null); setError(''); return; }
    const controller = new AbortController();
    let session: Session | null = null, busy = false, lastReadAt = 0, lastActivityAt = 0;
    const current = () => !controller.signal.aborted && credential === getAccessToken();
    const expire = () => { if (current()) { clearSession(); window.dispatchEvent(new CustomEvent('lrm:session-invalid')); } };
    const read = async (activity = false) => {
      if (busy || !current()) return;
      busy = true;
      lastReadAt = Date.now(); if (activity) lastActivityAt = lastReadAt;
      try {
        const value = await apiRequest(activity ? '/auth/activity' : '/auth/session', {
          ...(activity ? { method: 'POST', body: '{}' } : {}), signal: controller.signal, timeoutMs: 5000
        });
        if (!Number.isFinite(Date.parse(value?.idleExpiresAt)) || !Number.isFinite(Date.parse(value?.expiresAt))) throw new Error('api.DATA_UNAVAILABLE');
        if (current()) { session = value; setError(''); tick(); }
      } catch (cause: unknown) {
        if (current()) setError(cause instanceof Error ? cause.message : 'api.NETWORK_UNAVAILABLE');
      } finally { busy = false; }
    };
    function tick() {
      if (!session) return;
      const deadline = Math.min(Date.parse(session.idleExpiresAt), Date.parse(session.expiresAt));
      if (!Number.isFinite(deadline) || deadline <= Date.now()) { expire(); return; }
      setRemaining(Math.ceil((deadline - Date.now()) / 1000));
    }
    const activity = (event: Event) => {
      // Background fetches, polling, synthetic events and pointer movement do not keep a session alive.
      if (event.isTrusted && document.visibilityState === 'visible' && Date.now() - lastActivityAt >= 60000) void read(true);
    };
    const visible = () => { tick(); if (document.visibilityState === 'visible' && Date.now() - lastReadAt >= 5000) void read(); };
    const extend = () => void read(true);
    for (const name of ['pointerdown', 'keydown']) window.addEventListener(name, activity, { passive: true });
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('pageshow', visible);
    window.addEventListener('lrm:session-extend', extend);
    void read(); const timer = window.setInterval(tick, 1000);
    return () => {
      controller.abort(); clearInterval(timer);
      for (const name of ['pointerdown', 'keydown']) window.removeEventListener(name, activity);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('pageshow', visible);
      window.removeEventListener('lrm:session-extend', extend);
    };
  }, [credential]);
  if (!error && (remaining === null || remaining > 120)) return null;
  return <aside className="session-notice" role="status" aria-live="polite">
    <strong>{tr(error ? 'ui.session.verifyFailed' : 'ui.session.expiringSoon')}</strong>
    {!error && <p aria-hidden="true">{tr('ui.session.expiring', { seconds: remaining || 0 })}</p>}
    <p>{tr(error ? error : 'ui.session.keepWorking')}</p>
    <div><button type="button" className="btn btn-primary" onClick={() => { window.dispatchEvent(new CustomEvent('lrm:session-extend')); }}>{tr('ui.session.extend')}</button>
      <button type="button" className="btn btn-secondary" onClick={() => { void logout().catch(() => {}).finally(() => window.dispatchEvent(new CustomEvent('lrm:session-invalid'))); }}>{tr('ui.session.signOut')}</button></div>
  </aside>;
}
