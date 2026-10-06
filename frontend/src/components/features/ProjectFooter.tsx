import React from 'react';
import { useLocale } from '../../providers/LocaleProvider';
import { ProjectBrand } from '../base/ProjectBrand';
import { ChevronDown } from 'lucide-react';

type Props = {
  variant: 'public' | 'workspace';
  role?: string;
  onNavigate?: (tab: string) => void;
  onPublicNavigate?: (section: string) => void;
  onRegister?: () => void;
};

export function ProjectFooter({ variant, role, onNavigate, onPublicNavigate, onRegister }: Props) {
  const { t } = useLocale();
  const workspace = variant === 'workspace';
  const staff = role === 'ADMIN' || role === 'LAB_STAFF';
  const links = workspace ? [
    ['resources', 'ui.rooms_equipment_89c1fa9a'],
    ['smart_calendar', 'ui.check_schedule_a393bfd5'],
    ['bookings', staff ? 'ui.bookings_and_handover_3e0e5754' : 'ui.my_bookings_094ca2d9'],
    ...(staff ? [['stock', 'ui.materials_inventory_2b570ac6']] : [['teaching', 'ui.course_groups_73951b09']])
  ] : [
    ['tai-nguyen', 'ui.rooms_equipment_89c1fa9a'],
    ['kiem-tra-lich', 'ui.check_schedule_a393bfd5'],
    ['quy-trinh', 'ui.how_it_works_dd37bc66']
  ];

  function publicLink(section: string, label: string) {
    return <a href={`#${section}`} onClick={onPublicNavigate ? event => {
      event.preventDefault(); onPublicNavigate(section);
    } : undefined}>{t(label)}</a>;
  }

  return <footer className={`project-footer project-footer--${variant}`}>
    <div className="project-footer-content">
      <div className="project-footer-identity">
        <ProjectBrand onNavigate={workspace ? () => onNavigate?.('home') : onPublicNavigate ? () => onPublicNavigate('dau-trang') : undefined} />
        <p>{t('shell.footer_description')}</p>
      </div>
      <nav className="project-footer-links" aria-label={t('shell.next_navigation')}>
        <h2>{t('shell.next_navigation')}</h2>
        {links.map(([destination, label]) => workspace
          ? <button key={destination} type="button" onClick={() => onNavigate?.(destination)}>{t(label)}</button>
          : <React.Fragment key={destination}>{publicLink(destination, label)}</React.Fragment>)}
      </nav>
      <div className="project-footer-help">
        <h2>{t('shell.help_title')}</h2>
        <details><summary>{t('shell.booking_help')}<ChevronDown size={16} aria-hidden="true" /></summary><p>{t('shell.booking_help_body')}</p></details>
        <details><summary>{t('shell.privacy_help')}<ChevronDown size={16} aria-hidden="true" /></summary><p>{t('shell.privacy_help_body')}</p></details>
        {workspace
          ? <button type="button" onClick={() => onNavigate?.('profile')}>{t('ui.my_profile_700b5272')}</button>
          : <div className="project-footer-account">{publicLink('dang-nhap', 'ui.sign_in_9a402bdf')}{onRegister && <button type="button" onClick={onRegister}>{t('ui.create_account_32dde41a')}</button>}</div>}
      </div>
    </div>
    <div className="project-footer-baseline"><span>{t('shell.project_identity')}</span><span>{t('ui.vietnam_time_utc_07_00_1f741bd1')}</span></div>
  </footer>;
}
