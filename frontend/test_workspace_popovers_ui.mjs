import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const screenshots = process.env.UI_SCREENSHOT_DIR;
if (screenshots) await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ channel: process.env.UI_BROWSER_CHANNEL || 'msedge' });
const actor = { id: 'qa-operator', fullName: 'QA Operator', email: 'qa@example.test', role: 'ADMIN', isActive: true };
const now = new Date().toISOString();
const end = new Date(Date.now() + 3600000).toISOString();
const labs = [
  { id: 'lab-a', code: 'LAB-A', name: 'Phòng Điện tử & Đo lường', isActive: true },
  { id: 'lab-b', code: 'LAB-B', name: 'Laboratory for Electronic Measurement and Instrument Calibration', isActive: true }
];
const notice = { id: 'qa-notice', title: 'Room booking confirmed', message: 'Check the confirmed booking before handover.', sentAt: now, createdAt: now, readAt: null };
const resource = { id: 'qa-resource', name: 'QA instrument', code: 'QA-01', category: 'EQUIPMENT', subtype: 'OTHER', laboratoryId: labs[0].id, laboratory: labs[0], operationalStatus: 'AVAILABLE', availability: { state: 'AVAILABLE' }, media: [] };
const empty = { total: 0, items: [] };
const fixtures = {
  '/api/auth/me': actor,
  '/api/users/me': actor,
  '/api/auth/session': { expiresAt: end, idleExpiresAt: end, idleTimeoutSeconds: 3600 },
  '/api/bookings': { items: [], summary: { total: 0, byStatus: {}, overdue: 0, history: 0, pendingPayment: 0 }, pagination: { total: 0 } },
  '/api/incidents': { items: [], summary: { total: 0, byStatus: {}, open: 0 }, pagination: { total: 0 } },
  '/api/dashboard': { summary: { totalResources: 0, criticalIncidentCount: 0 } },
  '/api/dashboard/trends': { scope: 'all', timezone: 'Asia/Ho_Chi_Minh', startAt: now, endAt: end, buckets: [] },
  '/api/dashboard/operations-brief': { generatedAt: now, horizonHours: 24, laboratories: labs, overdue: { ...empty, withNextBooking: 0 }, incidents: empty, maintenance: empty },
  '/api/laboratories': labs,
  '/api/resources': [resource],
  '/api/notifications': [notice],
  '/api/notifications/unread-count': { unread: 1 }
};
fixtures['/api/auth/activity'] = fixtures['/api/auth/session'];

