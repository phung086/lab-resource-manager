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
interface NavItem { id: string; vi: string; en: string; icon: LucideIcon; badge?: number }

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, user, notifications = [], incidents = [], locale = "vi", expanded, onExpandedChange }) => {
  const t = (vi: string, en: string) => locale === "en" ? en : vi;
  const role = user?.role || "";
  const staff = ["ADMIN", "LAB_STAFF"].includes(role);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeMenu = () => onExpandedChange(false);
  const sections: { id: string; vi: string; en: string; items: NavItem[] }[] = [
    { id: "workspace", vi: "Không gian làm việc", en: "Workspace", items: [
      { id: "home", vi: "Tổng quan", en: "Overview", icon: LayoutDashboard },
      { id: "resources", vi: "Phòng và thiết bị", en: "Rooms and equipment", icon: Server },
      { id: "smart_calendar", vi: "Lịch phòng và thiết bị", en: "Resource calendar", icon: CalendarCheck },
      { id: "bookings", vi: staff ? "Lịch đặt và bàn giao" : "Lịch đặt của tôi", en: staff ? "Bookings and handover" : "My bookings", icon: Clock },
      { id: "teaching", vi: "Lớp học phần", en: "Course groups", icon: Users },
    ] },
    { id: "operations", vi: staff ? "Vận hành LAB" : "Hỗ trợ", en: staff ? "LAB operations" : "Support", items: [
      { id: "dashboard", vi: "Bảng điều khiển vận hành", en: "LAB operations", icon: LayoutDashboard },
      { id: "monitoring", vi: "Giám sát telemetry", en: "Equipment monitoring", icon: Activity },
      { id: "maintenance", vi: "Bảo trì và hiệu chuẩn", en: "Maintenance", icon: Wrench },
      { id: "stock", vi: "Kho vật tư", en: "Materials inventory", icon: Layers },
      { id: "incidents", vi: "Sự cố tài nguyên", en: "Incidents", icon: ShieldAlert, badge: incidents.filter(row => !["resolved", "closed"].includes((row.status || "").toLowerCase())).length },
      { id: "escalations", vi: "Thông báo", en: "Notifications", icon: Bell, badge: notifications.filter(row => !row.readAt).length },
    ] },
    { id: "account", vi: role === "ADMIN" ? "Tài khoản và quản trị" : "Tài khoản", en: role === "ADMIN" ? "Account and administration" : "Account", items: [
      { id: "profile", vi: "Hồ sơ cá nhân", en: "My profile", icon: UserRound },
      { id: "payments", vi: "Thanh toán", en: "Payments", icon: ClipboardCheck },
      { id: "admin_management", vi: "Quản lý tài nguyên", en: "Resource administration", icon: Server },
      { id: "users", vi: "Người dùng và phân công", en: "Users and assignments", icon: Users },
      { id: "logs", vi: "Nhật ký kiểm toán", en: "Audit log", icon: ClipboardCheck },
    ] },
    { id: "research", vi: "Nghiên cứu tùy chọn", en: "Optional research", items: RESEARCH_FEATURES_ENABLED ? [
      { id: "ai_analytics", vi: "Phân tích thử nghiệm", en: "Experimental analytics", icon: Sliders },
      { id: "ai_advisor", vi: "Cố vấn thử nghiệm", en: "Experimental advisor", icon: Sparkles },
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
  const matching = available.map(section => ({ ...section, items: section.items.filter(item => normalize(`${item.vi} ${item.en}`).includes(normalize(query.trim()))) })).filter(section => section.items.length);
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
      <button type="button" className="rail-brand" onClick={() => navigate("home")} aria-label={t("LAB · Tổng quan", "LAB · Overview")}><FlaskConical size={23} aria-hidden="true" /><span>LAB</span></button>
      <button ref={trigger} type="button" className="rail-item rail-menu" aria-expanded={expanded} aria-controls="workspace-navigation-panel" onClick={() => { setQuery(""); onExpandedChange(true); }}><Menu size={21} aria-hidden="true" /><span>Menu</span></button>
      <nav className="rail-shortcuts" aria-label={t("Truy cập nhanh", "Quick navigation")}>{quick.map(item => <button key={item.id} type="button" data-quick-nav-id={item.id} className={`rail-item ${activeTab === item.id ? "is-active" : ""}`} title={t(item.vi, item.en)} aria-label={t(item.vi, item.en)} aria-current={activeTab === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><item.icon size={20} aria-hidden="true" /><span>{item.id === "home" ? t("Tổng quan", "Overview") : item.id === "smart_calendar" ? t("Lịch", "Calendar") : item.id === "bookings" ? t("Lịch đặt", "Bookings") : t("Thiết bị", "Resources")}</span></button>)}</nav>
      <button type="button" className="rail-item rail-profile" aria-label={t("Hồ sơ cá nhân", "My profile")} onClick={() => navigate("profile")}><span className="rail-avatar">{user?.fullName.charAt(0) || "U"}</span><span>{t("Hồ sơ", "Profile")}</span></button>
    </div>
    {expanded && <>
      <div className="workspace-nav-scrim" onClick={closeMenu} aria-hidden="true" />
      <div ref={panel} id="workspace-navigation-panel" className="workspace-nav-panel" role="dialog" aria-modal="true" aria-labelledby="workspace-menu-title" onKeyDown={handleKeyDown}>
        <header className="workspace-nav-heading"><div><span className="workspace-overline">LAB RESOURCE MANAGER</span><h2 id="workspace-menu-title">{t("Không gian của bạn", "Your workspace")}</h2></div><button type="button" className="nav-close" onClick={closeMenu} aria-label={t("Đóng menu", "Close menu")}><X size={20} aria-hidden="true" /></button></header>
        <label className="workspace-nav-search"><Search size={18} aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t("Tìm chức năng…", "Find a feature…")} aria-label={t("Tìm chức năng", "Find a feature")} /></label>
        <nav className="sidebar-nav-container-2026 workspace-menu-groups" aria-label={t("Điều hướng chính", "Main navigation")}>
          {matching.map(section => <section key={section.id} className="workspace-menu-group"><button type="button" className="workspace-group-toggle" aria-expanded={query.trim() ? true : !collapsed.includes(section.id)} aria-controls={`nav-group-${section.id}`} onClick={() => setCollapsed(ids => ids.includes(section.id) ? ids.filter(id => id !== section.id) : [...ids, section.id])}><span>{t(section.vi, section.en)}</span><ChevronDown size={15} aria-hidden="true" /></button>
            {(query.trim() || !collapsed.includes(section.id)) && <ul id={`nav-group-${section.id}`}>{section.items.map(item => <li key={item.id}><button type="button" data-nav-id={item.id} className={`sidebar-nav-item-2026 ${activeTab === item.id ? "is-active" : ""}`} aria-current={activeTab === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><item.icon size={18} aria-hidden="true" /><span>{t(item.vi, item.en)}</span>{Boolean(item.badge) && <span className="workspace-nav-count">{item.badge}</span>}</button></li>)}</ul>}
          </section>)}
          {!matching.length && <p className="workspace-nav-empty" role="status">{t("Không tìm thấy chức năng. Thử từ khóa khác.", "No matching features. Try another keyword.")}</p>}
        </nav>
        <footer className="workspace-nav-user"><span className="rail-avatar">{user?.fullName.charAt(0) || "U"}</span><div><strong>{user?.fullName}</strong><span>{t(({ ADMIN: "Quản trị viên", LAB_STAFF: "Cán bộ LAB", LECTURER: "Giảng viên", STUDENT: "Sinh viên" } as Record<string,string>)[role] || role, ({ ADMIN: "Administrator", LAB_STAFF: "LAB staff", LECTURER: "Lecturer", STUDENT: "Student" } as Record<string,string>)[role] || role)}</span></div></footer>
      </div>
    </>}
  </aside>;
};
