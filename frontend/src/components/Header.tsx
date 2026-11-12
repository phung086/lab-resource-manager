import { localizeNotification, translate } from "../i18n.js";
import { LanguageToggle } from "./base/LanguageToggle";
import { ThemeToggle } from "./base/ThemeToggle";
import { ProjectBrand } from "./base/ProjectBrand";
import { ResourceFinder } from './features/resources/ResourceFinder';
import type { SearchableResource } from '../utils/resourceSearch';
import React, { useState, useEffect, useRef } from "react";
import { formatVietnamDateTime } from "../utils/timezone";
import { ArrowRight, Bell, MessageCircle, ChevronDown, ChevronRight, KeyRound, LogOut, RefreshCw, UserRound, CalendarDays, UsersRound, ClipboardCheck } from "lucide-react";

export type HeaderNotice = { id: string | number; readAt?: string | null; type?: string; title?: string; message?: string; sentAt?: string; createdAt?: string };

export interface HeaderProps {
  title: string;
  user: {
    fullName: string;
    email?: string;
    role: string;
    quotaUsed?: number;
    quotaTotal?: number;
  } | null;
  locale: string;
  onLocaleChange: (locale: string) => void;
  notificationsCount?: number | null;
  notifications?: HeaderNotice[];
  loading?: boolean;
  onRefresh?: () => void;
  selectionControl?: React.ReactNode;
  onOpenNotifications?: (id?: string) => void;
  onOpenChangePassword?: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  onOpenAssistant?: () => void;
  assistantControl?: React.ReactNode;
  onOpenHome?: () => void;
  onNavigate?: (tab: string, params?: Record<string, string>) => void;
  showSearch?: boolean;
  searchResources?: readonly SearchableResource[];
  searchResourcesReady?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  user,
  notificationsCount: unreadTotal = 0,
  notifications = [],
  loading = false,
  onRefresh,
  selectionControl,
  onOpenNotifications,
  onOpenChangePassword,
  onOpenProfile,
  onLogout,
  onOpenAssistant,
  assistantControl,
  onOpenHome,
  onNavigate,
  showSearch = true,
  searchResources = [],
  searchResourcesReady = false
}) => {
  const t = translate;
  // Unknown totals keep the generic notification action without a numeric badge.
  const notificationsCount = unreadTotal ?? 0;
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const noticesRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (!noticesRef.current?.contains(event.target as Node)) setNoticesOpen(false);
    }
    const closeOnNavigation = () => { setUserMenuOpen(false); setNoticesOpen(false); };
    document.addEventListener("pointerdown", handleClickOutside);
    window.addEventListener('popstate', closeOnNavigation);
    return () => { document.removeEventListener("pointerdown", handleClickOutside); window.removeEventListener('popstate', closeOnNavigation); };
  }, []);

  const hasQuota = Number.isFinite(user?.quotaUsed) && Number.isFinite(user?.quotaTotal) && (user?.quotaTotal || 0) > 0;
  const quotaUsed = user?.quotaUsed || 0;
  const quotaTotal = user?.quotaTotal || 0;
  const quotaPercent = hasQuota ? Math.min(100, Math.round((quotaUsed / quotaTotal) * 100)) : 0;
  const roleKeys: Record<string, string> = { ADMIN: 'core.roles.admin', LAB_STAFF: 'core.roles.lab_staff', CUSTOMER: 'core.roles.customer' };
  const roleKey = roleKeys[user?.role || ''];
  const shortcut = user?.role === 'ADMIN'
    ? { tab: 'users', label: 'workspace.header.accounts', Icon: UsersRound }
    : user?.role === 'LAB_STAFF'
      ? { tab: 'dashboard', label: 'workspace.header.operations', Icon: ClipboardCheck }
      : { tab: 'bookings', label: 'workspace.header.bookings', Icon: CalendarDays };

  function closeUserMenu() {
    setUserMenuOpen(false);
    dropdownRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }

  return (
    <header className="header-2026">
      <div className="header-left-2026">
        <div className="studio-mobile-brand"><ProjectBrand onNavigate={onOpenHome} /></div>
        <div className="project-header-location">
          <div className="header-title-row-2026"><div className="header-title-2026">{title}</div></div>
          <div className="header-telemetry-row-2026">{roleKey ? t(roleKey) : t('ui.workspace_970a97e3')}</div>
        </div>
      </div>

      {onNavigate && <div className="project-header-tools" data-has-search={showSearch}>
        {showSearch && <ResourceFinder collapsible className="project-header-search" value={search} onChange={setSearch} label={t('workspace.header.search')}
          records={searchResources} ready={searchResourcesReady}
          onSearch={value=>onNavigate('resources',{search:value})}
          onPick={resource=>onNavigate('resources',{resource:resource.id,search:search.trim()})}/>}
        <button type="button" className="project-header-shortcut" onClick={() => onNavigate(shortcut.tab)} aria-label={t(shortcut.label)} title={t(shortcut.label)}>
          <shortcut.Icon size={18} aria-hidden="true" /><span>{t(shortcut.label)}</span>
        </button>
      </div>}

      {/* Right side: Language Segmented Control, Actions & User Profile */}
      <div className="header-right-2026">
        {assistantControl || (onOpenAssistant && <button type="button" className="secondary-button project-header-assistant" onClick={onOpenAssistant}>{t("ui.lab_assistant_0a8d5bc9")}</button>)}
        {selectionControl}
        <LanguageToggle />
        <ThemeToggle />

        {/* Refresh button */}
        {onRefresh && (
          <button
            type="button"
            className="header-icon-btn-2026 project-header-refresh"
            title={t("ui.refresh_data_167c5f3e")}
            disabled={loading}
            aria-label={t("ui.refresh_data_167c5f3e")}
            onClick={onRefresh}
          >
            <RefreshCw size={16} aria-hidden="true" className={loading ? "animate-spin" : ""} />
          </button>
        )}

        {onOpenNotifications && <div ref={noticesRef} className="header-notices" onKeyDown={event => {
          if (event.key === 'Escape' && noticesOpen) { event.stopPropagation(); setNoticesOpen(false); noticesRef.current?.querySelector('button')?.focus(); }
        }} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setNoticesOpen(false); }}>
        <button
          type="button"
          className={`header-notification-btn-2026 ${notificationsCount > 0 ? "has-unread" : ""}`}
          title={t("ui.notifications_a9b656f5")}
          aria-label={
            notificationsCount > 0
              ? t("ui.open_notifications_unread_4ca0dcba", { value0: notificationsCount })
              : t("ui.open_notifications_1c7247bb")
          }
          aria-expanded={noticesOpen}
          aria-controls={noticesOpen ? 'header-notices-panel' : undefined}
          onClick={() => setNoticesOpen(value => !value)}
        >
          <div className="bell-icon-wrapper">
            <Bell size={16} aria-hidden="true" />
          </div>
          {notificationsCount > 0 && (
            <span className="notification-counter-pill font-mono">
              {notificationsCount}
            </span>
          )}
        </button>
        {noticesOpen && <section id="header-notices-panel" className="header-notices-panel workspace-popover" aria-label={t('ui.notifications_a9b656f5')}>
          <header className="workspace-popover-heading"><span className="workspace-popover-icon"><Bell size={17} aria-hidden="true" /></span><strong>{t('ui.notifications_a9b656f5')}</strong></header>
          {notifications.length > 0 ? <ul className="header-notices-items">
            {notifications.slice(0, 5).map(row => {
              const notice = localizeNotification(row);
              const timestamp = row.sentAt || row.createdAt;
              return <li key={row.id}><button type="button" data-unread={!row.readAt} onClick={() => { setNoticesOpen(false); onOpenNotifications(String(row.id)); }}>
                <strong>{notice.title}</strong>{!row.readAt && <span className="sr-only">{t('ui.inbox.unread')}</span>}
                <span>{notice.message}</span>{timestamp && <time dateTime={timestamp}>{formatVietnamDateTime(timestamp)}</time>}
              </button></li>;
            })}
          </ul> : <p className="workspace-popover-note">{t(loading ? 'ui.loading_notifications_cc8a441b' : unreadTotal === 0 ? 'ui.inbox.empty' : 'ui.inbox.previewUnavailable')}</p>}
          <button type="button" className="workspace-popover-link" onClick={() => { setNoticesOpen(false); onOpenNotifications(); }}>{t('ui.view_all_44aeb8cb')}<ArrowRight size={16} aria-hidden="true" /></button>
        </section>}
        </div>}

        {/* User Avatar & Dropdown */}
        {user && (
          <div className="user-dropdown-container-2026" ref={dropdownRef}
            onKeyDown={event => {
              if (event.key === "Escape" && userMenuOpen) { event.stopPropagation(); closeUserMenu(); }
            }}
            onBlur={event => {
              if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setUserMenuOpen(false);
            }}>
            <button
              type="button"
              className="user-avatar-btn-2026"
              onClick={() => setUserMenuOpen(value => !value)}
              aria-expanded={userMenuOpen}
              aria-controls={userMenuOpen ? "header-account-panel" : undefined}
              aria-label={t("ui.open_account_menu_2b4bd2c8")}
            >
              <div className="avatar-letter-circle">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="project-account-label"><span>{user.fullName || user.email}</span></div>
              <ChevronDown size={14} aria-hidden="true" className={`dropdown-arrow ${userMenuOpen ? "rotated" : ""}`} />
            </button>

            {/* Dropdown Menu (Level 3 Depth) */}
            {userMenuOpen && (
              <section id="header-account-panel" className="user-dropdown-menu-2026 workspace-popover" aria-labelledby="header-account-name">
                {/* Header Profile Info */}
                <div className="user-menu-profile-header">
                  <div className="user-menu-avatar-large">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="user-menu-details">
                    <strong id="header-account-name" className="user-menu-fullname">{user.fullName || user.email}</strong>
                    <span className="user-menu-email">{user.email || translate("ui.email_not_provided_64af79ce")}</span>
                    <div className="user-menu-role-badge">{roleKey && t(roleKey)}</div>
                  </div>
                </div>

                {/* Remaining Quota Telemetry */}
                {hasQuota && <div className="user-menu-quota-box">
                  <div className="user-menu-quota-header">
                    <span className="quota-label text-slate-400 text-xs">{translate("ui.allocated_quota_9106509a")}</span>
                    <span className="quota-numbers font-mono text-xs text-blue-300 font-semibold">
                      {quotaUsed} / {quotaTotal}  {translate("ui.hours_2491e993")} </span>
                  </div>
                  <div className="quota-progress-track">
                    <div
                      className="quota-progress-fill"
                      style={{ width: `${quotaPercent}%` }}
                    />
                  </div>
                  <div className="quota-meta-footer">
                    <span className="font-mono text-[10px] text-slate-400">{translate("ui.used_9db1bfce")} {quotaPercent}%</span>
                    <span className="font-mono text-[10px] text-emerald-400">{translate("ui.available_73dc3284")}</span>
                  </div>
                </div>}

                <div className="user-menu-divider" />

                {/* Actions */}
                <div className="user-menu-actions">
                  {onOpenAssistant && <button type="button" className="user-menu-item-btn project-menu-assistant" onClick={() => { closeUserMenu(); onOpenAssistant(); }}><MessageCircle size={15} aria-hidden="true" /><span>{t('ui.lab_assistant_0a8d5bc9')}</span></button>}
                  {onRefresh && <button type="button" className="user-menu-item-btn project-menu-refresh" disabled={loading} onClick={() => { closeUserMenu(); onRefresh(); }}><RefreshCw size={15} aria-hidden="true" /><span>{t('ui.refresh_data_167c5f3e')}</span></button>}
                  {onOpenProfile && <button type="button" className="user-menu-item-btn" onClick={() => { setUserMenuOpen(false); onOpenProfile(); }}><UserRound size={15} aria-hidden="true" /><span>{t("ui.my_profile_700b5272")}</span><ChevronRight className="user-menu-chevron" size={15} aria-hidden="true" /></button>}
                  <button
                    type="button"
                    className="user-menu-item-btn"
                    onClick={() => {
                      setUserMenuOpen(false);
                      if (onOpenChangePassword) onOpenChangePassword();
                    }}
                  >
                    <KeyRound size={15} aria-hidden="true" />
                    <span>{t("ui.change_password_4598a666")}</span>
                    <ChevronRight className="user-menu-chevron" size={15} aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    className="user-menu-item-btn item-logout"
                    onClick={() => {
                      setUserMenuOpen(false);
                      if (onLogout) onLogout();
                    }}
                  >
                    <LogOut size={15} aria-hidden="true" />
                    <span>{t("ui.sign_out_c9e0facd")}</span>
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
