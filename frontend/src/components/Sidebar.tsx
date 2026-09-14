import React from "react";
import {
  CalendarCheck,
  Clock,
  Sliders,
  Sparkles,
  Server,
  ClipboardCheck,
  Calendar,
  Layers,
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
  locale = "vi"
}) => {
  // 3 Streamlined Zones for AI-Powered Smart Booking & Advisory Platform (Linear / Cal.com style)
  const navSections: NavSectionConfig[] = [
    {
      id: "booking_zone",
      title: "1. LỊCH & ĐẶT CHỖ",
      items: [
        {
          id: "smart_calendar",
          label: "📅 Lịch Đặt Khung Giờ",
          icon: CalendarCheck,
          badge: "LIVE",
          badgeType: "cyan",
          showStatusDot: true
        },
        {
          id: "bookings",
          label: "🕒 Lịch Đặt Của Tôi",
          icon: Clock
        }
      ]
    },
    {
      id: "ai_zone",
      title: "2. AI HIỆU SUẤT & TƯ VẤN",
      items: [
        {
          id: "ai_analytics",
          label: "📊 AI Tính Toán Hiệu Suất",
          icon: Sliders,
          badge: "92/100",
          badgeType: "ai"
        },
        {
          id: "ai_advisor",
          label: "🧠 AI Cố Vấn & Quyết Định",
          icon: Sparkles,
          badge: "3 Mẹo",
          badgeType: "cyan"
        }
      ]
    },
    {
      id: "admin_zone",
      title: "3. QUẢN TRỊ HỆ THỐNG",
      items: [
        {
          id: "admin_management",
          label: "⚙️ Quản Trị Tài Nguyên & Sổ Cái",
          icon: Server
        },
        {
          id: "logs",
          label: "📋 Nhật Ký Kiểm Toán",
          icon: ClipboardCheck
        }
      ]
    }
  ];

  return (
    <aside className="sidebar-2026 w-64 backdrop-blur-2xl border-r border-white/5">
      {/* Brand Header */}
      <div className="sidebar-brand-2026">
        <div className="brand-mark-2026">
          <CalendarCheck size={20} className="text-obsidian" />
        </div>
        <div className="brand-info-2026">
          <strong className="brand-name-2026">SMART AI BOOKING</strong>
          <span className="brand-tag-2026">ADVISORY PLATFORM 2026</span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav-container-2026" aria-label="Main Navigation">
        {navSections.map((section) => (
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
                    title={item.label}
                    onClick={() => onSelectTab(item.id)}
                    className={`sidebar-nav-item-2026 ${
                      isActive
                        ? "is-active border-l-2 border-cyan-400 bg-gradient-to-r from-cyan-500/10 to-transparent text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="nav-item-left-2026">
                      <IconComponent
                        size={16}
                        className={`nav-item-icon-2026 ${isActive ? "text-cyan-400" : "text-slate-400"}`}
                      />
                      <span className="nav-item-label-2026">{item.label}</span>
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
                <span className="led-pulse led-pulse-safe" />
                <span className="font-mono text-xs text-slate-400 uppercase">{user.role}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
