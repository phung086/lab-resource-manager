import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React, { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar.tsx";
import { Header } from "./Header.tsx";
import { ProjectFooter } from "./features/ProjectFooter";
import { KeyRound } from "lucide-react";
import { BaseModal2026 } from "./BaseModal2026.tsx";
import "../styles/home-structure.css";
import { PasswordChangeForm } from './features/accounts/PasswordChangeForm';
import { AI_ASSISTANT_ENABLED } from "../config/featureFlags";
import { AssistantLauncher } from './features/assistant/AssistantLauncher';
import { MaintenanceNoticeToast } from './features/monitoring/MaintenanceNoticeToast';
const LaboratoryAssistant = React.lazy(() => import("./features/assistant/LaboratoryAssistant"));

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
  incidentOpenCount?: number;
  conflictsCount?: number;
  loading?: boolean;
  onRefresh?: () => void;
  onLogout?: () => void;
  onPasswordChanged?: () => void;
  onAssistantPrefill?: (slot: { resourceId: string; startAt: string; endAt: string; title?: string; purpose?: string; purposeCode?: string }) => void;
  onAssistantSupportDraft?: (draft: import('../services/chatgptBridgeProposals').BridgeSupportDraft) => void;
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
  incidentOpenCount,
  conflictsCount = 0,
  loading = false,
  onRefresh,
  onLogout,
  onPasswordChanged,
  onAssistantPrefill,
  onAssistantSupportDraft,
  children
}) => {
  const { tr } = useLocale();
  const [navigationPinned, setNavigationPinned] = useState(() => {
    try { return localStorage.getItem('lrm.navigation.pinned') === 'true' && window.innerWidth >= 1100; } catch { return false; }
  });
  function pinNavigation(pinned: boolean) {
    setNavigationPinned(pinned);
    try { localStorage.setItem('lrm.navigation.pinned', String(pinned)); } catch { /* Storage can be unavailable. */ }
  }
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1100px)');
    const resize = () => { if (!media.matches) setNavigationPinned(false); };
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, []);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMounted, setAssistantMounted] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
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

  function openAssistant() {
    if (user?.passwordResetRequired && !passwordSuccess) { setChangePasswordOpen(true); return; }
    setAssistantMounted(true);
    setAssistantOpen(true);
  }

  function navigateFromShell(tab: string) {
    handleSelectTab(tab);
    if (!user?.passwordResetRequired || passwordSuccess) {
      window.scrollTo(0, 0);
      document.getElementById('workspace-main')?.focus({ preventScroll: true });
    }
  }

  function closePasswordModal() {
    if (passwordBusy) return;
    if (user?.passwordResetRequired && !passwordSuccess) return;
    setChangePasswordOpen(false);
    setPasswordSuccess(false);
  }

  // Map activeTab to readable header title
  const tabTitles: Record<string, string> = {
    stock: translate("ui.materials_inventory_2b570ac6"),
    home: tr("ui.workspace_970a97e3"),
    profile: translate("ui.profile_and_lab_preferences_ab1e68a1"),
    payments: translate("ui.payments_d4b946cc"),
    smart_calendar: tr("ui.room_and_equipment_calendar_cce9c071"),
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
    bookings: tr(["ADMIN", "LAB_STAFF"].includes(user?.role || "") ? "ui.bookings_and_handover_3e0e5754" : "ui.my_bookings_094ca2d9"),
    maintenance: translate("ui.maintenance_and_calibration_schedule_ed6489ac"),
    monitoring: translate("ui.operational_monitoring_and_telemetry_296bd9d7"),
    pareto: translate("ui.optimization_explorer_8e8c6b09"),
    timeline: translate("ui.coordination_history_e087e3dc"),
    concurrency: translate("ui.booking_concurrency_control_9b5313ac"),
    ga_solver: translate("ui.scheduling_algorithm_4c48c66a"),
    ai_rca: translate("ui.incident_root_cause_analysis_83e98bb2"),
    assistant: translate("ui.lab_operations_assistant_9d99d2ba"),
    chatgpt_bridge: tr("bridge.title"),
    incidents: tr("ui.resource_incidents_0cba217b"),
    training: translate("ui.lab_training_and_safety_26f5f367"),
    logs: translate("ui.audit_logs_da29e2f6"),
    users: tr(user?.role === "ADMIN" ? "ui.user_administration_4150792e" : "account.users.customers")
  };

  const currentTitle = tr(tabTitles[activeTab]) || tr("core.app.name");
  const unreadCount = notifications.filter((n) => !n.readAt).length;

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
        incidentOpenCount={incidentOpenCount}
        conflictsCount={conflictsCount}
        locale={locale}
        pinned={navigationPinned}
        onPinnedChange={pinNavigation}
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
          onOpenHome={() => navigateFromShell("home")}
          onLogout={onLogout}
          onOpenAssistant={AI_ASSISTANT_ENABLED ? openAssistant : undefined}
          assistantControl={AI_ASSISTANT_ENABLED && !changePasswordOpen ? <AssistantLauncher open={assistantOpen} onClick={() => assistantOpen ? setAssistantOpen(false) : openAssistant()} /> : undefined}
        />

        <main id="workspace-main" tabIndex={-1} className="main-body-container-2026">
          {children}
          <MaintenanceNoticeToast role={user?.role || ''}/>
        </main>
        <ProjectFooter variant="workspace" role={user?.role} onNavigate={navigateFromShell} />
      </div>

      {AI_ASSISTANT_ENABLED && assistantMounted && <React.Suspense fallback={assistantOpen ? <p className="assistant-loading" role="status">{translate("ui.opening_assistant_9a8f8008")}</p> : null}>
        <LaboratoryAssistant actorRole={user?.role} isOpen={assistantOpen && !navigationOpen && !changePasswordOpen} workspaceTab={activeTab} onClose={() => setAssistantOpen(false)} onPrefill={slot => onAssistantPrefill?.(slot)} onSupportDraft={onAssistantSupportDraft} onNavigate={navigateFromShell} />
      </React.Suspense>}

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
        </>}
      >
        <PasswordChangeForm email={user?.email} onBusyChange={setPasswordBusy} onSuccess={() => { setPasswordSuccess(true); onPasswordChanged?.(); }} />
      </BaseModal2026>
    </div>
  );
};
