/**
 * Audit logs UI check — read-only against the live local stack (UI 5173 / API 8000).
 *
 * No fixture interception and no route stubbing: every assertion below comes from
 * the real API responses observed in the browser network layer, so the
 * server-side RBAC check (403 for CUSTOMER) is genuine evidence, not a mock.
 * Nothing is written to the demo database.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const ROOT = process.env.AUDIT_QA_ROOT || "C:/Projects/lab-resource-manager";
const base = process.env.AUDIT_UI_URL || "http://127.0.0.1:5173";
const api = process.env.AUDIT_API_URL || "http://127.0.0.1:8000/api";
assert.equal(new URL(base).hostname, "127.0.0.1");
assert.equal(new URL(api).hostname, "127.0.0.1");
assert.equal(new URL(api).port, "8000", "Only the shared local API on 8000 is allowed");

const output = process.env.UI_SCREENSHOT_DIR || join(ROOT, ".qa", "evidence", "audit");
mkdirSync(output, { recursive: true });

const catalogs = Object.fromEntries(
  ["vi", "en"].map(locale => [locale, JSON.parse(readFileSync(`src/locales/catalog/${locale}.json`)).messages])
);
const checks = [];
const errors = [];
const check = (condition, label) => { assert.ok(condition, label); checks.push(label); };

// Demo credentials are resolved at runtime from the seed script; never printed or persisted.
const seedText = readFileSync(join(ROOT, "backend", "scripts", "seedLocalDemo.mjs"), "utf8");
const password = (seedText.match(/bcrypt\.hash\("([^"]+)"/) || [])[1];
assert.ok(password, "Demo password must be resolvable from backend/scripts/seedLocalDemo.mjs");
const ACCOUNTS = {
  ADMIN: "admin@lrm.local",
  LAB_STAFF: "staff@lrm.local",
  CUSTOMER: "lecturer@lrm.local"
};

const API_WINDOW_MS = 60_000;
const API_BUDGET = 120;
const API_RESERVE = 25;
const apiHits = [];
function pruneHits() {
  const cutoff = Date.now() - API_WINDOW_MS;
  while (apiHits.length && apiHits[0] < cutoff) apiHits.shift();
}
async function waitForApiBudget(reserve = API_RESERVE) {
  for (;;) {
    pruneHits();
    if (apiHits.length < API_BUDGET - reserve) { apiHits.push(Date.now()); return; }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true,
  args: ["--no-sandbox"]
});
const contexts = [];

function attachNetwork(page) {
  const state = { requests: [], responses: [] };
  page.on("request", request => {
    if (!request.url().includes("/api/audit-events")) return;
    state.requests.push(request.url());
  });
  page.on("response", response => {
    if (!response.url().includes("/api/audit-events")) return;
    state.responses.push({ url: response.url(), status: response.status() });
  });
  return state;
}

async function login(role) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: "reduce" });
  contexts.push(context);
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(`${role}: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") errors.push(`${role}: console ${message.text()}`);
  });
  const net = attachNetwork(page);
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').waitFor();
  await page.locator('input[type="email"]').fill(ACCOUNTS[role]);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(url => url.pathname.includes("/workspace"), { timeout: 20_000 });
  const token = await page.evaluate(() => sessionStorage.getItem("lrm_token"));
  assert.ok(token, `${role}: session token missing after UI login`);
  return { context, page, net, token };
}

/** Direct read-only API probe using the token the UI itself obtained. */
async function apiGet(token, query = "page=1&limit=20") {
  const response = await fetch(`${api}/audit-events?${query}`, { headers: { Authorization: `Bearer ${token}` } });
  let body = null;
  try { body = await response.json(); } catch { /* non-JSON body is asserted via status only */ }
  return { status: response.status, body };
}

async function gotoAudit(page) {
  await page.goto(`${base}/workspace/audit-logs`, { waitUntil: "domcontentloaded" });
}

async function switchLocale(page, value) {
  await page.locator(".header-2026").getByRole("button", { name: value.toUpperCase(), exact: true }).click();
  await page.locator(`html[lang=${value}]`).waitFor();
}

