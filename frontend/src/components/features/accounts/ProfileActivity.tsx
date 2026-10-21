import React from 'react';
import { ArrowRight, CalendarDays, CreditCard } from 'lucide-react';
import { useLocale } from '../../../providers/LocaleProvider';
import { CANONICAL_BOOKING_STATUS_LABELS } from '../../../constants.js';
import { formatVietnamDateTime } from '../../../utils/timezone';
import { buildProfileActivity } from '../../../utils/profileActivity';
import { workspacePathForTab } from '../../../workspaceRoutes.js';

export function ProfileActivity({ summary, spending }: { summary: unknown; spending?: { totalSpendVnd: number; successfulPayments: number; lastPaidAt?: string } }) {
  const { tr, locale } = useLocale();
  const activity = buildProfileActivity(summary);
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const percent = (value: number) => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value);
  const money = (value: number) => new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
  return <>
    {!activity ? <p className="account-warning" role="status">{tr('ui.profile.activityUnavailable')}</p> : <>
      <dl className="account-activity-totals">
        {[['ui.total_bookings_1f94eda9', activity.total], ['ui.active_bookings_dc59721f', activity.active], ['ui.completed_sessions_0bcef6c3', activity.completed]].map(([label, count]) => <div key={label}><dt>{tr(String(label))}</dt><dd>{number(Number(count))}</dd></div>)}
      </dl>
      {activity.total > 0 ? <div className="account-distribution">
        <h3>{tr('ui.account.bookingBreakdown')}</h3>
        <table><caption className="sr-only">{tr('ui.profile.distributionCaption')}</caption><thead><tr><th scope="col">{tr('ui.status_cb31de81')}</th><th scope="col">{tr('ui.account.count')}</th><th scope="col">{tr('ui.profile.share')}</th></tr></thead>
          <tbody>{activity.rows.map(row => <tr key={row.status} data-status={row.status}>
            <th scope="row"><span className="account-chart-dot" aria-hidden="true" />{CANONICAL_BOOKING_STATUS_LABELS[row.status] ? tr(CANONICAL_BOOKING_STATUS_LABELS[row.status]) : row.status}</th>
            <td>{number(row.count)}</td><td><div className="account-chart-value"><span className="account-chart-track" aria-hidden="true"><span style={{ width: `${row.ratio * 100}%` }} /></span><span>{percent(row.ratio)}</span></div></td>
          </tr>)}</tbody>
        </table>
        <p className="account-hint account-chart-note">{tr('ui.profile.activeExplanation')}</p>
      </div> : <div className="account-empty"><CalendarDays size={32} aria-hidden="true" /><h3>{tr('ui.profile.noActivity')}</h3><p>{tr('ui.profile.noActivityHint')}</p><a href={workspacePathForTab('resources')}>{tr('ui.profile.exploreResources')}<ArrowRight size={16} aria-hidden="true" /></a></div>}
    </>}
    {spending && Number.isFinite(spending.totalSpendVnd) && Number.isSafeInteger(spending.successfulPayments) && <section className="account-payment-evidence" aria-labelledby="account-payments-title">
      <h3 id="account-payments-title"><CreditCard size={18} aria-hidden="true" />{tr('ui.profile.verifiedPayments')}</h3>
      <dl><div><dt>{tr('ui.profile.verifiedTotal')}</dt><dd>{money(spending.totalSpendVnd)}</dd></div><div><dt>{tr('ui.profile.successfulPayments')}</dt><dd>{number(spending.successfulPayments)}</dd></div><div><dt>{tr('ui.profile.lastPayment')}</dt><dd>{spending.lastPaidAt ? formatVietnamDateTime(spending.lastPaidAt) : tr('ui.profile.noPayment')}</dd></div></dl>
    </section>}
    <div className="account-section-action"><a className="btn btn-secondary" href={workspacePathForTab('bookings')}>{tr('ui.open_bookings_a9348073')}<ArrowRight size={16} aria-hidden="true" /></a></div>
  </>;
}
