import { translate } from "../i18n.js";
import React, { useState } from 'react';
import { ArrowRight, CalendarDays, FlaskConical, Menu, ShieldCheck, X, Wrench, GraduationCap } from 'lucide-react';
import { PublicResourceCatalog } from './PublicResourceCatalog';
import { useLocale } from '../providers/LocaleProvider';
import '../styles/public-landing.css';

type Props = {
  children?: React.ReactNode; scheduleContent?: React.ReactNode; userName?: string;
  onLocaleChange: (locale: string) => void; onRegister: () => void;
  onViewSchedule: (id: string) => void; onGuestBookingComplete?: (result: any) => void;
  onWorkspace?: () => void; onLogout?: () => void;
};
export function PublicLanding({ children, scheduleContent, userName, onLocaleChange, onRegister, onViewSchedule, onGuestBookingComplete, onWorkspace, onLogout }: Props) {
  const { locale, t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = [['tai-nguyen', t("ui.rooms_equipment_89c1fa9a")], ['kiem-tra-lich', t("ui.check_schedule_a393bfd5")], ['quy-trinh', t("ui.how_it_works_dd37bc66")]];
  const steps = [
    [t("ui.find_your_resource_8849f4e1"), t("ui.review_the_room_or_equipment_bebfc545")],
    [t("ui.check_availability_book_4be3a774"), t("ui.choose_a_time_and_purpose_7f7f382f")],
    [t("ui.handover_practice_e5f14d58"), t("ui.verify_access_requirements_and_record_e057a14e")],
    [t("ui.return_complete_be58ea70"), t("ui.record_the_condition_after_use_1b6d452f")]
  ];
  return <div className="public-site lab-public" id="dau-trang">
    <a className="public-skip" href="#noi-dung">{t("ui.skip_to_main_content_a75d7c33")}</a>
    <header className="public-header">
      <a className="public-brand" href="#dau-trang" aria-label={translate("ui.lab_resource_manager_14ae2231")}><FlaskConical aria-hidden="true" /><span>{translate("ui.lab_7a62e3ac")}<span>{translate("ui.resource_manager_ae0bb64a")}</span></span></a>
      <button className="public-menu" aria-expanded={menuOpen} aria-controls="public-nav" aria-label={t("ui.toggle_navigation_dcc375f3")} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      <nav id="public-nav" className={menuOpen ? 'is-open' : ''} aria-label={t("ui.main_navigation_84d2467a")}>
        {navigation.map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}
      </nav>
      <div className="public-account-actions"><div className="public-language" role="group" aria-label={t("ui.language_f1231b2c")}>{(['vi', 'en'] as const).map(value => <button key={value} aria-pressed={value === locale} lang={value} onClick={() => onLocaleChange(value)}>{value.toUpperCase()}</button>)}</div>
        {userName ? <button className="public-login" onClick={onWorkspace}>{t("ui.workspace_970a97e3")} <ArrowRight size={16} aria-hidden="true" /></button> : <a className="public-login" href="#dang-nhap">{t("ui.sign_in_9a402bdf")} <ArrowRight size={16} aria-hidden="true" /></a>}
      </div>
    </header>
    <main id="noi-dung">
      <section className="public-hero public-container" id="gioi-thieu">
        <div className="lab-hero-copy"><h1>{t("ui.make_room_for_7f71d981")}<br /><span>{t("ui.discovery_be305085")}</span></h1>
          <p>{t("ui.laboratory_rooms_equipment_and_schedules_02a7f9e3")}</p>
          <div className="public-actions"><a className="public-primary" href="#tai-nguyen">{t("ui.explore_resources_8a2576a1")} <ArrowRight size={18} aria-hidden="true" /></a><a className="public-secondary" href="#kiem-tra-lich"><CalendarDays size={18} aria-hidden="true" />{t("ui.check_schedule_a393bfd5")}</a></div>
          <p className="public-small"><ShieldCheck size={17} aria-hidden="true" />{t("ui.the_right_resource_time_and_e6fbe069")}</p>
        </div>
        <figure className="lab-process-plate" aria-label={t("ui.lab_access_workflow_355870ba")}>
          <div className="lab-plate-heading"><FlaskConical size={26} aria-hidden="true" /><strong>{t("ui.from_an_idea_to_a_62857717")}</strong></div>
          <ol>{steps.map(([title], i) => <li key={title}><span className="lab-step-number">0{i + 1}</span><span>{title}</span><ArrowRight size={18} aria-hidden="true" /></li>)}</ol>
          <figcaption>{t("ui.scheduling_access_requirements_handover_history_c61622df")}</figcaption>
        </figure>
      </section>
      <section className="public-resources public-section" id="tai-nguyen"><div className="public-container"><div className="public-section-heading"><h2>{t("ui.choose_where_to_begin_7779bbb3")}</h2><p>{t("ui.browse_rooms_and_equipment_review_6eb416ab")}</p></div><PublicResourceCatalog onViewSchedule={onViewSchedule} onGuestBookingComplete={onGuestBookingComplete} /></div></section>
      <section className="public-section public-container lab-schedule-section" id="kiem-tra-lich" aria-labelledby="schedule-heading"><div className="public-section-heading"><h2 id="schedule-heading">{t("ui.check_schedule_a393bfd5")}</h2><p>{t("ui.review_pending_tasks_and_confirmed_a5a63125")}</p></div>
        {scheduleContent || <div className="lab-schedule-signin"><CalendarDays size={32} aria-hidden="true" /><div><h3>{t("ui.your_schedule_and_tasks_3176f86a")}</h3><p>{t("ui.sign_in_for_your_personal_674f82a6")}</p></div><a className="public-primary" href="#dang-nhap">{t("ui.sign_in_to_view_schedule_2c49c97e")} <ArrowRight size={17} aria-hidden="true" /></a></div>}
      </section>
      <section className="public-section lab-workflow-section" id="quy-trinh"><div className="public-container"><div className="public-section-heading"><h2>{t("ui.prepare_with_clarity_1004c10a")}<br />{t("ui.work_with_confidence_ea53f305")}</h2><p>{t("ui.each_step_has_a_responsible_48e9ccbd")}</p></div><ol className="public-workflow">{steps.map(([title, description], i) => <li key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol></div></section>
      <section className="public-section public-container lab-responsibilities" id="vai-tro"><div><h2>{t("ui.work_together_in_the_lab_25bff5ce")}</h2><p>{t("ui.clear_responsibilities_and_access_boundaries_5233c5c5")}</p></div><div className="public-feature-list">
        <article><GraduationCap aria-hidden="true" /><div><h3>{t("ui.students_lecturers_8bc2019d")}</h3><p>{t("ui.students_submit_practical_activities_to_eeed48d8")}</p></div></article>
        <article><Wrench aria-hidden="true" /><div><h3>{t("ui.lab_staff_38b791e1")}</h3><p>{t("ui.approve_bookings_manage_handovers_record_50c396cb")}</p></div></article>
        <article><ShieldCheck aria-hidden="true" /><div><h3>{t("ui.administrator_d00831ec")}</h3><p>{t("ui.manage_resources_inventory_accounts_laboratory_eebeca30")}</p></div></article>
      </div></section>
      {children && <section id="dang-nhap" className="public-auth" aria-label={t("ui.sign_in_9a402bdf")}>{children}</section>}
    </main>
    <footer className="public-footer public-container"><div><a className="public-brand" href="#dau-trang"><FlaskConical aria-hidden="true" /><span>{translate("ui.lab_7a62e3ac")}<span>{translate("ui.resource_manager_ae0bb64a")}</span></span></a><p>{t("ui.shared_resources_for_learning_and_7893ada0")}</p></div><div><strong>{t("ui.explore_ee8893ff")}</strong><a href="#tai-nguyen">{t("ui.rooms_equipment_89c1fa9a")}</a><a href="#kiem-tra-lich">{t("ui.check_schedule_a393bfd5")}</a><a href="#quy-trinh">{t("ui.how_it_works_dd37bc66")}</a></div><div><strong>{t("ui.account_09128ce8")}</strong>{userName ? <><button onClick={onWorkspace}>{userName}</button><button onClick={onLogout}>{t("ui.sign_out_c9e0facd")}</button></> : <><a href="#dang-nhap">{t("ui.sign_in_9a402bdf")}</a><button onClick={onRegister}>{t("ui.create_account_32dde41a")}</button></>}<a href="#vai-tro">{t("ui.roles_responsibilities_57ea3a82")}</a></div><p className="public-footer-note">{translate("ui.lab_resource_manager_d1e37a5a")} {t("ui.graduation_project_reference_media_is_83960334")}</p></footer>
  </div>;
}
