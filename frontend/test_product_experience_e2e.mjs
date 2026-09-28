import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';

// Live read-only UX checks. Fault injection changes only browser responses and
// never claims booking, OTP, payment, or persistence success.
const base = process.env.UX_FRONTEND_URL || 'http://127.0.0.1:15180';
const apiBase = process.env.UX_API_URL || 'http://127.0.0.1:15005/api';
const evidence = new URL('../logs/ux-review/', import.meta.url);
await fs.mkdir(evidence, { recursive: true });
const browser = await chromium.launch();
const results = [];
const pass = (name) => { results.push(name); console.log(`PASS ${name}`); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Document must fit viewport');
}
async function capture(page, name) {
  await page.screenshot({ path: new URL(`${name}.png`, evidence).pathname.replace(/^\/([A-Z]:)/, '$1') });
}
async function openDetail(page, index = 0) {
  await page.locator('.catalog-card-cta').nth(index).click();
  await page.locator('.guest-booking-panel').waitFor();
  await page.locator('.catalog-detail').scrollIntoViewIfNeeded();
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, timezoneId: 'America/Los_Angeles', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('.catalog-card-cta').first().waitFor();
  await capture(page, 'after-landing-desktop');
  const resources = await page.evaluate(async (api) => (await fetch(`${api}/resources`)).json(), apiBase);
  assert.ok(resources.length >= 2, 'Read-only demo requires at least two resources');
  await openDetail(page);
  assert.equal(await page.locator('#catalog-detail-title').evaluate(el => el === document.activeElement), true);
  assert.ok(await page.locator('.catalog-eligibility-verdict.verdict-success, .catalog-eligibility-verdict.verdict-warning, .catalog-eligibility-verdict.verdict-danger').count());
  assert.match(await page.locator('.catalog-schedule').innerText(), /UTC\+07:00/);
  assert.equal(await page.locator('.catalog-detail').evaluate(el => el.innerHTML.includes('${')), false);
  await capture(page, 'after-detail-desktop');
  pass('Detail focus, semantic variants, attribution interpolation and explicit Vietnam timezone');

  const schedule = await page.evaluate(async ({ api, id }) => (await fetch(`${api}/resources/${id}/schedule`)).json(), { api: apiBase, id: resources[0].id });
  const booking = schedule.bookings.find(b => ['PENDING_APPROVAL','CONFIRMED','CHECKED_OUT','RETURNED'].includes(b.status));
  if (booking) {
    const vn = new Date(new Date(booking.startAt).getTime() + 7 * 3600000);
    const expected = `${String(vn.getUTCHours()).padStart(2,'0')}:${String(vn.getUTCMinutes()).padStart(2,'0')}`;
    assert.match(await page.locator('.catalog-schedule').innerText(), new RegExp(expected));
    pass('Live busy schedule uses Vietnam hours in America/Los_Angeles browser');
  }

  // Future date leaves the quote independent of the clock at test execution.
  await page.locator('#guest-booking-date').fill(new Date(Date.now() + 2 * 86400000).toISOString().slice(0,10));
  await page.waitForFunction(() => document.querySelector('.guest-booking-quote')?.textContent.includes('Phí tạm tính'));
  await page.locator('.guest-wizard-btn.next').click();
  await page.locator('#guest-full-name').waitFor();
  assert.equal(await page.locator('.guest-step-heading').evaluate(el => el === document.activeElement), true);
  await page.locator('#guest-full-name').fill('UX review unsent');
  await page.locator('#guest-email').fill('ux-review-unsent@example.test');
  await page.locator('#guest-phone').fill('0901234567');
  await page.locator('#address-line').fill('UX review address, not submitted');
  await page.waitForFunction(() => document.querySelectorAll('#address-province option').length > 1);
  await page.locator('#address-province').selectOption({index:1});
  await page.waitForFunction(() => document.querySelectorAll('#address-ward option').length > 1);
  await page.locator('#address-ward').selectOption({index:1});
  await page.locator('.guest-wizard-btn.next').click();
  await page.locator('#guest-otp-input').waitFor();
  await page.route('**/api/guest-booking/otp', async route => {
    await sleep(700);
    await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'EMAIL_DELIVERY_FAILED',message:'Injected SMTP failure'}})});
  });
  await page.getByRole('button',{name:'Gửi mã OTP qua email',exact:true}).click();
  assert.ok(await page.locator('.guest-wizard-step').first().isDisabled());
  await page.locator('.guest-booking-alert.danger').waitFor();
  assert.equal(await page.locator('.guest-booking-alert.danger').evaluate(el=>el===document.activeElement),true);
  assert.ok(await page.getByRole('button',{name:'Xác nhận đặt lịch',exact:true}).isDisabled());
  await page.unroute('**/api/guest-booking/otp');
  pass('Live address selection and unsent final review; injected OTP failure freezes navigation, focuses error and never claims success');
  await page.locator('.guest-wizard-step').first().click();
  await page.locator('#guest-start-time').fill('15:00');
  await page.locator('#guest-end-time').fill('09:00');
  await page.locator('.guest-wizard-step').nth(2).click();
  assert.match(await page.locator('.guest-step-heading').innerText(), /Bước 1/);
  assert.match(await page.locator('.guest-booking-alert').innerText(), /Giờ bắt đầu/);
  assert.equal(await page.locator('.guest-booking-alert').evaluate(el => el === document.activeElement), true);
  pass('Wizard rejects invalid step-one jump to OTP and focuses the visible error');

  await openDetail(page, 1);
  assert.match(await page.locator('.guest-step-heading').innerText(), /Bước 1/);
  assert.equal(await page.locator('#guest-start-time').inputValue(), '09:00');
  await page.getByRole('button', { name: 'Đóng chi tiết', exact: true }).click();
  assert.equal(await page.locator('.catalog-card-cta').nth(1).evaluate(el => el === document.activeElement), true);
  pass('Resource change resets wizard; closing detail restores initiating control');

  // Delay actual live responses to force close-during-load and out-of-order reads.
  let delayedRequests = 0;
  await page.route(`**/api/resources/${resources[0].id}`, async route => {
    const response = await route.fetch();
    delayedRequests++;
    await sleep(700);
    await route.fulfill({ response });
  });
  await page.locator('.catalog-card-cta').first().click();
  await page.getByRole('button', { name: 'Đóng chi tiết', exact: true }).click();
  await sleep(950);
  assert.equal(await page.locator('.catalog-detail').count(), 0);
  await page.locator('.catalog-card-cta').first().click();
  await openDetail(page, 1);
  await sleep(950);
  assert.equal(await page.locator('#catalog-detail-title').innerText(), resources[1].name);
  assert.ok(delayedRequests >= 2);
  await page.unroute(`**/api/resources/${resources[0].id}`);
  pass('Delayed real detail responses cannot reopen closed detail or replace newer selection');

  await page.route(`**/api/resources/${resources[0].id}`, route => route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{message:'Injected detail outage'}})}));
  await page.locator('.catalog-card-cta').first().click();
  await page.locator('.catalog-detail .catalog-message[role="alert"]').waitFor();
  assert.equal(await page.locator('.guest-booking-panel').count(), 0);
  assert.equal(await page.getByRole('button', {name:/Đăng nhập tài khoản trường để đặt lịch nội bộ/}).isDisabled(), true);
  await page.unroute(`**/api/resources/${resources[0].id}`);
  await page.locator('.catalog-detail .catalog-message').getByRole('button', {name:'Thử lại'}).click();
  await page.locator('.guest-booking-panel').waitFor();
  pass('Injected detail outage is visible and retry restores real detail');

  for (const [width,height] of [[1440,960],[768,1024],[390,844],[360,800]]) {
    await page.setViewportSize({width,height});
    await noOverflow(page);
    await page.locator('.guest-booking-panel').scrollIntoViewIfNeeded();
    await capture(page, `after-guest-${width}`);
    const steps = await page.locator('.guest-wizard-step').evaluateAll(nodes => nodes.map(el => el.getBoundingClientRect().height));
    assert.ok(steps.every(h => h >= 44));
    pass(`Public detail/wizard ${width}px, no document overflow, 44px progress controls`);
  }

  // Explicit media/eligibility fixtures: no database writes, no successful mutation mocks.
  await page.route(`**/api/resources/${resources[0].id}`, async route => {
    const response = await route.fetch();
    const data = await response.json();
    data.trainingRequirements = [{id:'ux-training-fixture',courseId:'ux-course',name:'An toàn LAB (fixture)'}];
    data.media = ['IMAGE','VIDEO'].map(kind => ({id:kind,kind,url:`${base}/ux-intentionally-missing-${kind}`,title:`${kind} fixture`,altText:'Tư liệu kiểm tra lỗi',credit:'UX test fixture',license:'Test attribution'}));
    await route.fulfill({response,json:data});
  });
  await page.route('**/ux-intentionally-missing-*', route => route.abort());
  await page.route(`**/api/resources/${resources[0].id}/schedule?*`,async route=>{
    const response=await route.fetch();
    const data=await response.json();
    data.maintenanceWindows=[
      {id:'ux-cancelled',status:'cancelled',kind:'maintenance',startAt:'2026-09-30T01:11:00Z',endAt:'2026-09-30T02:11:00Z'},
      {id:'ux-blocking',status:'scheduled',kind:'calibration',startAt:'2026-09-30T03:22:00Z',endAt:'2026-09-30T04:22:00Z'}
    ];
    await route.fulfill({response,json:data});
  });
  await openDetail(page);
  await page.locator('.catalog-media-gallery').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelectorAll('.catalog-media-gallery .catalog-media-failure').length === 2);
  assert.match(await page.locator('.guest-eligibility-notice').innerText(), /chứng chỉ còn hiệu lực trước khi đặt lịch/);
  assert.match(await page.locator('.catalog-media-gallery').innerText(), /Test attribution/);
  assert.match(await page.locator('.catalog-schedule').innerText(), /10:22/);
  assert.doesNotMatch(await page.locator('.catalog-schedule').innerText(), /08:11/);
  await noOverflow(page);
  await capture(page, 'after-media-failure-mobile');
  pass('Injected failed image/video preserve truthful fallback and license; training copy explains prerequisites; cancelled maintenance excluded');
  assert.deepEqual(errors, []);
  await context.close();

  // Optional real demo identities supplied via env; only read routes and authenticate.
  for (const [role,email,password,routes] of [
    ['student',process.env.UX_STUDENT_EMAIL,process.env.UX_STUDENT_PASSWORD,['tong-quan','lich-dat','booking','ho-so']],
    ['staff',process.env.UX_STAFF_EMAIL,process.env.UX_STAFF_PASSWORD,['tong-quan','booking','van-hanh','telemetry','su-co','bao-tri']],
    ['admin',process.env.UX_ADMIN_EMAIL,process.env.UX_ADMIN_PASSWORD,['nguoi-dung']]
  ]) {
    if (!email || !password) { console.log(`SKIP ${role}: no demo credentials supplied`); continue; }
    const ctx = await browser.newContext({viewport:{width:1440,height:960}});
    const p = await ctx.newPage();
    const routeErrors = [];
    p.on('pageerror', e => routeErrors.push(e.message));
    await p.goto(base,{waitUntil:'networkidle'});
    await p.locator('#login-email').fill(email);
    await p.locator('#login-password').fill(password);
    await p.getByRole('button',{name:/ĐĂNG NHẬP VÀO HỆ THỐNG/i}).click();
    await p.locator('.sidebar-nav-item-2026').first().waitFor();
    for (const route of routes) {
      await p.goto(`${base}/#/workspace/${route}`,{waitUntil:'networkidle'});
      await p.waitForFunction(() => !document.querySelector('#workspace-main')?.textContent.match(/Đang tải dữ liệu thật|Đang tổng hợp dữ liệu|Đang tải hồ sơ/));
      if(route==='booking') await p.locator('.operations-header button').filter({hasText:'Làm mới'}).waitFor();
      await noOverflow(p);
      await capture(p,`after-${role}-${route}`);
      assert.ok((await p.locator('#workspace-main').innerText()).length > 40);
    }
    if(role === 'admin') {
      const selects = p.locator('.user-management-table select');
      assert.ok(await selects.count() > 0);
      assert.ok((await selects.evaluateAll(nodes => nodes.map(el=>el.getAttribute('aria-label')))).every(Boolean));
      assert.equal(await p.locator('.user-management-table caption').count(),1);
    }
    await p.setViewportSize({width:390,height:844});
    await noOverflow(p);
    await capture(p,`after-${role}-mobile`);
    assert.deepEqual(routeErrors,[]);
    pass(`Live ${role} read-only routes and mobile layout${role === 'admin' ? ', named user-management controls' : ''}`);
    await ctx.close();
  }
  await fs.writeFile(new URL('results.json',evidence),JSON.stringify({base,apiBase,results},null,2));
} finally { await browser.close(); }
