import { ProjectBrand } from "./base/ProjectBrand";
import { translate } from "../i18n.js";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { isTabEnabled } from "../config/featureFlags";
import { Activity, Bell, CalendarCheck, ChevronDown, ClipboardCheck, Clock, FlaskConical, Layers, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, Search, Server, ShieldAlert, Users, UserRound, Wrench, type LucideIcon } from "lucide-react";

export interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  user: { fullName: string; role: string; email?: string } | null;
  notifications?: Array<{ id: string | number; readAt?: string | null }>;
  notificationUnreadCount?: number | null;
  incidents?: Array<{ id: string | number; status?: string }>;
  incidentOpenCount?: number;
  conflictsCount?: number;
  locale?: string;
  desktop: boolean;
  desktopExpanded: boolean;
  onDesktopExpandedChange: (expanded: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}
interface NavItem { id: string; labelKey: string; icon: LucideIcon; badge?: number }
const hiddenIndicator = { top: 0, left: 0, width: 0, height: 0 };

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, user, notifications = [], notificationUnreadCount, incidentOpenCount, locale = "vi", desktop, desktopExpanded, onDesktopExpandedChange, mobileOpen, onMobileOpenChange }) => {
  const t = translate;
  const role = user?.role || "";
  const staff = ["ADMIN", "LAB_STAFF"].includes(role);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const collapseTrigger = useRef<HTMLButtonElement>(null);
  const docked = desktop && desktopExpanded;
  const navigation = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState(hiddenIndicator);
  useLayoutEffect(() => {
    const nav = navigation.current;
    if (!nav) return;
    const update = () => {
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) { setIndicator(hiddenIndicator); return; }
      const row = active.getBoundingClientRect();
      const viewport = nav.getBoundingClientRect();
      const next = {
        top: row.top - viewport.top + nav.scrollTop - nav.clientTop,
        left: row.left - viewport.left + nav.scrollLeft - nav.clientLeft,
        width: row.width,
        height: row.height
      };
      setIndicator(previous => previous.top === next.top && previous.left === next.left &&
        previous.width === next.width && previous.height === next.height ? previous : next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    // The scroll viewport can stay fixed when fonts, wrapping or badges resize its rows.
    nav.querySelectorAll('.workspace-group-toggle, .sidebar-nav-item-2026').forEach(row => observer.observe(row));
    return () => observer.disconnect();
  }, [activeTab, query, collapsed, docked, mobileOpen, locale, role]);

  function openNavigation() {
    setQuery("");
    if (desktop) {
      onDesktopExpandedChange(true);
      requestAnimationFrame(() => collapseTrigger.current?.focus({ preventScroll: true }));
    } else {
      onMobileOpenChange(true);
    }
  }

  function closeNavigation() {
    if (desktop) onDesktopExpandedChange(false);
    else onMobileOpenChange(false);
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
  }
  const sections: { id: string; labelKey: string; items: NavItem[] }[] = [
    { id: "workspace", labelKey: "ui.workspace_970a97e3",  items: [
      { id: "home", labelKey: "ui.overview_120adc28",  icon: LayoutDashboard },
      { id: "resources", labelKey: "ui.rooms_and_equipment_db26e03c",  icon: Server },
      { id: "smart_calendar", labelKey: "ui.room_and_equipment_calendar_cce9c071",  icon: CalendarCheck },
      { id: "bookings", labelKey: staff ? "ui.bookings_and_handover_3e0e5754" : "ui.my_bookings_094ca2d9",  icon: Clock },
    ] },
    { id: "operations", labelKey: staff ? "ui.lab_operations_e05caa19" : "ui.support_c94bda25",  items: [
      { id: "dashboard", labelKey: "ui.operations_dashboard_6a44426c",  icon: LayoutDashboard },
      { id: "monitoring", labelKey: "ui.telemetry_monitoring_5752a8cc",  icon: Activity },
      { id: "maintenance", labelKey: "ui.maintenance_and_calibration_fa8ebcfe",  icon: Wrench },
      { id: "stock", labelKey: "ui.materials_inventory_2b570ac6",  icon: Layers },
      { id: "incidents", labelKey: "ui.resource_incidents_0cba217b",  icon: ShieldAlert, badge: incidentOpenCount },
      { id: "escalations", labelKey: "ui.notifications_a9b656f5",  icon: Bell, badge: notificationUnreadCount === null ? undefined : notificationUnreadCount ?? notifications.filter(row => !row.readAt).length },
      { id: "support", labelKey: "support.title", icon: Users },
    ] },
    { id: "account", labelKey: role === "ADMIN" ? "ui.account_and_administration_cade4bec" : "ui.account_09128ce8",  items: [
      { id: "profile", labelKey: "ui.my_profile_700b5272",  icon: UserRound },
      { id: "payments", labelKey: "ui.payments_d4b946cc",  icon: ClipboardCheck },
      { id: "admin_management", labelKey: "ui.resource_management_44713fdd",  icon: Server },
      { id: "users", labelKey: role === "ADMIN" ? "ui.users_and_assignments_291dd22c" : "account.users.customers",  icon: Users },
      { id: "logs", labelKey: "ui.audit_logs_883aea8a",  icon: ClipboardCheck },
    ] },
  ];
  function allowed(id: string) {
    if (!isTabEnabled(id)) return false;
    if (id === "logs") return staff;
    if (id === "users") return staff;
    if (["stock", "dashboard", "monitoring", "maintenance", "admin_management"].includes(id)) return staff;
    return true;
  }
  const available = sections.map(section => ({ ...section, items: section.items.filter(item => allowed(item.id)) })).filter(section => section.items.length);
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
  const matching = available.map(section => ({ ...section, items: section.items.filter(item => normalize(`${t(item.labelKey)} ${item.id}`).includes(normalize(query.trim()))) })).filter(section => section.items.length);
  const quickLabels: Record<string, string> = {
    home: "ui.overview_120adc28", resources: "ui.resources_eb706979",
    smart_calendar: "ui.calendar_be87b302", bookings: "ui.bookings_00f5b333",
    users: "ui.navigation.accountsShort",
    dashboard: "ui.navigation.operationsShort", stock: "ui.navigation.stockShort"
  };
  const primaryIds = role === 'ADMIN' ? ['home', 'resources', 'bookings', 'dashboard'] : ['home', 'resources', 'smart_calendar', 'bookings'];
  const quick = available.flatMap(section => section.items).filter(item => primaryIds.includes(item.id));

  useEffect(() => {
    if (!mobileOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [mobileOpen]);

  function navigate(id: string) {
    onSelectTab(id);
    onMobileOpenChange(false);
    // The destination, including Home, always remains inside the signed-in shell.
    requestAnimationFrame(() => document.getElementById("workspace-main")?.focus({ preventScroll: true }));
  }
  function handleKeyDown(event: React.KeyboardEvent) {
    if (docked) return;
    if (event.key === "Escape") { event.preventDefault(); closeNavigation(); return; }
    if (event.key !== "Tab") return;
    const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input, [href], [tabindex="0"]') || []).filter(node => node.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  const openLabel = t(desktop ? "ui.navigation.expand" : "ui.menu_99af6606");
  const closeLabel = t(desktop ? "ui.navigation.collapse" : "ui.close_menu_704367c1");
  const OpenIcon = desktop ? PanelLeftOpen : Menu;

  return <aside className={`sidebar-2026 workspace-navigation${docked ? " is-expanded" : ""}`}>
    {!docked && <div className="workspace-rail" inert={mobileOpen}>
      <button type="button" className="rail-brand" onClick={() => navigate("home")} aria-label={t("ui.lab_overview_50cafd5a")}><FlaskConical size={23} aria-hidden="true" /><span>{translate("ui.lab_7a62e3ac")}</span></button>
      <button ref={trigger} type="button" className="rail-item rail-menu" aria-label={openLabel} title={openLabel} aria-expanded={mobileOpen} aria-controls="workspace-navigation-panel" onClick={openNavigation}>
        <OpenIcon size={21} aria-hidden="true" /><span>{t("ui.menu_99af6606")}</span>
      </button>
      <nav className="rail-shortcuts" aria-label={t("ui.quick_navigation_ec400fed")}>{quick.map(item => <button key={item.id} type="button" data-quick-nav-id={item.id} className={`rail-item ${activeTab === item.id ? "is-active" : ""}`} title={t(item.labelKey)} aria-label={t(item.labelKey)} aria-current={activeTab === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><item.icon size={20} aria-hidden="true" /><span>{t(quickLabels[item.id] || item.labelKey)}</span></button>)}</nav>
      <button type="button" data-quick-nav-id="profile" className={`rail-item rail-profile${activeTab === 'profile' ? ' is-active' : ''}`} aria-current={activeTab === 'profile' ? 'page' : undefined} aria-label={t("ui.my_profile_700b5272")} onClick={() => navigate("profile")}><span className="rail-avatar">{user?.fullName?.charAt(0) || "U"}</span><span>{t("ui.profile_7f401d2e")}</span></button>
    </div>}
    {(docked || mobileOpen) && <>
      {mobileOpen && <div className="workspace-nav-scrim" onClick={closeNavigation} aria-hidden="true" />}
      <div ref={panel} id="workspace-navigation-panel" className={`workspace-nav-panel${docked ? ' workspace-nav-desktop' : ''}`} role={docked ? undefined : "dialog"} aria-modal={docked ? undefined : true} aria-labelledby="workspace-menu-title" onKeyDown={handleKeyDown}>
        <header className="workspace-nav-heading">
          <ProjectBrand onNavigate={() => navigate("home")} />
          <h2 className="sr-only" id="workspace-menu-title">{t(desktop ? "ui.menu_99af6606" : "ui.your_workspace_901f6858")}</h2>
          <button ref={collapseTrigger} type="button" className="workspace-nav-toggle" onClick={closeNavigation} aria-label={closeLabel} title={closeLabel} aria-expanded="true" aria-controls="workspace-navigation-panel">
            <PanelLeftClose size={19} aria-hidden="true" />
          </button>
        </header>
        <label className="workspace-nav-search"><Search size={18} aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)}  aria-label={t("ui.find_a_feature_a5650d64")} /></label>
        <nav ref={navigation} className="sidebar-nav-container-2026 workspace-menu-groups" aria-label={t("ui.main_navigation_84d2467a")}>
          <span className="workspace-nav-indicator" aria-hidden="true" style={{ transform: `translate(${indicator.left}px, ${indicator.top}px)`, width: indicator.width, height: indicator.height, opacity: indicator.height ? 1 : 0 }} />
          {matching.map(section => <section key={section.id} className="workspace-menu-group"><button type="button" className="workspace-group-toggle" aria-expanded={query.trim() ? true : !collapsed.includes(section.id)} aria-controls={`nav-group-${section.id}`} onClick={() => setCollapsed(ids => ids.includes(section.id) ? ids.filter(id => id !== section.id) : [...ids, section.id])}><span>{t(section.labelKey)}</span><ChevronDown size={15} aria-hidden="true" /></button>
            {(query.trim() || !collapsed.includes(section.id)) && <ul id={`nav-group-${section.id}`}>{section.items.map(item => <li key={item.id}><button type="button" data-nav-id={item.id} className={`sidebar-nav-item-2026 ${activeTab === item.id ? "is-active" : ""}`} aria-current={activeTab === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><item.icon size={18} aria-hidden="true" /><span>{t(item.labelKey)}</span>{Boolean(item.badge) && <span className="workspace-nav-count">{item.badge}</span>}</button></li>)}</ul>}
          </section>)}
          {!matching.length && <p className="workspace-nav-empty" role="status">{t("ui.no_matching_features_try_another_d99b0feb")}</p>}
        </nav>
        <footer className="workspace-nav-user"><span className="rail-avatar">{user?.fullName?.charAt(0) || "U"}</span><div><strong>{user?.fullName || user?.email}</strong><span>{t(({ ADMIN: translate("ui.administrator_d00831ec"), LAB_STAFF: translate("ui.lab_staff_38b791e1"), CUSTOMER: translate("core.roles.customer") } as Record<string,string>)[role] || role)}</span></div></footer>
      </div>
    </>}
  </aside>;
};
