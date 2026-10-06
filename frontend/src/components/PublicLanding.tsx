import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, ShieldCheck, Wrench, GraduationCap } from 'lucide-react';
import labHero from '../assets/lab-workbench-hero.webp';
import { PublicResourceCatalog } from './PublicResourceCatalog';
import { useLocale } from '../providers/LocaleProvider';
import { PublicShell } from './PublicShell';

type Props = {
  children?: React.ReactNode; scheduleContent?: React.ReactNode; userName?: string;
  onLocaleChange: (locale: string) => void; onRegister: () => void;
  onViewSchedule: (id: string) => void; onGuestBookingComplete?: (result: any) => void;
  onWorkspace?: () => void; onLogout?: () => void;
  initialSection?: string;
};
export function PublicLanding({ children, scheduleContent, userName, onRegister, onViewSchedule, onGuestBookingComplete, onWorkspace, initialSection }: Props) {
  const { t } = useLocale();
  const [catalogReady, setCatalogReady] = useState(false);
  const handleCatalogReady = useCallback(() => setCatalogReady(true), []);
  const sectionNavigation = useRef<{ cancelled: boolean; controller: AbortController | null }>({ cancelled: false, controller: null });
  useEffect(() => {
    if (!initialSection) return;
    const controller = new AbortController();
    sectionNavigation.current = { cancelled: false, controller };
    const cancelNavigation = () => {
      sectionNavigation.current.cancelled = true;
      controller.abort();
    };
    // A slow catalog must never take focus or scroll from an active user.
    for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focusin']) {
      document.addEventListener(event, cancelNavigation, { capture: true, passive: true, signal: controller.signal });
    }
    return () => controller.abort();
  }, [initialSection]);
  useEffect(() => {
    if (!initialSection || !catalogReady) return;
    const frame = requestAnimationFrame(() => {
      const navigation = sectionNavigation.current;
      if (navigation.cancelled) return;
      navigation.cancelled = true;
      navigation.controller?.abort();
      const destination = document.getElementById(initialSection);
      destination?.scrollIntoView({ block: 'start' });
      destination?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialSection, catalogReady]);
  const steps = [
    [t("ui.find_your_resource_8849f4e1"), t("ui.review_the_room_or_equipment_bebfc545")],
    [t("ui.check_availability_book_4be3a774"), t("ui.choose_a_time_and_purpose_7f7f382f")],
    [t("ui.handover_practice_e5f14d58"), t("ui.verify_access_requirements_and_record_e057a14e")],
    [t("ui.return_complete_be58ea70"), t("ui.record_the_condition_after_use_1b6d452f")]
  ];
  return <PublicShell onRegister={onRegister} userName={userName} onWorkspace={onWorkspace}>
      <section className="public-hero public-container" id="gioi-thieu">
        <div className="lab-hero-copy"><h1>{t("ui.make_room_for_7f71d981")}<br /><span>{t("ui.discovery_be305085")}</span></h1>
          <p>{t("ui.laboratory_rooms_equipment_and_schedules_02a7f9e3")}</p>
          <div className="public-actions"><a className="public-primary" href="#tai-nguyen">{t("ui.explore_resources_8a2576a1")} <ArrowRight size={18} aria-hidden="true" /></a><a className="public-secondary" href="#kiem-tra-lich"><CalendarDays size={18} aria-hidden="true" />{t("ui.check_schedule_a393bfd5")}</a></div>
          <p className="public-small"><ShieldCheck size={17} aria-hidden="true" />{t("ui.the_right_resource_time_and_e6fbe069")}</p>
        </div>
        <figure className="lab-hero-image">
          <img src={labHero} alt={t('ui.final.heroAlt')} width={1536} height={1024} fetchPriority="high" />
          <figcaption>{t('ui.final.heroCaption')}</figcaption>
        </figure>
      </section>
      <section className="public-resources public-section" id="tai-nguyen" tabIndex={-1}><div className="public-container"><div className="public-section-heading"><h2>{t("ui.choose_where_to_begin_7779bbb3")}</h2><p>{t("ui.browse_rooms_and_equipment_review_6eb416ab")}</p></div><PublicResourceCatalog onViewSchedule={onViewSchedule} onGuestBookingComplete={onGuestBookingComplete} onReady={handleCatalogReady} /></div></section>
      <section className="public-section public-container lab-schedule-section" id="kiem-tra-lich" tabIndex={-1} aria-labelledby="schedule-heading"><div className="public-section-heading"><h2 id="schedule-heading">{t("ui.check_schedule_a393bfd5")}</h2><p>{t("ui.review_pending_tasks_and_confirmed_a5a63125")}</p></div>
        {scheduleContent || <div className="lab-schedule-signin"><CalendarDays size={32} aria-hidden="true" /><div><h3>{t("ui.your_schedule_and_tasks_3176f86a")}</h3><p>{t("ui.sign_in_for_your_personal_674f82a6")}</p></div><a className="public-primary" href="#dang-nhap">{t("ui.sign_in_to_view_schedule_2c49c97e")} <ArrowRight size={17} aria-hidden="true" /></a></div>}
      </section>
      <section className="public-section lab-workflow-section" id="quy-trinh" tabIndex={-1}><div className="public-container"><div className="public-section-heading"><h2>{t("ui.prepare_with_clarity_1004c10a")}<br />{t("ui.work_with_confidence_ea53f305")}</h2><p>{t("ui.each_step_has_a_responsible_48e9ccbd")}</p></div><ol className="public-workflow">{steps.map(([title, description], i) => <li key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol></div></section>
      <section className="public-section public-container lab-responsibilities" id="vai-tro"><div><h2>{t("ui.work_together_in_the_lab_25bff5ce")}</h2><p>{t("ui.clear_responsibilities_and_access_boundaries_5233c5c5")}</p></div><div className="public-feature-list">
        <article><GraduationCap aria-hidden="true" /><div><h3>{t("ui.students_lecturers_8bc2019d")}</h3><p>{t("ui.students_submit_practical_activities_to_eeed48d8")}</p></div></article>
        <article><Wrench aria-hidden="true" /><div><h3>{t("ui.lab_staff_38b791e1")}</h3><p>{t("ui.approve_bookings_manage_handovers_record_50c396cb")}</p></div></article>
        <article><ShieldCheck aria-hidden="true" /><div><h3>{t("ui.administrator_d00831ec")}</h3><p>{t("ui.manage_resources_inventory_accounts_laboratory_eebeca30")}</p></div></article>
      </div></section>
      {children && <section id="dang-nhap" tabIndex={-1} className="public-auth" aria-label={t("ui.sign_in_9a402bdf")}>{children}</section>}
  </PublicShell>;
}
