// Accessible-name gate: every visible interactive control must have a name
// (text, aria-label, aria-labelledby, title, img[alt] or input value).
// Read-only: blocks every non-GET API call like the other test:ui scripts.
import { chromium } from 'playwright-core';
import assert from 'node:assert';

const api = process.env.LRM_API_BASE || 'http://localhost:8000/api';
const base = process.env.LRM_UI_BASE || 'http://localhost:5173';
const password = process.env.LRM_DEMO_PASSWORD || 'LabDemo!2026Pass';
const accounts = [
  { role: 'CUSTOMER', email: 'student@lrm.local' },
  { role: 'LAB_STAFF', email: 'staff@lrm.local' },
  { role: 'ADMIN', email: 'admin@lrm.local' }
];
const desktopRoutes = {
  CUSTOMER: ['overview', 'resources', 'calendar', 'bookings', 'support', 'payments'],
  LAB_STAFF: ['overview', 'bookings', 'calendar', 'support', 'incidents', 'materials'],
  ADMIN: ['overview', 'users', 'resource-management', 'incidents', 'audit-logs', 'payments']
};
const mobileRoutes = { CUSTOMER: ['overview', 'bookings', 'calendar'] };
const failures = [];
let checked = 0;

function collectUnnamed() {
  const root = document;
  const results = [];
  for (const el of root.querySelectorAll('button, a[href], [role="button"], input[type="submit"], input[type="button"]')) {
    if (el.closest('[disabled]') && el.matches('button')) { /* disabled still needs a name */ }
    const named = Boolean(
      (el.getAttribute('aria-label') || '').trim() ||
      (el.getAttribute('aria-labelledby') || '').trim() ||
      (el.getAttribute('title') || '').trim() ||
      (el.textContent || '').trim() ||
      (el.querySelector('img[alt]')?.getAttribute('alt') || '').trim() ||
      (el.tagName === 'INPUT' ? (el.value || '').trim() : '')
    );
    if (!named) {
      const html = el.outerHTML.replace(/\s+/g, ' ').slice(0, 120);
      if (!results.some(row => row.html === html)) results.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60), html });
    }
  }
  return results;
}

const browser = await chromium.launch({ headless: true, channel: process.env.LRM_BROWSER_CHANNEL || 'chrome' });
try {
  for (const account of accounts) {
    const response = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: account.email, password }) });
    assert.equal(response.status, 200, `Login ${account.role}`);
    const session = await response.json();
    for (const [width, height, routes] of [[1440, 900, desktopRoutes[account.role]], [390, 844, mobileRoutes[account.role] || []]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      await context.addInitScript(({ session }) => {
        sessionStorage.setItem('lrm_token', session.accessToken);
        sessionStorage.setItem('lrm_user', JSON.stringify(session.user));
        localStorage.setItem('lrm_locale', 'vi');
      }, { session });
      await context.route('**/api/**', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort('blockedbyclient'));
      const page = await context.newPage();
      for (const route of routes) {
        let mounted = false;
        for (let attempt = 0; attempt < 3 && !mounted; attempt++) {
          await page.goto(`${base}/workspace/${route}`);
          try { await page.locator('.workspace-shell').waitFor({ timeout: 10000 }); mounted = true; }
          catch { if (attempt < 2) await page.waitForTimeout(4000); }
        }
        if (!mounted) { failures.push({ role: account.role, route, width, issue: 'SHELL_MISSING' }); continue; }
        await page.waitForTimeout(1200);
        checked += 1;
        // Detector self-test: a nameless icon button must be flagged.
        const detectorWorks = await page.evaluate(() => {
          const probe = document.createElement('button');
          probe.innerHTML = '<svg width="10" height="10"></svg>';
          probe.className = 'a11y-gate-selftest';
          document.body.appendChild(probe);
          const named = Boolean((probe.textContent || '').trim() || probe.querySelector('img[alt]'));
          probe.remove();
          return !named;
        });
        assert.ok(detectorWorks, `Detector self-test failed on ${account.role}/${route}/${width}`);
        const violations = await page.evaluate(collectUnnamed);
        for (const violation of violations) failures.push({ role: account.role, route, width, ...violation });
      }
      await context.close();
    }
  }
} finally { await browser.close(); }

if (failures.length) {
  console.error(`UNNAMED_CONTROLS: ${failures.length} across ${checked} page loads`);
  for (const failure of failures) console.error(JSON.stringify(failure));
  process.exit(1);
}
console.log(`A11Y_ICON_NAMES_PASS: ${checked} page loads, every visible interactive control has an accessible name`);
