import assert from "node:assert/strict";

const [target] = process.argv.slice(2);
const sites = { local: "http://127.0.0.1:8000", cloud: "https://lab-resource-manager-demo.vercel.app" };
assert.ok(Object.hasOwn(sites, target), "Select local or cloud");
const origin = sites[target];
const credentials = JSON.parse(process.env.LRM_SHOWCASE_ACCESS);
const sessions = [];
const accounts = [
  ["admin", "Quản trị hệ thống LAB", "ADMIN", []],
  ["staff-minh", "Nguyễn Hoàng Minh", "LAB_STAFF", [0]],
  ["staff-linh", "Trần Khánh Linh", "LAB_STAFF", [1]],
  ["staff-anh", "Lê Tuấn Anh", "LAB_STAFF", [0, 1]],
  ["customer", "Phạm Thanh Hà", "CUSTOMER", []],
];
const items = [
  ["AVAILABLE", "Phòng thực hành điện tử", "Bộ Raspberry Pi thực hành", "EQUIPMENT", "RASPBERRY_PI"],
  ["IN_USE", "Phòng đo lường", "Máy chủ GPU xử lý dữ liệu", "MACHINE", "GPU_SERVER"],
  ["MAINTENANCE", "Phòng kiểm thử thiết bị", "Camera ghi hình thí nghiệm", "EQUIPMENT", "CAMERA"],
  ["CALIBRATION", "Phòng hiệu chuẩn", "Bộ đo điện áp và dòng điện", "EQUIPMENT", "OTHER"],
  ["BROKEN", "Phòng thử nghiệm cơ điện", "Kính hiển vi số", "EQUIPMENT", "OTHER"],
  ["RETIRED", "Phòng thực hành thế hệ cũ", "Máy chủ GPU thế hệ cũ", "MACHINE", "GPU_SERVER"],
  ["OFFLINE", "Phòng quan sát từ xa", "Bộ điều khiển IoT từ xa", "EQUIPMENT", "RASPBERRY_PI"],
];

