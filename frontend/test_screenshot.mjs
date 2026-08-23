import { chromium } from "playwright-core";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log("Navigating to http://localhost:5174 ...");
  await page.goto("http://localhost:5174", { waitUntil: "networkidle", timeout: 10000 });

  await page.screenshot({ path: "screenshot_verified.png" });
  console.log("Screenshot saved to screenshot_verified.png");
  await browser.close();
}

main().catch(console.error);
