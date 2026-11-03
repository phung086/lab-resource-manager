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
].map(([id, category, subtype, name]) => ({ id, code: id.toUpperCase(), category, subtype, name, description: "Hồ sơ kiểm thử giao diện, không phải tài sản thực tế.", laboratoryId: lab.id, laboratory: lab, labPolicy: lab.labPolicy, location: lab.name, capacity: category === "ROOM" ? 24 : 1, operationalStatus: id === "qa-4" ? "MAINTENANCE" : "AVAILABLE", availability: { state: id === "qa-4" ? "UNAVAILABLE" : "AVAILABLE" }, bookingState: "bookable", effectiveRequiresApproval: false, rental: { hourlyRateVnd: id === "qa-2" ? 0 : 75000 }, media: [], trainingRequirements: [], specs: { environment: "LOCAL_DEMO", technical: { resolution: "24 MP", includedAccessories: ["Cáp kiểm thử", "Giá đỡ kiểm thử"], sensor: { format: "APS-C", stabilisation: false } }, usageGuide: { beforeUse: ["Kiểm tra cùng cán bộ."], steps: ["Theo tài liệu đúng model."], afterUse: ["Kiểm tra khi trả."], safetyNotes: "Hướng dẫn kiểm thử." } } }));

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
  let preflightFailure = true;
  let failGuestQuote = false;
  let bookingQuoteAmount = 0;
  let historyMode = 'denied';
  let saveFailure = true;
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/catalogue-fixture-*.svg", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#dceee8"/><circle cx="300" cy="200" r="90" fill="#5c4692"/></svg>' }));
  resources.find(row => row.id === "qa-3").media = [1, 2].map(index => ({ id: `media-${index}`, kind: "IMAGE", url: `${base}/catalogue-fixture-${index}.svg`, title: `Ảnh kiểm thử ${index}`, altText: `Ảnh kiểm thử ${index}` }));
  await page.route("**/api/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace(/^\/api/, "");
    requests.push({ path, method: request.method() });
    let data = [];
    if(path==='/booking-pricing/quote' && failGuestQuote) return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'API_REQUEST_FAILED'})});
    if(path==='/booking-pricing/quote')return route.fulfill({contentType:'application/json',body:JSON.stringify({amountVnd:bookingQuoteAmount,version:'a11y-fixture',loyaltyPolicyVersion:'none'})});
    if(path==='/bookings/preflight' && preflightFailure) return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:{code:'BOOKING_CONFLICT',message:'api.BOOKING_CONFLICT'}})});
    if(path==='/bookings/preflight')return route.fulfill({contentType:'application/json',body:JSON.stringify({ready:true,quote:{amountVnd:bookingQuoteAmount,version:'a11y-fixture',loyaltyPolicyVersion:'none'}})});
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
  await page.locator('input[type=email]').fill(student.email);await page.locator('input[type=password]').fill('IsolatedFixturePassword!');
  await page.locator('button[type=submit]').click();await page.locator('.sidebar-2026').waitFor();
  const findings=[];
  async function scan(label){
    const issues=await page.evaluate(()=>{
      const visible=el=>el.checkVisibility()&&!el.closest('[inert],[hidden],[aria-hidden="true"]');
      const text=el=>(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')?.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ')||[...(el.labels||[])].map(x=>x.textContent).join(' ')||el.getAttribute('title')||((el.tagName==='BUTTON'||el.tagName==='A')?el.textContent:'')||'').trim();
      return [...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea')].filter(visible).filter(el=>!text(el)).map(el=>el.outerHTML.slice(0,150));
    });findings.push({label,unnamed:issues,contrast:await page.evaluate(contrastScan)});
  }
  for(const locale of ['vi','en']) for(const width of [1440,390]){
    await page.evaluate(locale=>localStorage.setItem('lrm_locale',locale),locale);
    await page.setViewportSize({width,height:1000});
    await page.goto(`${base}/workspace/resources`);await page.locator('.resource-catalogue-card').first().waitFor();await scan(`catalogue-${width}`);
    await page.locator('.resource-catalogue-name').first().click();await page.locator('.resource-profile-hero').waitFor();await scan(`detail-${width}`);
    await page.goto(`${base}/workspace/support`);await page.locator('.support-request textarea').waitFor();await scan(`support-${width}`);
    await page.locator('.support-request textarea').fill('Kiểm tra lỗi gửi hỗ trợ bằng bàn phím');
    await page.waitForFunction(()=>!document.querySelector('.support-request button[type=submit]')?.disabled);
    await page.locator('.support-request button[type=submit]').focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.activeElement?.matches('.support-page>.alert.danger'));
    assert.equal(await page.locator('.support-request textarea').inputValue(),'Kiểm tra lỗi gửi hỗ trợ bằng bàn phím');
    await page.goto(`${base}/workspace/incidents`);await page.locator('.incident-heading button').click();await page.locator('#inc-title').waitFor();await scan(`report-${width}`);
    await page.locator('#inc-title').fill('Test');await page.locator('form').filter({has:page.locator('#inc-title')}).locator('button[type=submit]').click();
    await page.waitForFunction(()=>document.activeElement?.id==='inc-resource');
    await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
    assert.equal(await page.locator('.incident-heading button').evaluate(el=>document.activeElement===el),true,'Escape restores report trigger');
    await page.goto(`${base}/workspace/calendar?resource=qa-3`);await page.locator('.planner-views button').nth(1).click();await page.locator('.planner-week-context button').click();
    const dialog=page.getByRole('dialog');await dialog.waitFor();await scan(`booking-${width}`);
    const visible=dialog.locator('button:visible:not([disabled]),a:visible,input:visible:not([disabled]),select:visible:not([disabled]),textarea:visible:not([disabled])');
    // A DOM match can still be disabled through its parent fieldset.
    const focusable=await visible.evaluateAll(elements=>elements.filter(el=>!el.matches(':disabled')&&el.tabIndex>=0).map(el=>{el.dataset.a11yFocus='true';return el.tagName;}));
    assert.ok(focusable.length>0);
    const last=dialog.locator('[data-a11y-focus=true]').last();await last.focus();await page.keyboard.press('Tab');
    assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true,'Forward Tab remains inside dialog');
    await dialog.locator('[data-a11y-focus=true]').first().focus();await page.keyboard.press('Shift+Tab');
    assert.equal(await last.evaluate(el=>document.activeElement===el),true,'Reverse Tab wraps to last enabled visible control');
    await page.locator('#booking-title').fill('Kiểm tra đặt lịch bằng bàn phím');
    await page.locator('#booking-contact-phone').fill('0900000000');
    await page.locator('#booking-date').fill(new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}));
    await page.locator('#booking-start-time').fill('09:00');await page.locator('#booking-end-time').fill('11:00');
    const messages = JSON.parse(readFileSync(new URL(`./src/locales/catalog/${locale}.json`, import.meta.url))).messages;
    const badge=dialog.locator('.booking-approval-badge');
    await page.waitForFunction(label=>document.querySelector('.booking-approval-badge')?.textContent.includes(label),messages['ui.immediate_confirmation_6313fc02']);
    assert.ok((await dialog.locator('#booking-resource-select option:checked').innerText()).includes(messages['ui.immediate_e80f0a67'].trim()),'A zero quote overrides a positive catalogue rate');
    bookingQuoteAmount=75000;
    await page.locator('#booking-end-time').fill('12:00');
    await page.waitForFunction(label=>document.querySelector('.booking-approval-badge')?.textContent.includes(label),messages['ui.confirmed_after_payment_2c477063']);
    assert.ok((await dialog.locator('#booking-resource-select option:checked').innerText()).includes(messages['ui.confirmed_after_payment_suffix_ac8e62f6']),'Paid quote updates the selected option');
    assert.ok(!(await badge.innerText()).includes(messages['ui.immediate_confirmation_6313fc02']),'Paid booking never promises immediate confirmation');
    bookingQuoteAmount=0;
    await page.locator('#booking-end-time').fill('11:00');
    await page.waitForFunction(label=>document.querySelector('.booking-approval-badge')?.textContent.includes(label),messages['ui.immediate_confirmation_6313fc02']);
    const submit=dialog.locator('button[type=submit]');await submit.focus();
    await page.waitForFunction(()=>!document.querySelector('[role=dialog] button[type=submit]')?.disabled);
    if(preflightFailure){
      await page.keyboard.press('Enter');await page.locator('.booking-submit-error').waitFor();
      await page.waitForFunction(()=>document.activeElement?.classList.contains('booking-submit-error'));
      assert.equal(await page.locator('#booking-title').inputValue(),'Kiểm tra đặt lịch bằng bàn phím','Conflict preserves title');
      assert.equal(await page.locator('.booking-submit-error').isVisible(),true);
      preflightFailure=false;await submit.focus();
    }
    await page.keyboard.press('Enter');await page.locator('#booking-review-heading').waitFor();
    await page.waitForFunction(()=>document.activeElement?.id==='booking-review-heading');
    await scan(`booking-review-${width}`);
    const reviewLast=dialog.locator('button:visible:not([disabled])').last();await reviewLast.focus();await page.keyboard.press('Tab');
    assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true,'Tab trapped after edit fields become hidden');
    assert.equal(await page.locator('.planner-week-context button').evaluate(el=>Boolean(el.closest('[inert]'))),true,'Background is inert');
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
    assert.equal(await page.locator('.planner-week-context button').evaluate(el=>Boolean(el.closest('[inert]'))),false,'Inert released on close');
    assert.equal(await page.locator('.planner-week-context button').evaluate(el=>document.activeElement===el),true,'Focus restored on close');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`${screenshots}/customer-calendar-${locale}-${width}.png`,fullPage:true});
  }
  failGuestQuote=true;
  await page.evaluate(()=>{sessionStorage.clear();localStorage.setItem('lrm_locale','vi');});
  await page.goto(`${base}/resources`);
  await page.locator('.catalog-cover').first().click();
  await page.locator('.catalog-guest-booking summary').click();
  const guest=page.locator('.guest-booking-panel');
  await guest.locator('#guest-booking-date').fill(new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}));
  await guest.locator('#guest-booking-title').fill('');
  await guest.locator('button[type=submit]').click();
  await guest.locator('#guest-step-error').waitFor();
  assert.equal(await guest.locator('#guest-booking-title').getAttribute('aria-invalid'),'true');
  await guest.locator('.guest-error-edit').click();
  assert.equal(await guest.locator('#guest-booking-title').evaluate(el=>el===document.activeElement),true);
  await guest.locator('#guest-booking-title').fill('Guest feedback test');
  await guest.locator('.quote-error button').waitFor();
  failGuestQuote=false;await guest.locator('.quote-error button').click();
  await guest.locator('.guest-booking-quote strong').waitFor();
  assert.equal(await guest.locator('#guest-booking-title').inputValue(),'Guest feedback test','Quote retry preserves title');
  assert.equal((await guest.locator('.badge-approval').innerText()).trim(),vi['ui.automatic_confirmation_under_policy_bfbbda9a'],'Guest zero quote does not claim a payment is required');
  await guest.locator('button[type=submit]').click();
  await guest.locator('#guest-full-name').waitFor();
  await guest.locator('#guest-full-name').fill('Guest Test');
  await guest.locator('#guest-email').fill('wrong-address');
  await guest.locator('button[type=submit]').click();
  assert.equal(await guest.locator('#guest-email').getAttribute('aria-invalid'),'true');
  await guest.locator('.guest-error-edit').click();
  assert.equal(await guest.locator('#guest-email').evaluate(el=>el===document.activeElement),true);
  assert.equal(await guest.locator('#guest-full-name').inputValue(),'Guest Test');
  assert.equal(requests.filter(row=>row.path==='/guest-booking/book').length,0);
  assert.equal((await guest.innerText()).includes('ui.lab_room_'),false,'Guest labels resolve locale keys');
  await guest.screenshot({path:`${screenshots}/guest-validation.png`});
  console.log(JSON.stringify({findings,errors},null,2));
  assert.ok(findings.every(x=>!x.unnamed.length),'All visible controls have labels');assert.deepEqual(errors,[]);
  assert.ok(findings.every(x=>!x.contrast.length),'Solid-background text meets measured contrast thresholds');
  assert.equal(requests.filter(row=>row.method==='POST'&&row.path==='/bookings').length,0,'Review alone never creates a booking');
}finally{await browser.close();}
