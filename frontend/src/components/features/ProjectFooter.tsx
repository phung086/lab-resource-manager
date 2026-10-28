import React from 'react';
import { useLocale } from '../../providers/LocaleProvider';
import { ProjectBrand } from '../base/ProjectBrand';
import { ChevronDown } from 'lucide-react';
import { publicPathForSection, workspacePathForTab } from '../../workspaceRoutes.js';
import pkg from '../../../package.json';

type Props = {
  variant: 'public' | 'workspace';
  role?: string;
  onNavigate?: (tab: string) => void;
  onPublicNavigate?: (section: string) => void;
  onRegister?: () => void;
};

type FooterLink = [destination: string, labelKey: string];

export function ProjectFooter({ variant, role, onNavigate, onPublicNavigate, onRegister }: Props) {
  const { t } = useLocale();
  const workspace = variant === 'workspace';
  const staff = role === 'ADMIN' || role === 'LAB_STAFF';

  const explore: FooterLink[] = workspace
    ? [['home', 'ui.overview_120adc28'], ['resources', 'ui.rooms_equipment_89c1fa9a'], ['smart_calendar', 'ui.check_schedule_a393bfd5'], ['bookings', staff ? 'ui.bookings_and_handover_3e0e5754' : 'ui.my_bookings_094ca2d9']]
    : [['tai-nguyen', 'ui.rooms_equipment_89c1fa9a'], ['kiem-tra-lich', 'ui.check_schedule_a393bfd5'], ['quy-trinh', 'ui.how_it_works_dd37bc66']];
  // Second column mirrors the signed-in operations surface (or the public entry points).
  const operations: FooterLink[] | null = !workspace
    ? null
    : staff
      ? [['dashboard', 'ui.operations_dashboard_6a44426c'], ['stock', 'ui.materials_inventory_2b570ac6'], ['incidents', 'ui.resource_incidents_0cba217b'], ['escalations', 'ui.notifications_a9b656f5'], ['support', 'support.title']]
      : [['incidents', 'ui.resource_incidents_0cba217b'], ['escalations', 'ui.notifications_a9b656f5'], ['support', 'support.title']];
  const account: FooterLink[] = workspace
    ? [['payments', 'ui.payments_d4b946cc'], ['profile', 'ui.my_profile_700b5272']]
    : [];

  function publicLink(section: string, label: string) {
    return <a href={publicPathForSection(section)} onClick={onPublicNavigate ? event => {
      if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onPublicNavigate(section); }
    } : undefined}>{t(label)}</a>;
  }
  function wsLink(destination: string, label: string) {
    return <a key={destination} href={workspacePathForTab(destination)} onClick={event => { if (onNavigate && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onNavigate(destination); } }}>{t(label)}</a>;
  }

  return <footer className={`project-footer project-footer--${variant}`}>
    <div className="project-footer-content">
      <div className="project-footer-identity">
        <ProjectBrand onNavigate={workspace ? () => onNavigate?.('home') : onPublicNavigate ? () => onPublicNavigate('dau-trang') : undefined} />
        <p>{t('shell.footer_description')}</p>
        <ul className="project-footer-status" aria-label={t('shell.project_identity')}>
          <li><span className="project-footer-status-dot" aria-hidden="true" />{t('ui.vietnam_time_utc_07_00_1f741bd1')}</li>
          <li>{t('ui.footer.demoNote')}</li>
        </ul>
      </div>
      <nav className="project-footer-links" aria-label={t('ui.footer.explore')}>
        <h2>{t('ui.footer.explore')}</h2>
        {explore.map(([destination, label]) => workspace ? wsLink(destination, label) : <React.Fragment key={destination}>{publicLink(destination, label)}</React.Fragment>)}
      </nav>
      {operations
        ? <nav className="project-footer-links" aria-label={staff ? t('ui.footer.operations') : t('ui.footer.support')}>
            <h2>{staff ? t('ui.footer.operations') : t('ui.footer.support')}</h2>
            {operations.map(([destination, label]) => wsLink(destination, label))}
          </nav>
        : <nav className="project-footer-links" aria-label={t('ui.footer.getStarted')}>
            <h2>{t('ui.footer.getStarted')}</h2>
            {publicLink('dang-nhap', 'ui.sign_in_9a402bdf')}
            {onRegister
              ? <a href="/register" onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onRegister(); } }}>{t('ui.create_account_32dde41a')}</a>
              : <a href="/register">{t('ui.create_account_32dde41a')}</a>}
            {publicLink('quy-trinh', 'ui.how_it_works_dd37bc66')}
          </nav>}
      <div className="project-footer-help">
        <h2>{t('shell.help_title')}</h2>
        <details><summary>{t('shell.booking_help')}<ChevronDown size={16} aria-hidden="true" /></summary><p>{t('shell.booking_help_body')}</p></details>
        <details><summary>{t('shell.privacy_help')}<ChevronDown size={16} aria-hidden="true" /></summary><p>{t('shell.privacy_help_body')}</p></details>
        {workspace && account.map(([destination, label]) => wsLink(destination, label))}
      </div>
    </div>
    <div className="project-footer-baseline">
      <span>{t('shell.project_identity')}</span>
      <span>{t('ui.footer.baselineMeta', { version: pkg.version, time: t('ui.vietnam_time_utc_07_00_1f741bd1') })}</span>
    </div>
  </footer>;
}
