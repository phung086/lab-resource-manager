import { useEffect, useState } from 'react';
import { apiRequest } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
import type { MonitoringAlertView } from '../../../types/telemetry';
import { formatVietnamDateTime } from '../../../utils/timezone';
import { monitoringText } from './monitoringText';

export function MonitoringAlertHistory({ activeAlertIds }: { activeAlertIds: string }) {
  const { tr } = useLocale();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<MonitoringAlertView[]>([]);
  const [state, setState] = useState<'loading'|'ready'|'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    const request = new AbortController();
    setState('loading');
    apiRequest('/telemetry/alerts?status=RESOLVED&take=12', { signal: request.signal })
      .then((rows: MonitoringAlertView[]) => {
        if (!request.signal.aborted) { setAlerts(rows); setState('ready'); }
      })
      .catch(() => { if (!request.signal.aborted) setState('error'); });
    return () => request.abort();
  }, [open, attempt, activeAlertIds]);

  return <details className="monitor-alert-history" onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary>{tr('ui.monitorLab.resolvedAlerts')}</summary>
    {state==='loading' && <p role="status">{tr('ui.loading_operational_data_2a8d4625')}</p>}
    {state==='error' && <p role="alert">{tr('ui.monitorLab.failed')} <button type="button" className="btn btn-secondary" onClick={()=>setAttempt(value=>value+1)}>{tr('ui.refresh_46140fa8')}</button></p>}
    {state==='ready' && (alerts.length ? <ol>{alerts.map(alert=><li key={alert.id}>
      <div><strong>{alert.resourceCode}</strong> · {monitoringText(alert.ruleCode,alert.message,tr)}
        <small>{alert.resolvedAt
          ? tr(alert.resolution === 'FRESH_SAMPLE_RECEIVED' ? 'ui.monitorLab.signalRecoveredAt' : 'ui.monitorLab.resolvedAt', { time: formatVietnamDateTime(alert.resolvedAt) })
          : formatVietnamDateTime(alert.lastObservedAt)}</small>
      </div>
      {alert.origin==='SIMULATED' && <span className="monitor-simulation-badge">{tr('ui.telemetryDetail.simulated')}</span>}
    </li>)}</ol> : <p>{tr('ui.monitorLab.noResolvedAlerts')}</p>)}
  </details>;
}
