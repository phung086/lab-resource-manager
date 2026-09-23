import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import request from "supertest";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";

// Deliberately confined to a disposable, freshly migrated integration database.
const databaseUrl = new URL(process.env.DATABASE_URL || "http://missing");
assert.equal(databaseUrl.hostname, "127.0.0.1");
assert.equal(databaseUrl.port, "15436");
assert.match(
  databaseUrl.pathname,
  /^\/lab_resources_payment_ai_test_[a-z0-9_]+$/,
);
Object.assign(process.env, {
  NODE_ENV: "test",
  PORT: "15003",
  LOG_FORMAT: "dev",
  RATE_LIMIT_MAX: "5000",
  JWT_SECRET: "optional-integration-only-secret-20260922",
  PAYMENTS_ENABLED: "true",
  MCP_ASSISTANT_ENABLED: "true",
  OPENAI_API_KEY: "",
  OPENAI_MODEL: "",
  VNPAY_ENABLED: "true",
  VNPAY_TMN_CODE: "TESTONLY",
  VNPAY_HASH_SECRET: "isolated-unit-provider-secret",
  VNPAY_RETURN_URL: "http://127.0.0.1:15003/api/payments/vnpay/return",
  VNPAY_IPN_URL: "http://127.0.0.1:15003/api/payments/vnpay/ipn",
  VIETQR_ENABLED: "true",
  VIETQR_BANK_ID: "970436",
  VIETQR_ACCOUNT_NO: "000000000000",
  VIETQR_ACCOUNT_NAME: "TEST FIXTURE ONLY",
  VIETQR_API_KEY: "",
  VIETQR_CLIENT_ID: "",
});
const [{ createApp }, { prisma }, { config }] = await Promise.all([
  import("../src/app.js"),
  import("../src/db.js"),
  import("../src/config.js"),
]);
const app = createApp();
const http = request(app);
const password = "OptionalTest!Pass2026";
const tokens = {};
const clients = [];
const bearer = (who) => ({ Authorization: `Bearer ${tokens[who]}` });
const decode = (r) => r.structuredContent || JSON.parse(r.content[0].text);
function signed(params) {
  const query = Object.keys(params)
    .sort()
    .map(
      (k) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(params[k]).replace(/%20/g, "+")}`,
    )
    .join("&");
  return {
    ...params,
    vnp_SecureHash: crypto
      .createHmac("sha512", "isolated-unit-provider-secret")
      .update(query)
      .digest("hex"),
  };
}
const callback = (row, changes = {}) =>
  signed({
    vnp_TmnCode: "TESTONLY",
    vnp_Amount: String(row.amount * 100),
    vnp_TxnRef: row.txnRef,
    vnp_ResponseCode: "00",
    vnp_TransactionStatus: "00",
    vnp_TransactionNo: "123456789",
    vnp_PayDate: "20260922120000",
    ...changes,
  });
async function client(who) {
  const c = new Client({ name: "integration-test", version: "1.0.0" });
  await c.connect(
    new StreamableHTTPClientTransport(new URL("http://127.0.0.1:15003/mcp"), {
      requestInit: { headers: bearer(who) },
    }),
  );
  clients.push(c);
  return c;
}
async function seed() {
  const [identity] = await prisma.$queryRaw`SELECT current_database() AS name`;
  assert.equal("/" + identity.name, databaseUrl.pathname);
  assert.equal(
    await prisma.user.count(),
    0,
    "Use a new, empty database for this test",
  );
  const passwordHash = await bcrypt.hash(password, 4);
  await prisma.campus.create({
    data: {
      id: "optional-campus",
      code: "OPT-CAMPUS",
      name: "Optional test campus",
    },
  });
  await prisma.building.create({
    data: {
      id: "optional-building",
      campusId: "optional-campus",
      code: "OPT-BUILDING",
      name: "Optional test building",
    },
  });
  for (const lab of ["assigned", "foreign"]) {
    await prisma.laboratory.create({
      data: {
        id: lab,
        buildingId: "optional-building",
        code: "OPT-" + lab,
        name: "Test " + lab,
      },
    });
    await prisma.labPolicy.create({
      data: {
        id: "policy-" + lab,
        laboratoryId: lab,
        allowWeekend: true,
        workDayStartHour: 0,
        workDayEndHour: 24,
      },
    });
    await prisma.resource.create({
      data: {
        id: "resource-" + lab,
        laboratoryId: lab,
        code: "GPU-" + lab.toUpperCase(),
        name: "GPU test " + lab,
        subtype: "GPU_SERVER",
        category: "EQUIPMENT",
        location: "Test " + lab,
        specs: { vramGb: 24 },
        requiresApproval: false,
      },
    });
  }
  for (const [who, role] of Object.entries({
    admin: "ADMIN",
    student: "STUDENT",
    other: "STUDENT",
    lecturer: "LECTURER",
    staff: "LAB_STAFF",
  })) {
    await prisma.user.create({
      data: {
        id: who,
        email: `${who}@optional.test`,
        fullName: `Test ${who}`,
        role,
        passwordHash,
      },
    });
    const r = await http
      .post("/api/auth/login")
      .send({ email: `${who}@optional.test`, password });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    tokens[who] = r.body.accessToken;
  }
  await prisma.userLabAssignment.create({
    data: { userId: "staff", laboratoryId: "assigned" },
  });
  const start = new Date(Date.now() + 86400000);
  for (const [i, owner] of [
    "student",
    "student",
    "student",
    "other",
    "lecturer",
  ].entries()) {
    await prisma.booking.create({
      data: {
        id: "booking-" + i,
        resourceId: i === 3 ? "resource-foreign" : "resource-assigned",
        requestedById: owner,
        title: "Optional test booking " + i,
        purpose: "Isolated automated fixture",
        startAt: new Date(start.getTime() + i * 7200000),
        endAt: new Date(start.getTime() + i * 7200000 + 3600000),
        status: "CONFIRMED",
      },
    });
  }
  await prisma.notification.create({
    data: {
      id: "notice-student",
      userId: "student",
      type: "BOOKING_APPROVED",
      title: "Own notification",
      message: "Own data only",
    },
  });
  await prisma.notification.create({
    data: {
      id: "notice-other",
      userId: "other",
      type: "BOOKING_APPROVED",
      title: "Private foreign notification",
      message: "Never disclose",
    },
  });
  await prisma.knowledgeDocument.create({
    data: {
      id: "doc",
      resourceId: "resource-assigned",
      laboratoryId: "assigned",
      title: "GPU SOP fixture",
      version: "test-1",
      chunks: {
        create: {
          id: "chunk",
          chunkIndex: 0,
          content: "SOP GPU: shut down after use. Test document.",
        },
      },
    },
  });
}
async function charge(bookingId) {
  const r = await http
    .post("/api/payments/charges")
    .set(bearer("admin"))
    .send({ bookingId, amount: 25000, description: "Isolated test charge" });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}
test(
  "Optional payment + real authenticated MCP integration",
  { timeout: 120000 },
  async (t) => {
    const server = await new Promise((resolve) => {
      const s = app.listen(15003, "127.0.0.1", () => resolve(s));
    });
    t.after(async () => {
      await Promise.all(clients.map((c) => c.close()));
      await new Promise((resolve) => server.close(resolve));
      await prisma.$disconnect();
    });
    await t.test(
      "empty database gives truthful no-data answer through authenticated MCP",
      async () => {
        assert.equal(await prisma.resource.count(), 0);
        await prisma.user.create({
          data: {
            id: "empty",
            email: "empty@optional.test",
            fullName: "Empty catalog test",
            role: "STUDENT",
            passwordHash: await bcrypt.hash(password, 4),
          },
        });
        const login = await http
          .post("/api/auth/login")
          .send({ email: "empty@optional.test", password });
        tokens.empty = login.body.accessToken;
        const answer = await http
          .post("/api/assistant/chat")
          .set(bearer("empty"))
          .send({ message: "Tìm thiết bị GPU" });
        assert.equal(answer.status, 200);
        assert.deepEqual(answer.body.toolResults[0].result.resources, []);
        assert.match(answer.body.answer, /Không có tài nguyên/);
        assert.deepEqual(answer.body.actions, []);
        await prisma.user.delete({ where: { id: "empty" } });
      },
    );
    await seed();
    const bookingBefore = await prisma.booking.findMany({
      orderBy: { id: "asc" },
    });
    let first;
    await t.test(
      "disabled routes absent; no anonymous or staff financial administration",
      async () => {
        config.paymentsEnabled = false;
        config.mcpAssistantEnabled = false;
        const off = request(createApp());
        for (const path of ["/api/payments/my", "/api/assistant/tools", "/mcp"])
          assert.equal((await off.get(path)).status, 404);
        config.paymentsEnabled = true;
        config.mcpAssistantEnabled = true;
        assert.equal((await http.get("/api/payments/my")).status, 401);
        assert.equal((await http.post("/mcp").send({})).status, 401);
        for (const who of ["student", "lecturer", "staff"]) {
          assert.equal(
            (
              await http
                .get("/api/payments/admin/transactions")
                .set(bearer(who))
            ).status,
            403,
          );
          assert.equal(
            (await http.post("/api/payments/charges").set(bearer(who)).send({}))
              .status,
            403,
          );
        }
      },
    );
    await t.test(
      "admin explicit charge; strict validation; duplicate concurrency and ownership",
      async () => {
        for (const amount of [0, -1, 1.5, 10000000000])
          assert.equal(
            (
              await http
                .post("/api/payments/charges")
                .set(bearer("admin"))
                .send({
                  bookingId: "booking-0",
                  amount,
                  description: "Invalid amount",
                })
            ).status,
            400,
          );
        const concurrent = await Promise.all(
          [1, 2].map(() =>
            http.post("/api/payments/charges").set(bearer("admin")).send({
              bookingId: "booking-0",
              amount: 25000,
              description: "Test charge",
            }),
          ),
        );
        assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 409]);
        first = concurrent.find((r) => r.status === 201).body;
        assert.equal(first.status, "pending");
        assert.equal(first.userId, "student");
        const scoped = await http
          .get("/api/payments/my")
          .query({ bookingId: "booking-0" })
          .set(bearer("student"));
        assert.equal(scoped.body.transactions.length, 1);
        const foreign = await http
          .get("/api/payments/my")
          .query({ bookingId: "booking-0" })
          .set(bearer("other"));
        assert.deepEqual(foreign.body.transactions, []);
        for (const who of ["other", "lecturer", "staff"]) {
          assert.equal(
            (await http.get(`/api/payments/${first.id}`).set(bearer(who)))
              .status,
            404,
          );
          assert.equal(
            (await http.get("/api/payments/booking/booking-0").set(bearer(who)))
              .status,
            404,
          );
          assert.equal(
            (
              await http
                .post(`/api/payments/${first.id}/vnpay`)
                .set(bearer(who))
                .send({})
            ).status,
            404,
          );
        }
        assert.equal(
          (
            await http
              .get(`/api/payments/${first.id}/receipt`)
              .set(bearer("student"))
          ).status,
          409,
        );
        assert.equal(
          (
            await http
              .post(`/api/payments/${first.id}/vnpay`)
              .set(bearer("student"))
              .send({ amount: 1 })
          ).status,
          400,
        );
        const r = await http
          .post(`/api/payments/${first.id}/vnpay`)
          .set(bearer("student"))
          .send({});
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const url = new URL(r.body.paymentUrl),
          params = Object.fromEntries(url.searchParams);
        assert.equal(url.hostname, "sandbox.vnpayment.vn");
        assert.equal(params.vnp_Amount, "2500000");
        assert.equal(params.vnp_TxnRef, first.txnRef);
        const hash = params.vnp_SecureHash;
        delete params.vnp_SecureHash;
        assert.equal(hash, signed(params).vnp_SecureHash);
        assert.equal(
          (
            await http
              .post(`/api/payments/${first.id}/vnpay`)
              .set(bearer("student"))
              .send({})
          ).body.paymentUrl,
          r.body.paymentUrl,
        );
        assert.equal(
          (
            await http
              .post(`/api/payments/${first.id}/vietqr`)
              .set(bearer("student"))
              .send({})
          ).status,
          409,
        );
      },
    );
    await t.test(
      "IPN rejects forged/mismatched callbacks; return never writes; signed success atomic and idempotent",
      async () => {
        const ipn = (q) => http.get("/api/payments/vnpay/ipn").query(q);
        assert.equal(
          (await ipn({ ...callback(first), vnp_SecureHash: "0".repeat(128) }))
            .body.RspCode,
          "97",
        );
        assert.equal(
          (await ipn(callback(first, { vnp_Amount: "1" }))).body.RspCode,
          "04",
        );
        assert.equal(
          (await ipn(callback(first, { vnp_TxnRef: "MISSING" }))).body.RspCode,
          "01",
        );
        assert.equal(
          (await ipn(callback(first, { vnp_TmnCode: "FOREIGN1" }))).body
            .RspCode,
          "99",
        );
        assert.equal(
          (await ipn(callback(first, { vnp_PayDate: "20260230120000" }))).body
            .RspCode,
          "99",
        );
        assert.equal(
          (await http.get("/api/payments/vnpay/return").query(callback(first)))
            .status,
          200,
        );
        assert.equal(
          (
            await prisma.paymentTransaction.findUnique({
              where: { id: first.id },
            })
          ).status,
          "pending",
        );
        const done = await Promise.all([
          ipn(callback(first)),
          ipn(callback(first)),
        ]);
        assert.deepEqual(done.map((r) => r.body.RspCode).sort(), ["00", "02"]);
        const saved = await prisma.paymentTransaction.findUnique({
          where: { id: first.id },
        });
        assert.equal(saved.status, "success");
        assert.ok(saved.paidAt);
        assert.equal(
          (
            await ipn(
              callback(first, {
                vnp_ResponseCode: "24",
                vnp_TransactionStatus: "02",
              }),
            )
          ).body.RspCode,
          "02",
        );
        assert.deepEqual(
          await prisma.paymentTransaction.findUnique({
            where: { id: first.id },
          }),
          saved,
        );
        assert.equal(
          (
            await http
              .post(`/api/payments/${first.id}/vnpay`)
              .set(bearer("student"))
              .send({})
          ).status,
          409,
        );
        const receipt = await http
          .get(`/api/payments/${first.id}/receipt`)
          .set(bearer("student"));
        assert.equal(receipt.status, 200);
        assert.match(receipt.body.disclaimer, /Không thay thế/);
        assert.equal(
          (
            await http
              .get(`/api/payments/${first.id}/receipt`)
              .set(bearer("other"))
          ).status,
          404,
        );
      },
    );
    await t.test(
      "provider failures remain failed; VietQR remains pending with no confirm backdoor",
      async () => {
        const failed = await charge("booking-1");
        await http
          .post(`/api/payments/${failed.id}/vnpay`)
          .set(bearer("student"))
          .send({});
        const r = await http.get("/api/payments/vnpay/ipn").query(
          callback(failed, {
            vnp_ResponseCode: "24",
            vnp_TransactionStatus: "02",
          }),
        );
        assert.equal(r.body.RspCode, "00");
        assert.equal(
          (
            await prisma.paymentTransaction.findUnique({
              where: { id: failed.id },
            })
          ).status,
          "failed",
        );
        assert.equal(
          (
            await http
              .get(`/api/payments/${failed.id}/receipt`)
              .set(bearer("student"))
          ).status,
          409,
        );
        const qr = await charge("booking-2");
        const generated = await http
          .post(`/api/payments/${qr.id}/vietqr`)
          .set(bearer("student"))
          .send({});
        assert.equal(generated.status, 200, JSON.stringify(generated.body));
        assert.equal(generated.body.transaction.status, "pending");
        assert.equal(generated.body.vietqr.amount, 25000);
        assert.match(
          generated.body.vietqr.qrUrl,
          /https:\/\/img.vietqr.io\/image\//,
        );
        assert.equal(
          (await http.get("/api/payments/vnpay/ipn").query(callback(qr))).body
            .RspCode,
          "99",
        );
        assert.equal(
          (
            await http
              .post(`/api/payments/${qr.id}/confirm`)
              .set(bearer("admin"))
              .send({})
          ).status,
          404,
        );
        assert.equal(
          (
            await http
              .get(`/api/payments/${qr.id}/receipt`)
              .set(bearer("student"))
          ).status,
          409,
        );
        process.env.VNPAY_ENABLED = "false";
        const unconfigured = await charge("booking-4");
        assert.equal(
          (
            await http
              .post(`/api/payments/${unconfigured.id}/vnpay`)
              .set(bearer("lecturer"))
              .send({})
          ).status,
          503,
        );
        process.env.VNPAY_ENABLED = "true";
        assert.deepEqual(
          await prisma.booking.findMany({ orderBy: { id: "asc" } }),
          bookingBefore,
        );
      },
    );
    await t.test(
      "official MCP handshake, canonical read-only tools and argument validation",
      async () => {
        const c = await client("student");
        const listed = await c.listTools();
        assert.equal(listed.tools.length, 13);
        assert.ok(listed.tools.every((t) => t.annotations.readOnlyHint));
        const rows = decode(
          await c.callTool({
            name: "search_resources",
            arguments: { query: "GPU" },
          }),
        );
        assert.equal(rows.resources.length, 2);
        const invalid = await c.callTool({
          name: "search_resources",
          arguments: { limit: 1000, role: "ADMIN" },
        });
        assert.ok(invalid.isError);
        await assert.rejects(
          c.callTool({
            name: "approve_booking",
            arguments: { bookingId: "booking-0" },
          }),
        );
        assert.equal(
          (
            await http
              .post("/mcp")
              .set({ ...bearer("student"), Origin: "https://evil.example" })
              .send({})
          ).status,
          403,
        );
      },
    );
    await t.test(
      "MCP student ownership and staff lab scope across tools; no credential leakage",
      async () => {
        const student = await client("student"),
          staff = await client("staff");
        const call = async (c, name, args = {}) =>
          decode(await c.callTool({ name, arguments: args }));
        assert.ok(
          (
            await call(student, "get_booking_detail", {
              bookingId: "booking-3",
            })
          ).error,
        );
        assert.equal(
          (await call(student, "get_my_bookings")).bookings.length,
          3,
        );
        assert.deepEqual(
          (await call(student, "list_notifications")).notifications.map(
            (x) => x.id,
          ),
          ["notice-student"],
        );
        assert.equal(
          (await call(student, "get_monitoring_summary")).error.code,
          "FORBIDDEN",
        );
        assert.deepEqual(
          (await call(staff, "search_resources")).resources.map((x) => x.id),
          ["resource-assigned"],
        );
        assert.ok(
          (
            await call(staff, "get_resource_detail", {
              resourceId: "resource-foreign",
            })
          ).error,
        );
        assert.ok(
          (await call(staff, "get_booking_detail", { bookingId: "booking-3" }))
            .error,
        );
        assert.equal(
          (await call(staff, "get_monitoring_summary")).resources[0].monitoring
            .state,
          "NO_DATA",
        );
        const future = new Date(Date.now() + 7200000),
          end = new Date(future.getTime() + 3600000);
        const inputs = {
          get_operational_summary: {},
          search_resources: {},
          get_resource_detail: { resourceId: "resource-assigned" },
          find_available_slots: { resourceId: "resource-assigned" },
          check_booking_conflicts: {
            resourceId: "resource-assigned",
            startAt: future.toISOString(),
            endAt: end.toISOString(),
          },
          get_my_bookings: {},
          get_booking_detail: { bookingId: "booking-0" },
          list_notifications: {},
          search_knowledge_base: { query: "SOP" },
          recommend_equipment: { minVramGb: 24 },
          check_user_eligibility: { resourceId: "resource-assigned" },
          get_incidents: {},
          get_monitoring_summary: {},
        };
        const before = await snapshot();
        for (const [name, args] of Object.entries(inputs)) {
          const result = await call(staff, name, args);
          assert.ok(!result.error, `${name}: ${JSON.stringify(result)}`);
          assert.doesNotMatch(
            JSON.stringify(result),
            /passwordHash|credentialHash|credentialSalt|TESTONLY|accessToken/,
          );
        }
        assert.deepEqual(
          await snapshot(),
          before,
          "Read-only tool calls must not mutate persisted rows",
        );
      },
    );
    await t.test(
      "canonical filters, admin summary, half-open conflicts, real policy and maintenance",
      async () => {
        const admin = await client("admin"),
          student = await client("student");
        const call = async (c, name, args = {}) =>
          decode(await c.callTool({ name, arguments: args }));
        const summary = await call(admin, "get_operational_summary");
        assert.equal(summary.resources, 2);
        assert.equal(summary.scope, "global");
        assert.ok(summary.bookings.every((b) => b.status === "CONFIRMED"));
        const search = await call(student, "search_resources", {
          category: "EQUIPMENT",
          subtype: "GPU_SERVER",
          operationalStatus: "AVAILABLE",
        });
        assert.equal(search.resources.length, 2);
        const booking = bookingBefore.find((b) => b.id === "booking-0");
        const args = {
          resourceId: booking.resourceId,
          startAt: booking.startAt.toISOString(),
          endAt: booking.endAt.toISOString(),
        };
        const overlapping = await call(
          student,
          "check_booking_conflicts",
          args,
        );
        assert.equal(overlapping.available, false);
        assert.ok(overlapping.conflicts.length);
        assert.doesNotMatch(
          JSON.stringify(overlapping),
          /requestedById|booking-0/,
        );
        const adjacent = {
          resourceId: booking.resourceId,
          startAt: booking.endAt.toISOString(),
          endAt: new Date(booking.endAt.getTime() + 3600000).toISOString(),
        };
        assert.equal(
          (await call(student, "check_booking_conflicts", adjacent)).available,
          true,
        );
        await prisma.maintenanceWindow.create({
          data: {
            id: "maintenance-fixture",
            resourceId: booking.resourceId,
            title: "Actual persisted maintenance fixture",
            startAt: new Date(adjacent.startAt),
            endAt: new Date(adjacent.endAt),
          },
        });
        assert.equal(
          (await call(student, "check_booking_conflicts", adjacent)).available,
          false,
        );
        const slots = await call(student, "find_available_slots", {
          resourceId: booking.resourceId,
          from: args.startAt,
          to: adjacent.endAt,
          durationMinutes: 60,
        });
        assert.deepEqual(slots.slots, []);
        await prisma.maintenanceWindow.delete({
          where: { id: "maintenance-fixture" },
        });
        await prisma.labPolicy.update({
          where: { laboratoryId: "assigned" },
          data: { maxBookingMinutes: 30 },
        });
        assert.equal(
          (await call(student, "check_booking_conflicts", adjacent)).available,
          false,
        );
        assert.deepEqual(
          (
            await call(student, "find_available_slots", {
              resourceId: booking.resourceId,
              durationMinutes: 60,
            })
          ).slots,
          [],
        );
        await prisma.labPolicy.update({
          where: { laboratoryId: "assigned" },
          data: { maxBookingMinutes: 480 },
        });
        await prisma.resource.update({
          where: { id: booking.resourceId },
          data: { operationalStatus: "BROKEN" },
        });
        assert.deepEqual(
          (
            await call(student, "find_available_slots", {
              resourceId: booking.resourceId,
              durationMinutes: 60,
            })
          ).slots,
          [],
        );
        await prisma.resource.update({
          where: { id: booking.resourceId },
          data: { operationalStatus: "AVAILABLE" },
        });
        await prisma.userLabAssignment.delete({
          where: {
            userId_laboratoryId: { userId: "staff", laboratoryId: "assigned" },
          },
        });
        const staff = await client("staff");
        assert.deepEqual((await call(staff, "search_resources")).resources, []);
        await prisma.userLabAssignment.create({
          data: { userId: "staff", laboratoryId: "assigned" },
        });
        await prisma.user.update({
          where: { id: "other" },
          data: { isActive: false },
        });
        assert.equal(
          (await http.post("/mcp").set(bearer("other")).send({})).status,
          401,
        );
        await prisma.user.update({
          where: { id: "other" },
          data: { isActive: true },
        });
      },
    );
    await t.test(
      "assistant uses real MCP, grounded local mode and safe booking prefill only",
      async () => {
        const before = await snapshot();
        for (const message of [
          "Tìm thiết bị GPU",
          "Tìm lịch trống cho GPU trong 7 ngày tới",
          "Tôi có lịch đặt nào sắp tới?",
          "Thiết bị nào đang cần chú ý?",
        ]) {
          const r = await http
            .post("/api/assistant/chat")
            .set(bearer("student"))
            .send({ message });
          assert.equal(r.status, 200, JSON.stringify(r.body));
          assert.equal(r.body.provider, "local");
          assert.equal(r.body.source, "authenticated_mcp");
          if (message.includes("trống")) {
            assert.ok(r.body.actions.length);
            assert.equal(r.body.actions[0].type, "PREFILL_BOOKING");
            assert.ok(r.body.toolsUsed.includes("check_user_eligibility"));
          }
        }
        assert.deepEqual(await snapshot(), before);
      },
    );
  },
);
async function snapshot() {
  const result = {};
  const tables =
    await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
  for (const { tablename } of tables) {
    assert.match(tablename, /^[a-z_]+$/);
    result[tablename] = await prisma.$queryRawUnsafe(
      `SELECT md5(COALESCE(string_agg(row_to_json(t)::text, '' ORDER BY row_to_json(t)::text), '')) AS hash FROM "${tablename}" t`,
    );
  }
  return result;
}
