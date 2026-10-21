import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import bcrypt from '../backend/node_modules/bcryptjs/index.js';
import { chromium } from 'playwright-core';

// Real API and PostgreSQL in an isolated database; never mutate the local demo.
const database = new URL(process.env.PAYMENT_HOLD_TEST_DATABASE_URL || 'http://missing');
assert.ok(['127.0.0.1','localhost'].includes(database.hostname));
assert.equal(database.pathname, '/lab_resources_payment_hold_test');
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
Object.assign(process.env, { DATABASE_URL: database.href, NODE_ENV: 'test', LOG_FORMAT: 'dev', RATE_LIMIT_MAX: '10000', JWT_SECRET: 'payment-hold-ui-test-secret',
  PAYMENTS_ENABLED: 'true', VNPAY_ENABLED: 'true', VNPAY_TMN_CODE: 'TESTONLY', VNPAY_HASH_SECRET: 'isolated-ui-test-signature',
  VNPAY_PAYMENT_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', VNPAY_RETURN_URL: 'http://127.0.0.1:8000/api/payments/vnpay/return',
  VNPAY_IPN_URL: 'http://127.0.0.1:8000/api/payments/vnpay/ipn', PAYMENT_APP_URL: base,
  CHATGPT_BRIDGE_ENABLED: 'false', EMAIL_ENABLED: 'false', SMTP_HOST: '', MCP_ASSISTANT_ENABLED: 'false', REMINDER_SCHEDULER_ENABLED: 'false', CORS_ORIGINS: base });
