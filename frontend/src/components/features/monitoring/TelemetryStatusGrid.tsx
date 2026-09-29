import { useLocale } from '../../../providers/LocaleProvider';
import React from "react";
import { Activity, AlertTriangle, Clock3, Radio, Server, Thermometer, Wifi, WifiOff } from "lucide-react";
import type { TelemetryResourceView, TelemetryState } from "../../../types/telemetry";
import { formatVietnamDateTime } from "../../../utils/timezone.js";

const stateMeta: Record<TelemetryState, { label: string; icon: React.ElementType }> = {
  HEALTHY: { label: "Ổn định", icon: Activity },
  WARNING: { label: "Cảnh báo", icon: AlertTriangle },
  STALE: { label: "Dữ liệu cũ", icon: Clock3 },
  UNAVAILABLE: { label: "Không khả dụng", icon: WifiOff },
  NO_DATA: { label: "Chưa có dữ liệu", icon: Radio }
};
const operationalLabels: Record<string, string> = {
  AVAILABLE: "Sẵn sàng", IN_USE: "Đang sử dụng", MAINTENANCE: "Bảo trì",
  CALIBRATION: "Hiệu chuẩn", BROKEN: "Hỏng", RETIRED: "Ngừng sử dụng", OFFLINE: "Ngoại tuyến"
};

export const TelemetryStatusGrid: React.FC<{ telemetry: TelemetryResourceView[] }> = ({ telemetry }) => {
  const { tr } = useLocale();
  if (!telemetry.length) {
    return <div className="empty-state">{tr("Chưa có tài nguyên trong phạm vi giám sát.")}</div>;
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
                    {alertCount} {tr("cảnh báo")}</span>
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
                <span>{tr("Mẫu gần nhất:")}<strong>{sample?.temperatureC != null ? `${sample.temperatureC.toFixed(1)}°C` : "—"}</strong> {sample?.humidityPercent != null ? `(${sample.humidityPercent.toFixed(1)}%)` : ""}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#64748b" }}>
                {item.sourceHealth?.reportedOnline === false ? <WifiOff size={13} style={{ color: "#ef4444" }} /> : <Wifi size={13} style={{ color: "#10b981" }} />}
                <span>{item.sourceHealth ? (item.sourceHealth.reportedOnline === false ? "OFFLINE" : "ONLINE") : "NO_DATA"}</span>
              </div>
            </div>

            {/* CRITICAL & ACTIVE ALERTS: NEVER HIDDEN */}
            {alertCount > 0 && (
              <div className="content-stack compact" aria-label={tr("Cảnh báo giám sát đang hoạt động")}>
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
                <dt><Thermometer size={13} /> {tr("Nhiệt độ")}</dt>
                <dd>{sample?.temperatureC != null ? `${sample.temperatureC.toFixed(1)} °C` : "—"}</dd>
              </div>
              <div>
                <dt>{tr("Độ ẩm")}</dt>
                <dd>{sample?.humidityPercent != null ? `${sample.humidityPercent.toFixed(1)}%` : "—"}</dd>
              </div>
              <div>
                <dt>{tr("Trạng thái vật lý")}</dt>
                <dd>{tr(operationalLabels[item.resource.operationalStatus]) || item.resource.operationalStatus}</dd>
              </div>
              <div>
                <dt>{tr("Nguồn")}</dt>
                <dd>{item.sourceHealth?.code || sample?.source || tr("Chưa có")}</dd>
              </div>
              <div>
                <dt>{item.sourceHealth?.reportedOnline === false ? <WifiOff size={13} /> : <Wifi size={13} />} {tr("Sức khỏe nguồn")}</dt>
                <dd>{item.sourceHealth ? `${item.sourceHealth.reportedOnline === false ? "OFFLINE" : "ONLINE"} · ${item.sourceHealth.freshness}` : "NO_DATA"}</dd>
              </div>
              <div>
                <dt>{tr("Lần thấy gần nhất")}</dt>
                <dd>{formatVietnamDateTime(item.sourceHealth?.lastSeenAt)}</dd>
              </div>
            </dl>

            {sample ? (
              <div className="telemetry-sample-meta">
                <Server size={13} />
                <span>{tr("Mẫu gần nhất:")}{formatVietnamDateTime(sample.sampledAt)}</span>
              </div>
            ) : (
              <p className="telemetry-no-data">
                {tr("Không có mẫu telemetry được chấp nhận. Hệ thống không suy diễn trạng thái khỏe mạnh.")}</p>
            )}

            {!!item.monitoring.reasons.length && (
              <ul className="telemetry-reasons">
                {item.monitoring.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            )}

            <p className="data-source-note">
              {tr("Ngưỡng nhiệt cảnh báo")}{item.thresholds.values.temperatureWarningC}°C
              ({item.thresholds.sourceByField.temperatureWarningC}); stale sau {item.thresholds.values.staleMinutes} {tr("phút.")}</p>

            {!!item.history?.length && (
              <details className="telemetry-history">
                <summary>{tr("Lịch sử mẫu đã chấp nhận")}</summary>
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
