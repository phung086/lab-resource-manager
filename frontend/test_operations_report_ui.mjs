import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { selectWorkspaceTab } from './test-utils/openWorkspace.mjs';
const base = process.env.UX_FRONTEND_URL || 'http://127.0.0.1:15181';
const api = process.env.UX_API_URL || 'http://127.0.0.1:15005/api';
for (const value of [base, api]) assert.ok(['localhost','127.0.0.1'].includes(new URL(value).hostname));
assert.ok(process.env.UX_DEMO_PASSWORD);
const output = '../artifacts/implementation-direction-20261005/browser';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, headless: true });
const checks = [], errors = [];
const check = (value, name) => { assert.ok(value, name); checks.push(name); };
try {
  for (const role of ['admin','staff','lecturer','student']) {
    const response = await fetch(`${api}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email:`${role}@lrm.local`,password:process.env.UX_DEMO_PASSWORD }) });
    assert.equal(response.status, 200); const session = await response.json();
    const authorized = ['admin','staff'].includes(role);
    const apiReport = await fetch(`${api}/dashboard/report?days=7`, { headers:{Authorization:`Bearer ${session.accessToken}`} });
    check(apiReport.status === (authorized ? 200 : 403), `${role}: real report authorization`);
    const context = await browser.newContext({ viewport:{width:1440,height:1000} });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({accessToken,user}) => {localStorage.setItem('lrm_token',accessToken);localStorage.setItem('lrm_user',JSON.stringify(user));localStorage.setItem('lrm_locale','vi');},session);
    await page.goto(base); await page.locator('.sidebar-2026').waitFor();
    if (!authorized) {
      await page.goto(`${base}/#/workspace/van-hanh`);
      await page.waitForTimeout(500);
      check(await page.locator('.operations-report').count() === 0, `${role}: operator report not rendered`);
      await context.close(); continue;
    }
    await selectWorkspaceTab(page, 'dashboard');
    const report = page.locator('.operations-report');
    await report.waitFor(); await page.waitForFunction(() => document.querySelector('.operations-report')?.getAttribute('aria-busy') === 'false');
    for (const locale of ['vi','en']) {
      await page.locator('.header-2026').getByRole('button',{name:locale.toUpperCase(),exact:true}).click(); await page.locator(`html[lang=${locale}]`).waitFor();
      for (const days of [7,30]) {
        await report.getByRole('button',{name:`${days} ${locale === 'vi' ? 'ngày' : 'days'}`,exact:true}).click();
        await page.waitForFunction(() => document.querySelector('.operations-report')?.getAttribute('aria-busy') === 'false');
        check(!/\b(?:ui|report|api)\.[a-zA-Z_]+/.test(await report.innerText()),`${role}/${locale}/${days}: no raw locale keys`);
        check(await report.locator('.operations-report-summary').first().locator('dd').count() === 4,`${role}/${locale}/${days}: four concise metrics`);
      }
      const disclosure = report.locator('.operations-report-disclosure');
      if (await disclosure.count()) {
        await disclosure.click(); check(await report.locator('#operations-report-details').isVisible(),`${role}/${locale}: calculation details open`);
        await disclosure.click(); check(!await report.locator('#operations-report-details').isVisible(),`${role}/${locale}: calculation details collapse`);
      }
      await page.evaluate(() => window.scrollTo(0,0));
      await page.screenshot({path:`${output}/${role}-${locale}.png`,fullPage:true});
      check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),`${role}/${locale}: desktop has no page overflow`);
    }
    if (role === 'admin') {
      const fixture = JSON.parse(readFileSync(`${output}/../report-fixture.json`, 'utf8'));
      // Only browser visual verification: recorded result from synthetic fixtures
      // in the isolated PostgreSQL test DB, never a production/runtime fallback.
      await page.route('**/dashboard/report?days=7', route => route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
      await report.getByRole('button',{name:'7 days',exact:true}).click();
      await report.locator('.operations-report-ranking li').first().waitFor();
      check(await report.locator('.operations-report-ranking li').count() === 1,'isolated DB fixture renders actual usage ranking');
      check((await report.locator('.operations-report-value').innerText()).includes('26'),'ranking formats persisted fixture minutes as hours');
      await report.locator('.operations-report-disclosure').click();
      check(await report.locator('.operations-report-ranking li').count() === 2,'expanded ranking includes zero-use resource');
      await page.evaluate(() => window.scrollTo(0,0));
      await page.screenshot({path:`${output}/isolated-fixture-ranking.png`,fullPage:true});
      await report.locator('.operations-report-disclosure').click();
      await page.unroute('**/dashboard/report?days=7');
      await report.getByRole('button',{name:'30 days',exact:true}).click();
      await report.locator('.operations-report-summary').first().waitFor();
      await page.route('**/dashboard/report?days=7', route => route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'DATABASE_UNAVAILABLE'}})}));
      await report.getByRole('button',{name:'7 days',exact:true}).click(); await report.getByRole('alert').waitFor();
      check(await report.locator('.operations-report-summary').count() === 0,'failed report hides prior metrics');
      await page.unroute('**/dashboard/report?days=7'); await report.getByRole('button',{name:'Try again',exact:true}).click();
      await report.locator('.operations-report-summary').first().waitFor(); check(true,'report retry restores real evidence');
      let lateRequest;
      await page.route('**/dashboard/report?days=30', route => { lateRequest = route; });
      await report.getByRole('button',{name:'30 days',exact:true}).click();
      await page.waitForFunction(() => document.querySelector('.operations-report')?.getAttribute('aria-busy') === 'true');
      check(await report.locator('.operations-report-summary').count() === 0,'period change hides previous metrics while loading');
      await report.getByRole('button',{name:'7 days',exact:true}).click(); await report.locator('.operations-report-summary').first().waitFor();
      if (lateRequest) await lateRequest.continue().catch(() => {});
      await page.unroute('**/dashboard/report?days=30');
      check(await report.getByRole('button',{name:'7 days',exact:true}).getAttribute('aria-pressed') === 'true','rapid period changes preserve latest selection');
    }
    await context.close();
  }
  check(errors.length === 0, `No runtime errors: ${errors.join('; ')}`);
  writeFileSync(`${output}/result.json`,JSON.stringify({checks,errors},null,2));
  console.log(`${checks.length} operations report browser assertions passed`);
} catch (error) { writeFileSync(`${output}/failure.txt`,error.stack); throw error; }
finally { await browser.close(); }
