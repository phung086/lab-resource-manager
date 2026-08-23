import { chromium } from "playwright-core";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => {
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on("pageerror", (err) => {
    console.log(`[BROWSER PAGE ERROR]:`, err.stack || err.message);
  });

  console.log("Navigating to http://localhost:5174 ...");
  await page.goto("http://localhost:5174", { waitUntil: "networkidle", timeout: 10000 });

  const html = await page.content();
  console.log("Page HTML length:", html.length);
  await browser.close();
}

main().catch(console.error);
