import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { openNavigation, selectWorkspaceTab } from './test-utils/openWorkspace.mjs';

// Read-only verification against the specifically seeded local demo. No external accounts.
const base = process.env.UX_FRONTEND_URL || 'http://127.0.0.1:15181';
const api = process.env.UX_API_URL || 'http://127.0.0.1:15005/api';
for (const url of [base, api]) assert.ok(['127.0.0.1', 'localhost'].includes(new URL(url).hostname));
assert.ok(process.env.UX_DEMO_PASSWORD, 'UX_DEMO_PASSWORD is required');
const output = process.env.UI_SCREENSHOT_DIR || '../logs/workspace-navigation';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox'], headless: true });
const results = [], errors = [];
const verify = (ok, name) => { assert.ok(ok, name); results.push(name); };
try {
  for (const role of ['student', 'lecturer', 'staff', 'admin']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.locator('#login-email').fill(`${role}@lrm.local`);
    await page.locator('#login-password').fill(process.env.UX_DEMO_PASSWORD);
    await page.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click();
    await page.locator('.home-attention-grid').waitFor();
    verify(new URL(page.url()).hash === '#/workspace/tong-quan', `${role}: login enters overview`);
    verify(await page.locator('.public-hero').count() === 0, `${role}: signed-in overview uses application shell`);
    verify(await page.locator('#workspace-navigation-panel').count() === 0, `${role}: menu starts closed`);
    await page.screenshot({ path: `${output}/${role}-overview-desktop.png`, fullPage: true });
    await openNavigation(page);
    verify(await page.locator('.main-content-column-2026').getAttribute('inert') !== null, `${role}: background inert while menu is open`);
    verify(await page.getByRole('textbox', { name: 'Tìm chức năng', exact: true }).evaluate(node => node === document.activeElement), `${role}: focus enters menu search`);
    verify(await page.locator('[data-nav-id=users]').count() === (role === 'admin' ? 1 : 0), `${role}: user administration restricted`);
    verify(await page.locator('[data-nav-id=stock]').count() === (['staff','admin'].includes(role) ? 1 : 0), `${role}: stock navigation restricted`);
    verify(await page.locator('[data-nav-id=monitoring]').count() === (process.env.UX_TELEMETRY_ENABLED === 'true' && ['staff','admin'].includes(role) ? 1 : 0), `${role}: monitoring navigation respects feature flag and role`);
    const search = page.getByRole('textbox', { name: 'Tìm chức năng', exact: true });
    await search.fill('lich phong');
    verify(await page.locator('[data-nav-id=smart_calendar]').count() === 1 && await page.locator('[data-nav-id=resources]').count() === 0, `${role}: Vietnamese search supports missing accents`);
    await search.fill('');
    const group = page.getByRole('button', { name: 'Không gian làm việc', exact: true });
    await group.click();
    verify(await page.locator('[data-nav-id=resources]').count() === 0, `${role}: collapsed group hides its links`);
    await group.click();
    const first = page.locator('#workspace-navigation-panel button').first();
    await first.focus(); await page.keyboard.press('Shift+Tab');
    verify(await page.locator('#workspace-navigation-panel button').last().evaluate(node => node === document.activeElement), `${role}: keyboard focus wraps inside menu`);
    await page.keyboard.press('Tab');
    verify(await first.evaluate(node => node === document.activeElement), `${role}: forward focus stays inside menu`);
    await page.keyboard.press('Escape');
    await openNavigation(page);
    await page.screenshot({ path: `${output}/${role}-menu-desktop.png` });
    await page.keyboard.press('Escape');
    verify(await page.getByRole('button', { name: 'Menu', exact: true }).evaluate(node => node === document.activeElement), `${role}: Escape restores menu trigger focus`);
    await selectWorkspaceTab(page, 'resources');
    verify(await page.locator('#workspace-main').evaluate(node => node === document.activeElement), `${role}: navigation focuses destination`);
    await page.goBack(); await page.locator('.home-attention-grid').waitFor();
    verify(new URL(page.url()).hash === '#/workspace/tong-quan', `${role}: Back returns to signed-in overview`);
    await page.goForward(); await page.locator('.resource-management-view').waitFor();
    await page.reload(); await page.locator('.resource-management-view').waitFor();
    verify(new URL(page.url()).hash === '#/workspace/tai-nguyen', `${role}: refresh preserves route`);
    await selectWorkspaceTab(page, 'home'); await page.locator('.home-attention-grid').waitFor();
    await page.locator('.header-2026').getByRole('button', { name: 'EN', exact: true }).click();
    await page.getByRole('heading', { name: /Hello,/ }).waitFor();
    verify(await page.locator('html').getAttribute('lang') === 'en', `${role}: locale switches within overview`);
    await page.locator('.header-2026').getByRole('button', { name: 'VI', exact: true }).click();
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      verify(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${role}: ${width}px overview does not overflow`);
      await openNavigation(page);
      verify(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${role}: ${width}px menu does not overflow`);
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({ width: 375, height: 844 });
    await page.screenshot({ path: `${output}/${role}-overview-mobile.png`, fullPage: true });
    await openNavigation(page); await page.screenshot({ path: `${output}/${role}-menu-mobile.png` }); await page.keyboard.press('Escape');
    // A missing dependency must not display healthy/zero work counts.
    await page.route('**/api/bookings', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Intentional isolated UI failure' } }) }));
    await page.reload(); await page.locator('.home-error').waitFor();
    verify(await page.locator('.home-attention-card').count() === 0, `${role}: data failure does not masquerade as zero pending work`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  writeFileSync(`${output}/results.json`, JSON.stringify({ checks: results.length, results, errors, environment: 'Fresh PostgreSQL 16 local demo; authentication/reads plus one intercepted API failure per role. No provider/hardware verification.' }, null, 2));
  console.log(`PASS: ${results.length} navigation, role, keyboard, history, locale, failure and viewport checks; no browser exceptions.`);
} finally { await browser.close(); }
