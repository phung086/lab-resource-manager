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
    if(['/support/sessions','/incidents'].includes(path)&&request.method()==='POST')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'API_REQUEST_FAILED'})});
    if(path==='/support/metadata')return route.fulfill({contentType:'application/json',body:JSON.stringify({laboratories:[lab],presence:null,quickReplies:[]})});
    if(path==='/support/sessions')return route.fulfill({contentType:'application/json',body:JSON.stringify({items:[],summary:{},pagination:{page:1,total:0,totalPages:0}})});
    if(path==='/incidents')return route.fulfill({contentType:'application/json',body:JSON.stringify({items:[],pagination:{page:1,total:0,totalPages:0,pageSize:20},summary:{total:0,open:0,resolved:0,byStatus:{}}})});
    if(path==='/calendar/events')return route.fulfill({contentType:'application/json',body:JSON.stringify({events:[]})});
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
  await page.locator('button[type=submit]').click(); await page.locator('.sidebar-2026').waitFor();
  await page.goto(`${base}/workspace/support`);
  await page.locator('.support-request textarea').fill('Xin hỗ trợ, giữ lại nội dung đang viết.');
  await page.reload(); await page.locator('.local-draft-notice').waitFor();
  await page.locator('.local-draft-notice button').first().click();
  assert.equal(await page.locator('.support-request textarea').inputValue(),'Xin hỗ trợ, giữ lại nội dung đang viết.');
  await page.locator('.support-request button[type=submit]').click();
  await page.locator('.support-page>.alert.danger').waitFor();
  assert.equal(await page.locator('.support-request textarea').inputValue(),'Xin hỗ trợ, giữ lại nội dung đang viết.');
  await page.goto(`${base}/workspace/incidents`);
  await page.locator('.incident-heading button').click();
  await page.locator('#inc-title').fill('Camera có dấu hiệu lỗi');
  await page.locator('#inc-resource').selectOption('qa-3');
  await page.locator('#inc-description').fill('Nội dung báo cáo cần khôi phục đầy đủ.');
  await page.reload(); await page.locator('.local-draft-notice').waitFor();
  await page.locator('.local-draft-notice button').first().click();
  assert.equal(await page.locator('#inc-title').inputValue(),'Camera có dấu hiệu lỗi');
  assert.equal(await page.locator('#inc-description').inputValue(),'Nội dung báo cáo cần khôi phục đầy đủ.');
  await page.locator('form').filter({has:page.locator('#inc-title')}).locator('button[type=submit]').click();
  await page.getByRole('dialog').getByRole('alert').waitFor();
  assert.equal(await page.locator('#inc-title').inputValue(),'Camera có dấu hiệu lỗi');
  await page.goto(`${base}/workspace/calendar?view=week&resource=qa-3`);
  await page.locator('.planner-views button').nth(1).click();
  await page.locator('.planner-week-context button').waitFor();
  await page.locator('.planner-week-context button').click();
  await page.locator('#booking-title').fill('Bản nháp lịch của khách hàng');
  await page.locator('#booking-purpose').fill('Thực hành thị giác máy tính');
  await page.reload();
  await page.locator('.planner-views button').nth(1).click();
  await page.locator('.planner-week-context button').click();
  await page.locator('#quick-booking-form .local-draft-notice button').first().click();
  assert.equal(await page.locator('#booking-title').inputValue(),'Bản nháp lịch của khách hàng');
  assert.equal(await page.locator('#booking-purpose').inputValue(),'Thực hành thị giác máy tính');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('lrm.form-draft.v1:student-qa:customer-booking')));
  assert.deepEqual(Object.keys(saved.draft).sort(),['resourceId','selectedDate','startTime','endTime','title','purpose','purposeCode','uncertain'].sort());
  assert.equal(requests.filter(r=>r.method==='POST'&&['/support/sessions','/incidents'].includes(r.path)).length,2,'Only explicit user submissions were attempted');
  assert.equal(requests.filter(r=>r.method==='POST'&&r.path==='/bookings').length,0,'Restoring a booking never submits');
  await page.evaluate(async()=>{const store=await import('/src/utils/localDraftStore.ts');const key='lrm.form-draft.v1:student-qa:customer-booking';const value=JSON.parse(localStorage.getItem(key));value.draft.title='Bản nháp mới từ cửa sổ khác';value.savedAt=Date.now();store.writeLocalDraft(key,value);});
  await page.locator('#quick-booking-form .local-draft-notice button').first().click();
  assert.equal(await page.locator('#booking-title').inputValue(),'Bản nháp mới từ cửa sổ khác','Mounted instances see latest shared draft');
  await page.evaluate(()=>{const key='lrm.form-draft.v1:student-qa:customer-booking';const value=JSON.parse(localStorage.getItem(key));value.draft.uncertain='true';localStorage.setItem(key,JSON.stringify(value));});
  await page.reload(); await page.locator('.planner-views button').nth(1).click();await page.locator('.planner-week-context button').click();
  await page.locator('#quick-booking-form .local-draft-notice button').first().click();
  await page.getByText(vi['ui.resourceSelection.uncertain'],{exact:true}).first().waitFor();
  assert.deepEqual(errors,[]);
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000}); await page.screenshot({path:`${screenshots}/booking-draft-${width}.png`,fullPage:true});}
  console.log('PASS shared drafts: support, incident, booking reload/restore, whitelisted fields, no automatic submission');
}finally{await browser.close();}
