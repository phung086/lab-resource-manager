import React, { useState } from "react";
import { Sidebar } from "./Sidebar.tsx";
import { Header } from "./Header.tsx";
import { AiCopilotDrawer, FloatingCopilotFab } from "./AiCopilotDrawer.tsx";
import { KeyRound, X, Check, ShieldAlert } from "lucide-react";

export interface AppLayoutProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  user: {
    fullName: string;
    role: string;
    email?: string;
    quotaUsed?: number;
    quotaTotal?: number;
  } | null;
  locale: string;
  onLocaleChange: (locale: string) => void;
  notifications?: Array<{ id: string | number; readAt?: string | null }>;
  incidents?: Array<{ id: string | number; status?: string }>;
  conflictsCount?: number;
  loading?: boolean;
  onRefresh?: () => void;
  onLogout?: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  onSelectTab,
  user,
  locale,
  onLocaleChange,
  notifications = [],
  incidents = [],
  conflictsCount = 2,
  loading = false,
  onRefresh,
  onLogout,
  children
}) => {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Map activeTab to readable header title
  const tabTitles: Record<string, string> = {
    smart_calendar: "📅 Lịch Đặt Khung Giờ Thông Minh (Smart Booking)",
    ai_analytics: "📊 AI Tính Toán Hiệu Suất & Tỷ Lệ Chiếm Dụng",
    ai_advisor: "🧠 AI Cố Vấn Lịch Đặt & Tối Ưu Chi Phí",
    admin_management: "⚙️ Quản Trị Tài Nguyên, Hạn Ngạch & Sổ Cái VietQR",
    conflict_queue: "⚡ Xử Lý Xung Đột Real-Time",
    quota_fairness: "📊 Hạn Ngạch & Công Bằng Nhóm",
    chargeback: "💰 Quyết Toán & Tiền Điện EVN",
    policy_config: "⚙️ Chính Sách & Ràng Buộc Lab",
    escalations: "🚨 Cảnh Báo & Escalation",
    allocations: "🎯 Điều Phối Yêu Cầu Mới",
    dashboard: "🖥️ Mission Control Thiết Bị",
    digital_twin: "🌐 Bản Sao Số & Heatmap",
    what_if: "🔮 Studio Mô Phỏng What-If",
    resources: "🎛️ Danh Mục Thiết Bị & Node",
    bookings: "📅 Lịch Đặt Chỗ & Chiếm Dụng",
    maintenance: "🔧 Phiếu Yêu Cầu Bảo Trì",
    pareto: "📐 Khảo Sát Pareto Frontier",
    timeline: "⏱️ Replay Tái Tối Ưu Hóa",
    concurrency: "🔒 Giám Sát Tranh Chấp GiST",
    ga_solver: "🧬 Bộ Giải Di Truyền NSGA-II",
    ai_rca: "🔍 AI Diagnostic Studio (RCA)",
    assistant: "🤖 AI Copilot & MCP Trace",
    incidents: "🛡️ Sự Cố & Gián Đoạn",
    training: "🎓 Chứng Chỉ Đào Tạo Lab",
    logs: "📋 Nhật Ký Kiểm Toán",
    users: "👥 Quản Trị Người Dùng"
  };

  const currentTitle = tabTitles[activeTab] || "Smart AI Booking Platform";
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Xác nhận mật khẩu không trùng khớp.");
      return;
    }

    setPasswordSuccess(true);
    setTimeout(() => {
      setPasswordSuccess(false);
      setChangePasswordOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    }, 1500);
  }

  return (
    <div className="app-shell-2026">
      {/* 1. Sidebar Navigation (w-64, backdrop-blur-2xl, border-r border-white/5) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        user={user}
        notifications={notifications}
        incidents={incidents}
        conflictsCount={conflictsCount}
        locale={locale}
      />

      {/* 2. Main Work Area with Header */}
      <div className="main-content-column-2026">
        <Header
          title={currentTitle}
          user={user}
          locale={locale}
          onLocaleChange={onLocaleChange}
          notificationsCount={unreadCount}
          loading={loading}
          onRefresh={onRefresh}
          onOpenNotifications={() => onSelectTab("escalations")}
          onOpenChangePassword={() => setChangePasswordOpen(true)}
          onLogout={onLogout}
        />

        <main className="main-body-container-2026">
          {children}
        </main>
      </div>

      {/* 3. Floating AI Copilot FAB (Pill with rotating conic-glow) */}
      <FloatingCopilotFab
        isOpen={copilotOpen}
        onClick={() => setCopilotOpen(true)}
      />

      {/* 4. AI Copilot Drawer (Slide-in 300ms cubic-bezier transition) */}
      <AiCopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        onActionTrigger={(action) => {
          if (action === "auto_resolve_sla" || action === "thermal_throttle_rebalance") {
            onSelectTab("conflict_queue");
          }
        }}
      />

      {/* 5. Modal Đổi Mật Khẩu (Level 3 Depth) */}
      {changePasswordOpen && (
        <div className="modal-backdrop-2026" onClick={() => setChangePasswordOpen(false)}>
          <div
            className="modal-container-2026 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420 }}
          >
            <div className="modal-header-2026">
              <div className="flex items-center gap-2">
                <div className="modal-icon-badge-2026">
                  <KeyRound size={18} className="text-cyan-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">Đổi Mật Khẩu Truy Cập Lab</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setChangePasswordOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="p-4 flex flex-col gap-3">
              {passwordError && (
                <div className="alert danger text-xs flex items-center gap-2">
                  <ShieldAlert size={14} />
                  <span>{passwordError}</span>
                </div>
              )}
              {passwordSuccess && (
                <div className="alert success text-xs flex items-center gap-2">
                  <Check size={14} />
                  <span>Mật khẩu đã được cập nhật thành công!</span>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setChangePasswordOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  Cập nhật mật khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
