import React, { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar.tsx";
import { Header } from "./Header.tsx";
import { KeyRound, Check, ShieldAlert } from "lucide-react";
import { BaseModal2026 } from "./BaseModal2026.tsx";
import { apiRequest } from "../api.js";
import { RESEARCH_FEATURES_ENABLED, AI_ASSISTANT_ENABLED } from "../config/featureFlags";
const LaboratoryAssistant = React.lazy(() => import("./features/assistant/LaboratoryAssistant"));
import { AiCopilotDrawer, FloatingCopilotFab } from "../research/ResearchFeatureRegistry";

export interface AppLayoutProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  user: {
    fullName: string;
    role: string;
    email?: string;
    quotaUsed?: number;
    quotaTotal?: number;
    passwordResetRequired?: boolean;
  } | null;
  locale: string;
  onLocaleChange: (locale: string) => void;
  notifications?: Array<{ id: string | number; readAt?: string | null }>;
  incidents?: Array<{ id: string | number; status?: string }>;
  conflictsCount?: number;
  loading?: boolean;
  onRefresh?: () => void;
  onLogout?: () => void;
  onPasswordChanged?: () => Promise<void> | void;
  onAssistantPrefill?: (slot: { resourceId: string; startAt: string; endAt: string }) => void;
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
  conflictsCount = 0,
  loading = false,
  onRefresh,
  onLogout,
  onPasswordChanged,
  onAssistantPrefill,
  children
}) => {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    if (user?.passwordResetRequired) {
      setChangePasswordOpen(true);
      setPasswordSuccess(false);
      setPasswordError("");
    }
  }, [user?.passwordResetRequired]);

  function closePasswordModal() {
    if (passwordBusy || user?.passwordResetRequired) return;
    setChangePasswordOpen(false);
    setPasswordError("");
    setPasswordSuccess(false);
  }

  // Map activeTab to readable header title
  const tabTitles: Record<string, string> = {
    home: "Không gian làm việc",
    profile: "Hồ sơ & ưu tiên LAB",
    payments: "Thanh toán",
    smart_calendar: "Lịch Đặt Khung Giờ",
    ai_analytics: "AI Tính Toán Hiệu Suất",
    ai_advisor: "AI Cố Vấn Lịch Đặt",
    admin_management: "Quản lý tài nguyên phòng thí nghiệm",
    conflict_queue: "Xử Lý Xung Đột Lịch Đặt",
    quota_fairness: "Hạn Ngạch & Phân Bổ",
    chargeback: "Quyết Toán Chi Phí",
    policy_config: "Chính Sách & Quy Định Lab",
    escalations: "Trung tâm thông báo",
    allocations: "Điều Phối Yêu Cầu",
    dashboard: "Bảng điều khiển vận hành",
    digital_twin: "Bản Sao Số & Mặt Bằng Lab",
    what_if: "Mô Phỏng Kịch Bản",
    resources: "Danh mục tài nguyên phòng thí nghiệm",
    bookings: "Lịch Đặt & Bàn Giao Tài Nguyên",
    maintenance: "Lịch Bảo Trì & Kiểm Định",
    monitoring: "Giám sát vận hành & Telemetry",
    pareto: "Khảo Sát Tối Ưu Hóa",
    timeline: "Nhật Ký Điều Phối",
    concurrency: "Kiểm Soát Tranh Chấp Lịch",
    ga_solver: "Thuật Toán Điều Lịch",
    ai_rca: "Phân Tích Nguyên Nhân Sự Cố",
    assistant: "Trợ Lý Vận Hành Lab",
    incidents: "Sự cố tài nguyên",
    training: "Đào Tạo & An Toàn Lab",
    logs: "Nhật Ký Kiểm Toán",
    users: "Quản Trị Người Dùng"
  };

  const currentTitle = tabTitles[activeTab] || "Hệ thống đặt lịch và tài nguyên phòng thí nghiệm";
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordBusy) return;
    setPasswordError("");
    if (!currentPassword) {
      setPasswordError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Xác nhận mật khẩu không trùng khớp.");
      return;
    }

    setPasswordBusy(true);
    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await onPasswordChanged?.();
    } catch (error: any) {
      setPasswordError(error?.message || "Không thể đổi mật khẩu.");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="app-shell-2026">
      <a className="skip-link" href="#workspace-main">Đến nội dung chính</a>
      {/* Primary navigation */}
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
          onOpenAssistant={AI_ASSISTANT_ENABLED ? () => setAssistantOpen(true) : undefined}
        />

        <main id="workspace-main" tabIndex={-1} className="main-body-container-2026">
          {children}
        </main>
        <footer className="workspace-footer"><span>Lab Resource Manager</span><span>Đặt lịch · Bàn giao · Theo dõi</span><span>Giờ Việt Nam · UTC+07:00</span></footer>
      </div>

      {AI_ASSISTANT_ENABLED && assistantOpen && <React.Suspense fallback={<p role="status">Đang mở trợ lý…</p>}><LaboratoryAssistant onClose={() => setAssistantOpen(false)} onPrefill={slot => onAssistantPrefill?.(slot)} /></React.Suspense>}
      {RESEARCH_FEATURES_ENABLED && (
        <React.Suspense fallback={null}>
          <FloatingCopilotFab
            isOpen={copilotOpen}
            onClick={() => setCopilotOpen(true)}
          />
          <AiCopilotDrawer
            isOpen={copilotOpen}
            onClose={() => setCopilotOpen(false)}
            onActionTrigger={(action) => {
              if (action === "auto_resolve_sla" || action === "thermal_throttle_rebalance") {
                onSelectTab("conflict_queue");
              }
            }}
          />
        </React.Suspense>
      )}

      <BaseModal2026
        isOpen={changePasswordOpen}
        onClose={closePasswordModal}
        dismissible={!passwordBusy && !user?.passwordResetRequired}
        title={user?.passwordResetRequired ? "Thiết lập mật khẩu mới" : "Đổi mật khẩu"}
        subtitle={user?.passwordResetRequired ? "Bạn phải thay mật khẩu tạm trước khi sử dụng các chức năng phòng lab" : "Cập nhật mật khẩu truy cập tài khoản phòng lab"}
        icon={KeyRound}
        maxWidth="max-w-md"
        footer={<>
          {!user?.passwordResetRequired && <button type="button" className="btn btn-secondary" onClick={closePasswordModal} disabled={passwordBusy}>Đóng</button>}
          {!passwordSuccess && <button type="submit" form="change-password-form" className="btn btn-primary" disabled={passwordBusy}>{passwordBusy ? "Đang cập nhật..." : "Cập nhật mật khẩu"}</button>}
        </>}
      >
            <form id="change-password-form" onSubmit={handlePasswordSubmit} className="booking-form">
              {passwordError && (
                <div className="alert danger text-xs flex items-center gap-2" role="alert">
                  <ShieldAlert size={14} aria-hidden="true" />
                  <span>{passwordError}</span>
                </div>
              )}
              {passwordSuccess && (
                <div className="alert success text-xs flex items-center gap-2" role="status">
                  <Check size={14} aria-hidden="true" />
                  <span>Mật khẩu đã được cập nhật thành công.</span>
                </div>
              )}

              <div>
                <label htmlFor="current-password" className="text-xs text-slate-400 mb-1 block">Mật khẩu hiện tại</label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div>
                <label htmlFor="new-password" className="text-xs text-slate-400 mb-1 block">Mật khẩu mới</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="text-xs text-slate-400 mb-1 block">Xác nhận mật khẩu mới</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                  required
                />
              </div>

            </form>
      </BaseModal2026>
    </div>
  );
};
