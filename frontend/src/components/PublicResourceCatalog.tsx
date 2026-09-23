import React, { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, DoorOpen, Microscope, Play, RefreshCw } from "lucide-react";
import { apiRequest } from "../api.js";
import { GuestQuickBookingPanel } from "./GuestQuickBookingPanel";
import "../styles/public-catalog.css";

type Media = { id: string; kind: "IMAGE" | "VIDEO"; url: string; title: string; altText: string; sourceUrl?: string; credit?: string; license?: string };
type Resource = { id: string; code: string; name: string; description?: string; category?: string; location: string; capacity: number; bookingState: string; operationalStatus: string; media?: Media[]; laboratory?: { name: string }; effectiveRequiresApproval: boolean; manufacturer?: string; model?: string };
type ScheduleBlock = { id: string; status?: string; kind?: string; title?: string; startAt: string; endAt: string };
type SchedulePayload = { bookings: ScheduleBlock[]; maintenanceWindows: ScheduleBlock[] };
const categoryLabels: Record<string, string> = { ROOM: "Phòng LAB", EQUIPMENT: "Thiết bị", MACHINE: "Máy móc", EXPERIMENT_KIT: "Bộ thí nghiệm" };
const bookingBlockStatuses = new Set(["PENDING_APPROVAL", "CONFIRMED", "CHECKED_OUT", "RETURNED"]);
const statusLabels: Record<string, string> = { PENDING_APPROVAL: "Chờ duyệt", CONFIRMED: "Đã xác nhận", CHECKED_OUT: "Đang sử dụng", RETURNED: "Đã trả" };

function formatRange(startAt: string, endAt: string) {
  const dateFormat = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return `${dateFormat.format(new Date(startAt))} - ${dateFormat.format(new Date(endAt))}`;
}

