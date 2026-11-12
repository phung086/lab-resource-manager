import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.UI_BASE_URL || 'http://localhost:5173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const browser = await chromium.launch({ channel: process.env.UI_BROWSER_CHANNEL || 'msedge' });

try {
  const page = await browser.newPage({ colorScheme: 'dark', viewport: { width: 390, height: 850 } });
  await page.clock.install({ time: new Date('2026-11-11T08:02:03.000Z') });
  await page.goto(base);
  const themeToggle = page.locator('.studio-theme-toggle');
  const clock = page.locator('time.project-footer-clock');
  const theme = () => page.locator('html').getAttribute('data-theme');
  const flags = page.locator('.public-header .studio-language-flag');
  await themeToggle.waitFor();
  assert.equal(await theme(), 'dark');
  assert.equal(await flags.count(), 2);
  await page.waitForFunction(() => [...document.querySelectorAll('.public-header .studio-language-flag')].every(flag => flag.naturalWidth > 0));
  assert.match(await clock.innerText(), /^15:02:\d{2}$/);
  const previous = await clock.getAttribute('datetime');
  await page.clock.runFor(1100);
  assert.ok(Date.parse(await clock.getAttribute('datetime')) > Date.parse(previous));

  await themeToggle.click();
  assert.equal(await theme(), 'light');
  await page.locator('.public-header .studio-language').getByRole('button', { name: 'EN', exact: true }).click();
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  await page.goto(new URL('/login', base).href);
  await themeToggle.waitFor();
  assert.equal(await theme(), 'light');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  await themeToggle.focus();
  await page.keyboard.press('Enter');
  assert.equal(await theme(), 'dark');
  await page.reload();
  await themeToggle.waitFor();
  assert.equal(await theme(), 'dark');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  console.log('System preference, theme persistence, VI/EN flags, keyboard and footer clock passed');
} finally {
  await browser.close();
}
