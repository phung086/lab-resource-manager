import React from 'react';
import { ArrowRight, CalendarDays, Search, Wrench, Package, GraduationCap, ShieldAlert } from 'lucide-react';
import { formatVietnamDateTime } from '../utils/timezone';
import type { BookingRecord } from '../types/booking';
import '../styles/lab-workspace.css';
import '../styles/workspace-home.css';

interface Props {
  user: { id: string; fullName: string; role: string }; locale?: string; bookings: BookingRecord[];
  notifications: { id: string; title: string; message: string; readAt?: string; createdAt: string }[];
  incidents?: { status: string }[]; trainings?: unknown; loading: boolean; error: string;
  onNavigate: (tab: string) => void; onSearch: (query: string) => void; onRetry: () => void;
}
export function WorkspaceHome({ user, locale = 'vi', bookings, notifications, incidents = [], loading, error, onNavigate, onSearch, onRetry }: Props) {
  const t = (vi: string, en: string) => locale === 'en' ? en : vi;
  const staff = ['ADMIN', 'LAB_STAFF'].includes(user.role);
  const rows = staff ? bookings : bookings.filter(row => row.requestedById === user.id);
  const now = Date.now();
  const pending = rows.filter(row => row.status === 'PENDING_APPROVAL');
  const overdue = rows.filter(row => row.status === 'CHECKED_OUT' && new Date(row.endAt).getTime() < now);
  const inspection = rows.filter(row => row.status === 'RETURNED');
  const open = incidents.filter(row => !['resolved', 'closed'].includes(row.status.toLowerCase()));
  const upcoming = rows.filter(row => ['CONFIRMED', 'CHECKED_OUT'].includes(row.status) && new Date(row.endAt).getTime() > now).sort((a,b) => a.startAt.localeCompare(b.startAt)).slice(0,6);
  const recent = [...notifications].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,3);
  const links = staff ? [{icon:Wrench,tab:'maintenance',label:t('Bảo trì và hiệu chuẩn','Maintenance and calibration')},{icon:Package,tab:'stock',label:t('Nhập xuất vật tư','Material receipts and issues')}] : [{icon:GraduationCap,tab:'teaching',label:t('Lớp học phần của tôi','My course groups')}];
  return <section className="lab-workspace lab-home" aria-labelledby="workspace-title">
    <header className="lab-page-heading"><div><h1 id="workspace-title">{staff ? t('Điều phối phòng thí nghiệm', 'Laboratory coordination') : t(`Chào ${user.fullName}`, `Hello ${user.fullName}`)}</h1><p>{staff ? t('Xử lý yêu cầu, kiểm tra bàn giao và theo dõi công việc trong phạm vi LAB của bạn.', 'Process requests, review handovers and track work within your laboratory scope.') : t('Tìm đúng tài nguyên, chuẩn bị buổi thực hành và theo dõi lịch đã xác nhận.', 'Find the right resource, prepare your practical session and track confirmed bookings.')}</p></div><button className="primary-button" onClick={() => onNavigate(staff ? 'bookings' : 'smart_calendar')}><CalendarDays size={17} aria-hidden="true" />{staff ? t('Xử lý lịch đặt', 'Manage bookings') : t('Đặt lịch sử dụng', 'Book a resource')}</button></header>
    <form className="workspace-search" onSubmit={event => { event.preventDefault(); onSearch(String(new FormData(event.currentTarget).get('query') || '').trim()); }}><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="workspace-search">{t('Tìm tài nguyên', 'Find a resource')}</label><input id="workspace-search" name="query" placeholder={t('Tên phòng, thiết bị hoặc mã tài nguyên', 'Room, equipment name or resource code')} maxLength={120} /><button className="secondary-button">{t('Tra cứu', 'Search')}</button></form>
    {loading ? <p role="status">{t('Đang tải dữ liệu LAB…', 'Loading LAB data…')}</p> : error ? <div role="alert"><p>{t('Chưa tải được dữ liệu. Thử lại trước khi đưa ra quyết định.', 'Data could not be loaded. Retry before taking action.')}</p><button onClick={onRetry}>{t('Thử lại', 'Retry')}</button></div> : <>
    <section className="lab-worklist"><h2>{t('Cần theo dõi', 'Needs attention')}</h2><div className="lab-attention-grid">
      {[[overdue.length, t('Quá hạn trả', 'Overdue returns'), 'bookings'], [pending.length, t('Chờ duyệt', 'Pending approval'), 'bookings'], [inspection.length, t('Chờ kiểm tra sau trả', 'Awaiting inspection'), 'bookings'], [open.length, t('Sự cố đang mở', 'Open incidents'), 'incidents']].map(([count,label,tab]) => <button key={label} onClick={() => onNavigate(String(tab))}><span>{label}</span><strong>{count}</strong><ArrowRight size={16} aria-hidden="true" /></button>)}
    </div></section>
    <div className="lab-home-columns"><section className="lab-schedule"><div className="lab-section-heading"><h2>{t('Lịch đã xác nhận sắp tới', 'Upcoming confirmed sessions')}</h2><button className="table-action" onClick={() => onNavigate('smart_calendar')}>{t('Mở lịch', 'Open calendar')} <ArrowRight size={15} aria-hidden="true" /></button></div>
      {upcoming.length ? upcoming.map(row => <button key={row.id} className="lab-session-row" onClick={() => onNavigate('bookings')}><span><strong>{row.resource?.name || row.title}</strong><time dateTime={row.startAt}>{formatVietnamDateTime(row.startAt)} — {formatVietnamDateTime(row.endAt)}</time><small>{row.title}</small></span><span className="lab-status">{row.status === 'CHECKED_OUT' ? t('Đang sử dụng','In use') : t('Đã xác nhận','Confirmed')}</span><ArrowRight size={16} aria-hidden="true" /></button>) : <div className="lab-empty"><p>{t('Chưa có lịch đã xác nhận trong thời gian tới.', 'No upcoming confirmed bookings.')}</p><button className="secondary-button" onClick={() => onNavigate('resources')}>{t('Tra cứu phòng và thiết bị', 'Browse rooms and equipment')}</button></div>}
    </section><aside className="lab-home-tools"><h2>{t('Công việc liên quan', 'Related work')}</h2>{links.map(({icon:Icon,tab,label}) => <button key={tab} onClick={() => onNavigate(tab)}><Icon size={18} aria-hidden="true" /><span>{label}</span><ArrowRight size={15} aria-hidden="true" /></button>)}<button onClick={() => onNavigate('incidents')}><ShieldAlert size={18} aria-hidden="true" /><span>{t('Báo cáo và theo dõi sự cố', 'Report and track incidents')}</span><ArrowRight size={15} aria-hidden="true" /></button><p>{t('Giờ hiển thị: Việt Nam (UTC+07:00). Chỉ lịch đã xác nhận mới đủ điều kiện xem xét bàn giao.', 'Times are in Vietnam (UTC+07:00). Only confirmed bookings are eligible for handover checks.')}</p></aside></div>
    <section className="lab-home-notices"><div className="lab-section-heading"><h2>{t('Thông báo gần đây', 'Recent notifications')}</h2><button className="table-action" onClick={() => onNavigate('escalations')}>{t('Xem tất cả', 'View all')}</button></div>{recent.length ? recent.map(row => <article className="lab-ledger-row" key={row.id}><strong>{row.title}</strong><p>{row.message}</p><small>{formatVietnamDateTime(row.createdAt)}</small></article>) : <p className="lab-empty">{t('Chưa có thông báo.', 'No notifications yet.')}</p>}</section>
    </>}
  </section>;
}
