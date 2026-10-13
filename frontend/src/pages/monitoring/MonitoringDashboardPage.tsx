import React from 'react';
import { ArrowRight, RefreshCw, Activity } from 'lucide-react';
import { useLocale } from '../../providers/LocaleProvider';
import { OperationsReport } from '../../components/features/monitoring/OperationsReport';
import type { DashboardPayload } from '../../types/telemetry';
import { formatVietnamDateTime } from '../../utils/timezone';
import { CANONICAL_BOOKING_STATUS_LABELS } from '../../constants.js';
import { workspacePathForTab } from '../../workspaceRoutes.js';
import '../../styles/monitoring-workspace.css';
import { ResourceCareView } from '../../components/features/monitoring/ResourceCareView';

interface Props { userRole?: string; mode?: 'operations' | 'telemetry'; dashboard: DashboardPayload | null; loading?: boolean; onRefresh?: () => void; }
export const MonitoringDashboardPage: React.FC<Props> = ({dashboard,loading=false,onRefresh,mode='telemetry'}) => {
 const { tr }=useLocale();
 const operations=mode==='operations';
 const queue=dashboard ? [
  {key:'pending',count:dashboard.summary.pendingApprovalCount,label:'ui.pending_approval_6af96613',href:workspacePathForTab('bookings',{filter:'PENDING_APPROVAL'})},
  {key:'handover',count:dashboard.summary.activeBookingsCount,label:'ui.monitor.activeQueue',href:workspacePathForTab('bookings',{filter:'ALL'})},
  {key:'return',count:dashboard.summary.checkedOutCount,label:'ui.monitor.checkedOutQueue',href:workspacePathForTab('bookings',{filter:'CHECKED_OUT'})},
  {key:'incidents',count:dashboard.summary.openIncidentCount,label:'ui.open_incidents_a8d69cb9',href:workspacePathForTab('incidents',{filter:'OPEN'})}
 ] : [];
 if(!operations)return <ResourceCareView/>;
 return <section className="monitor-workspace" aria-busy={loading} aria-labelledby="monitor-title">
  <header className="monitor-heading"><div><h1 id="monitor-title">{tr(operations?'ui.operations_dashboard_6a44426c':'ui.telemetry_monitoring_5752a8cc')}</h1><p>{tr(operations?'ui.track_bookings_handovers_usage_and_3f87ab04':'ui.track_measurements_and_sensor_connections_3bd3dc30')}</p>{dashboard && <small>{tr('ui.monitor.updatedAt')} {formatVietnamDateTime(dashboard.generatedAt)}</small>}</div>{onRefresh && <button type="button" className="btn btn-secondary" disabled={loading} onClick={onRefresh}><RefreshCw size={16} />{tr(loading?'ui.updating_01c0991e':'ui.refresh_46140fa8')}</button>}</header>
  {!dashboard ? <div className="monitor-empty" role={loading?'status':'alert'}><Activity size={28} aria-hidden="true" /><p>{tr(loading?'ui.loading_operational_data_2a8d4625':'ui.could_not_load_operational_dashboard_96cfaabb')}</p></div> : <div className="monitor-operations-layout">
   <div className="monitor-main"><OperationsReport refreshKey={dashboard.generatedAt} /><section className="monitor-upcoming"><header><h2>{tr('ui.upcoming_bookings_f78bd751')}</h2><a href={workspacePathForTab('smart_calendar')}>{tr('ui.monitor.openCalendar')}<ArrowRight size={15} /></a></header>
    {dashboard.upcomingBookings.length ? <div className="table-wrap"><table><caption className="sr-only">{tr('ui.upcoming_bookings_f78bd751')}</caption><thead><tr><th>{tr('ui.resource_9a35ef53')}</th><th>{tr('ui.time_b295fd62')}</th><th>{tr('ui.status_cb31de81')}</th></tr></thead><tbody>{dashboard.upcomingBookings.slice(0,10).map((booking: any)=><tr key={booking.id}><td><a href={workspacePathForTab('bookings',{booking:booking.id})}><strong>{booking.resource?.name || booking.title}</strong><ArrowRight size={14} /></a><small>{booking.resource?.code} · {booking.requestedBy?.fullName || '—'}</small></td><td>{formatVietnamDateTime(booking.startAt)}</td><td>{tr(CANONICAL_BOOKING_STATUS_LABELS[booking.status]) || booking.status}</td></tr>)}</tbody></table></div> : <p className="monitor-empty">{tr('ui.no_active_bookings_in_the_2faaa45b')}</p>}
   </section></div>
   <aside className="monitor-queue"><h2>{tr('ui.monitor.workQueues')}</h2><p>{tr('ui.monitor.queueHint')}</p><ul>{queue.map(item=><li key={item.key}><a href={item.href}><span>{tr(item.label)}<strong>{item.count}</strong></span><ArrowRight size={16} aria-hidden="true" /></a></li>)}</ul>
    <dl><div><dt>{tr('ui.total_resources_69ad5e68')}</dt><dd>{dashboard.summary.totalResources}</dd></div><div><dt>{tr('ui.unread_notifications_66bab952')}</dt><dd><a href={workspacePathForTab('escalations',{filter:'unread'})}>{dashboard.summary.unreadNotifications}</a></dd></div></dl><p className="monitor-source-note">{tr('ui.source_saved_bookings_handover_return_5d03d25a')}</p>
   </aside>
  </div>}
 </section>;
};
