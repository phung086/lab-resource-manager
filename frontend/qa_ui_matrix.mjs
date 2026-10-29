// QA harness (read-mostly) for LAB UI matrix: role x locale x viewport.
// Credentials come from env (QA_EMAIL / QA_PASSWORD) or .qa/demo_accounts.json.
// Evidence (screenshots + json) is written under .qa/evidence; stdout stays concise.
//
// Scope: READ-ONLY. No booking/payment/incident writes, no DB seed/reset.
// Only the login form and GET navigation are exercised.

import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'C:/Projects/lab-resource-manager';
const EVIDENCE = join(ROOT, '.qa', 'evidence');
mkdirSync(EVIDENCE, { recursive: true });

// Account emails for the local demo dataset; password is read at runtime from
// the seed script (single source of truth) and never persisted in this harness.
const accountsFile = join(ROOT, '.qa', 'demo_accounts.json');
const seedFile = join(ROOT, 'backend', 'scripts', 'seedLocalDemo.mjs');
const emails = existsSync(accountsFile)
  ? JSON.parse(readFileSync(accountsFile, 'utf8'))
  : { ADMIN: 'admin@lrm.local', LAB_STAFF: 'staff@lrm.local', CUSTOMER: 'lecturer@lrm.local' };
const seedText = readFileSync(seedFile, 'utf8');
const pwMatch = seedText.match(/bcrypt\.hash\("([^"]+)"/);
const accounts = Object.fromEntries(
  Object.entries(emails).map(([role, email]) => [role, { email, password: pwMatch ? pwMatch[1] : '' }])
);

const ROLES = ['ADMIN', 'LAB_STAFF', 'CUSTOMER'];
const LOCALES = ['vi', 'en'];
const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '390x844', width: 390, height: 844 }
];

const BASE = 'http://localhost:5173';

// --- rate governor (test-side only) ---
// Backend API ingress default: RATE_LIMIT_MAX=180 requests / 60s window
// (backend/src/config.js), auth limiter 100 / 15 min in dev. The matrix
// navigates many role routes back-to-back, which overruns that budget and
// yields HTTP 429 -- an environment artifact, not a product defect. We track
// real /api/ requests and wait before each navigation so the run stays under
// the limit. No app config or DB is touched.
const API_WINDOW_MS = 60_000;
const API_BUDGET = 120;      // stay below the 180/60s ingress limit
const API_RESERVE = 25;      // head-room for the requests a single page load fires
const apiHits = [];

function pruneHits() {
  const cutoff = Date.now() - API_WINDOW_MS;
  while (apiHits.length && apiHits[0] < cutoff) apiHits.shift();
}

async function waitForApiBudget(reserve = API_RESERVE) {
  for (;;) {
    pruneHits();
    if (apiHits.length + reserve <= API_BUDGET) return;
    const waitMs = apiHits[0] + API_WINDOW_MS - Date.now() + 250;
    await new Promise((r) => setTimeout(r, Math.max(250, waitMs)));
  }
}

// --- expectations derived from source (Sidebar.tsx allowed(), workspaceRoutes.js) ---
// Nav ids the role must see, and ids the role must never see.
// monitoring/payments are feature-flag dependent -> excluded from both sets.
const NAV_EXPECT = {
  ADMIN: {
    // 'logs' (audit-logs) is registered in workspaceRoutes.js and visible to
    // ADMIN and LAB_STAFF (Sidebar.allowed: staff-only), hidden for CUSTOMER.
    must: ['home', 'resources', 'smart_calendar', 'bookings', 'admin_management', 'users', 'dashboard', 'maintenance', 'incidents', 'escalations', 'support', 'logs', 'profile'],
    mustNot: ['teaching']
  },
  LAB_STAFF: {
    must: ['home', 'resources', 'smart_calendar', 'bookings', 'admin_management', 'users', 'dashboard', 'maintenance', 'incidents', 'escalations', 'support', 'logs', 'profile'],
    mustNot: ['teaching']
  },
  CUSTOMER: {
    must: ['home', 'resources', 'smart_calendar', 'bookings', 'incidents', 'escalations', 'support', 'profile'],
    mustNot: ['logs', 'users', 'dashboard', 'maintenance', 'stock', 'admin_management', 'teaching']
  }
};

