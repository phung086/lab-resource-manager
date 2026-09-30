import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { openNavigation, selectWorkspaceTab } from './test-utils/openWorkspace.mjs';
const base = process.env.UX_FRONTEND_URL || 'http://127.0.0.1:15181', api = process.env.UX_API_URL || 'http://127.0.0.1:15005/api';
for (const url of [base, api]) assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname));
assert.ok(process.env.UX_DEMO_PASSWORD, 'A specifically seeded local demo password is required');
const catalogs = Object.fromEntries(['vi','en'].map(locale => [locale, JSON.parse(readFileSync(`src/locales/catalog/${locale}.json`)).messages]));
const output = process.env.UI_SCREENSHOT_DIR || '../logs/workspace-navigation'; mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox'], headless: true });
const results = [], errors = [];
const check = (condition, label) => { assert.ok(condition, label); results.push(label); };
const original = new Set();
function collectOriginal(value) {
  if (typeof value === 'string' && /[À-ỹĐđ]/.test(value)) original.add(value);
  else if (Array.isArray(value)) value.forEach(collectOriginal);
  else if (value && typeof value === 'object') Object.values(value).forEach(collectOriginal);
}
const switchLocale = async (page, locale, location = '.header-2026') => {
  await page.locator(location).getByRole('button', { name: locale.toUpperCase(), exact: true }).click();
  await page.locator(`html[lang=${locale}]`).waitFor();
};
async function audit(page, locale, label) {
  const strings = await page.evaluate(() => {
    const values = [];
    for (const element of document.body.querySelectorAll('*')) {
      if (['SCRIPT', 'STYLE', 'OPTION'].includes(element.tagName) || !element.getClientRects().length || element.closest('[inert]')) continue;
      for (const node of element.childNodes) if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) values.push(node.textContent.trim());
      for (const attribute of ['placeholder', 'title', 'aria-label', 'alt']) if (element.getAttribute(attribute)) values.push(element.getAttribute(attribute));
    }
    return [...new Set(values)];
  });
  check(!strings.some(text => /\b(?:ui|core|api|enum|assistant|calendar|notification)\.[a-zA-Z_]+/.test(text)), `${label}: no exposed translation keys`);
  if (locale === 'en') {
    const untranslated = strings.filter(text => {
      let copy = text;
      for (const value of [...original].sort((a,b) => b.length-a.length)) copy = copy.replaceAll(value, '');
      return /[À-ỹĐđ]/.test(copy);
    });
    assert.deepEqual(untranslated, [], `${label}: untranslated UI copy`); results.push(`${label}: English UI and accessible labels use the selected language`);
  }
}
try {
  for (const role of ['student','lecturer','staff','admin']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } }), page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base); await page.locator('#login-email').fill(`${role}@lrm.local`); await page.locator('#login-password').fill(process.env.UX_DEMO_PASSWORD);
    await page.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click(); await page.locator('.home-attention-grid').waitFor();
    const token = await page.evaluate(() => localStorage.getItem('lrm_token'));
    const data = await fetch(`${api}/resources`, { headers: { Authorization: `Bearer ${token}` } }); collectOriginal(await data.json());
    const user = await fetch(`${api}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }); collectOriginal(await user.json());
    // Preserve original names, booking titles, course names and operational notes.
    for (const path of ['/bookings', '/maintenance', '/incidents', ...(['student','lecturer','admin'].includes(role) ? ['/lab-workspace/groups'] : []), ...(role === 'admin' ? ['/users'] : [])]) {
      const response = await fetch(`${api}${path}`, { headers: { Authorization: `Bearer ${token}` } });
      assert.ok(response.ok); collectOriginal(await response.json());
    }
    for (const locale of ['vi','en']) {
      await switchLocale(page, locale); await openNavigation(page); await audit(page, locale, `${role}/${locale}/menu`);
      const tabs = await page.locator('[data-nav-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-nav-id')));
      check(!tabs.includes('monitoring'), `${role}/${locale}: hardware UI deferred`);
      await page.keyboard.press('Escape');
      for (const tab of tabs) {
        await selectWorkspaceTab(page, tab);
        await page.waitForLoadState('networkidle');
        await audit(page, locale, `${role}/${locale}/${tab}`);
        check(await page.locator('.header-title-group').count() === 0 || await page.locator('.header-2026 h1').count() > 0, `${role}/${locale}/${tab}: shell remains mounted`);
        if (tab === 'resources') {
          await page.locator('.resource-card').first().getByRole('button').last().click(); await page.getByRole('dialog').waitFor();
          await audit(page, locale, `${role}/${locale}/resource-details`); await page.keyboard.press('Escape');
        }
        if (tab === 'smart_calendar') {
          for (const mode of ['week','month','day']) {
            const label = catalogs[locale][{ week:'ui.week_a10b97df', month:'ui.month_10276db1', day:'ui.day_c4c3ca76' }[mode]];
            await page.locator('.calendar-view-switcher').getByRole('button', { name: label, exact:true }).click(); await page.waitForLoadState('networkidle');
            await audit(page, locale, `${role}/${locale}/calendar-${mode}`);
          }
        }
      }
    }
    await selectWorkspaceTab(page, 'profile');
    const field = page.locator('input:not([readonly]):not([disabled])').first();
    if (await field.count()) { const previous = await field.inputValue(); await field.fill('Bilingual form continuity'); await switchLocale(page, 'vi'); check(await field.inputValue() === 'Bilingual form continuity', `${role}: profile draft survives language switch`); await field.fill(previous); }
    await selectWorkspaceTab(page, 'home'); await switchLocale(page, 'en');
    await page.screenshot({ path: `${output}/${role}-overview-en.png`, fullPage:true });
    await page.locator('.header-2026').getByRole('button', { name: 'LAB assistant', exact:true }).click();
    await page.locator('#assistant-question').fill('Find equipment');
    await page.locator('.assistant-compose').getByRole('button').click(); await page.locator('.assistant-turn').waitFor();
    await audit(page, 'en', `${role}/assistant-en`);
    await switchLocale(page, 'vi', '.assistant-language');
    check(await page.locator('.assistant-turn').count() === 1, `${role}: assistant history survives the language switch`);
    await audit(page, 'vi', `${role}/assistant-history-vi`);
    await page.locator('#assistant-question').fill('Tìm thiết bị'); await page.locator('.assistant-compose').getByRole('button').click(); await page.locator('.assistant-turn').nth(1).waitFor();
    await audit(page, 'vi', `${role}/assistant-vi`); await page.keyboard.press('Escape');
    await context.close();
  }
  // Catalog faults are the only intercepted requests. Business data remains real PostgreSQL.
  const context = await browser.newContext(), page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  let attempts = 0, failure = 'network';
  await page.route('**/locales/catalog/en.json*', async route => {
    attempts += 1;
    if (failure === 'network') return route.fulfill({ status:503, body:'Isolated locale network failure' });
    if (failure === 'corrupt') { const response = await route.fetch(); const text = await response.text(); return route.fulfill({ response, body:text.replace('LAB assistant','BAD assistant') }); }
    return route.continue();
  });
  await page.goto(base); await page.getByRole('button', { name: /Xem chi tiết:/ }).first().click();
  await page.locator('.catalog-guest-booking > summary').click(); await page.locator('#guest-booking-purpose').fill('Nội dung gốc giữ nguyên');
  await page.locator('.public-language').getByRole('button', { name:'EN',exact:true }).click(); await page.locator('.locale-feedback[role=alert]').waitFor();
  check(await page.locator('html').getAttribute('lang') === 'vi', 'Failed load retains the previous locale');
  check(await page.locator('#guest-booking-purpose').inputValue() === 'Nội dung gốc giữ nguyên', 'Failed locale load preserves the guest draft');
  failure = 'corrupt'; await page.locator('.locale-feedback').getByRole('button').click(); await page.locator('.locale-feedback[role=alert]').waitFor();
  check(await page.locator('html').getAttribute('lang') === 'vi', 'Corrupted catalog does not activate');
  failure = ''; await page.locator('.locale-feedback').getByRole('button').click(); await page.locator('html[lang=en]').waitFor();
  check(attempts === 3, 'Each retry makes a fresh request, including after integrity rejection');
  check(await page.locator('#guest-booking-purpose').inputValue() === 'Nội dung gốc giữ nguyên', 'Successful retry preserves the original draft');
  failure = 'network'; await page.reload(); await page.locator('.locale-startup[role=alert]').waitFor();
  check((await page.locator('.locale-startup').innerText()).includes('Unable to load'), 'Saved EN startup failure uses English bootstrap feedback');
  check(await page.locator('#login-email').count() === 0, 'Startup failure does not mount an untranslated application');
  failure = ''; await page.locator('.locale-startup').getByRole('button').click(); await page.locator('#login-email').waitFor();
  check(await page.locator('html').getAttribute('lang') === 'en', 'Saved EN startup recovers without requiring a Vietnamese catalog');
  await context.close(); assert.deepEqual(errors, []);
  writeFileSync(`${output}/bilingual-results.json`, JSON.stringify({ checks:results.length, results, errors, environment:'Real PostgreSQL 16 local demo, four roles, VI/EN. Catalog-only fault injection. No external model/SMTP/payment/hardware claim.' },null,2));
  console.log(`PASS: ${results.length} bilingual UI, accessibility, form continuity and recovery checks; no browser exceptions.`);
} finally { await browser.close(); }
