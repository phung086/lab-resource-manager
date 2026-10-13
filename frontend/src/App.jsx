
import { translate } from "./i18n.js";

import React, { useEffect, useState } from "react";

import { apiRequest, getCurrentUser, hasStoredSession, logout, storeAuthResult } from "./api.js";
import { QuickBookingModal } from "./components/QuickBookingModal.tsx";
import { useResourceSelection } from "./providers/ResourceSelectionProvider.tsx";
import { AuthLoginView } from "./components/AuthLoginView.tsx";
import { AuthRegisterView } from "./components/AuthRegisterView.tsx";
import { PublicLanding } from "./components/PublicLanding.tsx";
import { PublicShell } from "./components/PublicShell.tsx";
import { LocaleProvider, useLocale } from "./providers/LocaleProvider.tsx";
import { WorkspaceHome } from "./pages/WorkspaceHome";
import { AppLayout } from "./components/AppLayout.tsx";
import { NotificationCenter } from "./components/NotificationCenter.jsx";
import { navigateApp, publicPathForSection, readAppRoute, readRouteParams, resourceDetailPath, resourceSelectionPath, safeReturnTo, workspacePathForTab } from "./workspaceRoutes.js";

import { PAYMENT_FEATURES_ENABLED, TELEMETRY_FEATURES_ENABLED, isTabEnabled } from "./config/featureFlags";
const PaymentsPage = React.lazy(() => import("./components/features/payments/PaymentsPage"));
const SupportPage = React.lazy(() => import("./components/features/support/SupportPage"));


const SmartCalendarView = React.lazy(() => import("./components/SmartCalendarView.tsx").then(module => ({ default: module.SmartCalendarView })));
const AdminResourceManagementView = React.lazy(() => import("./components/AdminResourceManagementView.tsx").then(module => ({ default: module.AdminResourceManagementView })));
const ResourceManagementView = React.lazy(() => import("./components/ResourceManagementView.tsx").then(module => ({ default: module.ResourceManagementView })));
const BookingOperationsPage = React.lazy(() => import("./pages/operations/BookingOperationsPage.tsx").then(module => ({ default: module.BookingOperationsPage })));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage.tsx").then(module => ({ default: module.ProfilePage })));
const AccessUserManagement = React.lazy(() => import("./components/AccessUserManagement.tsx").then(module => ({ default: module.AccessUserManagement })));
const ChatgptBridgePage = React.lazy(() => import('./pages/ChatgptBridgePage.tsx'));
const IncidentsPage = React.lazy(() => import("./pages/incidents/IncidentsPage.tsx").then(module => ({ default: module.IncidentsPage })));
const MonitoringDashboardPage = React.lazy(() => import("./pages/monitoring/MonitoringDashboardPage.tsx").then(module => ({ default: module.MonitoringDashboardPage })));
const MaintenancePage = React.lazy(() => import("./pages/MaintenancePage").then(module => ({ default: module.MaintenancePage })));
const StockPage = React.lazy(() => import("./pages/LabWorkspace").then(module => ({ default: module.StockPage })));

const ResourceDetailPage = React.lazy(() => import("./pages/ResourceDetailPage.tsx").then(module => ({ default: module.ResourceDetailPage })));
const SelectionPage = React.lazy(() => import("./pages/SelectionPage.tsx").then(module => ({ default: module.SelectionPage })));

const STAFF_ONLY_TABS = new Set(["users", "admin_management", "dashboard", "maintenance", "monitoring"]);

function canAccessTab(role, tabId) {
  if (tabId === 'stock') return ['ADMIN', 'LAB_STAFF'].includes(role);
  if (tabId === 'teaching') return false;
  if (!isTabEnabled(tabId)) return false;
  if (STAFF_ONLY_TABS.has(tabId)) return role === "ADMIN" || role === "LAB_STAFF";
  return true;
}

function App() {
  return <LocaleProvider><Application /></LocaleProvider>;
}

