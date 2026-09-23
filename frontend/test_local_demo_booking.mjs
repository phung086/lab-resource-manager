import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs";
const output = "screenshots_temp_productization_review";
const browser = await chromium.launch({ headless:true });
const page = await browser.newPage({ viewport:{width:1440,height:900} });
try {
  await page.goto("http://127.0.0.1:15179",{waitUntil:"networkidle"});
  await page.locator("input[type=email]").fill("student@lrm.local");
  await page.locator("input[type=password]").first().fill("LabDemo!2026Pass");
  await page.getByRole("button",{name:/ĐĂNG NHẬP VÀO HỆ THỐNG/i}).click();
  await page.getByRole("button",{name:"Trợ lý AI",exact:true}).click();
  await page.getByLabel("Câu hỏi cho trợ lý").fill("Tìm lịch trống LOCAL-ROOM-01");
  await page.getByRole("button",{name:"Gửi câu hỏi"}).click();
  await page.getByRole("button",{name:"Mở form đặt lịch",exact:true}).first().waitFor();
  await page.screenshot({path:`${output}/ai_slot_result.png`});
  await page.getByRole("button",{name:"Mở form đặt lịch",exact:true}).first().click();
  await page.locator("#booking-title").fill("Buổi thực hành điện tử — Local Demo");
  await page.locator("#booking-purpose").fill("Thực hành đo kiểm mạch điện; lịch được tạo qua giao diện bằng tài khoản demo.");
  await page.getByRole("button",{name:"Xác nhận đặt lịch",exact:true}).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({path:`${output}/student_booking.png`,animations:"disabled"});
  if (process.env.CAPTURE_ONLY !== "true") {
  const response = page.waitForResponse(r=>r.url().endsWith("/api/bookings") && r.request().method()==="POST");
  await page.getByRole("button",{name:"Xác nhận đặt lịch",exact:true}).click();
  const result=await response;
  assert.equal(result.status(),201);
  const booking=await result.json();
  assert.equal(booking.status,"PENDING_APPROVAL");
  await page.getByRole("button",{name:"Xem khoản thanh toán của lịch đặt"}).waitFor();
  await page.screenshot({path:`${output}/student_booking_created.png`});
  await page.getByRole("button",{name:"Xem khoản thanh toán của lịch đặt"}).click();
  await page.getByText("Chưa có yêu cầu thanh toán phù hợp.",{exact:true}).waitFor();
  fs.writeFileSync(`${output}/local_demo_booking.json`,JSON.stringify({bookingId:booking.id,status:booking.status,source:"Real UI booking using student@lrm.local; no payment charge automatically created"},null,2));
  console.log("Local demo ROOM booking via assistant prefill + canonical form PASS; payment remains optional");
  }
} finally {await browser.close();}
