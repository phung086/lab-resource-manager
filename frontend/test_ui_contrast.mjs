// Read-only visual regression on the existing local stack. No seed or business writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.LRM_UI_URL || 'http://localhost:5173';
const api = process.env.LRM_API_URL || 'http://localhost:8000';
for (const url of [base, api]) assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'Local runtime only');
const output = process.env.LRM_UI_AUDIT_OUTPUT || path.join(os.tmpdir(), 'lab-ui-review', 'after');
await fs.mkdir(output, { recursive: true });
const findings = [], checks = [], errors = [];

// Solid backgrounds are alpha-composited through ancestors. Image/gradient text
// needs visual review; this is deliberately not a claim of full WCAG conformance.
function contrastScan(root = document.body) {
  const rgb = value => (value.match(/[\d.]+/g) || []).map(Number);
  const over = (fg, bg) => fg.slice(0, 3).map((v, i) => v * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)));
  const luminance = color => color.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const background = element => {
    const chain = [];
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== 'none') return null;
      chain.unshift(rgb(style.backgroundColor));
    }
    return chain.reduce((bg, fg) => over(fg, bg), [255, 255, 255]);
  };
  const result = [];
  for (const element of [root, ...root.querySelectorAll('*')]) {
    if (!element.checkVisibility() || element.closest('[disabled],[aria-hidden="true"],.sr-only,.visually-hidden')) continue;
    const style = getComputedStyle(element);
    if (+style.opacity === 0) continue;
    const text = [...element.childNodes].some(node => node.nodeType === 3 && node.textContent.trim());
    if (!text) continue;
    const bg = background(element);
    if (!bg) continue;
    const fg = over(rgb(style.color), bg), a = luminance(fg), b = luminance(bg);
    const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && +style.fontWeight >= 700);
    if (ratio < (large ? 3 : 4.5) - .02) result.push({ tag: element.tagName, class: element.className, ratio: +ratio.toFixed(2), foreground: style.color, background: bg.map(Math.round) });
  }
  return result;
}

