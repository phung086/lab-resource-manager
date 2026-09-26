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
  const operations = mode === "operations";
  const [actionError, setActionError] = useState("");
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  if (!dashboard) {
    return (
      <section className="content-stack">
        <div className="empty-state">
          <Activity size={28} />
          <p>{loading ? "Đang tải dữ liệu vận hành..." : "Không thể tải dashboard từ dữ liệu hệ thống."}</p>
          {onRefresh && <button className="btn btn-secondary" type="button" onClick={onRefresh}>Thử lại</button>}
        </div>
      </section>
    );
  }

  const metrics = [
    { label: "Tổng tài nguyên", value: dashboard.summary.totalResources, icon: Server },
    { label: "Booking đang hoạt động", value: dashboard.summary.activeBookingsCount, icon: CalendarClock },
    { label: "Sự cố đang mở", value: dashboard.summary.openIncidentCount, icon: AlertTriangle },
    { label: "Thông báo chưa đọc", value: dashboard.summary.unreadNotifications, icon: Bell }
  ];

  async function acknowledge(alertId: string) {
    setAcknowledgingId(alertId);
    setActionError("");
    try {
      await acknowledgeMonitoringAlert(alertId);
      onRefresh?.();
    } catch (error: any) {
      setActionError(error?.message || "Không thể xác nhận cảnh báo.");
    } finally {
      setAcknowledgingId(null);
    }
  }

  return (
    <section className="content-stack" aria-labelledby="monitoring-dashboard-heading">
      <div className="page-section-header">
        <div>
          <h1 id="monitoring-dashboard-heading">{operations ? "Bảng điều khiển vận hành" : "Giám sát telemetry"}</h1>
          <p className="section-description">
            {operations ? "Theo dõi lịch đặt, bàn giao, mức sử dụng và sự cố từ hồ sơ đã lưu trong hệ thống." : "Theo dõi mẫu đo và kết nối nguồn cảm biến. Chưa nhận được mẫu hợp lệ sẽ hiển thị Chưa có dữ liệu."}
          </p>
          <p className="data-source-note">{operations ? "Nguồn: booking, thời điểm bàn giao/hoàn trả và sự cố trong cơ sở dữ liệu." : "Nguồn: thiết bị hoặc exporter gửi dữ liệu qua API tiếp nhận có xác thực; chỉ mẫu được chấp nhận mới hiển thị."} Cập nhật: {formatVietnamDateTime(dashboard.generatedAt)}.</p>
        </div>
        {onRefresh && <button className="btn btn-secondary" type="button" onClick={onRefresh} disabled={loading}>{loading ? "Đang cập nhật..." : "Cập nhật"}</button>}
      </div>

      {operations && <div className="operational-summary-grid">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div className="card operational-summary-card" key={label}>
            <span><Icon size={15} /> {label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>}

      {actionError && <div className="alert danger" role="alert">{actionError}</div>}

      {operations && <div className="dashboard-data-grid">
        <article className="card dashboard-data-panel">
          <div className="panel-heading">
            <Gauge size={17} />
            <h2>Mức sử dụng 30 ngày</h2>
          </div>
          <dl className="operational-evidence-grid">
            <div><dt>Theo lịch đã đặt</dt><dd>{dashboard.utilization.scheduledUtilizationRate.toFixed(2)}%</dd></div>
            <div><dt>Sử dụng thực tế</dt><dd>{dashboard.utilization.actualUtilizationRate.toFixed(2)}%</dd></div>
            <div><dt>Phút đã lên lịch</dt><dd>{dashboard.utilization.scheduledMinutes}</dd></div>
            <div><dt>Phút sử dụng thực tế</dt><dd>{dashboard.utilization.actualUsageMinutes}</dd></div>
          </dl>
          <p className="data-source-note">Nguồn: {dashboard.utilization.source}; cửa sổ {dashboard.utilization.windowDays} ngày.</p>
        </article>

        <article className="card dashboard-data-panel">
          <div className="panel-heading">
            <AlertTriangle size={17} />
            <h2>Sự cố</h2>
          </div>
          <dl className="operational-evidence-grid">
            <div><dt>Tổng</dt><dd>{dashboard.incidents.total}</dd></div>
            <div><dt>Đang mở</dt><dd>{dashboard.incidents.open}</dd></div>
            <div><dt>Nghiêm trọng</dt><dd>{dashboard.incidents.bySeverity.critical || 0}</dd></div>
            <div><dt>Mức cao</dt><dd>{dashboard.incidents.bySeverity.high || 0}</dd></div>
          </dl>
        </article>
      </div>}

      {!operations && <>
      <div className="card dashboard-data-panel">
        <div className="panel-heading">
          <Activity size={17} />
          <h2>Trạng thái telemetry</h2>
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
          <h2>Cảnh báo giám sát đã lưu</h2>
        </div>
        {dashboard.monitoringAlerts.length ? (
          <div className="content-stack compact">
            {dashboard.monitoringAlerts.map((alert) => (
              <div className="dashboard-booking-row" key={alert.id}>
                <div>
                  <strong>{alert.severity} · {alert.ruleCode}</strong>
                  <span>{alert.resourceCode || alert.resourceId} · {alert.message}</span>
                  {alert.incident && <span>Incident: {alert.incident.id} ({alert.incident.status})</span>}
                </div>
                <div>
                  <span>{alert.status}</span>
                  <time dateTime={alert.lastObservedAt}>{formatVietnamDateTime(alert.lastObservedAt)}</time>
                  {alert.status === "OPEN" && (
                    <button className="btn btn-secondary" type="button" disabled={acknowledgingId === alert.id} onClick={() => acknowledge(alert.id)}>
                      {acknowledgingId === alert.id ? "Đang xác nhận..." : "Xác nhận"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : <div className="empty-state">Không có cảnh báo giám sát đang hoạt động.</div>}
      </div>

      <TelemetryStatusGrid telemetry={dashboard.telemetry} />

      <div className="card dashboard-data-panel">
        <div className="panel-heading">
          <Camera size={17} />
          <h2>Camera và hỗ trợ cảnh báo an toàn</h2>
        </div>
        <div className="alert warning">
          <strong>NON-CERTIFIED · NOT A FIRE ALARM</strong>
          <span>Không thay thế hệ thống báo cháy vật lý, quy trình an toàn hoặc xác minh của con người.</span>
        </div>
        {dashboard.cameras.length ? (
          <div className="content-stack compact">
            {dashboard.cameras.map((camera) => (
              <div className="dashboard-booking-row" key={camera.id}>
                <div><strong>{camera.code} — {camera.name}</strong><span>Metadata phạm vi tài nguyên {camera.resourceId}</span></div>
                <div><span>{camera.state}</span><small>{camera.enabled ? "Đã bật cấu hình" : "Tắt theo mặc định"}</small></div>
              </div>
            ))}
          </div>
        ) : <div className="empty-state">NOT_CONFIGURED — Không có camera được cấu hình; không tạo luồng video giả.</div>}
      </div>

      </>}
      {operations && <div className="card dashboard-data-panel">
        <div className="panel-heading">
          <CalendarClock size={17} />
          <h2>Booking sắp tới</h2>
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
        ) : <div className="empty-state">Không có booking hoạt động trong phạm vi hiện tại.</div>}
      </div>}
    </section>
  );
};
