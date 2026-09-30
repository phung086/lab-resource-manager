import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { selectWorkspaceTab } from './test-utils/openWorkspace.mjs';

const base = process.env.UX_FRONTEND_URL || 'http://127.0.0.1:15181';
const api = process.env.UX_API_URL || 'http://127.0.0.1:15005/api';
for (const url of [base, api]) assert.ok(['127.0.0.1', 'localhost'].includes(new URL(url).hostname));
assert.ok(process.env.UX_DEMO_PASSWORD, 'Specifically seeded local demo credentials are required');
const output = process.env.UI_SCREENSHOT_DIR || '../logs/workspace-navigation';
mkdirSync(output, { recursive: true });
const catalogs = Object.fromEntries(['vi', 'en'].map(locale => [locale, JSON.parse(readFileSync(`src/locales/catalog/${locale}.json`)).messages]));
const results = [], errors = [], sessions = {};
const coreReadPaths = new Set(['/resources', '/bookings', '/maintenance', '/notifications', '/incidents', '/dashboard', '/users']);
const check = (condition, label) => { assert.ok(condition, label); results.push(label); };
async function request(role, path, body) {
  const response = await fetch(`${api}${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(sessions[role] ? { Authorization: `Bearer ${sessions[role].accessToken}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const value = await response.json();
  assert.ok(response.ok, `${role} ${path}: ${response.status} ${JSON.stringify(value)}`);
  return value;
}
for (const role of ['student', 'lecturer', 'staff', 'admin']) sessions[role] = await request(role, '/auth/login', { email: `${role}@lrm.local`, password: process.env.UX_DEMO_PASSWORD });
const resources = await request('admin', '/resources');
const find = code => { const row = resources.find(resource => resource.code === code); assert.ok(row, `Seed resource ${code}`); return row; };
// Real API writes into the isolated demo. No inserted statuses or substituted business responses.
const bookings = {};
async function book(name, code, role, day) {
  const date = new Date(Date.now() + day * 86400000).toISOString().slice(0, 10);
  const row = await request(role, '/bookings', { resourceId: find(code).id, title: `Role UI ${name}`, purpose: 'Verify task-focused laboratory workspace', purposeCode: 'TEACHING', startAt: `${date}T09:00:00+07:00`, endAt: `${date}T10:00:00+07:00` });
  bookings[name] = row;
  return row;
}
await book('pending', 'LOCAL-KIT-01', 'student', 3);
await book('confirmed', 'LOCAL-ROOM-02', 'student', 4);
await request('staff', `/bookings/${bookings.confirmed.id}/approve`, {});
await book('checkedOut', 'LOCAL-EQ-01', 'student', 5);
await request('staff', `/bookings/${bookings.checkedOut.id}/approve`, {});
await request('staff', `/bookings/${bookings.checkedOut.id}/check-out`, { conditionBefore: 'Recorded intact condition for role UI integration' });
await book('returned', 'LOCAL-KIT-02', 'student', 6);
await request('staff', `/bookings/${bookings.returned.id}/approve`, {});
await request('staff', `/bookings/${bookings.returned.id}/check-out`, { conditionBefore: 'Complete kit with all accessories' });
await request('staff', `/bookings/${bookings.returned.id}/return`, { conditionAfter: 'All kit accessories returned intact' });
await book('lecturer', 'LOCAL-ROOM-02', 'lecturer', 7);
await request('staff', `/bookings/${bookings.lecturer.id}/approve`, {});
const group = await request('admin', '/lab-workspace/groups', { code: `ROLE-${Date.now()}`, name: 'Role UI practical course', term: '2026–2027', lecturerEmail: 'lecturer@lrm.local' });
await request('lecturer', `/lab-workspace/groups/${group.id}/members`, { email: 'student@lrm.local' });
await request('student', `/lab-workspace/groups/${group.id}/activities`, { bookingId: bookings.pending.id, learningGoal: 'Measure the circuit response and document the experiment results.' });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox'], headless: true });
const switchLocale = async (page, locale) => { const scope = await page.getByRole('dialog').count() ? page.getByRole('dialog') : page.locator('.header-2026'); await scope.getByRole('button', { name: locale.toUpperCase(), exact: true }).click(); await page.locator(`html[lang=${locale}]`).waitFor(); };
const home = async page => { await selectWorkspaceTab(page, 'home'); await page.locator('.home-attention-grid').waitFor(); await page.waitForLoadState('networkidle'); };
try {
  for (const role of ['student', 'lecturer', 'staff', 'admin']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(`${role}: ${error.message}`));
    const mutations = [], coreReads = [];
    page.on('request', req => {
      if (req.url().startsWith(api) && req.method() === 'GET') {
        const resourcePath = new URL(req.url()).pathname.slice(new URL(api).pathname.length);
        if (coreReadPaths.has(resourcePath)) coreReads.push(resourcePath);
      }
    });
    page.on('request', req => { if (req.url().startsWith(api) && ['POST', 'PATCH', 'DELETE'].includes(req.method()) && !req.url().includes('/auth/')) mutations.push(req.url()); });
    await page.goto(base); await page.locator('#login-email').fill(`${role}@lrm.local`); await page.locator('#login-password').fill(process.env.UX_DEMO_PASSWORD);
    await page.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click(); await page.locator('.home-attention-grid').waitFor(); await page.waitForLoadState('networkidle');
    check(coreReads.length === new Set(coreReads).size, `${role}: initial shared data reads are not duplicated`);
    const loadedReadCount = coreReads.length;
    await selectWorkspaceTab(page, 'escalations');
    await page.locator('#notification-center-heading').waitFor();
    await page.waitForLoadState('networkidle');
    check(coreReads.length === loadedReadCount, `${role}: notifications reuse loaded data without another bulk read`);
    await home(page);
    const canonicalRole = sessions[role].user.role;
    check(await page.locator(`[data-role-home=${canonicalRole}]`).count() === 1, `${role}: distinct entry point`);
    check(await page.locator('.home-finder').count() === (role === 'student' ? 1 : 0), `${role}: finder belongs to student workspace`);
    check(await page.locator('.home-queue-panel').count() === (role === 'staff' ? 1 : 0), `${role}: operational queue belongs to LAB staff`);
    check(await page.locator('.home-role-grid').count() === (role === 'admin' ? 1 : 0), `${role}: access coordination belongs to admin`);
    check(await page.locator('.home-academic-banner').count() === (role === 'lecturer' ? 1 : 0), `${role}: teaching overview belongs to lecturer`);
    for (const locale of ['vi', 'en']) {
      await switchLocale(page, locale);
      const title = catalogs[locale][`ui.home.${role === 'staff' ? 'staff' : role}.title`];
      check(await page.getByRole('heading', { name: title, exact: true }).count() === 1, `${role}/${locale}: primary task heading translated`);
      check(!(await page.locator('.workspace-home').innerText()).match(/\b(?:ui|enum|core)\.[A-Za-z]/), `${role}/${locale}: no unresolved message keys`);
      for (const width of [375, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${role}/${locale}/${width}: no overflow`);
      }
      await page.setViewportSize({ width: 1440, height: 960 });
      await page.screenshot({ path: `${output}/${role}-role-home-${locale}-desktop.png`, fullPage: true });
      await page.setViewportSize({ width: 375, height: 844 });
      await page.screenshot({ path: `${output}/${role}-role-home-${locale}-mobile.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 960 }); await switchLocale(page, 'vi');
    if (role === 'student') {
      check(!(await page.locator('.workspace-home').innerText()).includes('Role UI lecturer'), 'Student home does not disclose a lecturer booking');
      await page.locator('#home-resource-query').fill('LOCAL-ROOM'); await page.locator('#home-resource-category').selectOption('ROOM');
      await switchLocale(page, 'en'); check(await page.locator('#home-resource-query').inputValue() === 'LOCAL-ROOM' && await page.locator('#home-resource-category').inputValue() === 'ROOM', 'Student finder draft survives locale switch');
      await page.locator('.home-finder-form button').click(); await page.locator('.resource-card').first().waitFor();
      check(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('category') === 'ROOM', 'Finder forwards real category filter');
      check(await page.getByLabel(catalogs.en['ui.resource_category_5fc170bb'], { exact: true }).inputValue() === 'ROOM', 'Catalogue receives category selection');
      await page.reload(); await page.locator('.resource-card').first().waitFor();
      check(await page.getByLabel(catalogs.en['ui.resource_category_5fc170bb'], { exact: true }).inputValue() === 'ROOM', 'Catalogue filter survives reload');
      await home(page); await switchLocale(page, 'vi');
      const previewId = await page.locator('.home-resource-card').first().getAttribute('data-resource-id');
      // Simulate the existing list cap using actual server rows; the exact resource
      // read still reaches PostgreSQL with the user's token.
      await page.route('**/api/resources', async route => {
        const response = await route.fetch(), rows = await response.json();
        await route.fulfill({ response, json: rows.filter(row => row.id !== previewId) });
      });
      await page.locator('.home-resource-card').first().getByRole('button').click(); await page.locator('.calendar-view-switcher').waitFor();
      const selectedResource = new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('resource');
      check(selectedResource === previewId, 'Resource preview opens calendar for its actual resource');
      await page.locator(`#calendar-resource-select option[value="${selectedResource}"]`).waitFor({ state: 'attached' });
      check(await page.locator('#calendar-resource-select').inputValue() === selectedResource, 'Calendar selects the resource from the shortcut');
      await page.reload(); await page.locator('.calendar-view-switcher').waitFor();
      await page.locator(`#calendar-resource-select option[value="${selectedResource}"]`).waitFor({ state: 'attached' });
      check(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('resource') === selectedResource && await page.locator('#calendar-resource-select').inputValue() === selectedResource, 'Calendar resource survives reload');
      await page.unroute('**/api/resources');
      await page.goto(`${base}/#/workspace/lich-dat?resource=00000000-0000-4000-8000-000000000000`);
      await page.locator('.alert.danger').first().waitFor();
      check(await page.locator('#calendar-resource-select').inputValue() === '', 'Missing resource is explicit and never selects another resource');
      await home(page);
      await page.goto(`${base}/#/workspace/booking?booking=${bookings.pending.id}&action=APPROVE`); await page.getByRole('alert').filter({ hasText: catalogs.vi['ui.home.route.actionUnavailable'] }).waitFor();
      check(await page.getByRole('dialog').count() === 0, 'Student approval deep link cannot open staff action');
      check(await page.locator('.operation-card').filter({ hasText: 'Role UI pending' }).count() === 1, 'Unavailable action preserves the authorised booking details');
      await home(page);
    }
    if (['student', 'lecturer', 'admin'].includes(role)) {
      await page.locator('.home-group-card').filter({ has: page.getByRole('heading', { name: group.name, exact: true }) }).click();
      await page.getByRole('heading', { name: group.name, exact: true }).waitFor();
      check(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('group') === group.id, `${role}: group card opens exact class`);
      await page.reload(); await page.getByRole('heading', { name: group.name, exact: true }).waitFor();
      check(await page.getByText('Measure the circuit response and document the experiment results.', { exact: true }).count() === 1, `${role}: real submitted activity displayed after reload`);
      await home(page); await switchLocale(page, 'vi');
      await page.route('**/api/lab-workspace/groups', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE' } }) }));
      await page.reload(); await page.locator('.home-section-error').waitFor();
      check(await page.locator('.home-finder,.home-academic-banner,.home-admin-banner').count() === 1, `${role}: class failure leaves core workspace usable`);
      await page.unroute('**/api/lab-workspace/groups'); await page.locator('.home-section-error button').click(); await page.locator('.home-group-card').first().waitFor();
      check(await page.locator('.home-section-error').count() === 0, `${role}: retry restores real course groups`);
    }
    if (role === 'staff') {
      const stages = [['PENDING_APPROVAL', 'pending', 'pending'], ['CONFIRMED', 'handover', 'confirmed'], ['CHECKED_OUT', 'return', 'checkedOut'], ['RETURNED', 'inspect', 'returned']];
      for (const [status, label, name] of stages) {
        await page.locator('.home-queue-tabs').getByRole('button', { name: new RegExp(catalogs.vi[`ui.home.staff.queue.${label}`]) }).click();
        const row = page.locator('.home-operation-row').filter({ hasText: `Role UI ${name}` });
        await row.getByRole('button').click(); await page.getByRole('dialog').waitFor();
        check(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('booking') === bookings[name].id, `Staff ${status}: exact booking opens action form`);
        const form = page.locator('#booking-operation-form textarea').first();
        await form.fill('Draft condition and notes for review'); await switchLocale(page, 'en');
        check(await form.inputValue() === 'Draft condition and notes for review', `Staff ${status}: action draft survives locale switch`);
        await page.getByRole('dialog').getByRole('button', { name: catalogs.en['ui.cancel_74fcd352'], exact: true }).click();
        check((await request('staff', '/bookings')).find(row => row.id === bookings[name].id).status === status, `Staff ${status}: opening and dismissing action does not mutate booking`);
        await home(page); await switchLocale(page, 'vi');
      }
      await page.locator('.home-queue-tabs').getByRole('button', { name: new RegExp(catalogs.vi['ui.home.staff.queue.inspect']) }).click(); await switchLocale(page, 'en');
      check(await page.locator('.home-queue-tabs button[aria-pressed=true]').innerText().then(text => text.includes(catalogs.en['ui.home.staff.queue.inspect'])), 'Staff selected work stage survives locale switch');
      await page.locator('.home-section-heading').getByRole('button', { name: catalogs.en['ui.home.staff.allBookings'], exact: true }).first().click(); await page.locator('.operations-view').waitFor();
      check(await page.locator('.operations-filter-row button[aria-pressed=true]').innerText().then(text => text.includes(catalogs.en['ui.all_49c73a31'])), 'Staff all-bookings shortcut applies ALL filter');
      await home(page);
    }
    if (role === 'admin') {
      await page.locator('.home-role-card').filter({ hasText: catalogs.vi['ui.lab_staff_38b791e1'] }).click(); await page.locator('.user-management-table').waitFor();
      check(await page.getByLabel(catalogs.vi['ui.home.directory.role'], { exact: true }).inputValue() === 'LAB_STAFF', 'Admin staff card opens filtered directory');
      const search = page.getByLabel(catalogs.vi['ui.home.directory.search'], { exact: true }); await search.fill('staff@lrm.local');
      check(await page.locator('.user-management-table tbody tr').count() === 1, 'Admin directory search narrows existing records');
      await switchLocale(page, 'en'); check(await page.getByLabel(catalogs.en['ui.home.directory.search'], { exact: true }).inputValue() === 'staff@lrm.local', 'Admin directory draft survives locale switch');
      await home(page); await switchLocale(page, 'vi');
      await page.locator('.home-quick-link').filter({ hasText: catalogs.vi['ui.home.admin.classification'] }).click(); await page.locator('.resource-management-view').waitFor();
      check(await page.getByLabel(catalogs.vi['ui.classification_a077263e'], { exact: true }).inputValue() === 'UNRESOLVED', 'Admin classification shortcut applies actual API filter');
      await home(page);
    }
    check(mutations.length === 0, `${role}: home shortcuts and dismissals perform no implicit business write`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  writeFileSync(`${output}/role-workspace-results.json`, JSON.stringify({ checks: results.length, results, errors, environment: 'Isolated PostgreSQL 16 local demo; real authenticated API writes seed bookings and teaching activity. Only group-error recovery and a capped catalogue list using actual server rows are intercepted. No external providers or hardware claim.' }, null, 2));
  console.log(`PASS: ${results.length} role entry, task routing, real records, locale, viewport and recovery checks.`);
} finally { await browser.close(); }
