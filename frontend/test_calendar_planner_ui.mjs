import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from '../backend/node_modules/bcryptjs/index.js';
import { chromium } from 'playwright-core';

const database = new URL(process.env.FULFILLMENT_TEST_DATABASE_URL || 'http://missing');
assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname));
assert.equal(database.pathname, '/lab_resources_booking_fulfillment_test');
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
Object.assign(process.env, { DATABASE_URL: database.href, NODE_ENV: 'test', LOG_FORMAT: 'dev', RATE_LIMIT_MAX: '10000',
  JWT_SECRET: 'calendar-browser-isolated-test-secret-20261018', PAYMENTS_ENABLED: 'false', CHATGPT_BRIDGE_ENABLED: 'false',
  MCP_ASSISTANT_ENABLED: 'false', SMTP_HOST: '', OPENAI_API_KEY: '', REMINDER_SCHEDULER_ENABLED: 'false' });
const [{ prisma }, { createApp }] = await Promise.all([import('../backend/src/db.js'), import('../backend/src/app.js')]);
assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, database.pathname.slice(1));
assert.ok((await prisma.user.findMany({ select: { email: true } })).every(row => row.email.endsWith('@fulfillment.test')));
const server = http.createServer(createApp());
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const api = `http://127.0.0.1:${server.address().port}`, id = () => crypto.randomUUID();
const output = process.env.CALENDAR_UI_OUTPUT || '../backend/logs/calendar-browser';
await fs.mkdir(output, { recursive: true });
const errors = [], checks = [], sessions = {}, actors = {};
const record = (value, label) => { assert.ok(value, label); checks.push(label); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, headless: true });
try {
  const campus = await prisma.campus.create({ data: { id: id(), code: id(), name: 'Calendar QA campus' } });
  const building = await prisma.building.create({ data: { id: id(), code: id(), name: 'Calendar QA building', campusId: campus.id } });
  const lab = await prisma.laboratory.create({ data: { id: id(), code: id(), name: 'Calendar QA LAB', buildingId: building.id } });
  const foreign = await prisma.laboratory.create({ data: { id: id(), code: id(), name: 'Foreign calendar LAB', buildingId: building.id } });
  await prisma.labPolicy.create({ data: { id: id(), laboratoryId: lab.id, workDayStartHour: 0, workDayEndHour: 24, allowWeekend: true } });
  const passwordHash = await bcrypt.hash('CalendarUI!2026Fixture', 4);
  for (const [name, role] of Object.entries({ admin: 'ADMIN', staff: 'LAB_STAFF', owner: 'CUSTOMER', peer: 'CUSTOMER' })) {
    actors[name] = await prisma.user.create({ data: { id: id(), email: `${id()}@fulfillment.test`, fullName: `Calendar ${name}`, role, passwordHash } });
    const login = await fetch(api + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: actors[name].email, password: 'CalendarUI!2026Fixture' }) });
    assert.equal(login.status, 200); sessions[name] = await login.json();
  }
  await prisma.userLabAssignment.create({ data: { userId: actors.staff.id, laboratoryId: lab.id } });
  const room = await prisma.resource.create({ data: { id: id(), code: id(), name: 'Phòng kiểm thử lịch dài và phút lẻ', category: 'ROOM', subtype: 'OTHER', location: 'QA LAB', laboratoryId: lab.id } });
  const machine = await prisma.resource.create({ data: { id: id(), code: id(), name: 'QA maintenance equipment', category: 'EQUIPMENT', subtype: 'OTHER', location: 'QA LAB', laboratoryId: lab.id } });
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + 86400000));
  const at = time => new Date(`${date}T${time}:00+07:00`);
  for (const [owner, title, start, end] of [['owner', 'Owner long session for calendar accessibility and layout verification', '09:10', '12:10'], ['peer', 'PRIVATE PEER BOOKING TITLE', '14:00', '15:00']]) {
    await prisma.booking.create({ data: { id: id(), resourceId: room.id, requestedById: actors[owner].id, title, purpose: 'Calendar fixture', status: 'CONFIRMED', startAt: at(start), endAt: at(end), contactSnapshot: { fullName: 'Calendar Customer', phone: '0900000001' } } });
  }
  await prisma.maintenanceWindow.create({ data: { id: id(), resourceId: machine.id, title: 'Calendar QA maintenance', startAt: at('08:00'), endAt: at('18:00') } });
  for (const actor of ['owner', 'staff', 'admin']) for (const [locale, width] of [['vi', 1440], ['en', 375]]) {
    const context = await browser.newContext({ viewport: { width, height: width === 375 ? 812 : 900 }, reducedMotion: 'reduce' });
    try {
      await context.addInitScript(({ session, locale }) => { sessionStorage.setItem('lrm_token', session.accessToken); sessionStorage.setItem('lrm_user', JSON.stringify(session.user)); localStorage.setItem('lrm_locale', locale); }, { session: sessions[actor], locale });
      let writes = 0;
      await context.route('**/api/**', async route => {
        const request = route.request(), url = new URL(request.url());
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && url.pathname !== '/api/booking-pricing/quote') { writes++; await route.abort(); return; }
        await route.fulfill({ response: await route.fetch({ url: api + url.pathname + url.search }) });
      });
      const page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + `/workspace/calendar?resource=${room.id}`);
      await page.locator('.planner-date-input input').fill(date);
      const marker = `${actor}/${locale}/${width}`;
      if (actor === 'owner') {
        await page.locator('.planner-free-windows button').first().waitFor();
        const before = await prisma.booking.count();
        await page.locator('.planner-booking-actions .btn-primary').click();
        await page.locator('#quick-booking-form').waitFor();
        await page.locator('#booking-resource-select').waitFor();
        record(await page.locator('#booking-resource-select').inputValue() === room.id, `${marker}: exact resource reaches normal form`);
        await page.keyboard.press('Escape'); await page.locator('#quick-booking-form').waitFor({ state: 'hidden' });
        record(await prisma.booking.count() === before, `${marker}: preview/close does not create booking`);
      } else {
        await page.locator(width === 375 ? '.planner-agenda .planner-session' : '.planner-board-desktop .planner-session').first().waitFor();
        record(await page.locator('.planner-filters select').first().inputValue() === lab.id, `${marker}: exact resource LAB selected`);
        if (width === 1440) record(await page.locator('.planner-board-desktop .planner-session-details').evaluateAll(nodes => nodes.every(node => {
          const bounds = node.getBoundingClientRect(), time = node.querySelector('.planner-session-time');
          return !time || (time.scrollWidth <= node.clientWidth && [...node.children].every(child => child.getBoundingClientRect().bottom <= bounds.bottom + 1));
        })), `${marker}: short timeline labels keep time and status readable`);
        if (actor === 'staff') record(!(await page.locator('.planner-filters select').first().innerText()).includes(foreign.name), `${marker}: foreign LAB absent from staff scope`);
        await page.screenshot({ path: path.join(output, `${actor}-${locale}-${width}-day.png`), fullPage: true });
      }
      await page.locator('.planner-views button').filter({ hasText: locale === 'vi' ? 'So sánh tuần' : 'Compare week' }).click();
      await page.locator('.planner-week-event').first().waitFor();
      record(await page.locator('.planner-week-event').count() === 2, `${marker}: week renders each session once`);
      record(!(await page.locator('.calendar-planner').innerText()).includes('PRIVATE PEER BOOKING TITLE') || actor !== 'owner', `${marker}: customer cannot see peer title`);
      await page.locator('.planner-week-event').first().click(); await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'hidden' });
      record(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `${marker}: no horizontal overflow`);
      await page.screenshot({ path: path.join(output, `${actor}-${locale}-${width}-week.png`), fullPage: true });
      record(writes === 0, `${marker}: no business write attempted`);
    } finally { await context.close(); }
  }
  record(errors.length === 0, 'No browser runtime errors');
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ checks, errors }, null, 2));
  console.log(`Calendar planner UI: ${checks.length} checks passed in 6 role/locale/viewport configurations.`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); }
