
import { translate, localizeNotification } from "./i18n.js";
import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  CalendarCheck,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MailCheck,
  MonitorUp,
  Plus,
  QrCode,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  X,
  Play,
  Sliders,
  Layers,
  Radio,
  ShieldAlert,
  Cpu,
  Flame,
  Leaf,
  Zap
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { ApiError, apiRequest, getCurrentUser, hasStoredSession, login, logout, register, storeAuthResult } from "./api.js";
import { QuickBookingModal } from "./components/QuickBookingModal.tsx";
import { AuthLoginView } from "./components/AuthLoginView.tsx";
import { AuthRegisterView } from "./components/AuthRegisterView.tsx";
import { PublicLanding } from "./components/PublicLanding.tsx";
import { LocaleProvider, useLocale } from "./providers/LocaleProvider.tsx";
import { WorkspaceHome } from "./pages/WorkspaceHome";
import { AppLayout } from "./components/AppLayout.tsx";
import { NotificationCenter } from "./components/NotificationCenter.jsx";
import { hashForTab, tabFromHash } from "./workspaceRoutes.js";
import {
  emptyBookingForm,
  emptyUserForm,
  resourceGlyphLabels
} from "./constants.js";
import { getDictionary, interpolate, localeOptions } from "./i18n.js";
import { buildMonitoringRows, getMonitoringSummary, toBarWidth } from "./monitoring.js";
import { classNames, formatDateTime, formatPercent } from "./utils.js";
import { formatVietnamDateTime, vietnamTimeToIso } from "./utils/timezone.js";
import { RESEARCH_FEATURES_ENABLED, PAYMENT_FEATURES_ENABLED, isTabEnabled } from "./config/featureFlags";
const PaymentsPage = React.lazy(() => import("./components/features/payments/PaymentsPage"));
import {
  AiDiagnosticStudio,
  AiMissionCopilot,
  AuditLogsView,
  ConcurrencyStressMonitor,
  ConflictResolutionQueue,
  CostChargebackReport,
  DecisionTimelineReplay,
  DigitalTwinCanvas,
  EfficiencyAnalyticsView,
  GeneticAlgorithmVisualizer,
  OptimizationHubView,
  OrchestrationWizard,
  ParetoFrontierExplorer,
  PolicyRulesConfig,
  QrCheckInModal,
  QuotaFairnessDashboard,
  SafetyQuizModal,
  SmartAdvisoryView,
  VietQrPaymentModal,
  WhatIfSimulationStudio
} from "./research/ResearchFeatureRegistry";

const SmartCalendarView = React.lazy(() => import("./components/SmartCalendarView.tsx").then(module => ({ default: module.SmartCalendarView })));
const AdminResourceManagementView = React.lazy(() => import("./components/AdminResourceManagementView.tsx").then(module => ({ default: module.AdminResourceManagementView })));
const ResourceManagementView = React.lazy(() => import("./components/ResourceManagementView.tsx").then(module => ({ default: module.ResourceManagementView })));
const BookingOperationsPage = React.lazy(() => import("./pages/operations/BookingOperationsPage.tsx").then(module => ({ default: module.BookingOperationsPage })));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage.tsx").then(module => ({ default: module.ProfilePage })));
const AccessUserManagement = React.lazy(() => import("./components/AccessUserManagement.tsx").then(module => ({ default: module.AccessUserManagement })));
const IncidentsPage = React.lazy(() => import("./pages/incidents/IncidentsPage.tsx").then(module => ({ default: module.IncidentsPage })));
const MonitoringDashboardPage = React.lazy(() => import("./pages/monitoring/MonitoringDashboardPage.tsx").then(module => ({ default: module.MonitoringDashboardPage })));
const MaintenancePage = React.lazy(() => import("./pages/MaintenancePage").then(module => ({ default: module.MaintenancePage })));
const StockPage = React.lazy(() => import("./pages/LabWorkspace").then(module => ({ default: module.StockPage })));
const TeachingPage = React.lazy(() => import("./pages/LabWorkspace").then(module => ({ default: module.TeachingPage })));

let copy;

const ADMIN_ONLY_TABS = new Set(["users", "quota_fairness", "chargeback", "policy_config", "logs"]);
const STAFF_ONLY_TABS = new Set(["admin_management", "conflict_queue", "allocations", "dashboard", "maintenance", "monitoring"]);

function canAccessTab(role, tabId) {
  if (tabId === 'stock') return ['ADMIN', 'LAB_STAFF'].includes(role);
  if (tabId === 'teaching') return ['ADMIN', 'LECTURER', 'STUDENT'].includes(role);
  if (!isTabEnabled(tabId)) return false;
  if (ADMIN_ONLY_TABS.has(tabId)) return role === "ADMIN";
  if (STAFF_ONLY_TABS.has(tabId)) return role === "ADMIN" || role === "LAB_STAFF";
  return true;
}

function App() {
  return <LocaleProvider><Application /></LocaleProvider>;
}

