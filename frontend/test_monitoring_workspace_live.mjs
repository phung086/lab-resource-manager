import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

// A short-lived, persisted staff session enters the actual UI. No HTTP mocks.
// Keep the bearer token in the captured child pipe and browser session only.
const session = JSON.parse(execFileSync('docker', [
  'exec', '-i', 'lrm-local-review-backend-1', 'node', '--input-type=module', '-'
], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], input: `
  import { validateLocalDemoEnvironment } from './scripts/localDemoGuard.mjs';
  import { prisma } from './src/db.js';
  import { signUserToken } from './src/services/authTokens.js';
  validateLocalDemoEnvironment(process.env);
  if (process.env.NODE_ENV === 'production') throw new Error('Local demo only');
  try {
    const resource = await prisma.resource.findUniqueOrThrow({ where: { code: 'DEMO26-PI5-04' } });
    const user = await prisma.user.findFirstOrThrow({ where: {
      role: 'LAB_STAFF', isActive: true, deletedAt: null, passwordResetRequired: false,
      labAssignments: { some: { laboratoryId: resource.laboratoryId } }
    }, select: { id: true, role: true, authVersion: true, fullName: true, isActive: true } });
    process.stdout.write(JSON.stringify({ user, token: await signUserToken(user), resourceId: resource.id }));
  } finally { await prisma.$disconnect(); }
` }));
const base = 'http://127.0.0.1:5173';
const api = 'http://127.0.0.1:8000/api';
const output = `${process.env.TEMP}/lab-monitoring-live-20261109`;
mkdirSync(output, { recursive: true });
const headers = { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' };
const results = [];
let runId, browser;

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [locale, width] of [['vi', 1440], ['en', 390]]) {
    const context = await browser.newContext({ viewport: { width, height: 960 } });
    await context.addInitScript(({ user, token, locale }) => {
      sessionStorage.setItem('lrm_token', token);
      sessionStorage.setItem('lrm_user', JSON.stringify(user));
      localStorage.setItem('lrm_locale', locale);
    }, { user: session.user, token: session.token, locale });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/workspace/monitoring`);
    await page.locator('.care-tabs button').nth(1).click();
    await page.locator('.monitor-snapshot-summary').waitFor();
    await page.locator('.monitor-lab > header button').click();
    await page.locator('.monitor-lab-setup select').first().selectOption(session.resourceId);
    if (locale === 'vi') {
      await page.locator('.monitor-lab-setup select').nth(1).selectOption('NORMAL');
      const started = page.waitForResponse(response => response.url().endsWith('/telemetry/simulations') && response.request().method()==='POST');
      await page.locator('.monitor-lab-setup .btn-primary').click();
      const response = await started;
      assert.equal(response.status(), 201);
      runId = (await response.json()).id;
      const run = page.locator('.monitor-run[data-active=true]').filter({ hasText: 'Bộ 04' });
      await run.waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('.monitor-run[data-active=true]')].some(card => card.textContent.includes('Bộ 04') && card.querySelector('progress').value >= 1));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${output}/staff-vi-1440.png`, animations: 'disabled' });
      const stopped = page.waitForResponse(response => response.url().endsWith(`/telemetry/simulations/${runId}/stop`));
      await run.getByRole('button').click();
      assert.equal((await stopped).status(), 200);
      await run.waitFor({ state: 'hidden' });
      runId = undefined;
    } else {
      await page.locator('.monitor-register select').first().selectOption('EXTERNAL');
      await page.locator('.monitor-register tbody tr').filter({ hasText: 'DEMO-HOST-PC' }).getByRole('button').click();
      await page.locator('.monitor-dossier').filter({ hasText: 'DEMO-HOST-PC' }).waitFor();
      assert.ok(await page.locator('.monitor-dossier .monitor-measured-badge').isVisible());
      await page.screenshot({ path: `${output}/staff-en-390.png`, animations: 'disabled' });
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1));
    assert.deepEqual(errors, []);
    assert.equal(await page.locator('.assistant-launcher').count(), 1);
    results.push({ locale, width, actualApi: true });
    await context.close();
  }
  console.log(JSON.stringify({ results, output, scope: 'Persisted staff session, real API, no password form' }));
} finally {
  if (runId) await fetch(`${api}/telemetry/simulations/${runId}/stop`, { method: 'POST', headers, body: '{}' });
  await fetch(`${api}/auth/logout`, { method: 'POST', headers, body: '{}' });
  await browser?.close();
}
