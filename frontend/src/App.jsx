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
  Eye,
  FilterX,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MailCheck,
  MonitorUp,
  Plus,
  QrCode,
  RefreshCw,
  Search,
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

import { ApiError, apiRequest, getStoredUser, login, logout, register } from "./api.js";
import { VietQrModal } from "./components/VietQrModal.jsx";
import { QrCheckinModal } from "./components/QrCheckinModal.jsx";
import { SafetyQuizModal } from "./components/SafetyQuizModal.jsx";
import { LabFloorplan } from "./components/LabFloorplan.jsx";
import { AiCopilotDrawer } from "./components/AiCopilotDrawer.jsx";
import { OptimizationHubView } from "./components/OptimizationHubView.jsx";
import { DigitalTwinCanvas } from "./components/DigitalTwinCanvas.jsx";
import { ScenarioSimulationStudio } from "./components/ScenarioSimulationStudio.jsx";
import { GeneticAlgorithmVisualizer } from "./components/GeneticAlgorithmVisualizer.jsx";
import { AiDiagnosticStudio } from "./components/AiDiagnosticStudio.jsx";
import { OrchestrationWizard } from "./components/OrchestrationWizard.jsx";
import { WhatIfStudio } from "./components/WhatIfStudio.jsx";
import { MissionControlOverview } from "./components/MissionControlOverview.jsx";
import { ParetoFrontierExplorer } from "./components/ParetoFrontierExplorer.jsx";
import { DecisionTimelineReplay } from "./components/DecisionTimelineReplay.jsx";
import { AiMissionCopilot } from "./components/AiMissionCopilot.jsx";
import { ConcurrencyStressMonitor } from "./components/ConcurrencyStressMonitor.jsx";
import { ConflictResolutionQueue } from "./components/ConflictResolutionQueue.jsx";
import { QuotaFairnessDashboard } from "./components/QuotaFairnessDashboard.jsx";
import { CostChargebackReport } from "./components/CostChargebackReport.jsx";
import { PolicyRulesConfig } from "./components/PolicyRulesConfig.jsx";
import { NotificationCenter } from "./components/NotificationCenter.jsx";
import {
  createResourceStatuses,
  emptyBookingForm,
  emptyMaintenanceForm,
  emptyResourceForm,
  emptyUserForm,
  resourceGlyphLabels,
  resourceStatusActions
} from "./constants.js";
import { defaultLocale, getDictionary, interpolate, localeOptions, localeStorageKey, normalizeLocale } from "./i18n.js";
import { buildMonitoringRows, getMonitoringSummary, toBarWidth } from "./monitoring.js";
import { classNames, formatDateTime, formatPercent } from "./utils.js";

let copy = getDictionary(defaultLocale);

