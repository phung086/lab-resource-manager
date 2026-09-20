import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import request from "supertest";

import { configureBatch1ETestEnvironment } from "../helpers/batch1eDatabase.js";

await configureBatch1ETestEnvironment("lab_resources_b1e_unavailable", { port: 59999 });
const [{ createApp }, { prisma }] = await Promise.all([
  import("../../src/app.js"),
  import("../../src/db.js")
]);
const app = createApp();
const token = jwt.sign({ sub: "00000000-0000-4000-8000-000000000001", role: "STUDENT" }, process.env.JWT_SECRET);
const auth = { Authorization: `Bearer ${token}` };

test("Batch 1E-L2 controlled DB outage never returns fake core success", { timeout: 60000 }, async () => {
  try {
    const ready = await request(app).get("/health/ready");
    assert.equal(ready.status, 503);
    assert.equal(ready.body.error, "DATABASE_UNAVAILABLE");

    const login = await request(app).post("/api/auth/login").send({ email: "student@example.test", password: "Password!1" });
    assert.equal(login.status, 503);
    assert.equal(login.body.error.code, "DATABASE_UNAVAILABLE");
    assert.equal(login.body.accessToken, undefined);

    const booking = await request(app).post("/api/bookings").set(auth).send({
      resourceId: "00000000-0000-4000-8000-000000000002",
      title: "Must fail",
      purpose: "No fallback",
      startAt: "2038-01-01T10:00:00.000Z",
      endAt: "2038-01-01T11:00:00.000Z"
    });
    assert.equal(booking.status, 503);
    assert.equal(booking.body.error.code, "DATABASE_UNAVAILABLE");

    const resources = await request(app).get("/api/resources");
    assert.equal(resources.status, 500);
    assert.equal(resources.body.error.code, "INTERNAL_ERROR");
    assert.notEqual(resources.body.error.code, "BOOKING_CONFLICT");
    assert.equal(Array.isArray(resources.body), false);

    const calendar = await request(app).get("/api/calendar/slots");
    assert.equal(calendar.status, 500);
    assert.equal(calendar.body.error.code, "INTERNAL_ERROR");
    assert.equal(calendar.body.grid, undefined);

    const notifications = await request(app).get("/api/notifications").set(auth);
    assert.equal(notifications.status, 503);
    assert.equal(notifications.body.error.code, "DATABASE_UNAVAILABLE");
  } finally {
    await prisma.$disconnect();
  }
});
