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

import { ApiError, apiRequest, getCurrentUser, hasStoredSession, login, logout, register } from "./api.js";
import { SmartCalendarView } from "./components/SmartCalendarView.tsx";
import { AdminResourceManagementView } from "./components/AdminResourceManagementView.tsx";
import { ResourceManagementView } from "./components/ResourceManagementView.tsx";
import { BookingOperationsPage } from "./pages/operations/BookingOperationsPage.tsx";
import { QuickBookingModal } from "./components/QuickBookingModal.tsx";
import { AuthLoginView } from "./components/AuthLoginView.tsx";
import { AuthRegisterView } from "./components/AuthRegisterView.tsx";
import { AppLayout } from "./components/AppLayout.tsx";
import { AccessUserManagement } from "./components/AccessUserManagement.tsx";
import { NotificationCenter } from "./components/NotificationCenter.jsx";
import { IncidentsPage } from "./pages/incidents/IncidentsPage.tsx";
import { MonitoringDashboardPage } from "./pages/monitoring/MonitoringDashboardPage.tsx";
import {
  emptyBookingForm,
  emptyMaintenanceForm,
  emptyUserForm,
  resourceGlyphLabels
} from "./constants.js";
import { defaultLocale, getDictionary, interpolate, localeOptions, localeStorageKey, normalizeLocale } from "./i18n.js";
import { buildMonitoringRows, getMonitoringSummary, toBarWidth } from "./monitoring.js";
import { classNames, formatDateTime, formatPercent } from "./utils.js";
import { RESEARCH_FEATURES_ENABLED, isTabEnabled } from "./config/featureFlags";
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

let copy = getDictionary(defaultLocale);

function getInitialLocale() {
  return normalizeLocale(localStorage.getItem(localeStorageKey) || defaultLocale);
}

const ADMIN_ONLY_TABS = new Set(["users", "quota_fairness", "chargeback", "policy_config", "logs"]);
const STAFF_ONLY_TABS = new Set(["admin_management", "conflict_queue", "allocations", "dashboard", "maintenance", "monitoring"]);

function canAccessTab(role, tabId) {
  if (!isTabEnabled(tabId)) return false;
  if (ADMIN_ONLY_TABS.has(tabId)) return role === "ADMIN";
  if (STAFF_ONLY_TABS.has(tabId)) return role === "ADMIN" || role === "LAB_STAFF";
  return true;
}

