import { useEffect, useState } from 'react';
import '../payments/payments.css';
import { apiRequest } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
type Setting = { category: string; version: number; roomAccessConfigured: boolean; deliveryAllowed: boolean; pickupInstructions: string };
export function ResourceFulfillmentEditor({ resourceId }: { resourceId: string }) {
  const { tr } = useLocale();
  const [setting, setSetting] = useState<Setting | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => { const controller = new AbortController(); setSetting(null); setError(''); setSaved(false); apiRequest(`/resources/${resourceId}/fulfillment`, { signal: controller.signal }).then(result => { if (!controller.signal.aborted) setSetting(result); }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); }); return () => controller.abort(); }, [resourceId, retry]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!setting || busy) return; setBusy(true); setSaved(false); setError('');
    try { setSetting(await apiRequest(`/resources/${resourceId}/fulfillment`, { method: 'PUT', body: JSON.stringify({ expectedVersion: setting.version, deliveryAllowed: setting.deliveryAllowed, pickupInstructions: setting.pickupInstructions }) })); setSaved(true); }
    catch (cause: any) { setError(cause.message); } finally { setBusy(false); }
  }
  return <details className="resource-fulfillment-editor"><summary>{tr('ui.fulfillment.configure')}</summary>
    {error && <p className="alert danger" role="alert">{tr(error)} <button type="button" onClick={() => setRetry(value => value + 1)}>{tr('ui.retry_c58d068c')}</button></p>}
    {setting && <form onSubmit={save}><fieldset disabled={busy}>
      <label htmlFor={`pickup-${resourceId}`}>{tr('ui.fulfillment.pickupInstructions')}</label><input id={`pickup-${resourceId}`} maxLength={500} value={setting.pickupInstructions} onChange={event => setSetting({ ...setting, pickupInstructions: event.target.value })} />
      {setting.category === 'ROOM' ? <p>{tr('ui.fulfillment.phonePolicy')}</p> : ['EQUIPMENT','EXPERIMENT_KIT'].includes(setting.category) && <label><input type="checkbox" checked={setting.deliveryAllowed} onChange={event => setSetting({ ...setting, deliveryAllowed: event.target.checked })} />{tr('ui.fulfillment.allowDelivery')}</label>}
      <button className="primary-button" type="submit">{tr('ui.save_changes_48ee3bfe')}</button>
    </fieldset></form>}{saved && <p role="status">{tr('ui.fulfillment.saved')}</p>}
  </details>;
}
