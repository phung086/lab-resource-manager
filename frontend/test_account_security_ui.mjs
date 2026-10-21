import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { startAccountSecurityUiServer } from '../backend/test/helpers/accountSecurityUiServer.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(process.env.ACCOUNT_SECURITY_UI_OUTPUT || path.join(directory, '../backend/logs/account-security-ui'));
mkdirSync(output, { recursive: true });
const base = 'http://127.0.0.1:5185', checks = [], errors = [], failures = [], sessions = {}, responses = [];
const catalogs = JSON.parse(readFileSync(path.join(directory, 'src/locales/catalog/vi.json'), 'utf8')).messages;
const label = key => { assert.ok(catalogs[key], 'Missing locale key ' + key); return catalogs[key]; };
const check = (condition, description) => { assert.ok(condition, description); checks.push(description); };
const observe = (condition, description) => { (condition ? checks : failures).push(description); };
let fixture, preview, browser, previousPolicy, completed = false;
async function call(role, method, endpoint, body) {
  const response = await fetch(fixture.api + endpoint, { method, headers: { 'Content-Type': 'application/json', ...(sessions[role] ? { Authorization: 'Bearer ' + sessions[role].accessToken } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}
async function open(role, route) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
  await context.addInitScript(session => {
    if (sessionStorage.getItem('account_security_ui_initialized')) return;
    sessionStorage.setItem('lrm_token', session.accessToken); sessionStorage.setItem('lrm_user', JSON.stringify(session.user)); localStorage.setItem('lrm_locale', 'vi');
    sessionStorage.setItem('account_security_ui_initialized', '1');
  }, sessions[role]);
  const page = await context.newPage(); page.on('pageerror', cause => errors.push(role + ': ' + cause.message));
  page.on('response', response => {
    if (response.url().startsWith(fixture.api) && response.request().method() !== 'GET') responses.push({ role, method: response.request().method(), path: new URL(response.url()).pathname, status: response.status() });
  });
  await page.goto(base + route); await page.waitForLoadState('networkidle');
  return { context, page };
}
async function mutation(page, method, endpoint, action, expected = 200) {
  const pending = page.waitForResponse(response => new URL(response.url()).pathname === '/api' + endpoint && response.request().method() === method);
  await action(); const response = await pending, data = await response.json();
  assert.equal(response.status(), expected, endpoint + ': ' + JSON.stringify(data));
  await page.waitForLoadState('networkidle'); return data;
}
async function inspect(page, name) {
  await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
  const state = await page.locator('body').innerText(); writeFileSync(path.join(output, name + '.txt'), state);
  return state;
}
try {
  fixture = await startAccountSecurityUiServer();
  const built = spawnSync(process.execPath, [path.join(directory, 'node_modules/vite/bin/vite.js'), 'build'], { cwd: directory, env: { ...process.env, VITE_API_BASE_URL: 'http://127.0.0.1:18043' }, encoding: 'utf8', windowsHide: true });
  assert.equal(built.status, 0, built.stderr || built.stdout);
  const dist = path.join(directory, 'dist'), types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webp': 'image/webp', '.ico': 'image/x-icon' };
  preview = await new Promise((resolve, reject) => {
    const candidate = http.createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, base).pathname);
      let file = path.resolve(dist, '.' + pathname);
      if (!file.startsWith(dist + path.sep)) file = path.join(dist, 'index.html');
      if (!existsSync(file) || pathname.endsWith('/')) file = path.join(dist, 'index.html');
      response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); response.end(readFileSync(file));
    }).listen(5185, '127.0.0.1', () => resolve(candidate)); candidate.once('error', reject);
  });
  for (const role of ['staff', 'customer', 'admin']) {
    const result = await call(role, 'POST', '/auth/login', { email: fixture.users[role].email, password: fixture.password });
    assert.equal(result.status, 200); sessions[role] = result.body;
  }
  const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  ].find(existsSync);
  browser = await chromium.launch({ headless: true, executablePath });
  const staff = await open('staff', '/workspace/users'), page = staff.page;
  await inspect(page, 'staff-initial');
  check(await page.locator('.loyalty-policy').count() === 0, 'Staff cannot configure loyalty policy');
  check((await call('staff', 'GET', '/users')).body.every(user => user.role === 'CUSTOMER'), 'Staff directory is authoritative CUSTOMER-only');
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Staff directory fits ' + width + 'px');
    await inspect(page, 'staff-directory-' + width);
  }
  await page.locator('.users-heading').getByRole('button', { name: label('ui.create_user_70f60575'), exact: true }).click();
  const createForm = page.locator('.users-create form');
  await createForm.locator('button[type=submit]').click();
  check(await createForm.locator('[name=fullName]').evaluate(node => node === document.activeElement), 'Invalid create focuses the first field');
  check(await createForm.locator('[role=alert]').count() === 1, 'Invalid create has a visible field summary');
  check(await createForm.locator('[name=role] option').evaluateAll(nodes => nodes.map(node => node.value).join(',')) === 'CUSTOMER', 'Staff can only create CUSTOMER');
  const managedEmail = 'ui-managed-' + fixture.runId + '@security.test';
  await createForm.locator('[name=fullName]').fill('UI Managed Customer');
  await createForm.locator('[name=email]').fill(managedEmail);
  await createForm.locator('[name=password]').fill(fixture.password);
  await createForm.locator('[name=phone]').fill('0901234567');
  const created = await mutation(page, 'POST', '/users', () => createForm.locator('button[type=submit]').click(), 201);
  check(created.role === 'CUSTOMER' && created.email === managedEmail, 'Staff creates a persisted customer through the UI');
  await page.locator('.users-dossier h2').filter({ hasText: 'UI Managed Customer' }).waitFor();
  check(await page.locator('.users-permissions select').count() === 0, 'Staff dossier has no role elevation control');
  await page.locator('.users-dossier').getByRole('button', { name: label('account.users.editContact'), exact: true }).click();
  const editForm = page.locator('.users-edit-form');
  check(await editForm.locator('[name=email]').count() === 0, 'Managed registered email is immutable in the form');
  await editForm.locator('[name=phone]').fill('wrong'); await editForm.locator('button[type=submit]').click();
  check(await editForm.locator('[name=phone]').evaluate(node => node === document.activeElement), 'Invalid contact focuses the phone field');
  await editForm.locator('[name=fullName]').fill('UI Customer Updated'); await editForm.locator('[name=phone]').fill('0912345678');
  await editForm.locator('[name=organization]').fill('UI verification');
  await mutation(page, 'PATCH', '/users/' + created.id, () => editForm.locator('button[type=submit]').click());
  const edited = (await call('staff', 'GET', '/users/' + created.id)).body;
  check(edited.fullName === 'UI Customer Updated' && edited.phone === '0912345678' && edited.organization === 'UI verification', 'Staff contact edits persist');
  await page.locator('.users-dossier').getByRole('button', { name: label('account.users.resetPassword'), exact: true }).click();
  const assisted = page.getByRole('dialog'), assistedForm = assisted.locator('form');
  await inspect(page, 'staff-password-dialog');
  check(await assistedForm.locator('[name=currentPassword]').count() === 0, 'Assisted reset uses email verification instead of knowing the customer password');
  const managedLogin = await call('managed', 'POST', '/auth/login', { email: managedEmail, password: fixture.password }); sessions.managed = managedLogin.body;
  const assistedPassword = 'AssistedUiChanged!2026';
  await assistedForm.locator('[name=newPassword]').fill(assistedPassword);
  await assistedForm.locator('[name=confirmPassword]').fill('mismatch'); await assistedForm.locator('[name=reason]').fill('Customer requested account assistance');
  await assistedForm.locator('button[type=submit]').click();
  check(await assistedForm.locator('[name=confirmPassword]').evaluate(node => node === document.activeElement), 'Password mismatch focuses confirmation');
  await assistedForm.locator('[name=confirmPassword]').fill(assistedPassword);
  await assisted.getByRole('button', { name: 'EN', exact: true }).click();
  check(await assistedForm.locator('[name=newPassword]').inputValue() === assistedPassword, 'Locale switch preserves password draft');
  await assisted.getByRole('button', { name: 'VI', exact: true }).click();
  const challenge = await mutation(page, 'POST', '/users/' + created.id + '/password-otp/request', () => assistedForm.locator('button[type=submit]').click());
  check(!Object.hasOwn(challenge, 'otp') && challenge.maskedEmail.includes('***'), 'OTP response contains only challenge metadata');
  const assistedCode = fixture.otp(managedEmail);
  await assistedForm.locator('[name=otp]').fill(assistedCode === '000000' ? '111111' : '000000');
  await mutation(page, 'POST', '/users/' + created.id + '/password-otp/confirm', () => assistedForm.locator('button[type=submit]').click(), 400);
  check((await assistedForm.innerText()).includes(label('api.OTP_INVALID')), 'Wrong OTP has a precise visible error');
  observe(await assistedForm.locator('[name=otp]').evaluate(node => node === document.activeElement), 'Wrong OTP returns focus to code input');
  await assistedForm.locator('[name=otp]').fill(assistedCode);
  await mutation(page, 'POST', '/users/' + created.id + '/password-otp/confirm', () => assistedForm.locator('button[type=submit]').click());
  await assistedForm.getByRole('status').waitFor();
  check((await call('managed', 'GET', '/auth/me')).status === 401, 'Assisted password change revokes existing customer sessions');
  check((await call('managed-new', 'POST', '/auth/login', { email: managedEmail, password: assistedPassword })).status === 200, 'Assisted new password authenticates against PostgreSQL');
  check((await call('managed-old', 'POST', '/auth/login', { email: managedEmail, password: fixture.password })).status === 401, 'Old assisted password no longer authenticates');
  await inspect(page, 'staff-password-success'); await page.keyboard.press('Escape'); await assisted.waitFor({ state: 'hidden' });

  const admin = await open('admin', '/workspace/users?user=' + created.id), adminPage = admin.page;
  await inspect(adminPage, 'admin-initial');
  const roleSelect = adminPage.locator('.users-permissions select');
  await roleSelect.selectOption('LAB_STAFF');
  await adminPage.getByRole('button', { name: label('ui.users.reviewRole'), exact: true }).click();
  await mutation(adminPage, 'PATCH', '/users/' + created.id + '/role', () => adminPage.getByRole('dialog').getByRole('button', { name: label('ui.users.confirm'), exact: true }).click());
  check((await call('admin', 'GET', '/users/' + created.id)).body.role === 'LAB_STAFF', 'Admin role change persists');
  check(!(await call('staff', 'GET', '/users')).body.some(user => user.id === created.id), 'Promoted staff account disappears from staff customer scope');
  await roleSelect.selectOption('CUSTOMER');
  await adminPage.getByRole('button', { name: label('ui.users.reviewRole'), exact: true }).click();
  await mutation(adminPage, 'PATCH', '/users/' + created.id + '/role', () => adminPage.getByRole('dialog').getByRole('button', { name: label('ui.users.confirm'), exact: true }).click());
  const policyDetails = adminPage.locator('.loyalty-policy'); await policyDetails.locator('summary').click();
  await policyDetails.locator('form').waitFor(); previousPolicy = (await call('admin', 'GET', '/loyalty/policy')).body;
  await policyDetails.locator('[name=plusThreshold]').fill('1000000'); await policyDetails.locator('[name=priorityThreshold]').fill('10');
  await policyDetails.locator('button[type=submit]').click();
  check(await policyDetails.locator('[name=priorityThreshold]').evaluate(node => node === document.activeElement), 'Loyalty threshold error focuses the affected field');
  await policyDetails.locator('[name=priorityThreshold]').fill('4000000');
  await policyDetails.locator('[name=plusPercent]').fill('4.25'); await policyDetails.locator('[name=priorityPercent]').fill('8.5');
  await policyDetails.getByRole('checkbox').check();
  const savedPolicy = await mutation(adminPage, 'PUT', '/loyalty/policy', () => policyDetails.locator('button[type=submit]').click());
  check(savedPolicy.enabled && savedPolicy.plusThreshold === 1000000 && savedPolicy.priorityThreshold === 4000000 && savedPolicy.plusDiscountBps === 425 && savedPolicy.priorityDiscountBps === 850, 'Admin loyalty settings save the exact spending thresholds and discount rates');
  check((await call('staff', 'PUT', '/loyalty/policy', { ...savedPolicy, expectedVersion: savedPolicy.version })).status === 403, 'Backend denies staff policy mutation');
  await inspect(adminPage, 'admin-policy-saved');

  const customer = await open('customer', '/workspace/profile?section=security'), customerPage = customer.page;
  await inspect(customerPage, 'customer-initial');
  const loyalty = (await call('customer', 'GET', '/loyalty/me')).body;
  check(loyalty.totalSpendVnd === 0 && loyalty.discountBps === 0 && loyalty.basis === 'SPEND', 'Customer loyalty is based on actual settled spending');
  check(await customerPage.locator('.account-loyalty progress').getAttribute('value') === String(loyalty.progress), 'Visible loyalty progress matches the API');
  for (const width of [390, 1440]) {
    await customerPage.setViewportSize({ width, height: 960 });
    check(await customerPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Customer security form fits ' + width + 'px');
    await inspect(customerPage, 'customer-security-' + width);
  }
  const selfForm = customerPage.locator('.account-security-form'), selfPassword = 'SelfUiChanged!2026';
  await selfForm.locator('[name=currentPassword]').fill(fixture.password); await selfForm.locator('[name=newPassword]').fill(selfPassword); await selfForm.locator('[name=confirmPassword]').fill(selfPassword);
  await mutation(customerPage, 'POST', '/auth/password-otp/request', () => selfForm.locator('button[type=submit]').click());
  const selfCode = fixture.otp(fixture.users.customer.email);
  await selfForm.locator('[name=otp]').fill(selfCode);
  await mutation(customerPage, 'POST', '/auth/change-password', () => selfForm.locator('button[type=submit]').click());
  await selfForm.getByRole('status').waitFor();
  const renewed = await customerPage.evaluate(() => ({ accessToken: sessionStorage.getItem('lrm_token'), user: JSON.parse(sessionStorage.getItem('lrm_user')) }));
  check(renewed.accessToken !== sessions.customer.accessToken && renewed.user.id === fixture.users.customer.id, 'Self OTP flow stores a renewed session');
  check((await call('customer', 'GET', '/auth/me')).status === 401, 'Old self session is revoked'); sessions.customer = renewed;
  check((await call('customer', 'GET', '/auth/me')).status === 200, 'Renewed self session remains authenticated');
  await customerPage.reload(); await customerPage.waitForLoadState('networkidle');
  check(await customerPage.locator('.account-workspace').count() === 1 && !customerPage.url().includes('/login'), 'Self password success remains authenticated after reload');
  await inspect(customerPage, 'customer-renewed-session');
  check((await call('customer', 'GET', '/users')).status === 403, 'Customer cannot access managed accounts');

  await page.locator('.users-dossier').getByRole('button', { name: label('account.users.delete'), exact: true }).click();
  const deletion = page.getByRole('dialog'); await deletion.getByRole('button', { name: label('ui.users.confirm'), exact: true }).click();
  check(await deletion.getByRole('alert').count() === 1, 'Removing access requires a visible reason');
  await deletion.locator('input').fill('Customer requested account removal');
  await mutation(page, 'DELETE', '/users/' + created.id, () => deletion.getByRole('button', { name: label('ui.users.confirm'), exact: true }).click());
  const removed = await fixture.prisma.user.findUniqueOrThrow({ where: { id: created.id } });
  check(!removed.isActive && removed.deletedAt !== null, 'Staff deletion removes access without erasing persisted history');
  check(await fixture.prisma.systemAuditEvent.count({ where: { targetId: created.id } }) >= 5, 'Account actions retain durable audit evidence');
  check(await page.locator('.users-dossier').getByRole('button').count() === 0, 'Removed account dossier has no reactivation or reset actions');
  await inspect(page, 'staff-removed-account');
  for (const item of [staff, admin, customer]) await item.context.close();
  check(fixture.deliveredCount() === 2, 'Exactly two OTP emails were delivered through real SMTP');
  check(errors.length === 0, 'All account, OTP and loyalty role screens render without JavaScript errors');
  assert.deepEqual(failures, [], 'Nonblocking UX observations must also pass');
  completed = true;
} finally {
  try {
    if (fixture && previousPolicy && sessions.admin) {
      const current = (await call('admin', 'GET', '/loyalty/policy')).body;
      const { enabled, plusThreshold, priorityThreshold, plusDiscountBps, priorityDiscountBps } = previousPolicy;
      const restore = await call('admin', 'PUT', '/loyalty/policy', { enabled, plusThreshold, priorityThreshold, plusDiscountBps, priorityDiscountBps, expectedVersion: current.version });
      assert.equal(restore.status, 200, 'Restore only this dedicated test database policy');
    }
  } finally {
    if (browser) await browser.close();
    if (preview) { preview.closeAllConnections(); await new Promise(resolve => preview.close(resolve)); }
    if (fixture) await fixture.close();
    writeFileSync(path.join(output, 'result.json'), JSON.stringify({ completed, checks, errors, failures, responses }, null, 2));
  }
}
console.log(JSON.stringify({ checks: checks.length, errors: errors.length, output }));