function buildNavItems(activeCopy) {
  return [
    // 1. Core Operations & Conflict Management (Top Priority)
    { id: "conflict_queue", label: "⚡ Xử Lý Xung Đột Real-Time", icon: AlertTriangle, section: "QUẢN TRỊ VẬN HÀNH & XỬ LÝ XUNG ĐỘT" },
    { id: "quota_fairness", label: "📊 Hạn Ngạch & Công Bằng Nhóm", icon: Users, section: "QUẢN TRỊ VẬN HÀNH & XỬ LÝ XUNG ĐỘT" },
    { id: "chargeback", label: "💰 Quyết Toán & Tiền Điện EVN", icon: Zap, section: "QUẢN TRỊ VẬN HÀNH & XỬ LÝ XUNG ĐỘT" },
    { id: "policy_config", label: "⚙️ Chính Sách & Ràng Buộc Lab", icon: Sliders, section: "QUẢN TRỊ VẬN HÀNH & XỬ LÝ XUNG ĐỘT" },
    { id: "escalations", label: "🚨 Cảnh Báo & Escalation", icon: Bell, section: "QUẢN TRỊ VẬN HÀNH & XỬ LÝ XUNG ĐỘT" },
    { id: "allocations", label: "🎯 Điều Phối Yêu Cầu Mới", icon: Sparkles, section: "QUẢN TRỊ VẬN HÀNH & XỬ LÝ XUNG ĐỘT" },

    // 2. Real-Time Telemetry & Monitoring
    { id: "dashboard", label: "🖥️ Mission Control Thiết Bị", icon: LayoutDashboard, section: "GIÁM SÁT THỜI GIAN THỰC & BẢN SAO SỐ" },
    { id: "digital_twin", label: "🌐 Bản Sao Số & Heatmap", icon: Radio, section: "GIÁM SÁT THỜI GIAN THỰC & BẢN SAO SỐ" },
    { id: "what_if", label: "🔮 Studio Mô Phỏng What-If", icon: Play, section: "GIÁM SÁT THỜI GIAN THỰC & BẢN SAO SỐ" },
    { id: "resources", label: activeCopy.nav.resources, icon: Server, section: "GIÁM SÁT THỜI GIAN THỰC & BẢN SAO SỐ" },
    { id: "bookings", label: activeCopy.nav.bookings, icon: CalendarCheck, section: "GIÁM SÁT THỜI GIAN THỰC & BẢN SAO SỐ" },
    { id: "maintenance", label: activeCopy.nav.maintenance, icon: Wrench, section: "GIÁM SÁT THỜI GIAN THỰC & BẢN SAO SỐ" },

    // 3. Technical Engines & Audit Provenance (Advanced / Technical)
    { id: "pareto", label: "📐 Khảo Sát Pareto Frontier", icon: Sliders, section: "CÔNG CỤ KỸ THUẬT & TRUY VẾT" },
    { id: "timeline", label: "⏱️ Replay Tái Tối Ưu Hóa", icon: Clock, section: "CÔNG CỤ KỸ THUẬT & TRUY VẾT" },
    { id: "concurrency", label: "🔒 Giám Sát Tranh Chấp GiST", icon: ShieldCheck, section: "CÔNG CỤ KỸ THUẬT & TRUY VẾT" },
    { id: "assistant", label: "🤖 AI Copilot & MCP Trace", icon: Bot, section: "CÔNG CỤ KỸ THUẬT & TRUY VẾT" },
    { id: "logs", label: activeCopy.nav.logs, icon: ClipboardCheck, section: "CÔNG CỤ KỸ THUẬT & TRUY VẾT" },
    { id: "users", label: activeCopy.nav.users, icon: Users, section: "CÔNG CỤ KỸ THUẬT & TRUY VẾT" }
  ];
}

function getInitialLocale() {
  return normalizeLocale(localStorage.getItem(localeStorageKey) || defaultLocale);
}

