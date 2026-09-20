import React from "react";
import { Activity, AlertTriangle, Bell, CalendarClock, Gauge, Server } from "lucide-react";
import { TelemetryStatusGrid } from "../../components/features/monitoring/TelemetryStatusGrid";
import type { DashboardPayload } from "../../types/telemetry";

interface Props {
  dashboard: DashboardPayload | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export const MonitoringDashboardPage: React.FC<Props> = ({ dashboard, loading = false, onRefresh }) => {
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

  return (
    <section className="content-stack" aria-labelledby="monitoring-dashboard-heading">
      <div className="page-section-header">
        <div>
          <p className="eyebrow">GIÁM SÁT TỪ DỮ LIỆU ĐƯỢC CHẤP NHẬN</p>
          <h1 id="monitoring-dashboard-heading">Bảng điều khiển vận hành</h1>
          <p className="section-description">
            KPI, sự cố và telemetry được tổng hợp trực tiếp từ PostgreSQL. Không có dữ liệu giả hoặc trạng thái khỏe mạnh suy diễn khi thiếu mẫu đo.
          </p>
        </div>
        {onRefresh && <button className="btn btn-secondary" type="button" onClick={onRefresh} disabled={loading}>{loading ? "Đang cập nhật..." : "Cập nhật"}</button>}
      </div>

      <div className="operational-summary-grid">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div className="card operational-summary-card" key={label}>
            <span><Icon size={15} /> {label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="dashboard-data-grid">
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
      </div>

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

      <TelemetryStatusGrid telemetry={dashboard.telemetry} />

      <div className="card dashboard-data-panel">
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
                  <time>{new Date(booking.startAt).toLocaleString("vi-VN")}</time>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="empty-state">Không có booking hoạt động trong phạm vi hiện tại.</div>}
      </div>
    </section>
  );
};
