import { translate, localizeNotification } from "../i18n.js";
import React from "react";
import { ArrowRight, Bell, CalendarDays, CheckCircle2, Clock3, GraduationCap, Package, Search, ShieldAlert, Wrench } from "lucide-react";
import { formatVietnamDateTime } from "../utils/timezone";
import type { BookingRecord } from "../types/booking";
import "../styles/lab-workspace.css";
import "../styles/workspace-home.css";

interface Props {
  user: { id: string; fullName: string; role: string }; locale?: string; bookings: BookingRecord[];
  notifications: { id: string; title: string; message: string; readAt?: string; createdAt: string }[];
  incidents?: { status: string }[]; trainings?: unknown; loading: boolean; error: string;
  onNavigate: (tab: string) => void; onSearch: (query: string) => void; onRetry: () => void;
}
export function WorkspaceHome({ user, locale = "vi", bookings, notifications, incidents = [], loading, error, onNavigate, onSearch, onRetry }: Props) {
  const t = translate;
  const staff = ["ADMIN", "LAB_STAFF"].includes(user.role);
  const rows = staff ? bookings : bookings.filter(row => row.requestedById === user.id);
  const now = Date.now();
  const pending = rows.filter(row => row.status === "PENDING_APPROVAL");
  const due = rows.filter(row => row.status === "CHECKED_OUT");
  const overdue = due.filter(row => new Date(row.endAt).getTime() < now);
  const inspection = rows.filter(row => row.status === "RETURNED");
  const open = incidents.filter(row => !["resolved", "closed"].includes(row.status.toLowerCase()));
  const upcoming = rows.filter(row => ["CONFIRMED", "CHECKED_OUT"].includes(row.status) && new Date(row.endAt).getTime() > now).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const recent = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const roleLabels: Record<string, string> = { ADMIN: t("ui.administrator_d00831ec"), LAB_STAFF: t("ui.lab_staff_38b791e1"), LECTURER: t("ui.lecturer_948c8824"), STUDENT: t("ui.student_1b487b2d") };
  const attention = [
    { count: overdue.length, label: t("ui.overdue_returns_f7213a5e"), hint: t("ui.coordinate_and_record_returns_a544f526"), tab: "bookings", icon: Clock3, tone: "danger" },
    { count: pending.length, label: t("ui.pending_approval_9aa55303"), hint: staff ? t("ui.review_requests_before_approval_44710608") : t("ui.await_the_lab_approval_outcome_44ab84e0"), tab: "bookings", icon: CalendarDays, tone: "warning" },
    { count: staff ? inspection.length : due.length, label: staff ? t("ui.awaiting_inspection_f0eeafc7") : t("ui.currently_in_use_a07a3647"), hint: staff ? t("ui.record_condition_and_complete_handover_99c57542") : t("ui.prepare_to_return_on_time_33bd5e8b"), tab: "bookings", icon: Package, tone: "neutral" },
    { count: open.length, label: t("ui.open_incidents_a8d69cb9"), hint: staff ? t("ui.review_and_resolve_within_lab_5255478b") : t("ui.track_your_incident_reports_a9ca53ce"), tab: "incidents", icon: ShieldAlert, tone: "danger" },
  ];
  const tools = staff ? [
    { icon: Wrench, tab: "maintenance", label: t("ui.maintenance_and_calibration_fa8ebcfe"), detail: t("ui.jobs_and_affected_bookings_1a3c11ef") },
    { icon: Package, tab: "stock", label: t("ui.materials_inventory_2b570ac6"), detail: t("ui.receipts_issues_and_stock_counts_1053c2c9") },
  ] : [
    { icon: GraduationCap, tab: "teaching", label: t("ui.course_groups_73951b09"), detail: t("ui.prepare_and_follow_practical_sessions_f512cfdc") },
    { icon: CheckCircle2, tab: "profile", label: t("ui.profile_and_access_prerequisites_86cad20e"), detail: t("ui.review_details_and_training_certificates_38af6347") },
  ];
  return <section className="lab-workspace lab-home workspace-home" aria-labelledby="workspace-title">
    <header className="lab-page-heading home-welcome"><div><span className="workspace-overline">{roleLabels[user.role]} · {t("ui.workspace_970a97e3")}</span><h1 id="workspace-title">{t("ui.hello_23e5ef1f", { value0: user.fullName })}</h1><p>{staff ? t("ui.coordinate_the_lab_in_one_dadcb250") : t("ui.prepare_for_your_next_session_839502a7")}</p></div><button className="primary-button" onClick={() => onNavigate(staff ? "bookings" : "smart_calendar")}><CalendarDays size={18} aria-hidden="true" />{staff ? t("ui.manage_bookings_00990fbd") : t("ui.new_booking_f5bfb823")}</button></header>
    <form className="workspace-search" onSubmit={event => { event.preventDefault(); onSearch(String(new FormData(event.currentTarget).get("query") || "").trim()); }}><Search size={20} aria-hidden="true" /><label className="sr-only" htmlFor="workspace-search">{t("ui.find_a_resource_2d5d3f8f")}</label><input type="search" id="workspace-search" name="query" placeholder={t("ui.find_a_room_equipment_or_7f069e3a")} maxLength={120} /><button className="secondary-button">{t("ui.search_c0d7668a")}<ArrowRight size={16} aria-hidden="true" /></button></form>
    {loading ? <div className="home-loading" role="status"><span>{t("ui.updating_lab_bookings_and_work_2fb264e9")}</span><div className="home-skeleton-grid" aria-hidden="true">{[0, 1, 2, 3].map(id => <div key={id} />)}</div></div> : error ? <div className="home-error" role="alert"><ShieldAlert size={22} aria-hidden="true" /><div><strong>{t("ui.some_data_could_not_be_b3c64fc0")}</strong><p>{t("ui.retry_to_view_current_figures_7a0ac5df")}</p></div><button className="secondary-button" onClick={onRetry}>{t("ui.retry_c58d068c")}</button></div> : <>
      <section className="home-attention"><div className="lab-section-heading"><h2>{t("ui.needs_attention_c5b5ff20")}</h2><span className="home-scope">{staff ? t("ui.within_your_assigned_scope_c99d4968") : t("ui.your_records_b5eced58")}</span></div><div className="home-attention-grid">{attention.map(({ count, label, hint, tab, icon: Icon, tone }) => <button key={label} className={`home-attention-card ${count > 0 ? `has-items tone-${tone}` : ""}`} onClick={() => onNavigate(tab)}><span className="home-attention-top"><Icon size={18} aria-hidden="true" /><ArrowRight size={16} aria-hidden="true" /></span><strong>{count}</strong><span className="home-attention-label">{label}</span><small>{hint}</small></button>)}</div></section>
      <div className="home-main-grid"><section className="home-panel home-sessions"><div className="lab-section-heading"><div><span className="workspace-overline">{t("ui.session_schedule_a7eb1b6e")}</span><h2>{t("ui.coming_up_eab75df9")}</h2></div><button className="table-action" onClick={() => onNavigate("smart_calendar")}>{t("ui.open_calendar_08968508")}<ArrowRight size={16} aria-hidden="true" /></button></div>
        {upcoming.length ? <div className="home-session-list">{upcoming.slice(0, 5).map(row => <button key={row.id} className="home-session" onClick={() => onNavigate("bookings")}><span className="home-session-icon"><CalendarDays size={21} aria-hidden="true" /></span><span className="home-session-info"><strong>{row.resource?.name || row.title}</strong><time dateTime={row.startAt}>{formatVietnamDateTime(row.startAt)} — {formatVietnamDateTime(row.endAt)}</time><small>{row.title}{staff && row.requestedBy?.fullName ? ` · ${row.requestedBy.fullName}` : ""}</small><span className="home-next-action">{row.status === "CHECKED_OUT" ? t("ui.next_record_condition_and_return_730cf243") : t("ui.next_verify_prerequisites_and_hand_ffc6a200")}</span></span><span className={`home-booking-state ${row.status === "CHECKED_OUT" ? "in-use" : ""}`}>{row.status === "CHECKED_OUT" ? t("ui.in_use_a07a3647") : t("ui.confirmed_e72d13e3")}</span><ArrowRight size={16} aria-hidden="true" /></button>)}</div> : <div className="home-empty"><CalendarDays size={32} aria-hidden="true" /><h3>{t("ui.no_upcoming_sessions_2031bbe6")}</h3><p>{staff ? t("ui.confirmed_bookings_will_appear_here_d7b5f849") : t("ui.start_by_finding_a_suitable_99444143")}</p><button className="secondary-button" onClick={() => onNavigate("resources")}>{t("ui.browse_rooms_and_equipment_b594b1de")}<ArrowRight size={16} aria-hidden="true" /></button></div>}
      </section><aside className="home-panel home-tools"><span className="workspace-overline">{t("ui.quick_access_ec400fed")}</span><h2>{t("ui.related_work_1b038ae5")}</h2>{tools.map(({ icon: Icon, tab, label, detail }) => <button className="home-tool" key={tab} onClick={() => onNavigate(tab)}><Icon size={20} aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span><ArrowRight size={16} aria-hidden="true" /></button>)}<button className="home-tool" onClick={() => onNavigate("incidents")}><ShieldAlert size={20} aria-hidden="true" /><span><strong>{t("ui.report_an_incident_0527866e")}</strong><small>{t("ui.record_issues_and_track_their_cd3c9dc4")}</small></span><ArrowRight size={16} aria-hidden="true" /></button><div className="home-guidance"><CheckCircle2 size={18} aria-hidden="true" /><p>{t("ui.a_confirmed_booking_does_not_56351c91")}</p></div></aside></div>
      <section className="home-panel home-notices"><div className="lab-section-heading"><div><span className="workspace-overline">{t("ui.your_updates_f1ad5769")}</span><h2>{t("ui.recent_notifications_d9359233")}</h2></div><button className="table-action" onClick={() => onNavigate("escalations")}>{t("ui.view_all_44aeb8cb")}<ArrowRight size={16} aria-hidden="true" /></button></div>{recent.length ? <div className="home-notice-list">{recent.map(row => <button key={row.id} className="home-notice" onClick={() => onNavigate("escalations")}><Bell size={18} aria-hidden="true" /><span><strong>{row.title}{!row.readAt && <span className="home-unread">{t("ui.new_0c09ff84")}</span>}</strong><span>{row.message}</span><time dateTime={row.createdAt}>{formatVietnamDateTime(row.createdAt)}</time></span><ArrowRight size={16} aria-hidden="true" /></button>)}</div> : <p className="home-notices-empty">{t("ui.no_notifications_yet_booking_outcomes_7656d6fd")}</p>}</section>
      <p className="home-time-note">{t("ui.times_shown_in_vietnam_time_9f55afd9")}</p>
    </>}
  </section>;
}
