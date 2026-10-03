import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { selectWorkspaceTab } from "./test-utils/openWorkspace.mjs";

const base = process.env.QUEUE_UI_URL || "http://127.0.0.1:15185";
const api = process.env.QUEUE_API_URL || "http://127.0.0.1:15015/api";
assert.equal(new URL(base).hostname, "127.0.0.1");
assert.equal(new URL(api).hostname, "127.0.0.1");
assert.equal(new URL(api).port, "15015", "Only the dedicated queue test API is allowed");
const output = process.env.UI_SCREENSHOT_DIR || "../logs/queue-pagination-20261003/browser";
mkdirSync(output, { recursive: true });
const catalogs = Object.fromEntries(["vi", "en"].map(locale => [locale, JSON.parse(readFileSync(`src/locales/catalog/${locale}.json`)).messages]));
const checks = [], errors = [], sessions = {};
const sharedPaths = new Set(["/resources", "/bookings", "/maintenance", "/notifications", "/incidents", "/dashboard", "/users"]);
const check = (condition, label) => { assert.ok(condition, label); checks.push(label); };
async function call(role, path, body) {
  const response = await fetch(`${api}${path}`, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(sessions[role] ? { Authorization: `Bearer ${sessions[role].accessToken}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json(); assert.ok(response.ok, `${path}: ${response.status}`); return data;
}
for (const role of ["staff", "admin", "student", "lecturer", "unassigned"]) sessions[role] = await call(role, "/auth/login", { email: `${role}@queue.test`, password: "QueueTest!2026" });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, headless: true, args: ["--no-sandbox"] });
async function open(role, hash) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: "reduce" });
  await context.addInitScript(session => { localStorage.setItem("lrm_token", session.accessToken); localStorage.setItem("lrm_user", JSON.stringify(session.user)); localStorage.setItem("lrm_locale", "vi"); }, sessions[role]);
  const page = await context.newPage(); page.on("pageerror", error => errors.push(`${role}: ${error.message}`));
  const reads = [], mutations = [];
  page.on("request", request => {
    if (!request.url().startsWith(api)) return;
    const url = new URL(request.url()), path = url.pathname.slice(new URL(api).pathname.length);
    if (request.method() === "GET" && sharedPaths.has(path)) reads.push(path + url.search);
    if (["POST", "PATCH", "DELETE"].includes(request.method()) && !path.startsWith("/auth/")) mutations.push(path);
  });
  await page.goto(`${base}/${hash}`); return { context, page, reads, mutations };
}
const waitPage = async page => { await page.locator('.queue-pagination[aria-busy="false"]').waitFor(); };
const locale = async (page, value) => { await page.locator(".header-2026").getByRole("button", { name: value.toUpperCase(), exact: true }).click(); await page.locator(`html[lang=${value}]`).waitFor(); };
try {
  for (const role of ["staff", "admin", "student", "lecturer", "unassigned"]) {
    const { context, page, reads } = await open(role, "#/workspace/booking?filter=ALL");
    await waitPage(page);
    await page.waitForLoadState("networkidle");
    const budget = role === "admin" ? 8 : ["staff", "unassigned"].includes(role) ? 7 : 6;
    check(reads.length === budget && reads.length === new Set(reads).size, `${role}: one shared read per dataset plus one booking page, within request budget (${reads.join(", ")})`);
    const expected = await call(role, "/bookings?page=1&pageSize=20");
    check(await page.locator(".operation-card").count() === expected.items.length, `${role}: booking page size and permissions`);
    check((await page.locator(".queue-pagination p").textContent()).includes(String(expected.pagination.total)), `${role}: complete scoped total`);
    if (expected.pagination.totalPages > 1) {
      const first = await page.locator(".operation-card h3").allTextContents();
      await page.locator(".queue-pagination").getByRole("button", { name: catalogs.vi["ui.queue.next"], exact: true }).click();
      await page.locator(".queue-pagination").getByText("Trang 2 /", { exact: false }).waitFor();
      const second = await page.locator(".operation-card h3").allTextContents();
      check(!second.some(title => first.includes(title)), `${role}: next page changes records`);
      await locale(page, "en");
      check((await page.locator(".queue-pagination").textContent()).includes("Page 2 of"), `${role}: language preserves page`);
      await page.locator(".queue-pagination").getByRole("button", { name: catalogs.en["ui.queue.previous"], exact: true }).click();
      await page.locator(".queue-pagination").getByText("Page 1 of", { exact: false }).waitFor();
    }
    const beforeNavigation = reads.length;
    await selectWorkspaceTab(page, "escalations");
    await page.locator("#notification-center-heading").waitFor(); await page.waitForLoadState("networkidle");
    check(reads.length === beforeNavigation, `${role}: notification navigation reuses shared records`);
    await context.close();
  }

  const { context, page, mutations } = await open("staff", "#/workspace/tong-quan");
  await page.locator(".home-queue-panel .queue-pagination").waitFor();
  const pendingTab = page.locator(".home-queue-tabs").getByRole("button", { name: /Chờ duyệt|Duyệt/i });
  await pendingTab.click(); await waitPage(page);
  check(await page.locator(".home-operation-row").count() === 5, "staff home: only five scoped queue records per page");
  check((await pendingTab.textContent()).includes("25"), "staff home: old pending requests counted beyond recent 100");
  await page.locator(".queue-pagination").getByRole("button", { name: catalogs.vi["ui.queue.next"], exact: true }).click();
  await page.locator(".queue-pagination").getByText("Trang 2 /", { exact: false }).waitFor();
  const linkedAction = page.locator(".home-operation-row .primary-button").first();
  await linkedAction.click(); await page.getByRole("dialog").waitFor();
  check(await page.locator(".operation-card").count() === 1, "old booking shortcut loads exact authorized record beyond first page");
  const originalTitle = await page.locator(".operation-card h3").textContent();
  await page.keyboard.press("Escape"); await page.getByRole("dialog").waitFor({ state: "hidden" });
  check(await page.locator(".operation-card h3").textContent() === originalTitle, "closing action keeps old booking detail accessible");
  check(mutations.length === 0, "opening and closing an old booking action never performs a mutation");
  await page.goto(`${base}/#/workspace/booking?filter=PENDING_APPROVAL`); await waitPage(page);
  check(await page.locator(".operation-card").count() === 20, "server status filter returns old pending records on page one");
  await page.locator(".queue-pagination").getByRole("button", { name: catalogs.vi["ui.queue.next"], exact: true }).click();
  await page.locator(".queue-pagination").getByText("Trang 2 /", { exact: false }).waitFor();
  check(await page.locator(".operation-card").count() === 5, "pending last page has five records");
  await page.locator(".operations-filter-row").getByRole("button", { name: /Chờ bàn giao/i }).click(); await waitPage(page);
  check((await page.locator(".queue-pagination").textContent()).includes("Trang 1 / 1"), "filter changes reset to first page");

  // An actual server failure must remain visible, then retry must recover.
  await page.route("**/api/bookings?**", route => route.abort("failed"));
  await page.locator(".operations-header").getByRole("button").click();
  await page.locator(".operations-empty .secondary-button").waitFor();
  check(await page.locator(".operation-card").count() === 0, "failed page read hides obsolete actionable rows");
  await page.unroute("**/api/bookings?**"); await page.locator(".operations-empty .secondary-button").click(); await waitPage(page);
  check(await page.locator(".operation-card").count() === 7, "retry recovers confirmed queue");

  // Delay a real response, switch filters, then ensure its late completion is ignored.
  let release;
  const held = new Promise(resolve => { release = resolve; });
  let intercepted;
  const arrived = new Promise(resolve => { intercepted = resolve; });
  await page.route("**/api/bookings?**", async route => {
    if (new URL(route.request().url()).searchParams.get("filter") !== "PENDING_APPROVAL") return route.continue();
    const response = await route.fetch(); intercepted(); await held;
    try { await route.fulfill({ response }); } catch { /* Superseded request may already be cancelled. */ }
  });
  await page.locator(".operations-filter-row").getByRole("button", { name: /Chờ duyệt/i }).click(); await arrived;
  await page.locator(".operations-filter-row").getByRole("button", { name: /Chờ bàn giao/i }).click(); await waitPage(page);
  release(); await page.unroute("**/api/bookings?**");
  await page.waitForLoadState("networkidle");
  check(await page.locator(".operation-card").count() === 7 && (await page.locator(".operation-card h3").allTextContents()).every(title => title.startsWith("CONFIRMED")), "superseded delayed response cannot overwrite the selected queue");

  await page.locator(".operations-filter-row").getByRole("button", { name: /Chờ duyệt/i }).click(); await waitPage(page);
  check((await page.locator(".queue-pagination").textContent()).includes("Trang 1 / 2"), "returning to a previous filter also resets its stored page");
  const keyboardNext = page.locator(".queue-pagination").getByRole("button", { name: catalogs.vi["ui.queue.next"], exact: true });
  await keyboardNext.focus(); await page.keyboard.press("Enter");
  await page.locator(".queue-pagination").getByText("Trang 2 /", { exact: false }).waitFor();
  check(await page.locator(".operation-card").count() === 5, "keyboard Enter changes page");
  await page.waitForFunction(() => document.activeElement?.closest(".queue-pagination") && !document.activeElement.disabled);
  check(await page.locator(".queue-pagination").getByRole("button", { name: catalogs.vi["ui.queue.previous"], exact: true }).evaluate(node => document.activeElement === node), "last page restores keyboard focus to the available Previous control");
  await page.goto(`${base}/#/workspace/su-co`); await waitPage(page);
  await page.locator(".booking-queue-toolbar").getByRole("button", { name: catalogs.vi["ui.processing_e84898db"], exact: true }).click(); await waitPage(page);
  check(await page.locator(".operational-card").count() === 20, "incident OPEN filtering reaches old reports behind 55 closed records");
  await page.locator(".queue-pagination").getByRole("button", { name: catalogs.vi["ui.queue.next"], exact: true }).click();
  await page.locator(".queue-pagination").getByText("Trang 2 /", { exact: false }).waitFor();
  check(await page.locator(".operational-card").count() === 5, "incident pagination reaches remaining old open reports");
  for (const language of ["vi", "en"]) {
    await locale(page, language);
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${language} ${width}px: pagination has no horizontal overflow`);
      await page.screenshot({ path: `${output}/incidents-${language}-${width}.png`, fullPage: true });
    }
  }
  // Another operator resolves the entire current last page using authorized APIs.
  const last = await call("staff", "/incidents?page=2&pageSize=20&filter=OPEN");
  for (const row of last.items) await call("staff", `/incidents/${row.id}/resolve`, { resolution: "Verified isolated pagination test outcome" });
  await page.locator(".booking-queue-toolbar").getByRole("button", { name: catalogs.en["ui.refresh_b4c61340"], exact: true }).click();
  await page.locator(".queue-pagination").getByText("Page 1 of 1", { exact: true }).waitFor();
  check(await page.locator(".operational-card").count() === 20, "refresh clamps emptied last page after real incident mutations");
  await context.close();

  const adminHome = await open("admin", "#/workspace/tong-quan");
  await adminHome.page.locator(".home-attention-grid").waitFor();
  const totals = await call("admin", "/bookings?page=1"), incidents = await call("admin", "/incidents?page=1");
  const cards = adminHome.page.locator(".home-attention-card");
  check(parseInt(await cards.nth(0).locator("strong").textContent()) === totals.summary.byStatus.PENDING_APPROVAL, "admin home shows uncapped pending total");
  check(parseInt(await cards.nth(1).locator("strong").textContent()) === totals.summary.overdue, "admin home shows uncapped overdue total");
  check(parseInt(await cards.nth(2).locator("strong").textContent()) === incidents.summary.open, "admin home shows uncapped incident total");
  await adminHome.context.close();

  // Reopen the actual serialized maintenance record and reschedule without reselecting its resource.
  const assigned = (await call("staff", "/resources")).find(row => row.code === "assigned");
  // New resources receive UUIDs; legacy text IDs are covered by the queue API tests.
  const resource = await call("staff", "/resources", { laboratoryId: assigned.laboratoryId, code: `MAINT-TEST-${Date.now()}`, name: "Maintenance regression equipment", category: "EQUIPMENT", subtype: "OTHER", location: "TEST" });
  const date = days => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const startAt = `${date(30)}T09:00:00+07:00`, endAt = `${date(30)}T11:00:00+07:00`;
  const job = await call("staff", "/maintenance", { resourceId: resource.id, title: "Feedback maintenance regression", kind: "maintenance", status: "scheduled", startAt, endAt, notes: "Isolated maintenance form verification" });
  const maintenance = await open("staff", "#/workspace/bao-tri");
  const form = maintenance.page.locator("form.lab-form").first();
  await maintenance.page.locator(".lab-ledger-row").filter({ hasText: job.title }).getByRole("button", { name: catalogs.vi["ui.reschedule_edit_job_125d619b"], exact: true }).click();
  check(await form.locator('[name="resourceId"]').inputValue() === resource.id, "maintenance edit preserves resource.id from the real API projection");
  await form.locator('[name="startAt"]').fill(`${date(31)}T09:00`);
  await form.locator('[name="endAt"]').fill(`${date(31)}T11:00`);
  await form.locator('[name="changeReason"]').fill("Verified maintenance rescheduling regression");
  await locale(maintenance.page, "en");
  check(await form.locator('[name="resourceId"]').inputValue() === resource.id && await form.locator('[name="startAt"]').inputValue() === `${date(31)}T09:00`, "maintenance resource and edited time survive VI/EN switching");
  await form.getByRole("button", { name: catalogs.en["ui.check_affected_bookings_f7d4f35b"], exact: true }).click();
  await form.getByRole("button", { name: catalogs.en["ui.save_maintenance_7bf4123f"], exact: true }).waitFor();
  await maintenance.page.waitForFunction(() => [...document.querySelectorAll('form.lab-form button')].some(button => button.textContent.includes("Save maintenance") && !button.disabled));
  await form.getByRole("button", { name: catalogs.en["ui.save_maintenance_7bf4123f"], exact: true }).click();
  await form.waitFor({ state: "hidden" });
  const saved = (await call("staff", "/maintenance")).find(row => row.id === job.id);
  check(saved.resource.id === resource.id && saved.startAt === new Date(`${date(31)}T09:00:00+07:00`).toISOString(), "maintenance reschedule persists the same resource and changed time without manual reselection");
  await maintenance.context.close();
  check(errors.length === 0, `no browser exceptions: ${errors.join("; ")}`);
  writeFileSync(`${output}/results.json`, JSON.stringify({ at: new Date().toISOString(), checks, errors, count: checks.length }, null, 2) + "\n");
  console.log(`${checks.length} PostgreSQL-backed queue browser checks passed`);
} catch (error) {
  writeFileSync(`${output}/failure.json`, JSON.stringify({ checks, errors, failure: error.message }, null, 2)); throw error;
} finally { await browser.close(); }
