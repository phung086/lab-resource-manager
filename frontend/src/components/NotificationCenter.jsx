import { translate, localizeNotification } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React, { useMemo, useState } from "react";
import { Bell, CheckCheck, CheckCircle2, Clock3 } from "lucide-react";

import { apiRequest } from "../api.js";
import { formatVietnamDateTime } from "../utils/timezone.js";

const notificationTypeLabels = {
  BOOKING_APPROVED: "ui.booking_approved_fbab3009",
  BOOKING_REJECTED: "ui.booking_rejected_7d50d88b",
  BOOKING_UPCOMING: "ui.upcoming_booking_65fe3d5f",
  RETURN_REMINDER: "ui.return_reminder_92b7e4bb"
};

export function NotificationCenter({ notifications = [], onChanged, loading = false, loadError = "", onOpenBookings }) {
  const { tr } = useLocale();
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const unread = useMemo(
    () => notifications.filter((notification) => !notification.readAt),
    [notifications]
  );

  const visible = (filter === "unread" ? unread : notifications).map(localizeNotification);

  async function markRead(id) {
    setError("");
    setBusy(id);
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "POST" });
      await onChanged?.();
    } catch (requestError) {
      setError(requestError?.message || "ui.could_not_update_notification_e051a61d");
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
      setError(requestError?.message || "ui.could_not_mark_all_notifications_d0e09155");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="content-stack" aria-labelledby="notification-center-heading">
      <div className="page-section-header">
        <div>
          <h1 id="notification-center-heading">{tr("ui.notifications_0c951eef")}</h1>
          <p className="section-description">
            {tr("ui.track_booking_requests_handovers_returns_dee086d6")}</p>
        </div>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={!unread.length || Boolean(busy)}
          onClick={markAllRead}
        >
          <CheckCheck size={16} />
          {busy === "all" ? tr("ui.updating_01c0991e") : tr("ui.mark_all_as_read_4b943674")}
        </button>
      </div>

      {error && <div className="alert danger" role="alert">{translate(error)}</div>}

      <div className="notification-toolbar"><div className="operations-filter-row" role="group" aria-label={tr("ui.filter_notifications_3694490f")}><button className={filter === "all" ? "is-active" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{tr("ui.all_7c980cbd")}{notifications.length})</button><button className={filter === "unread" ? "is-active" : ""} aria-pressed={filter === "unread"} onClick={() => setFilter("unread")}>{tr("ui.unread_dd566c9d")}{unread.length})</button></div>{onOpenBookings && <button className="secondary-button" onClick={onOpenBookings}>{tr("ui.open_bookings_a9348073")}</button>}</div>

      {loading ? <p className="empty-state" role="status">{tr("ui.loading_notifications_cc8a441b")}</p> : loadError ? <div className="empty-state"><p>{tr("ui.could_not_load_notifications_ba2db1e3")}</p><button className="secondary-button" onClick={onChanged}>{tr("ui.retry_c58d068c")}</button></div> : !visible.length ? (
        <div className="empty-state">
          <CheckCircle2 size={30} />
          <p>{filter === "unread" ? tr("ui.you_re_all_caught_up_0fa21c8c") : tr("ui.no_notifications_have_been_sent_1de73fa4")}</p>
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
                    {tr(notificationTypeLabels[notification.type]) || tr("ui.system_notification_72387b29")}
                  </span>
                  <h2>{notification.title || tr("ui.notifications_a9b656f5")}</h2>
                  <p>{notification.message}</p>
                  {notification.messageParams?.bookingId && <a className="btn btn-secondary" href={`#/workspace/booking?booking=${encodeURIComponent(notification.messageParams.bookingId)}`}>{tr("ui.view_related_booking_af785d42")}</a>}
                  <time dateTime={notification.sentAt || notification.createdAt}>
                    {formatVietnamDateTime(notification.sentAt || notification.createdAt)} {tr("ui.vietnam_time_896f6f2f")}</time>
                </div>
                {!notification.readAt && (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => markRead(notification.id)}
                  >
                    {busy === notification.id ? tr("ui.saving_2b5c2a46") : tr("ui.mark_read_2e5a0c72")}
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
