import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

// Isolated browser contract fixtures. No requests reach a real API or database.
const base = process.env.UI_BASE_URL || "http://127.0.0.1:5173";
const screenshots = process.env.UI_SCREENSHOT_DIR || "logs/resource-catalogue";
mkdirSync(screenshots, { recursive: true });
const vi = JSON.parse(readFileSync(new URL("./src/locales/catalog/vi.json", import.meta.url))).messages;
const lab = { id: "lab-qa", code: "QA", name: "LAB kiểm thử", isActive: true, labPolicy: { workDayStartHour: 8, workDayEndHour: 20, minBookingMinutes: 15, maxBookingMinutes: 480, maxAdvanceBookingDays: 30, allowWeekend: true, requiresApproval: true } };
const student = { id: "student-qa", fullName: "Sinh viên kiểm thử", role: "CUSTOMER", email: "catalogue@example.test", isActive: true };
const resources = [
  ["qa-1", "ROOM", "ROOM", "Phòng kiểm thử A"], ["qa-2", "ROOM", "ROOM", "Phòng kiểm thử B"],
  ["qa-3", "EQUIPMENT", "CAMERA", "Camera kiểm thử"], ["qa-4", "EQUIPMENT", "OTHER", "Nguồn kiểm thử"],
  ["qa-5", "EQUIPMENT", "GPU_SERVER", "Máy trạm kiểm thử"], ["qa-6", "MACHINE", "OTHER", "Máy kiểm thử"],
  ["qa-7", "EXPERIMENT_KIT", "KIT", "Bộ kiểm thử"], ["qa-8", "MATERIAL", "MATERIAL", "Vật tư kiểm thử"],
  ["qa-9", null, "ROOM", "Tài nguyên chưa phân loại"],
].map(([id, category, subtype, name]) => ({ id, code: id.toUpperCase(), category, subtype, name, description: "Hồ sơ kiểm thử giao diện, không phải tài sản thực tế.", laboratoryId: lab.id, laboratory: lab, labPolicy: lab.labPolicy, location: lab.name, capacity: category === "ROOM" ? 24 : 1, operationalStatus: id === "qa-4" ? "MAINTENANCE" : "AVAILABLE", availability: { state: id === "qa-4" ? "UNAVAILABLE" : "AVAILABLE" }, bookingState: "bookable", effectiveRequiresApproval: true, media: [], trainingRequirements: [], specs: { environment: "LOCAL_DEMO", technical: { resolution: "24 MP", includedAccessories: ["Cáp kiểm thử", "Giá đỡ kiểm thử"], sensor: { format: "APS-C", stabilisation: false } }, usageGuide: { beforeUse: ["Kiểm tra cùng cán bộ."], steps: ["Theo tài liệu đúng model."], afterUse: ["Kiểm tra khi trả."], safetyNotes: "Hướng dẫn kiểm thử." } } }));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, headless: true, args: ["--no-sandbox"] });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [], requests = [];
  let pricingFailed = false;
  let historyMode = 'denied';
  let saveFailure = true;
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/catalogue-fixture-*.svg", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#dceee8"/><circle cx="300" cy="200" r="90" fill="#5c4692"/></svg>' }));
  resources.find(row => row.id === "qa-3").media = [1, 2].map(index => ({ id: `media-${index}`, kind: "IMAGE", url: `${base}/catalogue-fixture-${index}.svg`, title: `Ảnh kiểm thử ${index}`, altText: `Ảnh kiểm thử ${index}` }));
  await page.route("**/api/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace(/^\/api/, "");
    requests.push({ path, method: request.method() });
    let data = [];
    if (path === "/auth/login") data = { accessToken: "catalogue-ui-fixture", user: student };
    else if (path === "/auth/me") data = student;
    else if (path === "/auth/session" || path === "/auth/activity") data = {idleExpiresAt:new Date(Date.now()+3600000).toISOString(),expiresAt:new Date(Date.now()+7200000).toISOString(),idleTimeoutSeconds:3600};
    else if (path === "/laboratories") data = [lab];
    else if (path === "/resources") data = resources.filter(row => (!url.searchParams.get("category") || row.category === url.searchParams.get("category")) && (url.searchParams.get("classification") !== "UNRESOLVED" || row.category == null) && (!url.searchParams.get("search") || row.name.toLowerCase().includes(url.searchParams.get("search").toLowerCase())));
    else if (/^\/resources\/qa-\d+$/.test(path)) data = resources.find(row => row.id === path.split("/").at(-1));
    else if (path.endsWith("/schedule")) data = { bookings: [], maintenanceWindows: [] };
    else if (path.endsWith("/history")) {
      if(historyMode !== 'success') return route.fulfill({status:historyMode === 'denied' ? 403 : 503,contentType:'application/json',body:JSON.stringify({error:historyMode === 'denied' ? 'FORBIDDEN' : 'API_REQUEST_FAILED'})});
      data={timeline:[{id:'fixture-maintenance',source:'maintenance_window',eventType:'MAINTENANCE_RECORDED',timestamp:'2026-10-28T03:00:00Z',reference:{maintenanceWindowId:'fixture-job'},actor:{fullName:'Nhân viên kiểm thử'},data:{title:'Hiệu chuẩn camera kiểm thử',status:'scheduled'}}]};
    }
    else if(path === '/dashboard') data={summary:{pendingApprovalCount:0,activeBookingsCount:0,checkedOutCount:0,openIncidentCount:0,totalResources:9,unreadNotifications:0},upcomingBookings:[]};
    else if(path === '/maintenance' && request.method()==='POST') {
      if(saveFailure) return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'API_REQUEST_FAILED'})});
      data={id:'created-fixture'};
    }
    else if(path === '/maintenance/impact') data={conflicts:[]};
    else if(path === '/maintenance') data=[3,4].map(index=>({id:`job-${index}`,resourceId:`qa-${index}`,resource:resources.find(r=>r.id===`qa-${index}`),title:`Maintenance ${index}`,kind:'maintenance',status:'scheduled',updatedAt:'2026-10-28T03:00:00Z',startAt:'2026-10-29T02:00:00Z',endAt:'2026-10-29T04:00:00Z'}));
    else if (path.startsWith("/booking-pricing/")) {
      if (pricingFailed) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "API_REQUEST_FAILED" }) });
      data = [{ id: "price-qa", purposeCode: "STUDY", label: "Giá kiểm thử", hourlyRateVnd: 75000 }];
    }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
  });
  await page.goto(`${base}/login`);
  await page.locator('input[type=email]').fill(student.email);
  await page.locator('input[type=password]').fill('IsolatedFixturePassword!');
  await page.locator('button[type=submit]').click();
  await page.locator('.sidebar-2026').waitFor();
  await page.goto(`${base}/workspace/resources/qa-3`);
  await page.locator('.resource-profile-hero').waitFor();
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:`${screenshots}/${process.env.CAPTURE_PHASE||'after'}-detail-${width}.png`,fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  assert.equal(requests.filter(r=>r.path.endsWith('/history')).length,0);
  assert.equal(await page.locator('.resource-operations-strip').count(),0,'Customer has no staff work links');
  await page.locator('[aria-controls="history-heading"]').click();
  await page.getByText(vi['refine.historyScope'],{exact:true}).waitFor();
  assert.equal(await page.locator('.resource-history-list').count(),0);
  student.role='LAB_STAFF'; historyMode='failed';
  await page.evaluate(user=>sessionStorage.setItem('lrm_user',JSON.stringify(user)),student);
  await page.reload(); await page.locator('.resource-operations-strip').waitFor();
  assert.ok((await page.locator('.resource-operations-strip a').first().getAttribute('href')).includes('resource=qa-3'));
  await page.locator('[aria-controls="history-heading"]').click();
  await page.locator('.resource-history-panel [role=alert]').waitFor();
  historyMode='success';
  await page.locator('.resource-history-panel [role=alert] button').click();
  await page.locator('.resource-history-list [role=listitem]').waitFor();
  assert.ok((await page.locator('.resource-history-list a').getAttribute('href')).includes('job=fixture-job'));
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.resource-history-panel').evaluate(el=>getComputedStyle(el).animationName),'none');
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
    await page.screenshot({path:`${screenshots}/after-history-${width}.png`,fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.locator('.header-2026').getByRole('button',{name:'EN',exact:true}).click();
  await page.getByText('Resource operations',{exact:true}).waitFor();
  assert.ok((await page.locator('.resource-operations-strip').innerText()).includes('Resource operations'));
  assert.equal(/ui\.dossier\./.test(await page.locator('main').innerText()),false);
  await page.goto(`${base}/workspace/resources/qa-3?catalogueGroup=EQUIPMENT&search=Camera`);
  await page.locator('.resource-operations-strip a[href*="/maintenance"]').click();
  await page.locator('.maintenance-resource-context').waitFor();
  assert.equal(new URL(page.url()).searchParams.get('search'),'Camera');
  assert.equal(await page.locator('.maintenance-job').count(),1,'Only selected resource jobs');
  await page.locator('#maintenance-status').selectOption('all');
  await page.locator('#maintenance-search').fill('Maintenance');
  await page.locator('.maintenance-job').click();
  await page.reload();
  await page.locator('#maintenance-dossier-title').waitFor();
  assert.equal(await page.locator('#maintenance-status').inputValue(),'all');
  assert.equal(await page.locator('#maintenance-search').inputValue(),'Maintenance');
  assert.equal(new URL(page.url()).searchParams.get('job'),'job-3');
  await page.locator('.maintenance-heading button').click();
  assert.equal(await page.locator('#maintenance-resourceId').inputValue(),'qa-3','Planner prefills resource');
  await page.locator('.maintenance-resource-context a').click();
  await page.locator('.resource-profile-hero').waitFor();
  assert.equal(new URL(page.url()).pathname,'/workspace/resources/qa-3');
  assert.equal(new URL(page.url()).searchParams.get('search'),'Camera');
  assert.equal(new URL(page.url()).searchParams.get('catalogueGroup'),'EQUIPMENT');
  await page.locator('.resource-operations-strip a[href*="/maintenance"]').click();
  await page.locator('#maintenance-dossier-title').waitFor();
  assert.equal(await page.locator('#maintenance-status').inputValue(),'all');
  assert.equal(await page.locator('#maintenance-search').inputValue(),'Maintenance');
  assert.equal(new URL(page.url()).searchParams.get('job'),'job-3','Explicit round trip preserves selected job');
  await page.goBack(); await page.locator('.resource-profile-hero').waitFor();
  await page.goBack(); await page.locator('#maintenance-dossier-title').waitFor();
  assert.equal(await page.locator('#maintenance-search').inputValue(),'Maintenance');
  await page.locator('.maintenance-resource-context button').click();
  assert.equal(await page.locator('.maintenance-job').count(),2);
  await page.goBack(); await page.locator('.maintenance-resource-context').waitFor();
  assert.equal(await page.locator('.maintenance-job').count(),1);
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000}); await page.evaluate(()=>window.scrollTo(0,0));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`${screenshots}/maintenance-context-${width}.png`,fullPage:true});
  }
  assert.deepEqual(errors,[]);
  await page.goto(`${base}/workspace/maintenance?resource=qa-4&job=job-3`);
  await page.locator('.maintenance-resource-context').waitFor();
  await page.locator('.maintenance-job').waitFor();
  assert.equal(await page.locator('#maintenance-dossier-title').count(),0,'A job for another resource is not shown as the scoped selection');
  await page.locator('.maintenance-heading button').click();
  await page.locator('#maintenance-title').fill('Khôi phục bản nháp sau sự cố');
  await page.locator('#maintenance-notes').fill('Nội dung dài cần được giữ nguyên khi trình duyệt đóng.');
  await page.reload(); await page.locator('.maintenance-draft-notice').waitFor();
  assert.equal(await page.locator('#maintenance-title').count(),0,'Restore requires explicit choice');
  await page.locator('.maintenance-draft-notice .primary-button').click();
  assert.equal(await page.locator('#maintenance-title').inputValue(),'Khôi phục bản nháp sau sự cố');
  assert.ok((await page.locator('#maintenance-notes').inputValue()).includes('trình duyệt đóng'));
  await page.locator('#maintenance-startAt').fill('2026-11-10T09:00');
  await page.locator('#maintenance-endAt').fill('2026-11-10T10:00');
  await page.locator('.maintenance-impact button').last().click();
  await page.locator('.maintenance-form-actions button').click();
  await page.locator('.maintenance-error').waitFor();
  assert.equal(await page.locator('#maintenance-title').inputValue(),'Khôi phục bản nháp sau sự cố','Failed save retains text');
  await page.reload(); await page.locator('.maintenance-draft-notice').waitFor();
  await page.locator('.maintenance-draft-notice .primary-button').click();
  assert.equal(await page.locator('.maintenance-form-actions button').isDisabled(),true,'Restored draft must recheck impact');
  saveFailure=false;
  await page.locator('.maintenance-impact button').last().click();
  await page.locator('.maintenance-form-actions button').click();
  await page.locator('.maintenance-notice').waitFor();
  assert.equal(await page.locator('.maintenance-draft-notice').count(),0,'Successful save clears draft');
  await page.locator('.maintenance-heading button').click();
  await page.locator('#maintenance-title').fill('Bản nháp riêng tài khoản');
  const firstActor=student.id; student.id='other-staff';
  await page.evaluate(user=>sessionStorage.setItem('lrm_user',JSON.stringify(user)),student);
  await page.reload(); await page.locator('.maintenance-heading').waitFor();
  assert.equal(await page.locator('.maintenance-draft-notice').count(),0,'Other account cannot restore draft');
  student.id=firstActor;
  await page.evaluate(user=>sessionStorage.setItem('lrm_user',JSON.stringify(user)),student);
  await page.reload(); await page.locator('.maintenance-draft-notice').waitFor();
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000}); await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:`${screenshots}/draft-recovery-${width}.png`,fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.locator('.maintenance-draft-notice .secondary-button').click();
  await page.reload(); await page.locator('.maintenance-heading').waitFor();
  assert.equal(await page.locator('.maintenance-draft-notice').count(),0,'Explicit discard persists');
  console.log('PASS: desktop/mobile, customer/staff, lazy history, denied/error/retry, exact work links, reduced motion, EN, no overflow/page errors');
} finally { await browser.close(); }
