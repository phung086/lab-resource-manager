import assert from 'node:assert/strict';
import { randomUUID as id } from 'node:crypto';
import http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import bcrypt from 'bcryptjs';
const url = new URL(process.env.ASSISTANT_TEST_DATABASE_URL || '');
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
assert.equal(url.pathname, '/lab_resources_assistant_test', 'Refuse to mutate a non-assistant test database');
Object.assign(process.env, { DATABASE_URL: url.href, NODE_ENV: 'test', JWT_SECRET: 'assistant-test-secret-at-least-32-characters', MCP_ASSISTANT_ENABLED: 'true', ASSISTANT_MAX_CONCURRENT: '2', ASSISTANT_TIMEOUT_MS: '1000', ASSISTANT_TOOL_TIMEOUT_MS: '1500', RATE_LIMIT_MAX: '10000', REMINDER_SCHEDULER_ENABLED: 'false', OPENAI_API_KEY: '', OPENAI_MODEL: '', PAYMENTS_ENABLED: 'false' });
const [{ createApp }, { prisma }, { config }] = await Promise.all([import('../src/app.js'), import('../src/db.js'), import('../src/config.js')]);
const app = createApp(), users = {}, tokens = {}, marker = id();
let base, lab, foreignLab, equipment, foreignEquipment, privateBooking, stall = false, intercepted;
const server = http.createServer((req, res) => {
  if (req.url === '/mcp' && stall) {
    intercepted?.();
    const timer = setTimeout(() => { if (!res.destroyed) app(req, res); }, 2000);
    res.once('close', () => clearTimeout(timer));
  } else app(req, res);
});
const call = async (name, message = 'Find equipment', locale = 'en', extra = {}, signal) => {
  const response = await fetch(`${base}/api/assistant/chat`, { method: 'POST', signal, headers: { Authorization: `Bearer ${tokens[name]}`, 'Content-Type': 'application/json', 'Accept-Language': locale }, body: JSON.stringify({ message, locale, ...extra }) });
  return { status: response.status, headers: response.headers, body: await response.json() };
};
const faultObserved = () => new Promise(resolve => { intercepted = resolve; });
const eventuallyAvailable = async name => {
  // Cancellation closes an HTTP connection asynchronously. Verify bounded recovery, never hide a timeout/overload.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await call(name);
    if (result.body.error?.code !== 'ASSISTANT_BUSY') return result;
    await delay(50);
  }
  assert.fail('Assistant remained busy after cancellation');
};
test.before(async () => {
  const [db] = await prisma.$queryRaw`SELECT current_database() AS name`;
  assert.equal(db.name, 'lab_resources_assistant_test');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  config.port = server.address().port; base = `http://127.0.0.1:${config.port}`;
  const hash = await bcrypt.hash('AssistantTest!2026', 4);
  for (const [name, role] of Object.entries({ student: 'STUDENT', peer: 'STUDENT', lecturer: 'LECTURER', staff: 'LAB_STAFF', admin: 'ADMIN', timeout: 'STUDENT', cancel: 'STUDENT', busy: 'STUDENT', load: 'STUDENT', rejected: 'STUDENT', rate: 'STUDENT' })) {
    users[name] = await prisma.user.create({ data: { id: id(), email: `${name}-${marker}@example.test`, fullName: `Original ${name}`, role, passwordHash: hash } });
    const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: users[name].email, password: 'AssistantTest!2026' }) });
    assert.equal(response.status, 200); tokens[name] = (await response.json()).accessToken;
  }
  const campus = await prisma.campus.create({ data: { id: id(), code: marker, name: 'Assistant test campus' } });
  const building = await prisma.building.create({ data: { id: id(), code: marker, name: 'Assistant test building', campusId: campus.id } });
  lab = await prisma.laboratory.create({ data: { id: id(), code: `A-${marker}`, name: 'Assigned lab', buildingId: building.id } });
  foreignLab = await prisma.laboratory.create({ data: { id: id(), code: `B-${marker}`, name: 'Foreign lab', buildingId: building.id } });
  await prisma.userLabAssignment.create({ data: { userId: users.staff.id, laboratoryId: lab.id } });
  const resource = (laboratoryId, code) => prisma.resource.create({ data: { id: id(), code: `${code}-${marker}`, name: 'Tên thiết bị gốc', category: 'EQUIPMENT', subtype: 'OTHER', laboratoryId, location: 'TEST', bookingState: 'bookable', operationalStatus: 'AVAILABLE' } });
  equipment = await resource(lab.id, 'PRIVATE-A'); foreignEquipment = await resource(foreignLab.id, 'PRIVATE-B');
  const start = new Date(Date.now() + 5 * 86400000); start.setUTCHours(2, 0, 0, 0);
  for (const [name, resourceId] of [['student', equipment.id], ['peer', foreignEquipment.id]]) {
    const row = await prisma.booking.create({ data: { id: id(), resourceId, requestedById: users[name].id, title: name === 'peer' ? 'SECRET PEER BOOKING' : 'Original student booking', purpose: 'Verified fixture', status: 'CONFIRMED', startAt: start, endAt: new Date(start.getTime() + 3600000) } });
    if (name === 'peer') privateBooking = row;
  }
});
test.after(async () => {
  stall = false; await new Promise(resolve => server.close(resolve));
  const userIds = Object.values(users).map(user => user.id);
  await prisma.booking.deleteMany({ where: { requestedById: { in: userIds } } });
  if (equipment && foreignEquipment) await prisma.resource.deleteMany({ where: { id: { in: [equipment.id, foreignEquipment.id] } } });
  await prisma.emailOtp.deleteMany({ where: { email: { contains: marker } } });
  await prisma.userLabAssignment.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

test('authentication, localized errors and suggestions preserve stable contracts', async () => {
  const unauthenticated = await fetch(`${base}/api/assistant/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept-Language': 'en' }, body: '{}' });
  assert.equal(unauthenticated.status, 401); assert.equal(unauthenticated.headers.get('content-language'), 'en'); assert.match((await unauthenticated.json()).error.message, /sign in|authentication/i);
  for (const locale of ['vi', 'en']) {
    const response = await fetch(`${base}/api/assistant/suggestions`, { headers: { Authorization: `Bearer ${tokens.admin}`, 'Accept-Language': locale } });
    const body = await response.json(); assert.equal(body.locale, locale); assert.equal(body.mode, 'LOCAL_GROUNDED'); assert.equal(body.persistence, 'EPHEMERAL'); assert.equal(body.suggestions.length, body.suggestionKeys.length);
    if (locale === 'en') assert.ok(body.suggestions.every(text => !/[À-ỹĐđ]/.test(text)));
  }
  const invalid = await call('admin', 'Find equipment', 'en', { unexpected: true }); assert.equal(invalid.status, 400); assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
});
test('actual MCP reads enforce account and assigned-lab scope without changing records', async () => {
  const before = await Promise.all([prisma.booking.count(), prisma.paymentTransaction.count(), prisma.systemAuditEvent.count()]);
  for (const name of ['student', 'lecturer', 'staff', 'admin']) {
    const r = await call(name, 'Find equipment'); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.provider, 'local'); assert.equal(r.body.modelStatus, 'NOT_CONFIGURED'); assert.equal(r.body.source, 'authenticated_mcp'); assert.deepEqual(r.body.toolsUsed, ['search_resources']); assert.match(r.body.answer, /Tên thiết bị gốc/);
    const ids = r.body.toolResults[0].result.resources.map(x => x.id); assert.ok(ids.includes(equipment.id)); assert.equal(ids.includes(foreignEquipment.id), name !== 'staff');
  }
  const own = await call('student', 'What are my upcoming bookings?'); assert.equal(own.status, 200); assert.deepEqual(own.body.toolResults[0].result.bookings.map(b => b.id).sort(), (await prisma.booking.findMany({ where: { requestedById: users.student.id }, select: { id: true } })).map(b => b.id).sort()); assert.ok(!JSON.stringify(own.body).includes('SECRET PEER BOOKING'));
  for (const name of ['student', 'staff']) {
    // Direct read tool has the same authorization as chat; no hidden write tools are registered.
    const response = await fetch(`${base}/mcp`, { method: 'POST', headers: { Authorization: `Bearer ${tokens[name]}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_booking_detail', arguments: { bookingId: privateBooking.id } } }) });
    const body = await response.json(); assert.equal(body.result.isError, true); assert.equal(body.result.structuredContent.error.code, name === 'student' ? 'NOT_FOUND' : 'FORBIDDEN'); assert.ok(!JSON.stringify(body).includes('SECRET PEER BOOKING'));
  }
  const toolResponse = await fetch(`${base}/api/assistant/tools`, { headers: { Authorization: `Bearer ${tokens.admin}` } }); assert.ok((await toolResponse.json()).tools.every(t => t.readOnly));
  assert.deepEqual(await Promise.all([prisma.booking.count(), prisma.paymentTransaction.count(), prisma.systemAuditEvent.count()]), before);
});
test('VI and EN use the same tool plan; slot proposals remain unsigned form descriptors', async () => {
  const vi = await call('student', 'Tìm thiết bị', 'vi'), en = await call('student', 'Find equipment', 'en');
  assert.equal(vi.status, 200); assert.equal(en.status, 200); assert.deepEqual(vi.body.toolsUsed, en.body.toolsUsed); assert.deepEqual(vi.body.toolResults, en.body.toolResults); assert.match(en.body.answer, /Available/); assert.match(vi.body.answer, /Sẵn sàng|Khả dụng|Sẵn có/);
  const before = await prisma.booking.count();
  const slots = await call('lecturer', 'Find available slots', 'en', { resourceId: equipment.id }); assert.equal(slots.status, 200, JSON.stringify(slots.body)); assert.ok(slots.body.toolResults[0].result.candidatesChecked <= 4096); assert.ok(slots.body.actions.length); assert.ok(slots.body.actions.every(a => a.type === 'PREFILL_BOOKING')); assert.equal(await prisma.booking.count(), before);
});
test('HTTP deadline releases the account before the next successful actual MCP call', async () => {
  stall = true; const first = await call('timeout'); assert.equal(first.status, 504); assert.equal(first.body.error.code, 'ASSISTANT_TIMEOUT');
  stall = false; const next = await call('timeout'); assert.equal(next.status, 200, JSON.stringify(next.body));
});
test('HTTP cancellation and concurrent overload recover without leaving the account busy', async () => {
  stall = true; const controller = new AbortController(); let observed = faultObserved();
  const first = call('cancel', undefined, 'en', {}, controller.signal); await observed; controller.abort(); await assert.rejects(first, { name: 'AbortError' });
  stall = false; assert.equal((await eventuallyAvailable('cancel')).status, 200);
  stall = true; observed = faultObserved(); const busy = call('busy'); await observed;
  const duplicate = await call('busy'); assert.equal(duplicate.status, 409); assert.equal(duplicate.body.error.code, 'ASSISTANT_BUSY'); assert.ok(duplicate.headers.get('retry-after'));
  observed = faultObserved(); const second = call('load'); await observed;
  const third = await call('rejected'); assert.equal(third.status, 503); assert.equal(third.body.error.code, 'ASSISTANT_OVERLOADED'); assert.ok(third.headers.get('retry-after'));
  await Promise.all([busy, second]); stall = false;
  assert.equal((await call('busy')).status, 200); assert.equal((await call('load')).status, 200);
});
test('per-account rate limiting rejects excess work with a localized retry boundary', async () => {
  for (let i = 0; i < 6; i += 1) assert.equal((await call('rate')).status, 200);
  const excess = await call('rate'); assert.equal(excess.status, 429); assert.equal(excess.body.error.code, 'ASSISTANT_RATE_LIMITED'); assert.ok(excess.headers.get('retry-after')); assert.match(excess.body.error.message, /too many questions.*wait/i);
});

test('OTP email follows request locale, escapes identity and persists only the hashed code', async () => {
  const { configureGuestOtpTestDelivery } = await import('../src/services/guestBookingService.js');
  const delivered = new Map();
  // Explicit NODE_ENV=test-only delivery capture. This is not SMTP provider verification.
  configureGuestOtpTestDelivery(async message => { delivered.set(message.to, message); return { success: true, messageId: 'isolated-email-capture' }; });
  const attack = '<img src=x onerror="alert(1)">';
  try {
    for (const locale of ['vi', 'en']) {
      const email = `otp-${locale}-${marker}@example.test`;
      const response = await fetch(`${base}/api/guest-booking/otp`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept-Language': locale }, body: JSON.stringify({ email, fullName: attack }) });
      assert.equal(response.status, 202, JSON.stringify(await response.json()));
      const message = delivered.get(email); assert.ok(message); assert.match(message.code, /^\d{6}$/);
      assert.ok(message.html.includes(`lang="${locale}"`)); assert.doesNotMatch(message.html, /<img src=x/); assert.match(message.html, /&lt;img src=x/);
      assert.match(message.subject, locale === 'vi' ? /Mã xác thực|Mã OTP/ : /Verification|verification|OTP/);
      const persisted = await prisma.emailOtp.findFirst({ where: { email }, orderBy: { createdAt: 'desc' } });
      assert.ok(persisted); assert.notEqual(persisted.codeHash, message.code); assert.equal(persisted.consumedAt, null);
    }
  } finally { configureGuestOtpTestDelivery(null); }
});