const browser = await chromium.launch({ headless: true, channel: process.env.LRM_BROWSER_CHANNEL || 'chrome' });
try {
  for (const role of (process.env.LRM_AUDIT_ROLE ? [process.env.LRM_AUDIT_ROLE] : ['CUSTOMER', 'LAB_STAFF', 'ADMIN'])) {
    const email = `${{ CUSTOMER: 'student', LAB_STAFF: 'staff', ADMIN: 'admin' }[role]}@lrm.local`;
    const response = await fetch(`${api}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: process.env.LRM_DEMO_PASSWORD || 'LabDemo!2026Pass' }) });
    assert.equal(response.status, 200, `Login ${role}`);
    const session = await response.json();
    assert.equal(session.user.role, role);
    for (const [locale, width] of (process.env.LRM_AUDIT_MOBILE ? [['vi', 375]] : [['vi', 1440], ['en', 1366], ['vi', 375]])) {
      const context = await browser.newContext({ viewport: { width, height: width === 375 ? 812 : 900 }, reducedMotion: 'reduce' });
      await context.addInitScript(({ session, locale }) => {
        sessionStorage.setItem('lrm_token', session.accessToken);
        sessionStorage.setItem('lrm_user', JSON.stringify(session.user));
        localStorage.setItem('lrm_locale', locale);
      }, { session, locale });
      await context.route('**/api/**', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort('blockedbyclient'));
      const page = await context.newPage();
      page.on('pageerror', error => errors.push({ role, locale, width, error: error.message }));
      const routes = width === 375 ? ['overview', 'resources', 'bookings', 'profile', ...(role === 'CUSTOMER' ? [] : ['users'])] : [
        'overview', 'resources', 'calendar', 'bookings', 'incidents', 'notifications', 'profile', 'payments', 'support',
        ...(role === 'CUSTOMER' ? [] : ['operations', 'maintenance', 'materials', 'resource-management', 'users', 'monitoring'])
      ];
      for (const route of routes) {
        const location = { role, locale, width, route };
        if (route === 'overview') await page.goto(`${base}/workspace/${route}`);
        else await page.evaluate(url => { history.pushState({}, '', url); window.dispatchEvent(new PopStateEvent('popstate')); }, `/workspace/${route}`);
        await page.locator('.workspace-shell').waitFor();
        await page.waitForTimeout(600);
        await page.locator('.home-loading').waitFor({ state: 'hidden' });
        if (route === 'overview') {
          await page.locator('#workspace-title, .home-error').first().waitFor();
          if (await page.locator('.home-error').count()) throw new Error(`Live home data unavailable: ${role}/${locale}/${width}: ${await page.locator('.home-error').innerText()}`);
        }
        findings.push(...(await page.evaluate(contrastScan)).map(issue => ({ ...location, state: 'default', ...issue })));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
        if (overflow) findings.push({ ...location, state: 'overflow' });
        if (width !== 375 && locale === 'vi') {
          const controls = page.locator('#workspace-main button:not([disabled]), #workspace-main a');
          const seen = new Set();
          for (let index = 0; index < await controls.count(); index++) {
            const control = controls.nth(index), signature = `${await control.getAttribute('class')}|${await control.getAttribute('aria-pressed')}`;
            if (seen.has(signature) || !await control.isVisible()) continue;
            seen.add(signature);
            await control.hover({ timeout: 3000 });
            findings.push(...(await control.evaluate(contrastScan)).map(issue => ({ ...location, state: 'hover', ...issue })));
          }
        }
        if (route === 'overview') {
          assert.equal(await page.locator('[data-role-home]').getAttribute('data-role-home'), role);
          assert.equal(await page.locator('.workspace-shell').evaluate(el => getComputedStyle(el).getPropertyValue('--workspace-accent').trim()), '#6441d9', 'All roles share landing violet');
          await page.locator('.user-avatar-btn-2026').click();
          const accountMenu = page.locator('.user-dropdown-menu-2026');
          await accountMenu.waitFor();
          findings.push(...(await accountMenu.evaluate(contrastScan)).map(issue => ({ ...location, state: 'account-menu', ...issue })));
          const menuBounds = await accountMenu.boundingBox();
          assert.ok(menuBounds.x >= 0 && menuBounds.x + menuBounds.width <= width + 1, 'Account menu fits viewport');
          await page.screenshot({ path: path.join(output, `${role}-${locale}-${width}-account-menu.png`) });
          await page.locator('.user-avatar-btn-2026').click();
          assert.equal(await page.locator('#workspace-title').count(), 1);
          const expected = { CUSTOMER: ['home', 'resources', 'smart_calendar', 'bookings'], LAB_STAFF: ['home', 'bookings', 'smart_calendar', 'stock'], ADMIN: ['home', 'users', 'admin_management', 'dashboard'] }[role];
          assert.deepEqual(await page.locator('[data-quick-nav-id]').evaluateAll(nodes => nodes.map(node => node.dataset.quickNavId)), expected);
          const badges = await page.locator('.home-unread').evaluateAll(nodes => nodes.map(node => ({ width: node.clientWidth, height: node.clientHeight, scrollHeight: node.scrollHeight })));
          assert.ok(badges.every(b => b.width > 7 && b.height >= b.scrollHeight), 'Unread labels fit');
          if (role === 'CUSTOMER') {
            const finder = page.locator('.journey-finder-field input');
            await finder.focus();
            assert.equal(await finder.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
            assert.equal(await finder.evaluate(el => getComputedStyle(el).boxShadow), 'none');
            if (await page.locator('.journey-catalog-card').count()) {
              const states = await page.locator('.journey-catalog-state').evaluateAll(nodes => nodes.map(el => {
                const style = getComputedStyle(el), range = document.createRange();
                range.selectNodeContents(el);
                const text = range.getBoundingClientRect(), box = el.getBoundingClientRect();
                return { height: box.height, expected: parseFloat(style.lineHeight) + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom), offset: Math.abs((text.top + text.bottom - box.top - box.bottom) / 2) };
              }));
              assert.ok(states.every(s => s.height <= Math.max(24, s.expected) + 2 && s.offset <= 3), 'Catalog status labels retain intrinsic height and centered text in stretched cards');
              await page.locator('.journey-catalog-card').last().scrollIntoViewIfNeeded();
              await page.waitForFunction(() => [...document.querySelectorAll('.journey-catalog-cover img')].every(img => img.complete));
            }
          }
          await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
          await page.screenshot({ path: path.join(output, `${role}-${locale}-${width}.png`), fullPage: true });
          await page.screenshot({ path: path.join(output, `${role}-${locale}-${width}-viewport.png`) });
          await page.locator('.rail-menu').click();
          const input = page.locator('.workspace-nav-search input');
          await input.fill('zzzz-no-match');
          assert.equal(await page.locator('.workspace-nav-empty').count(), 1);
          const focus = await input.evaluate(el => ({ outline: getComputedStyle(el).outlineStyle, shadow: getComputedStyle(el).boxShadow, parentOutline: getComputedStyle(el.parentElement).outlineStyle }));
          assert.equal(focus.outline, 'none'); assert.equal(focus.shadow, 'none'); assert.equal(focus.parentOutline, 'solid');
          await input.fill('');
          await page.screenshot({ path: path.join(output, `${role}-${locale}-${width}-menu.png`) });
          await input.press('Escape');
          assert.equal(await page.locator('#workspace-navigation-panel').count(), 0);
          checks.push({ ...location, roleHome: true, roleNavigation: true, searchFocus: true, unreadLabels: true });
          if (role === 'LAB_STAFF' && await page.locator('.ops-lane-row').count()) {
            await page.locator('.ops-lane-row').first().click();
            await page.locator('.ops-item-detail-grid').waitFor();
            const bounds = await page.locator('.ops-item').boundingBox();
            assert.ok(bounds.width >= Math.min(280, width - 70), 'Staff record does not collapse into an implicit grid column');
            assert.equal(await page.locator('.ops-console').count(), 0);
            findings.push(...(await page.locator('.ops-item').evaluate(contrastScan)).map(issue => ({ ...location, state: 'staff-record', ...issue })));
            await page.locator('.ops-item-back').hover();
            await page.locator('.ops-item').scrollIntoViewIfNeeded();
            await page.screenshot({ path: path.join(output, `${role}-${locale}-${width}-record.png`) });
            await page.locator('.ops-item-back').click();
            await page.locator('.ops-console').waitFor();
            checks.push({ ...location, staffRecordAndReturn: true });
          }
        }
        if (route === 'users' && await page.locator('.users-account').count()) {
          await page.locator('.users-account').first().click();
          assert.equal(await page.locator('.users-dossier').count(), 1, 'One account detail surface');
          const input = page.locator('.users-filter-search input');
          await input.focus();
          assert.equal(await input.evaluate(el => getComputedStyle(el).boxShadow), 'none');
          findings.push(...(await page.locator('.users-dossier').evaluate(contrastScan)).map(issue => ({ ...location, state: 'account-detail', ...issue })));
          const contactActions = page.locator('.users-contact-actions button');
          if (await contactActions.count()) {
            assert.equal(await contactActions.count(), 2, 'Authorized account managers can edit contact and start OTP password support');
            await contactActions.first().click();
            await page.locator('.users-edit-form').waitFor();
            findings.push(...(await page.locator('.users-edit-form').evaluate(contrastScan)).map(issue => ({ ...location, state: 'account-edit', ...issue })));
            assert.equal(await page.locator('.users-edit-form input[name="email"]').count(), 0, 'Login email stays immutable');
            assert.ok(await page.locator('.users-edit-form input[name="fullName"]').isEditable());
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'Account form fits viewport');
          }
          checks.push({ ...location, accountDetailAndSearch: true });
        }
        if (route === 'resource-management') {
          await page.locator('details').evaluateAll(nodes => nodes.forEach(node => { node.open = true; }));
          await page.waitForTimeout(500);
          const fields = page.locator('#workspace-main input:not([type=radio]):not([type=checkbox]):not([type=hidden]), #workspace-main select, #workspace-main textarea');
          for (let i = 0; i < await fields.count(); i++) {
            const field = fields.nth(i);
            if (!await field.isVisible() || !await field.isEnabled()) continue;
            await field.focus();
            const edge = await field.evaluate(el => { const s = getComputedStyle(el); return { outline:parseFloat(s.outlineWidth), offset:parseFloat(s.outlineOffset), shadow:s.boxShadow }; });
            assert.ok(edge.outline <= 1 && edge.offset <= 0 && edge.shadow === 'none', `Single thin input focus: ${JSON.stringify(edge)}`);
          }
          findings.push(...(await page.evaluate(contrastScan)).map(issue => ({ ...location, state:'expanded-forms', ...issue })));
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'Expanded forms fit viewport');
          await page.screenshot({ path:path.join(output, `${role}-${locale}-${width}-forms.png`), fullPage:true });
          checks.push({ ...location, thinFocus:true, expandedForms:true });
        }
        console.log(`${role} ${locale} ${width} ${route}`);
        await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ checks, findings, errors }, null, 2));
      }
      await context.close();
    }
  }
} finally { await browser.close(); }
await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ checks, findings, errors }, null, 2));
console.log(JSON.stringify({ roleChecks: checks.length, contrastFindings: findings.length, pageErrors: errors.length, output }));
assert.equal(errors.length, 0, 'No browser runtime errors');
assert.equal(findings.length, 0, 'Review contrast/overflow findings in results.json');
