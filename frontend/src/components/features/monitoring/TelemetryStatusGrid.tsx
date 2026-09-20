import React from "react";
import { Activity, AlertTriangle, Clock3, Radio, Server, Thermometer, WifiOff } from "lucide-react";
import type { TelemetryResourceView, TelemetryState } from "../../../types/telemetry";

const stateMeta: Record<TelemetryState, { label: string; icon: React.ElementType }> = {
  HEALTHY: { label: "Ổn định", icon: Activity },
  WARNING: { label: "Cảnh báo", icon: AlertTriangle },
  STALE: { label: "Dữ liệu cũ", icon: Clock3 },
  UNAVAILABLE: { label: "Không khả dụng", icon: WifiOff },
  NO_DATA: { label: "Chưa có dữ liệu", icon: Radio }
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
                <dd>{sample ? `${sample.temperatureC.toFixed(1)} °C` : "—"}</dd>
              </div>
              <div>
                <dt>Độ ẩm</dt>
                <dd>{sample ? `${sample.humidityPercent.toFixed(1)}%` : "—"}</dd>
              </div>
              <div>
                <dt>Trạng thái vật lý</dt>
                <dd>{item.resource.operationalStatus}</dd>
              </div>
              <div>
                <dt>Nguồn</dt>
                <dd>{sample?.source || "Chưa có"}</dd>
              </div>
            </dl>

            {sample ? (
              <div className="telemetry-sample-meta">
                <Server size={13} />
                <span>Mẫu gần nhất: {new Date(sample.sampledAt).toLocaleString("vi-VN")}</span>
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
          </article>
        );
      })}
    </div>
  );
};