try {
  // ---------- ADMIN ----------
  const admin = await login("ADMIN");
  await gotoAudit(admin.page);
  await admin.page.locator(".audit-workspace").waitFor({ timeout: 20_000 });
  check(await admin.page.locator("#audit-logs-title").isVisible(), "ADMIN: audit workspace heading rendered");
  const adminRows = await admin.page.locator(".audit-event").count();
  check(adminRows > 0, `ADMIN: audit list is populated from the real API (${adminRows} rows)`);
  const adminStatus = admin.net.responses.map(r => r.status);
  check(adminStatus.includes(200), `ADMIN: server answered 200 on /api/audit-events (${adminStatus.join(",")})`);
  const firstRequest = new URL(admin.net.requests[0]);
  check(firstRequest.searchParams.get("page") === "1" && firstRequest.searchParams.get("limit") === "20",
    `ADMIN: first request carries page=1&limit=20 (${firstRequest.search})`);

  const adminTotal = (await apiGet(admin.token)).body.pagination.total;
  const rangeText = await admin.page.locator(".queue-pagination p").textContent();
  const adminUiTotal = Number((rangeText.match(/\d+/g) || []).at(-1));
  check(adminUiTotal === adminTotal, `ADMIN: pagination total matches the server total (${adminUiTotal} vs ${adminTotal})`);
  await admin.page.screenshot({ path: join(output, "admin-vi-audit.png"), fullPage: false });

  // expand / collapse detail
  const firstToggle = admin.page.locator(".audit-event-toggle").first();
  const firstDetail = admin.page.locator(".audit-event-detail").first();
  await firstToggle.click();
  await firstDetail.waitFor({ timeout: 10_000 });
  const detailHeadings = await firstDetail.locator("h4").allTextContents();
  check(detailHeadings.length >= 2, `ADMIN: expanded event shows before/after sections (${detailHeadings.join(" | ")})`);
  check(await firstDetail.locator("pre").first().isVisible(), "ADMIN: expanded event shows JSON state");
  check(await firstToggle.getAttribute("aria-expanded") === "true", "ADMIN: toggle reports aria-expanded=true");
  await firstToggle.click();
  await firstDetail.waitFor({ state: "detached", timeout: 10_000 });
  check(await admin.page.locator(".audit-event-detail").count() === 0, "ADMIN: collapse removes the detail panel");

  // ---------- filters ----------
  const actionOptions = await admin.page.locator('select').first().locator("option").allTextContents();
  const concreteAction = actionOptions.find(value => value && value !== catalogs.vi["ui.all_49c73a31"]);
  assert.ok(concreteAction, "ADMIN: audit action filter must offer concrete actions");
  await admin.page.locator(".audit-filters select").first().selectOption({ label: concreteAction });
  await admin.page.locator('.audit-filters button[type="submit"]').click();
  await admin.page.waitForLoadState("networkidle");
  const filterRequests = admin.net.requests.map(url => new URL(url));
  const filtered = filterRequests.find(url => url.searchParams.get("action"));
  check(Boolean(filtered), `ADMIN: applied action reaches the server (${filtered?.search ?? "none"})`);
  const filteredRows = await admin.page.locator(".audit-event").count();
  const filteredActions = await admin.page.locator(".audit-event-action").allTextContents();
  check(filteredRows > 0 && filteredActions.every(value => value === concreteAction),
    `ADMIN: filtered rows all carry the requested action (${concreteAction})`);

  // a nonsense target id must narrow server-side to an empty result
  await admin.page.locator('.audit-filters input[type="text"]').first().fill("no-such-target-id-zzz");
  await admin.page.locator('.audit-filters button[type="submit"]').click();
  await admin.page.waitForLoadState("networkidle");
  const emptyVisible = await admin.page.locator('.empty-state[role="status"]').count();
  check(emptyVisible > 0, "ADMIN: unmatched filter shows the empty state instead of stale rows");
  const narrowed = admin.net.requests.map(url => new URL(url)).filter(url => url.searchParams.get("targetId"));
  check(narrowed.length > 0, "ADMIN: targetId filter reaches the server");

  // date range filters are converted to Vietnam-time boundaries
  await admin.page.locator('.audit-filters input[type="text"]').first().fill("");
  await admin.page.locator('.audit-filters input[type="date"]').first().fill("2026-01-01");
  await admin.page.locator('.audit-filters input[type="date"]').nth(1).fill("2026-12-31");
  await admin.page.locator('.audit-filters button[type="submit"]').click();
  await admin.page.waitForLoadState("networkidle");
  const dated = admin.net.requests.map(url => new URL(url)).filter(url => url.searchParams.get("from"));
  const fromValue = dated.at(-1)?.searchParams.get("from");
  const toValue = dated.at(-1)?.searchParams.get("to");
  // 2026-01-01 00:00 and 2026-12-31 23:59:59 in Vietnam (UTC+7) expressed as UTC instants.
  check(fromValue === "2025-12-31T17:00:00.000Z" && toValue === "2026-12-31T16:59:59.000Z",
    `ADMIN: from/to use Vietnam day boundaries (${fromValue} -> ${toValue})`);
  await admin.page.locator('.audit-filters button[type="submit"]').click();
  await admin.page.locator(".audit-filters").getByRole("button").last().click(); // clear filters
  await admin.page.waitForLoadState("networkidle");

  // ---------- pagination ----------
  const totalPages = (await apiGet(admin.token)).body.pagination.totalPages;
  if (totalPages > 1) {
    const nextButton = admin.page.locator(".queue-pagination .secondary-button").nth(1);
    check(await nextButton.isEnabled(), "ADMIN: next page control is enabled when more pages exist");
    await nextButton.click();
    await admin.page.waitForLoadState("networkidle");
    const paged = admin.net.requests.map(url => new URL(url)).filter(url => url.searchParams.get("page") === "2");
    check(paged.length > 0, "ADMIN: next page requests page=2");
  } else {
    checks.push("ADMIN: pagination beyond first page not applicable (single page)");
  }

  // locale
  await switchLocale(admin.page, "en");
  const englishTitle = await admin.page.locator("#audit-logs-title").textContent();
  check(englishTitle.trim() === catalogs.en["ui.audit_logs_883aea8a"], `ADMIN: English heading renders (${englishTitle.trim()})`);
  await admin.page.screenshot({ path: join(output, "admin-en-audit.png"), fullPage: false });
  await switchLocale(admin.page, "vi");

  // ---------- LAB_STAFF ----------
  await waitForApiBudget();
  const staff = await login("LAB_STAFF");
  await gotoAudit(staff.page);
  await staff.page.locator(".audit-workspace").waitFor({ timeout: 20_000 });
  check(await staff.page.locator("#audit-logs-title").isVisible(), "LAB_STAFF: audit workspace is reachable");
  check(staff.net.responses.some(r => r.status === 200), "LAB_STAFF: server answers 200 on /api/audit-events");
  check(await staff.page.locator(".audit-event").count() > 0, "LAB_STAFF: audit list shows scoped events");
  await staff.page.screenshot({ path: join(output, "staff-vi-audit.png"), fullPage: false });

  // ---------- CUSTOMER ----------
  await waitForApiBudget();
  const customer = await login("CUSTOMER");
  const navIds = await customer.page.locator("button[data-nav-id]").evaluateAll(nodes => nodes.map(node => node.dataset.navId));
  check(!navIds.includes("logs"), `CUSTOMER: the audit nav entry is not offered (${navIds.join(",")})`);
  await gotoAudit(customer.page);
  await customer.page.waitForLoadState("networkidle");
  check(!(await customer.page.locator(".audit-workspace").count()), "CUSTOMER: direct URL does not render the audit workspace");
  check(!customer.page.url().includes("/workspace/audit-logs"), `CUSTOMER: forbidden route is redirected (${customer.page.url()})`);
  const customerProbe = await apiGet(customer.token);
  check(customerProbe.status === 403, `CUSTOMER: server rejects the audit query (${customerProbe.status})`);
  check(customerProbe.body?.error?.code === "FORBIDDEN", `CUSTOMER: server error code is FORBIDDEN (${customerProbe.body?.error?.code})`);
  await customer.page.screenshot({ path: join(output, "customer-denied.png"), fullPage: false });

  check(errors.length === 0, `No page/console errors during the audit run (${errors.join(" | ") || "none"})`);
  // A passing run replaces the stale failure record so the evidence folder never misleads.
  rmSync(join(output, "failure.json"), { force: true });
  writeFileSync(join(output, "results.json"), JSON.stringify({ at: new Date().toISOString(), checks, errors }, null, 2));
  console.log(`[STATUS] ${checks.length} audit checks passed`);
  for (const label of checks) console.log(`[OK] ${label}`);
} catch (error) {
  writeFileSync(join(output, "failure.json"), JSON.stringify({ at: new Date().toISOString(), checks, errors, failure: error.message }, null, 2));
  console.error(`[FAIL] ${error.message}`);
  if (errors.length) console.error(`[ERRORS] ${errors.join(" | ")}`);
  process.exitCode = 1;
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close();
}
