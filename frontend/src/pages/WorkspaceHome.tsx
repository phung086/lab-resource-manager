import React from "react";
import { ArrowRight, CalendarDays, Search, ClipboardCheck, Bell, Users, Server } from "lucide-react";
import { BookingStatusBadge } from "../components/BookingStatusBadge";
import { formatVietnamDateTime } from "../utils/timezone";
import type { BookingRecord } from "../types/booking";

interface Props {
  user: { id: string; fullName: string; role: string };
  bookings: BookingRecord[];
  notifications: { id: string; title: string; message: string; readAt?: string; createdAt: string }[];
  loading: boolean;
  error: string;
  onNavigate: (tab: string) => void;
  onSearch: (query: string) => void;
  onRetry: () => void;
}

export function WorkspaceHome({ user, bookings, notifications, loading, error, onNavigate, onSearch, onRetry }: Props) {
  const staff = ["ADMIN", "LAB_STAFF"].includes(user.role);
  const rows = staff ? bookings : bookings.filter(row => row.requestedById === user.id);
  const upcoming = rows.filter(row => staff ? ["PENDING_APPROVAL", "CHECKED_OUT", "RETURNED", "CONFIRMED"].includes(row.status) : ["CONFIRMED", "PENDING_APPROVAL", "CHECKED_OUT"].includes(row.status) && new Date(row.endAt).getTime() > Date.now()).sort((a, b) => {
    const priority = ["RETURNED", "PENDING_APPROVAL", "CHECKED_OUT", "CONFIRMED"];
    return (staff ? priority.indexOf(a.status) - priority.indexOf(b.status) : 0) || a.startAt.localeCompare(b.startAt);
  });
  const counts = [
    { status: "PENDING_APPROVAL", label: "Chờ duyệt", hint: staff ? "Xem yêu cầu cần xử lý" : "Đang chờ cán bộ lab xét duyệt" },
    { status: "CONFIRMED", label: "Chờ bàn giao", hint: "Lịch đã được xác nhận" },
    { status: "CHECKED_OUT", label: "Đang sử dụng", hint: "Theo dõi thời gian hoàn trả" },
    { status: "RETURNED", label: "Chờ hoàn tất", hint: "Đã trả tài nguyên cho cán bộ lab" }
  ];
  return <section className="workspace-home content-stack">
    <header className="workspace-welcome">
      <div><h1>{staff ? (user.role === "ADMIN" ? "Tổng quan quản trị" : "Không gian vận hành") : `Chào ${user.fullName}`}</h1>
        <p>{staff ? "Nắm tình hình, xử lý yêu cầu và theo dõi bàn giao trong phạm vi của bạn." : user.role === "LECTURER" ? "Chuẩn bị tài nguyên cho môn học và theo dõi lịch nghiên cứu của bạn." : "Tìm tài nguyên cho buổi thực hành tiếp theo và theo dõi lịch đặt của bạn."}</p></div>
      <button className="primary-button" onClick={() => onNavigate(user.role === "ADMIN" ? "users" : staff ? "bookings" : "smart_calendar")}><CalendarDays size={17} aria-hidden="true" />{user.role === "ADMIN" ? "Quản lý người dùng" : staff ? "Mở hàng đợi xử lý" : "Xem lịch và đặt chỗ"}</button>
    </header>
    <form className="workspace-search" onSubmit={event => { event.preventDefault(); onSearch(String(new FormData(event.currentTarget).get("query") || "")); }}>
      <Search size={20} aria-hidden="true" /><label className="sr-only" htmlFor="workspace-search">Tìm tài nguyên</label>
      <input id="workspace-search" name="query" maxLength={120} placeholder="Tìm phòng, thiết bị hoặc mã tài nguyên…" />
      <button className="secondary-button" type="submit">Tìm tài nguyên <ArrowRight size={16} aria-hidden="true" /></button>
    </form>
    {loading ? <div className="empty-state" role="status">Đang tải lịch đặt và thông báo…</div> : error ? <div className="empty-state"><p>Chưa thể tổng hợp dữ liệu của bạn.</p><button className="secondary-button" onClick={onRetry}>Thử lại</button></div> : <>
      <div className="workspace-status-strip" aria-label="Tiến trình lịch đặt">{counts.map(item => <button key={item.status} onClick={() => onNavigate("bookings")}><span>{item.label}</span><strong>{rows.filter(row => row.status === item.status).length}</strong><small>{item.hint}</small></button>)}</div>
      <div className="workspace-columns">
        <section className="panel workspace-upcoming"><div className="panel-heading"><h2>{staff ? "Lịch cần theo dõi" : "Lịch sắp tới của bạn"}</h2><button className="table-action" onClick={() => onNavigate("bookings")}>Xem tất cả <ArrowRight size={15} aria-hidden="true" /></button></div>
          {upcoming.length ? upcoming.slice(0, 5).map(row => <button className="workspace-booking-row" key={row.id} onClick={() => onNavigate("bookings")}><CalendarDays size={20} aria-hidden="true" /><span><strong>{row.resource?.name || row.title}</strong><time dateTime={row.startAt}>{formatVietnamDateTime(row.startAt)}</time><small>{row.title}</small></span><BookingStatusBadge status={row.status} /></button>) : <div className="empty-state"><CalendarDays size={30} aria-hidden="true" /><h3>Chưa có lịch sắp tới</h3><p>{staff ? "Các yêu cầu mới sẽ xuất hiện trong hàng đợi vận hành." : "Bắt đầu từ danh mục để tìm tài nguyên phù hợp với công việc của bạn."}</p><button className="secondary-button" onClick={() => onNavigate(staff ? "bookings" : "resources")}>{staff ? "Xem hàng đợi" : "Khám phá tài nguyên"}</button></div>}
        </section>
        <section className="panel workspace-notices"><div className="panel-heading"><h2>Thông báo gần đây</h2><Bell size={18} aria-hidden="true" /></div>{notifications.length ? notifications.slice(0, 3).map(row => <button className="workspace-notice" key={row.id} onClick={() => onNavigate("escalations")}><strong>{!row.readAt && <span className="unread-dot" aria-label="Chưa đọc" />}{row.title}</strong><p>{row.message}</p><time dateTime={row.createdAt}>{formatVietnamDateTime(row.createdAt)}</time></button>) : <p className="section-description">Chưa có thông báo. Kết quả duyệt và nhắc lịch sẽ xuất hiện tại đây.</p>}<button className="table-action" onClick={() => onNavigate("escalations")}>Mở trung tâm thông báo <ArrowRight size={15} aria-hidden="true" /></button></section>
      </div>
    </>}
    <nav className="workspace-shortcuts" aria-label="Lối tắt công việc">
      <button onClick={() => onNavigate("resources")}><Server size={18} aria-hidden="true" /><span>Danh mục tài nguyên</span><ArrowRight size={15} aria-hidden="true" /></button>
      <button onClick={() => onNavigate(staff ? "monitoring" : "incidents")}><ClipboardCheck size={18} aria-hidden="true" /><span>{staff ? "Giám sát và cảnh báo" : "Báo cáo sự cố"}</span><ArrowRight size={15} aria-hidden="true" /></button>
      {user.role === "ADMIN" && <button onClick={() => onNavigate("users")}><Users size={18} aria-hidden="true" /><span>Người dùng và phân công lab</span><ArrowRight size={15} aria-hidden="true" /></button>}
    </nav>
  </section>;
}
