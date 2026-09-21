import React, { useState, useEffect, useRef } from "react";
import { parseVietnamParts } from "../utils/timezone";
import {
  Bell,
  Check,
  ChevronDown,
  KeyRound,
  LogOut,
  RefreshCw,
  Sparkles,
  User,
  Shield,
  Zap,
  Globe
} from "lucide-react";

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
  notificationsCount?: number;
  loading?: boolean;
  onRefresh?: () => void;
  onOpenNotifications?: () => void;
  onOpenChangePassword?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  user,
  locale,
  onLocaleChange,
  notificationsCount = 0,
  loading = false,
  onRefresh,
  onOpenNotifications,
  onOpenChangePassword,
  onLogout
}) => {
  // Real-time 2026 Clock State
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function updateClock() {
      const now = parseVietnamParts(new Date());
      if (!now) return;
      const year = now.year;
      const month = String(now.month).padStart(2, "0");
      const day = String(now.day).padStart(2, "0");
      const hours = String(now.hours).padStart(2, "0");
      const minutes = String(now.minutes).padStart(2, "0");
      const seconds = String(now.seconds).padStart(2, "0");
      setCurrentDateTime(`${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC+7`);
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasQuota = Number.isFinite(user?.quotaUsed) && Number.isFinite(user?.quotaTotal) && (user?.quotaTotal || 0) > 0;
  const quotaUsed = user?.quotaUsed || 0;
  const quotaTotal = user?.quotaTotal || 0;
  const quotaPercent = hasQuota ? Math.min(100, Math.round((quotaUsed / quotaTotal) * 100)) : 0;

  return (
    <header className="header-2026">
      {/* Left side: page identity and local clock. */}
      <div className="header-left-2026">
        <div className="header-title-row-2026">
          <div className="header-title-2026">{title}</div>
        </div>

        <div className="header-telemetry-row-2026">
          <span className="font-mono text-xs text-slate-400 tracking-wide">
            {currentDateTime}
          </span>
        </div>
      </div>

      {/* Right side: Language Segmented Control, Actions & User Profile */}
      <div className="header-right-2026">
        {/* Ultra-thin Segmented Control for VI / EN */}
        <div className="segmented-control-2026" role="group" aria-label="Language Selector">
          <button
            type="button"
            className={`segmented-btn-2026 ${locale === "vi" ? "is-active" : ""}`}
            onClick={() => onLocaleChange("vi")}
            title="Tiếng Việt"
          >
            VI
          </button>
          <button
            type="button"
            className={`segmented-btn-2026 ${locale === "en" ? "is-active" : ""}`}
            onClick={() => onLocaleChange("en")}
            title="English"
          >
            EN
          </button>
        </div>

        {/* Refresh button */}
        {onRefresh && (
          <button
            type="button"
            className="header-icon-btn-2026"
            title="Làm mới dữ liệu telemetry"
            onClick={onRefresh}
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-cyan-400" : "text-slate-300"} />
          </button>
        )}

        {/* Notification Bell with vibration micro-animation */}
        <button
          type="button"
          className={`header-notification-btn-2026 ${notificationsCount > 0 ? "has-unread" : ""}`}
          title="Thông báo & Escalation"
          onClick={onOpenNotifications}
        >
          <div className={`bell-icon-wrapper ${notificationsCount > 0 ? "bell-shake" : ""}`}>
            <Bell size={16} className="text-slate-200" />
          </div>
          {notificationsCount > 0 && (
            <span className="notification-counter-pill font-mono">
              {notificationsCount}
            </span>
          )}
        </button>

        {/* User Avatar & Dropdown */}
        {user && (
          <div className="user-dropdown-container-2026" ref={dropdownRef}>
            <button
              type="button"
              className="user-avatar-btn-2026"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-expanded={userMenuOpen}
            >
              <div className="avatar-letter-circle">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
              </div>
              <ChevronDown size={14} className={`dropdown-arrow ${userMenuOpen ? "rotated" : ""}`} />
            </button>

            {/* Dropdown Menu (Level 3 Depth) */}
            {userMenuOpen && (
              <div className="user-dropdown-menu-2026 animate-fadeIn">
                {/* Header Profile Info */}
                <div className="user-menu-profile-header">
                  <div className="user-menu-avatar-large">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="user-menu-details">
                    <strong className="user-menu-fullname">{user.fullName}</strong>
                    <span className="user-menu-email">{user.email || "Chưa cập nhật email"}</span>
                    <div className="user-menu-role-badge font-mono">
                      <Shield size={11} className="text-blue-400" />
                      <span>{user.role.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Remaining Quota Telemetry */}
                {hasQuota && <div className="user-menu-quota-box">
                  <div className="user-menu-quota-header">
                    <span className="quota-label text-slate-400 text-xs">Hạn Ngạch Phân Bổ:</span>
                    <span className="quota-numbers font-mono text-xs text-blue-300 font-semibold">
                      {quotaUsed} / {quotaTotal} giờ
                    </span>
                  </div>
                  <div className="quota-progress-track">
                    <div
                      className="quota-progress-fill"
                      style={{ width: `${quotaPercent}%` }}
                    />
                  </div>
                  <div className="quota-meta-footer">
                    <span className="font-mono text-[10px] text-slate-400">Đã dùng {quotaPercent}%</span>
                    <span className="font-mono text-[10px] text-emerald-400">Khả dụng</span>
                  </div>
                </div>}

                <div className="user-menu-divider" />

                {/* Actions */}
                <div className="user-menu-actions">
                  <button
                    type="button"
                    className="user-menu-item-btn"
                    onClick={() => {
                      setUserMenuOpen(false);
                      if (onOpenChangePassword) onOpenChangePassword();
                    }}
                  >
                    <KeyRound size={15} className="text-slate-400" />
                    <span>Đổi Mật Khẩu</span>
                  </button>

                  <button
                    type="button"
                    className="user-menu-item-btn item-logout"
                    onClick={() => {
                      setUserMenuOpen(false);
                      if (onLogout) onLogout();
                    }}
                  >
                    <LogOut size={15} className="text-rose-400" />
                    <span>Đăng Xuất Khỏi Lab</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