export function PublicResourceCatalog({ onViewSchedule, onGuestBookingComplete }: { onViewSchedule: (id: string) => void; onGuestBookingComplete?: (result: any) => void }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [schedule, setSchedule] = useState<SchedulePayload | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    apiRequest("/resources").then((rows: Resource[]) => { if (active) setResources(rows.filter(row => ["ROOM", "EQUIPMENT", "MACHINE", "EXPERIMENT_KIT"].includes(row.category || "") && row.operationalStatus !== "RETIRED")); })
      .catch((cause: Error) => { if (active) setError(cause.message || "Không tải được danh mục tài nguyên."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  const visible = filter === "ALL" ? resources : resources.filter(row => row.category === filter);
  async function openDetails(row: Resource) {
    setSelected(row);
    setSchedule(null);
    setScheduleError("");
    setScheduleLoading(true);
    const now = new Date();
    const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const [detailResult, scheduleResult] = await Promise.allSettled([
      apiRequest(`/resources/${encodeURIComponent(row.id)}`),
      apiRequest(`/resources/${encodeURIComponent(row.id)}/schedule?from=${encodeURIComponent(now.toISOString())}&to=${encodeURIComponent(end.toISOString())}`)
    ]);
    if (detailResult.status === "fulfilled") setSelected(detailResult.value);
    if (scheduleResult.status === "fulfilled") setSchedule(scheduleResult.value);
    if (scheduleResult.status === "rejected") setScheduleError("Chưa tải được lịch bận của tài nguyên này.");
    setScheduleLoading(false);
    requestAnimationFrame(() => document.getElementById("chi-tiet-tai-nguyen")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  const busyBookings = (schedule?.bookings || []).filter(row => row.status && bookingBlockStatuses.has(row.status)).slice(0, 6);
  const busyMaintenance = (schedule?.maintenanceWindows || []).slice(0, 4);
  return <div className="public-live-catalog">
    <div className="catalog-head"><div><h3>Khám phá phòng và thiết bị</h3><p>Danh mục lấy từ hệ thống. Ảnh/video có ghi nguồn là tư liệu minh họa, không phải hình tài sản thực tế của dự án.</p></div><button type="button" onClick={() => setRevision(value => value + 1)} aria-label="Tải lại danh mục"><RefreshCw size={17} /></button></div>
    <div className="catalog-filters" role="group" aria-label="Lọc tài nguyên">{[["ALL", "Tất cả"], ["ROOM", "Phòng LAB"], ["EQUIPMENT", "Thiết bị"], ["MACHINE", "Máy móc"], ["EXPERIMENT_KIT", "Bộ thí nghiệm"]].map(([code, label]) => <button key={code} type="button" aria-pressed={filter === code} onClick={() => setFilter(code)}>{label}</button>)}</div>
    {loading && <p role="status">Đang tải phòng và thiết bị…</p>}
    {error && <div className="catalog-message" role="alert">{error} <button type="button" onClick={() => setRevision(value => value + 1)}>Thử lại</button></div>}
    {!loading && !error && visible.length === 0 && <p className="catalog-message">Chưa có tài nguyên trong nhóm này.</p>}
    <div className="catalog-grid">{visible.map(row => {
      const image = row.media?.find(item => item.kind === "IMAGE");
      return <article key={row.id} className="catalog-card">
        <button type="button" className="catalog-cover" onClick={() => void openDetails(row)} aria-label={`Xem chi tiết ${row.name}`}>
          {image ? <img src={image.url} alt={image.altText} loading="lazy" /> : <span className="catalog-placeholder">{row.category === "ROOM" ? <DoorOpen size={50} /> : <Microscope size={50} />}<small>Chưa có ảnh minh họa</small></span>}
        </button>
        <div className="catalog-card-body"><span>{categoryLabels[row.category || ""] || row.category} · {row.code}</span><h4>{row.name}</h4><p>{row.location}</p><button type="button" onClick={() => void openDetails(row)}>Xem chi tiết <ArrowRight size={16} /></button></div>
      </article>;
    })}</div>
    {selected && <section className="catalog-detail" id="chi-tiet-tai-nguyen" aria-labelledby="catalog-detail-title">
      <div className="catalog-detail-heading"><div><span>{categoryLabels[selected.category || ""]} · {selected.code}</span><h3 id="catalog-detail-title">{selected.name}</h3><p>{selected.laboratory?.name || selected.location}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Đóng chi tiết">Đóng</button></div>
      <div className="catalog-detail-layout"><div className="catalog-media-gallery">
        {selected.media?.length ? selected.media.map(item => <figure key={item.id}>{item.kind === "VIDEO" ? <video controls preload="metadata" src={item.url} aria-label={item.altText} /> : <img src={item.url} alt={item.altText} loading="lazy" />}<figcaption><strong>{item.title}</strong><span>Hình/video minh họa · {item.credit || "Nguồn được quản trị viên cung cấp"} {item.license && `· ${item.license}`}</span>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Xem nguồn</a>}</figcaption></figure>) : <div className="catalog-no-media"><Play size={34} /><p>Chưa có ảnh hoặc video được xác minh nguồn cho tài nguyên này.</p></div>}
      </div><div className="catalog-facts"><p>{selected.description || "Thông tin mô tả sẽ được cập nhật bởi cán bộ LAB."}</p><dl><div><dt>Địa điểm</dt><dd>{selected.location}</dd></div><div><dt>Sức chứa / số lượng</dt><dd>{selected.capacity}</dd></div><div><dt>Phê duyệt</dt><dd>{selected.effectiveRequiresApproval ? "Cần cán bộ LAB duyệt" : "Xác nhận theo chính sách"}</dd></div>{selected.model && <div><dt>Model</dt><dd>{selected.model}</dd></div>}</dl>
        <div className="catalog-schedule"><div><strong>Lịch bận 14 ngày tới</strong><span>Ẩn thông tin người đặt; hệ thống kiểm tra lại khi gửi booking.</span></div>
          {scheduleLoading && <p role="status">Đang tải lịch bận…</p>}
          {scheduleError && <p role="alert">{scheduleError}</p>}
          {!scheduleLoading && !scheduleError && busyBookings.length === 0 && busyMaintenance.length === 0 && <p>Chưa có khung bận hoặc bảo trì trong khoảng này.</p>}
          <ul>{busyBookings.map(row => <li key={`booking-${row.id}`}><span>{statusLabels[row.status || ""] || row.status}</span><strong>{formatRange(row.startAt, row.endAt)}</strong></li>)}{busyMaintenance.map(row => <li key={`maintenance-${row.id}`}><span>{row.kind || "Bảo trì"}</span><strong>{formatRange(row.startAt, row.endAt)}</strong></li>)}</ul>
        </div>
        <p>Phí sử dụng được tính theo tài nguyên và mục đích ở bước đặt lịch.</p><button type="button" className="public-primary" onClick={() => onViewSchedule(selected.id)}><CalendarDays size={18} /> Đăng nhập để đặt lịch nội bộ <ArrowRight size={17} /></button>{onGuestBookingComplete && <GuestQuickBookingPanel resource={selected} onComplete={onGuestBookingComplete} />}</div></div>
    </section>}
  </div>;
}
