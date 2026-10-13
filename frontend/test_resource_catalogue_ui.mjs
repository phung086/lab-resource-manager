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
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace(/^\/api/, "");
    requests.push({ path, method: request.method() });
    let data = [];
    if (path === "/auth/login") data = { accessToken: "catalogue-ui-fixture", user: student };
    else if (path === "/auth/me") data = student;
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
  await page.goto(`${base}/login`);
  await page.locator("input[type=email]").fill(student.email);
  await page.locator("input[type=password]").fill("IsolatedFixturePassword!");
  await page.locator("button[type=submit]").click();
  await page.locator(".sidebar-2026").waitFor();
  await page.goto(`${base}/workspace/resources`);
  const cards = page.locator(".resource-catalogue-card"), groups = page.locator(".resource-catalogue-groups");
  await cards.first().waitFor();
  check(await cards.count() === 5, "Equipment group includes machines and experiment kits");
  for (const [width, columns] of [[1440, 3], [1108, 3], [768, 2], [375, 1]]) {
    await page.setViewportSize({ width, height: 1000 });
    check(await page.locator(".resource-catalogue-grid").evaluate((el, count) => getComputedStyle(el).gridTemplateColumns.split(" ").length === count, columns), `Columns at ${width}`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No page overflow at ${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const positions = await cards.evaluateAll(elements => elements.slice(0, 4).map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })));
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
  await groups.getByRole("button", { name: /^Vật tư/ }).click();
  check(await cards.count() === 2, "Unresolved resources remain discoverable");
  check((await cards.allTextContents()).some(value => value.includes("Chưa phân loại")), "Unresolved category never inferred from ROOM subtype");
  await groups.getByRole("button", { name: /^Thiết bị/ }).click();
  await page.getByRole("button", { name: vi["refine.searchFilters"] }).click();
  await page.locator(".resource-search-field input").fill("Camera");
  await page.waitForFunction(() => document.querySelectorAll(".resource-catalogue-card").length === 1);
  await cards.first().locator(".resource-catalogue-name").click();
  await page.locator(".resource-profile-hero").waitFor();
  await page.locator(".resource-pricing-rules").waitFor();
  const detailText = await page.locator(".resource-detail-page").innerText();
  check(detailText.includes("APS-C") && detailText.includes("Giá đỡ kiểm thử") && !detailText.includes("[object Object]"), "Nested specifications and arrays render fully");
  check(detailText.includes(vi["ui.catalogue.sampleNote"]) && detailText.includes(vi["ui.catalogue.sampleGuide"]), "Sample profiles and guides are marked");
  check(!requests.some(row => row.path.endsWith("/history")), "Private history is requested on demand");
  await page.locator(".resource-profile-nav a[href='#specs-heading']").click();
  check(await page.locator("#specs-heading").evaluate(el => el.getBoundingClientRect().top >= 75 && el.getBoundingClientRect().top < 180), "Section link clears fixed header");
  await page.locator("[aria-labelledby=history-heading] button").click();
  await page.getByText(vi["refine.historyScope"], { exact: true }).waitFor();
  check(await page.getByText(vi["ui.no_history_events_recorded_8a049a1a"], { exact: true }).count() === 0, "Denied history is not shown as empty history");
  await page.setViewportSize({ width: 375, height: 1000 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Detail fits mobile");
  await page.locator(".resource-profile-hero").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${screenshots}/detail-mobile.png`, animations: "disabled" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.getByRole("heading", { name: "Technical specifications", exact: true }).waitFor();
  check(await page.locator(".resource-specifications").innerText().then(value => value.includes("Accessories / included items")), "Specification labels switch to EN");
  await page.getByRole("button", { name: "VI", exact: true }).click();
  await page.locator(".back-button").click();
  await cards.first().waitFor();
  check(await page.locator(".resource-search-field input").inputValue() === "Camera" && await cards.count() === 1, "Search survives detail/back and locale switching");
  pricingFailed = true;
  await cards.first().locator(".resource-catalogue-name").click();
  await page.locator("[aria-labelledby=pricing-heading] [role=alert]").waitFor();
  check(await page.getByText(vi["ui.catalogue.noPricing"], { exact: true }).count() === 0, "Failed pricing is not presented as unconfigured or free");
  check((await page.locator("[aria-labelledby=schedule-heading]").innerText()).includes(vi["ui.resourceDiscovery.emptySchedule"]), "Schedule is independent of pricing failure");
  pricingFailed = false;
  await page.locator("[aria-labelledby=pricing-heading] button").click();
  await page.locator(".resource-pricing-rules").waitFor();
  check((await page.locator(".resource-pricing-rules").innerText()).includes("75.000"), "Pricing retry loads actual response");
  check(!requests.some(row => row.method !== "GET" && row.path !== "/auth/login"), "Browsing sends no resource, booking, payment or history mutations");
  check(errors.length === 0, "No browser runtime errors");
  console.log(JSON.stringify({ checks, errors, type: "Isolated browser contract fixtures; not database integration" }));
} finally { await browser.close(); }
