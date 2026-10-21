import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, ShieldCheck, Wrench, GraduationCap, Search, Microscope, DoorOpen, CheckCircle } from 'lucide-react';
import labHero from '../assets/lab-workbench-hero-optimized.webp';
import labHeroSmall from '../assets/lab-workbench-hero-small.webp';
import { PublicResourceCatalog } from './PublicResourceCatalog';
import { useLocale } from '../providers/LocaleProvider';
import { PublicShell } from './PublicShell';
import { BenefitsVideo, AnnouncementStrip } from './features/LandingMedia';

type Props = {
  children?: React.ReactNode; scheduleContent?: React.ReactNode; userName?: string;
  onLocaleChange: (locale: string) => void; onRegister: () => void;
  onViewSchedule: (id: string) => void; onGuestBookingComplete?: (result: any) => void;
  onWorkspace?: () => void; onLogout?: () => void;
  initialSection?: string;
  page?: string;
  onNavigate?: (section: string) => void;
};

export function PublicLanding({ children, scheduleContent, userName, onRegister, onViewSchedule, onGuestBookingComplete, onWorkspace, initialSection, page = "home", onNavigate }: Props) {
  const { t } = useLocale();
  const [catalogReady, setCatalogReady] = useState(false);
  const handleCatalogReady = useCallback(() => setCatalogReady(true), []);
  const [motionPaused, setMotionPaused] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [documentHidden, setDocumentHidden] = useState(() => document.hidden);
  const sectionNavigation = useRef<{ cancelled: boolean; controller: AbortController | null }>({ cancelled: false, controller: null });
  const heroRef = useRef<HTMLElement>(null);

  // Automatic suspension does not change the user's pause preference.
  useEffect(() => {
    const heroEl = heroRef.current;
    if (!heroEl) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setHeroVisible(entry.isIntersecting);
    }, { threshold: 0.01 });
    const handleVisibility = () => setDocumentHidden(document.hidden);
    observer.observe(heroEl);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [page]);

  const effectiveMotionPaused = motionPaused || documentHidden || !heroVisible;

  useEffect(() => {
    if (!initialSection) return;
    const controller = new AbortController();
    sectionNavigation.current = { cancelled: false, controller };
    const cancelNavigation = () => {
      sectionNavigation.current.cancelled = true;
      controller.abort();
    };
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

  return (
    <PublicShell onRegister={onRegister} onNavigate={onNavigate} userName={userName} onWorkspace={onWorkspace}
      beforeMain={page === "home" && <AnnouncementStrip motionPaused={motionPaused} documentHidden={documentHidden} onToggleMotion={() => setMotionPaused(value => !value)} />}>
      <style>{effectiveMotionPaused ? `
        .project-public-shell .landing-hero-floating-card,
        .project-public-shell .landing-ambient-orbit,
        .project-public-shell .landing-ambient-pulse,
        .project-public-shell .landing-hero::after {
          animation-play-state: paused !important;
        }
      ` : ''}</style>

      {page !== "home" && <header className="public-page-heading"><a href="/">{t("route.page.home")}</a><h1>{t("route.page." + page)}</h1><p>{t("route.description." + page)}</p></header>}
      {page === "home" && <>
      {/* HERO SECTION */}
      <section ref={heroRef} className="landing-hero" id="gioi-thieu">
        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <CheckCircle size={14} aria-hidden="true" />
            {t("ui.landing.hero.badge")}
          </div>
          <h1 className="landing-hero-title">
            {t("ui.landing.hero.spaceFor")}<br />
            <span className="landing-hero-title-accent">{t("ui.landing.hero.practice")}</span><br />
            {t("ui.landing.hero.professional")}
          </h1>
          <p className="landing-hero-subtitle">
            {t("ui.landing.hero.subtitle")}
          </p>
          <div className="landing-hero-actions">
            <a className="landing-hero-cta landing-hero-cta-primary" href="/resources">
              {t("ui.landing.hero.explore")}
              <ArrowRight size={20} aria-hidden="true" />
            </a>
            <a className="landing-hero-cta landing-hero-cta-secondary" href="/how-it-works">
              {t("ui.landing.hero.viewProcess")}
            </a>
          </div>
          <div className="landing-hero-stats">
            <div className="landing-hero-stat">
              <span className="landing-hero-stat-value">{t("ui.landing.hero.stat1.value")}</span>
              <span className="landing-hero-stat-label">{t("ui.landing.hero.stat1.label")}</span>
            </div>
            <div className="landing-hero-stat">
              <span className="landing-hero-stat-value">{t("ui.landing.hero.stat2.value")}</span>
              <span className="landing-hero-stat-label">{t("ui.landing.hero.stat2.label")}</span>
            </div>
            <div className="landing-hero-stat">
              <span className="landing-hero-stat-value">{t("ui.landing.hero.stat3.value")}</span>
              <span className="landing-hero-stat-label">{t("ui.landing.hero.stat3.label")}</span>
            </div>
          </div>
        </div>
        <div className="landing-hero-visual">
          <img src={labHero} srcSet={`${labHeroSmall} 640w, ${labHero} 1536w`} sizes="(max-width: 800px) calc(100vw - 40px), 55vw" width={1536} height={1024} fetchPriority="high" decoding="async" alt={t('ui.final.heroAlt')} className="landing-hero-image" />
          <div className="landing-hero-floating-card landing-hero-floating-card-1">
            <div className="landing-hero-floating-icon landing-hero-floating-icon-violet">
              <CalendarDays size={24} aria-hidden="true" />
            </div>
            <div className="landing-hero-floating-content">
              <span className="landing-hero-floating-title">{t("ui.landing.hero.schedule.title")}</span>
              <span className="landing-hero-floating-subtitle">{t("ui.landing.hero.schedule.subtitle")}</span>
            </div>
          </div>
          <div className="landing-hero-floating-card landing-hero-floating-card-2">
            <div className="landing-hero-floating-icon landing-hero-floating-icon-mint">
              <ShieldCheck size={24} aria-hidden="true" />
            </div>
            <div className="landing-hero-floating-content">
              <span className="landing-hero-floating-title">{t("ui.landing.hero.safety.title")}</span>
              <span className="landing-hero-floating-subtitle">{t("ui.landing.hero.safety.subtitle")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS VIDEO SECTION - Why choose LAB */}
      <section className="landing-benefits" id="vi-sao-chon">
        <div className="landing-benefits-inner">
          <div className="landing-section-header">
            <span className="landing-section-eyebrow">
              <CheckCircle size={16} aria-hidden="true" />
              {t("ui.landing.benefits.eyebrow")}
            </span>
            <h2 className="landing-section-title">{t("ui.landing.benefits.title")}</h2>
          </div>
          <BenefitsVideo
            motionPaused={motionPaused}
            documentHidden={documentHidden}
            onToggleMotion={() => setMotionPaused(value => !value)}
          />
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="landing-features" id="tinh-nang">
        <div className="landing-features-inner">
          <div className="landing-section-header">
            <span className="landing-section-eyebrow">
              <Search size={16} aria-hidden="true" />
              {t("ui.landing.features.eyebrow")}
            </span>
            <h2 className="landing-section-title">{t("ui.landing.features.title")}</h2>
            <p className="landing-section-subtitle">
              {t("ui.landing.features.subtitle")}
            </p>
          </div>
          <div className="landing-features-grid">
            <div className="landing-feature-card">
              <div className="landing-feature-icon landing-feature-icon-mint">
                <DoorOpen size={28} aria-hidden="true" />
              </div>
              <h3 className="landing-feature-title">{t("ui.landing.features.rooms.title")}</h3>
              <p className="landing-feature-desc">
                {t("ui.landing.features.rooms.desc")}
              </p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon landing-feature-icon-coral">
                <Microscope size={28} aria-hidden="true" />
              </div>
              <h3 className="landing-feature-title">{t("ui.landing.features.equipment.title")}</h3>
              <p className="landing-feature-desc">
                {t("ui.landing.features.equipment.desc")}
              </p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon landing-feature-icon-amber">
                <CalendarDays size={28} aria-hidden="true" />
              </div>
              <h3 className="landing-feature-title">{t("ui.landing.features.booking.title")}</h3>
              <p className="landing-feature-desc">
                {t("ui.landing.features.booking.desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      </>}
      {(page === "home" || page === "resources") && <>
      {/* RESOURCES CATALOG */}
      <section className="public-section" style={{ background: 'var(--lab-surface-primary)', padding: page === 'home' ? 'var(--lab-space-16) var(--lab-space-8)' : '24px var(--lab-space-8)' }} id="tai-nguyen" tabIndex={-1}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <PublicResourceCatalog onViewSchedule={onViewSchedule} onGuestBookingComplete={onGuestBookingComplete} onReady={handleCatalogReady} />
        </div>
      </section>

      </>}
      {(page === "home" || page === "process") && <>
      {/* WORKFLOW SECTION */}
      <section className="landing-workflow" id="quy-trinh">
        <div className="landing-workflow-inner">
          <div className="landing-section-header">
            <span className="landing-section-eyebrow">
              <ShieldCheck size={16} aria-hidden="true" />
              {t("ui.landing.workflow.eyebrow")}
            </span>
            <h2 className="landing-section-title">{t("ui.landing.workflow.title")}</h2>
            <p className="landing-section-subtitle">
              {t("ui.landing.workflow.subtitle")}
            </p>
          </div>
          <div className="landing-workflow-steps">
            <div className="landing-workflow-step">
              <div className="landing-workflow-number">01</div>
              <div className="landing-workflow-content">
                <h3 className="landing-workflow-title">{t("ui.landing.steps.select.title")}</h3>
                <p className="landing-workflow-desc">
                  {t("ui.landing.steps.select.desc")}
                </p>
              </div>
            </div>
            <div className="landing-workflow-step">
              <div className="landing-workflow-number">02</div>
              <div className="landing-workflow-content">
                <h3 className="landing-workflow-title">{t("ui.landing.steps.book.title")}</h3>
                <p className="landing-workflow-desc">
                  {t("ui.landing.steps.book.desc")}
                </p>
              </div>
            </div>
            <div className="landing-workflow-step">
              <div className="landing-workflow-number">03</div>
              <div className="landing-workflow-content">
                <h3 className="landing-workflow-title">{t("ui.landing.steps.handover.title")}</h3>
                <p className="landing-workflow-desc">
                  {t("ui.landing.steps.handover.desc")}
                </p>
              </div>
            </div>
            <div className="landing-workflow-step">
              <div className="landing-workflow-number">04</div>
              <div className="landing-workflow-content">
                <h3 className="landing-workflow-title">{t("ui.landing.steps.return.title")}</h3>
                <p className="landing-workflow-desc">
                  {t("ui.landing.steps.return.desc")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROLES SECTION */}
      <section className="landing-roles">
        <div className="landing-roles-inner">
          <div className="landing-section-header">
            <span className="landing-section-eyebrow">
              <GraduationCap size={16} aria-hidden="true" />
              {t("ui.landing.roles.eyebrow")}
            </span>
            <h2 className="landing-section-title">{t("ui.landing.roles.title")}</h2>
          </div>
          <div className="landing-roles-grid">
            <div className="landing-role-card">
              <div className="landing-role-icon landing-role-icon-students">
                <GraduationCap size={32} aria-hidden="true" />
              </div>
              <h3 className="landing-role-title">{t("ui.landing.students.title")}</h3>
              <p className="landing-role-desc">
                {t("ui.landing.students.desc")}
              </p>
              <div className="landing-role-features">
                <div className="landing-role-feature">
                  <CheckCircle size={16} className="landing-role-feature-icon" aria-hidden="true" />
                  {t("ui.landing.students.booking")}
                </div>
                <div className="landing-role-feature">
                  <CheckCircle size={16} className="landing-role-feature-icon" aria-hidden="true" />
                  {t("ui.landing.students.reminder")}
                </div>
                <div className="landing-role-feature">
                  <CheckCircle size={16} className="landing-role-feature-icon" aria-hidden="true" />
                  {t("ui.landing.students.history")}
                </div>
              </div>
            </div>
            <div className="landing-role-card">
              <div className="landing-role-icon landing-role-icon-staff">
                <Wrench size={32} aria-hidden="true" />
              </div>
              <h3 className="landing-role-title">{t("ui.landing.staff.title")}</h3>
              <p className="landing-role-desc">
                {t("ui.landing.staff.desc")}
              </p>
              <div className="landing-role-features">
                <div className="landing-role-feature">
                  <CheckCircle size={16} className="landing-role-feature-icon" aria-hidden="true" />
                  {t("ui.landing.staff.queue")}
                </div>
                <div className="landing-role-feature">
                  <CheckCircle size={16} className="landing-role-feature-icon" aria-hidden="true" />
                  {t("ui.landing.staff.status")}
                </div>
                <div className="landing-role-feature">
                  <CheckCircle size={16} className="landing-role-feature-icon" aria-hidden="true" />
                  {t("ui.landing.staff.report")}
                </div>
              </div>
            </div>
            <div className="landing-role-card">
              <div className="landing-role-icon landing-role-icon-lecturers">
                <ShieldCheck size={32} aria-hidden="true" />
              </div>
              <h3 className="landing-role-title">{t("ui.landing.admin.title")}</h3>
              <p className="landing-role-desc">
                {t("ui.landing.admin.desc")}
              </p>
              <div className="landing-role-features">
                <div className="landing-role-feature">
                  <CheckCircle size={16} className="landing-role-feature-icon" aria-hidden="true" />
                  {t("ui.landing.admin.fullControl")}
                </div>
                <div className="landing-role-feature">
                  <CheckCircle size={16} className="landing-role-feature-icon" aria-hidden="true" />
                  {t("ui.landing.admin.assign")}
                </div>
                <div className="landing-role-feature">
                  <CheckCircle size={16} className="landing-role-feature-icon" aria-hidden="true" />
                  {t("ui.landing.admin.summary")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      </>}
      {(page === "home" || page === "schedule") && <>
      {/* SCHEDULE SECTION */}
      <section className="landing-schedule" id="kiem-tra-lich">
        <div className="landing-schedule-inner">
          <div className="landing-section-header">
            <span className="landing-section-eyebrow">
              <CalendarDays size={16} aria-hidden="true" />
              {t("ui.landing.schedule.eyebrow")}
            </span>
            <h2 className="landing-section-title">{t("ui.landing.schedule.title")}</h2>
            <p className="landing-section-subtitle">
              {t("ui.landing.schedule.subtitle")}
            </p>
          </div>
          {scheduleContent || (
            <div className="landing-schedule-card">
              <span className="landing-schedule-icon"><CalendarDays size={32} aria-hidden="true" /></span>
              <h3>{t("ui.landing.schedule.cardTitle")}</h3>
              <p>
                {t("ui.landing.schedule.cardDesc")}
              </p>
              <a className="landing-schedule-login" href="/login?returnTo=%2Fworkspace%2Fcalendar">
                {t("ui.landing.schedule.loginBtn")}
                <ArrowRight size={20} aria-hidden="true" />
              </a>
            </div>
          )}
        </div>
      </section>

      </>}
      {page === "home" && <>
      {/* CTA SECTION */}
      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2 className="landing-cta-title">{t("ui.landing.cta.title")}</h2>
          <p className="landing-cta-desc">
            {t("ui.landing.cta.desc")}
          </p>
          <div className="landing-cta-actions">
            <a className="landing-cta-btn landing-cta-btn-white" href="/login">
              {t("ui.landing.cta.login")}
              <ArrowRight size={20} aria-hidden="true" />
            </a>
            <a className="landing-cta-btn landing-cta-btn-outline" href="/resources">
              {t("ui.landing.cta.explore")}
            </a>
          </div>
        </div>
      </section>

      </>}
      {/* AUTH SECTION */}
      {children && (
        <section className="landing-auth" id="dang-nhap" tabIndex={-1}>
          <div className="landing-auth-inner">
            {children}
          </div>
        </section>
      )}
    </PublicShell>
  );
}
