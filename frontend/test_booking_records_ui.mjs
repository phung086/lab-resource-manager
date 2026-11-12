import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const shots = process.env.UI_SCREENSHOT_DIR;
if (shots) await mkdir(shots, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.CHROMIUM_EXECUTABLE_PATH ? undefined : 'msedge',
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH
});
const startAt = new Date(Date.now() + 86_400_000).toISOString();
const endAt = new Date(Date.now() + 90_000_000).toISOString();
const deadline = new Date(Date.now() + 600_000).toISOString();
const customer = { id:'qa-customer', fullName:'Minh Anh', role:'CUSTOMER', isActive:true };
const laboratory = { id:'qa-lab', code:'LAB-01', name:'LAB Điện tử & Đo lường' };
const records = [
  ['CONFIRMED','Phòng thực hành điện tử','ROOM'],
  ['CONFIRMED','Máy trạm phân tích dữ liệu','EQUIPMENT'],
  ['CHECKED_OUT','Phòng thị giác máy tính','ROOM'],
  ['PENDING_APPROVAL','Bộ thí nghiệm mạch điện','EQUIPMENT'],
  ['CANCELLED','Phòng lắp ráp & tạo mẫu','ROOM']
].map(([status,name,category],index) => {
  const resource = {id:`room-${index}`,code:`LRM-0${index+1}`,name,category,laboratory,laboratoryId:laboratory.id};
  return {id:`record-${index}`,bookingCode:`LAB-00${index+1}`,status,resource,resourceId:resource.id,requestedBy:customer,requestedById:customer.id,
    title:'Thực hành và kiểm tra thiết bị',startAt,endAt,feeAmountVnd:index===3?90000:0,paymentDueAt:index===3?deadline:null};
});
let variants = 0;
try {
  for (const role of ['ADMIN','LAB_STAFF','CUSTOMER']) {
    for (const [width,locale] of [[1440,'vi'],[390,'en']]) {
      const actor = role==='CUSTOMER' ? customer : { id:'qa-staff', fullName:'Hải Nguyễn', role, isActive:true };
      const context = await browser.newContext({viewport:{width,height:960},reducedMotion:'reduce'});
      await context.addInitScript(({actor,locale}) => {
        sessionStorage.setItem('lrm_token','booking-records-ui-fixture');
        sessionStorage.setItem('lrm_user',JSON.stringify(actor));
        localStorage.setItem('lrm_locale',locale);
      }, {actor,locale});
      const mutations = [];
      await context.route('**/api/**', async route => {
        const {pathname,searchParams} = new URL(route.request().url());
        let data = [];
        if (pathname==='/api/auth/me') data=actor;
        else if (['/api/auth/session','/api/auth/activity'].includes(pathname)) {
          data={idleExpiresAt:deadline,expiresAt:endAt,idleTimeoutSeconds:600};
        } else if (pathname==='/api/bookings') {
          const filter=searchParams.get('filter');
          const items=filter==='HISTORY'?records.filter(record=>record.status==='CANCELLED'):records;
          data={items,pagination:{page:1,pageSize:20,total:items.length,totalPages:1},
            summary:{total:5,byStatus:{CONFIRMED:2,CHECKED_OUT:1,PENDING_APPROVAL:1,CANCELLED:1},pendingPayment:1,history:1,overdue:0,asOf:new Date().toISOString()}};
        } else if (/^\/api\/bookings\/record-\d$/.test(pathname)) data=records.find(record=>pathname.endsWith(record.id));
        else if (pathname==='/api/notifications/unread-count') data={unread:0};
        if (route.request().method()!=='GET' && !pathname.startsWith('/api/auth/')) mutations.push(pathname);
        await route.fulfill({json:data});
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`${base}/workspace/bookings?filter=ALL`);
      const list=page.locator('.operations-list'), card=list.locator('[data-booking-id="record-0"] .operation-card-select');
      await card.waitFor();
      assert.equal(await list.locator('.operation-card').count(),5);
      assert.equal(await page.locator('.booking-view-switch,.booking-kanban,.operations-dossier-col,.operations-queue-snapshot').count(),0);
      const columns=await list.evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length);
      assert.equal(columns>1,width>600);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      if (role==='CUSTOMER') await list.locator('[data-booking-id="record-3"] [role="timer"]').waitFor();
      if (shots) await page.screenshot({path:join(shots,`bookings-${role}-${width}.png`)});
      await card.focus();
      await page.keyboard.press('Enter');
      const dossier=page.locator('.operations-dossier-col');
      await dossier.locator('.operations-dossier-close').waitFor();
      await page.waitForFunction(()=>document.activeElement?.classList.contains('operations-dossier-col'));
      assert.equal(new URL(page.url()).searchParams.get('booking'),'record-0');
      assert.equal(await card.getAttribute('aria-pressed'),'true');
      if (shots && role==='LAB_STAFF') await page.screenshot({path:join(shots,`booking-detail-${width}.png`)});
      await dossier.locator('.operations-dossier-close').click();
      await dossier.waitFor({state:'detached'});
      await page.waitForFunction(()=>document.activeElement?.closest('[data-booking-id]')?.getAttribute('data-booking-id')==='record-0');
      const history=page.locator('.operations-filter-btn').filter({hasText:locale==='vi'?'Lịch sử':'History'});
      await history.click();
      await list.locator('[data-booking-id="record-4"]').waitFor();
      assert.equal(await list.locator('.operation-card').count(),1);
      assert.equal(new URL(page.url()).searchParams.get('filter'),'HISTORY');
      assert.deepEqual(mutations,[]);
      assert.deepEqual(errors,[]);
      variants++;
      await context.close();
    }
  }
  console.log(`Booking records passed in ${variants} browser variants with isolated API fixtures.`);
} finally {
  await browser.close();
}