function Application() {
  const { locale, changeLocale } = useLocale();
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, updateActiveTab] = useState(() => tabFromHash(window.location.hash));
  const [routeHash, setRouteHash] = useState(window.location.hash);
  function setActiveTab(tab) {
    updateActiveTab(tab);
    if (window.location.hash !== hashForTab(tab)) window.location.hash = hashForTab(tab);
  }
  const [paymentBookingId, setPaymentBookingId] = useState(() => new URLSearchParams(window.location.hash.split("?")[1] || "").get("booking") || "");
  const openBookingPayment = booking => {
    setActiveGlobalModal(null);
    setPaymentBookingId(booking.id);
    updateActiveTab("payments");
    window.location.hash = `${hashForTab("payments")}?booking=${encodeURIComponent(booking.id)}`;
  };
  const handleGuestBookingComplete = result => {
    if (result.requiresLogin || !result.accessToken) {
      setAuthMode("login");
      setTimeout(() => document.getElementById("dang-nhap")?.scrollIntoView({ behavior: "smooth" }), 0);
      return;
    }
    const stored = storeAuthResult(result);
    setUser(stored.user);
    setAuthMode("login");
    if (PAYMENT_FEATURES_ENABLED && Number(stored.booking?.feeAmountVnd || 0) > 0) {
      setPaymentBookingId(stored.booking.id);
      updateActiveTab("payments");
      window.history.replaceState(null, "", `${hashForTab("payments")}?booking=${encodeURIComponent(stored.booking.id)}`);
    } else {
      updateActiveTab("bookings");
      window.history.replaceState(null, "", hashForTab("bookings"));
    }
  };
  const [resourceSearch, setResourceSearch] = useState("");
  const [calendarResourceId, setCalendarResourceId] = useState("");
  useEffect(() => {
    if (!user) return;
    const pending = sessionStorage.getItem("lrm_pending_resource");
    if (!pending) return;
    sessionStorage.removeItem("lrm_pending_resource");
    setCalendarResourceId(pending);
    setActiveTab("smart_calendar");
  }, [user?.id]);
  const [calendarRevision, setCalendarRevision] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [trainings, setTrainings] = useState({ courses: [], certifications: [] });
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [activeGlobalModal, setActiveGlobalModal] = useState(null);

  const activeCopy = useMemo(() => getDictionary(locale), [locale]);
  copy = activeCopy;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const routeUserId = user?.id;
  const showingSchedule = activeTab === "home";
  const isPasswordResetRequired = Boolean(user?.passwordResetRequired);
  useEffect(() => {
    if (!routeUserId) return;
    const readRoute = () => {
      setRouteHash(window.location.hash);
      const targetTab = tabFromHash(window.location.hash);
      if (isPasswordResetRequired && !["home", "profile"].includes(targetTab)) {
        window.history.replaceState(null, "", hashForTab("home"));
        updateActiveTab("home");
        return;
      }
      updateActiveTab(targetTab);
      if (targetTab === "payments") {
        setPaymentBookingId(new URLSearchParams(window.location.hash.split("?")[1] || "").get("booking") || "");
      }
    };
    window.addEventListener("hashchange", readRoute);
    // Replace the public login anchor without adding a redundant history entry.
    if (!window.location.hash.startsWith("#/workspace/")) {
      window.history.replaceState(null, "", hashForTab(activeTab));
    }
    return () => window.removeEventListener("hashchange", readRoute);
  }, [routeUserId, activeTab, isPasswordResetRequired]);

  useEffect(() => {
    let active = true;
    async function bootstrapSession() {
      if (!hasStoredSession()) {
        setAuthChecking(false);
        return;
      }
      try {
        const currentUser = await getCurrentUser();
        if (active) setUser(currentUser);
      } catch (requestError) {
        if (active && requestError?.status !== 401) {
          setError(requestError?.message || "ui.unable_to_verify_your_sign_7e3493f9");
        }
      } finally {
        if (active) setAuthChecking(false);
      }
    }
    const invalidateSession = () => setUser(null);
    window.addEventListener("lrm:session-invalid", invalidateSession);
    bootstrapSession();
    return () => {
      active = false;
      window.removeEventListener("lrm:session-invalid", invalidateSession);
    };
  }, []);

  const isStaff = user && ["ADMIN", "LAB_STAFF"].includes(user.role);
  const researchFeaturesEnabled = RESEARCH_FEATURES_ENABLED;

  async function loadData() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const requests = {
        resources: apiRequest("/resources"),
        bookings: apiRequest("/bookings"),
        maintenance: apiRequest("/maintenance"),
        notifications: apiRequest("/notifications"),
        incidents: apiRequest("/incidents"),
        ...(["ADMIN", "LAB_STAFF"].includes(user.role) ? { dashboard: apiRequest("/dashboard") } : {}),
        ...(user.role === "ADMIN" ? { users: apiRequest("/users") } : {})
      };
      const entries = Object.entries(requests);
      const results = await Promise.allSettled(entries.map(([, promise]) => promise));
      const data = Object.fromEntries(entries.map(([key], index) => [key, results[index]]));
      const value = (key, fallback) => data[key]?.status === "fulfilled" ? data[key].value : fallback;

      setDashboard(value("dashboard", null));
      setResources(value("resources", []));
      setBookings(value("bookings", []));
      setMaintenance(value("maintenance", []));
      setNotifications(value("notifications", []));
      setUsers(value("users", []));
      setLogs([]);
      setIncidents(value("incidents", []));
      setTrainings({ courses: [], certifications: [] });

      const failed = entries
        .map(([key], index) => results[index].status === "rejected" ? key : null)
        .filter(Boolean);
      if (failed.length) {
        setError({ key: "ui.could_not_load_application_data_07ebdf44", params: { value0: failed.join(", ") } });
      }
    } catch (requestError) {
      setError(requestError?.message || "ui.unable_to_load_system_data_e9df8dd1");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) loadData();
  }, [routeUserId, showingSchedule]);

  useEffect(() => {
    if (user && !canAccessTab(user.role, activeTab)) {
      setActiveTab("smart_calendar");
      setError("ui.you_do_not_have_permission_e6eeee92");
    }
  }, [user?.role, activeTab]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [user, activeTab]);

  if (authChecking) {
    return <main className="login-screen"><p className="empty-state">{translate("ui.verifying_your_sign_in_session_90f206ba")}</p></main>;
  }

  if (!user) {
    if (authMode === "register") {
      return (
        <div className="public-auth-page"><a className="public-auth-back" href="#dau-trang" onClick={() => setAuthMode("login")}>{translate("ui.back_to_introduction_7876ebe9")}</a><AuthRegisterView
          onRegisterSuccess={(u) => {
            setUser(u);
            setAuthMode("login");
          }}
          onSwitchToLogin={() => { setAuthMode("login"); setTimeout(() => document.getElementById("dang-nhap")?.scrollIntoView(), 0); }}
          locale={locale}
          onLocaleChange={changeLocale}
        /></div>
      );
    }
    return (
      <PublicLanding onLocaleChange={changeLocale} onRegister={() => { setAuthMode("register"); window.scrollTo(0, 0); }} onViewSchedule={(id) => { sessionStorage.setItem("lrm_pending_resource", id); document.getElementById("dang-nhap")?.scrollIntoView({ behavior: "smooth" }); }} onGuestBookingComplete={handleGuestBookingComplete}><AuthLoginView
        onLogin={setUser}
        onSwitchToRegister={() => { setAuthMode("register"); window.scrollTo(0, 0); }}
        locale={locale}
        onLocaleChange={changeLocale}
      /></PublicLanding>
    );
  }

  return (
    <AppLayout
      activeTab={activeTab}
      onSelectTab={(tabId) => {
        if (canAccessTab(user.role, tabId)) {
          setError("");
          setActiveTab(tabId);
        } else {
          setError("ui.you_do_not_have_permission_e6eeee92");
        }
      }}
      user={user}
      locale={locale}
      onLocaleChange={changeLocale}
      notifications={notifications}
      incidents={incidents}
      conflictsCount={0}
      loading={loading}
      onRefresh={loadData}
      onAssistantPrefill={(slot) => setActiveGlobalModal({ type: "quick_booking", payload: slot })}
      onLogout={async () => {
        await logout();
        setUser(null);
        updateActiveTab("home");
        window.history.replaceState(null, "", "#dang-nhap");
      }}
      onPasswordChanged={async () => {
        try {
          const freshUser = await getCurrentUser();
          localStorage.setItem("lrm_user", JSON.stringify(freshUser));
          setUser(freshUser);
        } catch {
          const updatedUser = { ...user, passwordResetRequired: false };
          localStorage.setItem("lrm_user", JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
      }}
    >
      {error && <div className="alert danger" role="alert">{translate(error)}</div>}
      {user.passwordResetRequired && (
        <div className="card temporary-password-card" style={{ maxWidth: 680, margin: "1.5rem auto", padding: "1.75rem", border: "1px solid #fde68a", background: "#fffdf5", borderRadius: 16 }}>
          <div className="alert warning" style={{ marginBottom: "1.25rem", display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
            <span style={{ fontSize: "1.5rem" }} aria-hidden="true">🔒</span>
            <div>
              <strong style={{ fontSize: "1.05rem", display: "block", marginBottom: "0.35rem", color: "#92400e" }}>
                 {translate("ui.set_a_password_for_your_9d173b3e")} </strong>
              <p style={{ margin: 0, fontSize: "0.92rem", color: "#78350f", lineHeight: 1.5 }}>
                 {translate("ui.your_quick_booking_account_uses_f9eb9651")} </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "0.75rem", fontSize: "0.95rem" }}
            onClick={() => window.dispatchEvent(new CustomEvent("lrm:open-password-setup"))}
          >
             {translate("ui.change_password_now_837a566b")} </button>
        </div>
      )}

      <React.Suspense fallback={<p className="empty-state" role="status">{locale === "en" ? "Loading workspace…" : translate("ui.loading_workspace_959fb711")}</p>}>
      {/* REQUIRED CORE — Gated when passwordResetRequired */}
      {!user.passwordResetRequired && activeTab === "home" && (
        <WorkspaceHome
          user={user}
          bookings={bookings}
          locale={locale}
          notifications={notifications}
          incidents={incidents}
          trainings={trainings}
          loading={loading}
          error={translate(error)}
          onRetry={loadData}
          onNavigate={setActiveTab}
          onSearch={(query) => { setResourceSearch(query); setActiveTab("resources"); }}
        />
      )}
      {activeTab === "profile" && <ProfilePage user={user} onUserUpdated={setUser} />}
      {!user.passwordResetRequired && activeTab === 'stock' && canAccessTab(user.role, 'stock') && <StockPage locale={locale} user={user} maintenance={maintenance} />}
      {!user.passwordResetRequired && activeTab === 'teaching' && canAccessTab(user.role, 'teaching') && <TeachingPage locale={locale} user={user} bookings={bookings} />}
      {!user.passwordResetRequired && PAYMENT_FEATURES_ENABLED && activeTab === "payments" && (
        <React.Suspense fallback={<p role="status">{translate("ui.loading_payments_b1f91304")}</p>}>
          <PaymentsPage user={user} bookingId={paymentBookingId} onClearBooking={() => { setPaymentBookingId(""); setActiveTab("payments"); }} />
        </React.Suspense>
      )}
      {!user.passwordResetRequired && activeTab === "smart_calendar" && (
        <SmartCalendarView
          user={user}
          initialResourceId={calendarResourceId}
          refreshKey={calendarRevision}
          onOpenBooking={(slot) => setActiveGlobalModal({ type: "quick_booking", payload: slot })}
        />
      )}
      {!user.passwordResetRequired && activeTab === "admin_management" && <AdminResourceManagementView user={user} />}
      {!user.passwordResetRequired && activeTab === "escalations" && <NotificationCenter notifications={notifications} loading={loading} loadError={translate(error)} onOpenBookings={() => setActiveTab("bookings")} onChanged={loadData} />}
      {!user.passwordResetRequired && activeTab === "dashboard" && <MonitoringDashboardPage mode="operations" dashboard={dashboard} loading={loading} onRefresh={loadData} />}
      {!user.passwordResetRequired && activeTab === "resources" && <ResourceManagementView user={user} initialSearch={resourceSearch} onViewCalendar={(id) => { setCalendarResourceId(id); setActiveTab("smart_calendar"); }} />}
      {!user.passwordResetRequired && activeTab === "bookings" && <BookingOperationsPage key={routeHash} user={user} onChanged={loadData} onPayment={PAYMENT_FEATURES_ENABLED ? openBookingPayment : undefined} />}
      {!user.passwordResetRequired && activeTab === "maintenance" && <MaintenancePage locale={locale} resources={resources} maintenance={maintenance} onChanged={loadData} onBookings={() => setActiveTab('bookings')} />}
      {!user.passwordResetRequired && activeTab === "incidents" && <IncidentsPage user={user} resources={resources} incidents={incidents} onChanged={loadData} />}
      {activeTab === "monitoring" && <MonitoringDashboardPage dashboard={dashboard} loading={loading} onRefresh={loadData} />}
      {activeTab === "users" && <AccessUserManagement />}

      </React.Suspense>

      {researchFeaturesEnabled && (
        <React.Suspense fallback={<p className="empty-state">{translate("ui.loading_research_area_6307330d")}</p>}>
          {activeTab === "ai_analytics" && <EfficiencyAnalyticsView />}
          {activeTab === "ai_advisor" && (
            <SmartAdvisoryView onApplyRecommendation={() => setActiveTab("smart_calendar")} />
          )}
          {activeTab === "conflict_queue" && <ConflictResolutionQueue />}
          {activeTab === "quota_fairness" && <QuotaFairnessDashboard />}
          {activeTab === "chargeback" && <CostChargebackReport />}
          {activeTab === "policy_config" && <PolicyRulesConfig />}
          {activeTab === "allocations" && <OrchestrationWizard onAllocated={loadData} />}
          {activeTab === "pareto" && <ParetoFrontierExplorer />}
          {activeTab === "timeline" && <DecisionTimelineReplay />}
          {activeTab === "digital_twin" && <DigitalTwinCanvas />}
          {activeTab === "what_if" && <WhatIfSimulationStudio />}
          {activeTab === "concurrency" && <ConcurrencyStressMonitor />}
          {activeTab === "ga_solver" && <GeneticAlgorithmVisualizer />}
          {activeTab === "ai_rca" && <AiDiagnosticStudio />}
          {activeTab === "assistant" && <AiMissionCopilot />}
          {activeTab === "optimization" && <OptimizationHubView />}
          {activeTab === "training" && <TrainingView courses={trainings.courses} certifications={trainings.certifications} resources={resources} user={user} isStaff={isStaff} onChanged={loadData} />}
          {activeTab === "logs" && <AuditLogsView />}
        </React.Suspense>
      )}

      <QuickBookingModal
        isOpen={activeGlobalModal?.type === "quick_booking"}
        onClose={() => setActiveGlobalModal(null)}
        initialSlot={activeGlobalModal?.payload}
        onProceedPayment={PAYMENT_FEATURES_ENABLED ? openBookingPayment : undefined}
        onViewBookings={() => { setActiveGlobalModal(null); setActiveTab("bookings"); }}
        onConfirmBooking={() => {
          setCalendarRevision(value => value + 1);
          loadData();
        }}
      />

      {researchFeaturesEnabled && (
        <React.Suspense fallback={null}>
          <VietQrPaymentModal
            isOpen={activeGlobalModal?.type === "vietqr"}
            onClose={() => setActiveGlobalModal(null)}
            amount={activeGlobalModal?.payload?.amount || 150000}
            bookingTitle={activeGlobalModal?.payload?.title || "Research payment demo"}
            resourceName={activeGlobalModal?.payload?.resourceName || "Research resource"}
            onPaidSuccess={() => loadData()}
          />
          <QrCheckInModal
            isOpen={activeGlobalModal?.type === "qr_checkin"}
            onClose={() => setActiveGlobalModal(null)}
            booking={activeGlobalModal?.payload}
            onCheckinSuccess={() => loadData()}
          />
          <SafetyQuizModal
          isOpen={activeGlobalModal?.type === "safety_quiz"}
          onClose={() => setActiveGlobalModal(null)}
          courseTitle={activeGlobalModal?.payload?.title || "Research safety quiz demo"}
          onPassed={() => loadData()}
          />
        </React.Suspense>
      )}

    </AppLayout>
  );
}

function LoginView({ locale, onLocaleChange, onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        const result = await register({ email, password, fullName, studentId, department });
        onLogin(result.user);
      } else {
        const result = await login(email, password);
        onLogin(result.user);
      }
    } catch (requestError) {
      handleError(requestError, setError, copy);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="login-visual">
          <div className="visual-content">
            <span className="eyebrow">{copy.login.visualKicker}</span>
            <h1>{copy.login.visualTitle}</h1>
            <p>{copy.login.visualSubtitle}</p>
            <div className="visual-resource-list">
              {copy.login.resources.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <div className="lab-console" aria-hidden="true">
              <div className="rack-column">
                <i />
                <i />
                <i />
              </div>
              <div className="console-grid">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
            <p className="visual-note">{copy.login.visualNote}</p>
          </div>
        </div>
        <form className="login-form" onSubmit={submit}>
          <div className="login-form-header">
            <div className="brand compact">
              <div className="brand-mark">
                <MonitorUp size={22} />
              </div>
              <div>
                <strong>{copy.app.name}</strong>
                <span>{copy.app.subtitle}</span>
              </div>
            </div>
            <LanguageSwitch locale={locale} onLocaleChange={onLocaleChange} />
          </div>
          <div className="login-copy">
            <h2>{isRegister ? translate("ui.create_a_new_account_0a74930a") : copy.login.title}</h2>
            <p>{isRegister ? translate("ui.create_a_student_account_to_6271d2f3") : copy.login.subtitle}</p>
          </div>
          {error && <div className="alert danger">{translate(error)}</div>}

          {isRegister && (
            <>
              <label>
                 {translate("ui.full_name_03de764f")} <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder={translate("ui.example_jane_nguyen_a52e39e4")}
                  required
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <label>
                   {translate("ui.student_lecturer_id_a78950c7")} <input
                    type="text"
                    value={studentId}
                    onChange={(event) => setStudentId(event.target.value)}
                    placeholder={translate("ui.sv2026_001_444da05c")}
                  />
                </label>
                <label>
                   {translate("ui.faculty_institute_981a1987")} <input
                    type="text"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    placeholder={translate("ui.cntt_ai_ae184d18")}
                  />
                </label>
              </div>
            </>
          )}

          <label>
            {copy.fields.email}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={copy.placeholders.email}
              required
              autoComplete="email"
            />
          </label>
          <label>
            {copy.fields.password}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={copy.placeholders.password}
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </label>

          <button className="primary-button" type="submit" disabled={loading} style={{ marginTop: "0.5rem" }}>
            <ShieldCheck size={18} />
            <span>{loading ? (isRegister ? translate("ui.creating_account_e188bae5") : copy.actions.signingIn) : (isRegister ? translate("ui.register_now_48bcf799") : copy.actions.signIn)}</span>
          </button>

          <div style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.9rem" }}>
            {isRegister ? (
              <span>
                 {translate("ui.already_have_an_account_c2b43137")}{" "}
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setError(""); }}
                  style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: "600", textDecoration: "underline" }}
                >
                   {translate("ui.sign_in_9a402bdf")} </button>
              </span>
            ) : (
              <span>
                 {translate("ui.do_not_have_an_account_4b5c6e81")}{" "}
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setError(""); }}
                  style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: "600", textDecoration: "underline" }}
                >
                   {translate("ui.create_a_new_account_0a74930a")} </button>
              </span>
            )}
          </div>
          <p className="helper-text compact-note" style={{ marginTop: "0.75rem" }}>{copy.login.securityNote}</p>
        </form>
      </section>
    </main>
  );
}

