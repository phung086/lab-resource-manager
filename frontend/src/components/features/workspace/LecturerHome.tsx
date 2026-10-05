import React from "react";
import { ArrowRight, CalendarDays, ClipboardCheck, GraduationCap, ShieldCheck } from "lucide-react";
import { translate as t } from "../../../i18n.js";
import { BookingList, EmptyState, GroupCards, PriorityTiles, QuickLink, SectionTitle } from "./HomeComponents";
import { ownBookings, upcomingBookings } from "./homeSelectors";
import type { RoleHomeProps } from "./homeTypes";

export function LecturerHome(props: RoleHomeProps) {
  const { onNavigate, onCalendar } = props;
  const rows = ownBookings(props), upcoming = upcomingBookings(rows);
  return <><section className="home-role-banner home-academic-banner"><div><span className="workspace-overline">{t("ui.home.lecturer.eyebrow")}</span><h2>{t("ui.home.lecturer.title")}</h2><p>{t("ui.home.lecturer.description")}</p><div className="home-banner-actions"><button className="primary-button" onClick={() => onNavigate("teaching")}><GraduationCap size={19} aria-hidden="true" />{t("ui.home.lecturer.openGroups")}<ArrowRight size={17} aria-hidden="true" /></button><button className="secondary-button" onClick={() => onCalendar()}><CalendarDays size={18} aria-hidden="true" />{t("ui.home.lecturer.book")}</button></div></div><div className="home-academic-note"><ClipboardCheck size={32} strokeWidth={1.4} aria-hidden="true" /><h3>{t("ui.home.lecturer.reviewTitle")}</h3><p>{t("ui.home.lecturer.reviewHint")}</p></div></section>
    <PriorityTiles items={[
      { count: rows.filter(row => row.status === "CONFIRMED").length, label: "ui.home.lecturer.confirmedCount", hint: "ui.home.lecturer.upcomingHint", icon: CalendarDays, onClick: () => onNavigate("bookings", { filter: "CONFIRMED" }) },
      { count: rows.filter(row => row.status === "PENDING_APPROVAL").length, label: "ui.home.lecturer.pendingCount", hint: "ui.home.lecturer.pendingHint", icon: ClipboardCheck, onClick: () => onNavigate("bookings", { filter: "PENDING_APPROVAL" }) }
    ]} />
    <section className="home-panel home-academic-groups"><SectionTitle eyebrow="ui.home.lecturer.groupsEyebrow" titleKey="ui.home.lecturer.groupsTitle" action="ui.home.groups.manage" onAction={() => onNavigate("teaching")} /><GroupCards {...props} /></section>
    <div className="home-content-split"><section className="home-panel"><SectionTitle titleKey="ui.home.lecturer.schedule" action="ui.home.openCalendar" onAction={() => onCalendar()} />{upcoming.length ? <BookingList rows={upcoming.slice(0, 4)} onNavigate={onNavigate} /> : <EmptyState titleKey="ui.home.lecturer.emptySchedule" detail="ui.home.lecturer.emptyHint" action="ui.home.lecturer.book" onAction={() => onCalendar()} />}</section><aside className="home-panel"><SectionTitle titleKey="ui.home.lecturer.prepare" /><QuickLink icon={CalendarDays} titleKey="ui.home.lecturer.findResources" detail="ui.home.lecturer.resourceHint" onClick={() => onNavigate("resources")} /><QuickLink icon={ShieldCheck} titleKey="ui.home.profile" detail="ui.home.profileHint" onClick={() => onNavigate("profile")} /><div className="home-context-note"><ClipboardCheck size={20} aria-hidden="true" /><p>{t("ui.home.lecturer.academicScope")}</p></div></aside></div>
  </>;
}
