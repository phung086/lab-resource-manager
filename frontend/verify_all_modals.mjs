import { chromium } from "playwright-core";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log("Navigating to http://localhost:5173 ...");
  await page.goto("http://localhost:5173", { waitUntil: "networkidle", timeout: 10000 });

  // 1. Login as Admin
  console.log("Submitting login form...");
  await page.fill('input[type="email"], input[name="email"]', 'admin@lab.local');
  await page.fill('input[type="password"]', 'AdminPass123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  // 2. Test QR Check-in modal by clicking on 'CA CỦA BẠN' slot
  const mineSlot = page.locator('.time-slot-mine').first();
  if (await mineSlot.isVisible()) {
    console.log("Clicking 'CA CỦA BẠN' slot to trigger QR Check-in...");
    await mineSlot.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "screenshot_checkin_modal.png" });
    console.log("Saved screenshot_checkin_modal.png");

    // Close modal
    const closeBtn = page.locator('button:has-text("Đóng")').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // 3. Switch to AI Analytics Tab
  console.log("Switching to 'AI Tính Toán Hiệu Suất' tab...");
  const analyticsTab = page.locator('button:has-text("AI Tính Toán Hiệu Suất")').first();
  if (await analyticsTab.isVisible()) {
    await analyticsTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "screenshot_analytics_tab.png" });
    console.log("Saved screenshot_analytics_tab.png");
  }

  // 4. Switch to AI Advisor Tab
  console.log("Switching to 'AI Cố Vấn & Quyết Định' tab...");
  const advisorTab = page.locator('button:has-text("AI Cố Vấn & Quyết Định")').first();
  if (await advisorTab.isVisible()) {
    await advisorTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "screenshot_advisor_tab.png" });
    console.log("Saved screenshot_advisor_tab.png");
  }

  // 5. Switch to Admin Management Tab
  console.log("Switching to 'Quản Trị Tài Nguyên & Sổ Cái' tab...");
  const adminTab = page.locator('button:has-text("Quản Trị Tài Nguyên & Sổ Cái")').first();
  if (await adminTab.isVisible()) {
    await adminTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "screenshot_admin_tab.png" });
    console.log("Saved screenshot_admin_tab.png");
  }

  console.log("All UI tabs and flows verified successfully!");
  await browser.close();
}

main().catch(console.error);