function luminance(color) {
  const channels = color.match(/\d+(?:\.\d+)?/g).slice(0, 3).map(value => {
    const channel = Number(value) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}

const layouts = [[1440, 'vi', 'ADMIN'], [390, 'en', 'ADMIN'], [390, 'vi', 'CUSTOMER']];
const cases = ['light', 'dark'].flatMap(theme => layouts.map(layout => [...layout, theme]));
try {
  for (const [width, locale, role, theme] of cases) {
    const context = await browser.newContext({ viewport: { width, height: 940 }, colorScheme: theme, reducedMotion: 'reduce', hasTouch: width === 390 });
    const errors = [], scopes = [];
    try {
      await context.addInitScript(({ actor, locale }) => {
        sessionStorage.setItem('lrm_token', 'picker-ui-isolated-fixture');
        sessionStorage.setItem('lrm_user', JSON.stringify(actor));
        localStorage.setItem('lrm_locale', locale);
        localStorage.setItem(`lrm:resource-selection:v1:${actor.id}`, JSON.stringify([{ id: 'qa-resource', name: 'QA instrument', code: 'QA-01', category: 'EQUIPMENT' }]));
      }, { actor: { ...actor, role }, locale });
      await context.route('**/api/**', async route => {
        const request = route.request();
        const { pathname, searchParams } = new URL(request.url());
        assert.ok(request.method() === 'GET' || pathname === '/api/auth/activity');
        if (pathname === (role === 'ADMIN' ? '/api/dashboard/operations-brief' : '/api/resources')) scopes.push(searchParams.get('laboratoryId'));
        const payload = fixtures[pathname];
        await route.fulfill({ json: payload === actor ? { ...actor, role } : payload ?? [] });
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      const pickerSelector = role === 'ADMIN' ? '.ops-brief select' : '.planner-filters select';
      await page.goto(`${base}/workspace/${role === 'ADMIN' ? 'overview' : 'calendar'}`);
      if (role === 'CUSTOMER') await page.locator('.planner-filters-toggle').click();
      const picker = page.locator(pickerSelector).first();
      await picker.locator('option').last().waitFor({ state: 'attached' });
      await picker.focus();
      await page.keyboard.press('Space');
      await page.waitForFunction(selector => {
        const control = document.querySelector(selector);
        return control?.matches(':open') && document.activeElement?.tagName === 'OPTION' && control.contains(document.activeElement);
      }, pickerSelector);
      const openStyle = await picker.evaluate(node => {
        const options = [...node.options].map(option => option.getBoundingClientRect().toJSON());
        return { options, supported: getComputedStyle(node, '::picker(select)').appearance, viewport: innerWidth };
      });
      assert.equal(openStyle.supported, 'base-select');
      assert.ok(openStyle.options.every(option => option.left >= 0 && option.right <= openStyle.viewport && option.height >= 44),
        JSON.stringify(openStyle));
      assert.ok(openStyle.options[0].width >= 250);
      if (theme === 'dark') {
        const options = await picker.locator('option').evaluateAll(nodes => nodes.map(option => {
          const { color, backgroundColor } = getComputedStyle(option);
          return [color, backgroundColor];
        }));
        for (const [foreground, background] of options) {
          const light = luminance(foreground), dark = luminance(background);
          assert.ok((Math.max(light, dark) + .05) / (Math.min(light, dark) + .05) >= 4.5, `${foreground} on ${background}`);
        }
      }
      if (screenshots) await page.screenshot({ path: join(screenshots, `picker-${role}-${width}-${theme}.png`) });
      const scoped = page.waitForResponse(response => new URL(response.url()).searchParams.get('laboratoryId') === 'lab-b', { timeout: 10000 });
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      try { await scoped; } catch (error) {
        console.error({ role, locale, width, value: await picker.inputValue(), scopes,
          active: await page.evaluate(() => document.activeElement?.tagName), errors });
        throw error;
      }
      assert.equal(await picker.inputValue(), 'lab-b');
      assert.equal(scopes.at(-1), 'lab-b');
      if (width === 390) await picker.tap();
      else await picker.click();
      await page.waitForFunction(selector => document.querySelector(selector)?.matches(':open'), pickerSelector);
      await page.keyboard.press('Escape');
      assert.equal(await picker.inputValue(), 'lab-b');
      assert.ok(await picker.evaluate(node => document.activeElement === node && !node.matches(':open')));

      const panels = [
        ['.user-avatar-btn-2026', '#header-account-panel'],
        ['.header-notification-btn-2026', '#header-notices-panel']
      ];
      if (role === 'CUSTOMER') panels.push(['.selection-toggle', '#header-resource-selection-panel']);
      for (const [triggerSelector, panelSelector] of panels) {
        const trigger = page.locator(triggerSelector), panel = page.locator(panelSelector);
        await trigger.click();
        await panel.waitFor();
        const rect = await panel.boundingBox();
        assert.ok(rect && rect.x >= 0 && rect.x + rect.width <= width + 1);
        assert.equal(await trigger.getAttribute('aria-controls'), panelSelector.slice(1));
        if (screenshots) await page.screenshot({ path: join(screenshots, `${panelSelector.slice(1)}-${role}-${width}-${theme}.png`) });
        await page.keyboard.press('Tab');
        assert.ok(await panel.evaluate(node => node.contains(document.activeElement)));
        await page.keyboard.press('Escape');
        assert.equal(await panel.count(), 0);
        assert.ok(await trigger.evaluate(node => document.activeElement === node));
      }
      if (role === 'ADMIN' && width === 1440) {
        await page.goto(`${base}/workspace/resource-management`);
        const editStatus = page.locator('.resource-row-actions button:has(svg.lucide-wrench)');
        await editStatus.click();
        const modal = page.getByRole('dialog'), status = modal.locator('#resource-target-status');
        await status.click();
        await page.waitForFunction(() => document.querySelector('#resource-target-status')?.matches(':open'));
        await page.keyboard.press('Escape');
        assert.ok(await modal.isVisible(), 'Escape dismisses the picker before the surrounding dialog');
        assert.ok(await status.evaluate(node => !node.matches(':open')));
        await page.keyboard.press('Escape');
        await modal.waitFor({ state: 'hidden' });
        assert.ok(await editStatus.evaluate(node => document.activeElement === node));
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.deepEqual(errors, []);
      console.log(`${role} ${locale} ${width}px ${theme}: picker, keyboard, scope, header panels and viewport verified`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
