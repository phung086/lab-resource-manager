import React, { useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useLocale } from '../providers/LocaleProvider';
import { LanguageToggle } from './base/LanguageToggle';
import { ProjectBrand } from './base/ProjectBrand';
import { ProjectFooter } from './features/ProjectFooter';
import { publicPathForSection, readAppRoute } from '../workspaceRoutes.js';
import '../styles/public-landing.css';

type Props = {
  children: React.ReactNode;
  beforeMain?: React.ReactNode;
  onRegister: () => void;
  onNavigate?: (section: string) => void;
  userName?: string;
  onWorkspace?: () => void;
};

export function PublicShell({ children, beforeMain, onRegister, onNavigate, userName, onWorkspace }: Props) {
  const { t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigation = [['tai-nguyen', 'ui.rooms_equipment_89c1fa9a'], ['kiem-tra-lich', 'ui.check_schedule_a393bfd5'], ['quy-trinh', 'ui.how_it_works_dd37bc66']];
  function navigate(event: React.MouseEvent<HTMLAnchorElement>, section: string) {
    setMenuOpen(false);
    if (onNavigate && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onNavigate(section); }
  }
  return <div className="public-site lab-public project-public-shell" id="dau-trang">
    <a className="public-skip" href="#noi-dung">{t('ui.skip_to_main_content_a75d7c33')}</a>
    <header className="public-header" onKeyDown={event => {
      if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); menuButton.current?.focus(); }
    }}>
      <ProjectBrand onNavigate={onNavigate ? () => onNavigate('dau-trang') : undefined} />
      <button ref={menuButton} type="button" className="public-menu" aria-expanded={menuOpen} aria-controls="public-nav" aria-label={t('ui.toggle_navigation_dcc375f3')} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
      <nav id="public-nav" className={menuOpen ? 'is-open' : ''} aria-label={t('ui.main_navigation_84d2467a')}>
        {navigation.map(([section, key]) => <a key={section} href={publicPathForSection(section)} aria-current={readAppRoute(window.location).path === publicPathForSection(section) ? "page" : undefined} onClick={event => navigate(event, section)}>{t(key)}</a>)}
      </nav>
      <div className="public-account-actions"><LanguageToggle />
        {userName ? <button type="button" className="public-login" onClick={onWorkspace}>{t('ui.workspace_970a97e3')}</button> : <a className="public-login" href="/login" onClick={event => navigate(event, 'dang-nhap')}>{t('ui.sign_in_9a402bdf')}</a>}
      </div>
    </header>
    {beforeMain}
    <main id="noi-dung" tabIndex={-1}>{children}</main>
    <ProjectFooter variant="public" onPublicNavigate={onNavigate} onRegister={onRegister} />
  </div>;
}
