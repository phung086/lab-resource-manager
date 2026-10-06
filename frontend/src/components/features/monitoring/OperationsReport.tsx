import { useEffect, useState } from 'react';
import { useLocale } from '../../../providers/LocaleProvider';
import { getOperationsReport } from '../../../services/monitoring';
import type { OperationsReportPayload } from '../../../types/telemetry';
import { formatVietnamDateTime } from '../../../utils/timezone.js';
import './operations-report.css';

export function OperationsReport({ refreshKey }: { refreshKey: string }) {
  const { tr, locale } = useLocale();
  const [days, setDays] = useState<7 | 30>(7);
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<{ key: string; report?: OperationsReportPayload; error?: string }>();
  const key = `${refreshKey}:${days}:${retry}`;
  useEffect(() => {
    const controller = new AbortController();
    getOperationsReport(days, controller.signal).then(report => {
      if (!controller.signal.aborted) setResult({ key, report });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ key, error: error?.message || 'report.loadError' });
    });
    return () => controller.abort();
  }, [days, key]);
  const current = result?.key === key ? result : undefined;
  const report = current?.report;
  const loading = !current;
  const number = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { maximumFractionDigits: 1 });
  const duration = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { style: 'unit', unit: 'hour', unitDisplay: 'long', maximumFractionDigits: 1 });
  const hours = (minutes: number) => duration.format(minutes / 60);
  const used = report?.resources.filter(resource => resource.actualUsageMinutes > 0) || [];
  const visible = expanded ? (report?.resources || []) : used.slice(0, 5);
  const maxMinutes = Math.max(1, ...used.map(resource => resource.actualUsageMinutes));
  return <article className="card operations-report" aria-labelledby="operations-report-title" aria-busy={loading}>
    <header className="operations-report-header">
      <div><h2 id="operations-report-title">{tr('report.title')}</h2><p>{tr('report.subtitle')}</p></div>
      <div className="operations-report-period" role="group" aria-label={tr('report.period')}>
        {([7, 30] as const).map(period => <button type="button" key={period} aria-pressed={days === period} onClick={() => setDays(period)}>{tr('report.days', { days: period })}</button>)}
      </div>
    </header>
    {loading && <p className="empty-state" role="status">{tr('report.loading')}</p>}
    {current?.error && <div className="alert danger" role="alert"><p>{tr(current.error)}</p><button className="btn btn-secondary" type="button" onClick={() => setRetry(value => value + 1)}>{tr('report.retry')}</button></div>}
    {report && <>
      <dl className="operations-report-summary">
        <div><dt>{tr('report.actual')}</dt><dd>{hours(report.summary.actualUsageMinutes)}</dd></div>
        <div><dt>{tr('report.scheduled')}</dt><dd>{hours(report.summary.scheduledMinutes)}</dd></div>
        <div><dt>{tr('report.cancelled')}</dt><dd>{number.format(report.summary.cancelledCount)}</dd></div>
        <div><dt>{tr('report.incidents')}</dt><dd>{number.format(report.summary.incidentCount)}</dd></div>
      </dl>
      <div className="operations-report-ranking-heading"><h3>{tr('report.resourceUsage')}</h3><span>{tr('report.used', { used: report.summary.usedResourceCount, total: report.summary.resourceCount })}</span></div>
      {!used.length && <p className="empty-state">{tr(report.summary.resourceCount ? 'report.noUsage' : 'report.noResources')}</p>}
      {visible.length > 0 && <ol className="operations-report-ranking" aria-label={tr('report.resourceUsage')}>
        {visible.map(resource => <li key={resource.id}>
          <div className="operations-report-resource"><span>{resource.name}</span><small>{resource.code}{resource.laboratoryName && ` · ${resource.laboratoryName}`}</small></div>
          <div className="operations-report-bar" aria-hidden="true"><span style={{ width: `${resource.actualUsageMinutes / maxMinutes * 100}%` }} /></div>
          <span className="operations-report-value">{hours(resource.actualUsageMinutes)}</span>
        </li>)}
      </ol>}
      {report.summary.resourceCount > 0 && <button className="operations-report-disclosure" type="button" aria-expanded={expanded} aria-controls="operations-report-details" onClick={() => setExpanded(value => !value)}>{tr(expanded ? 'report.less' : 'report.details')}</button>}
      <div id="operations-report-details" hidden={!expanded}>
        <dl className="operations-report-summary operations-report-extra">
          <div><dt>{tr('report.endedSessions')}</dt><dd>{report.summary.endedSessionCount}</dd></div>
          <div><dt>{tr('report.noShow')}</dt><dd>{report.summary.noShowCount}</dd></div>
          <div><dt>{tr('report.openIncidents')}</dt><dd>{report.summary.openIncidentCount}</dd></div>
          <div><dt>{tr('report.plannedMaintenance')}</dt><dd>{hours(report.summary.plannedMaintenanceMinutes)}</dd></div>
        </dl>
        <p className="data-source-note">{tr('report.basis')}</p>
      </div>
      <footer className="operations-report-footer"><span>{tr('report.evidence')}</span><time dateTime={report.window.endAt}>{formatVietnamDateTime(report.window.startAt)} → {formatVietnamDateTime(report.window.endAt)}</time></footer>
    </>}
  </article>;
}
