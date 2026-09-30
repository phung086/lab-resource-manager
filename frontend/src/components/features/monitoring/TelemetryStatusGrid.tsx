import { translate } from "../../../i18n.js";
import { useLocale } from '../../../providers/LocaleProvider';
import React from "react";
import { Activity, AlertTriangle, Clock3, Radio, Server, Thermometer, Wifi, WifiOff } from "lucide-react";
import type { TelemetryResourceView, TelemetryState } from "../../../types/telemetry";
import { formatVietnamDateTime } from "../../../utils/timezone.js";

const stateMeta: Record<TelemetryState, { label: string; icon: React.ElementType }> = {
  HEALTHY: { label: "ui.stable_a9849d38", icon: Activity },
  WARNING: { label: "ui.warning_a7acbcf4", icon: AlertTriangle },
  STALE: { label: "ui.stale_data_11e8dde0", icon: Clock3 },
  UNAVAILABLE: { label: "ui.unavailable_567f82dd", icon: WifiOff },
  NO_DATA: { label: "ui.no_data_79d2a95c", icon: Radio }
};
const operationalLabels: Record<string, string> = {
  AVAILABLE: "ui.available_d654065d", IN_USE: "ui.in_use_a07a3647", MAINTENANCE: "ui.maintenance_8ad424bd",
  CALIBRATION: "ui.calibration_a71e17c8", BROKEN: "ui.broken_fd69bba6", RETIRED: "ui.offline_b4f199c3", OFFLINE: "ui.offline_96a8bb03"
};

export const TelemetryStatusGrid: React.FC<{ telemetry: TelemetryResourceView[] }> = ({ telemetry }) => {
  const { tr } = useLocale();
  if (!telemetry.length) {
    return <div className="empty-state">{tr("ui.no_resources_in_your_monitoring_547b1bd5")}</div>;
  }

  return (
    <div className="telemetry-status-grid">
      {telemetry.map((item) => {
        const meta = stateMeta[item.monitoring.state];
        const StateIcon = meta.icon;
        const sample = item.latestTelemetry;
        const alertCount = item.activeAlerts.length;

        return (
          <article className="card telemetry-status-card" key={item.resource.id}>
            <div className="telemetry-status-card__header">
              <div>
                <span className="eyebrow">{item.resource.code}</span>
                <h3>{item.resource.name}</h3>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {alertCount > 0 && (
                  <span className="priority-badge p1" style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>
                    {alertCount} {tr("ui.alerts_9e63a91e")}</span>
                )}
                <span className={`telemetry-state telemetry-state--${item.monitoring.state.toLowerCase()}`}>
                  <StateIcon size={14} /> {tr(meta.label)}
                </span>
              </div>
            </div>

            {/* Compact summary row: latest sample & source health */}
            <div className="telemetry-quick-summary" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--card-subtle, #f8fafc)", padding: "0.6rem 0.85rem", borderRadius: "8px", fontSize: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Thermometer size={14} style={{ color: "#3b82f6" }} />
                <span>{tr("ui.latest_sample_8875351d")}<strong>{sample?.temperatureC != null ? `${sample.temperatureC.toFixed(1)}°C` : "—"}</strong> {sample?.humidityPercent != null ? `(${sample.humidityPercent.toFixed(1)}%)` : ""}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#64748b" }}>
                {item.sourceHealth?.reportedOnline === false ? <WifiOff size={13} style={{ color: "#ef4444" }} /> : <Wifi size={13} style={{ color: "#10b981" }} />}
                <span>{item.sourceHealth ? (item.sourceHealth.reportedOnline === false ? "OFFLINE" : "ONLINE") : "NO_DATA"}</span>
              </div>
            </div>

            {/* CRITICAL & ACTIVE ALERTS: NEVER HIDDEN */}
            {alertCount > 0 && (
              <div className="content-stack compact" aria-label={tr("ui.active_monitoring_alerts_5c335d99")}>
                {item.activeAlerts.map((alert) => (
                  <div className={`alert telemetry-alert-detail ${alert.severity === "CRITICAL" ? "danger" : "warning"}`} key={alert.id}>
                    <strong>{alert.severity} · {alert.ruleCode}</strong>
                    <span>{alert.message}</span>
                    <small>{alert.status}{alert.incident ? ` · Incident ${alert.incident.id}` : ""}</small>
                  </div>
                ))}
              </div>
            )}

            <dl className="telemetry-reading-grid">
              <div>
                <dt><Thermometer size={13} /> {tr("ui.temperature_d792b875")}</dt>
                <dd>{sample?.temperatureC != null ? `${sample.temperatureC.toFixed(1)} °C` : "—"}</dd>
              </div>
              <div>
                <dt>{tr("ui.humidity_83aa327b")}</dt>
                <dd>{sample?.humidityPercent != null ? `${sample.humidityPercent.toFixed(1)}%` : "—"}</dd>
              </div>
              <div>
                <dt>{tr("ui.physical_status_34d66dbe")}</dt>
                <dd>{tr(operationalLabels[item.resource.operationalStatus]) || item.resource.operationalStatus}</dd>
              </div>
              <div>
                <dt>{tr("ui.source_c76d57b3")}</dt>
                <dd>{item.sourceHealth?.code || sample?.source || tr("ui.none_recorded_bc2b97d6")}</dd>
              </div>
              <div>
                <dt>{item.sourceHealth?.reportedOnline === false ? <WifiOff size={13} /> : <Wifi size={13} />} {tr("ui.source_health_45a57e95")}</dt>
                <dd>{item.sourceHealth ? `${item.sourceHealth.reportedOnline === false ? "OFFLINE" : "ONLINE"} · ${item.sourceHealth.freshness}` : "NO_DATA"}</dd>
              </div>
              <div>
                <dt>{tr("ui.last_seen_c40fd69c")}</dt>
                <dd>{formatVietnamDateTime(item.sourceHealth?.lastSeenAt)}</dd>
              </div>
            </dl>

            {sample ? (
              <div className="telemetry-sample-meta">
                <Server size={13} />
                <span>{tr("ui.latest_sample_8875351d")}{formatVietnamDateTime(sample.sampledAt)}</span>
              </div>
            ) : (
              <p className="telemetry-no-data">
                {tr("ui.no_accepted_telemetry_samples_resource_73375f55")}</p>
            )}

            {!!item.monitoring.reasons.length && (
              <ul className="telemetry-reasons">
                {item.monitoring.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            )}

            <p className="data-source-note">
              {tr("ui.temperature_warning_threshold_3acbf85a")}{item.thresholds.values.temperatureWarningC}{translate("ui.c_2ccd82e0")}{item.thresholds.sourceByField.temperatureWarningC}{translate("ui.stale_sau_4b458943")} {item.thresholds.values.staleMinutes} {tr("ui.minutes_23dced7a")}</p>

            {!!item.history?.length && (
              <details className="telemetry-history">
                <summary>{tr("ui.accepted_sample_history_9e425c37")}</summary>
                <ul>
                  {item.history.slice(0, 5).map((history) => (
                    <li key={history.id}>
                      {formatVietnamDateTime(history.sampledAt)} · {history.temperatureC != null ? `${history.temperatureC.toFixed(1)}°C` : "—"} · {history.humidityPercent != null ? `${history.humidityPercent.toFixed(1)}%` : "—"}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </article>
        );
      })}
    </div>
  );
};