async function api(path, { token, method = "GET", body, status } = {}) {
  const headers = {};
  if (token) headers.authorization = "Bearer " + token;
  if (body) headers["content-type"] = "application/json";
  const res = await fetch(origin + "/api" + path, {
    method, headers, body: body && JSON.stringify(body), signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => null);
  if (status ? res.status !== status : !res.ok) {
    throw new Error(`${target} ${method} ${path}: ${res.status} ${data?.error?.code ?? ""} ${JSON.stringify(data?.error?.details?.fieldErrors ?? {})}`);
  }
  return data;
}

async function login(credential, role) {
  const result = await api("/auth/login", { method: "POST", body: credential });
  assert.equal(result.user.role, role);
  sessions.push(result.accessToken);
  return result;
}

async function main() {
  const { accessToken: bootstrap } = await login(credentials.bootstrap, "ADMIN");
  const existing = await api("/users", { token: bootstrap });
  const users = new Map();
  for (const [key, fullName, role] of accounts) {
    const auth = credentials[key];
    const user = existing.find(row => row.email === auth.email) ??
      await api("/users", { token: bootstrap, method: "POST", body: {
        ...auth, fullName, role, ...(role === "CUSTOMER" ? { phone: "0900000001" } : {}),
      } });
    assert.equal(user.role, role, "Existing email has a different role");
    users.set(key, await login(auth, role));
  }
  const admin = users.get("admin").accessToken;
  const customer = users.get("customer").accessToken;
  const labs = await api("/laboratories", { token: admin });
  const base = labs.find(lab => lab.code === (target === "local" ? "LOCAL-LAB-1" : "DEMO-LAB-A"));
  assert.ok(base?.buildingId, "Expected demo building");
  const showcase = [];
  for (const [idx, name] of ["LAB Điện tử và Tự động hóa", "LAB Đo lường và Kiểm định"].entries()) {
    const code = `SHOW-LAB-0${idx + 1}`;
    showcase.push(labs.find(row => row.code === code) ?? await api("/laboratories", {
      token: admin, method: "POST", body: { buildingId: base.buildingId, code, name, capacity: 24,
        openingTime: "08:00", closingTime: "20:00", description: "Không gian dữ liệu mẫu phục vụ trình diễn quy trình LAB." },
    }));
  }

  for (const [key, , role, scope] of accounts) {
    if (role !== "LAB_STAFF") continue;
    const staff = users.get(key);
    const path = `/users/${staff.user.id}/lab-assignments`;
    const assignments = await api(path, { token: admin });
    for (const idx of scope) {
      const laboratoryId = showcase[idx].id;
      if (!assignments.some(row => row.laboratoryId === laboratoryId)) {
        await api(path, { token: admin, method: "POST", body: { laboratoryId } });
      }
    }
    const visible = await api("/laboratories", { token: staff.accessToken });
    assert.deepEqual(visible.map(lab => lab.id).sort(), scope.map(idx => showcase[idx].id).sort());
  }
  console.log(`${target}: ADMIN, CUSTOMER and three verified LAB_STAFF scopes`);

  const inventory = await api("/resources?search=SHOW-", { token: admin });
  const assets = new Map();
  for (const [i, [operationalStatus, roomName, equipmentName, category, subtype]] of items.entries()) {
    for (const [kind, name, type, technicalSubtype, lab] of [
      ["ROOM", roomName, "ROOM", "ROOM", showcase[0]],
      ["DEVICE", equipmentName, category, subtype, showcase[1]],
    ]) {
      const code = `SHOW-${kind}-0${i + 1}`;
      const resource = inventory.find(row => row.code === code) ?? await api("/resources", {
        token: admin, method: "POST", body: { code, name, category: type, subtype: technicalSubtype,
          laboratoryId: lab.id, location: lab.name, capacity: kind === "ROOM" ? 24 : 1,
          description: "Tài nguyên mẫu phục vụ trình diễn trạng thái vận hành.",
          operationalStatus, maxBookingMinutes: 120, ...(target === "local" ? { specs: { environment: "LOCAL_DEMO" } } : {}),
        },
      });
      assert.equal(resource.operationalStatus, operationalStatus);
      assets.set(code, resource);
    }
  }
  console.log(`${target}: 14 resources across all 7 operational statuses`);

  const date = new Date(Date.now() + 31 * 3600000);
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1);
  const day = date.toISOString().slice(0, 10);
  const slot = (resource, start, end) => ({
    resourceId: assets.get(resource).id, startAt: `${day}T${start}:00+07:00`, endAt: `${day}T${end}:00+07:00`,
  });
  const bookingSlot = { ...slot("SHOW-ROOM-01", "09:00", "10:00"), purposeCode: "STUDY" };
  const existingBooks = await api("/bookings/my-bookings", { token: customer });
  const title = "Thực hành đo lường – Ca buổi sáng";
  let booking = existingBooks.find(row => row.title === title && row.status === "CONFIRMED" &&
    +new Date(row.startAt) === +new Date(bookingSlot.startAt));
  if (!booking) {
    const quote = await api("/booking-pricing/quote", { token: customer, method: "POST", body: bookingSlot });
    assert.equal(quote.amountVnd, 0, "Showcase resources must be free");
    booking = await api("/bookings", { token: customer, method: "POST", body: {
      ...bookingSlot, title, acceptedQuote: { amountVnd: quote.amountVnd, version: quote.version,
        loyaltyPolicyVersion: quote.loyaltyPolicyVersion },
    } });
  }
  assert.equal(booking.status, "CONFIRMED");
  await api("/bookings/preflight", { token: customer, method: "POST", body: bookingSlot, status: 409 });

  for (const [code, kind, title, start, end] of [
    ["SHOW-DEVICE-01", "maintenance", "Vệ sinh và kiểm tra cổng kết nối", "10:00", "11:00"],
    ["SHOW-ROOM-01", "calibration", "Hiệu chuẩn thiết bị đo của phòng", "13:00", "14:00"],
  ]) {
    const actionSlot = slot(code, start, end);
    const current = await api(`/maintenance?resourceId=${actionSlot.resourceId}`, { token: admin });
    if (!current.some(row => row.title === title && +new Date(row.startAt) === +new Date(actionSlot.startAt))) {
      await api("/maintenance", { token: admin, method: "POST", body: { ...actionSlot, title, kind } });
    }
    await api("/bookings/preflight", {
      token: customer, method: "POST", body: { ...actionSlot, purposeCode: "STUDY" }, status: 409,
    });
  }
  console.log(`${target}: verified reserved, overlapping booking, maintenance and calibration on ${day} (+07:00)`);

  const lifecycle = [
    ["SHOW-DEVICE-03", "Kiểm tra cụm camera đang bảo trì", "in_progress", -30, 60],
    ["SHOW-DEVICE-04", "Đã kiểm định bộ đo dòng điện", "completed", -150, -90],
    ["SHOW-ROOM-07", "Hủy kiểm tra đường truyền phòng", "cancelled", 90, 150],
  ];
  for (const [code, title, state, startOffset, endOffset] of lifecycle) {
    const resourceId = assets.get(code).id;
    const current = await api(`/maintenance?resourceId=${resourceId}`, { token: admin });
    let row = current.find(item => item.title === title);
    if (!row) {
      const startAt = new Date(Date.now() + startOffset * 60000).toISOString();
      const endAt = new Date(Date.now() + endOffset * 60000).toISOString();
      row = await api("/maintenance", { token: admin, method: "POST", body: { resourceId, title, startAt, endAt } });
    }
    const transitions = state === "completed" && row.status === "scheduled" ? ["in_progress", "completed"] : [state];
    for (const status of transitions) {
      if (row.status === status) continue;
      row = await api(`/maintenance/${row.id}`, { token: admin, method: "PATCH", body: {
        status, expectedUpdatedAt: row.updatedAt, changeReason: "Diễn tập quy trình bảo trì trên tài nguyên mẫu.",
      } });
    }
    assert.equal(row.status, state);
  }
  console.log(`${target}: maintenance queue covers scheduled, in progress, completed, cancelled`);

  const incidentSlot = assets.get("SHOW-DEVICE-05");
  const incidents = await api(`/incidents?resourceId=${incidentSlot.id}`, { token: admin });
  if (!incidents.some(row => row.title === "Không nhận tín hiệu kính hiển vi số")) {
    await api("/incidents", { token: admin, method: "POST", body: {
      resourceId: incidentSlot.id, severity: "high", title: "Không nhận tín hiệu kính hiển vi số",
      description: "Tình huống mẫu: kiểm tra đầu nối và nguồn cấp trước khi đưa thiết bị trở lại sử dụng.",
    } });
  }

  if (target === "local") {
    const simulations = await api("/telemetry/simulations", { token: admin });
    assert.equal(simulations.enabled, true);
    const resourceId = assets.get("SHOW-DEVICE-01").id;
    const run = simulations.runs.find(run => run.resourceId === resourceId && ["RUNNING", "COMPLETED"].includes(run.status));
    if (!run) await api("/telemetry/simulations", { token: admin, method: "POST", body: {
      resourceId, scenario: "THERMAL_RISE",
    } });
    console.log("local: labeled thermal monitoring simulation available");
  }
}

try { await main(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await Promise.allSettled(sessions.map(token => api("/auth/logout", { token, method: "POST" }))); }
