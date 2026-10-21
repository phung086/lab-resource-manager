import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import bcrypt from '../backend/node_modules/bcryptjs/index.js';
import { chromium } from 'playwright-core';

const database = new URL(process.env.FULFILLMENT_TEST_DATABASE_URL || 'http://missing');
assert.ok(['127.0.0.1','localhost'].includes(database.hostname));
assert.equal(database.pathname, '/lab_resources_booking_fulfillment_test');
const base = process.env.FULFILLMENT_UI_URL || 'http://127.0.0.1:5173';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
Object.assign(process.env, { DATABASE_URL: database.href, NODE_ENV: 'test', LOG_FORMAT: 'dev', RATE_LIMIT_MAX: '10000', JWT_SECRET: 'fulfillment-ui-test-secret-at-least-32-characters',
  ROOM_ACCESS_SECRET_KEY: crypto.randomBytes(32).toString('base64'), PAYMENTS_ENABLED: 'true', VNPAY_ENABLED: 'true', VNPAY_TMN_CODE: 'TESTONLY', VNPAY_HASH_SECRET: 'isolated-ui-fixture-signature',
  VNPAY_PAYMENT_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', VNPAY_RETURN_URL: 'http://127.0.0.1:8000/api/payments/vnpay/return', VNPAY_IPN_URL: 'http://127.0.0.1:8000/api/payments/vnpay/ipn',
  CHATGPT_BRIDGE_ENABLED: 'false', EMAIL_ENABLED: 'false', SMTP_HOST: '', OPENAI_API_KEY: '', MCP_ASSISTANT_ENABLED: 'false', REMINDER_SCHEDULER_ENABLED: 'false', CORS_ORIGINS: base });