const [{ prisma }, { createApp }] = await Promise.all([import('../backend/src/db.js'), import('../backend/src/app.js')]);
assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, 'lab_resources_payment_hold_test');
assert.ok((await prisma.user.findMany({select:{email:true}})).every(row=>row.email.endsWith('@payment-hold.test')));
const server = http.createServer(createApp()); await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const api = `http://127.0.0.1:${server.address().port}`, id=()=>crypto.randomUUID();
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH || undefined,headless:true});
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
try {
  const campus = await prisma.campus.create({data:{id:id(),code:id(),name:'Payment hold UI test'}});
  const building = await prisma.building.create({data:{id:id(),code:id(),name:'UI test',campusId:campus.id}});
  const lab = await prisma.laboratory.create({data:{id:id(),code:id(),name:'UI test',buildingId:building.id}});
  await prisma.labPolicy.create({data:{id:id(),laboratoryId:lab.id,workDayStartHour:0,workDayEndHour:24,allowWeekend:true}});
  for(const [category,locale,viewport] of [['ROOM','vi',{width:1440,height:900}],['EQUIPMENT','en',{width:375,height:812}]]) {
    const user = await prisma.user.create({data:{id:id(),email:`ui-${id()}@payment-hold.test`,fullName:'UI Customer',phone:'0900000001',role:'CUSTOMER',passwordHash:await bcrypt.hash('PaymentHoldUI!2026',4)}});
    const login = await fetch(api+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password:'PaymentHoldUI!2026'})});
    const session = await login.json();assert.ok(login.ok);
    const resource = await prisma.resource.create({data:{id:id(),code:id(),name:`Payment hold ${category}`,category,subtype:'OTHER',location:'UI LAB',laboratoryId:lab.id}});
    await prisma.resourcePricingRule.create({data:{id:id(),resourceId:resource.id,purposeCode:'STUDY',label:'UI test fee',hourlyRateVnd:50000}});
    const context = await browser.newContext({viewport,reducedMotion:'reduce'});
    try {
      await context.addInitScript(({session,locale})=>{sessionStorage.setItem('lrm_token',session.accessToken);sessionStorage.setItem('lrm_user',JSON.stringify(session.user));localStorage.setItem('lrm_locale',locale);},{session,locale});
      await context.route('**/api/**',async route=>{const url=new URL(route.request().url());const response=await route.fetch({url:api+url.pathname+url.search});await route.fulfill({response});});
      const page=await context.newPage();page.setDefaultTimeout(15000);
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`${base}/workspace/calendar?resource=${resource.id}`);
      await page.locator('.planner-date-input input').fill(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+86400000)));
      await page.locator('.planner-booking-actions .btn-primary').click();
      await page.locator('#booking-date').fill(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+86400000)));
      await page.locator('#booking-start-time').fill('09:00');await page.locator('#booking-end-time').fill('10:00');
      await page.locator('#booking-title').fill('Payment hold browser regression');
      await page.locator('button[form="quick-booking-form"]').filter({hasText:locale==='vi'?'Giữ chỗ và thanh toán':'Reserve and pay'}).click();
      await page.waitForURL(/\/workspace\/payments\?booking=/);
      await page.locator('.payment-hold-notice').waitFor();
      const bookingId = new URL(page.url()).searchParams.get('booking');
      const booking = await prisma.booking.findUniqueOrThrow({where:{id:bookingId}});
      check(booking.status==='PENDING_APPROVAL'&&booking.paymentDueAt&&!booking.approvedAt,`${category}: booking remains unconfirmed at checkout`);
      check((await page.locator('.payment-hold-notice strong').innerText())===(locale==='vi'?'Chờ thanh toán':'Awaiting payment'),`${category}: correct payment label`);
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${category}: no viewport overflow`);
      await page.screenshot({path:path.join(tmpdir(),`lab-payment-hold-${locale}.png`),fullPage:true});
      await page.reload();await page.locator('.payment-hold-notice').waitFor();
      check(+(await prisma.booking.findUniqueOrThrow({where:{id:bookingId}})).paymentDueAt===+booking.paymentDueAt,`${category}: reload does not extend hold`);

      // Intercept only the provider destination. No real bank transaction is submitted.
      await page.route('https://sandbox.vnpayment.vn/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Isolated provider destination test</h1>'}));
      await page.locator('.booking-checkout-payment button.primary-button').click();
      await page.waitForURL(url=>url.hostname==='sandbox.vnpayment.vn');
      check(new URL(page.url()).searchParams.has('vnp_SecureHash'),`${category}: checkout opens the signed VNPAY destination`);
      check((await prisma.booking.findUniqueOrThrow({where:{id:bookingId}})).status==='PENDING_APPROVAL',`${category}: visiting payment page does not settle or confirm`);
      await page.goto(`${base}/workspace/bookings?booking=${bookingId}`);
      await page.locator('.payment-hold-notice').waitFor();
      check((await page.locator('.status-badge-inline').allTextContents()).some(label=>label.includes(locale==='vi'?'Chờ thanh toán':'Awaiting payment')),`${category}: booking list uses awaiting-payment badge`);
      if (category === 'EQUIPMENT') {
        await prisma.booking.update({where:{id:bookingId},data:{paymentDueAt:new Date(Date.now()+15000)}});
        const calendar = await context.newPage(); calendar.setDefaultTimeout(15000);
        const shown = calendar.waitForResponse(async response => response.url().includes('/api/calendar/events') && (await response.json()).events?.some(row=>row.id===bookingId));
        await calendar.goto(`${base}/workspace/calendar?resource=${resource.id}`); await shown;
        await calendar.locator('.planner-date-input input').fill(booking.startAt.toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}));
        const released = await calendar.waitForResponse(async response => response.url().includes('/api/calendar/events') && !(await response.json()).events?.some(row=>row.id===bookingId),{timeout:30000});
        check(released.ok(), 'Calendar automatically refreshes the held slot at its deadline');
        await calendar.close();
      } else await prisma.booking.update({where:{id:bookingId},data:{paymentDueAt:new Date(Date.now()+2000)}});
      await page.goto(`${base}/workspace/payments?booking=${bookingId}`);
      await page.waitForFunction(()=>/cancelled|hủy/i.test(document.querySelector('.booking-checkout-status')?.textContent || ''));
      check((await prisma.booking.findUniqueOrThrow({where:{id:bookingId}})).status==='CANCELLED',`${category}: UI refreshes actual server cancellation after expiry`);
      check(!await page.locator('.booking-checkout-payment button.primary-button').count(),`${category}: expired reservation cannot open payment`);
      check(errors.length===0,`${category}: no browser runtime errors: ${errors.join('; ')}`);
    } finally {await context.close();}
  }
  console.log(`Payment hold UI: ${checks} checks passed.`);
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));await prisma.$disconnect();}
