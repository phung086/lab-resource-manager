import React, { useEffect, useState } from 'react';
import { apiRequest, clearSession } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';

export function SessionSecurity() {
  const { tr, locale } = useLocale();
  const [session, setSession] = useState<{ createdAt: string; expiresAt: string; idleTimeoutSeconds: number } | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { const changed = () => setRevision(value => value + 1); window.addEventListener('lrm:session-changed', changed); return () => window.removeEventListener('lrm:session-changed', changed); }, []);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/auth/session', { signal: controller.signal }).then(setSession).catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [revision]);
  const time = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
  async function signOutAll() {
    if (busy) return; setBusy(true); setError('');
    try { await apiRequest('/auth/logout-all', { method: 'POST' }); clearSession(); window.dispatchEvent(new CustomEvent('lrm:session-invalid')); }
    catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'api.API_REQUEST_FAILED'); }
    finally { setBusy(false); }
  }
  return <section className="session-security"><h3>{tr('ui.session.title')}</h3>
    {session && <dl><dt>{tr('ui.session.started')}</dt><dd>{time(session.createdAt)}</dd><dt>{tr('ui.session.absolute')}</dt><dd>{time(session.expiresAt)} {tr('ui.timezoneVietnam')}</dd><dt>{tr('ui.session.idle')}</dt><dd>{tr('ui.session.minutes', { minutes: session.idleTimeoutSeconds / 60 })}</dd></dl>}
    <p>{tr('ui.session.policy')}</p>
    {error && <p className="account-error" role="alert">{tr(error)}</p>}
    <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void signOutAll()}>{tr('ui.session.signOutAll')}</button>
  </section>;
}
