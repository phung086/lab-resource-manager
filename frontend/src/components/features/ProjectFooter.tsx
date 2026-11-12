import React, { useEffect, useMemo, useState } from 'react';
import { useLocale } from '../../providers/LocaleProvider';
import { ProjectBrand } from '../base/ProjectBrand';
import { ArrowUpRight, BookOpen, ChevronDown, Compass, Headphones, LayoutGrid, Mail, MapPin, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { publicPathForSection, workspacePathForTab } from '../../workspaceRoutes.js';
import { isTabEnabled } from '../../config/featureFlags';
import '../../styles/project-footer-refined.css';
import pkg from '../../../package.json';

type Props = {
  variant: 'public' | 'workspace';
  role?: string;
  onNavigate?: (tab: string) => void;
  onPublicNavigate?: (section: string) => void;
  onRegister?: () => void;
  signedIn?: boolean;
};

type FooterLink = [destination: string, labelKey: string];

// Campus location published by Phenikaa. Individual room locations belong in their booking records.
const phenikaaMap = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3725.74853797683!2d105.7486864!3d20.962611199999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x313452efff394ce3%3A0x391a39d4325be464!2sPhenikaa%20University!5e0!3m2!1sen!2s!4v1794500725490!5m2!1sen!2s';
const configuredAddress = import.meta.env.VITE_PUBLIC_LAB_ADDRESS?.trim();
const supportEmail = import.meta.env.VITE_PUBLIC_LAB_SUPPORT_EMAIL?.trim();
const supportPhone = import.meta.env.VITE_PUBLIC_LAB_SUPPORT_PHONE?.trim();

function publicMapSource(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.origin === 'https://www.google.com' && url.pathname === '/maps/embed' && url.searchParams.get('pb') && !url.username && !url.password) {
      return url.href;
    }
  } catch {
    return undefined;
  }
}

const mapSource = configuredAddress ? publicMapSource(import.meta.env.VITE_PUBLIC_LAB_MAP_EMBED_URL) : phenikaaMap;

function PublicLabContact({ signedIn }: { signedIn: boolean }) {
  const { t } = useLocale();
  const [mapOpen, setMapOpen] = useState(false);
  const labAddress = configuredAddress || t('ui.footer.phenikaaAddress');
  const directions = `https://www.google.com/maps/dir/?${new URLSearchParams({ api: '1', destination: labAddress })}`;
  const supportPath = workspacePathForTab('support');
  const supportHref = signedIn ? supportPath : publicPathForSection('dang-nhap', { returnTo: supportPath });

  return <div className="project-footer-lab">
    <section aria-labelledby="public-lab-address-title">
      <h2 id="public-lab-address-title"><MapPin size={18} aria-hidden="true" />{t('ui.footer.labAddress')}</h2>
      <address>{labAddress}</address>
      <div className="project-footer-map-actions">
        {mapSource && <button type="button" aria-expanded={mapOpen} aria-controls="public-lab-map" onClick={() => setMapOpen(open => !open)}>
          {t(mapOpen ? 'ui.footer.hideMap' : 'ui.footer.showMap')}
        </button>}
        <a href={directions} target="_blank" rel="noopener noreferrer">{t('ui.footer.directions')}<ArrowUpRight size={15} aria-hidden="true" /></a>
      </div>
      {mapSource && <div id="public-lab-map" hidden={!mapOpen}>
        {mapOpen && <iframe src={mapSource} title={t('ui.footer.labMap')} loading="lazy" referrerPolicy="no-referrer" allowFullScreen />}
      </div>}
    </section>
    <section id="lien-he-lab" tabIndex={-1} aria-labelledby="public-lab-contact-title">
      <h2 id="public-lab-contact-title"><Headphones size={18} aria-hidden="true" />{t('ui.footer.labContact')}</h2>
      <div className="project-footer-contact-links">
        <a href={supportHref}>{t('support.title')}<ArrowUpRight size={15} aria-hidden="true" /></a>
        {supportEmail && /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(supportEmail) && <a href={`mailto:${supportEmail}`}><Mail size={15} aria-hidden="true" />{supportEmail}</a>}
        {supportPhone && /^\+?[0-9(). -]{7,24}$/.test(supportPhone) && <a href={`tel:${supportPhone.replace(/[^+\d]/g, '')}`}><Phone size={15} aria-hidden="true" />{supportPhone}</a>}
      </div>
    </section>
  </div>;
}

