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
  if (!telemetry.length) {
    return <div className="empty-state">Chưa có tài nguyên trong phạm vi giám sát.</div>;
  }

  return (
    <div className="telemetry-status-grid">
      {telemetry.map((item) => {
        const meta = stateMeta[item.monitoring.state];
        const StateIcon = meta.icon;
        const sample = item.latestTelemetry;
        return (
          <article className="card telemetry-status-card" key={item.resource.id}>
            <div className="telemetry-status-card__header">
              <div>
                <span className="eyebrow">{item.resource.code}</span>
                <h3>{item.resource.name}</h3>
              </div>
              <span className={`telemetry-state telemetry-state--${item.monitoring.state.toLowerCase()}`}>
                <StateIcon size={14} /> {meta.label}
              </span>
            </div>

            <dl className="telemetry-reading-grid">
              <div>
                <dt><Thermometer size={13} /> Nhiệt độ</dt>
                <dd>{sample?.temperatureC != null ? `${sample.temperatureC.toFixed(1)} °C` : "—"}</dd>
              </div>
              <div>
                <dt>Độ ẩm</dt>
                <dd>{sample?.humidityPercent != null ? `${sample.humidityPercent.toFixed(1)}%` : "—"}</dd>
              </div>
              <div>
                <dt>Trạng thái vật lý</dt>
                <dd>{operationalLabels[item.resource.operationalStatus] || item.resource.operationalStatus}</dd>
              </div>
              <div>
                <dt>Nguồn</dt>
                <dd>{item.sourceHealth?.code || sample?.source || "Chưa có"}</dd>
              </div>
              <div>
                <dt>{item.sourceHealth?.reportedOnline === false ? <WifiOff size={13} /> : <Wifi size={13} />} Sức khỏe nguồn</dt>
                <dd>{item.sourceHealth ? `${item.sourceHealth.reportedOnline === false ? "OFFLINE" : "ONLINE"} · ${item.sourceHealth.freshness}` : "NO_DATA"}</dd>
              </div>
              <div>
                <dt>Lần thấy gần nhất</dt>
                <dd>{formatVietnamDateTime(item.sourceHealth?.lastSeenAt)}</dd>
              </div>
            </dl>

            {sample ? (
              <div className="telemetry-sample-meta">
                <Server size={13} />
                <span>Mẫu gần nhất: {formatVietnamDateTime(sample.sampledAt)}</span>
              </div>
            ) : (
              <p className="telemetry-no-data">
                Không có mẫu telemetry được chấp nhận. Hệ thống không suy diễn trạng thái khỏe mạnh.
              </p>
            )}

            {!!item.monitoring.reasons.length && (
              <ul className="telemetry-reasons">
                {item.monitoring.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            )}

            <p className="data-source-note">
              Ngưỡng nhiệt cảnh báo {item.thresholds.values.temperatureWarningC}°C
              ({item.thresholds.sourceByField.temperatureWarningC}); stale sau {item.thresholds.values.staleMinutes} phút.
            </p>

            {!!item.activeAlerts.length && (
              <div className="content-stack compact" aria-label="Cảnh báo giám sát đang hoạt động">
                {item.activeAlerts.map((alert) => (
                  <div className={`alert telemetry-alert-detail ${alert.severity === "CRITICAL" ? "danger" : "warning"}`} key={alert.id}>
                    <strong>{alert.severity} · {alert.ruleCode}</strong>
                    <span>{alert.message}</span>
                    <small>{alert.status}{alert.incident ? ` · Incident ${alert.incident.id}` : ""}</small>
                  </div>
                ))}
              </div>
            )}

            {!!item.history?.length && (
              <details className="telemetry-history">
                <summary>Lịch sử mẫu đã chấp nhận</summary>
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