function Application() {
  const { locale, changeLocale } = useLocale();
  const [user, setUser] = useState(null);
  const resourceSelection = useResourceSelection(user?.id);
  const [authChecking, setAuthChecking] = useState(true);
  const [route, setRoute] = useState(() => readAppRoute(window.location));
  const activeTab = route.tab || "home";
  const routeHash = route.path + route.search;
  function setActiveTab(tab, params = {}) { navigateApp(workspacePathForTab(tab, params)); }
  const [paymentBookingId, setPaymentBookingId] = useState(() => readRouteParams().get("booking") || "");
  const openBookingPayment = booking => {
    setActiveGlobalModal(null);
    setPaymentBookingId(booking.id);
    setActiveTab("payments", { booking: booking.id });
  };
  const handleGuestBookingComplete = result => {
    if (result.requiresLogin || !result.accessToken) { openAuth("login"); return; }
    const stored = storeAuthResult(result);
    setUser(stored.user);
    const payment = PAYMENT_FEATURES_ENABLED && Number(stored.booking?.feeAmountVnd || 0) > 0;
    if (payment) setPaymentBookingId(stored.booking.id);
    navigateApp(workspacePathForTab(payment ? "payments" : "bookings", payment ? { booking: stored.booking.id } : {}), { replace: true });
  };
  const [calendarResourceId, setCalendarResourceId] = useState(() => readRouteParams().get("resource") || "");
  const [calendarRevision, setCalendarRevision] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingSummary, setBookingSummary] = useState(null);
  const [incidentSummary, setIncidentSummary] = useState(null);
  const [maintenance, setMaintenance] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  function openPublicSection(section) { navigateApp(publicPathForSection(section)); }
  function openAuth(page) {
    const returnTo = route.kind === "workspace" ? route.canonicalUrl : safeReturnTo(new URLSearchParams(route.search).get("returnTo"));
    navigateApp(publicPathForSection(page, returnTo ? { returnTo } : {}));
  }
  const [activeGlobalModal, setActiveGlobalModal] = useState(null);

  const routeParams = new URLSearchParams(route.search);
  const catalogueContext = context => {
    const params = new URLSearchParams(route.search);
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        if (value && value !== "ALL" && value !== "name") params.set(key, String(value)); else params.delete(key);
      }
      // Save the current register's filters in its existing history entry before leaving it.
      navigateApp(workspacePathForTab("resources", params), { replace: true, notify: false });
    }
    return params;
  };
  const openCalendar = (resourceId = "") => { setCalendarResourceId(resourceId); setActiveTab("smart_calendar", { resource: resourceId }); };


  useEffect(() => {
    const readRoute = () => {
      const next = readAppRoute(window.location);
      if (next.canonicalUrl !== window.location.pathname + window.location.search + window.location.hash) {
        window.history.replaceState(null, "", next.canonicalUrl);
      }
      setRoute(next);
    };
    const followLink = event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.("a[href]");
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self") || anchor.getAttribute("href").startsWith("#")) return;
      const destination = new URL(anchor.href);
      if (destination.origin !== window.location.origin || readAppRoute(destination).kind === "not-found") return;
      event.preventDefault();
      navigateApp(destination.pathname + destination.search + destination.hash);
    };
    for (const event of ["popstate", "hashchange", "lrm:route-change"]) window.addEventListener(event, readRoute);
    document.addEventListener("click", followLink);
    readRoute();
    return () => {
      for (const event of ["popstate", "hashchange", "lrm:route-change"]) window.removeEventListener(event, readRoute);
      document.removeEventListener("click", followLink);
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    const key = route.kind === "workspace" ? "route.workspace." + route.tab : route.kind === "not-found" ? "route.notFound.title" : "route.page." + route.page;
    document.title = translate(key) + " · LAB Resource Manager";
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", translate(route.kind === "public" ? "route.publicDescription" : "route.privateDescription"));
  }, [locale, route.kind, route.page, route.tab]);

  const routeUserId = user?.id;
  const routeUserRole = user?.role;
  const appDataController = React.useRef(null);
  const previousTab = React.useRef(activeTab);
  const isPasswordResetRequired = Boolean(user?.passwordResetRequired);
  useEffect(() => {
    if (authChecking) return;
    if (!routeUserId && route.kind === "workspace") {
      navigateApp(publicPathForSection("login", { returnTo: route.canonicalUrl }), { replace: true });
    } else if (routeUserId && route.kind === "auth") {
      const pending = sessionStorage.getItem("lrm_pending_resource");
      const destination = pending ? workspacePathForTab("smart_calendar", { resource: pending }) : safeReturnTo(new URLSearchParams(route.search).get("returnTo")) || workspacePathForTab("home");
      if (pending) { sessionStorage.removeItem("lrm_pending_resource"); setCalendarResourceId(pending); }
      navigateApp(destination, { replace: true });
    } else if (routeUserId && route.kind === "workspace" && isPasswordResetRequired && !["home", "profile"].includes(route.tab)) {
      navigateApp(workspacePathForTab("home"), { replace: true });
    }
    if (route.tab === "payments") setPaymentBookingId(new URLSearchParams(route.search).get("booking") || "");
  }, [authChecking, routeUserId, route.kind, route.tab, route.search, route.canonicalUrl, isPasswordResetRequired]);

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


  const loadData = React.useCallback(async () => {
    if (!routeUserId) return;
    appDataController.current?.abort();
    const controller = new AbortController();
    appDataController.current = controller;
    setLoading(true);
    setError("");
    try {
      const read = path => apiRequest(path, { signal: controller.signal });
      const requests = {
        resources: read("/resources"),
        bookings: read("/bookings?page=1&pageSize=100"),
        maintenance: read("/maintenance"),
        notifications: read("/notifications"),
        incidents: read("/incidents?page=1&pageSize=50&filter=OPEN"),
        ...(["ADMIN", "LAB_STAFF"].includes(routeUserRole) ? { dashboard: read(`/dashboard?includeTelemetry=${TELEMETRY_FEATURES_ENABLED}`) } : {}),
        ...(routeUserRole === "ADMIN" ? { users: read("/users") } : {})
      };
      const entries = Object.entries(requests);
      const results = await Promise.allSettled(entries.map(([, promise]) => promise));
      if (controller.signal.aborted || appDataController.current !== controller) return;
      const data = Object.fromEntries(entries.map(([key], index) => [key, results[index]]));
      const value = (key, fallback) => data[key]?.status === "fulfilled" ? data[key].value : fallback;

      setDashboard(value("dashboard", null));
      setResources(value("resources", []));
      setBookings(value("bookings", null)?.items || []);
      setBookingSummary(value("bookings", null)?.summary || null);
      setIncidentSummary(value("incidents", null)?.summary || null);
      setMaintenance(value("maintenance", []));
      setNotifications(value("notifications", []));
      setUsers(value("users", []));
      setIncidents(value("incidents", null)?.items || []);

      const failed = entries
        .map(([key], index) => results[index].status === "rejected" ? key : null)
        .filter(Boolean);
      if (failed.length) {
        setError({ key: "ui.could_not_load_application_data_07ebdf44", params: { value0: failed.join(", ") } });
      }
    } catch (requestError) {
      if (!controller.signal.aborted && appDataController.current === controller) {
        setError(requestError?.message || "ui.unable_to_load_system_data_e9df8dd1");
      }
    } finally {
      if (!controller.signal.aborted && appDataController.current === controller) {
        appDataController.current = null;
        setLoading(false);
      }
    }
  }, [routeUserId, routeUserRole]);

  useEffect(() => {
    if (!routeUserId) return;
    loadData();
    return () => appDataController.current?.abort();
  }, [routeUserId, loadData]);

  useEffect(() => {
    const wasHome = previousTab.current === "home";
    previousTab.current = activeTab;
    if (routeUserId && activeTab === "home" && !wasHome) loadData();
  }, [activeTab, routeUserId, loadData]);

  useEffect(() => {
    if (routeUserRole && route.kind === "workspace" && !canAccessTab(routeUserRole, activeTab)) {
      setActiveTab("smart_calendar");
      setError("ui.you_do_not_have_permission_e6eeee92");
    }
  }, [routeUserRole, activeTab, route.kind]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [route.path]);

  const publicShellProps = {
    onRegister: () => openAuth("register"), onNavigate: openPublicSection,
    userName: user?.fullName, onWorkspace: () => setActiveTab("home")
  };
  if (authChecking) {
    return <PublicShell {...publicShellProps}><div className="route-status-page"><p className="empty-state" role="status">{translate("ui.verifying_your_sign_in_session_90f206ba")}</p></div></PublicShell>;
  }
  if (route.kind === "not-found") {
    return <PublicShell {...publicShellProps}><section className="route-status-page"><span className="route-status-code" aria-hidden="true">404</span><h1>{translate("route.notFound.title")}</h1><p>{translate("route.notFound.body")}</p><a className="public-login" href={user ? workspacePathForTab("home") : "/"}>{translate("route.notFound.action")}</a></section></PublicShell>;
  }
  if (route.kind === "auth" || (!user && route.kind === "workspace")) {
    return <PublicShell {...publicShellProps}><div className="public-auth-page">
      <a className="public-auth-back" href="/">{translate("ui.back_to_introduction_7876ebe9")}</a>
      {route.page === "register" ? <AuthRegisterView onRegisterSuccess={setUser} onSwitchToLogin={() => openAuth("login")} locale={locale} onLocaleChange={changeLocale} />
        : <AuthLoginView onLogin={setUser} onSwitchToRegister={() => openAuth("register")} locale={locale} onLocaleChange={changeLocale} />}
    </div></PublicShell>;
  }
  if (route.kind === "public") {
    return <PublicLanding page={route.page} onNavigate={openPublicSection} onLocaleChange={changeLocale} onRegister={() => openAuth("register")}
      userName={user?.fullName} onWorkspace={() => setActiveTab("home")}
      onViewSchedule={id => {
        if (user) openCalendar(id);
        else { sessionStorage.setItem("lrm_pending_resource", id); navigateApp(publicPathForSection("login", { returnTo: workspacePathForTab("smart_calendar", { resource: id }) })); }
      }} onGuestBookingComplete={handleGuestBookingComplete} />;
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
      incidentOpenCount={loading || error ? undefined : incidentSummary?.open}
      conflictsCount={0}
      loading={loading}
      onRefresh={loadData}
      onAssistantPrefill={(slot) => setActiveGlobalModal({ type: "quick_booking", payload: slot })}
      onLogout={async () => {
        try {
          await logout();
        } catch (requestError) {
          // logout already clears local credentials, even if server revocation fails.
          console.warn('Server sign-out could not be confirmed', requestError?.status);
        } finally {
          setUser(null);
          navigateApp("/login", { replace: true });
        }
      }}
      onPasswordChanged={async () => {
        try {
          const freshUser = await getCurrentUser();
          localStorage.setItem("lrm_user", JSON.stringify(freshUser));
          setUser(freshUser);
        } catch (requestError) {
          setError(requestError?.message || "api.API_REQUEST_FAILED");
        }
      }}
    >
      {error && activeTab !== "home" && <div className="alert danger" role="alert">{translate(error)}</div>}
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

      <React.Suspense fallback={<p className="empty-state" role="status">{translate("ui.loading_workspace_959fb711")}</p>}>
      {/* REQUIRED CORE — Gated when passwordResetRequired */}
      {!user.passwordResetRequired && activeTab === "home" && (
        <WorkspaceHome
          bookingSummary={bookingSummary}
          incidentSummary={incidentSummary}
          user={user}
          bookings={bookings}
          locale={locale}
          notifications={notifications}
          incidents={incidents}
          resources={resources}
          maintenance={maintenance}
          users={users}
          dashboard={dashboard}
          loading={loading}
          error={translate(error)}
          onRetry={loadData}
          onNavigate={setActiveTab}
          onSearch={(search, category) => setActiveTab("resources", { search, category })}
          onCalendar={openCalendar}
        />
      )}
      {activeTab === "profile" && <ProfilePage user={user} onUserUpdated={setUser} />}
      {!user.passwordResetRequired && activeTab === "support" && <React.Suspense fallback={<p role="status">{translate("support.loading")}</p>}><SupportPage user={user} conversationId={routeParams.get("conversation") || undefined} sessionId={routeParams.get("session") || undefined} /></React.Suspense>}
      {!user.passwordResetRequired && activeTab === 'stock' && canAccessTab(user.role, 'stock') && <StockPage locale={locale} user={user} maintenance={maintenance} />}
      {!user.passwordResetRequired && PAYMENT_FEATURES_ENABLED && activeTab === "payments" && (
        <React.Suspense fallback={<p role="status">{translate("ui.loading_payments_b1f91304")}</p>}>
          <PaymentsPage user={user} bookingId={paymentBookingId} onClearBooking={() => { setPaymentBookingId(""); setActiveTab("payments"); }} />
        </React.Suspense>
      )}
      {!user.passwordResetRequired && activeTab === "smart_calendar" && (
        <SmartCalendarView
          key={routeHash}
          user={user}
          initialResourceId={routeParams.get("resource") || calendarResourceId}
          refreshKey={calendarRevision}
          onOpenBooking={(slot) => setActiveGlobalModal({ type: "quick_booking", payload: slot })}
        />
      )}
      {!user.passwordResetRequired && activeTab === "admin_management" && <AdminResourceManagementView key={routeHash} user={user} initialClassification={routeParams.get("classification") || "ALL"} />}
      {!user.passwordResetRequired && activeTab === "escalations" && <NotificationCenter notifications={notifications} loading={loading} loadError={translate(error)} onOpenBookings={() => setActiveTab("bookings")} onChanged={loadData} />}
      {!user.passwordResetRequired && activeTab === "dashboard" && <MonitoringDashboardPage mode="operations" dashboard={dashboard} loading={loading} onRefresh={loadData} />}
      {!user.passwordResetRequired && route.screen === "resource-detail" && (
        <ResourceDetailPage
          key={route.resourceId}
          user={user}
          resourceId={route.resourceId}
          onBack={() => setActiveTab("resources", Object.fromEntries(routeParams))}
          onViewCalendar={openCalendar}
          onAddToSelection={resourceSelection.add}
          isSelected={resourceSelection.items.some(item => item.id === route.resourceId)}
          selectionFull={resourceSelection.items.length >= 30}
          onViewSelection={() => navigateApp(resourceSelectionPath(routeParams))}
        />
      )}
      {!user.passwordResetRequired && activeTab === "resources" && !route.screen && <ResourceManagementView key={routeHash} user={user} browseMode initialQuery={Object.fromEntries(routeParams)} initialSearch={routeParams.get("search") || ""} initialCategory={routeParams.get("category") || ""}
        onViewCalendar={(id, context) => { catalogueContext(context); openCalendar(id); }}
        onViewDetails={(id, context) => navigateApp(resourceDetailPath(id, catalogueContext(context)))}
        onAddToSelection={resourceSelection.add} selectedResourceIds={resourceSelection.items.map(item => item.id)} onBrowseContextChange={catalogueContext} onViewSelection={context => navigateApp(resourceSelectionPath(catalogueContext(context)))} />}
      {!user.passwordResetRequired && route.screen === "resource-selection" && <SelectionPage key={user.id} userId={user.id} items={resourceSelection.items} onRemove={resourceSelection.remove}
        onBrowse={() => setActiveTab("resources", Object.fromEntries(routeParams))} onDetails={id => navigateApp(resourceDetailPath(id, routeParams))}
        onViewBookings={id => setActiveTab("bookings", id ? { booking: id } : {})}
        onConfirmed={() => { setCalendarRevision(value => value + 1); loadData(); }} onPayment={PAYMENT_FEATURES_ENABLED ? openBookingPayment : undefined} />}
      {!user.passwordResetRequired && activeTab === "bookings" && <BookingOperationsPage key={routeHash} user={user} onChanged={loadData} onPayment={PAYMENT_FEATURES_ENABLED ? openBookingPayment : undefined} />}
      {!user.passwordResetRequired && activeTab === "maintenance" && <MaintenancePage locale={locale} resources={resources} maintenance={maintenance} onChanged={loadData} onBookings={() => setActiveTab('bookings')} />}
      {!user.passwordResetRequired && activeTab === "incidents" && <IncidentsPage user={user} resources={resources} incidents={incidents} onChanged={loadData} />}
      {activeTab === "monitoring" && <MonitoringDashboardPage userRole={user.role} dashboard={dashboard} loading={loading} onRefresh={loadData} />}
      {activeTab === "users" && <AccessUserManagement key={routeHash} actorRole={user.role} actorId={user.id} />}
      {activeTab === 'chatgpt_bridge' && !user.passwordResetRequired && <ChatgptBridgePage actorRole={user.role} />}

      </React.Suspense>

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

    </AppLayout>
  );
}

export default App;