function FooterClock() {
  const { t, locale } = useLocale();
  const [now, setNow] = useState(() => new Date());
  const clockFormat = useMemo(() => new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }), [locale]);

  useEffect(() => {
    let timer: number;
    const tick = () => {
      const timestamp = Date.now();
      setNow(new Date(timestamp));
      timer = window.setTimeout(tick, 1000 - timestamp % 1000);
    };
    const sync = () => {
      window.clearTimeout(timer);
      if (!document.hidden) tick();
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return <time className="project-footer-clock" dateTime={now.toISOString()} aria-label={`${t('ui.footer.clock')} ${clockFormat.format(now)}`}>
    {clockFormat.format(now)}
  </time>;
}

export function ProjectFooter({ variant, role, onNavigate, onPublicNavigate, onRegister, signedIn = false }: Props) {
  const { t } = useLocale();
  const workspace = variant === 'workspace';
  const staff = role === 'ADMIN' || role === 'LAB_STAFF';

  const explore: FooterLink[] = workspace
    ? [['home', 'ui.overview_120adc28'], ['resources', 'ui.rooms_equipment_89c1fa9a'], ['smart_calendar', 'ui.check_schedule_a393bfd5'], ['bookings', staff ? 'ui.bookings_and_handover_3e0e5754' : 'ui.my_bookings_094ca2d9']]
    : [['tai-nguyen', 'ui.rooms_equipment_89c1fa9a'], ['kiem-tra-lich', 'ui.check_schedule_a393bfd5']];
  const operations: FooterLink[] | null = !workspace
    ? null
    : staff
      ? [['dashboard', 'ui.operations_dashboard_6a44426c'], ['monitoring', 'ui.telemetry_monitoring_5752a8cc'], ['stock', 'ui.materials_inventory_2b570ac6'], ['incidents', 'ui.resource_incidents_0cba217b'], ['escalations', 'ui.notifications_a9b656f5']]
      : [['incidents', 'ui.resource_incidents_0cba217b'], ['escalations', 'ui.notifications_a9b656f5']];
  const account: FooterLink[] = workspace
    ? [['payments', 'ui.payments_d4b946cc'], ['profile', 'ui.my_profile_700b5272']]
    : [];

  function publicLink(section: string, label: string, action = false) {
    return <a className={action ? 'project-footer-action' : undefined} href={publicPathForSection(section)} onClick={onPublicNavigate ? event => {
      if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onPublicNavigate(section); }
    } : undefined}>{t(label)}{action && <ArrowUpRight size={15} aria-hidden="true"/>}</a>;
  }
  function wsLink(destination: string, label: string, action = false) {
    if (!isTabEnabled(destination)) return null;
    return <a className={action ? 'project-footer-action' : undefined} key={destination} href={workspacePathForTab(destination)} onClick={event => { if (onNavigate && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onNavigate(destination); } }}>{t(label)}{action && <ArrowUpRight size={15} aria-hidden="true"/>}</a>;
  }

  return <footer className={`project-footer project-footer--${variant} project-footer-refined`}>
    <div className="project-footer-content">
      <div className="project-footer-identity">
        <ProjectBrand onNavigate={workspace ? () => onNavigate?.('home') : onPublicNavigate ? () => onPublicNavigate('dau-trang') : undefined} />
        <p>{t('shell.footer_description')}</p>
        <FooterClock />
      </div>
      <nav className="project-footer-links" aria-label={t('ui.footer.explore')}>
        <h2><Compass size={17} aria-hidden="true"/>{t('ui.footer.explore')}</h2>
        {explore.map(([destination, label]) => workspace ? wsLink(destination, label) : <React.Fragment key={destination}>{publicLink(destination, label)}</React.Fragment>)}
      </nav>
      {operations
        ? <nav className="project-footer-links" aria-label={staff ? t('ui.footer.operations') : t('ui.footer.support')}>
            <h2><LayoutGrid size={17} aria-hidden="true"/>{staff ? t('ui.footer.operations') : t('ui.footer.support')}</h2>
            {operations.map(([destination, label]) => wsLink(destination, label))}
          </nav>
        : <nav className="project-footer-links" aria-label={t('ui.footer.getStarted')}>
            <h2><UserRound size={17} aria-hidden="true"/>{t('ui.footer.getStarted')}</h2>
            {publicLink('dang-nhap', 'ui.sign_in_9a402bdf')}
            {onRegister
              ? <a href="/register" onClick={event => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onRegister(); } }}>{t('ui.create_account_32dde41a')}</a>
              : <a href="/register">{t('ui.create_account_32dde41a')}</a>}
          </nav>}
      <div className="project-footer-help">
        <h2>{workspace ? <Headphones size={17} aria-hidden="true"/> : <BookOpen size={17} aria-hidden="true"/>}{t('shell.help_title')}</h2>
        <details><summary><BookOpen size={14} aria-hidden="true"/>{t('shell.booking_help')}<ChevronDown size={15} aria-hidden="true" /></summary><p>{t('shell.booking_help_body')}</p></details>
        <details><summary><ShieldCheck size={14} aria-hidden="true"/>{t('shell.privacy_help')}<ChevronDown size={15} aria-hidden="true" /></summary><p>{t('shell.privacy_help_body')}</p></details>
        {workspace ? wsLink('support', 'support.title', true) : publicLink('quy-trinh', 'ui.how_it_works_dd37bc66', true)}
        {workspace && <div className="project-footer-account">{account.map(([destination, label]) => wsLink(destination, label))}</div>}
      </div>
    </div>
    {!workspace && <PublicLabContact signedIn={signedIn} />}
    <div className="project-footer-baseline">
      <span>{t('shell.project_identity')}</span>
      <span>{t('ui.footer.baselineMeta', { version: pkg.version })}</span>
    </div>
  </footer>;
}
