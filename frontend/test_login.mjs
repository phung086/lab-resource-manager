import { chromium } from "playwright-core";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on("console", (msg) => {
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on("pageerror", (err) => {
    console.log(`[BROWSER PAGE ERROR]:`, err.stack || err.message);
  });

  console.log("Navigating to http://localhost:5173 ...");
  await page.goto("http://localhost:5173", { waitUntil: "networkidle", timeout: 10000 });

  // Fill login
  await page.fill('input[type="email"], input[name="email"]', 'admin@lab.local');
  await page.fill('input[type="password"]', 'AdminPass123!');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshot_dashboard.png" });
  console.log("Screenshot saved to screenshot_dashboard.png");

  // Click Đặt Khung Giờ Mới
  const bookingBtn = page.locator('button:has-text("Đặt Khung Giờ Mới")').first();
  if (await bookingBtn.isVisible()) {
    console.log("Clicking '+ Đặt Khung Giờ Mới' button...");
    await bookingBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "screenshot_modal.png" });
    console.log("Screenshot saved to screenshot_modal.png");

    const vietQrBtn = page.locator('button:has-text("Thanh Toán VietQR")').first();
    if (await vietQrBtn.isVisible()) {
      console.log("Clicking 'Thanh Toán VietQR' button...");
      await vietQrBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: "screenshot_vietqr.png" });
      console.log("Screenshot saved to screenshot_vietqr.png");
    }
  }

  await browser.close();
}

main().catch(console.error);