function App() {
  const [locale, setLocale] = useState(getInitialLocale);
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState("smart_calendar");
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
          setError(requestError?.message || "Không thể xác minh phiên đăng nhập.");
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

  function changeLocale(nextLocale) {
    const normalized = normalizeLocale(nextLocale);
    localStorage.setItem(localeStorageKey, normalized);
    setLocale(normalized);
  }

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
        setError(`Không thể tải dữ liệu thật: ${failed.join(", ")}.`);
      }
    } catch (requestError) {
      setError(requestError?.message || "Không thể tải dữ liệu hệ thống.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) loadData();
  }, [user?.id]);

  useEffect(() => {
    if (user && !canAccessTab(user.role, activeTab)) {
      setActiveTab("smart_calendar");
      setError("Bạn không có quyền truy cập khu vực này.");
    }
  }, [user?.role, activeTab]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [user, activeTab]);

  if (authChecking) {
    return <main className="login-screen"><p className="empty-state">Đang xác minh phiên đăng nhập...</p></main>;
  }

  if (!user) {
    if (authMode === "register") {
      return (
        <AuthRegisterView
          onRegisterSuccess={(u) => {
            setUser(u);
            setAuthMode("login");
          }}
          onSwitchToLogin={() => setAuthMode("login")}
          locale={locale}
          onLocaleChange={changeLocale}
        />
      );
    }
    return (
      <AuthLoginView
        onLogin={setUser}
        onSwitchToRegister={() => setAuthMode("register")}
        locale={locale}
        onLocaleChange={changeLocale}
      />
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
          setError("Bạn không có quyền truy cập khu vực này.");
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
      onLogout={async () => {
        await logout();
        setUser(null);
      }}
    >
      {error && <div className="alert danger">{error}</div>}

      {/* REQUIRED CORE */}
      {activeTab === "smart_calendar" && (
        <SmartCalendarView
          user={user}
          onOpenBooking={(slot) => setActiveGlobalModal({ type: "quick_booking", payload: slot })}
        />
      )}
      {activeTab === "admin_management" && <AdminResourceManagementView user={user} />}
      {activeTab === "escalations" && <NotificationCenter notifications={notifications} onChanged={loadData} />}
      {activeTab === "dashboard" && <MonitoringDashboardPage dashboard={dashboard} loading={loading} onRefresh={loadData} />}
      {activeTab === "resources" && <ResourceManagementView user={user} />}
      {activeTab === "bookings" && <BookingOperationsPage user={user} onChanged={loadData} />}
      {activeTab === "maintenance" && <MaintenanceView resources={resources} maintenance={maintenance} isStaff={isStaff} onChanged={loadData} />}
      {activeTab === "incidents" && <IncidentsPage user={user} resources={resources} incidents={incidents} onChanged={loadData} />}
      {activeTab === "monitoring" && <MonitoringDashboardPage dashboard={dashboard} loading={loading} onRefresh={loadData} />}
      {activeTab === "users" && <AccessUserManagement />}

      {researchFeaturesEnabled && (
        <React.Suspense fallback={<p className="empty-state">Đang tải khu vực nghiên cứu...</p>}>
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
        resources={resources}
        onConfirmBooking={(bookingData) => {
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
            <h2>{isRegister ? "Đăng ký tài khoản mới" : copy.login.title}</h2>
            <p>{isRegister ? "Tạo tài khoản sinh viên / nghiên cứu viên để đặt lịch thiết bị" : copy.login.subtitle}</p>
          </div>
          {error && <div className="alert danger">{error}</div>}

          {isRegister && (
            <>
              <label>
                Họ và tên
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  required
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <label>
                  Mã SV / GV
                  <input
                    type="text"
                    value={studentId}
                    onChange={(event) => setStudentId(event.target.value)}
                    placeholder="SV2026-001"
                  />
                </label>
                <label>
                  Khoa / Viện
                  <input
                    type="text"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    placeholder="CNTT & AI"
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
            <span>{loading ? (isRegister ? "Đang tạo tài khoản..." : copy.actions.signingIn) : (isRegister ? "Đăng ký ngay" : copy.actions.signIn)}</span>
          </button>

          <div style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.9rem" }}>
            {isRegister ? (
              <span>
                Đã có tài khoản?{" "}
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setError(""); }}
                  style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: "600", textDecoration: "underline" }}
                >
                  Đăng nhập
                </button>
              </span>
            ) : (
              <span>
                Chưa có tài khoản?{" "}
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setError(""); }}
                  style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: "600", textDecoration: "underline" }}
                >
                  Đăng ký tài khoản mới
                </button>
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
        {error && <div className="alert danger">{error}</div>}
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

// ─── MaintenanceView ──────────────────────────────────────────────────────────

function MaintenanceView({ resources, maintenance, isStaff, onChanged }) {
  const [form, setForm] = useState({ ...emptyMaintenanceForm });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const statusLabels = {
    scheduled: "Đã lên lịch",
    in_progress: "Đang thực hiện",
    completed: "Hoàn thành",
    cancelled: "Đã huỷ"
  };

  const kindLabels = {
    maintenance: "Bảo trì định kỳ",
    repair: "Sửa chữa",
    calibration: "Hiệu chuẩn",
    inspection: "Kiểm tra"
  };

  const statusColors = {
    scheduled: "info",
    in_progress: "warning",
    completed: "success",
    cancelled: "danger"
  };

  async function createMaintenance(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiRequest("/maintenance", {
        method: "POST",
        body: JSON.stringify({
          resourceId: form.resourceId,
          title: form.title.trim(),
          kind: form.kind || "maintenance",
          status: "scheduled",
          startAt: new Date(form.scheduledStart).toISOString(),
          endAt: new Date(form.scheduledEnd).toISOString(),
          notes: form.notes.trim() || undefined
        })
      });
      setForm({ ...emptyMaintenanceForm });
      setShowForm(false);
      onChanged();
    } catch (err) {
      handleError(err, setError);
    } finally {
      setLoading(false);
    }
  }

  async function updateMaintenanceStatus(id, newStatus) {
    setError("");
    setLoading(true);
    try {
      await apiRequest(`/maintenance/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus, changeReason: `Chuyển trạng thái sang ${statusLabels[newStatus]}` })
      });
      onChanged();
    } catch (err) {
      handleError(err, setError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="view-root">
      <div className="view-header">
        <div>
          <h2>{copy.nav.maintenance}</h2>
          <p className="view-subtitle">Quản lý lịch bảo trì và sửa chữa thiết bị</p>
        </div>
        {isStaff && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Tạo lịch bảo trì
          </button>
        )}
      </div>

      {error && <div className="alert danger">{error}</div>}

      {showForm && isStaff && (
        <form className="card form-card" onSubmit={createMaintenance}>
          <h3>Tạo lịch bảo trì mới</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Thiết bị *</label>
              <select required value={form.resourceId} onChange={e => setForm({ ...form, resourceId: e.target.value })}>
                <option value="">-- Chọn thiết bị --</option>
                {resources.map(r => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Loại bảo trì</label>
              <select value={form.kind || "maintenance"} onChange={e => setForm({ ...form, kind: e.target.value })}>
                {Object.entries(kindLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group full-width">
              <label>Tiêu đề *</label>
              <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Vd: Vệ sinh bụi server GPU-A100..." />
            </div>
            <div className="form-group">
              <label>Bắt đầu *</label>
              <input type="datetime-local" required value={form.scheduledStart} onChange={e => setForm({ ...form, scheduledStart: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Kết thúc *</label>
              <input type="datetime-local" required value={form.scheduledEnd} onChange={e => setForm({ ...form, scheduledEnd: e.target.value })} />
            </div>
            <div className="form-group full-width">
              <label>Ghi chú</label>
              <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Mô tả chi tiết công việc bảo trì..." />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>Tạo lịch bảo trì</button>
            <button type="button" className="btn" onClick={() => setShowForm(false)}>Huỷ</button>
          </div>
        </form>
      )}

      <div className="card-list">
        {maintenance.length === 0 && (
          <div className="empty-state">
            <Wrench size={40} />
            <p>Chưa có lịch bảo trì nào</p>
          </div>
        )}
        {maintenance.map(item => (
          <div key={item.id} className="card">
            <div className="card-header">
              <div>
                <span className={`badge ${statusColors[item.status] || "info"}`}>{statusLabels[item.status] || item.status}</span>
                <span className="badge info" style={{ marginLeft: 8 }}>{kindLabels[item.kind] || item.kind}</span>
                <strong style={{ marginLeft: 8 }}>{item.title}</strong>
              </div>
              <span className="badge info">{item.resource?.code}</span>
            </div>
            <p className="card-text">{item.resource?.name} — {item.resource?.location}</p>
            <div className="card-meta">
              <span>Bắt đầu: {new Date(item.startAt).toLocaleString("vi-VN")}</span>
              <span>Kết thúc: {new Date(item.endAt).toLocaleString("vi-VN")}</span>
              {item.notes && <span>Ghi chú: {item.notes}</span>}
            </div>
            {isStaff && !["completed", "cancelled"].includes(item.status) && (
              <div className="card-actions" style={{ marginTop: 10 }}>
                {item.status === "scheduled" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={loading}
                    onClick={() => updateMaintenanceStatus(item.id, "in_progress")}
                  >
                    <Activity size={13} /> Bắt đầu thực hiện
                  </button>
                )}
                {item.status === "in_progress" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={loading}
                    onClick={() => updateMaintenanceStatus(item.id, "completed")}
                  >
                    <Check size={13} /> Đánh dấu hoàn thành
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={loading}
                  onClick={() => updateMaintenanceStatus(item.id, "cancelled")}
                >
                  <X size={13} /> Hủy lịch bảo trì
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
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
        {error && <div className="alert danger">{error}</div>}
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
        {error && <div className="alert danger">{error}</div>}
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
    { key: "PENDING_APPROVAL", label: "Yêu cầu" },
    { key: "CONFIRMED", label: "Đã duyệt" },
    { key: "CHECKED_OUT", label: "Đã bàn giao" },
    { key: "RETURNED", label: "Đã hoàn trả" },
    { key: "COMPLETED", label: "Hoàn tất" }
  ];
  const terminalLabels = { REJECTED: "Từ chối", CANCELLED: "Đã hủy" };
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

function translateNotification(notification) {
  const params = readMessageParams(notification.messageParams);
  const titleTemplate = notification.titleKey ? copy.notifications.titles[notification.titleKey] : "";
  const messageTemplate = notification.messageKey ? copy.notifications.messages[notification.messageKey] : "";

  return {
    title: titleTemplate ? interpolate(titleTemplate, params) : notification.title || copy.empty.value,
    message: messageTemplate ? interpolate(messageTemplate, params) : notification.message || copy.empty.value
  };
}

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
  const statusLabels = { reported: "Đã báo cáo", triaged: "Đã phân loại", assigned: "Đã phân công", investigating: "Đang điều tra", resolved: "Đã giải quyết", verified: "Đã xác nhận", closed: "Đã đóng" };

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
          <h2>Quản lý Sự cố</h2>
          <p className="view-subtitle">Báo cáo và theo dõi sự cố thiết bị</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Báo cáo sự cố
        </button>
      </div>

      {error && <div className="alert danger">{error}</div>}

      {showForm && (
        <form className="card form-card" onSubmit={submitIncident}>
          <h3>Báo cáo sự cố mới</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Thiết bị *</label>
              <select required value={form.resourceId} onChange={e => setForm({ ...form, resourceId: e.target.value })}>
                <option value="">-- Chọn thiết bị --</option>
                {resources.map(r => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Mức độ nghiêm trọng</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
                <option value="critical">Nghiêm trọng</option>
              </select>
            </div>
            <div className="form-group full-width">
              <label>Tiêu đề *</label>
              <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Mô tả ngắn về sự cố..." />
            </div>
            <div className="form-group full-width">
              <label>Mô tả chi tiết *</label>
              <textarea required rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả chi tiết sự cố..." />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>Gửi báo cáo</button>
            <button type="button" className="btn" onClick={() => setShowForm(false)}>Huỷ</button>
          </div>
        </form>
      )}

      <div className="card-list">
        {incidents.length === 0 && <div className="empty-state"><AlertTriangle size={40} /><p>Chưa có sự cố nào</p></div>}
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
              <span>Thiết bị: {incident.resource?.name}</span>
              <span>Báo cáo bởi: {incident.reportedBy?.fullName}</span>
              <span>{new Date(incident.createdAt).toLocaleString("vi-VN")}</span>
            </div>
            {isStaff && !["resolved", "verified", "closed"].includes(incident.status) && (
              <div className="card-actions">
                {selected?.id === incident.id ? (
                  <div className="inline-resolve">
                    <textarea rows={2} placeholder="Mô tả cách giải quyết..." value={resolveForm.resolution} onChange={e => setResolveForm({ resolution: e.target.value })} />
                    <button className="btn btn-primary" onClick={() => resolveIncident(incident.id)} disabled={loading}>Xác nhận giải quyết</button>
                    <button className="btn" onClick={() => setSelected(null)}>Huỷ</button>
                  </div>
                ) : (
                  <button className="btn" onClick={() => setSelected(incident)}><Check size={14} /> Đánh dấu giải quyết</button>
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
          <h2>Đào tạo & Chứng chỉ An toàn</h2>
          <p className="view-subtitle">Làm bài thi trực tuyến và quản lý chứng chỉ thiết bị</p>
        </div>
      </div>

      {error && <div className="alert danger">{error}</div>}

      {expiringSoon.length > 0 && (
        <div className="alert warning">
          ⚠️ Bạn có {expiringSoon.length} chứng chỉ sắp hết hạn trong 14 ngày tới.
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <GraduationCap size={24} />
          <div>
            <span className="stat-value">{activeCerts.length}</span>
            <span className="stat-label">Chứng chỉ hợp lệ</span>
          </div>
        </div>
        <div className="stat-card">
          <ShieldCheck size={24} />
          <div>
            <span className="stat-value">{courses.length}</span>
            <span className="stat-label">Khoá đào tạo</span>
          </div>
        </div>
      </div>

      <div className="section-title">Chứng chỉ của tôi</div>
      <div className="card-list">
        {certifications.length === 0 && <div className="empty-state"><GraduationCap size={40} /><p>Chưa có chứng chỉ nào. Chọn khóa học bên dưới để làm bài thi cấp chứng chỉ!</p></div>}
        {certifications.map(cert => (
          <div key={cert.id} className="card cert-card">
            <div className="card-header">
              <strong>{cert.course?.name}</strong>
              <span className={`badge ${cert.status === "active" ? "success" : "warning"}`}>{cert.status}</span>
            </div>
            <div className="card-meta">
              <span>Cấp ngày: {new Date(cert.issuedAt).toLocaleDateString("vi-VN")}</span>
              {cert.expiresAt && <span>Hết hạn: {new Date(cert.expiresAt).toLocaleDateString("vi-VN")}</span>}
              {cert.notes && <span className="text-muted">Ghi chú: {cert.notes}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="section-title">Các khoá đào tạo & Trắc nghiệm Cấp chứng chỉ</div>
      <div className="card-list">
        {(courses && courses.length > 0 ? courses : [
          {
            id: "course-h100-safe",
            code: "SAFE-AI-2026",
            name: "Khóa Huấn Luyện An Toàn Cụm Máy Chủ GPU & Thiết Bị Bay 2026",
            description: "Tiêu chuẩn vận hành phần cứng phòng lab, kiểm soát nhiệt độ buồng máy NVIDIA H100, quy tắc xả điện áp và thao tác sạc trạm UAV Matrice 300.",
            durationHours: 2,
            isRequired: true
          },
          {
            id: "course-cloud-cuda",
            code: "CUDA-OPT-2026",
            name: "Tối Ưu Hóa Bộ Nhớ CUDA & Quy Chuẩn Khóa GiST Exclusion",
            description: "Quy trình lập lịch huấn luyện phân tán, quản trị quota công bằng và phòng ngừa tràn bộ nhớ OOM trên cụm DGX A100.",
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
                  <span className="font-mono text-xs text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30">✓ Đã có chứng chỉ</span>
                ) : (
                  <button className="btn-cyan-gradient text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer font-mono" onClick={() => setSelectedCourseForQuiz(course)}>
                    <GraduationCap size={15} /> ⚡ Làm Bài Thi Trắc Nghiệm
                  </button>
                )}
              </div>
              {course.description && <p className="text-xs text-slate-300 font-sans leading-relaxed">{course.description}</p>}
              <div className="flex items-center gap-3 font-mono text-xs text-slate-400 pt-1 border-t border-white/5">
                {course.durationHours && <span>Thời lượng: <strong className="text-white">{course.durationHours} giờ</strong></span>}
                {course.isRequired && <span className="text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/30">Bắt buộc đối với SV</span>}
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
