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

export function NotificationCenter({ notifications = [], onChanged }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const unread = useMemo(
    () => notifications.filter((notification) => !notification.readAt),
    [notifications]
  );

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
          <p className="eyebrow">THÔNG BÁO CÁ NHÂN</p>
          <h1 id="notification-center-heading">Trung tâm thông báo</h1>
          <p className="section-description">
            Kết quả phê duyệt, lịch sắp tới và nhắc hoàn trả được lấy từ dữ liệu đã lưu của tài khoản hiện tại.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={!unread.length || busy === "all"}
          onClick={markAllRead}
        >
          <CheckCheck size={16} />
          {busy === "all" ? "Đang cập nhật..." : "Đánh dấu tất cả đã đọc"}
        </button>
      </div>

      {error && <div className="alert danger" role="alert">{error}</div>}

      <div className="operational-summary-grid">
        <div className="card operational-summary-card">
          <span><Bell size={15} /> Tổng thông báo</span>
          <strong>{notifications.length}</strong>
        </div>
        <div className="card operational-summary-card">
          <span><Clock3 size={15} /> Chưa đọc</span>
          <strong>{unread.length}</strong>
        </div>
      </div>

      {!notifications.length ? (
        <div className="empty-state">
          <CheckCircle2 size={30} />
          <p>Chưa có thông báo nào được gửi tới tài khoản này.</p>
        </div>
      ) : (
        <div className="content-stack">
          {notifications.map((notification) => (
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
                  <time dateTime={notification.sentAt || notification.createdAt}>
                    {formatVietnamDateTime(notification.sentAt || notification.createdAt)} (giờ Việt Nam)
                  </time>
                </div>
                {!notification.readAt && (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={busy === notification.id}
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