// Quick-nav order (Sidebar.tsx quickIds) -> rendered order of quick buttons.
const QUICK_EXPECT = {
  ADMIN: ['home', 'users', 'admin_management', 'dashboard'],
  LAB_STAFF: ['home', 'bookings', 'smart_calendar', 'stock'],
  CUSTOMER: ['home', 'resources', 'smart_calendar', 'bookings']
};

// Desktop (>=1100px) the sidebar is pinned so the full nav panel renders
// (Sidebar.tsx: `{(docked || expanded) && ...}`). Mobile keeps the rail only.
const DESKTOP_PANEL_MIN_WIDTH = 1100;

// Read-only routes per role (WORKSPACE_ROUTES slugs), role-gated by the same rules.
const ROUTE_EXPECT = {
  ADMIN: ['overview', 'resources', 'calendar', 'bookings', 'operations', 'maintenance', 'incidents', 'notifications', 'users', 'profile', 'resource-management', 'support', 'audit-logs'],
  LAB_STAFF: ['overview', 'resources', 'calendar', 'bookings', 'operations', 'maintenance', 'incidents', 'notifications', 'users', 'profile', 'resource-management', 'support', 'audit-logs'],
  CUSTOMER: ['overview', 'resources', 'calendar', 'bookings', 'incidents', 'notifications', 'profile', 'support']
};

function navIds(page) {
  return page.locator('button[data-nav-id]').evaluateAll((els) => els.map((e) => e.getAttribute('data-nav-id')));
}

