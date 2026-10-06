import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { selectWorkspaceTab } from './test-utils/openWorkspace.mjs';

const base = process.env.UX_FRONTEND_URL || 'http://127.0.0.1:15181';
const api = process.env.UX_API_URL || 'http://127.0.0.1:15005/api';
for (const url of [base, api]) assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname));
assert.ok(process.env.UX_DEMO_PASSWORD, 'Explicit local demo password required');
const output = process.env.UI_SCREENSHOT_DIR || '../artifacts/assistant-widget-20261005/verification';
mkdirSync(output, { recursive: true });
const catalogs = Object.fromEntries(['vi', 'en'].map(locale => [locale, JSON.parse(readFileSync(`src/locales/catalog/${locale}.json`, 'utf8')).messages]));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, headless: true });
const checks = [], errors = [];
let currentPage;
const check = (value, label) => { assert.ok(value, label); checks.push(label); };
try {
  for (const role of (process.env.UX_TEST_ROLES || 'student,staff,lecturer,admin').split(',')) {
    assert.ok(['student', 'staff', 'lecturer', 'admin'].includes(role));
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage(); currentPage = page;
    page.on('pageerror', error => errors.push(error.message));
    let businessMutations = 0;
    page.on('request', request => { if (request.method() === 'POST' && /\/api\/(bookings|payments)(\/|$)/.test(request.url())) businessMutations++; });
    const auth = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `${role}@lrm.local`, password: process.env.UX_DEMO_PASSWORD }) });
    assert.equal(auth.status, 200);
    const session = await auth.json();
    await page.addInitScript(({ accessToken, user }) => { localStorage.setItem('lrm_token', accessToken); localStorage.setItem('lrm_user', JSON.stringify(user)); }, session);
    await page.goto(base); await page.locator('.assistant-launcher').waitFor();
    const launcher = page.locator('.assistant-launcher'), dock = page.locator('#lab-assistant-panel');
    const corner = await launcher.boundingBox();
    check(corner.x + corner.width > 1400 && corner.y + corner.height > 920, `${role}: launcher at bottom right`);
    await launcher.click(); await dock.waitFor(); await dock.locator('.assistant-suggestions button').first().waitFor();
    check(await dock.getAttribute('aria-modal') === 'false', `${role}: nonmodal chat`);
    check(await page.evaluate(() => document.body.style.overflow !== 'hidden'), `${role}: page scroll remains available`);
    check(await dock.locator('.assistant-suggestions button').count() === 3, `${role}: three concise suggestions`);
    check(!await dock.locator('.assistant-context').isVisible(), `${role}: context is collapsed`);
    check(await page.locator('#assistant-question').evaluate(node => node === document.activeElement), `${role}: question receives keyboard focus`);
    if (role === 'student') {
      await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
      await page.screenshot({ path: `${output}/desktop.png` });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${output}/user-1280.png` });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      const rect = await dock.boundingBox();
      check(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 390 && rect.y + rect.height < 844, 'small viewport: dock fits');
      check(await page.evaluate(() => document.documentElement.scrollWidth <= 390), 'small viewport: no horizontal overflow');
      await page.screenshot({ path: `${output}/mobile.png` });
      await page.setViewportSize({ width: 1440, height: 960 });
    }
    const ask = async text => {
      await page.locator('#assistant-question').fill(text);
      const pending = page.waitForResponse(response => response.url().endsWith('/assistant/chat') && response.request().method() === 'POST');
      await dock.locator('.assistant-compose button').click();
      const response = await pending;
      assert.equal(response.status(), 200, await response.text());
      const answer = await response.json();
      await page.waitForFunction(() => !document.querySelector('.assistant-busy'));
      return answer;
    };
    const slots = await ask('Giúp tôi đặt lịch trong 60 phút');
    check(slots.source === 'authenticated_mcp' && slots.toolsUsed.includes('find_available_slots'), `${role}: booking intent reads real MCP availability`);
    check(!/\b(?:api|assistant|enum)\.[a-zA-Z_]+/.test(await dock.innerText()), `${role}: no translation keys`);
    const slotRows = slots.toolResults.flatMap(item => item.result.slots || []);
    check(slotRows.every(slot => Date.parse(slot.startAt) < Date.parse(slot.endAt)), `${role}: valid slot intervals`);
    if (role === 'student') {
      check(slots.actions.some(action => action.type === 'PREFILL_BOOKING'), 'student: eligible booking suggestion available');
      await page.screenshot({ path: `${output}/availability.png` });
      const slot = slots.actions.find(action => action.type === 'PREFILL_BOOKING').payload;
      await dock.locator('.assistant-slot-result button').first().click();
      await page.locator('#quick-booking-form').waitFor();
      check(!await dock.isVisible(), 'opening booking form minimizes chat');
      check(await page.locator('#booking-resource-select').inputValue() === slot.resourceId, 'canonical form receives exact resource');
      const localParts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(slot.startAt));
      check(await page.locator('#quick-booking-form input[type=date]').inputValue() === localParts.split(' ')[0], 'canonical form receives Vietnam date');
      check(await page.locator('#quick-booking-form input[type=time]').first().inputValue() === localParts.split(' ')[1], 'canonical form receives Vietnam time');
      check(businessMutations === 0, 'prefill does not create a booking or payment');
      await page.screenshot({ path: `${output}/booking-review.png` });
      await page.getByRole('dialog').last().getByRole('button', { name: /Close|Đóng/, exact: false }).first().click();
      await launcher.click(); await dock.waitFor();
      check(await dock.locator('.assistant-turn').count() === 1, 'history survives opening the canonical form');
    }
    await page.locator('#assistant-question').fill('Câu hỏi chưa gửi');
    await dock.locator('.assistant-minimize').click();
    await page.waitForFunction(() => document.activeElement?.classList.contains('assistant-launcher'));
    check(await launcher.evaluate(node => node === document.activeElement), `${role}: minimize restores launcher focus`);
    await launcher.click(); await dock.waitFor();
    check(await page.locator('#assistant-question').inputValue() === 'Câu hỏi chưa gửi', `${role}: draft survives minimize`);
    check(await dock.locator('.assistant-turn').count() === 1, `${role}: history survives minimize`);
    await dock.locator('.assistant-language').getByRole('button', { name: 'EN', exact: true }).click();
    await page.locator('html[lang=en]').waitFor();
    check(await page.locator('#assistant-question').inputValue() === 'Câu hỏi chưa gửi', `${role}: draft survives locale change`);
    const ambiguous = await ask('Book tomorrow at 09:00');
    check(ambiguous.summary[0].key === 'assistant.chooseTimeWindow' && ambiguous.toolsUsed.length === 0, `${role}: ambiguous date asks for explicit time`);
    await dock.locator('.assistant-turn').last().getByRole('button', { name: catalogs.en['assistant.chooseContext'], exact: true }).click();
    check(await dock.locator('.assistant-context').isVisible(), `${role}: choose context action works`);
    await dock.locator('.assistant-context-disclosure summary').click();
    const payment = await ask('Payment guidance');
    check(payment.source === 'local_guidance' && payment.summary[0].key === 'assistant.payment.disabled', `${role}: disabled payment guidance is truthful`);
    check(!payment.actions.some(action => action.type === 'PREFILL_BOOKING'), `${role}: payment question has no booking mutation action`);
    if (role === 'student') {
      await page.screenshot({ path: `${output}/payment-guidance.png` });
      const coveredTarget = await page.evaluate(() => {
        const dockRect = document.querySelector('#lab-assistant-panel').getBoundingClientRect();
        const target = [...document.querySelectorAll('main button,main a')].find(node => {
          const r = node.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.left >= dockRect.left && r.right <= dockRect.right && r.top >= dockRect.top && r.bottom <= dockRect.bottom;
        });
        if (!target) return false;
        target.focus(); return true;
      });
      check(coveredTarget, 'real background control found behind the widget');
      await dock.waitFor({ state: 'hidden' });
      check(true, 'widget minimizes when background keyboard focus would be obscured');
      await launcher.click(); await dock.waitFor();
      await page.locator('#assistant-question').focus(); await page.keyboard.press('Escape');
      check(!await dock.isVisible() && await launcher.evaluate(node => node === document.activeElement), 'Escape closes and restores focus');
      await launcher.click();
      await page.route('**/assistant/chat', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'MCP_UNAVAILABLE' } }) }));
      await page.locator('#assistant-question').fill('Find equipment'); await dock.locator('.assistant-compose button').click();
      await dock.getByRole('alert').waitFor();
      check(await page.locator('#assistant-question').inputValue() === 'Find equipment', 'failed chat preserves draft for retry');
      check(await dock.locator('.assistant-turn').count() === 3, 'failed chat adds no fabricated answer');
      await page.unroute('**/assistant/chat');
      // Fault injection is test-only. No success fixture replaces the real MCP answers above.
      let release;
      const stalled = new Promise(resolve => { release = resolve; });
      await page.route('**/assistant/chat', async route => { await stalled; await route.abort().catch(() => {}); });
      await dock.locator('.assistant-compose button').click();
      await dock.getByRole('button', { name: catalogs.en['assistant.cancel'], exact: true }).click(); release();
      await page.waitForFunction(() => !document.querySelector('.assistant-busy'));
      check(await page.locator('#assistant-question').inputValue() === 'Find equipment', 'cancellation preserves draft');
      check(await dock.locator('.assistant-turn').count() === 3, 'cancellation adds no answer');
      await page.unroute('**/assistant/chat');
    }
    await dock.locator('.assistant-turn').nth(2).getByRole('button', { name: catalogs.en['assistant.viewBookings'], exact: true }).click();
    await page.waitForURL(/workspace\/booking/);
    check(!await dock.isVisible(), `${role}: guidance navigates to existing bookings`);
    await selectWorkspaceTab(page, 'home'); await launcher.click();
    check(await dock.locator('.assistant-turn').count() === 3, `${role}: history survives workspace navigation`);
    check(businessMutations === 0, `${role}: assistant test performs no booking/payment POST`);
    check(errors.length === 0, `${role}: no browser exception`);
    await context.close();
    if (role !== 'admin') await new Promise(resolve => setTimeout(resolve, 15000));
  }
  writeFileSync(`${output}/result.json`, JSON.stringify({ pass: true, checks, errors, assertions: checks.length }, null, 2));
  console.log(JSON.stringify({ pass: true, assertions: checks.length, errors }));
} catch (error) {
  if (currentPage && !currentPage.isClosed()) await currentPage.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  writeFileSync(`${output}/result.json`, JSON.stringify({ pass: false, checks, errors, failure: error.stack }, null, 2));
  throw error;
} finally { await browser.close(); }
