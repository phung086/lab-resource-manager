import React, { useEffect, useState } from 'react';
import { useLocale } from '../../../providers/LocaleProvider';
import { planningApi } from '../../../services/planningApi';
type Report = { total: number; cancelled: number; completed: number; maintenance: number; hours: { hour: number; count: number }[];
  resources: { id: string; name: string; bookings: number; cancelled: number; completed: number; declaredHours: number }[] };
export function PlanningReport() {
  const { t, locale } = useLocale(); const [days, setDays] = useState(30), [report, setReport] = useState<Report | null>(null), [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); setReport(null); setError('');
    planningApi.get<Report>(`/report?days=${days}`, controller.signal).then(setReport).catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort();
  }, [days]);
  return <section className="planning-paper"><header><div><h2>{t('planning.report')}</h2><p>{t('planning.reportBasis')}</p></div><label>{t('planning.period')}<select value={days} onChange={e => setDays(Number(e.target.value))}>{[7,30,90].map(value => <option key={value} value={value}>{t('planning.days', { count: value })}</option>)}</select></label></header>
    {error && <p role="alert" className="planning-error">{t(error)}</p>}{!report && !error && <p role="status">{t('planning.loading')}</p>}{report && <><dl className="planning-metrics">{(['total','completed','cancelled','maintenance'] as const).map(key => <div key={key}><dt>{t(`planning.metric.${key}`)}</dt><dd>{report[key]}</dd></div>)}</dl>
      <h3>{t('planning.hours')}</h3><div className="planning-hours" role="list" aria-label={t('planning.hours')}>{report.hours.map(row => <div role="listitem" key={row.hour} title={`${row.hour}:00 — ${row.count}`}><span>{row.count}</span><i style={{ height: `${Math.max(2, row.count / Math.max(1,...report.hours.map(item => item.count)) * 100)}px` }}/><small>{row.hour}</small></div>)}</div>
      <div className="planning-table-wrap"><table><caption>{t('planning.resourceReport')}</caption><thead><tr>{['resource','metric.total','metric.cancelled','metric.completed','declaredHours'].map(key => <th key={key}>{t(`planning.${key}`)}</th>)}</tr></thead><tbody>{report.resources.map(row => <tr key={row.id}><th scope="row">{row.name}</th><td>{row.bookings}</td><td>{row.cancelled}</td><td>{row.completed}</td><td>{row.declaredHours.toLocaleString(locale, { maximumFractionDigits: 1 })}</td></tr>)}</tbody></table></div>
      {!report.total && <p>{t('planning.empty')}</p>}<p>{t('planning.reportLimit')}</p></>}
  </section>;
}