async function runCase(browser, role, locale, viewport) {
  const account = accounts?.[role];
  if (!account) return { role, locale, viewport: viewport.name, status: 'BLOCKED', reason: 'no account mapping' };
  const label = `${role}_${locale}_${viewport.name}`;
  const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, locale: locale === 'vi' ? 'vi-VN' : 'en-US' });
  await ctx.addInitScript((l) => { try { localStorage.setItem('lrm_locale', l); } catch {} }, locale);
  // Pin the desktop sidebar so the full nav panel (data-nav-id) is mounted.
  await ctx.addInitScript((pin) => { try { if (pin) localStorage.setItem('lrm.navigation.pinned', 'true'); } catch {} }, viewport.width >= DESKTOP_PANEL_MIN_WIDTH);
  const page = await ctx.newPage();
  const errors = [];
  const throttled = []; // HTTP 429 -> backend rate limit, not a product defect
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console:' + m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('pageerror:' + String(e.message).slice(0, 200)));
  page.on('response', (r) => { if (r.status() === 429) throttled.push(r.url().slice(0, 120)); });
  page.on('request', (r) => { if (r.url().includes('/api/')) apiHits.push(Date.now()); });

  const out = { role, locale, viewport: viewport.name, status: 'UNKNOWN', steps: {}, errors: [], routes: [] };
  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    out.steps.loginForm = 'ok';
    await page.screenshot({ path: join(EVIDENCE, `${label}_01_login.png`) });

    await page.fill('input[type="email"]', account.email);
    await page.fill('input[type="password"]', account.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
    out.steps.afterSubmitUrl = page.url();

    const loggedIn = !/login/i.test(page.url()) && await page.locator('input[type="password"]').count() === 0;
    out.steps.loggedIn = loggedIn;
    if (!loggedIn) {
      const errText = await page.locator('[role="alert"], .auth-field-error').allInnerTexts().catch(() => []);
      out.steps.formErrors = errText.slice(0, 4);
    }
    await page.screenshot({ path: join(EVIDENCE, `${label}_02_home.png`) });

    const headings = await page.locator('h1, h2').allInnerTexts().catch(() => []);
    out.steps.headings = headings.slice(0, 5).map((h) => h.trim().slice(0, 80));
    const navButtons = await page.locator('nav button, [role="navigation"] button, aside button, header button').allInnerTexts().catch(() => []);
    out.steps.navItems = [...new Set(navButtons.map((b) => b.trim()).filter(Boolean))].slice(0, 12);
    out.steps.htmlLang = await page.evaluate(() => document.documentElement.lang);
    out.steps.bodyChars = (await page.locator('body').innerText().catch(() => '')).length;
    out.steps.shellRole = await page.evaluate(() => document.querySelector('[data-workspace-role]')?.getAttribute('data-workspace-role') || null);

    // role gating on sidebar nav ids.
    // Below 1100px the sidebar is a rail; the nav panel (data-nav-id) is only
    // mounted when the drawer is expanded (Sidebar.tsx: docked || expanded).
    // Open the drawer first, otherwise the ids can never be read.
    if (viewport.width < DESKTOP_PANEL_MIN_WIDTH) {
      await page.locator('button.rail-menu').click({ timeout: 5000 });
      await page.locator('#workspace-navigation-panel').waitFor({ state: 'visible', timeout: 5000 });
      out.steps.mobileDrawerOpened = await page.locator('#workspace-navigation-panel').count() > 0;
    }
    const ids = await navIds(page);
    out.steps.navIds = ids;
    const exp = NAV_EXPECT[role];
    out.steps.navMissing = exp.must.filter((id) => !ids.includes(id));
    out.steps.navForbidden = exp.mustNot.filter((id) => ids.includes(id));

    // The modal drawer intentionally makes the main/header inert. Close it
    // before testing the header locale control, just as a user would.
    if (viewport.width < DESKTOP_PANEL_MIN_WIDTH) {
      await page.locator('#workspace-navigation-panel button.nav-close').click({ timeout: 5000 });
      await page.locator('#workspace-navigation-panel').waitFor({ state: 'hidden', timeout: 5000 });
      out.steps.mobileDrawerClosed = true;
    }

    // locale switch check via the visible toggle (segmented control)
    const toggleButtons = page.locator('.segmented-control-2026 button');
    if (await toggleButtons.count()) {
      const idx = locale === 'vi' ? 1 : 0;
      await toggleButtons.nth(idx).click({ timeout: 5000 });
      await page.waitForTimeout(1200);
      out.steps.toggleChangedHtmlLang = await page.evaluate(() => document.documentElement.lang);
      out.steps.toggleWorks = out.steps.toggleChangedHtmlLang !== out.steps.htmlLang;
      await toggleButtons.nth(locale === 'vi' ? 0 : 1).click({ timeout: 5000 });
      await page.waitForTimeout(800);
    } else {
      out.steps.toggleWorks = 'no-toggle';
    }

    // horizontal overflow check
    out.steps.overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    await page.screenshot({ path: join(EVIDENCE, `${label}_03_after_toggle.png`) });

    // route-level read-only sweep (both desktop sizes; mobile stays a smoke check)
    if (viewport.name === '1440x900' || viewport.name === '1920x1080') {
      for (const slug of ROUTE_EXPECT[role]) {
        await waitForApiBudget();
        const before = errors.length;
        const beforeThrottle = throttled.length;
        const rec = { slug, url: '', status: 'UNKNOWN' };
        try {
          await page.goto(`${BASE}/workspace/${slug}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(1500);
          rec.url = page.url();
          const mainText = await page.locator('#workspace-main').innerText().catch(() => '');
          const lang = await page.evaluate(() => document.documentElement.lang);
          rec.mainChars = mainText.trim().length;
          rec.lang = lang;
          rec.newErrors = errors.slice(before);
          rec.throttled = throttled.slice(beforeThrottle);
          rec.notFound = /not found|404|không tìm thấy/i.test(mainText.slice(0, 400));
          // A console error caused by HTTP 429 is a rate-limit artifact.
          const realErrors = rec.newErrors.filter((e) => !/429|too many requests/i.test(e));
          rec.status = rec.notFound || rec.mainChars < 40 || realErrors.length ? 'FAIL' : 'PASS';
          rec.reason = rec.notFound ? 'not-found page'
            : rec.mainChars < 40 ? 'empty main'
            : realErrors.length ? 'console error'
            : rec.throttled.length ? 'throttled(429)' : '';
        } catch (err) {
          rec.status = 'FAIL';
          rec.reason = String(err && err.message ? err.message : err).slice(0, 160);
        }
        out.routes.push(rec);
      }
      // return to overview for the final screenshot
      await page.goto(`${BASE}/workspace/overview`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(800);
    }

    // Collect final errors after the run
    out.errors = errors.slice(0, 10);

    // Determine status based on multiple assertions
    const routeFails = out.routes.filter((r) => r.status !== 'PASS');
    let failReason = '';
    if (!loggedIn) failReason = 'not logged in';
    else if (out.steps.afterSubmitUrl !== `${BASE}/workspace/overview`) failReason = 'wrong route';
    else if (out.steps.htmlLang !== (locale === 'vi' ? 'vi' : 'en')) failReason = 'wrong html.lang';
    else if (out.steps.toggleWorks !== true) failReason = 'toggle failed';
    else if (out.steps.overflowX > 0) failReason = 'horizontal overflow';
    else if (out.steps.shellRole !== role) failReason = 'shell role mismatch';
    else if (out.steps.navMissing.length) failReason = 'nav missing: ' + out.steps.navMissing.join(',');
    else if (out.steps.navForbidden.length) failReason = 'nav forbidden: ' + out.steps.navForbidden.join(',');
    else if (routeFails.length) failReason = 'route fails: ' + routeFails.map((r) => r.slug).join(',');
    else if (out.errors.length > 0) failReason = 'console/page error';

    out.status = failReason ? 'FAIL' : 'PASS';
    if (failReason) out.error = failReason;
  } catch (err) {
    out.status = 'FAIL';
    out.error = String(err && err.message ? err.message : err).slice(0, 300);
    out.errors = errors.slice(0, 10);
  }
  writeFileSync(join(EVIDENCE, `${label}.json`), JSON.stringify(out, null, 2));
  await ctx.close();
  return out;
}

async function main() {
  const only = process.env.QA_ONLY ? process.env.QA_ONLY.split(',') : null;
  const results = [];
  const browser = await chromium.launch({ headless: true });
  for (const role of ROLES) {
    for (const locale of LOCALES) {
      for (const viewport of VIEWPORTS) {
        const key = `${role}_${locale}_${viewport.name}`;
        if (only && !only.includes(key)) continue;
        const r = await runCase(browser, role, locale, viewport);
        results.push(r);
        console.log(`[${r.status}] ${key} url=${r.steps?.afterSubmitUrl ?? '-'} lang=${r.steps?.htmlLang ?? '-'} navMissing=${r.steps?.navMissing?.length ?? '-'} navForbidden=${r.steps?.navForbidden?.length ?? '-'} routes=${r.routes?.length ?? 0} routeFail=${r.routes?.filter((x) => x.status !== 'PASS').length ?? 0} errs=${r.errors?.length ?? 0} ${r.error ?? ''}`);
      }
    }
  }
  await browser.close();
  writeFileSync(join(EVIDENCE, 'summary.json'), JSON.stringify(results, null, 2));
  const counts = results.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  console.log('SUMMARY ' + JSON.stringify(counts) + ' evidence=' + EVIDENCE);
}

main().catch((e) => { console.error('HARNESS_ERROR', e); process.exit(1); });
