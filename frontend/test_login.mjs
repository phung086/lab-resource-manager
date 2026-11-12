import { chromium } from 'playwright-core';

const role = process.env.USER_ROLE ?? 'admin';
const lang = process.env.LANG ?? 'en';

const creds = {
  admin: { email: 'admin@lab.local', password: '***' },
  lab_staff: { email: 'staff@lab.local', password: '***' },
  customer: { email: 'customer@lab.local', password: '***' }
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });
  page.on('pageerror', err => {
    console.log('[BROWSER PAGE ERROR]:', err.stack || err.message);
  });

  console.log(`Navigating to http://localhost:5173/?lang=${lang} ...`);
  await page.goto(`http://localhost:5173/?lang=${lang}`, { waitUntil: 'networkidle', timeout: 10000 });

  // Login
  await page.fill('input[type="email"], input[name="email"]', creds[role].email);
  await page.fill('input[type="password"]', creds[role].password);
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2000);

  // Screenshots
  await page.screenshot({ path: `screenshots/${role}_${lang}_home.png`, fullPage: true });

  const bookingBtn = page.locator('button:has-text("Đặt Khung Giờ Mới")').first();
  if (await bookingBtn.isVisible()) {
    await bookingBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `screenshots/${role}_${lang}_booking.png` });
    const vietQrBtn = page.locator('button:has-text("Thanh Toán VietQR")').first();
    if (await vietQrBtn.isVisible()) {
      await vietQrBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `screenshots/${role}_${lang}_vietqr.png` });
    }
  }

  await browser.close();
}

main().catch(console.error);
