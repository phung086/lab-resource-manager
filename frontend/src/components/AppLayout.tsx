import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
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
  onPasswordChanged?: () => void;
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
  const { tr } = useLocale();
  const [navigationOpen, setNavigationOpen] = useState(false);
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
    setNavigationOpen(false);
    const frame = requestAnimationFrame(() => document.getElementById("workspace-main")?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [activeTab]);

  useEffect(() => {
    if (user?.passwordResetRequired) setChangePasswordOpen(true);
  }, [user?.passwordResetRequired]);

  useEffect(() => {
    const handleOpen = () => setChangePasswordOpen(true);
    window.addEventListener("lrm:open-password-setup", handleOpen);
    return () => window.removeEventListener("lrm:open-password-setup", handleOpen);
  }, []);

  function handleSelectTab(tab: string) {
    if (user?.passwordResetRequired && !passwordSuccess) {
      setChangePasswordOpen(true);
      return;
    }
    onSelectTab(tab);
  }

  function closePasswordModal() {
    if (passwordBusy) return;
    if (user?.passwordResetRequired && !passwordSuccess) return;
    setChangePasswordOpen(false);
    setPasswordError("");
    setPasswordSuccess(false);
  }

  // Map activeTab to readable header title
  const tabTitles: Record<string, string> = {
    stock: translate("ui.materials_inventory_2b570ac6"), teaching: translate("ui.course_groups_73951b09"),
    home: tr("ui.workspace_970a97e3"),
    profile: translate("ui.profile_and_lab_preferences_ab1e68a1"),
    payments: translate("ui.payments_d4b946cc"),
    smart_calendar: translate("ui.resource_calendar_ad1e4c6d"),
    ai_analytics: translate("ui.ai_efficiency_analysis_2d29dbaa"),
    ai_advisor: translate("ui.ai_scheduling_advisor_c75d577c"),
    admin_management: translate("ui.laboratory_resource_management_3b4ed242"),
    conflict_queue: translate("ui.booking_conflict_resolution_6439428e"),
    quota_fairness: translate("ui.quotas_and_allocations_3c016409"),
    chargeback: translate("ui.cost_reconciliation_cc6aca63"),
    policy_config: translate("ui.lab_policies_and_rules_fdb49bbf"),
    escalations: tr("ui.notifications_0c951eef"),
    allocations: translate("ui.request_coordination_47867edf"),
    dashboard: tr("ui.operations_dashboard_6a44426c"),
    digital_twin: translate("ui.lab_digital_twin_and_floor_4d1ee395"),
    what_if: translate("ui.scenario_simulation_b0012576"),
    resources: tr("ui.laboratory_resource_catalogue_84d37caf"),
    bookings: translate("ui.bookings_and_resource_handover_2ada6d5a"),
    maintenance: translate("ui.maintenance_and_calibration_schedule_ed6489ac"),
    monitoring: translate("ui.operational_monitoring_and_telemetry_296bd9d7"),
    pareto: translate("ui.optimization_explorer_8e8c6b09"),
    timeline: translate("ui.coordination_history_e087e3dc"),
    concurrency: translate("ui.booking_concurrency_control_9b5313ac"),
    ga_solver: translate("ui.scheduling_algorithm_4c48c66a"),
    ai_rca: translate("ui.incident_root_cause_analysis_83e98bb2"),
    assistant: translate("ui.lab_operations_assistant_9d99d2ba"),
    incidents: tr("ui.resource_incidents_0cba217b"),
    training: translate("ui.lab_training_and_safety_26f5f367"),
    logs: translate("ui.audit_logs_da29e2f6"),
    users: translate("ui.user_administration_4150792e")
  };

  const currentTitle = tr(tabTitles[activeTab]) || tr("core.app.name");
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordBusy) return;
    setPasswordError("");
    if (!currentPassword) {
      setPasswordError("ui.enter_your_current_password_840cc081");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("ui.your_new_password_must_have_b32509a2");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("ui.passwords_do_not_match_633c4090");
      return;
    }

    setPasswordBusy(true);
    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setPasswordSuccess(true);
      onPasswordChanged?.();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setPasswordError(error?.message || "ui.could_not_change_your_password_6c44efd3");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="app-shell-2026 workspace-shell">
      <a className="skip-link" href="#workspace-main">{translate("ui.skip_to_main_content_a75d7c33")}</a>
      {/* Primary navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        user={user}
        notifications={notifications}
        incidents={incidents}
        conflictsCount={conflictsCount}
        locale={locale}
        expanded={navigationOpen}
        onExpandedChange={setNavigationOpen}
      />

      {/* 2. Main Work Area with Header */}
      <div className="main-content-column-2026" inert={navigationOpen}>
        <Header
          title={currentTitle}
          user={user}
          locale={locale}
          onLocaleChange={onLocaleChange}
          notificationsCount={unreadCount}
          loading={loading}
          onRefresh={onRefresh}
          onOpenNotifications={() => handleSelectTab("escalations")}
          onOpenChangePassword={() => setChangePasswordOpen(true)}
          onOpenProfile={() => handleSelectTab("profile")}
          onLogout={onLogout}
          onOpenAssistant={AI_ASSISTANT_ENABLED ? () => setAssistantOpen(true) : undefined}
        />

        <main id="workspace-main" tabIndex={-1} className="main-body-container-2026">
          {children}
        </main>
        <footer className="workspace-footer"><span>{translate("ui.lab_resource_manager_ec7709de")}</span><span>{tr("ui.book_handover_track_a5b85bae")}</span><span>{tr("ui.vietnam_time_utc_07_00_1f741bd1")}</span></footer>
      </div>

      {AI_ASSISTANT_ENABLED && assistantOpen && <React.Suspense fallback={<p role="status">{translate("ui.opening_assistant_9a8f8008")}</p>}><LaboratoryAssistant onClose={() => setAssistantOpen(false)} onPrefill={slot => onAssistantPrefill?.(slot)} /></React.Suspense>}
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
                handleSelectTab("conflict_queue");
              }
            }}
          />
        </React.Suspense>
      )}

      <BaseModal2026
        isOpen={changePasswordOpen}
        onClose={closePasswordModal}
        dismissible={!passwordBusy && (!user?.passwordResetRequired || passwordSuccess)}
        title={user?.passwordResetRequired ? tr("ui.set_a_new_password_d9d5f864") : tr("ui.change_password_4598a666")}
        subtitle={user?.passwordResetRequired ? tr("ui.your_temporary_password_is_the_ede673e9") : tr("ui.update_your_lab_account_password_97a8f11c")}
        icon={KeyRound}
        maxWidth="max-w-md"
        footer={<>
          {(!user?.passwordResetRequired || passwordSuccess) && <button type="button" className="btn btn-secondary" onClick={closePasswordModal} disabled={passwordBusy}>{tr("ui.close_5d54c2a1")}</button>}
          {!passwordSuccess && <button type="submit" form="change-password-form" className="btn btn-primary" disabled={passwordBusy}>{passwordBusy ? tr("ui.updating_01c0991e") : tr("ui.update_password_a9f9616f")}</button>}
        </>}
      >
            <form id="change-password-form" onSubmit={handlePasswordSubmit} className="booking-form">
              {passwordError && (
                <div className="alert danger text-xs flex items-center gap-2" role="alert">
                  <ShieldAlert size={14} aria-hidden="true" />
                  <span>{translate(passwordError)}</span>
                </div>
              )}
              {passwordSuccess && (
                <div className="alert success text-xs flex items-center gap-2" role="status">
                  <Check size={14} aria-hidden="true" />
                  <span>{tr("ui.your_password_has_been_updated_90d53208")}</span>
                </div>
              )}

              <div>
                <label htmlFor="current-password" className="text-xs text-slate-400 mb-1 block">{tr("ui.current_password_7f06b3a5")}</label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={tr("ui.enter_current_password_60f70758")}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div>
                <label htmlFor="new-password" className="text-xs text-slate-400 mb-1 block">{tr("ui.new_password_8f6cace3")}</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={tr("ui.at_least_8_characters_5b6fe49d")}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="text-xs text-slate-400 mb-1 block">{tr("ui.confirm_new_password_7a0fe0f4")}</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={tr("ui.repeat_password_f012d34b")}
                  autoComplete="new-password"
                  required
                />
              </div>

            </form>
      </BaseModal2026>
    </div>
  );
};
