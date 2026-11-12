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

// A price configuration can also contain a zero rate; it must not imply payment.
Object.assign(resources.find(row=>row.id==='qa-1'),{effectiveRequiresApproval:false,rental:{hourlyRateVnd:75000}});
Object.assign(resources.find(row=>row.id==='qa-2'),{effectiveRequiresApproval:false,rental:{hourlyRateVnd:0}});

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, headless: true, args: ["--no-sandbox"] });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [], requests = [];
  let pricingFailed = false;
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/catalogue-fixture-*.svg", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#dceee8"/><circle cx="300" cy="200" r="90" fill="#5c4692"/></svg>' }));
  resources.find(row => row.id === "qa-3").media = [1, 2].map(index => ({ id: `media-${index}`, kind: "IMAGE", url: `${base}/catalogue-fixture-${index}.svg`, title: `Ảnh kiểm thử ${index}`, altText: `Ảnh kiểm thử ${index}` }));
  await page.route("**/api/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace(/^\/api/, "");
    requests.push({ path, method: request.method() });
    let data = [];
    if (path === "/auth/login") data = { accessToken: "catalogue-ui-fixture", user: student };
    else if (path === "/auth/me") data = student;
    else if (["/auth/session", "/auth/activity"].includes(path)) data = { createdAt: new Date().toISOString(), idleExpiresAt: new Date(Date.now()+3600000).toISOString(), expiresAt: new Date(Date.now()+7200000).toISOString(), idleTimeoutSeconds: 3600 };
    else if (path === "/laboratories") data = [lab];
    else if (path === "/resources") data = resources.filter(row => (!url.searchParams.get("category") || row.category === url.searchParams.get("category")) && (url.searchParams.get("classification") !== "UNRESOLVED" || row.category == null) && (!url.searchParams.get("search") || row.name.toLowerCase().includes(url.searchParams.get("search").toLowerCase())));
    else if (/^\/resources\/qa-\d+$/.test(path)) data = resources.find(row => row.id === path.split("/").at(-1));
    else if (path.endsWith("/schedule")) data = { bookings: [], maintenanceWindows: [] };
    else if (path.endsWith("/history")) return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "FORBIDDEN" }) });
    else if (path.startsWith("/booking-pricing/")) {
      if (pricingFailed) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "API_REQUEST_FAILED" }) });
      data = [{ id: "price-qa", purposeCode: "STUDY", label: "Giá kiểm thử", hourlyRateVnd: 75000 }];
    }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
  });
  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); checks++; };
  // Public explorer: no authentication or business writes.
  await page.goto(`${base}/resources`);
  await page.locator('.catalog-card').first().waitFor();
  const paidCard=page.locator('.catalog-card').filter({hasText:'Phòng kiểm thử A'});
  const zeroRateCard=page.locator('.catalog-card').filter({hasText:'Phòng kiểm thử B'});
  const readStatusStyle = node => { const style=getComputedStyle(node); return [style.backgroundColor,style.color,style.borderRadius,style.fontSize,style.padding]; };
  const publicStatusStyle = await paidCard.locator('.resource-status-pill').first().evaluate(readStatusStyle);
  check((await paidCard.innerText()).includes(vi['ui.confirmed_after_payment_2c477063']),'Paid catalogue resource explains payment before confirmation');
  check(!(await zeroRateCard.innerText()).includes(vi['ui.confirmed_after_payment_2c477063']),'Zero-rate catalogue resource does not claim payment is required');
  for (const width of [1440, 390]) {
    await page.setViewportSize({width,height:1000});
    const presentation = await paidCard.evaluate(card => {
      const cover = card.querySelector('.catalog-card-visual').getBoundingClientRect();
      const action = card.querySelector('.catalog-card-cta').getBoundingClientRect();
      return { titleSize:parseFloat(getComputedStyle(card.querySelector('h3')).fontSize), priceSize:parseFloat(getComputedStyle(card.querySelector('.rental-card-price')).fontSize), actionOnImage:action.top>=cover.top && action.bottom<=cover.bottom, bg:getComputedStyle(card.querySelector('.catalog-card-cta')).backgroundColor };
    });
    check(presentation.actionOnImage,`Public booking action stays on image at ${width}`);
    check(presentation.titleSize <= 16 && presentation.priceSize <= 16,`Public card typography stays compact at ${width}`);
    check(presentation.bg === 'rgb(37, 99, 235)',`Public booking action uses the shared primary color at ${width}`);
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Public catalogue does not overflow at ${width}`);
    await paidCard.locator('summary').focus(); await page.keyboard.press('Enter');
    check(await paidCard.locator('details').getAttribute('open') === '',`Public specifications open by keyboard at ${width}`);
    await page.keyboard.press('Space');
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('.catalog-card').first().waitFor();
  check(await page.locator('.catalog-card').count() === 6, 'Public catalogue initially limits visible records');
  await page.locator('.catalog-filters button').nth(2).click();
  await page.locator('.catalog-availability-toggle input').check();
  check(await page.locator('.catalog-card').count() === 2, 'Availability filter uses the current availability projection inside the selected category');
  await page.locator('.catalog-filter-reset').click();
  check(await page.locator('.catalog-card').count() === 6, 'Clearing facets restores the initial catalogue');
  await page.locator('.catalog-filters button').nth(1).click();
  check(await page.locator('.catalog-card').count() === 2, 'Public room filter selects only rooms');
  await page.locator('.catalog-search-label input').fill('qa-1');
  check(await page.locator('.catalog-card').count() === 1, 'Public search combines with category');
  await page.locator('.catalog-card-cta').click();
  await page.locator('.catalog-detail-heading').waitFor();
  check(await page.locator('.catalog-browser').isHidden(), 'Detail replaces the discovery list');
  await page.locator('.resource-profile-nav button').nth(1).hover();
  check(await page.locator('.resource-profile-nav button').first().getAttribute('aria-pressed') === 'true', 'Hover does not change public detail content');
  await page.locator('.resource-profile-nav button').nth(1).focus();
  check(await page.locator('.resource-profile-nav button').first().getAttribute('aria-pressed') === 'true', 'Keyboard focus does not change public detail content');
  await page.keyboard.press('Enter');
  check(await page.locator('.resource-profile-nav button').nth(1).getAttribute('aria-pressed') === 'true', 'Enter selects public specifications');
  await page.setViewportSize({width:390,height:844});
  check(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth), 'Public dossier fits mobile');
  await page.locator('.catalog-detail-heading > button').click();
  await page.waitForFunction(()=>document.activeElement?.classList.contains('catalog-card-cta'));
  check(await page.locator('.catalog-search-label input').inputValue() === 'qa-1', 'Return retains public search');
  check(await page.locator('.catalog-filters button').nth(1).getAttribute('aria-pressed') === 'true', 'Return retains public category');
  check(await page.locator('.catalog-card').count() === 1, 'Return retains public result');
  check(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth), 'Public explorer fits mobile');
  const finder = page.locator('.catalog-toolbar .resource-finder');
  const finderInput = finder.getByRole('combobox');
  await finderInput.fill('phong kiem thu a');
  await finder.getByRole('option').waitFor();
  await finderInput.press('ArrowDown');
  check(Boolean(await finderInput.getAttribute('aria-activedescendant')), 'Arrow keys select a suggestion from the loaded catalogue');
  await finderInput.press('Enter');
  await page.locator('.catalog-detail-heading').waitFor();
  check(await page.locator('.catalog-detail-heading').innerText().then(text => text.includes('QA-1')), 'Enter opens the exact resource from a Vietnamese query without accents');
  await page.locator('.catalog-detail-heading > button').click();
  await page.waitForFunction(()=>document.activeElement?.getAttribute('role') === 'combobox');
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(`${base}/login`);
  await page.locator("input[type=email]").fill(student.email);
  await page.locator("input[type=password]").fill("IsolatedFixturePassword!");
  await page.locator("button[type=submit]").click();
  await page.locator(".sidebar-2026").waitFor();
  await page.goto(`${base}/workspace/resources`);
  const cards = page.locator(".resource-catalogue-card"), groups = page.locator(".resource-catalogue-groups");
  await cards.first().waitFor();
  const workspaceStatusStyle = await cards.locator('.resource-status-pill.status-available').first().evaluate(readStatusStyle);
  check(JSON.stringify(publicStatusStyle) === JSON.stringify(workspaceStatusStyle),'Public and workspace resource states share the same presentation');
  const filterContrast = await page.locator('.catalogue-quick-filters').evaluate(group => {
    const rgb = value => value.match(/[\d.]+/g).map(Number);
    const luminance = color => color.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    const backing=rgb(getComputedStyle(group).backgroundColor);
    return [...group.querySelectorAll('button')].map(button=>{
      const style=getComputedStyle(button),overlay=rgb(style.backgroundColor),fg=luminance(rgb(style.color));
      const bg=luminance(overlay.slice(0,3).map((v,i)=>v*(overlay[3]??1)+backing[i]*(1-(overlay[3]??1))));
      return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
    });
  });
  check(filterContrast.every(ratio=>ratio>=4.5), 'Quick filter labels remain legible on the catalogue masthead');
  await page.screenshot({ path: `${screenshots}/catalogue-desktop.png`, animations: "disabled" });
  check(await cards.count() === 5, "Equipment group includes machines and experiment kits");
  for (const [width, columns] of [[1440, 3], [1108, 3], [768, 2], [375, 1]]) {
    await page.setViewportSize({ width, height: 1000 });
    check(await page.locator(".resource-catalogue-grid").evaluate((el, count) => getComputedStyle(el).gridTemplateColumns.split(" ").length === count, columns), `Columns at ${width}`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No page overflow at ${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  // Compare layout rows, independent of the intentional hover lift under the pointer.
  const positions = await cards.evaluateAll(elements => elements.slice(0, 4).map(el => ({ x: el.offsetLeft, y: el.offsetTop })));
  check(positions[0].y === positions[1].y && positions[1].y === positions[2].y && positions[3].y > positions[0].y, "Three cards per row");
  await groups.getByRole("button", { name: /^Phòng/ }).click();
  check(await cards.count() === 2, "Rooms are separate");
  check(new URL(page.url()).searchParams.get("catalogueGroup") === "ROOM", "Selecting a group updates its shareable URL");
  await page.reload();
  await cards.first().waitFor();
  check(await cards.count() === 2 && await groups.locator("button[aria-pressed=true]").innerText().then(value => value.startsWith("Phòng")), "Reload retains the chosen group");
  await cards.first().locator(".resource-catalogue-name").click();
  await page.locator(".resource-profile-hero").waitFor();
  check(new URL(page.url()).searchParams.get("catalogueGroup") === "ROOM", "Room context is in detail URL");
  await page.locator(".back-button").click();
  await cards.first().waitFor();
  check(await cards.count() === 2 && await groups.locator("button[aria-pressed=true]").innerText().then(value => value.startsWith("Phòng")), "Back retains room group");
  await cards.nth(1).locator('.resource-catalogue-name').click();
  await page.locator('.resource-profile-hero').waitFor();
  check(!(await page.locator('.resource-profile-hero').innerText()).includes(vi['ui.confirmed_after_payment_2c477063']), 'Zero-rate profile header does not imply a payment requirement');
  await page.locator('.back-button').click();
  await cards.nth(1).waitFor();
  await groups.getByRole("button", { name: /^Vật tư/ }).click();
  check(await cards.count() === 2, "Unresolved resources remain discoverable");
  check((await cards.allTextContents()).some(value => value.includes("Chưa phân loại")), "Unresolved category never inferred from ROOM subtype");
  await groups.getByRole("button", { name: /^Thiết bị/ }).click();
  await page.getByRole("button", { name: vi["refine.searchFilters"] }).click();
  await page.locator(".catalogue-quick-search input").fill("Camera");
  await page.waitForFunction(() => document.querySelectorAll(".resource-catalogue-card").length === 1);
  await cards.first().locator(".resource-catalogue-name").click();
  await page.locator(".resource-profile-hero").waitFor();
  await page.locator('.resource-profile-nav button[aria-controls="specs-heading"]').hover();
  check(await page.locator('[aria-labelledby="overview-heading"]').isVisible(), "Hover must not switch the active detail panel");
  await page.locator('.gallery-stepper button').last().click();
  check(await page.locator('.lab-gallery-choices button').nth(1).getAttribute('aria-pressed') === 'true', "Gallery next selects the next image");
  await page.locator('.gallery-stepper button').first().click();
  check(await page.locator('.lab-gallery-choices button').first().getAttribute('aria-pressed') === 'true', "Gallery previous restores the first image");
  await page.emulateMedia({ reducedMotion: 'reduce' });
  check(await page.locator('.gallery-frame').evaluate(el => getComputedStyle(el).animationName === 'none'), "Gallery respects reduced motion");
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('.resource-profile-nav button[aria-controls="specs-heading"]').click();
  await page.locator("#specs-heading").waitFor();
  await page.locator("#specs-heading").scrollIntoViewIfNeeded();
  check(await page.locator("#specs-heading").evaluate(() => { const top = document.querySelector("#specs-heading").getBoundingClientRect().top; const headerBottom = document.querySelector(".header-2026")?.getBoundingClientRect().bottom ?? 0; return top >= headerBottom && top < innerHeight; }), "Section navigation clears fixed header");
  const specsText = await page.locator("[aria-labelledby=specs-heading]").innerText();
  check(specsText.includes("APS-C") && specsText.includes("Giá đỡ kiểm thử") && !specsText.includes("[object Object]"), "Nested specifications and arrays render fully");
  await page.locator('.resource-profile-nav button[aria-controls="usage-heading"]').click();
  const usageText = await page.locator("[aria-labelledby=usage-heading]").innerText();
  check(usageText.includes(vi["ui.catalogue.sampleNote"]) && usageText.includes(vi["ui.catalogue.sampleGuide"]), "Sample profiles and guides are marked");
  check(!requests.some(row => row.path.endsWith("/history")), "Private history is requested on demand");
  await page.locator('.resource-profile-nav button[aria-controls="schedule-heading"]').click();
  await page.locator('[aria-controls="history-heading"]').click();
  await page.getByText(vi["refine.historyScope"], { exact: true }).waitFor();
  check(await page.getByText(vi["ui.no_history_events_recorded_8a049a1a"], { exact: true }).count() === 0, "Denied history is not shown as empty history");
  await page.setViewportSize({ width: 375, height: 1000 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Detail fits mobile");
  await page.locator(".resource-profile-hero").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${screenshots}/detail-mobile.png`, animations: "disabled" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.resource-profile-nav button[aria-controls="specs-heading"]').click();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.getByRole("heading", { name: "Technical specifications", exact: true }).waitFor();
  check(await page.locator(".resource-specifications").innerText().then(value => value.includes("Accessories / included items")), "Specification labels switch to EN");
  await page.getByRole("button", { name: "VI", exact: true }).click();
  await page.locator(".back-button").click();
  await cards.first().waitFor();
  check(await page.locator(".catalogue-quick-search input").inputValue() === "Camera" && await cards.count() === 1, "Search survives detail/back and locale switching");
  pricingFailed = true;
  await cards.first().locator(".resource-catalogue-name").click();
  await page.locator(".resource-profile-hero").waitFor();
  await page.locator('.resource-profile-nav button[aria-controls="pricing-heading"]').click();
  await page.locator("[aria-labelledby=pricing-heading] [role=alert]").waitFor();
  check(await page.getByText(vi["ui.catalogue.noPricing"], { exact: true }).count() === 0, "Failed pricing is not presented as unconfigured or free");
  await page.locator('.resource-profile-nav button[aria-controls="schedule-heading"]').click();
  check((await page.locator("[aria-labelledby=schedule-heading]").innerText()).includes(vi["ui.resourceDiscovery.emptySchedule"]), "Schedule is independent of pricing failure");
  pricingFailed = false;
  await page.locator('.resource-profile-nav button[aria-controls="pricing-heading"]').click();
  await page.locator("[aria-labelledby=pricing-heading] button").click();
  await page.locator("[aria-labelledby=pricing-heading] .rental-price").waitFor();
  check((await page.locator("[aria-labelledby=pricing-heading] .rental-price").innerText()).includes("75.000"), "Pricing retry loads actual response");
  check(!requests.some(row => row.method !== "GET" && row.path !== "/auth/login" && row.path !== "/auth/activity"), "Browsing sends no resource, booking, payment or history mutations");
  check(errors.length === 0, "No browser runtime errors");
  console.log(JSON.stringify({ checks, errors, type: "Isolated browser contract fixtures; not database integration" }));
} finally { await browser.close(); }
