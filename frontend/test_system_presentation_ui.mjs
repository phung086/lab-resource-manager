import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

// Presentation fixtures only: all API traffic stays in this browser context.
const base = process.env.UI_BASE_URL || "http://127.0.0.1:5173";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const output =
  process.env.UI_EVIDENCE_DIR ||
  `${process.env.TEMP}/lab-system-refinement-20261030/after/account-inbox`;
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const role of ["CUSTOMER", "LAB_STAFF", "ADMIN"]) {
    const user = {
      id: "presentation-qa",
      fullName: "Minh Anh",
      email: "presentation@example.test",
      role,
      isActive: true,
      phone: "0900000000",
      createdAt: new Date().toISOString(),
      certifications: [],
      bookingSummary: {
        total: 0,
        byStatus: {},
        history: 0,
        overdue: 0,
        pendingPayment: 0,
        asOf: new Date().toISOString(),
      },
    };
    const lab = {
      id: "qa-lab",
      code: "QA",
      name: "LAB kiểm thử",
      labPolicy: null,
    };
    const resource = {
      id: "qa-resource",
      code: "QA-EQ-01",
      name: "Thiết bị kiểm thử",
      category: "EQUIPMENT",
      subtype: "OTHER",
      operationalStatus: "AVAILABLE",
      bookingState: "bookable",
      laboratoryId: lab.id,
      laboratory: lab,
      media: [],
      specs: {},
      capacity: 1,
    };
    const customer = {
      ...user,
      id: "qa-customer",
      role: "CUSTOMER",
      fullName: "Khách hàng kiểm thử",
      email: "customer@example.test",
    };
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    await context.addInitScript((user) => {
      sessionStorage.setItem("lrm_token", "isolated-system-presentation");
      sessionStorage.setItem("lrm_user", JSON.stringify(user));
      localStorage.setItem("lrm_locale", "vi");
    }, user);
    const errors = [];
    let reads = 0,
      failingPath = "";
    await context.route("**/api/**", async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
      assert.ok(
        request.method() === "GET" || path === "/api/auth/activity",
        "No business mutation in presentation QA",
      );
      reads++;
      if (failingPath && path === failingPath)
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "API_REQUEST_FAILED" }),
        });
      let data = [];
      if (path === "/api/auth/me" || path === "/api/users/me") data = user;
      else if (["/api/auth/session", "/api/auth/activity"].includes(path))
        data = {
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7200000).toISOString(),
          idleExpiresAt: new Date(Date.now() + 3600000).toISOString(),
          idleTimeoutSeconds: 3600,
        };
      else if (path === "/api/bookings" || path === "/api/incidents")
        data = {
          items: [],
          pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
          summary: path.endsWith("bookings")
            ? user.bookingSummary
            : { total: 0, open: 0, resolved: 0, byStatus: {} },
        };
      else if (path === "/api/notifications")
        data = [
          {
            id: "notice-qa",
            title: "Lịch thực hành đã được cập nhật",
            message: "Kiểm tra thời gian và chuẩn bị trước khi đến LAB.",
            createdAt: new Date().toISOString(),
            readAt: null,
          },
        ];
      else if (path === "/api/notifications/unread-count") data = { unread: 1 };
      else if (path === "/api/users")
        data = role === "ADMIN" ? [user, customer] : [customer];
      else if (["/api/laboratories", "/api/users/laboratories"].includes(path))
        data = [lab];
      else if (path === "/api/resources") data = [resource];
      else if (path === "/api/resources/qa-resource") data = resource;
      else if (path === "/api/lab-workspace/stock")
        data = [
          {
            ...resource,
            id: "qa-material",
            code: "QA-MAT-01",
            category: "MATERIAL",
            name: "Linh kiện kiểm thử",
            stockItem: { balance: 12, unit: "bộ" },
          },
        ];
      else if (path.startsWith("/api/lab-workspace/stock/")) data = [];
      else if (path === "/api/chatgpt-bridge/connections")
        data = {
          enabled: false,
          authorized: false,
          connected: false,
          connections: [],
        };
      else if (path === "/api/audit-events")
        data = {
          events: [
            {
              id: "qa-audit",
              action: "USER_PROFILE_CHANGED",
              targetType: "USER",
              targetId: customer.id,
              actorId: user.id,
              actorRoleSnapshot: role,
              actor: user,
              laboratory: null,
              resource: null,
              beforeState: null,
              afterState: { fullName: customer.fullName },
              reason: "Dữ liệu kiểm thử giao diện",
              metadata: {},
              createdAt: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        };
      else if (path === "/api/dashboard")
        data = {
          generatedAt: new Date().toISOString(),
          summary: {
            totalResources: 1,
            activeBookingsCount: 0,
            pendingApprovalCount: 0,
            checkedOutCount: 0,
            openIncidentCount: 0,
            criticalIncidentCount: 0,
            unreadNotifications: 1,
            resourcesByOperationalStatus: { AVAILABLE: 1 },
          },
          upcomingBookings: [],
          telemetry: [],
          monitoringAlerts: [],
          cameras: [],
        };
      else if (path === "/api/dashboard/report")
        data = {
          source: "database",
          generatedAt: new Date().toISOString(),
          window: {
            days: 7,
            startAt: new Date(Date.now() - 7 * 86400000).toISOString(),
            endAt: new Date().toISOString(),
            timezone: "Asia/Ho_Chi_Minh",
            interval: "[startAt,endAt)",
          },
          basis: {},
          summary: {
            resourceCount: 1,
            usedResourceCount: 0,
            bookingCount: 0,
            cancelledCount: 0,
            noShowCount: 0,
            endedSessionCount: 0,
            scheduledMinutes: 0,
            actualUsageMinutes: 0,
            incidentCount: 0,
            openIncidentCount: 0,
            plannedMaintenanceMinutes: 0,
          },
          resources: [],
        };
      else if (path === "/api/planning/report")
        data = {
          total: 0,
          cancelled: 0,
          completed: 0,
          maintenance: 0,
          hours: [],
          resources: [],
        };
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    const views = [
      "profile",
      "notifications",
      ...(role === "CUSTOMER"
        ? ["selection"]
        : [
            "users",
            "materials",
            "resource-management",
            "operations",
            "audit-logs",
          ]),
      ...(role === "ADMIN" ? ["chatgpt-bridge"] : []),
    ];
    const locators = {
      profile: ".account-identity",
      notifications: ".inbox-row",
      users: ".users-directory",
      materials: ".materials-row-button",
      "resource-management": ".resource-management-view",
      operations: ".operations-report",
      "audit-logs": ".audit-day-group,.audit-event,.audit-workspace",
      selection: ".selection-heading",
      "chatgpt-bridge": ".chatgpt-connection-status",
    };
    for (const view of views) {
      reads = 0;
      await page.goto(`${base}/workspace/${view}`);
      await page.locator(locators[view]).first().waitFor();
      if (view === "profile") {
        for (const section of ["contact", "security", "access", "activity"]) {
          await page
            .locator(
              `.account-navigation button[aria-controls=account-${section}-panel]`,
            )
            .click();
          assert.equal(
            await page.locator(`#account-${section}-panel`).isVisible(),
            true,
          );
        }
        await page
          .locator(
            ".account-navigation button[aria-controls=account-contact-panel]",
          )
          .click();
      } else if (view === "notifications") {
        await page.locator(".inbox-row").click();
        await page.locator(".inbox-detail h2").waitFor();
      }
      if (view === "materials") {
        await page.locator(".materials-row-button").first().click();
        await page.locator(".materials-dossier h2").waitFor();
      }
      if (view === "users") {
        await page.locator(".users-heading .btn-primary").click();
        await page.locator(".users-create").waitFor();
        assert.match(
          await page.locator('.users-create [id$="password-hint"]').innerText(),
          /12/,
        );
      }
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(() => window.scrollTo(0, 0));
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `${role} ${view} ${width} overflow`,
        );
        if (role === "CUSTOMER" || role === "ADMIN")
          await page.screenshot({
            path: `${output}/${role.toLowerCase()}-${view}-${width}.png`,
            fullPage: true,
          });
      }
      await page
        .getByRole("button", { name: "EN", exact: true })
        .first()
        .click();
      await page.waitForFunction(() => document.documentElement.lang === "en");
      assert.equal(
        await page
          .locator("main")
          .innerText()
          .then((s) => /ui\.(?:hub|inbox|profile|roleProfile)\./.test(s)),
        false,
      );
      const motion = await page
        .locator(".workspace-shell")
        .evaluate(
          (root) =>
            root
              .getAnimations({ subtree: true })
              .filter(
                (animation) =>
                  animation.playState === "running" &&
                  animation.effect?.getComputedTiming().iterations === Infinity,
              ).length,
        );
      assert.equal(motion, 0, "No continuous workspace motion while idle");
      assert.ok(reads <= 40, "Bounded fixture reads; no presentation polling");
      const failurePaths = {
        users: "/api/users",
        materials: "/api/lab-workspace/stock",
        "resource-management": "/api/resources",
        operations: "/api/dashboard/report",
        "audit-logs": "/api/audit-events",
        "chatgpt-bridge": "/api/chatgpt-bridge/connections",
      };
      if (role === "ADMIN" && failurePaths[view]) {
        failingPath = failurePaths[view];
        await page.reload();
        await page.locator("main [role=alert]").first().waitFor();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          view + " failure overflow",
        );
        await page.screenshot({
          path: `${output}/${view}-error-390.png`,
          fullPage: true,
        });
        failingPath = "";
        results.push({ role, view: view + "-unavailable", passed: true });
      }
      assert.deepEqual(errors, []);
      results.push({
        role,
        view,
        reads,
        idleInfiniteAnimations: motion,
        passed: true,
      });
    }
    await context.close();
  }
  const publicContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await publicContext.route("**/api/**", (route) =>
    route.fulfill({ contentType: "application/json", body: "[]" }),
  );
  const publicPage = await publicContext.newPage(),
    publicErrors = [];
  publicPage.on("pageerror", (error) => publicErrors.push(error.message));
  await publicPage.goto(base + "/");
  await publicPage.locator(".landing-hero-glass").waitFor();
  assert.equal(
    await publicPage
      .locator(".landing-feature-card")
      .first()
      .evaluate((el) => getComputedStyle(el).backdropFilter),
    "none",
  );
  for (const width of [1440, 390]) {
    await publicPage.setViewportSize({ width, height: 1000 });
    await publicPage.waitForFunction(
      (width) =>
        getComputedStyle(
          document.querySelector(".landing-hero-glass"),
        ).backdropFilter.startsWith(width === 390 ? "blur(8px)" : "blur(16px)"),
      width,
    );
    assert.equal(
      await publicPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      "Landing overflow",
    );
    const blur = await publicPage
      .locator(".landing-hero-glass")
      .evaluate((el) => getComputedStyle(el).backdropFilter);
    assert.equal(
      blur,
      width === 390 ? "blur(8px)" : "blur(16px) saturate(1.35)",
    );
    await publicPage.screenshot({ path: `${output}/landing-${width}.png` });
  }
  await publicPage.goto(base + "/login");
  await publicPage.locator("input[type=email]").waitFor();
  assert.equal(
    await publicPage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "Login overflow",
  );
  for (const [path, selector] of [
    ["/register", "input[type=email]"],
    ["/resources", ".public-live-catalog"],
    ["/schedule", ".landing-schedule"],
    ["/how-it-works", ".landing-workflow"],
    ["/missing-ui-route", ".route-status-page"],
  ]) {
    await publicPage.goto(base + path);
    await publicPage.locator(selector).first().waitFor();
    for (const width of [1440, 390]) {
      await publicPage.setViewportSize({ width, height: 1000 });
      assert.equal(
        await publicPage.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        path + " overflow",
      );
    }
    results.push({ view: path, passed: true });
  }
  assert.deepEqual(publicErrors, []);
  results.push({ view: "public-landing-login", passed: true });
  await publicContext.close();
  console.log(
    JSON.stringify({
      results,
      scope: "Isolated UI fixtures, no DB/auth/SMTP verification",
      output,
    }),
  );
} finally {
  await browser.close();
}