const [{ prisma }, { createApp }, { config }] = await Promise.all([import('../backend/src/db.js'), import('../backend/src/app.js'), import('../backend/src/config.js')]);
assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, 'lab_resources_booking_fulfillment_test');
assert.ok((await prisma.user.findMany({ select: { email: true } })).every(row => row.email.endsWith('@fulfillment.test')));
const server = http.createServer(createApp()); await new Promise(resolve => server.listen(0,'127.0.0.1',resolve)); config.port = server.address().port;
const api = `http://127.0.0.1:${config.port}`, id = () => crypto.randomUUID(), marker = id(), sessions = {}, actors = {}, contexts = [];
const checks = [], errors = [], output = '../backend/logs/fulfillment-browser'; mkdirSync(output,{recursive:true});
const check = (value, label) => { assert.ok(value,label); checks.push(label); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, headless:true });
async function call(name,path,body,method = body ? 'POST' : 'GET') {
  const r = await fetch(api+'/api'+path,{method,headers:{'Content-Type':'application/json',...(sessions[name]?{Authorization:'Bearer '+sessions[name].accessToken}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data = await r.json(); assert.ok(r.ok,path+' '+r.status+' '+JSON.stringify(data)); return data;
}
async function open(name,path) {
  const context = await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}); contexts.push(context);
  await context.addInitScript(session => { sessionStorage.setItem('lrm_token',session.accessToken);sessionStorage.setItem('lrm_user',JSON.stringify(session.user));localStorage.setItem('lrm_locale','vi'); },sessions[name]);
  await context.route('**/api/**',async route => { const url=new URL(route.request().url());const response=await route.fetch({url:api+url.pathname+url.search});await route.fulfill({response}); });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(base+path);return page;
}
try {
  const campus=await prisma.campus.create({data:{id:id(),code:marker,name:'UI test campus'}});
  const building=await prisma.building.create({data:{id:id(),code:marker,name:'UI test building',campusId:campus.id}});
  const lab=await prisma.laboratory.create({data:{id:id(),code:marker,name:'UI test LAB',buildingId:building.id}});
  await prisma.labPolicy.create({data:{id:id(),laboratoryId:lab.id,workDayStartHour:0,workDayEndHour:24,allowWeekend:true}});
  const passwordHash=await bcrypt.hash('FulfillmentUI!2026',4);
  for (const [name,role] of Object.entries({admin:'ADMIN',staff:'LAB_STAFF',owner:'CUSTOMER'})) {
    actors[name]=await prisma.user.create({data:{id:id(),email:`ui-${name}-${marker}@fulfillment.test`,fullName:'UI '+name,phone:'0900000001',passwordHash,role}});
    sessions[name]=await call(name,'/auth/login',{email:actors[name].email,password:'FulfillmentUI!2026'});
  }
  await prisma.userLabAssignment.create({data:{userId:actors.staff.id,laboratoryId:lab.id}});
  const room=await prisma.resource.create({data:{id:id(),code:'UI-ROOM-'+marker,name:'Phòng kiểm thử tự phục vụ',laboratoryId:lab.id,category:'ROOM',subtype:'OTHER',location:'LAB reception A'}});
  const equipment=await prisma.resource.create({data:{id:id(),code:'UI-EQ-'+marker,name:'Thiết bị nhận tại nhà',laboratoryId:lab.id,category:'EQUIPMENT',subtype:'OTHER',location:'LAB reception A'}});
  await call('admin',`/resources/${room.id}/fulfillment`,{expectedVersion:0,roomPassword:'UITestRoom2026',deliveryAllowed:false,pickupInstructions:'LAB reception A'},'PUT');
  await call('admin',`/resources/${equipment.id}/fulfillment`,{expectedVersion:0,deliveryAllowed:true,pickupInstructions:'LAB reception A'},'PUT');
  const start=new Date(Math.ceil((Date.now()+10*60000)/60000)*60000),end=new Date(+start+3600000);
  const booking=await call('owner','/bookings',{resourceId:room.id,title:'Self-service UI workflow',purpose:'Test',startAt:start.toISOString(),endAt:end.toISOString(),contact:{fullName:'UI owner',phone:'0900000001'}});
  const owner=await open('owner',`/workspace/bookings?booking=${booking.id}`);
  await owner.getByRole('button',{name:'Vào phòng',exact:true}).waitFor();
  check(await owner.locator('.room-access-password').innerText()==='0900000001','Owner receives booking contact phone as room access code');
  check(await owner.getByText('UITestRoom2026',{exact:true}).count()===0,'Legacy shared room password is never displayed');
  await owner.getByRole('button',{name:'Vào phòng',exact:true}).click();await owner.getByRole('button',{name:'Trả phòng',exact:true}).waitFor();
  check((await call('owner',`/bookings/${booking.id}`)).status==='CHECKED_OUT','Room check-in changes actual persisted state');
  await owner.getByRole('button',{name:'Trả phòng',exact:true}).click();await owner.getByLabel('Tình trạng phòng khi trả',{exact:true}).fill('Đã rời phòng, không phát hiện hư hỏng');
  await owner.getByRole('button',{name:'Đã rời phòng — xác nhận trả',exact:true}).click();await owner.getByText('Đã trả phòng · chờ nhân viên kiểm tra',{exact:true}).waitFor();
  const returned=await call('owner',`/bookings/${booking.id}`);check(returned.status==='RETURNED'&&returned.schedulingReleasedAt&&!returned.completedAt,'Early return releases scheduling hold without inventing staff inspection');
  const staff=await open('staff',`/workspace/bookings?booking=${booking.id}`);await staff.getByRole('button',{name:'Hoàn tất kiểm tra',exact:true}).waitFor();
  check(await staff.getByRole('button',{name:'Hoàn tất kiểm tra',exact:true}).isVisible(),'Assigned staff has a separate inspection completion action');
  await staff.getByRole('button',{name:'Hoàn tất kiểm tra',exact:true}).click();
  await staff.locator('#booking-operation-form textarea').fill('Đã kiểm tra phòng, không ghi nhận hư hỏng');
  await staff.locator('button[form="booking-operation-form"][type="submit"]').click();
  await staff.locator('#booking-operation-form').waitFor({state:'hidden'});
  check((await call('owner',`/bookings/${booking.id}`)).status==='COMPLETED','Staff inspection completes the record after customer return');
  const late=await call('owner','/bookings',{resourceId:room.id,title:'Later booking',purpose:'Test',startAt:new Date(+start+7200000).toISOString(),endAt:new Date(+end+7200000).toISOString(),contact:{fullName:'UI owner',phone:'0900000001'}});
  await owner.goto(base+`/workspace/bookings?booking=${late.id}`);await owner.getByRole('button',{name:'Vào phòng',exact:true}).waitFor();
  check(!await owner.getByRole('button',{name:'Vào phòng',exact:true}).isEnabled(),'Customer cannot check in earlier than the 30-minute window');
  // Protocol-only signed provider evidence on this isolated DB; never claim a live bank payment.
  const receipt=await prisma.booking.create({data:{id:id(),resourceId:room.id,requestedById:actors.owner.id,title:'Receipt test',purpose:'Test',status:'CONFIRMED',startAt:new Date(+start+14400000),endAt:new Date(+end+14400000),feeAmountVnd:80000,contactSnapshot:{fullName:'UI owner',phone:'0900000001',email:actors.owner.email},fulfillmentSnapshot:{mode:'ROOM_SELF_SERVICE'}}});
  const {ensureBookingCharge}=await import('../backend/src/services/bookingPricingService.js');const charge=await ensureBookingCharge(prisma,{...receipt,resource:room});
  await call('owner',`/payments/${charge.id}/vnpay`,{});
  const params={vnp_TmnCode:'TESTONLY',vnp_Amount:'8000000',vnp_TxnRef:charge.txnRef,vnp_ResponseCode:'00',vnp_TransactionStatus:'00',vnp_TransactionNo:String(Date.now()),vnp_PayDate:'20261014120000'};
  const query=Object.keys(params).sort().map(key=>`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');params.vnp_SecureHash=crypto.createHmac('sha512',process.env.VNPAY_HASH_SECRET).update(query).digest('hex');
  const settled=await fetch(api+'/api/payments/vnpay/ipn?'+new URLSearchParams(params));assert.equal((await settled.json()).RspCode,'00');
  await owner.goto(base+`/workspace/payments?booking=${receipt.id}&returned=1`);await owner.getByRole('heading',{name:'Biên lai lịch đặt',exact:true}).waitFor();
  check(await owner.getByText(charge.txnRef,{exact:true}).isVisible()&&await owner.locator('.room-access-password').innerText()==='0900000001','Verified payment receipt includes transaction, booking and protected phone access');
  await owner.screenshot({path:output+'/receipt-desktop.png',fullPage:true});
  await owner.setViewportSize({width:375,height:812});check(await owner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile receipt has no horizontal overflow');await owner.screenshot({path:output+'/receipt-mobile.png',fullPage:true});
  await owner.reload();await owner.getByRole('heading',{name:'Biên lai lịch đặt',exact:true}).waitFor();check(await owner.getByText(charge.txnRef,{exact:true}).isVisible(),'Receipt persists after reload');
  await owner.setViewportSize({width:1440,height:900});
  await owner.goto(base+`/workspace/calendar?resource=${equipment.id}`);
  await owner.locator('.planner-date-input input').fill(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+86400000)));
  await owner.locator('.planner-booking-actions .btn-primary').click();
  await owner.locator('#booking-delivery-mode').waitFor();await owner.locator('#booking-delivery-mode').selectOption('HOME_DELIVERY');
  check(await owner.locator('#address-province').isVisible()&&await owner.locator('#address-ward').isVisible()&&await owner.locator('#address-line').isVisible(),'Equipment booking collects a full home-delivery address');
  await owner.locator('#address-province option').nth(1).waitFor({state:'attached'});
  await owner.locator('#address-province').selectOption(await owner.locator('#address-province option').nth(1).getAttribute('value'));
  await owner.locator('#address-ward option').nth(1).waitFor({state:'attached'});
  await owner.locator('#address-ward').selectOption(await owner.locator('#address-ward option').nth(1).getAttribute('value'));
  await owner.locator('#address-line').fill('12 Nguyễn Văn Cừ');
  const tomorrow = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+86400000));
  await owner.locator('#booking-date').fill(tomorrow);await owner.locator('#booking-start-time').fill('09:00');await owner.locator('#booking-end-time').fill('10:00');await owner.locator('#booking-title').fill('Giao thiết bị kiểm thử');
  await owner.screenshot({path:output+'/delivery-desktop.png',fullPage:true});
  await owner.getByRole('button',{name:'Xác nhận đặt lịch',exact:true}).click();
  await owner.locator('#booking-success-close-btn').waitFor();
  const delivered = (await call('owner','/bookings')).find(row=>row.title==='Giao thiết bị kiểm thử');
  check(delivered?.fulfillmentSnapshot?.mode==='HOME_DELIVERY'&&delivered.fulfillmentSnapshot.address.fullAddress.includes('12 Nguyễn Văn Cừ'),'Normal booking API persists validated home-delivery address/contact');
  const admin = await open('admin',`/workspace/resources/${room.id}`);
  await admin.getByRole('button',{name:'Bảng giá thuê',exact:true}).click();
  await admin.getByText('Cấu hình nhận tài nguyên',{exact:true}).click();
  await admin.locator('.resource-fulfillment-editor[open] form').waitFor();
  check(await admin.locator(`#room-password-${room.id}`).count()===0, 'ADMIN configuration does not expose or edit a legacy shared password');
  check(errors.length===0,'No browser runtime errors: '+errors.join('; '));console.log(JSON.stringify({checks:checks.length,passed:checks},null,2));
} finally { await Promise.all(contexts.map(context=>context.close()));await browser.close();await new Promise(resolve=>server.close(resolve));await prisma.$disconnect(); }
