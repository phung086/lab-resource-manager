import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const out = new URL("./screenshots_temp_productization_review/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", error => failures.push(error.message));
async function shot(name) {
  await page.waitForTimeout(400);
  await page.waitForFunction(() => !/Đang tải|Đang tìm tài nguyên/.test(document.body.innerText));
  await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, out)), animations: "disabled" });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow: ${name}`);
}
const base = "http://127.0.0.1:15179";
async function nav(text) { await page.locator(".sidebar-nav-item-2026", { hasText: text }).click(); await page.waitForLoadState("networkidle"); }
try {
  await page.goto(base, { waitUntil: "networkidle" });
  for (const [name, width, height] of [["desktop",1440,900],["laptop",1280,800],["tablet",768,1024],["mobile",390,844]]) {
    await page.setViewportSize({ width, height }); await page.evaluate(() => scrollTo(0,0)); await shot(`landing_${name}`);
  }
  await page.setViewportSize({ width:1440,height:900 });
  for (const [name, selector] of [["features","#tinh-nang"],["workflow","#quy-trinh"],["roles","#vai-tro"],["ai_payment","#tro-ly"],["footer",".public-footer"]]) {
    await page.locator(selector).scrollIntoViewIfNeeded(); await shot(`landing_${name}`);
  }
  await page.locator(".public-login").click(); await shot("login_from_landing");
  await page.getByRole("button", { name: "Tạo tài khoản", exact:true }).click(); await shot("register_from_landing");
  await page.locator(".public-auth-back").click();
  for (const role of ["student","staff","admin"]) {
    await page.locator("input[type=email]").fill(`${role}@lrm.local`);
    await page.locator("input[type=password]").first().fill("LabDemo!2026Pass");
    await page.getByRole("button",{name:/ĐĂNG NHẬP VÀO HỆ THỐNG/i}).click();
    await page.locator(".workspace-home").waitFor(); await page.waitForLoadState("networkidle"); await shot(`${role}_home`);
    if (role === "student") {
      await nav("Danh mục tài nguyên"); await shot("student_resources");
      await nav("Lịch Đặt Khung Giờ"); await shot("student_calendar");
      await page.getByRole("button",{name:"Trợ lý AI",exact:true}).click(); await shot("ai_assistant");
      await page.locator("#assistant-question").fill("Tìm phòng LAB"); await page.getByRole("button",{name:"Gửi câu hỏi"}).click();
      await page.locator(".assistant-resource-result").first().waitFor(); await shot("ai_resource_result");
      await page.setViewportSize({width:390,height:844}); await shot("ai_mobile");
      await page.setViewportSize({width:1440,height:900}); await page.getByRole("button",{name:"Đóng trợ lý",exact:true}).click();
    } else if (role === "staff") { await nav("Vận Hành Booking"); await shot("staff_operations"); }
    else { await nav("Quản trị người dùng"); await shot("admin_users"); await nav("Quản lý tài nguyên"); await shot("admin_resources"); }
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await page.goto(base, {waitUntil:"networkidle"});
  }
  assert.deepEqual(failures,[]);
  console.log("Productization captures and overflow checks PASS");
} finally { await browser.close(); }
