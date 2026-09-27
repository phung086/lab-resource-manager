import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";

import { config } from "../src/config.js";
import { prisma } from "../src/db.js";
import { optionalAuth } from "../src/middleware/auth.js";
import {
  renderBookingStatusEmail,
  renderIncidentAlertEmail,
  sendEmail
} from "../src/services/emailService.js";

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test("notification templates escape untrusted HTML", () => {
  const attack = '<img src=x onerror="alert(1)"> & data';
  const booking = renderBookingStatusEmail({
    userName: attack,
    bookingTitle: attack,
    resourceName: attack,
    status: "rejected",
    startAt: new Date("2026-09-28T01:00:00.000Z"),
    endAt: new Date("2026-09-28T02:00:00.000Z"),
    reason: attack
  });
  const incident = renderIncidentAlertEmail({
    incidentTitle: attack,
    resourceName: attack,
    severity: "high",
    reporterName: attack,
    description: attack
  });

  for (const html of [booking.html, incident.html]) {
    assert.doesNotMatch(html, /<img src=x/);
    assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; data/);
  }
});

test("production email fails closed when SMTP is not configured", async () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_USER: process.env.SMTP_USER
  };
  process.env.NODE_ENV = "production";
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;

  try {
    const result = await sendEmail({ to: "student@example.test", subject: "Test", html: "<p>Test</p>" });
    assert.deepEqual(result, { success: false, error: "SMTP is not configured" });
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("optional authentication exposes database outages instead of downgrading to anonymous", async () => {
  const originalFindUnique = prisma.user.findUnique;
  const originalConsoleError = console.error;
  const req = {
    headers: {
      authorization: `Bearer ${jwt.sign({ sub: "release-security-user" }, config.jwtSecret, { algorithm: "HS256" })}`
    }
  };
  const res = responseRecorder();
  let nextCalled = false;

  prisma.user.findUnique = async () => {
    const error = new Error("database connection details must not be exposed");
    error.code = "P1001";
    throw error;
  };
  console.error = () => {};

  try {
    await optionalAuth(req, res, () => {
      nextCalled = true;
    });
  } finally {
    prisma.user.findUnique = originalFindUnique;
    console.error = originalConsoleError;
  }

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body, {
    error: { code: "DATABASE_UNAVAILABLE", message: "Authentication service unavailable" }
  });
});
