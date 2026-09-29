import React, { useState } from "react";
import { RESEARCH_FEATURES_ENABLED, isTabEnabled } from "../config/featureFlags";
import {
  Menu, X,
  CalendarCheck,
  Clock,
  Sliders,
  Sparkles,
  Server,
  ClipboardCheck,
  Calendar,
  Layers,
  LayoutDashboard,
  Users,
  UserRound,
  Wrench,
  Bell,
  ShieldAlert,
  Activity,
  LucideIcon
} from "lucide-react";

export interface NavItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string | null;
  badgeType?: "amber" | "rose" | "cyan" | "ai";
  showStatusDot?: boolean;
}

export interface NavSectionConfig {
  id: string;
  title: string;
  items: NavItemConfig[];
}

export interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  user: {
    fullName: string;
    role: string;
    email?: string;
  } | null;
  notifications?: Array<{ id: string | number; readAt?: string | null }>;
  incidents?: Array<{ id: string | number; status?: string }>;
  conflictsCount?: number;
  locale?: string;
  copy?: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  user,
  notifications = [],
  incidents = [],
  locale = "vi"
}) => {
  const t = (vi: string, en: string) => locale === 'en' ? en : vi;
  const labels: Record<string, string> = { home: 'Home & schedule', profile: 'My profile', payments: 'Payments', smart_calendar: 'Resource calendar', bookings: ['ADMIN','LAB_STAFF'].includes(user?.role || '') ? 'Bookings and handover' : 'My bookings', resources: 'Rooms and equipment', dashboard: 'LAB operations', monitoring: 'Equipment monitoring', incidents: 'Incidents', escalations: 'Notifications', maintenance: 'Maintenance', stock: 'Materials inventory', teaching: 'Course groups', admin_management: 'Resource administration', logs: 'Audit log', users: 'Users and assignments', ai_analytics: 'Experimental analytics', ai_advisor: 'Experimental advisor' };
  const [expanded, setExpanded] = useState(false);
  const unreadNotifications = notifications.filter((notification) => !notification.readAt).length;
  const openIncidents = incidents.filter((incident) =>
    ["reported", "triaged", "assigned", "investigating"].includes(incident.status || "")
  ).length;
  // 3 Streamlined Zones for AI-Powered Smart Booking & Advisory Platform (Linear / Cal.com style)
  const navSections: NavSectionConfig[] = [
    {
      id: "booking_zone",
      title: t("KHÔNG GIAN LÀM VIỆC", "WORKSPACE"),
      items: [
        { id: "teaching", label: "Lớp học phần", icon: Users },
        { id: "home", label: "Trang chủ & kiểm tra lịch", icon: LayoutDashboard },
        { id: "profile", label: "Hồ sơ cá nhân", icon: UserRound },
        { id: "payments", label: "Thanh toán", icon: ClipboardCheck },
        {
          id: "smart_calendar",
          label: "Lịch phòng và thiết bị",
          icon: CalendarCheck
        },
        {
          id: "bookings",
          label: ["ADMIN", "LAB_STAFF"].includes(user?.role || "") ? "Lịch đặt và bàn giao" : "Lịch đặt của tôi",
          icon: Clock
        },
        {
          id: "resources",
          label: "Phòng và thiết bị",
          icon: Server
        }
      ]
    },
    {
      id: "ai_zone",
      title: t("NGHIÊN CỨU / DEMO (TÙY CHỌN)", "OPTIONAL RESEARCH"),
      items: [
        {
          id: "ai_analytics",
          label: "AI Tính Toán Hiệu Suất",
          icon: Sliders
        },
        {
          id: "ai_advisor",
          label: "AI Cố Vấn & Quyết Định",
          icon: Sparkles
        }
      ]
    },
    {
      id: "admin_zone",
      title: ["ADMIN", "LAB_STAFF"].includes(user?.role || "") ? t("VẬN HÀNH & QUẢN TRỊ", "LAB OPERATIONS") : t("THÔNG BÁO & HỖ TRỢ", "SUPPORT"),
      items: [
        { id: "stock", label: "Kho vật tư", icon: Layers },
        {
          id: "dashboard",
          label: "Bảng Điều Khiển Vận Hành",
          icon: LayoutDashboard
        },
        {
          id: "monitoring",
          label: "Giám Sát Telemetry",
          icon: Activity
        },
        {
          id: "incidents",
          label: "Sự Cố Tài Nguyên",
          icon: ShieldAlert,
          badge: openIncidents || null,
          badgeType: "rose"
        },
        {
          id: "escalations",
          label: "Thông Báo",
          icon: Bell,
          badge: unreadNotifications || null,
          badgeType: "amber"
        },
        {
          id: "maintenance",
          label: "Lịch Bảo Trì",
          icon: Wrench
        },
        {
          id: "admin_management",
          label: "Quản Lý Tài Nguyên",
          icon: Server
        },
        {
          id: "logs",
          label: "Nhật Ký Kiểm Toán",
          icon: ClipboardCheck
        },
        {
          id: "users",
          label: "Quản Trị Người Dùng",
          icon: Users
        }
      ]
    }
  ];

  return (
    <aside className={`sidebar-2026 ${expanded ? "is-expanded" : ""}`}>
      {/* Brand Header */}
      <div className="sidebar-brand-2026">
        <div className="brand-mark-2026">
          <CalendarCheck size={20} aria-hidden="true" />
        </div>
        <div className="brand-info-2026">
          <strong className="brand-name-2026">LAB RESOURCE MANAGER</strong>
          <span className="brand-tag-2026">{t("QUẢN LÝ · ĐẶT LỊCH · GIÁM SÁT", "RESOURCES · BOOKINGS · OPERATIONS")}</span>
        </div>
      </div>

      <button className="mobile-nav-toggle secondary-button" aria-expanded={expanded} aria-controls="primary-navigation" onClick={() => setExpanded(value => !value)}>{expanded ? <X size={18} /> : <Menu size={18} />}<span>{expanded ? t("Đóng menu", "Close menu") : "Menu"}</span></button>
      {/* Navigation Sections */}
      <nav id="primary-navigation" className="sidebar-nav-container-2026" aria-label={t("Điều hướng chính", "Main navigation")}>
        {navSections
          .filter((section) => section.id !== "ai_zone" || RESEARCH_FEATURES_ENABLED)
          .map((section) => ({
            ...section,
            items: section.items.filter((item) => {
              if (!isTabEnabled(item.id)) return false;
              if (item.id === "teaching") return ["ADMIN", "LECTURER", "STUDENT"].includes(user?.role || "");
              if (item.id === "stock") return ["ADMIN", "LAB_STAFF"].includes(user?.role || "");
              if (["logs", "users"].includes(item.id)) return user?.role === "ADMIN";
              if (["admin_management", "dashboard", "monitoring", "maintenance"].includes(item.id)) {
                return ["ADMIN", "LAB_STAFF"].includes(user?.role || "");
              }
              return true;
            })
          }))
          .filter((section) => section.items.length > 0)
          .map((section) => (
          <div key={section.id} className="nav-section-group-2026">
            <div className="nav-section-title-2026">
              <span>{section.title}</span>
            </div>

            <div className="nav-section-items-2026">
              {section.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    title={locale === "en" ? labels[item.id] || item.label : item.label}
                    onClick={() => { onSelectTab(item.id); setExpanded(false); }}
                    className={`sidebar-nav-item-2026 ${isActive ? "is-active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <div className="nav-item-left-2026">
                      <IconComponent
                        size={16}
                        className="nav-item-icon-2026"
                      />
                      <span className="nav-item-label-2026">{locale === "en" ? labels[item.id] || item.label : item.label}</span>
                    </div>

                    <div className="nav-item-right-2026">
                      {item.showStatusDot && (
                        <span className="led-pulse led-pulse-safe inline-block" title="Hệ thống trực tuyến" />
                      )}

                      {item.badge !== null && item.badge !== undefined && (
                        <span
                          className={`sidebar-pill-badge-2026 font-mono ${
                            item.badgeType === "rose"
                              ? "badge-rose"
                              : item.badgeType === "cyan"
                              ? "badge-cyan"
                              : item.badgeType === "ai"
                              ? "badge-ai"
                              : "badge-amber"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom User Quick Profile */}
      {user && (
        <div className="sidebar-footer-user-2026">
          <div className="user-avatar-pill-2026">
            <div className="user-avatar-circle-2026">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="user-avatar-meta-2026">
              <span className="user-name-text-2026">{user.fullName}</span>
              <div className="user-role-online-2026">
                <span className="font-mono text-xs text-slate-400 uppercase">{user.role}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