function App() {
  const [locale, setLocale] = useState(getInitialLocale);
  const [user, setUser] = useState(getStoredUser());
  const [activeTab, setActiveTab] = useState("conflict_queue");
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
  const [copilotOpen, setCopilotOpen] = useState(false);

  const activeCopy = useMemo(() => getDictionary(locale), [locale]);
  copy = activeCopy;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function changeLocale(nextLocale) {
    const normalized = normalizeLocale(nextLocale);
    localStorage.setItem(localeStorageKey, normalized);
    setLocale(normalized);
  }

  const navItems = useMemo(() => buildNavItems(copy), [locale]);
  const isStaff = user && ["admin", "lab_staff"].includes(user.role);
  const visibleNavItems = user?.role === "admin" ? navItems : navItems.filter((item) => item.id !== "users");

  async function loadData() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled([
        apiRequest("/dashboard"),
        apiRequest("/resources"),
        apiRequest("/bookings"),
        apiRequest("/maintenance"),
        apiRequest("/usage-logs"),
        apiRequest("/notifications"),
        user.role === "admin" ? apiRequest("/users") : Promise.resolve([]),
        apiRequest("/incidents").then(r => r.data || r),
        apiRequest("/training/courses").then(r => r.data || r),
        apiRequest("/training/certifications/me").then(r => r.data || r)
      ]);
      const val = (i, fallback) => results[i].status === "fulfilled" ? results[i].value : fallback;
      setDashboard(val(0, null));
      setResources(val(1, []));
      setBookings(val(2, []));
      setMaintenance(val(3, []));
      setLogs(val(4, []));
      setNotifications(val(5, []));
      setUsers(val(6, []));
      setIncidents(Array.isArray(val(7, [])) ? val(7, []) : []);
      setTrainings({ courses: Array.isArray(val(8, [])) ? val(8, []) : [], certifications: Array.isArray(val(9, [])) ? val(9, []) : [] });
      const failedCount = results.filter(r => r.status === "rejected").length;
      if (failedCount > 0 && failedCount < results.length) {
        setError(`⚠ ${failedCount} module tải thất bại — dữ liệu hiển thị có thể không đầy đủ.`);
      } else if (failedCount === results.length) {
        setError("Không thể kết nối hệ thống. Vui lòng kiểm tra kết nối mạng và backend.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [user, activeTab]);

  if (!user) {
    return <LoginView locale={locale} onLocaleChange={changeLocale} onLogin={setUser} />;
  }

  const currentNav = visibleNavItems.find((item) => item.id === activeTab) || visibleNavItems[0];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <MonitorUp size={22} />
          </div>
          <div>
            <strong>{copy.app.name}</strong>
            <span>{copy.app.subtitle}</span>
          </div>
        </div>

        <nav className="nav-list" aria-label={copy.aria.mainNav} style={{ overflowY: "auto", paddingRight: 4 }}>
          {visibleNavItems.map((item, idx) => {
            const Icon = item.icon;
            const prevItem = visibleNavItems[idx - 1];
            const showSection = !prevItem || prevItem.section !== item.section;

            return (
              <React.Fragment key={item.id}>
                {showSection && item.section && (
                  <div
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      color: "#94a3b8",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "12px 10px 4px 10px",
                      marginTop: idx === 0 ? 0 : 6
                    }}
                  >
                    {item.section}
                  </div>
                )}
                <button
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  className={classNames("nav-button", activeTab === item.id && "is-active")}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        <div className="user-panel">
          <div className="avatar">{user.fullName.charAt(0)}</div>
          <div>
            <strong>{user.fullName}</strong>
            <span>{copy.roles[user.role]}</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{currentNav.label}</h1>
            <p>{new Intl.DateTimeFormat(copy.localeCode, { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date())}</p>
          </div>
          <div className="topbar-actions">
            <LanguageSwitch compact locale={locale} onLocaleChange={changeLocale} />
            <button className="icon-button" type="button" title={copy.actions.refresh} onClick={loadData}>
              <RefreshCw size={18} className={loading ? "spin" : ""} />
            </button>
            <button
              className="notification-pill"
              type="button"
              title={copy.actions.viewLogs}
              aria-label={copy.aria.notificationCenter}
              onClick={() => setActiveTab("logs")}
            >
              <Bell size={16} />
              <span>{notifications.filter((item) => !item.readAt).length}</span>
            </button>
            <button
              className="icon-button"
              type="button"
              title={copy.actions.logout}
              onClick={() => {
                logout();
                setUser(null);
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {error && <div className="alert danger">{error}</div>}

        {activeTab === "conflict_queue" && <ConflictResolutionQueue />}
        {activeTab === "quota_fairness" && <QuotaFairnessDashboard />}
        {activeTab === "chargeback" && <CostChargebackReport />}
        {activeTab === "policy_config" && <PolicyRulesConfig />}
        {activeTab === "escalations" && <NotificationCenter notifications={notifications} onChanged={loadData} />}
        {activeTab === "dashboard" && <MissionControlOverview dashboard={dashboard} resources={resources} onNavigate={setActiveTab} />}
        {activeTab === "allocations" && <OrchestrationWizard onAllocated={loadData} />}
        {activeTab === "pareto" && <ParetoFrontierExplorer />}
        {activeTab === "timeline" && <DecisionTimelineReplay />}
        {activeTab === "digital_twin" && <DigitalTwinCanvas />}
        {activeTab === "what_if" && <WhatIfStudio />}
        {activeTab === "concurrency" && <ConcurrencyStressMonitor />}
        {activeTab === "ga_solver" && <GeneticAlgorithmVisualizer />}
        {activeTab === "ai_rca" && <AiDiagnosticStudio />}
        {activeTab === "assistant" && <AiMissionCopilot />}
        {activeTab === "resources" && <ResourceView resources={resources} isStaff={isStaff} onChanged={loadData} />}
        {activeTab === "bookings" && <BookingView resources={resources} bookings={bookings} user={user} isStaff={isStaff} onChanged={loadData} />}
        {activeTab === "optimization" && <OptimizationHubView />}
        {activeTab === "maintenance" && <MaintenanceView resources={resources} maintenance={maintenance} isStaff={isStaff} onChanged={loadData} />}
        {activeTab === "incidents" && <IncidentView incidents={incidents} resources={resources} user={user} isStaff={isStaff} onChanged={loadData} />}
        {activeTab === "training" && <TrainingView courses={trainings.courses} certifications={trainings.certifications} resources={resources} user={user} isStaff={isStaff} onChanged={loadData} />}
        {activeTab === "monitoring" && <MonitoringView telemetry={dashboard?.telemetry || []} />}
        {activeTab === "logs" && <LogsView logs={logs} notifications={notifications} onChanged={loadData} />}
        {activeTab === "users" && user.role === "admin" && <UsersView users={users} onChanged={loadData} />}

        <button className="floating-copilot-btn" type="button" onClick={() => setCopilotOpen(true)}>
          <Sparkles size={18} />
          <span>AI Copilot 2026</span>
        </button>

        <AiCopilotDrawer isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
      </main>
    </div>
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

function ResourceView({ resources, isStaff, onChanged }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [error, setError] = useState("");
  const [resourceForm, setResourceForm] = useState(emptyResourceForm);
  const [selectedResource, setSelectedResource] = useState(null);
  const [statusAction, setStatusAction] = useState(null);
  const [busyResourceId, setBusyResourceId] = useState("");

  const filtered = resources.filter((resource) => {
    const matchesType = type === "all" || resource.type === type;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [resource.name, resource.code, resource.location, copy.resourceTypes[resource.type]]
        .join(" ")
        .toLowerCase()
        .includes(query);
    return matchesType && matchesSearch;
  });

  const hasFilters = Boolean(search.trim()) || type !== "all";

  async function updateStatus(resource, status, changeReason) {
    setError("");
    setBusyResourceId(resource.id);
    try {
      await apiRequest(`/resources/${resource.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, changeReason })
      });
      setStatusAction(null);
      onChanged();
    } catch (requestError) {
      handleError(requestError, setError, copy);
    } finally {
      setBusyResourceId("");
    }
  }

  async function createResource(event) {
    event.preventDefault();
    setError("");
    const specs = parseSpecsText(resourceForm.specsText);
    if (!specs.ok) {
      setError(copy.validation.invalidSpecs);
      return;
    }

    try {
      await apiRequest("/resources", {
        method: "POST",
        body: JSON.stringify({
          code: resourceForm.code.trim(),
          name: resourceForm.name.trim(),
          type: resourceForm.type,
          location: resourceForm.location.trim(),
          status: resourceForm.status,
          ownerTeam: resourceForm.ownerTeam.trim(),
          capacity: Number(resourceForm.capacity),
          requiresApproval: resourceForm.requiresApproval,
          specs: specs.value
        })
      });
      setResourceForm({ ...emptyResourceForm });
      onChanged();
    } catch (requestError) {
      handleError(requestError, setError, copy);
    }
  }

  function clearFilters() {
    setSearch("");
    setType("all");
  }

  return (
    <div className="content-stack">
      <LabFloorplan resources={resources} onSelectResource={setSelectedResource} />
      {isStaff && (
        <section className="panel">
          <PanelTitle icon={Plus} title={copy.sections.addResource} />
          <form className="booking-form" onSubmit={createResource}>
            <div className="form-grid">
              <label>
                {copy.fields.resourceCode}
                <input value={resourceForm.code} onChange={(event) => setResourceForm({ ...resourceForm, code: event.target.value })} required />
              </label>
              <label>
                {copy.fields.resourceName}
                <input value={resourceForm.name} onChange={(event) => setResourceForm({ ...resourceForm, name: event.target.value })} required />
              </label>
              <label>
                {copy.fields.resourceType}
                <select value={resourceForm.type} onChange={(event) => setResourceForm({ ...resourceForm, type: event.target.value })} required>
                  <option value="">{copy.options.chooseResourceType}</option>
                  {Object.entries(copy.resourceTypes).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.fields.resourceStatus}
                <select value={resourceForm.status} onChange={(event) => setResourceForm({ ...resourceForm, status: event.target.value })} required>
                  <option value="">{copy.options.chooseResourceStatus}</option>
                  {createResourceStatuses.map((status) => (
                    <option key={status} value={status}>
                      {copy.statuses[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.fields.location}
                <input value={resourceForm.location} onChange={(event) => setResourceForm({ ...resourceForm, location: event.target.value })} required />
              </label>
              <label>
                {copy.fields.ownerTeam}
                <input value={resourceForm.ownerTeam} onChange={(event) => setResourceForm({ ...resourceForm, ownerTeam: event.target.value })} required />
              </label>
              <label>
                {copy.fields.capacity}
                <input
                  type="number"
                  min="1"
                  value={resourceForm.capacity}
                  onChange={(event) => setResourceForm({ ...resourceForm, capacity: event.target.value })}
                  required
                />
              </label>
            </div>
            <label>
              {copy.fields.technicalSpecs}
              <textarea
                value={resourceForm.specsText}
                onChange={(event) => setResourceForm({ ...resourceForm, specsText: event.target.value })}
                placeholder={copy.placeholders.resourceSpecs}
              />
              <span className="helper-text">{copy.notes.specsFormat}</span>
            </label>
            <label className="check-line">
              <input
                type="checkbox"
                checked={resourceForm.requiresApproval}
                onChange={(event) => setResourceForm({ ...resourceForm, requiresApproval: event.target.checked })}
              />
              {copy.fields.requiresApproval}
            </label>
            <p className="helper-text">{copy.notes.requiresApproval}</p>
            <button className="primary-button" type="submit">
              <Plus size={18} />
              <span>{copy.actions.addResource}</span>
            </button>
          </form>
        </section>
      )}

      <section className="panel">
        <PanelTitle icon={Server} title={copy.sections.resources} />
        <div className="toolbar">
          <label className="search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.placeholders.searchResources}
              aria-label={copy.aria.searchResources}
            />
          </label>
          <select value={type} onChange={(event) => setType(event.target.value)} aria-label={copy.aria.filterResources}>
            <option value="all">{copy.options.allResourceTypes}</option>
            {Object.entries(copy.resourceTypes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button className="secondary-button toolbar-action" type="button" disabled={!hasFilters} onClick={clearFilters}>
            <FilterX size={16} />
            <span>{copy.actions.clearFilters}</span>
          </button>
        </div>
      </section>

      {error && <div className="alert danger">{error}</div>}
      {!filtered.length ? (
        <p className="empty-state">{copy.empty.resources}</p>
      ) : (
        <section className="resource-grid">
          {filtered.map((resource) => (
            <article className="resource-card" key={resource.id}>
              <div className={classNames("resource-art", resource.type)}>
                <ResourceGlyph type={resource.type} />
              </div>
              <div className="resource-body">
                <div className="row between">
                  <div>
                    <span className="eyebrow">{resource.code}</span>
                    <h2>{resource.name}</h2>
                  </div>
                  <StatusBadge status={resource.status} />
                </div>
                <p>{resource.location}</p>
                <div className="spec-list">
                  <span>{copy.resourceTypes[resource.type]}</span>
                  <span>{copy.fields.capacity}: {resource.capacity}</span>
                  <span>{resource.requiresApproval ? copy.options.approvalRequired : copy.options.approvalNotRequired}</span>
                </div>
                <SpecChips specs={resource.specs} />
                <MonitoringMini sample={resource.latestTelemetry} />
                <div className="resource-actions">
                  <button className="table-action" type="button" onClick={() => setSelectedResource(resource)}>
                    <Eye size={15} />
                    <span>{copy.actions.viewDetails}</span>
                  </button>
                  {isStaff && (
                    <div className="button-row">
                      {resourceStatusActions.map((item) => (
                        <button
                          key={item.status}
                          title={copy.actions[item.actionKey]}
                          aria-label={`${copy.aria.resourceAction}: ${copy.actions[item.actionKey]} ${resource.code}`}
                          type="button"
                          disabled={busyResourceId === resource.id || resource.status === item.status}
                          onClick={() =>
                            setStatusAction({
                              resource,
                              status: item.status,
                              title: copy.actions[item.actionKey]
                            })
                          }
                        >
                          {item.status === "available" && <Check size={16} />}
                          {item.status === "maintenance" && <Wrench size={16} />}
                          {item.status === "offline" && <X size={16} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
      {selectedResource && <ResourceDetailsModal resource={selectedResource} onClose={() => setSelectedResource(null)} />}
      {statusAction && (
        <ResourceStatusModal
          action={statusAction}
          busy={busyResourceId === statusAction.resource.id}
          onCancel={() => setStatusAction(null)}
          onConfirm={(reason) => updateStatus(statusAction.resource, statusAction.status, reason)}
        />
      )}
    </div>
  );
}

function BookingView({ resources, bookings, user, isStaff, onChanged }) {
  const [form, setForm] = useState(emptyBookingForm);
  const [action, setAction] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [qrBooking, setQrBooking] = useState(null);
  const [vietQrBooking, setVietQrBooking] = useState(null);

  async function createBooking(event) {
    event.preventDefault();
    setError("");
    if (!form.resourceId) {
      setError(copy.validation.selectResource);
      return;
    }
    if (!form.startAt || !form.endAt || new Date(form.startAt) >= new Date(form.endAt)) {
      setError(copy.validation.invalidTime);
      return;
    }

    try {
      await apiRequest("/bookings", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          purpose: form.purpose.trim(),
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString()
        })
      });
      setForm({ ...emptyBookingForm });
      onChanged();
    } catch (requestError) {
      handleError(requestError, setError, copy);
    }
  }

  async function submitAction(note) {
    if (!action) return;
    setBusyId(action.booking.id);
    setError("");
    try {
      await apiRequest(`/bookings/${action.booking.id}/${action.endpoint}`, {
        method: "POST",
        body: JSON.stringify(action.payloadKey === "condition" ? { condition: note } : { notes: note || undefined })
      });
      setAction(null);
      onChanged();
    } catch (requestError) {
      handleError(requestError, setError, copy);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="split-layout">
      <section className="panel">
        <PanelTitle icon={Plus} title={copy.sections.createBooking} />
        {error && <div className="alert danger">{error}</div>}
        <form className="booking-form" onSubmit={createBooking}>
          <label>
            {copy.fields.resource}
            <select value={form.resourceId} onChange={(event) => setForm({ ...form, resourceId: event.target.value })} required>
              <option value="">{copy.options.chooseResource}</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.code} - {resource.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {copy.fields.usageTitle}
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder={copy.placeholders.usageTitle}
              required
            />
          </label>
          <label>
            {copy.fields.usagePurpose}
            <textarea
              value={form.purpose}
              onChange={(event) => setForm({ ...form, purpose: event.target.value })}
              placeholder={copy.placeholders.usagePurpose}
              required
            />
            <span className="helper-text">{copy.notes.bookingPurpose}</span>
          </label>
          <div className="form-grid">
            <label>
              {copy.fields.startAt}
              <input type="datetime-local" value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} required />
            </label>
            <label>
              {copy.fields.endAt}
              <input type="datetime-local" value={form.endAt} onChange={(event) => setForm({ ...form, endAt: event.target.value })} required />
            </label>
          </div>
          <button className="primary-button" type="submit">
            <Plus size={18} />
            <span>{copy.actions.createBooking}</span>
          </button>
        </form>
      </section>

      <section className="panel">
        <PanelTitle icon={CalendarCheck} title={copy.sections.bookings} />
        <BookingList
          bookings={bookings}
          user={user}
          isStaff={isStaff}
          busyId={busyId}
          onAction={setAction}
          onOpenQrCheckin={setQrBooking}
          onOpenVietQr={setVietQrBooking}
        />
      </section>

      {action && <ActionModal action={action} onCancel={() => setAction(null)} onConfirm={submitAction} busy={busyId === action.booking.id} />}

      <QrCheckinModal
        isOpen={Boolean(qrBooking)}
        onClose={() => setQrBooking(null)}
        booking={qrBooking}
        onCheckinSuccess={() => onChanged()}
      />

      <VietQrModal
        isOpen={Boolean(vietQrBooking)}
        onClose={() => setVietQrBooking(null)}
        amount={150000}
        bookingTitle={vietQrBooking?.title}
        resourceName={vietQrBooking?.resource?.name}
        onPaidSuccess={() => onChanged()}
      />
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

function BookingList({
  bookings,
  compact = false,
  user = null,
  isStaff = false,
  busyId = "",
  onAction,
  onOpenQrCheckin,
  onOpenVietQr
}) {
  if (!bookings.length) {
    return <p className="empty-state">{copy.empty.bookings}</p>;
  }

  return (
    <div className={classNames("booking-list", compact && "compact")}>
      {bookings.map((booking) => {
        const isRequester = booking.requestedBy?.id === user?.id;
        const canOperate = isStaff && !isRequester;
        const canCancel = !compact && ["pending", "approved"].includes(booking.status) && (isRequester || isStaff);
        return (
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
            {!compact && (
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {onOpenQrCheckin && (
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => onOpenQrCheckin(booking)}>
                    <QrCode size={13} /> QR Check-in
                  </button>
                )}
                {onOpenVietQr && (
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => onOpenVietQr(booking)}>
                    <Sparkles size={13} /> VietQR
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="booking-actions">
            <StatusBadge status={booking.status} />
            {canOperate && !compact && booking.status === "pending" && (
              <div className="button-row">
                <button
                  disabled={busyId === booking.id}
                  title={copy.actions.approve}
                  aria-label={`${copy.aria.bookingAction}: ${copy.actions.approve} ${booking.title}`}
                  type="button"
                  onClick={() =>
                    onAction({
                      booking,
                      title: copy.actions.approve,
                      label: copy.fields.approvalNote,
                      endpoint: "approve",
                      payloadKey: "notes",
                      required: false
                    })
                  }
                >
                  <Check size={16} />
                </button>
                <button
                  disabled={busyId === booking.id}
                  title={copy.actions.reject}
                  aria-label={`${copy.aria.bookingAction}: ${copy.actions.reject} ${booking.title}`}
                  type="button"
                  onClick={() =>
                    onAction({
                      booking,
                      title: copy.actions.reject,
                      label: copy.fields.rejectionReason,
                      endpoint: "reject",
                      payloadKey: "notes",
                      required: true
                    })
                  }
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {canOperate && !compact && booking.status === "approved" && (
              <button
                disabled={busyId === booking.id}
                title={copy.actions.handover}
                aria-label={`${copy.aria.bookingAction}: ${copy.actions.handover} ${booking.title}`}
                type="button"
                onClick={() =>
                  onAction({
                    booking,
                    title: copy.actions.handover,
                    label: copy.fields.handoverCondition,
                    endpoint: "check-out",
                    payloadKey: "condition",
                    required: true
                  })
                }
              >
                <ClipboardCheck size={16} />
              </button>
            )}
            {canOperate && !compact && booking.status === "checked_out" && (
              <button
                disabled={busyId === booking.id}
                title={copy.actions.receiveBack}
                aria-label={`${copy.aria.bookingAction}: ${copy.actions.receiveBack} ${booking.title}`}
                type="button"
                onClick={() =>
                  onAction({
                    booking,
                    title: copy.actions.receiveBack,
                    label: copy.fields.returnCondition,
                    endpoint: "check-in",
                    payloadKey: "condition",
                    required: true
                  })
                }
              >
                <Check size={16} />
              </button>
            )}
            {canCancel && (
              <button
                disabled={busyId === booking.id}
                title={copy.actions.cancel}
                aria-label={`${copy.aria.bookingAction}: ${copy.actions.cancel} ${booking.title}`}
                type="button"
                onClick={() =>
                  onAction({
                    booking,
                    title: copy.actions.cancel,
                    label: copy.fields.approvalNote,
                    endpoint: "cancel",
                    payloadKey: "notes",
                    required: false
                  })
                }
              >
                <X size={16} />
              </button>
            )}
            {isStaff && isRequester && !compact && ["pending", "approved", "checked_out"].includes(booking.status) && (
              <span className="workflow-note">{copy.notes.separateOperator}</span>
            )}
          </div>
        </article>
      );
      })}
    </div>
  );
}

function BookingWorkflow({ status }) {
  const steps = [
    { key: "pending", label: copy.workflow.requested },
    { key: "approved", label: copy.workflow.approved },
    { key: "checked_out", label: copy.workflow.handedOver },
    { key: "completed", label: copy.workflow.returned }
  ];
  const terminal = ["rejected", "cancelled"].includes(status);
  const activeIndex = terminal ? -1 : Math.max(0, steps.findIndex((step) => step.key === status));

  return (
    <div className={classNames("booking-workflow", terminal && "terminal")}>
      {terminal ? (
        <span>{copy.statuses[status] || status}</span>
      ) : (
        steps.map((step, index) => (
          <span key={step.key} className={classNames(index < activeIndex && "done", index === activeIndex && "current")}>
            {step.label}
          </span>
        ))
      )}
    </div>
  );
}

function ActionModal({ action, onCancel, onConfirm, busy }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    if (action.required && !note.trim()) {
      setError(copy.validation.actionNoteRequired);
      return;
    }
    onConfirm(note.trim());
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal" onSubmit={submit}>
        <div>
          <span className="eyebrow">{action.booking.resource?.code}</span>
          <h2>{action.title}</h2>
          <p>{action.booking.title}</p>
        </div>
        {error && <div className="alert danger">{error}</div>}
        <label>
          {action.label}
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={copy.placeholders.actionNote}
            autoFocus
          />
        </label>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            {copy.actions.cancel}
          </button>
          <button className="primary-button" type="submit" disabled={busy}>
            {copy.actions.confirm}
          </button>
        </div>
      </form>
    </div>
  );
}

function ResourceStatusModal({ action, onCancel, onConfirm, busy }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    if (!reason.trim()) {
      setError(copy.validation.statusReasonRequired);
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal" onSubmit={submit}>
        <div>
          <span className="eyebrow">{action.resource.code}</span>
          <h2>{action.title}</h2>
          <p>{action.resource.name}</p>
        </div>
        {error && <div className="alert danger">{error}</div>}
        <label>
          {copy.fields.statusReason}
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={copy.placeholders.statusReason}
            autoFocus
          />
          <span className="helper-text">{copy.notes.statusChange}</span>
        </label>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            {copy.actions.cancel}
          </button>
          <button className="primary-button" type="submit" disabled={busy}>
            {copy.actions.confirm}
          </button>
        </div>
      </form>
    </div>
  );
}

function ResourceDetailsModal({ resource, onClose }) {
  const summary = getMonitoringSummary(resource, resource.latestTelemetry, copy);
  const specs = Object.entries(resource.specs || {});

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal details-modal" role="dialog" aria-modal="true">
        <div className="row between">
          <div>
            <span className="eyebrow">{resource.code}</span>
            <h2>{resource.name}</h2>
            <p>{resource.location}</p>
          </div>
          <button className="icon-button" type="button" title={copy.actions.close} onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <div className="details-grid">
          <DetailItem label={copy.fields.resourceType} value={copy.resourceTypes[resource.type]} />
          <DetailItem label={copy.fields.ownerTeam} value={resource.ownerTeam} />
          <DetailItem label={copy.fields.capacity} value={resource.capacity} />
          <DetailItem label={copy.fields.requiresApproval} value={resource.requiresApproval ? copy.options.approvalRequired : copy.options.approvalNotRequired} />
          <DetailItem label={copy.monitoring.health} value={summary.score === null ? summary.label : `${summary.score}/100 - ${summary.label}`} />
          <DetailItem label={copy.monitoring.lastUpdate} value={summary.lastUpdate} />
        </div>

        <div>
          <h3>{copy.fields.technicalSpecs}</h3>
          {!specs.length ? (
            <p className="empty-state">{copy.empty.monitoringPoint}</p>
          ) : (
            <div className="spec-table">
              {specs.map(([key, value]) => (
                <DetailItem key={key} label={formatSpecLabel(key)} value={formatSpecValue(value)} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h3>{copy.sections.monitoringPolicy}</h3>
          <MonitoringBars resource={resource} sample={resource.latestTelemetry} />
        </div>
      </section>
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

function parseSpecsText(text) {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, value: {} };

  const specs = {};
  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const separator = line.includes(":") ? ":" : line.includes("=") ? "=" : "";
    if (!separator) return { ok: false, value: {} };
    const [rawKey, ...rest] = line.split(separator);
    const key = rawKey.trim().replace(/\s+/g, "_").replace(/[^\p{L}\p{N}_.-]/gu, "");
    const value = rest.join(separator).trim();
    if (!key || !value) return { ok: false, value: {} };
    specs[key] = parseSpecPrimitive(value);
  }
  return { ok: true, value: specs };
}

function parseSpecPrimitive(value) {
  const normalized = value.trim();
  if (/^(true|yes|enabled|on)$/i.test(normalized)) return true;
  if (/^(false|no|disabled|off)$/i.test(normalized)) return false;
  if (/^-?\d+(?:[.,]\d+)?$/.test(normalized)) return Number(normalized.replace(",", "."));
  return normalized;
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
        {courses.length === 0 && <div className="empty-state"><p>Chưa có khoá đào tạo nào</p></div>}
        {courses.map(course => {
          const hasCert = certifications.some(c => c.courseId === course.id && c.status === "active");
          return (
            <div key={course.id} className="card">
              <div className="card-header">
                <div>
                  <strong>{course.name}</strong>
                  <span className="badge info" style={{ marginLeft: 8 }}>{course.code}</span>
                </div>
                {hasCert ? (
                  <span className="badge success">Đã có chứng chỉ</span>
                ) : (
                  <button className="btn btn-primary" onClick={() => setSelectedCourseForQuiz(course)}>
                    <GraduationCap size={16} /> Làm Bài Thi Trắc Nghiệm
                  </button>
                )}
              </div>
              {course.description && <p className="card-text">{course.description}</p>}
              <div className="card-meta">
                {course.durationHours && <span>Thời lượng: {course.durationHours}h</span>}
                {course.isRequired && <span className="badge danger">Bắt buộc</span>}
              </div>
            </div>
          );
        })}
      </div>

      {selectedCourseForQuiz && (
        <SafetyQuizModal
          isOpen={Boolean(selectedCourseForQuiz)}
          onClose={() => setSelectedCourseForQuiz(null)}
          course={selectedCourseForQuiz}
          onPassed={handleQuizPassed}
        />
      )}
    </div>
  );
}

export default App;
