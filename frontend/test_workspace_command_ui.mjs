import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
const base = process.env.UI_BASE_URL || "http://127.0.0.1:5173";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const phase = process.env.CAPTURE_PHASE || "after";
const output =
  process.env.UI_EVIDENCE_DIR ||
  `${process.env.TEMP}/lab-workspace-command-20261030`;
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const scenario of process.env.UI_SCENARIOS?.split(",").filter(Boolean)
    .length
    ? process.env.UI_SCENARIOS.split(",").filter(Boolean)
    : [
        "confirmed",
        "hold",
        "overdue",
        "legacy",
        "empty",
        "failure",
        "staff",
        "admin",
      ]) {
    const role =
      scenario === "staff"
        ? "LAB_STAFF"
        : scenario === "admin"
          ? "ADMIN"
          : "CUSTOMER";
    const user = {
      id: "workspace-design-qa",
      fullName: "Minh Anh",
      email: "workspace@example.test",
      role,
      isActive: true,
    };
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    await context.addInitScript((user) => {
      sessionStorage.setItem("lrm_token", "isolated-workspace-design");
      sessionStorage.setItem("lrm_user", JSON.stringify(user));
      localStorage.setItem("lrm_locale", "vi");
    }, user);
    const lab = {
      id: "qa-lab",
      name: "LAB Sáng tạo & Công nghệ",
      code: "LAB-01",
    };
    const resources = [
      ["ROOM", "Phòng nghiên cứu nhóm"],
      ["EQUIPMENT", "Máy trạm nghiên cứu"],
      ["EXPERIMENT_KIT", "Bộ thực hành điện tử"],
      ["MACHINE", "Máy chế tạo mẫu"],
      ["MATERIAL", "Bộ linh kiện thí nghiệm"],
    ].map(([category, name], i) => ({
      id: "qa-resource-" + i,
      code: "LAB-0" + i,
      name,
      category,
      operationalStatus: "AVAILABLE",
      bookingState: "bookable",
      laboratory: lab,
      media: [],
      rental: { hourlyRateVnd: 40000 + i * 10000, currency: "VND" },
    }));
    const bookings =
      scenario === "empty"
        ? []
        : [0, 1, 2, 3].map((i) => ({
            id: "qa-booking-" + i,
            bookingCode: "LAB-QA-100" + i,
            requestedById: user.id,
            title: [
              "Nghiên cứu thị giác máy tính",
              "Thực hành cảm biến",
              "Làm việc nhóm",
              "Chế tạo mẫu",
            ][i],
            status:
              i === 0 && ["hold", "legacy"].includes(scenario)
                ? "PENDING_APPROVAL"
                : i === 0 && scenario === "overdue"
                  ? "CHECKED_OUT"
                  : "CONFIRMED",
            paymentDueAt:
              i === 0 && scenario === "hold"
                ? new Date(Date.now() + 8 * 60000).toISOString()
                : null,
            resourceId: resources[i].id,
            resource: resources[i],
            requestedBy: user,
            startAt: new Date(
              Date.now() +
                (i === 0 && scenario === "overdue"
                  ? -7200000
                  : (i + 1) * 86400000),
            ).toISOString(),
            endAt: new Date(
              Date.now() +
                (i === 0 && scenario === "overdue"
                  ? -3600000
                  : (i + 1) * 86400000 + 7200000),
            ).toISOString(),
          }));
    if (scenario === "legacy") bookings.splice(1);
    const byStatus = {};
    for (const b of bookings)
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
    const summary = {
      total: bookings.length,
      byStatus,
      history: 0,
      overdue: scenario === "overdue" ? 1 : 0,
      pendingPayment: scenario === "hold" ? 1 : 0,
      asOf: new Date().toISOString(),
    };
    let fail = scenario === "failure",
      writes = 0,
      reads = 0;
    const errors = [];
    await context.route("**/api/**", async (route) => {
      if (route.request().method() === "GET") reads++;
      const url = new URL(route.request().url()),
        path = url.pathname;
      let data = [];
      if (
        !["GET", "OPTIONS"].includes(route.request().method()) &&
        path !== "/api/auth/activity"
      ) {
        writes++;
        throw new Error("Unexpected mutation " + path);
      }
      if (path === "/api/auth/me") data = user;
      else if (["/api/auth/session", "/api/auth/activity"].includes(path))
        data = {
          idleExpiresAt: new Date(Date.now() + 3600000).toISOString(),
          expiresAt: new Date(Date.now() + 7200000).toISOString(),
          idleTimeoutSeconds: 3600,
        };
      else if (path === "/api/resources") data = resources;
      else if (path === "/api/bookings") {
        if (fail)
          return route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "API_REQUEST_FAILED" }),
          });
        data = {
          items: bookings,
          pagination: {
            page: 1,
            pageSize: 100,
            total: bookings.length,
            totalPages: 1,
          },
          summary,
        };
      } else if (path === "/api/incidents")
        data = {
          items: [],
          summary: { total: 0, open: 0, resolved: 0, byStatus: {} },
          pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
        };
      else if (path === "/api/notifications")
        data = [
          {
            id: "qa-notice",
            title: "Chuẩn bị cho buổi thực hành",
            message: "Kiểm tra lịch và hướng dẫn sử dụng trước khi đến LAB.",
            createdAt: new Date().toISOString(),
            readAt: null,
          },
        ];
      else if (path === "/api/notifications/unread-count") data = { unread: 1 };
      else if (path === "/api/dashboard")
        data = { summary: { totalResources: 5, criticalIncidentCount: 0 } };
      else if (path === "/api/users") data = [user];
      else if (path === "/api/dashboard/trends")
        data = {
          scope: role === "ADMIN" ? "system" : "assigned_labs",
          period: "week",
          paymentState: "restricted",
          timezone: "Asia/Ho_Chi_Minh",
          startAt: new Date().toISOString(),
          endAt: new Date().toISOString(),
          buckets: [],
        };
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/workspace/overview");
    await page
      .locator(
        scenario === "failure"
          ? ".home-error"
          : role === "CUSTOMER"
            ? ".discovery-studio"
            : role === "ADMIN"
              ? ".home-control-room"
              : ".ops-cluster",
      )
      .waitFor();
    const initialReads = reads;
    const presentation = await page
      .locator(".workspace-shell")
      .evaluate((root) => ({
        infiniteAnimations: root
          .getAnimations({ subtree: true })
          .filter(
            (animation) =>
              animation.playState === "running" &&
              animation.effect?.getComputedTiming().iterations === Infinity,
          ).length,
        blurredSurfaces: [...root.querySelectorAll("*")].filter(
          (el) =>
            el.checkVisibility() &&
            !["none", ""].includes(getComputedStyle(el).backdropFilter),
        ).length,
      }));
    if (phase === "before") {
      if (["confirmed", "staff", "admin"].includes(scenario))
        await page.screenshot({
          path: `${output}/before-${scenario}-1440.png`,
          fullPage: true,
        });
    } else {
      if (scenario === "failure") {
        assert.equal(await page.locator(".hub-metric").count(), 0);
        fail = false;
        await page.locator(".home-error button").click();
        await page.locator(".discovery-studio").waitFor();
      }
      for (const width of [1440, 1024, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          scenario + " overflow " + width,
        );
        if (width === 1440 && scenario === "confirmed")
          await page.screenshot({ path: `${output}/after-first-screen.png` });
        if (
          width !== 1024 &&
          ["confirmed", "hold", "overdue", "empty", "staff", "admin"].includes(
            scenario,
          )
        )
          await page.screenshot({
            path: `${output}/after-${scenario}-${width}.png`,
            fullPage: true,
          });
      }
      if (role === "CUSTOMER") {
        assert.equal(await page.locator(".hub-metric").count(), 4);
        assert.equal(
          await page.locator(".hub-category-shortcuts button").count(),
          5,
        );
        assert.equal(
          await page
            .locator(".hub-focus")
            .evaluate((el) => getComputedStyle(el).animationName),
          "none",
        );
        assert.equal(
          new Set(
            await page
              .locator(".hub-metric-icon")
              .evaluateAll((nodes) =>
                nodes.map((node) => getComputedStyle(node).color),
              ),
          ).size,
          4,
          "Metric colours remain distinct",
        );
        assert.equal(await page.locator(".hub-aside .home-notices").count(), 1);
        if (scenario === "legacy")
          assert.equal(
            await page.locator(".hub-focus[data-state=review]").count(),
            1,
          );
        if (scenario === "hold")
          assert.equal(
            await page.locator('.hub-focus[data-state="payment"]').count(),
            1,
          );
        if (scenario === "overdue")
          assert.equal(
            await page.locator('.hub-focus[data-state="overdue"]').count(),
            1,
          );
        if (scenario === "confirmed") {
          await page.emulateMedia({ reducedMotion: "no-preference" });
          assert.equal(
            await page
              .locator(".hub-focus")
              .evaluate((el) => getComputedStyle(el).animationName),
            "hub-focus-enter",
          );
          await page.emulateMedia({ reducedMotion: "reduce" });
          assert.equal(
            await page.locator(".hub-row-action").evaluateAll((nodes) =>
              nodes.every((node) => {
                const rect = node.getBoundingClientRect();
                return rect.left >= 0 && rect.right <= innerWidth;
              }),
            ),
            true,
            "Every mobile row action stays visible",
          );
          await page.locator(".hub-focus .hub-button-primary").click();
          assert.match(page.url(), /booking=qa-booking-0/);
          await page.goBack();
          await page.locator(".hub-focus").waitFor();
          await page.locator(".hub-search input").fill("GPU");
          await page.locator(".hub-search select").selectOption("EQUIPMENT");
          await page.locator(".hub-search button[type=submit]").click();
          assert.match(page.url(), /search=GPU/);
          assert.match(page.url(), /category=EQUIPMENT/);
          await page.goBack();
          await page.locator(".hub-focus").waitFor();
        }
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
          .then((s) => /ui\.hub\.|ui\.home\./.test(s)),
        false,
      );
    }
    assert.deepEqual(errors, []);
    assert.equal(writes, 0);
    results.push({ scenario, initialReads, presentation, passed: true });
    await context.close();
  }
  console.log(
    JSON.stringify({
      results,
      scope: "Isolated browser fixtures; no business API/DB writes",
      output,
    }),
  );
} finally {
  await browser.close();
}
