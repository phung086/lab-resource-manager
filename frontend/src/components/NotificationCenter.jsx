import React, { useMemo, useState } from "react";
import { Bell, CheckCheck, CheckCircle2, Clock3 } from "lucide-react";

import { apiRequest } from "../api.js";
import { formatVietnamDateTime } from "../utils/timezone.js";

const notificationTypeLabels = {
  BOOKING_APPROVED: "Lịch đặt được duyệt",
  BOOKING_REJECTED: "Lịch đặt bị từ chối",
  BOOKING_UPCOMING: "Lịch sắp bắt đầu",
  RETURN_REMINDER: "Nhắc hoàn trả"
};

export function NotificationCenter({ notifications = [], onChanged, loading = false, loadError = "", onOpenBookings }) {
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const unread = useMemo(
    () => notifications.filter((notification) => !notification.readAt),
    [notifications]
  );

  const visible = filter === "unread" ? unread : notifications;

  async function markRead(id) {
    setError("");
    setBusy(id);
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "POST" });
      await onChanged?.();
    } catch (requestError) {
      setError(requestError?.message || "Không thể cập nhật thông báo.");
    } finally {
      setBusy("");
    }
  }

  async function markAllRead() {
    setError("");
    setBusy("all");
    try {
      await apiRequest("/notifications/read-all", { method: "POST" });
      await onChanged?.();
    } catch (requestError) {
      setError(requestError?.message || "Không thể đánh dấu tất cả thông báo.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="content-stack" aria-labelledby="notification-center-heading">
      <div className="page-section-header">
        <div>
          <h1 id="notification-center-heading">Trung tâm thông báo</h1>
          <p className="section-description">
            Theo dõi yêu cầu đặt lịch, bàn giao, hoàn trả và nhắc lịch trong phạm vi của bạn. Mở lịch đặt để xem tiến trình và bước tiếp theo.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={!unread.length || Boolean(busy)}
          onClick={markAllRead}
        >
          <CheckCheck size={16} />
          {busy === "all" ? "Đang cập nhật..." : "Đánh dấu tất cả đã đọc"}
        </button>
      </div>

      {error && <div className="alert danger" role="alert">{error}</div>}

      <div className="notification-toolbar"><div className="operations-filter-row" role="group" aria-label="Lọc thông báo"><button className={filter === "all" ? "is-active" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Tất cả ({notifications.length})</button><button className={filter === "unread" ? "is-active" : ""} aria-pressed={filter === "unread"} onClick={() => setFilter("unread")}>Chưa đọc ({unread.length})</button></div>{onOpenBookings && <button className="secondary-button" onClick={onOpenBookings}>Mở danh sách lịch đặt</button>}</div>

      {loading ? <p className="empty-state" role="status">Đang tải thông báo…</p> : loadError ? <div className="empty-state"><p>Chưa thể tải thông báo.</p><button className="secondary-button" onClick={onChanged}>Thử lại</button></div> : !visible.length ? (
        <div className="empty-state">
          <CheckCircle2 size={30} />
          <p>{filter === "unread" ? "Bạn đã đọc hết thông báo." : "Chưa có thông báo nào được gửi tới tài khoản này."}</p>
        </div>
      ) : (
        <div className="content-stack">
          {visible.map((notification) => (
            <article
              key={notification.id}
              className={`card notification-card ${notification.readAt ? "is-read" : "is-unread"}`}
            >
              <div className="notification-card__body">
                <div>
                  <span className={`status-badge notification-severity-${notification.severity || "info"}`}>
                    {notificationTypeLabels[notification.type] || "Thông báo hệ thống"}
                  </span>
                  <h2>{notification.title || "Thông báo"}</h2>
                  <p>{notification.message}</p>
                  {notification.messageParams?.bookingId && <a className="btn btn-secondary" href={`#/workspace/booking?booking=${encodeURIComponent(notification.messageParams.bookingId)}`}>Xem lịch đặt liên quan</a>}
                  <time dateTime={notification.sentAt || notification.createdAt}>
                    {formatVietnamDateTime(notification.sentAt || notification.createdAt)} (giờ Việt Nam)
                  </time>
                </div>
                {!notification.readAt && (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => markRead(notification.id)}
                  >
                    {busy === notification.id ? "Đang lưu..." : "Đã đọc"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
