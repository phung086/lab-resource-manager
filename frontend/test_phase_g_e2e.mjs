import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, "screenshots_phase_g_final");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const BASE_URL = "http://127.0.0.1:15179";

async function run() {
  console.log("=== PHASE G E2E VERIFICATION & SCREENSHOT CAPTURE ===");
  const browser = await chromium.launch({ headless: true });
  
  try {
    // 1. PUBLIC CATALOG & GUEST BOOKING WIZARD FLOW (Desktop 1440x960)
    console.log("Testing Public Catalog & Guest Wizard at 1440x960...");
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await desktopContext.newPage();
    
    await page.goto(`${BASE_URL}/#catalog`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    
    // Screenshot: catalog desktop
    await page.screenshot({ path: path.join(screenshotsDir, "catalog_desktop.png") });
    console.log("Captured catalog_desktop.png");

    // Click on first resource "Xem lịch & đặt"
    const ctaBtn = page.locator(".catalog-card-cta").first();
    await ctaBtn.scrollIntoViewIfNeeded();
    await ctaBtn.click();
    await page.waitForTimeout(600);

    // Verify Resource Detail modal with Eligibility
    const detailSection = page.locator(".catalog-detail");
    await detailSection.waitFor({ state: "visible" });
    assert.ok(await detailSection.locator(".catalog-eligibility-verdict").isVisible(), "Eligibility section must be visible");
    
    // Screenshot: resource detail
    await detailSection.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(screenshotsDir, "resource_detail.png") });
    console.log("Captured resource_detail.png");

    // Scroll to Guest Quick Booking Panel
    const guestPanel = page.locator(".guest-booking-panel");
    await guestPanel.waitFor({ state: "visible" });
    await guestPanel.scrollIntoViewIfNeeded();

    // Verify Guest Step 1: Resource & Booking
    assert.ok(await page.locator(".guest-wizard-step.is-active", { hasText: "Tài nguyên & Lịch đặt" }).isVisible());

    // Screenshot: guest step 1
    await page.screenshot({ path: path.join(screenshotsDir, "guest_step1.png") });
    console.log("Captured guest_step1.png");

    // Fill purpose and click "Tiếp tục"
    await page.locator("input#guest-booking-title").fill("Thí nghiệm cơ học và cảm biến");
    await page.locator("input#guest-booking-purpose").fill("Nghiên cứu hợp tác học thuật");
    const nextBtn1 = page.locator("button.guest-wizard-btn.next", { hasText: "Tiếp tục" });
    await nextBtn1.click();
    await page.waitForTimeout(500);

    // Verify Guest Step 2: Customer Information
    assert.ok(await page.locator(".guest-wizard-step.is-active", { hasText: "Thông tin người đặt" }).isVisible());

    // Fill Step 2 fields
    await page.locator("input#guest-full-name").fill("Nguyễn Văn Khách");
    await page.locator("input#guest-email").fill("guest.test@example.com");
    await page.locator("input#guest-phone").fill("0901234567");
    await page.locator("input#guest-organization").fill("Đại học Bách Khoa");

    // Fill address selector
    await page.locator("select#address-province").selectOption({ index: 1 });
    await page.waitForTimeout(300);
    await page.locator("select#address-ward").selectOption({ index: 1 });
    await page.locator("input#address-line").fill("123 Đường Nguyễn Trãi");

    // Screenshot: guest step 2
    await page.screenshot({ path: path.join(screenshotsDir, "guest_step2.png") });
    console.log("Captured guest_step2.png");

    // Test Step 2 back button preserving state
    const backBtn1 = page.locator("button.guest-wizard-btn.prev", { hasText: "Quay lại" });
    await backBtn1.click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator("input#guest-booking-title").inputValue(), "Thí nghiệm cơ học và cảm biến", "Step 1 state preserved");

    // Forward to Step 2 again
    await page.locator("button.guest-wizard-btn.next", { hasText: "Tiếp tục" }).click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator("input#guest-full-name").inputValue(), "Nguyễn Văn Khách", "Step 2 state preserved");

    // Advance to Step 3 (triggers send OTP)
    const nextBtn2 = page.locator("button.guest-wizard-btn.next", { hasText: "Tiếp tục sang bước OTP" });
    await nextBtn2.click();
    await page.waitForTimeout(800);

    // Verify Guest Step 3: OTP & Final Review
    assert.ok(await page.locator(".guest-wizard-step.is-active", { hasText: "Xác thực OTP & Chốt lịch" }).isVisible());
    assert.ok(await page.locator(".guest-review-card").isVisible(), "Review card must be visible in step 3");
    assert.ok(await page.locator("input#guest-otp-input").isVisible(), "OTP input must be visible in step 3");

    // Screenshot: guest step 3
    await page.screenshot({ path: path.join(screenshotsDir, "guest_step3.png") });
    console.log("Captured guest_step3.png");

    await desktopContext.close();

    // 2. MOBILE CATALOG (390x844)
    console.log("Testing Public Catalog at 390x844...");
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${BASE_URL}/#catalog`, { waitUntil: "networkidle" });
    await mobilePage.waitForTimeout(600);

    // Check no horizontal overflow
    const hasCatalogOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(hasCatalogOverflow, false, "Mobile catalog must have no whole-page horizontal overflow");

    // Screenshot: catalog mobile
    await mobilePage.screenshot({ path: path.join(screenshotsDir, "catalog_mobile.png") });
    console.log("Captured catalog_mobile.png");
    await mobileContext.close();

    // 3. LOGGED-IN SCREENS: USER OVERVIEW & PROFILE (1440x960)
    console.log("Testing Logged-in screens as student...");
    const authContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const authPage = await authContext.newPage();
    
    // Login as student
    await authPage.goto(`${BASE_URL}/#dang-nhap`, { waitUntil: "networkidle" });
    await authPage.locator('input[type="email"]').fill("student@lrm.local");
    await authPage.locator('input[type="password"]').first().fill("LabDemo!2026Pass");
    await authPage.getByRole("button", { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click();
    await authPage.waitForTimeout(1000);

    // Verify User Overview (WorkspaceHome)
    await authPage.locator(".workspace-home").waitFor({ state: "visible" });
    assert.ok(await authPage.locator("#priority-upcoming-title").isVisible(), "Upcoming booking priority 1 must be visible");
    assert.ok(await authPage.locator("#priority-approval-title").isVisible(), "Approval priority 2 must be visible");
    assert.ok(await authPage.locator("#priority-training-title").isVisible(), "Training priority 3 must be visible");
    assert.ok(await authPage.locator("#priority-return-title").isVisible(), "Return due priority 4 must be visible");
    assert.ok(await authPage.locator("#priority-incident-title").isVisible(), "Incident priority 5 must be visible");
    assert.ok(await authPage.locator("#priority-notices-title").isVisible(), "Notices priority 6 must be visible");

    // Screenshot: user overview
    await authPage.screenshot({ path: path.join(screenshotsDir, "user_overview.png") });
    console.log("Captured user_overview.png");

    // Navigate to Profile
    await authPage.goto(`${BASE_URL}/#/workspace/ho-so`, { waitUntil: "networkidle" });
    await authPage.waitForTimeout(800);
    const profilePage = authPage.locator(".profile-page");
    await profilePage.waitFor({ state: "visible" });

    // Verify Profile Hierarchy 1 to 7
    assert.ok(await authPage.locator("#section-identity-title").isVisible(), "1. Identity must be visible");
    assert.ok(await authPage.locator("#section-security-title").isVisible(), "2. Security must be visible");
    assert.ok(await authPage.locator("#section-access-title").isVisible(), "3. Access classification must be visible");
    assert.ok(await authPage.getByText("customerTypeSemantics = SELF_DECLARED_UNVERIFIED").isVisible(), "customerTypeSemantics must be explicit");
    assert.ok(await authPage.locator("#section-training-title").isVisible(), "4. Training must be visible");
    assert.ok(await authPage.locator("#section-contact-title").isVisible(), "5. Contact must be visible");
    assert.ok(await authPage.locator("#section-booking-title").isVisible(), "6. Booking summary must be visible");
    assert.ok(await authPage.locator("#section-loyalty-title").isVisible(), "7. Loyalty commercial must be last");

    // Screenshot: profile
    await authPage.screenshot({ path: path.join(screenshotsDir, "profile.png") });
    console.log("Captured profile.png");

    await authContext.close();

    // 4. ADMIN USER & OPERATIONS AS ADMIN
    console.log("Testing Admin screens...");
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const adminPage = await adminContext.newPage();
    await adminPage.goto(`${BASE_URL}/#dang-nhap`, { waitUntil: "networkidle" });
    await adminPage.locator('input[type="email"]').fill("admin@lrm.local");
    await adminPage.locator('input[type="password"]').first().fill("LabDemo!2026Pass");
    await adminPage.getByRole("button", { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click();
    await adminPage.waitForTimeout(1000);

    // Operations Dashboard
    await adminPage.goto(`${BASE_URL}/#/workspace/van-hanh`, { waitUntil: "networkidle" });
    await adminPage.waitForTimeout(800);
    assert.ok(await adminPage.getByRole("heading", { name: "Bảng điều khiển vận hành" }).isVisible());
    assert.ok(await adminPage.getByRole("heading", { name: "Mức sử dụng 30 ngày" }).isVisible());

    // Screenshot: operations
    await adminPage.screenshot({ path: path.join(screenshotsDir, "operations.png") });
    console.log("Captured operations.png");

    // Admin Users
    await adminPage.goto(`${BASE_URL}/#/workspace/nguoi-dung`, { waitUntil: "networkidle" });
    await adminPage.waitForTimeout(800);
    assert.ok(await adminPage.getByRole("heading", { name: /Quản trị người dùng/i }).isVisible());

    // Screenshot: admin users
    await adminPage.screenshot({ path: path.join(screenshotsDir, "admin_users.png") });
    console.log("Captured admin_users.png");

    await adminContext.close();

    // 5. MOBILE TELEMETRY (390x844)
    console.log("Testing Mobile Telemetry at 390x844...");
    const mobileStaffContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobileStaffPage = await mobileStaffContext.newPage();
    await mobileStaffPage.goto(`${BASE_URL}/#dang-nhap`, { waitUntil: "networkidle" });
    await mobileStaffPage.locator('input[type="email"]').fill("staff@lrm.local");
    await mobileStaffPage.locator('input[type="password"]').first().fill("LabDemo!2026Pass");
    await mobileStaffPage.getByRole("button", { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click();
    await mobileStaffPage.waitForTimeout(1000);

    // Open telemetry
    await mobileStaffPage.goto(`${BASE_URL}/#/workspace/telemetry`, { waitUntil: "networkidle" });
    await mobileStaffPage.waitForTimeout(800);
    assert.ok(await mobileStaffPage.getByRole("heading", { name: "Giám sát telemetry" }).isVisible());

    // Check no horizontal overflow
    const hasTelemetryOverflow = await mobileStaffPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(hasTelemetryOverflow, false, "Mobile telemetry must have no horizontal overflow");

    // Screenshot: telemetry mobile
    await mobileStaffPage.screenshot({ path: path.join(screenshotsDir, "telemetry_mobile.png") });
    console.log("Captured telemetry_mobile.png");

    await mobileStaffContext.close();

    console.log("ALL PHASE G BROWSER VERIFICATIONS PASSED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Browser verification failed:", err);
  process.exit(1);
});
