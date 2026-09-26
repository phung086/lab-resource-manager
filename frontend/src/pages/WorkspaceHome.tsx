import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Bell,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  RotateCcw,
  Search,
  Server,
  ShieldAlert,
  Users
} from "lucide-react";
import { BookingStatusBadge } from "../components/BookingStatusBadge";
import { formatVietnamDateTime } from "../utils/timezone";
import type { BookingRecord } from "../types/booking";
import "../styles/workspace-home.css";

interface Props {
  user: { id: string; fullName: string; role: string; passwordResetRequired?: boolean };
  bookings: BookingRecord[];
  notifications: { id: string; title: string; message: string; readAt?: string; createdAt: string }[];
  incidents?: any[];
  trainings?: { courses: any[]; certifications: any[] };
  loading: boolean;
  error: string;
  onNavigate: (tab: string) => void;
  onSearch: (query: string) => void;
  onRetry: () => void;
}

export function WorkspaceHome({
  user,
  bookings,
  notifications,
  incidents = [],
  trainings,
  loading,
  error,
  onNavigate,
  onSearch,
  onRetry
}: Props) {
  const staff = ["ADMIN", "LAB_STAFF"].includes(user.role);
  const userRows = staff ? bookings : bookings.filter((b) => b.requestedById === user.id);
  const now = Date.now();

  // 1. Upcoming booking (CONFIRMED, CHECKED_OUT, or PENDING with future end)
  const upcoming = userRows
    .filter((b) =>
      staff
        ? ["PENDING_APPROVAL", "CONFIRMED", "CHECKED_OUT"].includes(b.status) && new Date(b.endAt).getTime() > now
        : ["CONFIRMED", "CHECKED_OUT"].includes(b.status) && new Date(b.endAt).getTime() > now
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  // 2. Approval / payment required
  const pendingApprovals = userRows.filter((b) => b.status === "PENDING_APPROVAL");

  // 3. Training / access problem
  const userCerts = trainings?.certifications || [];
  const expiredCerts = userCerts.filter((c: any) => c.status === "EXPIRED" || c.status === "REVOKED");
  const validCerts = userCerts.filter((c: any) => c.status === "VALID");

  // 4. Return due (CHECKED_OUT in physical usage or RETURNED awaiting check)
  const returnsDue = userRows
    .filter((b) => ["CHECKED_OUT", "RETURNED"].includes(b.status))
    .sort((a, b) => a.endAt.localeCompare(b.endAt));

  // 5. Incident / action required (open incidents)
  const openIncidents = incidents.filter((i) => !["RESOLVED", "CLOSED"].includes(i.status));

  // 6. Recent notifications
  const recentNotifications = [...notifications]
    .sort((a, b) => (a.readAt ? 1 : 0) - (b.readAt ? 1 : 0) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <section className="workspace-home content-stack" aria-labelledby="workspace-title">
      <header className="workspace-welcome">
        <div>
          <h1 id="workspace-title">
            {staff
              ? user.role === "ADMIN"
                ? "Tổng quan quản trị Open LAB"
                : "Không gian điều phối vận hành LAB"
              : `Chào ${user.fullName}`}
          </h1>
          <p>
            {staff
              ? "Theo dõi tiến trình phê duyệt, điều phối bàn giao, kiểm định thiết bị và giám sát an toàn."
              : user.role === "LECTURER"
              ? "Chuẩn bị tài nguyên phòng thí nghiệm phục vụ giảng dạy, nghiên cứu và theo dõi phê duyệt."
              : "Quản lý lịch thực hành, theo dõi phê duyệt và chuẩn bị điều kiện an toàn phòng lab."}
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => onNavigate(user.role === "ADMIN" ? "users" : staff ? "bookings" : "smart_calendar")}
        >
          <CalendarDays size={17} aria-hidden="true" />
          {user.role === "ADMIN" ? "Quản lý người dùng" : staff ? "Mở hàng đợi xử lý" : "Xem lịch và đặt chỗ"}
        </button>
      </header>

      <form
        className="workspace-search"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(String(new FormData(event.currentTarget).get("query") || ""));
        }}
      >
        <Search size={20} aria-hidden="true" />
        <label className="sr-only" htmlFor="workspace-search">Tìm tài nguyên</label>
        <input
          id="workspace-search"
          name="query"
          maxLength={120}
          placeholder="Tìm phòng, máy móc, bộ kit thí nghiệm hoặc mã tài nguyên…"
        />
        <button className="secondary-button" type="submit">
          Tìm tài nguyên <ArrowRight size={16} aria-hidden="true" />
        </button>
      </form>

      {loading ? (
        <div className="empty-state" role="status">Đang tổng hợp dữ liệu điều phối và lịch đặt…</div>
      ) : error ? (
        <div className="empty-state" role="alert">
          <p>Chưa thể tổng hợp dữ liệu của bạn.</p>
          <button className="secondary-button" onClick={onRetry}>Thử lại</button>
        </div>
      ) : (
        <div className="workspace-action-queue">
          {/* 1. UPCOMING BOOKING */}
          <article
            className={`action-priority-card ${upcoming.length ? "priority-info" : "priority-neutral"}`}
            aria-labelledby="priority-upcoming-title"
          >
            <div className="action-card-header">
              <div className="action-card-title">
                <CalendarDays size={20} />
                <h2 id="priority-upcoming-title">1. Lịch sắp tới của bạn</h2>
              </div>
              <span className="priority-badge p3">Ưu tiên 1</span>
            </div>

            <div className="action-card-body">
              {upcoming.length ? (
                upcoming.slice(0, 3).map((booking) => (
                  <div className="action-booking-item" key={booking.id}>
                    <div className="action-booking-info">
                      <strong>{booking.resource?.name || booking.title}</strong>
                      <time dateTime={booking.startAt}>
                        {formatVietnamDateTime(booking.startAt)} — {formatVietnamDateTime(booking.endAt)}
                      </time>
                      <small>Mục đích: {booking.title || "Thực hành / Thí nghiệm"}</small>
                    </div>
                    <div className="action-booking-actions">
                      <BookingStatusBadge status={booking.status} />
                      <button
                        className="secondary-button btn-sm"
                        onClick={() => onNavigate("bookings")}
                      >
                        Chi tiết <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="action-empty-state">
                  <p>Không có lịch đặt sắp tới trong thời gian gần.</p>
                  <button className="secondary-button btn-sm" onClick={() => onNavigate("smart_calendar")}>
                    Đặt lịch mới
                  </button>
                </div>
              )}
            </div>
          </article>

          <div className="workspace-actions-grid">
            {/* 2. APPROVAL / PAYMENT REQUIRED */}
            <article
              className={`action-priority-card ${pendingApprovals.length ? "priority-warning" : "priority-neutral"}`}
              aria-labelledby="priority-approval-title"
            >
              <div className="action-card-header">
                <div className="action-card-title">
                  <Clock size={20} />
                  <h2 id="priority-approval-title">2. Chờ phê duyệt & Thanh toán</h2>
                </div>
                <span className={`priority-badge ${pendingApprovals.length ? "p2" : "p-neutral"}`}>
                  {pendingApprovals.length} yêu cầu
                </span>
              </div>

              <div className="action-card-body">
                {pendingApprovals.length ? (
                  <>
                    <div className="action-alert-box alert-warning">
                      <p>
                        {staff
                          ? `Có ${pendingApprovals.length} yêu cầu đặt lịch đang chờ cán bộ phòng lab phê duyệt.`
                          : `Bạn có ${pendingApprovals.length} yêu cầu đặt lịch đang chờ cán bộ lab xét duyệt.`}
                      </p>
                    </div>
                    <button className="secondary-button btn-sm" onClick={() => onNavigate("bookings")}>
                      {staff ? "Mở hàng đợi phê duyệt" : "Xem tiến trình duyệt"} <ArrowRight size={14} />
                    </button>
                  </>
                ) : (
                  <p className="action-empty-state">Tất cả yêu cầu đã được xử lý xong, không có lịch chờ duyệt.</p>
                )}
              </div>
            </article>

            {/* 3. TRAINING / ACCESS PROBLEM */}
            <article
              className={`action-priority-card ${expiredCerts.length ? "priority-urgent" : "priority-neutral"}`}
              aria-labelledby="priority-training-title"
            >
              <div className="action-card-header">
                <div className="action-card-title">
                  <Award size={20} />
                  <h2 id="priority-training-title">3. Điều kiện an toàn & Chứng chỉ LAB</h2>
                </div>
                <span className={`priority-badge ${expiredCerts.length ? "p1" : "p-neutral"}`}>
                  {expiredCerts.length ? "Cảnh báo" : "Hợp lệ"}
                </span>
              </div>

              <div className="action-card-body">
                {expiredCerts.length > 0 ? (
                  <div className="action-alert-box alert-danger">
                    <ShieldAlert size={18} />
                    <div>
                      <strong>Bạn có chứng nhận an toàn đã hết hạn!</strong>
                      <p>Cần hoàn thành khóa cập nhật trước khi đặt lại thiết bị yêu cầu chứng chỉ.</p>
                    </div>
                  </div>
                ) : validCerts.length > 0 ? (
                  <div className="action-alert-box alert-success">
                    <CheckCircle2 size={18} />
                    <div>
                      <strong>Đủ điều kiện an toàn</strong>
                      <p>Tài khoản có {validCerts.length} chứng chỉ an toàn đang còn hiệu lực.</p>
                    </div>
                  </div>
                ) : (
                  <div className="action-alert-box alert-warning">
                    <p>Chưa có chứng chỉ đào tạo an toàn. Một số thiết bị chuyên dụng sẽ yêu cầu chứng nhận trước khi cấp phép.</p>
                  </div>
                )}
                <button className="secondary-button btn-sm" onClick={() => onNavigate("training")}>
                  Xem danh mục đào tạo an toàn <ArrowRight size={14} />
                </button>
              </div>
            </article>
          </div>

          <div className="workspace-actions-grid">
            {/* 4. RETURN DUE */}
            <article
              className={`action-priority-card ${returnsDue.length ? "priority-warning" : "priority-neutral"}`}
              aria-labelledby="priority-return-title"
            >
              <div className="action-card-header">
                <div className="action-card-title">
                  <RotateCcw size={20} />
                  <h2 id="priority-return-title">4. Bàn giao & Hoàn trả thiết bị</h2>
                </div>
                <span className={`priority-badge ${returnsDue.length ? "p2" : "p-neutral"}`}>
                  {returnsDue.length} thiết bị
                </span>
              </div>

              <div className="action-card-body">
                {returnsDue.length ? (
                  returnsDue.slice(0, 2).map((item) => {
                    const isOverdue = new Date(item.endAt).getTime() < now;
                    return (
                      <div className="action-booking-item" key={item.id}>
                        <div className="action-booking-info">
                          <strong>{item.resource?.name || item.title}</strong>
                          <time dateTime={item.endAt}>
                            Hạn trả: {formatVietnamDateTime(item.endAt)}
                          </time>
                          {isOverdue && <span className="priority-badge p1">Quá hạn hoàn trả</span>}
                        </div>
                        <BookingStatusBadge status={item.status} />
                      </div>
                    );
                  })
                ) : (
                  <p className="action-empty-state">Hiện tại không có thiết bị mượn nào cần hoàn trả.</p>
                )}
                {returnsDue.length > 0 && (
                  <button className="secondary-button btn-sm" onClick={() => onNavigate("bookings")}>
                    Theo dõi hoàn trả <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </article>

            {/* 5. INCIDENT / ACTION REQUIRED */}
            <article
              className={`action-priority-card ${openIncidents.length ? "priority-urgent" : "priority-neutral"}`}
              aria-labelledby="priority-incident-title"
            >
              <div className="action-card-header">
                <div className="action-card-title">
                  <AlertTriangle size={20} />
                  <h2 id="priority-incident-title">5. Sự cố & Yêu cầu xử lý</h2>
                </div>
                <span className={`priority-badge ${openIncidents.length ? "p1" : "p-neutral"}`}>
                  {openIncidents.length} sự cố
                </span>
              </div>

              <div className="action-card-body">
                {openIncidents.length ? (
                  <div className="action-alert-box alert-warning">
                    <AlertTriangle size={18} />
                    <div>
                      <strong>Có {openIncidents.length} sự cố đang được xử lý</strong>
                      <p>Kiểm tra tình trạng thiết bị bị gián đoạn hoạt động trước khi sử dụng.</p>
                    </div>
                  </div>
                ) : (
                  <p className="action-empty-state">Không có sự cố nào đang mở trong phạm vi của bạn.</p>
                )}
                <button className="secondary-button btn-sm" onClick={() => onNavigate("incidents")}>
                  Báo cáo / Theo dõi sự cố <ArrowRight size={14} />
                </button>
              </div>
            </article>
          </div>

          {/* 6. NOTIFICATIONS */}
          <article className="action-priority-card priority-neutral" aria-labelledby="priority-notices-title">
            <div className="action-card-header">
              <div className="action-card-title">
                <Bell size={20} />
                <h2 id="priority-notices-title">6. Thông báo mới nhất</h2>
              </div>
              <button className="table-action" onClick={() => onNavigate("escalations")}>
                Xem tất cả <ArrowRight size={14} />
              </button>
            </div>

            <div className="action-card-body">
              {recentNotifications.length ? (
                recentNotifications.map((notice) => (
                  <div className="action-booking-item" key={notice.id}>
                    <div className="action-booking-info">
                      <strong>
                        {!notice.readAt && <span className="unread-dot" aria-label="Chưa đọc" />}
                        {notice.title}
                      </strong>
                      <small>{notice.message}</small>
                    </div>
                    <time dateTime={notice.createdAt} className="text-xs text-slate-500">
                      {formatVietnamDateTime(notice.createdAt)}
                    </time>
                  </div>
                ))
              ) : (
                <p className="action-empty-state">Chưa có thông báo mới.</p>
              )}
            </div>
          </article>
        </div>
      )}

      <nav className="workspace-shortcuts" aria-label="Lối tắt công việc">
        <button onClick={() => onNavigate("resources")}>
          <Server size={18} aria-hidden="true" />
          <span>Danh mục tài nguyên</span>
          <ArrowRight size={15} aria-hidden="true" />
        </button>
        <button onClick={() => onNavigate(staff ? "monitoring" : "incidents")}>
          <CalendarCheck size={18} aria-hidden="true" />
          <span>{staff ? "Giám sát và cảnh báo" : "Báo cáo sự cố"}</span>
          <ArrowRight size={15} aria-hidden="true" />
        </button>
        {user.role === "ADMIN" && (
          <button onClick={() => onNavigate("users")}>
            <Users size={18} aria-hidden="true" />
            <span>Người dùng và phân công lab</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        )}
      </nav>
    </section>
  );
}
