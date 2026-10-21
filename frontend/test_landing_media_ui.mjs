import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

// Read-only landing checks. Only media failures are injected; no business writes.
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
const mediaPath = '**/media/LAB-benefits-loop-v1.mp4';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, headless: true });
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };

async function expectAdvancing(page) {
  const start = await page.locator('.benefits-video').evaluate(video => video.currentTime);
  await page.waitForFunction(time => {
    const video = document.querySelector('.benefits-video');
    return video && !video.paused && !video.error && video.currentTime > time + 0.2;
  }, start);
  checks++;
}

try {
  for (const [locale, viewport] of [
    ['vi', { width: 1440, height: 900 }],
    ['en', { width: 375, height: 812 }],
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    await page.addInitScript(value => localStorage.setItem('lrm_locale', value), locale);
    let unavailable = true;
    let mediaRequests = 0;
    await page.route(mediaPath, route => {
      mediaRequests++;
      return unavailable ? route.abort('connectionrefused') : route.continue();
    });
    await page.goto(base);
    const control = page.locator('.benefits-video-control');
    await control.scrollIntoViewIfNeeded();
    check(await page.locator('html').getAttribute('lang') === locale, `${locale}: requested language is active`);
    await page.waitForFunction(() => document.querySelector('.benefits-video')?.error);
    const failedRequests = mediaRequests;
    await page.waitForTimeout(250);
    check(mediaRequests === failedRequests, `${locale}: failed media does not retry continuously`);

    unavailable = false;
    await control.click();
    await expectAdvancing(page);
    check(mediaRequests > failedRequests, `${locale}: resume reloads a failed source`);

    await control.click();
    await page.waitForFunction(() => document.querySelector('.benefits-video')?.paused);
    const pausedTime = await page.locator('.benefits-video').evaluate(video => video.currentTime);
    await page.waitForTimeout(300);
    check(await page.locator('.benefits-video').evaluate(video => video.currentTime) === pausedTime, `${locale}: pause holds the frame`);
    await control.click();
    await expectAdvancing(page);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale}: no horizontal overflow`);

    // A shared pause must not leave the earlier media failure blocking resume.
    unavailable = true;
    await page.reload();
    await control.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.benefits-video')?.error);
    await page.locator('.landing-motion-toggle').click();
    check(await page.locator('.landing-motion-toggle').getAttribute('aria-pressed') === 'true', `${locale}: shared motion is paused after media failure`);
    await control.scrollIntoViewIfNeeded();
    unavailable = false;
    await control.click();
    await expectAdvancing(page);
    await context.close();
  }

  const reducedContext = await browser.newContext({ reducedMotion: 'reduce' });
  const reducedPage = await reducedContext.newPage();
  reducedPage.setDefaultTimeout(10000);
  let reducedRequests = 0;
  reducedPage.on('request', request => { if (request.url().endsWith('/media/LAB-benefits-loop-v1.mp4')) reducedRequests++; });
  await reducedPage.goto(base);
  await reducedPage.locator('.benefits-video-static').scrollIntoViewIfNeeded();
  check(await reducedPage.locator('.benefits-video').count() === 0, 'Reduced motion keeps the static illustration');
  check(await reducedPage.locator('.benefits-video-control').count() === 0 && reducedRequests === 0, 'Reduced motion hides playback and does not load video');
  await reducedContext.close();
  console.log(`Landing media: ${checks} checks passed.`);
} finally {
  await browser.close();
}
