import { translate } from "../i18n.js";
import React, { useEffect, useRef, useState } from "react";
import { RESEARCH_FEATURES_ENABLED, isTabEnabled } from "../config/featureFlags";
import { Activity, Bell, CalendarCheck, ChevronDown, ClipboardCheck, Clock, FlaskConical, Layers, LayoutDashboard, Menu, Search, Server, ShieldAlert, Sliders, Sparkles, Users, UserRound, Wrench, X, type LucideIcon } from "lucide-react";

export interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  user: { fullName: string; role: string; email?: string } | null;
  notifications?: Array<{ id: string | number; readAt?: string | null }>;
  incidents?: Array<{ id: string | number; status?: string }>;
  conflictsCount?: number;
  locale?: string;
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
}
interface NavItem { id: string; labelKey: string; icon: LucideIcon; badge?: number }

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, user, notifications = [], incidents = [], locale = "vi", expanded, onExpandedChange }) => {
  const t = translate;
  const role = user?.role || "";
  const staff = ["ADMIN", "LAB_STAFF"].includes(role);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeMenu = () => onExpandedChange(false);
  const sections: { id: string; labelKey: string; items: NavItem[] }[] = [
    { id: "workspace", labelKey: "ui.workspace_970a97e3",  items: [
      { id: "home", labelKey: "ui.overview_120adc28",  icon: LayoutDashboard },
      { id: "resources", labelKey: "ui.rooms_and_equipment_db26e03c",  icon: Server },
      { id: "smart_calendar", labelKey: "ui.room_and_equipment_calendar_cce9c071",  icon: CalendarCheck },
      { id: "bookings", labelKey: staff ? "ui.bookings_and_handover_3e0e5754" : "ui.my_bookings_094ca2d9",  icon: Clock },
      { id: "teaching", labelKey: "ui.course_groups_73951b09",  icon: Users },
    ] },
    { id: "operations", labelKey: staff ? "ui.lab_operations_e05caa19" : "ui.support_c94bda25",  items: [
      { id: "dashboard", labelKey: "ui.operations_dashboard_6a44426c",  icon: LayoutDashboard },
      { id: "monitoring", labelKey: "ui.telemetry_monitoring_5752a8cc",  icon: Activity },
      { id: "maintenance", labelKey: "ui.maintenance_and_calibration_fa8ebcfe",  icon: Wrench },
      { id: "stock", labelKey: "ui.materials_inventory_2b570ac6",  icon: Layers },
      { id: "incidents", labelKey: "ui.resource_incidents_0cba217b",  icon: ShieldAlert, badge: incidents.filter(row => !["resolved", "closed"].includes((row.status || "").toLowerCase())).length },
      { id: "escalations", labelKey: "ui.notifications_a9b656f5",  icon: Bell, badge: notifications.filter(row => !row.readAt).length },
    ] },
    { id: "account", labelKey: role === "ADMIN" ? "ui.account_and_administration_cade4bec" : "ui.account_09128ce8",  items: [
      { id: "profile", labelKey: "ui.my_profile_700b5272",  icon: UserRound },
      { id: "payments", labelKey: "ui.payments_d4b946cc",  icon: ClipboardCheck },
      { id: "admin_management", labelKey: "ui.resource_management_44713fdd",  icon: Server },
      { id: "users", labelKey: "ui.users_and_assignments_291dd22c",  icon: Users },
      { id: "logs", labelKey: "ui.audit_logs_883aea8a",  icon: ClipboardCheck },
    ] },
    { id: "research", labelKey: "ui.optional_research_7bede37e",  items: RESEARCH_FEATURES_ENABLED ? [
      { id: "ai_analytics", labelKey: "ui.experimental_analytics_6dae30cb",  icon: Sliders },
      { id: "ai_advisor", labelKey: "ui.experimental_advisor_ef357e7a",  icon: Sparkles },
    ] : [] },
  ];
  function allowed(id: string) {
    if (!isTabEnabled(id)) return false;
    if (id === "teaching") return ["ADMIN", "LECTURER", "STUDENT"].includes(role);
    if (["users", "logs"].includes(id)) return role === "ADMIN";
    if (["stock", "dashboard", "monitoring", "maintenance", "admin_management"].includes(id)) return staff;
    return true;
  }
  const available = sections.map(section => ({ ...section, items: section.items.filter(item => allowed(item.id)) })).filter(section => section.items.length);
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
  const matching = available.map(section => ({ ...section, items: section.items.filter(item => normalize(`${t(item.labelKey)} ${item.id}`).includes(normalize(query.trim()))) })).filter(section => section.items.length);
  const quick = available.flatMap(section => section.items).filter(item => ["home", "smart_calendar", "bookings", "resources"].includes(item.id));

  useEffect(() => {
    if (!expanded) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [expanded]);

  function navigate(id: string) {
    onSelectTab(id);
    closeMenu();
    // The destination, including Home, always remains inside the signed-in shell.
    requestAnimationFrame(() => document.getElementById("workspace-main")?.focus({ preventScroll: true }));
  }
  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") { event.preventDefault(); closeMenu(); return; }
    if (event.key !== "Tab") return;
    const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input, [href], [tabindex="0"]') || []).filter(node => node.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  return <aside className="sidebar-2026 workspace-navigation">
    <div className="workspace-rail" inert={expanded}>
      <button type="button" className="rail-brand" onClick={() => navigate("home")} aria-label={t("ui.lab_overview_50cafd5a")}><FlaskConical size={23} aria-hidden="true" /><span>{translate("ui.lab_7a62e3ac")}</span></button>
      <button ref={trigger} type="button" className="rail-item rail-menu" aria-expanded={expanded} aria-controls="workspace-navigation-panel" onClick={() => { setQuery(""); onExpandedChange(true); }}><Menu size={21} aria-hidden="true" /><span>{translate("ui.menu_99af6606")}</span></button>
      <nav className="rail-shortcuts" aria-label={t("ui.quick_navigation_ec400fed")}>{quick.map(item => <button key={item.id} type="button" data-quick-nav-id={item.id} className={`rail-item ${activeTab === item.id ? "is-active" : ""}`} title={t(item.labelKey)} aria-label={t(item.labelKey)} aria-current={activeTab === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><item.icon size={20} aria-hidden="true" /><span>{item.id === "home" ? t("ui.overview_120adc28") : item.id === "smart_calendar" ? t("ui.calendar_be87b302") : item.id === "bookings" ? t("ui.bookings_00f5b333") : t("ui.resources_eb706979")}</span></button>)}</nav>
      <button type="button" className="rail-item rail-profile" aria-label={t("ui.my_profile_700b5272")} onClick={() => navigate("profile")}><span className="rail-avatar">{user?.fullName.charAt(0) || "U"}</span><span>{t("ui.profile_7f401d2e")}</span></button>
    </div>
    {expanded && <>
      <div className="workspace-nav-scrim" onClick={closeMenu} aria-hidden="true" />
      <div ref={panel} id="workspace-navigation-panel" className="workspace-nav-panel" role="dialog" aria-modal="true" aria-labelledby="workspace-menu-title" onKeyDown={handleKeyDown}>
        <header className="workspace-nav-heading"><div><span className="workspace-overline">{translate("ui.lab_resource_manager_a57ea8d6")}</span><h2 id="workspace-menu-title">{t("ui.your_workspace_901f6858")}</h2></div><button type="button" className="nav-close" onClick={closeMenu} aria-label={t("ui.close_menu_704367c1")}><X size={20} aria-hidden="true" /></button></header>
        <label className="workspace-nav-search"><Search size={18} aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t("ui.find_a_feature_30357635")} aria-label={t("ui.find_a_feature_a5650d64")} /></label>
        <nav className="sidebar-nav-container-2026 workspace-menu-groups" aria-label={t("ui.main_navigation_84d2467a")}>
          {matching.map(section => <section key={section.id} className="workspace-menu-group"><button type="button" className="workspace-group-toggle" aria-expanded={query.trim() ? true : !collapsed.includes(section.id)} aria-controls={`nav-group-${section.id}`} onClick={() => setCollapsed(ids => ids.includes(section.id) ? ids.filter(id => id !== section.id) : [...ids, section.id])}><span>{t(section.labelKey)}</span><ChevronDown size={15} aria-hidden="true" /></button>
            {(query.trim() || !collapsed.includes(section.id)) && <ul id={`nav-group-${section.id}`}>{section.items.map(item => <li key={item.id}><button type="button" data-nav-id={item.id} className={`sidebar-nav-item-2026 ${activeTab === item.id ? "is-active" : ""}`} aria-current={activeTab === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><item.icon size={18} aria-hidden="true" /><span>{t(item.labelKey)}</span>{Boolean(item.badge) && <span className="workspace-nav-count">{item.badge}</span>}</button></li>)}</ul>}
          </section>)}
          {!matching.length && <p className="workspace-nav-empty" role="status">{t("ui.no_matching_features_try_another_d99b0feb")}</p>}
        </nav>
        <footer className="workspace-nav-user"><span className="rail-avatar">{user?.fullName.charAt(0) || "U"}</span><div><strong>{user?.fullName}</strong><span>{t(({ ADMIN: translate("ui.administrator_d00831ec"), LAB_STAFF: translate("ui.lab_staff_38b791e1"), LECTURER: translate("ui.lecturer_948c8824"), STUDENT: translate("ui.student_1b487b2d") } as Record<string,string>)[role] || role)}</span></div></footer>
      </div>
    </>}
  </aside>;
};
