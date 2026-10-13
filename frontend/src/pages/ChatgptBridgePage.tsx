import { useEffect, useState } from 'react';
import { CheckCircle2, Unplug, RefreshCw, MessageSquare, Clock3 } from 'lucide-react';
import { useLocale } from '../providers/LocaleProvider';
import { readRouteParams } from '../workspaceRoutes.js';
import { authorizeBridge, bridgeRedirectUrl, disconnectBridge, getBridgeConnections, getBridgeConsent,
  type BridgeConnectionState, type BridgeConsent } from '../services/chatgptBridgeApi';
import './chatgptBridge.css';

export default function ChatgptBridgePage({ actorRole }: { actorRole: string }) {
  const { tr, locale } = useLocale();
  const ticket = readRouteParams().get('ticket') || '';
  const [state, setState] = useState<BridgeConnectionState | null>(null), [consent, setConsent] = useState<BridgeConsent | null>(null);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0), [disconnecting, setDisconnecting] = useState('');
  useEffect(() => {
    if (actorRole !== 'ADMIN') return;
    const controller = new AbortController(); setLoading(true); setError(''); setConsent(null);
    Promise.all([getBridgeConnections(controller.signal), ticket ? getBridgeConsent(ticket, controller.signal) : Promise.resolve(null)])
      .then(([connection, pending]) => { if (!controller.signal.aborted) { setState(connection); setConsent(pending); } })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [actorRole, ticket, revision]);
  const date = (value: string) => new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
  async function approve(approved: boolean) {
    if (!ticket || busy) return; setBusy(true); setError('');
    try { const result = await authorizeBridge(ticket, approved); window.location.assign(bridgeRedirectUrl(result.redirectUrl)); }
    catch (failure) { setError((failure as Error).message); setBusy(false); }
  }
  async function disconnect() {
    if (!disconnecting || busy) return; setBusy(true); setError('');
    try { await disconnectBridge(disconnecting); setDisconnecting(''); setRevision(value => value + 1); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  if (actorRole !== 'ADMIN') return <p role="alert">{tr('api.FORBIDDEN')}</p>;
  return <section className="view-section chatgpt-connection" aria-busy={loading || busy}>
    <header className="chatgpt-connection-heading"><div><h1>{tr('bridge.title')}</h1><p>{tr('bridge.subtitle')}</p></div>
      <button className="btn btn-secondary" type="button" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}><RefreshCw size={16} />{tr('ui.refresh_46140fa8')}</button></header>
    {error && <p className="alert danger" role="alert">{tr(error)}</p>}
    {loading ? <p role="status">{tr('ui.loading_data_84c68bd5')}</p> : consent ? <section className="chatgpt-consent">
      <MessageSquare aria-hidden="true" size={32} /><h2>{tr('bridge.consentTitle', { client: consent.clientName })}</h2>
      <p>{tr('bridge.consentData')}</p><ul><li>{tr('bridge.scopeRead')}</li><li>{tr('bridge.scopeReply')}</li><li>{tr('bridge.scopeEvents')}</li></ul>
      {consent.replacesConnection && <p role="note">{tr('bridge.replacement')}</p>}
      <div className="chatgpt-connection-actions"><button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void approve(false)}>{tr('bridge.deny')}</button>
        <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void approve(true)}>{tr('bridge.authorize')}</button></div>
    </section> : state && <>
      <div className="chatgpt-connection-status" role="status">{state.connected ? <CheckCircle2 aria-hidden="true" /> : state.authorized ? <Clock3 aria-hidden="true" /> : <Unplug aria-hidden="true" />}<strong>{tr(state.connected ? 'bridge.connected' : state.authorized ? 'bridge.authorized' : 'bridge.disconnected')}</strong></div>
      {!state.enabled && <p>{tr('bridge.notConfigured')}</p>}
      {state.enabled && <><label>{tr('bridge.serverUrl')}<input readOnly value={state.publicUrl || ''} onFocus={event => event.target.select()} /></label>
        {!state.connected && <p>{tr(state.authorized ? 'bridge.startListening' : 'bridge.connectHelp')}</p>}</>}
      {state.connections.map(connection => <section className="chatgpt-connection-row" key={connection.id}><div><strong>{connection.clientName}</strong>
        <p>{tr('bridge.expiresOn', { date: date(connection.expiresAt) })}</p><span>{tr(connection.subscriptionCount ? 'bridge.listening' : 'bridge.awaitingSubscription')}</span></div>
        <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => setDisconnecting(connection.id)}><Unplug size={16} />{tr('bridge.disconnect')}</button></section>)}
      {disconnecting && <div role="group" aria-label={tr('bridge.disconnect')}><p>{tr('bridge.disconnectConfirm')}</p><div className="chatgpt-connection-actions">
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setDisconnecting('')}>{tr('ui.cancel_74fcd352')}</button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void disconnect()}>{tr('bridge.disconnect')}</button></div></div>}
    </>}
  </section>;
}