function DashboardView({ dashboard, resources, bookings, onNavigate }) {
  const stats = dashboard?.stats || {};
  const approvedToday = bookings.filter((booking) => {
    const date = new Date(booking.startAt);
    const today = new Date();
    return booking.status === "approved" && date.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="content-stack">
      <section className="metric-grid">
        <Metric icon={Server} label={copy.metrics.resources} value={resources.length} tone="blue" actionLabel={copy.actions.viewResources} onClick={() => onNavigate("resources")} />
        <Metric icon={CalendarCheck} label={copy.metrics.pending} value={stats.pendingBookings || 0} tone="amber" actionLabel={copy.actions.viewBookings} onClick={() => onNavigate("bookings")} />
        <Metric icon={Check} label={copy.metrics.today} value={approvedToday} tone="green" actionLabel={copy.actions.viewBookings} onClick={() => onNavigate("bookings")} />
        <Metric icon={Activity} label={copy.metrics.alerts} value={stats.alerts || 0} tone="red" actionLabel={copy.actions.viewMonitoring} onClick={() => onNavigate("monitoring")} />
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-main-column">
          <div className="panel">
            <PanelTitle icon={CalendarCheck} title={copy.sections.upcoming} />
            <BookingList bookings={dashboard?.upcomingBookings || []} compact />
          </div>
          <div className="panel">
            <PanelTitle icon={ClipboardCheck} title={copy.sections.recentActivity} />
            <LogTable logs={dashboard?.recentLogs || []} />
          </div>
        </div>
        <div className="panel">
          <PanelTitle icon={Activity} title={copy.sections.monitoring} />
          <MonitoringList telemetry={dashboard?.telemetry || []} limit={5} />
        </div>
      </section>
    </div>
  );
}

function AssistantView({ locale }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/assistant/suggestions?locale=${locale}`)
      .then((result) => {
        if (!cancelled) setSuggestions(result.suggestions || []);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  async function submit(question = input) {
    const message = question.trim();
    if (!message || loading) return;

    setError("");
    setLoading(true);
    setInput("");
    setMessages((current) => [...current, { role: "user", text: message }]);
    try {
      const response = await apiRequest("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message, locale })
      });
      setMessages((current) => [...current, { role: "assistant", ...response }]);
      if (response.suggestions?.length) setSuggestions(response.suggestions);
    } catch (requestError) {
      handleError(requestError, setError, copy);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="assistant-layout">
      <section className="panel assistant-panel">
        <PanelTitle icon={Sparkles} title={copy.sections.assistant} />
        <p className="helper-text">{copy.notes.assistantScope}</p>
        <form
          className="assistant-form"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={copy.placeholders.assistantQuestion}
            aria-label={copy.aria.assistantInput}
          />
          <button className="primary-button" type="submit" disabled={loading || !input.trim()}>
            <Send size={17} />
            <span>{loading ? copy.actions.sending : copy.actions.askAssistant}</span>
          </button>
        </form>
        {error && <div className="alert danger">{translate(error)}</div>}
        <div className="assistant-suggestions">
          <h3>{copy.sections.assistantSuggestions}</h3>
          <div className="prompt-list">
            {suggestions.map((item) => (
              <button key={item} type="button" onClick={() => submit(item)} disabled={loading}>
                {item}
              </button>
            ))}
          </div>
        </div>
        <p className="helper-text">{copy.notes.assistantMcp}</p>
      </section>

      <section className="panel assistant-results">
        <PanelTitle icon={Bot} title={copy.sections.assistantInsights} />
        {!messages.length ? (
          <p className="empty-state">{copy.empty.assistant}</p>
        ) : (
          <div className="chat-list">
            {messages.map((message, index) => (
              <article className={classNames("chat-message", message.role)} key={`${message.role}-${index}`}>
                <span>{message.role === "user" ? copy.assistant.you : copy.assistant.assistant}</span>
                <div className="chat-bubble">
                  {message.role === "assistant" ? (
                    <>
                      <p>{message.answer}</p>
                      {(message.toolsUsed || []).length > 0 && (
                        <div className="tool-chip-list" aria-label={copy.assistant.checkedData}>
                          <strong>{copy.assistant.checkedData}</strong>
                          {message.toolsUsed.map((tool) => (
                            <span key={tool}>{copy.assistant.tools[tool] || tool}</span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p>{message.text}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MonitoringView({ telemetry }) {
  return (
    <div className="content-stack">
      <section className="panel">
        <PanelTitle icon={Activity} title={copy.sections.monitoring} />
        <MonitoringList telemetry={telemetry} />
      </section>
    </div>
  );
}

function LogsView({ logs, notifications, onChanged }) {
  const [error, setError] = useState("");
  const unreadNotifications = notifications.filter((item) => !item.readAt);

  async function markRead(id) {
    setError("");
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "POST" });
      onChanged();
    } catch (requestError) {
      handleError(requestError, setError, copy);
    }
  }

  async function markAllRead() {
    setError("");
    try {
      await apiRequest("/notifications/read-all", { method: "POST" });
      onChanged();
    } catch (requestError) {
      handleError(requestError, setError, copy);
    }
  }

  return (
    <div className="split-layout">
      <section className="panel">
        <PanelTitle icon={ClipboardCheck} title={copy.sections.logs || copy.nav.logs} />
        <LogTable logs={logs} />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <PanelTitle icon={Bell} title={copy.sections.notifications} />
          <button className="secondary-button compact-action" type="button" disabled={!unreadNotifications.length} onClick={markAllRead}>
            <MailCheck size={15} />
            <span>{copy.actions.markAllRead}</span>
          </button>
        </div>
        {error && <div className="alert danger">{translate(error)}</div>}
        {!notifications.length ? (
          <p className="empty-state">{copy.empty.notifications}</p>
        ) : (
          <div className="notification-list">
            {notifications.map((item) => {
              const notification = translateNotification(item);
              return (
                <article className={classNames("notification-item", item.severity)} key={item.id}>
                  <div>
                    <strong>{notification.title}</strong>
                    <span>{notification.message}</span>
                  </div>
                  <time>{formatDateTime(item.createdAt, copy.localeCode)}</time>
                  {!item.readAt && (
                    <button className="table-action notification-action" type="button" onClick={() => markRead(item.id)}>
                      <MailCheck size={15} />
                      <span>{copy.actions.markRead}</span>
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function UsersView({ users, onChanged }) {
  const [form, setForm] = useState(emptyUserForm);
  const [error, setError] = useState("");

  async function createUser(event) {
    event.preventDefault();
    setError("");
    try {
      await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          role: form.role,
          password: form.password,
          isActive: form.isActive
        })
      });
      setForm({ ...emptyUserForm });
      onChanged();
    } catch (requestError) {
      handleError(requestError, setError, copy);
    }
  }

  async function toggleUser(targetUser) {
    setError("");
    try {
      await apiRequest(`/users/${targetUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !targetUser.isActive })
      });
      onChanged();
    } catch (requestError) {
      handleError(requestError, setError, copy);
    }
  }

  return (
    <div className="split-layout">
      <section className="panel">
        <PanelTitle icon={Users} title={copy.sections.createUser} />
        {error && <div className="alert danger">{translate(error)}</div>}
        <form className="booking-form" onSubmit={createUser}>
          <label>
            {copy.fields.fullName}
            <input
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              placeholder={copy.placeholders.fullName}
              required
            />
          </label>
          <label>
            {copy.fields.email}
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder={copy.placeholders.email}
              required
            />
          </label>
          <div className="form-grid">
            <label>
              {copy.fields.role}
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} required>
                <option value="">{copy.options.chooseRole}</option>
                {Object.entries(copy.roles).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {copy.fields.temporaryPassword}
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder={copy.placeholders.password}
                required
              />
            </label>
          </div>
          <p className="helper-text">{copy.notes.userPassword}</p>
          <button className="primary-button" type="submit">
            <Plus size={18} />
            <span>{copy.actions.createAccount}</span>
          </button>
        </form>
      </section>

      <section className="panel">
        <PanelTitle icon={ShieldCheck} title={copy.sections.userList} />
        {!users.length ? (
          <p className="empty-state">{copy.empty.users}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{copy.table.name}</th>
                  <th>{copy.table.email}</th>
                  <th>{copy.table.role}</th>
                  <th>{copy.table.status}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>{item.fullName}</td>
                    <td>{item.email}</td>
                    <td>{copy.roles[item.role]}</td>
                    <td>{item.isActive ? copy.options.active : copy.options.inactive}</td>
                    <td>
                      <button className="table-action" type="button" onClick={() => toggleUser(item)}>
                        {item.isActive ? copy.actions.lock : copy.actions.unlock}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone, actionLabel, onClick }) {
  return (
    <button className={classNames("metric", tone)} type="button" onClick={onClick}>
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{actionLabel}</small>
    </button>
  );
}

function LanguageSwitch({ locale, onLocaleChange, compact = false }) {
  return (
    <div className={classNames("language-switch", compact && "compact")} role="group" aria-label={copy.aria.languageSwitch}>
      {!compact && <span>{copy.languages.label}</span>}
      {localeOptions.map((item) => (
        <button
          key={item}
          type="button"
          className={locale === item ? "is-active" : ""}
          title={copy.languages[item]}
          aria-label={`${copy.actions.changeLanguage}: ${copy.languages[item]}`}
          onClick={() => onLocaleChange(item)}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function PanelTitle({ icon: Icon, title }) {
  return (
    <div className="panel-title">
      <Icon size={18} />
      <h2>{title}</h2>
    </div>
  );
}

function BookingList({ bookings, compact = false }) {
  if (!bookings.length) {
    return <p className="empty-state">{copy.empty.bookings}</p>;
  }

  return (
    <div className={classNames("booking-list", compact && "compact")}>
      {bookings.map((booking) => (
        <article className="booking-item" key={booking.id}>
          <div>
            <span className="eyebrow">{booking.resource?.code}</span>
            <h3>{booking.title}</h3>
            <p>{booking.resource?.name}</p>
            <BookingWorkflow status={booking.status} />
            <div className="spec-list">
              <span>{formatDateTime(booking.startAt, copy.localeCode)}</span>
              <span>{formatDateTime(booking.endAt, copy.localeCode)}</span>
              <span>{booking.requestedBy?.fullName}</span>
            </div>
          </div>
          <div className="booking-actions">
            <StatusBadge status={booking.status} />
          </div>
        </article>
      ))}
    </div>
  );
}

function BookingWorkflow({ status }) {
  const steps = [
    { key: "PENDING_APPROVAL", label: translate("ui.requested_2ff978a2") },
    { key: "CONFIRMED", label: translate("ui.approved_e7881844") },
    { key: "CHECKED_OUT", label: translate("ui.handed_over_216b5cbb") },
    { key: "RETURNED", label: translate("ui.returned_fd3eb4fb") },
    { key: "COMPLETED", label: translate("ui.completed_b0484236") }
  ];
  const terminalLabels = { REJECTED: translate("ui.reject_b61a0ebc"), CANCELLED: translate("ui.cancelled_2f777a90") };
  if (terminalLabels[status]) {
    return <div className="booking-workflow terminal"><span>{terminalLabels[status]}</span></div>;
  }
  const activeIndex = Math.max(0, steps.findIndex((step) => step.key === status));
  return (
    <div className="booking-workflow">
      {steps.map((step, index) => (
        <span key={step.key} className={classNames(index < activeIndex && "done", index === activeIndex && "current")}>
          {step.label}
        </span>
      ))}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MonitoringList({ telemetry, limit }) {
  const items = limit ? telemetry.slice(0, limit) : telemetry;
  if (!items.length) return <p className="empty-state">{copy.empty.monitoring}</p>;

  return (
    <div className="telemetry-list">
      {items.map(({ resource, latestTelemetry }) => {
        const summary = getMonitoringSummary(resource, latestTelemetry, copy);
        return (
          <article className="telemetry-item" key={resource.id}>
            <div className="row between">
              <div>
                <span className="eyebrow">{resource.code}</span>
                <h3>{resource.name}</h3>
              </div>
              <StatusBadge status={latestTelemetry?.online === false ? "offline" : resource.status} />
            </div>
            {latestTelemetry ? (
              <>
                <HealthLine summary={summary} />
                <div className="issue-list">
                  {summary.issues.map((issue) => (
                    <span key={issue}>{issue}</span>
                  ))}
                </div>
                <MonitoringBars resource={resource} sample={latestTelemetry} />
              </>
            ) : (
              <TelemetryEmptyState />
            )}
          </article>
        );
      })}
    </div>
  );
}

function MonitoringMini({ sample }) {
  if (!sample) return <div className="mini-telemetry empty"><span>{copy.monitoringIssues.noTelemetry}</span></div>;
  const summary = getMonitoringSummary(null, sample, copy);
  return (
    <div className="mini-telemetry">
      <span>{copy.monitoring.health} {summary.score}/100</span>
      <span>{copy.monitoring.gpu} {formatPercent(sample.gpuPercent)}</span>
      <span>{copy.monitoring.ram} {formatPercent(sample.ramPercent)}</span>
    </div>
  );
}

function TelemetryEmptyState() {
  return (
    <div className="telemetry-empty">
      <Activity size={16} />
      <span>{copy.monitoringIssues.noTelemetry}</span>
    </div>
  );
}

function MonitoringBars({ resource, sample }) {
  if (!sample) return <TelemetryEmptyState />;
  const bars = buildMonitoringRows(resource, sample, copy);
  return (
    <div className="bar-grid">
      {bars.map((row) => (
        <div className={classNames("bar-row", row.level)} key={row.key}>
          <span>{row.label}</span>
          <div className="bar-track">
            <i style={{ width: toBarWidth(row.value) }} />
          </div>
          <strong>{row.displayValue}</strong>
        </div>
      ))}
    </div>
  );
}

function HealthLine({ summary }) {
  return (
    <div className={classNames("health-line", summary.state)}>
      <div>
        <span>{copy.monitoring.health}</span>
        <strong>{summary.score === null ? summary.label : `${summary.score}/100`}</strong>
      </div>
      <div className="health-track">
        <i style={{ width: `${summary.score ?? 0}%` }} />
      </div>
      <span>{summary.label}</span>
    </div>
  );
}

function LogTable({ logs }) {
  if (!logs.length) return <p className="empty-state">{copy.empty.logs}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{copy.table.time}</th>
            <th>{copy.table.resource}</th>
            <th>{copy.table.operator}</th>
            <th>{copy.table.action}</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{formatDateTime(log.createdAt, copy.localeCode)}</td>
              <td>{log.resource?.code}</td>
              <td>{log.user?.fullName}</td>
              <td>{translateUsageLog(log)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={classNames("status-badge", status)}>{copy.statuses[status] || status}</span>;
}

function SpecChips({ specs }) {
  const entries = Object.entries(specs || {}).slice(0, 4);
  if (!entries.length) return null;
  return (
    <div className="chips">
      {entries.map(([key, value]) => (
        <span key={key}>
          {formatSpecLabel(key)}: {formatSpecValue(value)}
        </span>
      ))}
    </div>
  );
}

function ResourceGlyph({ type }) {
  return <strong>{copy.resourceGlyphs?.[type] || resourceGlyphLabels[type] || resourceGlyphLabels.room}</strong>;
}

function formatSpecLabel(key) {
  if (copy.specLabels?.[key]) return copy.specLabels[key];
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
}

function formatSpecValue(value) {
  if (typeof value === "boolean") return value ? copy.options.yes : copy.options.no;
  const text = String(value);
  if (/^(true|yes)$/i.test(text)) return copy.options.yes;
  if (/^(false|no)$/i.test(text)) return copy.options.no;
  return text;
}

function translateUsageLog(log) {
  const params = {
    ...readMessageParams(log.messageParams),
    title: log.booking?.title || log.message,
    resource: log.resource?.code || log.resource?.name || copy.empty.value
  };
  const key = log.messageKey || log.action;
  const template = copy.usageLogs[key] || copy.usageLogs[log.action];
  return template ? interpolate(template, params) : log.message || copy.empty.value;
}

function translateNotification(notification) { return localizeNotification(notification); }

function readMessageParams(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function handleError(error, setError, activeCopy = copy) {
  if (error instanceof ApiError) {
    setError((error.code && activeCopy.apiMessages[error.code]) || error.message || activeCopy.errors.apiRequestFailed);
  } else {
    setError(activeCopy.errors.connection);
  }
}

// ─── IncidentView ─────────────────────────────────────────────────────────────

function IncidentView({ incidents, resources, user, isStaff, onChanged }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ resourceId: "", title: "", description: "", severity: "medium", category: "" });
  const [selected, setSelected] = useState(null);
  const [resolveForm, setResolveForm] = useState({ resolution: "" });

  const severityColors = { low: "info", medium: "warning", high: "danger", critical: "danger" };
  const statusLabels = { reported: translate("ui.reported_977c15d8"), triaged: translate("ui.triaged_4652a509"), assigned: translate("ui.assigned_5dd582ca"), investigating: translate("ui.investigating_8723e350"), resolved: translate("ui.resolved_1c5b11f2"), verified: translate("ui.confirmed_e72d13e3"), closed: translate("ui.closed_6b919498") };

  async function submitIncident(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await apiRequest("/incidents", { method: "POST", body: JSON.stringify(form) });
      setShowForm(false);
      setForm({ resourceId: "", title: "", description: "", severity: "medium", category: "" });
      onChanged();
    } catch (err) { handleError(err, setError); }
    finally { setLoading(false); }
  }

  async function resolveIncident(incidentId) {
    if (!resolveForm.resolution.trim()) return;
    setError(""); setLoading(true);
    try {
      await apiRequest(`/incidents/${incidentId}/resolve`, { method: "POST", body: JSON.stringify(resolveForm) });
      setSelected(null);
      setResolveForm({ resolution: "" });
      onChanged();
    } catch (err) { handleError(err, setError); }
    finally { setLoading(false); }
  }

  return (
    <div className="view-root">
      <div className="view-header">
        <div>
          <h2>{translate("ui.incident_management_f0a0ff67")}</h2>
          <p className="view-subtitle">{translate("ui.report_and_track_equipment_incidents_df6e8ec0")}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} />  {translate("ui.report_an_incident_0527866e")} </button>
      </div>

      {error && <div className="alert danger">{translate(error)}</div>}

      {showForm && (
        <form className="card form-card" onSubmit={submitIncident}>
          <h3>{translate("ui.report_a_new_incident_20b7d078")}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>{translate("ui.equipment_94baa594")}</label>
              <select required value={form.resourceId} onChange={e => setForm({ ...form, resourceId: e.target.value })}>
                <option value="">{translate("ui.select_equipment_1e4a8c33")}</option>
                {resources.map(r => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{translate("ui.severity_7b8b12cb")}</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                <option value="low">{translate("ui.low_4e45ab86")}</option>
                <option value="medium">{translate("ui.medium_928d4573")}</option>
                <option value="high">{translate("ui.high_e1595bd0")}</option>
                <option value="critical">{translate("ui.critical_9559e09a")}</option>
              </select>
            </div>
            <div className="form-group full-width">
              <label>{translate("ui.title_fd0e6d82")}</label>
              <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={translate("ui.briefly_describe_the_incident_f7fcd317")} />
            </div>
            <div className="form-group full-width">
              <label>{translate("ui.detailed_description_dcb89d43")}</label>
              <textarea required rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={translate("ui.describe_the_incident_in_detail_28a80c4a")} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>{translate("ui.submit_report_2c993a8a")}</button>
            <button type="button" className="btn" onClick={() => setShowForm(false)}>{translate("ui.cancel_96732485")}</button>
          </div>
        </form>
      )}

      <div className="card-list">
        {incidents.length === 0 && <div className="empty-state"><AlertTriangle size={40} /><p>{translate("ui.no_incidents_recorded_1111e4e9")}</p></div>}
        {incidents.map(incident => (
          <div key={incident.id} className="card incident-card">
            <div className="card-header">
              <div>
                <span className={`badge ${severityColors[incident.severity] || "info"}`}>{incident.severity.toUpperCase()}</span>
                <strong style={{ marginLeft: 8 }}>{incident.title}</strong>
              </div>
              <span className="badge info">{statusLabels[incident.status] || incident.status}</span>
            </div>
            <p className="card-text">{incident.description}</p>
            <div className="card-meta">
              <span>{translate("ui.equipment_393f30b5")} {incident.resource?.name}</span>
              <span>{translate("ui.reported_by_f6cb3b69")} {incident.reportedBy?.fullName}</span>
              <span>{new Date(incident.createdAt).toLocaleString("vi-VN")}</span>
            </div>
            {isStaff && !["resolved", "verified", "closed"].includes(incident.status) && (
              <div className="card-actions">
                {selected?.id === incident.id ? (
                  <div className="inline-resolve">
                    <textarea rows={2} placeholder={translate("ui.describe_how_the_issue_was_e85ec61b")} value={resolveForm.resolution} onChange={e => setResolveForm({ resolution: e.target.value })} />
                    <button className="btn btn-primary" onClick={() => resolveIncident(incident.id)} disabled={loading}>{translate("ui.confirm_resolution_e2cd632a")}</button>
                    <button className="btn" onClick={() => setSelected(null)}>{translate("ui.cancel_96732485")}</button>
                  </div>
                ) : (
                  <button className="btn" onClick={() => setSelected(incident)}><Check size={14} />  {translate("ui.mark_as_resolved_d2d3f7a6")}</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TrainingView ─────────────────────────────────────────────────────────────

function TrainingView({ courses, certifications, resources, user, isStaff, onChanged }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCourseForQuiz, setSelectedCourseForQuiz] = useState(null);

  const now = new Date();
  const activeCerts = certifications.filter(c => c.status === "active");
  const expiringSoon = certifications.filter(c => {
    if (!c.expiresAt) return false;
    const days = Math.ceil((new Date(c.expiresAt) - now) / 86_400_000);
    return days >= 0 && days <= 14;
  });

  async function handleQuizPassed(payload) {
    const courseId = typeof payload === "string" ? payload : payload.courseId;
    const score = typeof payload === "object" && payload.score ? payload.score : 100;
    const answers = typeof payload === "object" && payload.answers ? payload.answers : {};

    setError(""); setLoading(true);
    try {
      await apiRequest("/training/quiz-pass", {
        method: "POST",
        body: JSON.stringify({ courseId, score, answers })
      });
      onChanged();
    } catch (err) { handleError(err, setError); }
    finally { setLoading(false); }
  }

  return (
    <div className="view-root">
      <div className="view-header">
        <div>
          <h2>{translate("ui.training_and_safety_certificates_e54db635")}</h2>
          <p className="view-subtitle">{translate("ui.take_online_assessments_and_manage_81542a72")}</p>
        </div>
      </div>

      {error && <div className="alert danger">{translate(error)}</div>}

      {expiringSoon.length > 0 && (
        <div className="alert warning">
           {translate("ui.you_have_46939516")} {expiringSoon.length}  {translate("ui.certificates_expiring_within_14_days_cc3c10fa")} </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <GraduationCap size={24} />
          <div>
            <span className="stat-value">{activeCerts.length}</span>
            <span className="stat-label">{translate("ui.valid_certificates_119eafa8")}</span>
          </div>
        </div>
        <div className="stat-card">
          <ShieldCheck size={24} />
          <div>
            <span className="stat-value">{courses.length}</span>
            <span className="stat-label">{translate("ui.training_courses_93f212a3")}</span>
          </div>
        </div>
      </div>

      <div className="section-title">{translate("ui.my_certificates_b231e61f")}</div>
      <div className="card-list">
        {certifications.length === 0 && <div className="empty-state"><GraduationCap size={40} /><p>{translate("ui.no_certificates_yet_choose_a_78d49065")}</p></div>}
        {certifications.map(cert => (
          <div key={cert.id} className="card cert-card">
            <div className="card-header">
              <strong>{cert.course?.name}</strong>
              <span className={`badge ${cert.status === "active" ? "success" : "warning"}`}>{cert.status}</span>
            </div>
            <div className="card-meta">
              <span>{translate("ui.issued_on_3f839bae")} {new Date(cert.issuedAt).toLocaleDateString("vi-VN")}</span>
              {cert.expiresAt && <span>{translate("ui.expires_on_0e710514")} {new Date(cert.expiresAt).toLocaleDateString("vi-VN")}</span>}
              {cert.notes && <span className="text-muted">{translate("ui.notes_9b223cea")} {cert.notes}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="section-title">{translate("ui.training_courses_and_certification_assessments_85e67464")}</div>
      <div className="card-list">
        {(courses && courses.length > 0 ? courses : [
          {
            id: "course-h100-safe",
            code: "SAFE-AI-2026",
            name: translate("ui.gpu_server_and_uav_safety_9bac3dc3"),
            description: translate("ui.lab_hardware_operating_standards_nvidia_3bc39151"),
            durationHours: 2,
            isRequired: true
          },
          {
            id: "course-cloud-cuda",
            code: "CUDA-OPT-2026",
            name: translate("ui.cuda_memory_optimization_and_gist_cce5d121"),
            description: translate("ui.distributed_training_scheduling_fair_quota_5efb3666"),
            durationHours: 3,
            isRequired: false
          }
        ]).map(course => {
          const hasCert = certifications.some(c => c.courseId === course.id && c.status === "active");
          return (
            <div key={course.id} className="card p-4 bg-surface-card border border-white/10 rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <strong className="text-white text-sm font-bold font-heading">{course.name}</strong>
                  <span className="font-mono text-[10.5px] text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">{course.code}</span>
                </div>
                {hasCert ? (
                  <span className="font-mono text-xs text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30">{translate("ui.already_certified_87a60a2e")}</span>
                ) : (
                  <button className="btn-cyan-gradient text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer font-mono" onClick={() => setSelectedCourseForQuiz(course)}>
                    <GraduationCap size={15} />  {translate("ui.take_assessment_51fea0dc")} </button>
                )}
              </div>
              {course.description && <p className="text-xs text-slate-300 font-sans leading-relaxed">{course.description}</p>}
              <div className="flex items-center gap-3 font-mono text-xs text-slate-400 pt-1 border-t border-white/5">
                {course.durationHours && <span>{translate("ui.duration_c7c9fc5a")} <strong className="text-white">{course.durationHours}  {translate("ui.hours_2491e993")}</strong></span>}
                {course.isRequired && <span className="text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/30">{translate("ui.required_for_students_7657362a")}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {selectedCourseForQuiz && (
        <SafetyQuizModal
          isOpen={Boolean(selectedCourseForQuiz)}
          onClose={() => setSelectedCourseForQuiz(null)}
          courseTitle={selectedCourseForQuiz?.name}
          onPassed={handleQuizPassed}
        />
      )}
    </div>
  );
}

export default App;
