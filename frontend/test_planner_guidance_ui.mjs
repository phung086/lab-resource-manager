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

function contrastScan(root = document.body) {
  const rgb = value => (value.match(/[\d.]+/g) || []).map(Number);
  const over = (fg, bg) => fg.slice(0, 3).map((v, i) => v * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)));
  const luminance = color => color.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const background = element => {
    const chain = [];
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== 'none') return null;
      chain.unshift(rgb(style.backgroundColor));
    }
    return chain.reduce((bg, fg) => over(fg, bg), [255, 255, 255]);
  };
  const result = [];
  for (const element of [root, ...root.querySelectorAll('*')]) {
    if (!element.checkVisibility() || element.closest('[disabled],[aria-hidden="true"],.sr-only,.visually-hidden')) continue;
    const style = getComputedStyle(element);
    if (+style.opacity === 0) continue;
    const text = [...element.childNodes].some(node => node.nodeType === 3 && node.textContent.trim());
    if (!text) continue;
    const bg = background(element);
    if (!bg) continue;
    const fg = over(rgb(style.color), bg), a = luminance(fg), b = luminance(bg);
    const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && +style.fontWeight >= 700);
    if (ratio < (large ? 3 : 4.5) - .02) result.push({ tag: element.tagName, class: element.className, ratio: +ratio.toFixed(2), foreground: style.color, background: bg.map(Math.round) });
  }
  return result;
}


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
    if(path==='/booking-pricing/quote')return route.fulfill({contentType:'application/json',body:JSON.stringify({amountVnd:0,version:'a11y-fixture',loyaltyPolicyVersion:'none'})});
    if(path==='/bookings/preflight')return route.fulfill({contentType:'application/json',body:JSON.stringify({ready:true,quote:{amountVnd:0,version:'a11y-fixture',loyaltyPolicyVersion:'none'}})});
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
  await page.locator('button[type=submit]').click();
  await page.locator('.sidebar-2026').waitFor();
  await page.goto(`${base}/workspace/calendar?resource=qa-3`);
  await page.locator('.planner-slot-panel:not([hidden])').waitFor();
  await page.locator('.planner-date-input input').fill(new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}));
  await page.locator('.planner-custom-time summary').click();
  const inputs=page.locator('.planner-custom-time input');
  await inputs.first().fill('07:00'); await inputs.last().fill('08:00');
  await page.locator('.planner-validation').waitFor();
  assert.ok((await page.locator('.planner-validation').innerText()).includes('08:00'));
  assert.equal(await page.locator('.planner-booking-actions .btn-primary').isDisabled(),true);
  await page.locator('.slot-ticket').screenshot({path:`${screenshots}/policy-warning.png`});
  await page.locator('.planner-validation button').click();
  assert.equal(await inputs.first().evaluate(el=>el===document.activeElement),true);
  await inputs.first().fill('09:00'); await inputs.last().fill('09:05');
  assert.ok((await page.locator('.planner-validation').innerText()).includes('15'));
  await inputs.last().fill('10:00');
  await page.locator('.planner-validation').waitFor({state:'hidden'});
  assert.equal(await page.locator('.planner-booking-actions .btn-primary').isEnabled(),true);
  await page.locator('.planner-step-context button').click();
  await page.locator('.planner-resource-card').first().waitFor();
  assert.ok(await page.locator('.planner-resource-photo img').count()>0);
  const card=page.locator('.planner-resource-card').filter({has:page.locator('small',{hasText:'QA-3'})});
  await card.locator('.btn-secondary').click();
  await page.locator('[role=dialog] .resource-specifications-grid').first().waitFor();
  assert.ok((await page.locator('[role=dialog]').innerText()).includes('APS-C'));
  await page.keyboard.press('Escape');
  await page.locator('[role=dialog]').waitFor({state:'hidden'});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`${screenshots}/resource-choice-mobile.png`,fullPage:true});
  await card.locator('.btn-primary').click();
  await page.locator('.planner-slot-panel:not([hidden])').waitFor();
  assert.equal(await inputs.first().inputValue(),'09:00');
  assert.equal(await inputs.last().inputValue(),'10:00');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
  assert.equal(requests.filter(r=>r.path==='/bookings'&&r.method==='POST').length,0);
  console.log(JSON.stringify({status:'PASS',scope:'Isolated planner policy guidance, image cards, preview, return context, mobile; no booking POST',errors}));
} finally { await browser.close(); }
