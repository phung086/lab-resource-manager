import { TELEMETRY_FEATURES_ENABLED } from "../../config/featureFlags";
import { translate } from "../../i18n.js";
import { useLocale } from '../../providers/LocaleProvider';
import React, { useState } from "react";
import { Activity, AlertTriangle, Bell, CalendarClock, Camera, Gauge, Server, ShieldAlert } from "lucide-react";
import { TelemetryStatusGrid } from "../../components/features/monitoring/TelemetryStatusGrid";
import { acknowledgeMonitoringAlert } from "../../services/monitoring";
import type { DashboardPayload } from "../../types/telemetry";
import { formatVietnamDateTime } from "../../utils/timezone.js";

interface Props {
  mode?: "operations" | "telemetry";
  dashboard: DashboardPayload | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export const MonitoringDashboardPage: React.FC<Props> = ({ dashboard, loading = false, onRefresh, mode = "telemetry" }) => {
  const { tr } = useLocale();
  const operations = mode === "operations";
  const [actionError, setActionError] = useState("");
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  if (!dashboard) {
    return (
      <section className="content-stack">
        <div className="empty-state">
          <Activity size={28} />
          <p>{loading ? tr("ui.loading_operational_data_2a8d4625") : tr("ui.could_not_load_operational_dashboard_96cfaabb")}</p>
          {onRefresh && <button className="btn btn-secondary" type="button" onClick={onRefresh}>{tr("ui.retry_c58d068c")}</button>}
        </div>
      </section>
    );
  }

  const metrics = [
    { label: tr("ui.total_resources_69ad5e68"), value: dashboard.summary.totalResources, icon: Server },
    { label: tr("ui.active_bookings_1a5f8201"), value: dashboard.summary.activeBookingsCount, icon: CalendarClock },
    { label: tr("ui.open_incidents_a8d69cb9"), value: dashboard.summary.openIncidentCount, icon: AlertTriangle },
    { label: tr("ui.unread_notifications_66bab952"), value: dashboard.summary.unreadNotifications, icon: Bell }
  ];

  async function acknowledge(alertId: string) {
    setAcknowledgingId(alertId);
    setActionError("");
    try {
      await acknowledgeMonitoringAlert(alertId);
      onRefresh?.();
    } catch (error: any) {
      setActionError(error?.message || "ui.could_not_acknowledge_alert_e60e1f41");
    } finally {
      setAcknowledgingId(null);
    }
  }

  return (
    <section className="content-stack" aria-labelledby="monitoring-dashboard-heading">
      <div className="page-section-header">
        <div>
          <h1 id="monitoring-dashboard-heading">{operations ? tr("ui.operations_dashboard_6a44426c") : tr("ui.telemetry_monitoring_5752a8cc")}</h1>
          <p className="section-description">
            {operations ? tr("ui.track_bookings_handovers_usage_and_3f87ab04") : tr("ui.track_measurements_and_sensor_connections_3bd3dc30")}
          </p>
          <p className="data-source-note">{operations ? tr("ui.source_saved_bookings_handover_return_5d03d25a") : tr("ui.source_devices_or_exporters_using_8b01b568")} {tr("ui.updated_97c6e2ca")}{formatVietnamDateTime(dashboard.generatedAt)}.</p>
        </div>
        {onRefresh && <button className="btn btn-secondary" type="button" onClick={onRefresh} disabled={loading}>{loading ? tr("ui.updating_01c0991e") : tr("ui.last_update_5293d03c")}</button>}
      </div>

      {operations && <div className="operational-summary-grid">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div className="card operational-summary-card" key={label}>
            <span><Icon size={15} /> {label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>}

      {actionError && <div className="alert danger" role="alert">{translate(actionError)}</div>}

      {operations && <div className="dashboard-data-grid">
        <article className="card dashboard-data-panel">
          <div className="panel-heading">
            <Gauge size={17} />
            <h2>{tr("ui.30_day_utilization_b9f84182")}</h2>
          </div>
          <dl className="operational-evidence-grid">
            <div><dt>{tr("ui.scheduled_usage_6b04915f")}</dt><dd>{dashboard.utilization.scheduledUtilizationRate.toFixed(2)}%</dd></div>
            <div><dt>{tr("ui.actual_usage_c7e4c2f8")}</dt><dd>{dashboard.utilization.actualUtilizationRate.toFixed(2)}%</dd></div>
            <div><dt>{tr("ui.scheduled_minutes_cbc3f780")}</dt><dd>{dashboard.utilization.scheduledMinutes}</dd></div>
            <div><dt>{tr("ui.actual_minutes_8f20eef8")}</dt><dd>{dashboard.utilization.actualUsageMinutes}</dd></div>
          </dl>
          <p className="data-source-note">{tr("ui.source_dcfd8415")}{dashboard.utilization.source}{tr("ui.window_3f23504e")}{dashboard.utilization.windowDays} {tr("ui.days_8071ee3b")}</p>
        </article>

        <article className="card dashboard-data-panel">
          <div className="panel-heading">
            <AlertTriangle size={17} />
            <h2>{tr("ui.incident_36824380")}</h2>
          </div>
          <dl className="operational-evidence-grid">
            <div><dt>{tr("ui.total_13fdbadf")}</dt><dd>{dashboard.incidents.total}</dd></div>
            <div><dt>{tr("ui.open_98235c77")}</dt><dd>{dashboard.incidents.open}</dd></div>
            <div><dt>{tr("ui.critical_9559e09a")}</dt><dd>{dashboard.incidents.bySeverity.critical || 0}</dd></div>
            <div><dt>{tr("ui.high_f87c2db7")}</dt><dd>{dashboard.incidents.bySeverity.high || 0}</dd></div>
          </dl>
        </article>
      </div>}

      {!operations && TELEMETRY_FEATURES_ENABLED && <>
      <div className="card dashboard-data-panel">
        <div className="panel-heading">
          <Activity size={17} />
          <h2>{tr("ui.telemetry_status_1f1f6882")}</h2>
        </div>
        <div className="telemetry-summary-row">
          {(["HEALTHY", "WARNING", "STALE", "UNAVAILABLE", "NO_DATA"] as const).map((state) => (
            <div key={state}>
              <strong>{dashboard.telemetrySummary[state] || 0}</strong>
              <span>{state}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card dashboard-data-panel">
        <div className="panel-heading">
          <ShieldAlert size={17} />
          <h2>{tr("ui.recorded_monitoring_alerts_56b20cd9")}</h2>
        </div>
        {dashboard.monitoringAlerts.length ? (
          <div className="content-stack compact">
            {dashboard.monitoringAlerts.map((alert) => (
              <div className="dashboard-booking-row" key={alert.id}>
                <div>
                  <strong>{alert.severity} · {alert.ruleCode}</strong>
                  <span>{alert.resourceCode || alert.resourceId} · {alert.message}</span>
                  {alert.incident && <span>{translate("ui.incident_32dcf81b")} {alert.incident.id} ({alert.incident.status})</span>}
                </div>
                <div>
                  <span>{alert.status}</span>
                  <time dateTime={alert.lastObservedAt}>{formatVietnamDateTime(alert.lastObservedAt)}</time>
                  {alert.status === "OPEN" && (
                    <button className="btn btn-secondary" type="button" disabled={acknowledgingId === alert.id} onClick={() => acknowledge(alert.id)}>
                      {acknowledgingId === alert.id ? tr("ui.acknowledging_58cf7ba6") : tr("ui.confirm_1503b0d0")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : <div className="empty-state">{tr("ui.no_active_monitoring_alerts_d544ae55")}</div>}
      </div>

      <TelemetryStatusGrid telemetry={dashboard.telemetry} />

      <div className="card dashboard-data-panel">
        <div className="panel-heading">
          <Camera size={17} />
          <h2>{tr("ui.cameras_safety_alerts_9768aa1d")}</h2>
        </div>
        <div className="alert warning">
          <strong>{translate("ui.non_certified_not_a_fire_83ece6d0")}</strong>
          <span>{tr("ui.does_not_replace_physical_fire_857990d1")}</span>
        </div>
        {dashboard.cameras.length ? (
          <div className="content-stack compact">
            {dashboard.cameras.map((camera) => (
              <div className="dashboard-booking-row" key={camera.id}>
                <div><strong>{camera.code} — {camera.name}</strong><span>{tr("ui.resource_scoped_metadata_bc029213")}{camera.resourceId}</span></div>
                <div><span>{camera.state}</span><small>{camera.enabled ? tr("ui.configuration_enabled_bc2db5a3") : tr("ui.disabled_by_default_313eed81")}</small></div>
              </div>
            ))}
          </div>
        ) : <div className="empty-state">{tr("ui.not_configured_no_camera_configured_0fa994f5")}</div>}
      </div>

      </>}
      {operations && <div className="card dashboard-data-panel">
        <div className="panel-heading">
          <CalendarClock size={17} />
          <h2>{tr("ui.upcoming_bookings_f78bd751")}</h2>
        </div>
        {dashboard.upcomingBookings.length ? (
          <div className="content-stack compact">
            {dashboard.upcomingBookings.slice(0, 10).map((booking: any) => (
              <div className="dashboard-booking-row" key={booking.id}>
                <div>
                  <strong>{booking.resource?.code} — {booking.resource?.name}</strong>
                  <span>{booking.requestedBy?.fullName || "—"}</span>
                </div>
                <div>
                  <span>{booking.status}</span>
                  <time dateTime={booking.startAt}>{formatVietnamDateTime(booking.startAt)}</time>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="empty-state">{tr("ui.no_active_bookings_in_the_2faaa45b")}</div>}
      </div>}
    </section>
  );
};
