import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.BATCH7_FRONTEND_URL || "http://127.0.0.1:8080";
const apiBase = `${baseUrl.replace(/\/$/, "")}/api`;
const adminEmail = process.env.BATCH7_ADMIN_EMAIL || "admin@demo.local";
const adminPassword = process.env.BATCH7_ADMIN_PASSWORD || "Batch7Admin!Passphrase";
const sharedPassword = "Batch7User!Passphrase";
const labId = "b7000000-0000-4000-8000-000000000003";
const screenshotDir = path.resolve("./screenshots_batch7");
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

async function api(pathname, { token, method = "GET", body } = {}) {
  const response = await fetch(`${apiBase}${pathname}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  let payload = null;
  if (response.status !== 204) {
    const text = await response.text();
    payload = text ? JSON.parse(text) : null;
  }
  return { status: response.status, body: payload };
}

async function loginApi(email, password) {
  const response = await api("/auth/login", {
    method: "POST",
    body: { email, password }
  });
  assert.equal(response.status, 200, `login failed for ${email}: ${JSON.stringify(response.body)}`);
  return response.body;
}

async function loginUi(page, email, password) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/auth/login") && response.status() === 200),
    page.getByRole("button", { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click()
  ]);
}

function futureVietnamTime(daysAhead, hour, minute = 0) {
  const vnReference = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(
    vnReference.getUTCFullYear(),
    vnReference.getUTCMonth(),
    vnReference.getUTCDate() + daysAhead,
    hour - 7,
    minute,
    0,
    0
  )).toISOString();
}

function resourcePayload(code, name, category, subtype, requiresApproval = true) {
  return {
    code,
    name,
    description: `Tài nguyên phục vụ kịch bản bảo vệ đồ án: ${name}`,
    laboratoryId: labId,
    category,
    subtype,
    operationalStatus: "AVAILABLE",
    bookingState: "bookable",
    location: "DEMO-LAB-A",
    ownerTeam: "Graduation Demo",
    capacity: 1,
    requiresApproval,
    specs: {}
  };
}

const browser = await chromium.launch({ headless: true });

try {
  console.log("=== BATCH 7 CLEAN GRADUATION DEMO ===");

  const adminLogin = await loginApi(adminEmail, adminPassword);
  const adminToken = adminLogin.accessToken;

  console.log("1. ADMIN CREATES USERS AND REPRESENTATIVE RESOURCES");
  const userDefinitions = [
    { email: "demo.student@lab.test", fullName: "Demo Student", role: "STUDENT" },
    { email: "demo.lecturer@lab.test", fullName: "Demo Lecturer", role: "LECTURER" },
    { email: "demo.staff@lab.test", fullName: "Demo Lab Staff", role: "LAB_STAFF" }
  ];

  const users = {};
  for (const definition of userDefinitions) {
    const response = await api("/users", {
      token: adminToken,
      method: "POST",
      body: { ...definition, password: sharedPassword }
    });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    users[definition.role] = response.body;
  }

  const assignment = await api(`/users/${users.LAB_STAFF.id}/lab-assignments`, {
    token: adminToken,
    method: "POST",
    body: { laboratoryId: labId }
  });
  assert.equal(assignment.status, 201);

  const resourceDefinitions = [
    resourcePayload("DEMO-ROOM-01", "Phòng thực hành Demo", "ROOM", "ROOM", false),
    resourcePayload("DEMO-EQUIP-01", "Camera đo kiểm Demo", "EQUIPMENT", "CAMERA", true),
    resourcePayload("DEMO-MACHINE-01", "Máy chủ GPU Demo", "MACHINE", "GPU_SERVER", true),
    resourcePayload("DEMO-KIT-01", "Bộ kit thí nghiệm Demo", "EXPERIMENT_KIT", "KIT", true),
    resourcePayload("DEMO-MATERIAL-01", "Vật tư thí nghiệm Demo", "MATERIAL", "MATERIAL", false)
  ];

  const resources = {};
  for (const definition of resourceDefinitions) {
    const response = await api("/resources", {
      token: adminToken,
      method: "POST",
      body: definition
    });
    assert.equal(response.status, 201, `${definition.code}: ${JSON.stringify(response.body)}`);
    resources[definition.code] = response.body;
  }

  const studentLogin = await loginApi("demo.student@lab.test", sharedPassword);
  const lecturerLogin = await loginApi("demo.lecturer@lab.test", sharedPassword);
  const staffLogin = await loginApi("demo.staff@lab.test", sharedPassword);

  console.log("2. USER INSPECTS CURRENT RESOURCE STATUS/SCHEDULE/HISTORY");
  const resourceDetail = await api(`/resources/${resources["DEMO-MACHINE-01"].id}`, { token: studentLogin.accessToken });
  assert.equal(resourceDetail.status, 200);
  assert.equal(resourceDetail.body.operationalStatus, "AVAILABLE");

  const schedule = await api(`/resources/${resources["DEMO-MACHINE-01"].id}/schedule`, { token: studentLogin.accessToken });
  assert.equal(schedule.status, 200);
  const resourceHistory = await api(`/resources/${resources["DEMO-MACHINE-01"].id}/history`, { token: studentLogin.accessToken });
  assert.equal(resourceHistory.status, 200);

  console.log("3. CALENDAR CONTRACT AND REAL BOOKING");
  const lifecycleStart = futureVietnamTime(2, 10);
  const lifecycleEnd = futureVietnamTime(2, 11, 30);
  const lifecycle = await api("/bookings", {
    token: studentLogin.accessToken,
    method: "POST",
    body: {
      resourceId: resources["DEMO-MACHINE-01"].id,
      title: "Graduation demo lifecycle",
      purpose: "Chứng minh workflow đồ án",
      startAt: lifecycleStart,
      endAt: lifecycleEnd
    }
  });
  assert.equal(lifecycle.status, 201);
  assert.equal(lifecycle.body.status, "PENDING_APPROVAL");

  console.log("4. POSTGRESQL REJECTS A CONCURRENT OVERLAP");
  const conflictStart = futureVietnamTime(3, 14);
  const conflictEnd = futureVietnamTime(3, 15);
  const conflictPayload = {
    resourceId: resources["DEMO-EQUIP-01"].id,
    title: "Graduation demo contention",
    purpose: "Concurrent conflict proof",
    startAt: conflictStart,
    endAt: conflictEnd
  };
  const [studentConflict, lecturerConflict] = await Promise.all([
    api("/bookings", { token: studentLogin.accessToken, method: "POST", body: conflictPayload }),
    api("/bookings", { token: lecturerLogin.accessToken, method: "POST", body: conflictPayload })
  ]);
  assert.deepEqual(
    [studentConflict.status, lecturerConflict.status].sort((a, b) => a - b),
    [201, 409]
  );
  const rejectedConflict = studentConflict.status === 409 ? studentConflict : lecturerConflict;
  assert.equal(rejectedConflict.body.error.code, "BOOKING_CONFLICT");

  console.log("5. LAB STAFF APPROVES THE REQUEST");
  const approved = await api(`/bookings/${lifecycle.body.id}/approve`, {
    token: staffLogin.accessToken,
    method: "POST",
    body: { reason: "Đủ điều kiện sử dụng trong kịch bản bảo vệ" }
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.status, "CONFIRMED");

  console.log("6. OWNER RECEIVES APPROVAL AND UPCOMING REMINDER");
  const notifications = await api("/notifications", { token: studentLogin.accessToken });
  assert.equal(notifications.status, 200);
  const types = notifications.body.map((item) => item.type);
  assert.ok(types.includes("BOOKING_APPROVED"));
  assert.ok(types.includes("BOOKING_UPCOMING"));

  console.log("7. STAFF RECORDS BEFORE-USE CONDITION AND HANDS OVER");
  const checkedOut = await api(`/bookings/${lifecycle.body.id}/check-out`, {
    token: staffLogin.accessToken,
    method: "POST",
    body: {
      conditionBefore: "Ngoại quan nguyên vẹn, phụ kiện đủ, nguồn điện ổn định",
      reason: "Bàn giao trực tiếp cho người đặt"
    }
  });
  assert.equal(checkedOut.status, 200);
  assert.equal(checkedOut.body.status, "CHECKED_OUT");

  console.log("8. STAFF RECORDS AFTER-USE CONDITION, RETURN, AND COMPLETES");
  const returned = await api(`/bookings/${lifecycle.body.id}/return`, {
    token: staffLogin.accessToken,
    method: "POST",
    body: {
      conditionAfter: "Hoàn trả đầy đủ, không phát hiện hư hỏng mới",
      reason: "Đã đối chiếu phụ kiện"
    }
  });
  assert.equal(returned.status, 200);
  assert.equal(returned.body.status, "RETURNED");

  const completed = await api(`/bookings/${lifecycle.body.id}/complete`, {
    token: staffLogin.accessToken,
    method: "POST",
    body: { reason: "Workflow hoàn tất" }
  });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.status, "COMPLETED");

  console.log("9. OWNER HISTORY AND REAL DASHBOARD UPDATE");
  const history = await api(`/bookings/${lifecycle.body.id}/history`, { token: studentLogin.accessToken });
  assert.equal(history.status, 200);
  for (const action of ["REQUEST", "APPROVE", "CHECK_OUT", "RETURN", "COMPLETE"]) {
    assert.ok(history.body.timeline.some((row) => row.action === action), `missing ${action}`);
  }
  assert.equal(history.body.booking.handoverCondition.includes("Ngoại quan nguyên vẹn"), true);
  assert.equal(history.body.booking.returnCondition.includes("Hoàn trả đầy đủ"), true);

  let dashboard = await api("/dashboard", { token: staffLogin.accessToken });
  assert.equal(dashboard.status, 200);
  assert.ok(dashboard.body.summary.totalResources >= 5);

  console.log("10. INCIDENT IS PERSISTED AND APPEARS IN OPERATIONAL DASHBOARD");
  const incident = await api("/incidents", {
    token: studentLogin.accessToken,
    method: "POST",
    body: {
      resourceId: resources["DEMO-MACHINE-01"].id,
      bookingId: lifecycle.body.id,
      severity: "medium",
      category: "usage",
      title: "Graduation demo incident",
      description: "Phát hiện tiếng rung bất thường sau phiên sử dụng"
    }
  });
  assert.equal(incident.status, 201);

  dashboard = await api("/dashboard", { token: staffLogin.accessToken });
  assert.equal(dashboard.status, 200);
  assert.ok(dashboard.body.summary.openIncidentCount >= 1);

  console.log("DEFAULT DEMO UI HIDES OPTIONAL/FAKE RESEARCH SURFACES");
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const adminPage = await adminContext.newPage();
  await loginUi(adminPage, adminEmail, adminPassword);

  const sidebarText = await adminPage.locator("aside").innerText();
  for (const hidden of [
    "AI Tính Toán Hiệu Suất",
    "AI Cố Vấn",
    "Nhật Ký Kiểm Toán",
    "Pareto",
    "VietQR",
    "Bản Sao Số"
  ]) {
    assert.equal(sidebarText.includes(hidden), false, `${hidden} must be hidden in the default demo`);
  }

  const userNav = adminPage.locator(".sidebar-nav-item-2026", { hasText: /Quản Trị Người Dùng/i }).first();
  await userNav.click();
  await adminPage.getByRole("button", { name: /Tạo người dùng/i }).click();
  let dialog = adminPage.getByRole("dialog");
  await dialog.getByLabel("Họ và tên").fill("Demo UI Created User");
  await dialog.getByLabel("Email").fill("demo.ui.created@lab.test");
  await dialog.getByLabel("Mật khẩu ban đầu").fill("DemoUiUser!Passphrase");
  await dialog.getByLabel("Vai trò").selectOption("STUDENT");
  await Promise.all([
    adminPage.waitForResponse((response) => response.url().endsWith("/api/users") && response.request().method() === "POST" && response.status() === 201),
    dialog.getByRole("button", { name: "Tạo người dùng" }).click()
  ]);
  await adminPage.getByText("demo.ui.created@lab.test").waitFor();
  await adminPage.screenshot({ path: path.join(screenshotDir, "admin_core_demo.png"), fullPage: true });
  await adminContext.close();

  const staffContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const staffPage = await staffContext.newPage();
  await loginUi(staffPage, "demo.staff@lab.test", sharedPassword);
  await staffPage.locator(".sidebar-nav-item-2026", { hasText: /Bảng Điều Khiển Vận Hành/i }).click();
  await staffPage.getByRole("heading", { name: "Bảng điều khiển vận hành" }).waitFor();
  assert.ok((await staffPage.locator("main").innerText()).includes("Sự cố đang mở"));
  await staffPage.screenshot({ path: path.join(screenshotDir, "staff_graduation_dashboard.png"), fullPage: true });
  await staffContext.close();

  console.log("ALL 10 CORE GRADUATION DEMO STEPS PASSED");
} finally {
  await browser.close();
}
