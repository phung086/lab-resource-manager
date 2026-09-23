import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

const target = new URL(process.env.DATABASE_URL || "http://missing");
assert.equal(target.hostname, "127.0.0.1");
assert.equal(target.port, "15436");
assert.match(target.pathname, /^\/lab_resources_open_lab_test_[a-z0-9_]+$/);
Object.assign(process.env, { NODE_ENV: "test", JWT_SECRET: "open-lab-isolated-test-secret-only", LOG_FORMAT: "dev", CORS_ORIGINS: "http://127.0.0.1:15181", PAYMENTS_ENABLED: "false", MCP_ASSISTANT_ENABLED: "false", RATE_LIMIT_MAX: "5000" });
const requireBackend = createRequire(new URL("../backend/package.json", import.meta.url));
const jwt = requireBackend("jsonwebtoken");
const { createApp } = await import("../backend/src/app.js");
const { prisma } = await import("../backend/src/db.js");
const server = createApp().listen(15006, "127.0.0.1");
await new Promise(resolve => server.once("listening", resolve));
const vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "15181", "--strictPort"], { cwd: new URL("./", import.meta.url), env: { ...process.env, VITE_API_BASE_URL: "http://127.0.0.1:15006/api", VITE_ENABLE_PAYMENT_FEATURES: "false" }, windowsHide: true, stdio: "ignore" });
const out = new URL("./screenshots_temp_open_lab/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
let browser;
try {
  let ready = false;
  for (let n = 0; n < 50; n++) {
    try { if ((await fetch("http://127.0.0.1:15181")).ok) { ready = true; break; } } catch { /* Startup only. */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, "Vite did not start");
  browser = await chromium.launch({ headless: true });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", error => errors.push(error.message));
  async function signIn(id, role, route) {
    const token = jwt.sign({ sub: id, role }, process.env.JWT_SECRET, { algorithm: "HS256" });
    await page.goto("http://127.0.0.1:15181");
    await page.evaluate(token => localStorage.setItem("lrm_token", token), token);
    await page.goto(`http://127.0.0.1:15181${route}`);
    await page.reload({ waitUntil: "networkidle" });
  }
  await signIn("admin", "ADMIN", "#dang-nhap");
  await page.locator(".workspace-home").waitFor();
  assert.match(page.url(), /#\/workspace\/tong-quan$/);
  await page.locator(".sidebar-nav-item-2026", { hasText: "Bảng Điều Khiển Vận Hành" }).click();
  await page.getByRole("heading", { name: "Mức sử dụng 30 ngày", exact: true }).waitFor();
  assert.match(page.url(), /#\/workspace\/van-hanh$/);
  assert.equal(await page.getByRole("heading", { name: "Trạng thái telemetry", exact: true }).count(), 0);
  await page.screenshot({ path: fileURLToPath(new URL("operations-desktop.png", out)), animations: "disabled" });
  await page.locator(".sidebar-nav-item-2026", { hasText: "Giám Sát Telemetry" }).click();
  await page.getByRole("heading", { name: "Trạng thái telemetry", exact: true }).waitFor();
  assert.equal(await page.getByRole("heading", { name: "Mức sử dụng 30 ngày", exact: true }).count(), 0);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Giám sát telemetry", exact: true }).waitFor();
  await page.goBack({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Mức sử dụng 30 ngày", exact: true }).waitFor();
  await page.goForward({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Trạng thái telemetry", exact: true }).waitFor();
  await page.screenshot({ path: fileURLToPath(new URL("telemetry-desktop.png", out)), animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: fileURLToPath(new URL("telemetry-mobile.png", out)), animations: "disabled" });

  const { transitionBooking, createBooking } = await import("../backend/src/services/bookingService.js");
  const booking = await createBooking({ requestedById: "other", resourceId: "room", title: "Browser self-return test", purpose: "Isolated test", startAt: new Date(Date.now() + 3600000), endAt: new Date(Date.now() + 7200000) });
  await transitionBooking({ bookingId: booking.id, toStatus: "CONFIRMED", actorId: "admin", actorRole: "ADMIN" });
  await transitionBooking({ bookingId: booking.id, toStatus: "CHECKED_OUT", actorId: "staff", actorRole: "LAB_STAFF", conditionBefore: "Browser fixture condition" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn("other", "LECTURER", `#/workspace/booking?booking=${booking.id}`);
  await page.getByRole("button", { name: "Trả phòng và hoàn tất", exact: true }).click();
  await page.locator("#booking-condition-evidence").fill("Đã rời phòng, tắt thiết bị, bàn ghế nguyên vẹn.");
  await page.screenshot({ path: fileURLToPath(new URL("self-return-evidence.png", out)), animations: "disabled" });
  await page.getByRole("button", { name: "Xác nhận trả phòng", exact: true }).click();
  await page.getByText(/Đã cập nhật booking.*hoàn tất/).waitFor();
  assert.equal((await prisma.booking.findUnique({ where: { id: booking.id } })).status, "COMPLETED");
  await page.getByRole("link", { name: "Xem tất cả lịch đặt" }).click();
  await page.getByRole("heading", { name: "Lịch đặt và tiến trình sử dụng của tôi" }).waitFor();
  await page.goto("http://127.0.0.1:15181/#/workspace/nguoi-dung", { waitUntil: "networkidle" });
  await page.waitForURL("**/#/workspace/lich-dat");
  assert.doesNotMatch(page.url(), /nguoi-dung$/);
  assert.deepEqual(errors, []);
  fs.writeFileSync(new URL("browser-results.json", out), JSON.stringify({ status: "PASS", checks: ["route login/navigation/reload/back/forward", "operations vs telemetry", "mobile overflow", "real owner ROOM return from UI", "booking deep link and clear", "role route guard"], pageErrors: errors }, null, 2));
  console.log("Open LAB operations browser checks PASS");
} finally {
  await browser?.close();
  vite.kill();
  server.close();
  await prisma.$disconnect();
}
