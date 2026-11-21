import React, { useRef, useState } from 'react';
import { Facebook, Menu, Phone, X } from 'lucide-react';
import { useLocale } from '../providers/LocaleProvider';
import { LanguageToggle } from './base/LanguageToggle';
import { ThemeToggle } from './base/ThemeToggle';
import { ProjectBrand } from './base/ProjectBrand';
import { ProjectFooter } from './features/ProjectFooter';
import { RobotMascot } from './features/assistant/RobotMascot';
import { AI_ASSISTANT_ENABLED } from '../config/featureFlags';
import { facebookSupportUrl, labSupportHref, labSupportPhone, zaloSupportUrl } from '../config/publicLabContact';
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
  const contactLabel = t(AI_ASSISTANT_ENABLED ? 'assistant.title' : 'support.title');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigation = [['tai-nguyen', 'ui.rooms_equipment_89c1fa9a'], ['kiem-tra-lich', 'ui.check_schedule_a393bfd5'], ['quy-trinh', 'ui.how_it_works_dd37bc66']];
  function navigate(event: React.MouseEvent<HTMLAnchorElement>, section: string) {
    setMenuOpen(false);
    if (onNavigate && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onNavigate(section); }
  }
  return <div className="public-site lab-public project-public-shell lab-spectrum lab-studio" id="dau-trang">
    <a className="public-skip" href="#noi-dung">{t('ui.skip_to_main_content_a75d7c33')}</a>
    <header className="public-header" onKeyDown={event => {
      if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); menuButton.current?.focus(); }
    }}>
      <ProjectBrand onNavigate={onNavigate ? () => onNavigate('dau-trang') : undefined} />
      <button ref={menuButton} type="button" className="public-menu" aria-expanded={menuOpen} aria-controls="public-nav" aria-label={t('ui.toggle_navigation_dcc375f3')} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
      <nav id="public-nav" className={menuOpen ? 'is-open' : ''} aria-label={t('ui.main_navigation_84d2467a')}>
        {navigation.map(([section, key]) => <a key={section} href={publicPathForSection(section)} aria-current={readAppRoute(window.location).path === publicPathForSection(section) ? "page" : undefined} onClick={event => navigate(event, section)}>{t(key)}</a>)}
      </nav>
      <div className="public-account-actions"><LanguageToggle /><ThemeToggle />
        {userName ? <button type="button" className="public-login" onClick={onWorkspace}>{t('ui.workspace_970a97e3')}</button> : <a className="public-login" href="/login" onClick={event => navigate(event, 'dang-nhap')}>{t('ui.sign_in_9a402bdf')}</a>}
      </div>
    </header>
    {beforeMain}
    <main id="noi-dung" tabIndex={-1}>{children}</main>
    <nav className="public-contact-rail" aria-label={t('ui.footer.labContact')}>
      {facebookSupportUrl && <a className="public-contact-channel is-facebook" href={facebookSupportUrl} target="_blank" rel="noopener noreferrer" aria-label={t('ui.footer.facebook')} title={t('ui.footer.facebook')}><Facebook size={21} aria-hidden="true" /></a>}
      {zaloSupportUrl && <a className="public-contact-channel is-zalo" href={zaloSupportUrl} target="_blank" rel="noopener noreferrer" aria-label={t('ui.footer.zalo')} title={t('ui.footer.zalo')}><span aria-hidden="true">{t('ui.footer.zalo')}</span></a>}
      {labSupportPhone && <a className="public-contact-channel is-phone" href={labSupportPhone.href} aria-label={t('ui.footer.callSupport', { phone: labSupportPhone.label })} title={t('ui.footer.callSupport', { phone: labSupportPhone.label })}><Phone size={19} aria-hidden="true" /></a>}
      <a className="public-contact-mascot" href={labSupportHref(Boolean(userName), { openAssistant: AI_ASSISTANT_ENABLED })} aria-label={contactLabel} title={contactLabel}><RobotMascot /></a>
    </nav>
    <ProjectFooter variant="public" onPublicNavigate={onNavigate} onRegister={onRegister} signedIn={Boolean(userName)} />
  </div>;
}
